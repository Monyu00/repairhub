-- In-app Ticket events use the existing notification table and only resolve the
-- recipient/event before delegating to its per-recipient unique ledger.
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_event_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_event_type_check
  CHECK (
    event_type IN (
      'new_ticket',
      'assigned',
      'pending',
      'in_progress',
      'completed',
      'closed'
    )
  );

CREATE OR REPLACE FUNCTION public.enqueue_in_app_ticket_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_event_type TEXT;
  v_recipient_id UUID;
  v_recipient_email TEXT;
BEGIN
  BEGIN
    v_actor_id := auth.uid();

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
      AND NEW.assigned_to IS NOT NULL THEN
      v_event_type := 'assigned';
      v_recipient_id := NEW.assigned_to;
    ELSIF
      (
        OLD.status = 'in_progress'::public.ticket_status
        AND NEW.status = 'completed'::public.ticket_status
      )
      OR (
        OLD.status = 'completed'::public.ticket_status
        AND NEW.status = 'closed'::public.ticket_status
      )
      OR (
        OLD.status = 'in_progress'::public.ticket_status
        AND NEW.status = 'pending'::public.ticket_status
      )
      OR (
        OLD.status = 'completed'::public.ticket_status
        AND NEW.status = 'in_progress'::public.ticket_status
      ) THEN
      v_event_type := NEW.status::text;
      v_recipient_id := COALESCE(NEW.assigned_to, OLD.assigned_to);
    ELSE
      RETURN NEW;
    END IF;

    IF v_recipient_id IS NULL OR v_recipient_id = v_actor_id THEN
      RETURN NEW;
    END IF;

    SELECT auth_user.email
    INTO v_recipient_email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.id = v_recipient_id
      AND profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> '';

    IF v_recipient_email IS NULL THEN
      RETURN NEW;
    END IF;

    IF public.notification_preference_enabled(v_recipient_email, 'ticket_status') THEN
      INSERT INTO public.notifications (
        recipient_id,
        ticket_id,
        event_type
      )
      VALUES (
        v_recipient_id,
        NEW.id,
        v_event_type
      )
      ON CONFLICT (recipient_id, ticket_id, event_type) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'In-app Ticket notification could not be written for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM anon, authenticated;

DROP TRIGGER IF EXISTS in_app_ticket_events_on_update ON public.tickets;

CREATE TRIGGER in_app_ticket_events_on_update
  AFTER UPDATE OF status, assigned_to
  ON public.tickets
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
  )
  EXECUTE FUNCTION public.enqueue_in_app_ticket_event_notification();
