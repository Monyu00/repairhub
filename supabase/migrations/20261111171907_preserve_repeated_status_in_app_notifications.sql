-- Status events can recur for the same ticket, while new-ticket readiness is one-shot.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_recipient_ticket_event_unique;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_ticket_new_ticket_unique
  ON public.notifications (recipient_id, ticket_id, event_type)
  WHERE event_type = 'new_ticket';

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  recipient_id UUID;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  FOR recipient_id, recipient IN
    SELECT DISTINCT profile.id, auth_user.email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
    WHERE profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND subscription.category_id = NEW.category_id
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY auth_user.email
  LOOP
    BEGIN
      IF public.notification_preference_enabled(recipient, 'new_ticket') THEN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          recipient_id,
          NEW.id,
          'new_ticket'
        )
        ON CONFLICT (recipient_id, ticket_id, event_type)
          WHERE event_type = 'new_ticket'
        DO NOTHING;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'In-app notification could not be written for ticket %: %', NEW.id, SQLERRM;
    END;

    PERFORM public.enqueue_notification_delivery(
      NEW.id,
      'new_ticket',
      recipient
    );
  END LOOP;

  PERFORM public.enqueue_notification_delivery(
    NEW.id,
    'report_submitted',
    NEW.reporter_email
  );

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
      );
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'In-app Ticket notification could not be written for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
