CREATE OR REPLACE FUNCTION public.resolve_ticket_status_eligibility(
  p_ticket_id UUID,
  p_actor_id UUID
)
RETURNS TABLE (
  recipient_id UUID,
  account_email TEXT,
  recipient_email TEXT,
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
    (
      SELECT profile.id
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
      LIMIT 1
    ) AS account_id,
    (
      SELECT auth_user.email
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
      LIMIT 1
    ) AS account_email,
    btrim(ticket.reporter_email),
    (
      SELECT profile.is_active
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
      LIMIT 1
    ) IS TRUE
      AND btrim((
        SELECT auth_user.email
        FROM public.profiles AS profile
        JOIN auth.users AS auth_user ON auth_user.id = profile.id
        WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
        LIMIT 1
      )) <> ''
      AND (
        SELECT profile.id
        FROM public.profiles AS profile
        JOIN auth.users AS auth_user ON auth_user.id = profile.id
        WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
        LIMIT 1
      ) IS DISTINCT FROM p_actor_id
      AND public.notification_preference_enabled(ticket.reporter_email, 'ticket_status'),
    btrim(ticket.reporter_email) <> ''
      AND public.notification_preference_enabled(ticket.reporter_email, 'ticket_status'),
    reporter.target_fingerprint IS NOT NULL
      AND (
        SELECT profile.id
        FROM public.profiles AS profile
        JOIN auth.users AS auth_user ON auth_user.id = profile.id
        WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
        LIMIT 1
      ) IS DISTINCT FROM p_actor_id
      AND public.notification_preference_enabled(ticket.reporter_email, 'ticket_status'),
    reporter.target_fingerprint
  FROM public.tickets AS ticket
  CROSS JOIN LATERAL (
    SELECT
      profile.id,
      auth_user.email,
      CASE
        WHEN profile.is_active IS TRUE
          AND auth_user.email = lower(btrim(ticket.reporter_email))
          AND webhook.enabled IS TRUE
          AND public.notification_preference_enabled(ticket.reporter_email, 'ticket_status')
        THEN webhook.target_fingerprint
      END AS target_fingerprint
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    LEFT JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    WHERE lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
    LIMIT 1
  ) AS reporter
  WHERE ticket.id = p_ticket_id

  UNION ALL

  SELECT
    technician.account_id,
    technician.account_email,
    technician.account_email,
    btrim(technician.account_email) <> ''
      AND technician.account_id IS DISTINCT FROM p_actor_id
      AND public.notification_preference_enabled(technician.account_email, 'ticket_status'),
    FALSE,
    technician.target_fingerprint IS NOT NULL
      AND technician.account_id IS DISTINCT FROM p_actor_id,
    technician.target_fingerprint
  FROM public.tickets AS ticket
  CROSS JOIN LATERAL (
    SELECT
      profile.id AS account_id,
      auth_user.email AS account_email,
      CASE
        WHEN profile.is_active IS TRUE
          AND webhook.enabled IS TRUE
          AND public.notification_preference_enabled(auth_user.email, 'ticket_status')
        THEN webhook.target_fingerprint
      END AS target_fingerprint
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    LEFT JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    WHERE profile.id = ticket.assigned_to
      AND profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
    LIMIT 1
  ) AS technician
  WHERE ticket.id = p_ticket_id
    AND technician.account_id IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_ticket_status_eligibility(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_ticket_status_eligibility(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_ticket_status_eligibility(UUID, UUID) TO service_role;

-- Status event mapping is owned here; status recipients come only from the resolver.
CREATE OR REPLACE FUNCTION public.enqueue_ticket_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  event_type TEXT;
  eligible_recipient RECORD;
  target_fingerprints TEXT[] := ARRAY[]::TEXT[];
BEGIN
  actor_id := auth.uid();

  BEGIN
    IF OLD.status = 'pending'::public.ticket_status AND NEW.status = 'in_progress'::public.ticket_status THEN
      event_type := 'in_progress';
    ELSIF OLD.status = 'in_progress'::public.ticket_status AND NEW.status = 'completed'::public.ticket_status THEN
      event_type := 'completed';
    ELSIF OLD.status = 'completed'::public.ticket_status AND NEW.status = 'closed'::public.ticket_status THEN
      event_type := 'closed';
    ELSIF OLD.status = 'in_progress'::public.ticket_status AND NEW.status = 'pending'::public.ticket_status THEN
      event_type := 'pending';
    ELSIF OLD.status = 'completed'::public.ticket_status AND NEW.status = 'in_progress'::public.ticket_status THEN
      event_type := 'in_progress';
    ELSIF OLD.status IN ('pending'::public.ticket_status, 'in_progress'::public.ticket_status)
      AND NEW.status = 'cancelled'::public.ticket_status THEN
      event_type := 'cancelled';
    ELSE
      RETURN NEW;
    END IF;

    FOR eligible_recipient IN
      SELECT *
      FROM public.resolve_ticket_status_eligibility(NEW.id, actor_id)
    LOOP
      IF eligible_recipient.eligible_for_in_app
        AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          eligible_recipient.recipient_id,
          NEW.id,
          event_type
        );
      END IF;

      IF eligible_recipient.eligible_for_email THEN
        PERFORM public.enqueue_notification_delivery(
          NEW.id,
          event_type,
          eligible_recipient.recipient_email,
          NEW.updated_at
        );
      END IF;

      IF eligible_recipient.eligible_for_social
        AND NOT (eligible_recipient.target_fingerprint = ANY (target_fingerprints)) THEN
        target_fingerprints := target_fingerprints || eligible_recipient.target_fingerprint;

        PERFORM public.enqueue_notification_delivery(
          NEW.id,
          event_type,
          NULL,
          NEW.updated_at,
          'social',
          eligible_recipient.target_fingerprint
        );
      END IF;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Ticket status notification could not be queued for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_in_app_ticket_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_email TEXT;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
    AND NEW.assigned_to IS NOT NULL THEN
    BEGIN
      SELECT auth_user.email
      INTO recipient_email
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE profile.id = NEW.assigned_to
        AND profile.user_role = 'technician'::public.user_role
        AND profile.is_active IS TRUE
        AND btrim(auth_user.email) <> '';

      IF recipient_email IS NOT NULL
        AND NEW.assigned_to IS DISTINCT FROM auth.uid()
        AND public.notification_preference_enabled(recipient_email, 'ticket_status') THEN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          NEW.assigned_to,
          NEW.id,
          'assigned'
        );
      END IF;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'In-app assignment could not be written for ticket %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ticket_notification_on_status_change ON public.tickets;
DROP TRIGGER IF EXISTS in_app_ticket_events_on_update ON public.tickets;

CREATE TRIGGER ticket_event_eligibility_on_update
  AFTER UPDATE OF status, assigned_to
  ON public.tickets
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
  )
  EXECUTE FUNCTION public.enqueue_ticket_status_notification();

CREATE TRIGGER in_app_ticket_events_on_update
  AFTER UPDATE OF assigned_to
  ON public.tickets
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION public.enqueue_in_app_ticket_event_notification();

DROP FUNCTION IF EXISTS public.enqueue_social_ticket_status_deliveries(UUID, TEXT, UUID);
