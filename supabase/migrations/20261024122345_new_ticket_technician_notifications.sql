-- Gate new Ticket notifications until intake and report photos have committed.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS notification_ready_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.enqueue_new_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_email TEXT;
  delivery_id UUID;
  delivery_status TEXT;
  stable_event_key TEXT;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- A Ticket has one logical new_ticket event, regardless of later row updates.
  stable_event_key := format('ticket:%s:new_ticket', NEW.id);

  FOR recipient_email IN
    SELECT DISTINCT lower(btrim(auth_user.email))
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
    INSERT INTO public.notification_log (
      ticket_id,
      event_type,
      event_key,
      recipient_email,
      status
    )
    VALUES (
      NEW.id,
      'new_ticket',
      stable_event_key,
      recipient_email,
      'pending'
    )
    ON CONFLICT (event_key, recipient_email) DO NOTHING
    RETURNING id INTO delivery_id;

    IF delivery_id IS NULL THEN
      SELECT notification.id, notification.status
      INTO delivery_id, delivery_status
      FROM public.notification_log AS notification
      WHERE notification.event_key = stable_event_key
        AND notification.recipient_email = recipient_email;
    ELSE
      delivery_status := 'pending';
    END IF;

    IF delivery_id IS NOT NULL AND delivery_status = 'pending' THEN
      PERFORM public.invoke_notification_delivery(delivery_id);
    END IF;
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
