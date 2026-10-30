BEGIN;

CREATE OR REPLACE FUNCTION public.invoke_notification_delivery(p_delivery_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'simulated notification dispatch failure';
END;
$$;

DO $queue_smoke$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  status_ticket_id UUID := gen_random_uuid();
  new_ticket_id UUID := gen_random_uuid();
  ledger_failure_ticket_id UUID := gen_random_uuid();
  technician_id UUID := gen_random_uuid();
  delivery_count INTEGER;
  ticket_status TEXT;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Notification Queue Smoke Building', 'NQS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Notification Queue Smoke Category', 9996);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Notification Queue Smoke Space', 1, building_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email
  )
  VALUES
    (
      status_ticket_id,
      'pending',
      category_id,
      space_id,
      'Status dispatch failure smoke fixture',
      'ReportER@Example.com'
    ),
    (
      new_ticket_id,
      'pending',
      category_id,
      space_id,
      'New ticket dispatch failure smoke fixture',
      'reporter@example.com'
    ),
    (
      ledger_failure_ticket_id,
      'pending',
      category_id,
      space_id,
      'Ledger failure smoke fixture',
      'reporter@example.com'
    );

  BEGIN
    UPDATE public.tickets
    SET status = 'in_progress'
    WHERE id = status_ticket_id;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Status dispatch failure blocked the Ticket write: %', SQLERRM;
  END;

  SELECT status INTO ticket_status
  FROM public.tickets
  WHERE id = status_ticket_id;

  IF ticket_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Expected Ticket status to commit after dispatch failure, found %.', ticket_status;
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = status_ticket_id;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one Reporter Delivery, found %.', delivery_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = status_ticket_id
      AND event_type = 'in_progress'
      AND recipient_email = 'reporter@example.com'
      AND event_key = format('ticket:%s:in_progress:%s', status_ticket_id,
        extract(epoch FROM (SELECT updated_at FROM public.tickets WHERE id = status_ticket_id))::text)
      AND last_error = 'simulated notification dispatch failure'
      AND next_attempt_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected the failed Reporter Delivery to stay queued for retry.';
  END IF;

  PERFORM public.enqueue_notification_delivery(
    status_ticket_id,
    'in_progress',
    'ReportER@Example.com',
    (SELECT updated_at FROM public.tickets WHERE id = status_ticket_id)
  );

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = status_ticket_id;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected duplicate Status Delivery to deduplicate, found %.', delivery_count;
  END IF;

  INSERT INTO auth.users (id, email)
  VALUES (technician_id, 'Technician@Example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id = technician_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES (technician_id, category_id);

  BEGIN
    UPDATE public.tickets
    SET notification_ready_at = now()
    WHERE id = new_ticket_id;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'New-Ticket dispatch failure blocked the Ticket write: %', SQLERRM;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE id = new_ticket_id
      AND notification_ready_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected New-Ticket readiness to commit after dispatch failure.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = new_ticket_id
      AND event_type = 'new_ticket'
      AND recipient_email = 'technician@example.com'
      AND event_key = format('ticket:%s:new_ticket', new_ticket_id)
      AND last_error = 'simulated notification dispatch failure'
      AND next_attempt_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected the failed Technician Delivery to stay queued for retry.';
  END IF;

  CREATE OR REPLACE FUNCTION public.fail_notification_log_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RAISE EXCEPTION 'simulated notification ledger failure';
  END;
  $$;

  CREATE TRIGGER notification_queue_smoke_fail_ledger
    BEFORE INSERT ON public.notification_log
    FOR EACH ROW
    EXECUTE FUNCTION public.fail_notification_log_insert();

  BEGIN
    UPDATE public.tickets
    SET status = 'in_progress'
    WHERE id = ledger_failure_ticket_id;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  SELECT status INTO ticket_status
  FROM public.tickets
  WHERE id = ledger_failure_ticket_id;

  IF ticket_status <> 'pending' THEN
    RAISE EXCEPTION 'Expected a ledger failure to block the Ticket write, found %.', ticket_status;
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ledger_failure_ticket_id;

  IF delivery_count <> 0 THEN
    RAISE EXCEPTION 'Expected no partial Delivery after a ledger failure, found %.', delivery_count;
  END IF;
END
$queue_smoke$;

ROLLBACK;
