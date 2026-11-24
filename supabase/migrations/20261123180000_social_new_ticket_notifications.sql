CREATE OR REPLACE FUNCTION public.enqueue_social_new_ticket_deliveries(
  p_ticket_id UUID,
  p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_fingerprint TEXT;
BEGIN
  FOR target_fingerprint IN
    SELECT DISTINCT webhook.target_fingerprint
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    JOIN public.tickets AS ticket ON ticket.id = p_ticket_id
    LEFT JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
      AND subscription.category_id = ticket.category_id
    WHERE profile.is_active IS TRUE
      AND profile.id IS DISTINCT FROM p_actor_id
      AND lower(btrim(auth_user.email)) IS DISTINCT FROM lower(btrim(ticket.reporter_email))
      AND webhook.enabled IS TRUE
      AND public.notification_preference_enabled(auth_user.email, 'new_ticket')
      AND (
        profile.user_role = 'admin'::public.user_role
        OR (
          profile.user_role = 'technician'::public.user_role
          AND subscription.category_id IS NOT NULL
        )
      )
    ORDER BY 1
  LOOP
    PERFORM public.enqueue_notification_delivery(
      p_ticket_id,
      'new_ticket',
      NULL,
      NULL,
      'social',
      target_fingerprint
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_social_new_ticket_deliveries(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_social_new_ticket_deliveries(UUID, UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  recipient_account_id UUID;
  recipient_role public.user_role;
  actor_id UUID;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  actor_id := auth.uid();

  FOR recipient_account_id, recipient, recipient_role IN
    SELECT DISTINCT profile.id, auth_user.email, profile.user_role
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    LEFT JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
      AND subscription.category_id = NEW.category_id
    WHERE profile.is_active IS TRUE
      AND (
        profile.user_role = 'admin'::public.user_role
        OR (
          profile.user_role = 'technician'::public.user_role
          AND subscription.category_id IS NOT NULL
        )
      )
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY auth_user.email
  LOOP
    IF recipient_account_id IS DISTINCT FROM actor_id
      AND lower(btrim(recipient)) IS DISTINCT FROM lower(btrim(NEW.reporter_email))
      AND public.notification_preference_enabled(recipient, 'new_ticket') THEN
      BEGIN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          recipient_account_id,
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

    -- Email behavior is unchanged for subscribed Technicians, including actors.
    IF recipient_role = 'technician'::public.user_role THEN
      PERFORM public.enqueue_notification_delivery(
        NEW.id,
        'new_ticket',
        recipient
      );
    END IF;
  END LOOP;

  PERFORM public.enqueue_social_new_ticket_deliveries(
    NEW.id,
    actor_id
  );

  PERFORM public.enqueue_notification_delivery(
    NEW.id,
    'report_submitted',
    NEW.reporter_email
  );

  PERFORM public.enqueue_social_report_submitted_delivery(
    NEW.id,
    NEW.reporter_email
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM anon, authenticated;
