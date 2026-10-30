-- Centralize notification enqueueing so trigger adapters only resolve events and recipients.
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
  recipient TEXT;
  stable_event_key TEXT;
BEGIN
  IF p_event_type NOT IN ('new_ticket', 'in_progress', 'completed', 'closed') THEN
    RAISE EXCEPTION 'Unsupported notification event type: %', p_event_type;
  END IF;

  recipient := lower(btrim(coalesce(p_recipient_email, '')));

  IF recipient = '' THEN
    RETURN;
  END IF;

  IF p_event_type = 'new_ticket' THEN
    stable_event_key := format('ticket:%s:new_ticket', p_ticket_id);
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

DROP TRIGGER IF EXISTS ticket_notification_on_progress ON public.tickets;
DROP TRIGGER IF EXISTS ticket_notification_on_status_change ON public.tickets;

CREATE TRIGGER ticket_notification_on_status_change
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enqueue_ticket_status_notification();

CREATE OR REPLACE FUNCTION public.enqueue_new_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  FOR recipient IN
    SELECT DISTINCT auth_user.email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
    WHERE profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND subscription.category_id = NEW.category_id
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY 1
  LOOP
    PERFORM public.enqueue_notification_delivery(
      NEW.id,
      'new_ticket',
      recipient
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_new_ticket_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_new_ticket_notification() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ticket_notification_on_readiness ON public.tickets;

CREATE TRIGGER ticket_notification_on_readiness
  AFTER UPDATE OF notification_ready_at ON public.tickets
  FOR EACH ROW
  WHEN (OLD.notification_ready_at IS NULL AND NEW.notification_ready_at IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_new_ticket_notification();
