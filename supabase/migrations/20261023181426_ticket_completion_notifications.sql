-- Extend the notification trigger to cover completed and closed Tickets.
-- The delivery ledger, claim RPC, and Edge Function contract stay unchanged.

CREATE OR REPLACE FUNCTION public.enqueue_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_id UUID;
  delivery_status TEXT;
  recipient TEXT;
  stable_event_key TEXT;
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

  recipient := lower(btrim(coalesce(NEW.reporter_email, '')));

  IF recipient = '' THEN
    RETURN NEW;
  END IF;

  stable_event_key := format(
    'ticket:%s:%s:%s',
    NEW.id,
    event_type,
    extract(epoch FROM coalesce(NEW.updated_at, pg_catalog.now()))::text
  );

  INSERT INTO public.notification_log (
    ticket_id,
    event_type,
    event_key,
    recipient_email,
    status
  )
  VALUES (
    NEW.id,
    event_type,
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
    PERFORM public.invoke_notification_delivery(delivery_id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_notification() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ticket_notification_on_progress ON public.tickets;
DROP TRIGGER IF EXISTS ticket_notification_on_status_change ON public.tickets;

CREATE TRIGGER ticket_notification_on_status_change
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enqueue_ticket_notification();
