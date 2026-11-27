CREATE OR REPLACE FUNCTION public.resolve_ticket_new_ticket_eligibility(
  p_ticket_id UUID,
  p_actor_id UUID
)
RETURNS TABLE (
  account_id UUID,
  account_email TEXT,
  user_role public.user_role,
  eligible_for_in_app BOOLEAN,
  eligible_for_email BOOLEAN,
  eligible_for_social BOOLEAN,
  target_fingerprint TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    candidate.account_id,
    candidate.account_email,
    candidate.user_role,
    btrim(candidate.account_email) <> ''
      AND candidate.account_id IS DISTINCT FROM p_actor_id
      AND lower(btrim(candidate.account_email)) IS DISTINCT FROM lower(btrim(ticket.reporter_email))
      AND public.notification_preference_enabled(candidate.account_email, 'new_ticket'),
    candidate.user_role = 'technician'::public.user_role
      AND btrim(candidate.account_email) <> ''
      AND public.notification_preference_enabled(candidate.account_email, 'new_ticket'),
    candidate.target_fingerprint IS NOT NULL
      AND candidate.account_id IS DISTINCT FROM p_actor_id
      AND lower(btrim(candidate.account_email)) IS DISTINCT FROM lower(btrim(ticket.reporter_email))
      AND public.notification_preference_enabled(candidate.account_email, 'new_ticket'),
    CASE
      WHEN candidate.target_fingerprint IS NOT NULL
        AND candidate.account_id IS DISTINCT FROM p_actor_id
        AND lower(btrim(candidate.account_email)) IS DISTINCT FROM lower(btrim(ticket.reporter_email))
        AND public.notification_preference_enabled(candidate.account_email, 'new_ticket')
      THEN candidate.target_fingerprint
    END
  FROM public.tickets AS ticket
  JOIN public.profiles AS candidate_profile ON TRUE
  JOIN auth.users AS candidate_auth_user ON candidate_auth_user.id = candidate_profile.id
  LEFT JOIN public.social_webhooks AS webhook ON webhook.account_id = candidate_profile.id
  LEFT JOIN public.technician_categories AS subscription
    ON subscription.technician_id = candidate_profile.id
    AND subscription.category_id = ticket.category_id
  CROSS JOIN LATERAL (
    VALUES (
      candidate_profile.id,
      candidate_auth_user.email,
      candidate_profile.user_role,
      CASE WHEN webhook.enabled IS TRUE THEN webhook.target_fingerprint END
    )
  ) AS candidate(account_id, account_email, user_role, target_fingerprint)
  WHERE ticket.id = p_ticket_id
    AND candidate_profile.is_active IS TRUE
    AND (
      candidate_profile.user_role = 'admin'::public.user_role
      OR (
        candidate_profile.user_role = 'technician'::public.user_role
        AND subscription.category_id IS NOT NULL
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_ticket_new_ticket_eligibility(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_ticket_new_ticket_eligibility(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_ticket_new_ticket_eligibility(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_ticket_submission_confirmation_eligibility(
  p_ticket_id UUID,
  p_reporter_email TEXT
)
RETURNS TABLE (
  account_id UUID,
  account_email TEXT,
  recipient_email TEXT,
  eligible_for_email BOOLEAN,
  eligible_for_social BOOLEAN,
  target_fingerprint TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    candidate.account_id,
    candidate.account_email,
    btrim(p_reporter_email),
    TRUE,
    candidate.target_fingerprint IS NOT NULL,
    candidate.target_fingerprint
  FROM (
    SELECT
      reporter_profile.id,
      reporter_auth_user.email,
      CASE
        WHEN reporter_webhook.enabled IS TRUE THEN reporter_webhook.target_fingerprint
      END
    FROM public.profiles AS reporter_profile
    JOIN auth.users AS reporter_auth_user ON reporter_auth_user.id = reporter_profile.id
    LEFT JOIN public.social_webhooks AS reporter_webhook
      ON reporter_webhook.account_id = reporter_profile.id
    WHERE reporter_profile.is_active IS TRUE
      AND reporter_auth_user.email = lower(btrim(p_reporter_email))
    LIMIT 1
  ) AS candidate(account_id, account_email, target_fingerprint)
  WHERE btrim(p_reporter_email) <> ''
    AND public.notification_preference_enabled(p_reporter_email, 'ticket_status');
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_ticket_submission_confirmation_eligibility(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_ticket_submission_confirmation_eligibility(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_ticket_submission_confirmation_eligibility(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  eligible_recipient RECORD;
  submission_recipient RECORD;
  target_fingerprint TEXT;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  actor_id := auth.uid();

  BEGIN
    FOR eligible_recipient IN
      SELECT *
      FROM public.resolve_ticket_new_ticket_eligibility(NEW.id, actor_id)
    LOOP
      IF eligible_recipient.eligible_for_in_app THEN
        BEGIN
          INSERT INTO public.notifications (
            recipient_id,
            ticket_id,
            event_type
          )
          VALUES (
            eligible_recipient.account_id,
            NEW.id,
            'new_ticket'
          )
          ON CONFLICT (recipient_id, ticket_id, event_type)
            WHERE event_type = 'new_ticket'
          DO NOTHING;
        EXCEPTION WHEN others THEN
          RAISE WARNING 'In-app notification could not be written for ticket %: %', NEW.id, SQLERRM;
        END;
      END IF;

      IF eligible_recipient.eligible_for_email THEN
        BEGIN
          PERFORM public.enqueue_notification_delivery(
            NEW.id,
            'new_ticket',
            eligible_recipient.account_email
          );
        EXCEPTION WHEN others THEN
          RAISE WARNING 'Email notification could not be queued for ticket %: %', NEW.id, SQLERRM;
        END;
      END IF;

    END LOOP;

    FOR target_fingerprint IN
      SELECT DISTINCT resolution.target_fingerprint
      FROM public.resolve_ticket_new_ticket_eligibility(NEW.id, actor_id) AS resolution
      WHERE resolution.eligible_for_social
      ORDER BY resolution.target_fingerprint
    LOOP
      BEGIN
        PERFORM public.enqueue_notification_delivery(
          NEW.id,
          'new_ticket',
          NULL,
          NULL,
          'social',
          target_fingerprint
        );
      EXCEPTION WHEN others THEN
        RAISE WARNING 'Social notification could not be queued for ticket %: %', NEW.id, SQLERRM;
      END;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'New-ticket eligibility could not be resolved for ticket %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    FOR submission_recipient IN
      SELECT *
      FROM public.resolve_ticket_submission_confirmation_eligibility(
        NEW.id,
        NEW.reporter_email
      )
    LOOP
      IF submission_recipient.eligible_for_email THEN
        BEGIN
          PERFORM public.enqueue_notification_delivery(
            NEW.id,
            'report_submitted',
            submission_recipient.recipient_email
          );
        EXCEPTION WHEN others THEN
          RAISE WARNING 'Submission confirmation could not be queued for ticket %: %', NEW.id, SQLERRM;
        END;
      END IF;

      IF submission_recipient.eligible_for_social THEN
        BEGIN
          PERFORM public.enqueue_notification_delivery(
            NEW.id,
            'report_submitted',
            NULL,
            NULL,
            'social',
            submission_recipient.target_fingerprint
          );
        EXCEPTION WHEN others THEN
          RAISE WARNING 'Social submission confirmation could not be queued for ticket %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Submission confirmation eligibility could not be resolved for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM anon, authenticated;
