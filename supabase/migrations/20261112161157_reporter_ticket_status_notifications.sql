-- Give the Reporter the same status Events as the assigned Technician, and add
-- the missing cancelled Event to both channels.

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
      'closed',
      'cancelled'
    )
  );

-- Same body as the report-submitted migration, with cancelled allowed; the
-- ticket_status preference key and the timestamped event key apply unchanged.
CREATE OR REPLACE FUNCTION public.enqueue_notification_delivery(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_recipient_email TEXT,
  p_event_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_id UUID;
  delivery_status TEXT;
  preference_key TEXT;
  recipient TEXT;
  stable_event_key TEXT;
BEGIN
  IF p_event_type NOT IN ('new_ticket', 'report_submitted', 'in_progress', 'completed', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported notification event type: %', p_event_type;
  END IF;

  recipient := lower(btrim(coalesce(p_recipient_email, '')));

  IF recipient = '' THEN
    RETURN;
  END IF;

  preference_key := CASE p_event_type
    WHEN 'new_ticket' THEN 'new_ticket'
    ELSE 'ticket_status'
  END;

  IF NOT public.notification_preference_enabled(recipient, preference_key) THEN
    RETURN;
  END IF;

  IF p_event_type IN ('new_ticket', 'report_submitted') THEN
    stable_event_key := format('ticket:%s:%s', p_ticket_id, p_event_type);
  ELSIF p_event_at IS NULL THEN
    RAISE EXCEPTION 'Event timestamp is required for notification event type: %', p_event_type;
  ELSE
    stable_event_key := format(
      'ticket:%s:%s:%s',
      p_ticket_id,
      p_event_type,
      extract(epoch FROM p_event_at)::text
    );
  END IF;

  INSERT INTO public.notification_log (
    ticket_id,
    event_type,
    event_key,
    recipient_email,
    status
  )
  VALUES (
    p_ticket_id,
    p_event_type,
    stable_event_key,
    recipient,
    'pending'
  )
  ON CONFLICT (event_key, recipient_email) DO NOTHING
  RETURNING id INTO delivery_id;

  IF delivery_id IS NULL THEN
    SELECT notification.id, notification.status
    INTO delivery_id, delivery_status
    FROM public.notification_log AS notification
    WHERE notification.event_key = stable_event_key
      AND notification.recipient_email = recipient;
  ELSE
    delivery_status := 'pending';
  END IF;

  IF delivery_id IS NOT NULL AND delivery_status = 'pending' THEN
    BEGIN
      PERFORM public.invoke_notification_delivery(delivery_id);
    EXCEPTION WHEN others THEN
      UPDATE public.notification_log
      SET
        last_error = SQLERRM,
        next_attempt_at = pg_catalog.now() + interval '5 minutes'
      WHERE id = delivery_id;

      RAISE WARNING 'Notification delivery % could not be invoked: %', delivery_id, SQLERRM;
    END;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM anon, authenticated;

-- Reporter Email Events add the pending -> in_progress and the
-- pending / in_progress -> cancelled transitions. The Email path never excludes
-- the actor; only the in-app Reporter notification does.
CREATE OR REPLACE FUNCTION public.enqueue_ticket_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_type TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'in_progress' THEN
    event_type := 'in_progress';
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    event_type := 'completed';
  ELSIF OLD.status = 'completed' AND NEW.status = 'closed' THEN
    event_type := 'closed';
  ELSIF OLD.status IN ('pending'::public.ticket_status, 'in_progress'::public.ticket_status)
    AND NEW.status = 'cancelled' THEN
    event_type := 'cancelled';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_notification_delivery(
    NEW.id,
    event_type,
    NEW.reporter_email,
    NEW.updated_at
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM anon, authenticated;

-- The Technician leg keeps its existing event rules and takes the assignment
-- branch first; the Reporter leg is independent so a combined
-- pending -> in_progress assignment still notifies the Reporter.
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
  v_reporter_id UUID;
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
      )
      OR (
        OLD.status IN ('pending'::public.ticket_status, 'in_progress'::public.ticket_status)
        AND NEW.status = 'cancelled'::public.ticket_status
      ) THEN
      v_event_type := NEW.status::text;
      v_recipient_id := COALESCE(NEW.assigned_to, OLD.assigned_to);
    ELSE
      v_recipient_id := NULL;
    END IF;

    -- A missing actor (the auto-close path) excludes nobody, so the Technician
    -- still receives the Event.
    IF COALESCE(v_recipient_id <> v_actor_id, TRUE) THEN
      SELECT auth_user.email
      INTO v_recipient_email
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE profile.id = v_recipient_id
        AND profile.user_role = 'technician'::public.user_role
        AND profile.is_active IS TRUE
        AND auth_user.email IS NOT NULL
        AND btrim(auth_user.email) <> '';

      IF v_recipient_email IS NOT NULL
        AND public.notification_preference_enabled(v_recipient_email, 'ticket_status') THEN
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
        ON CONFLICT (recipient_id, ticket_id, event_type)
          WHERE event_type = 'new_ticket'
        DO NOTHING;
      END IF;
    END IF;

    IF OLD.status = 'pending'::public.ticket_status
      AND NEW.status = 'in_progress'::public.ticket_status THEN
      v_event_type := 'in_progress';
    ELSIF OLD.status = 'in_progress'::public.ticket_status
      AND NEW.status = 'completed'::public.ticket_status THEN
      v_event_type := 'completed';
    ELSIF OLD.status = 'completed'::public.ticket_status
      AND NEW.status = 'closed'::public.ticket_status THEN
      v_event_type := 'closed';
    ELSIF OLD.status IN ('pending'::public.ticket_status, 'in_progress'::public.ticket_status)
      AND NEW.status = 'cancelled'::public.ticket_status THEN
      v_event_type := 'cancelled';
    ELSE
      v_event_type := NULL;
    END IF;

    IF v_event_type IS NOT NULL THEN
      -- The Reporter link is the Ticket Email: a Reporter whose report Email
      -- differs from their account Email receives no in-app notification.
      SELECT profile.id
      INTO v_reporter_id
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE lower(btrim(auth_user.email)) = lower(btrim(NEW.reporter_email))
        AND lower(btrim(auth_user.email)) <> ''
      LIMIT 1;

      IF v_reporter_id IS NOT NULL
        AND COALESCE(v_reporter_id <> v_actor_id, TRUE)
        AND public.notification_preference_enabled(NEW.reporter_email, 'ticket_status') THEN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          v_reporter_id,
          NEW.id,
          v_event_type
        )
        ON CONFLICT (recipient_id, ticket_id, event_type)
          WHERE event_type = 'new_ticket'
        DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'In-app Ticket notification could not be written for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_in_app_ticket_event_notification() FROM anon, authenticated;
