BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  ticket_a UUID := gen_random_uuid();
  ticket_b UUID := gen_random_uuid();
  delivery_id UUID;
  delivery_count INTEGER;
  completed_key_count INTEGER;
  delivery_event_type TEXT;
  delivery_event_key TEXT;
  delivery_status TEXT;
  delivery_recipient TEXT;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Notification Smoke Building ' || building_id, 'NS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Notification Smoke Category ' || category_id, 9999);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Notification Smoke Space', 1, building_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email
  )
  VALUES (
    ticket_a,
    'pending',
    category_id,
    space_id,
    'Notification smoke fixture A',
    'ReporterA@Example.com'
  );

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email,
    updated_at
  )
  VALUES (
    ticket_b,
    'completed',
    category_id,
    space_id,
    'Notification smoke fixture B',
    'ReporterB@Example.com',
    now() - interval '8 days'
  );

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = ticket_a;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one in_progress delivery, found %', delivery_count;
  END IF;

  SELECT id, event_key, status, recipient_email
  INTO delivery_id, delivery_event_key, delivery_status, delivery_recipient
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  IF delivery_status <> 'pending' THEN
    RAISE EXCEPTION 'Expected pending delivery, found %', delivery_status;
  END IF;

  IF delivery_recipient <> 'reportera@example.com' THEN
    RAISE EXCEPTION 'Expected normalized recipient, found %', delivery_recipient;
  END IF;

  BEGIN
    INSERT INTO public.notification_log (
      ticket_id,
      event_type,
      event_key,
      recipient_email
    )
    VALUES (
      ticket_a,
      'in_progress',
      delivery_event_key,
      'reportera@example.com'
    );

    RAISE EXCEPTION 'Expected duplicate delivery identity to be rejected.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = ticket_a;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  IF delivery_count <> 2 THEN
    RAISE EXCEPTION 'Expected one completed delivery, found % additional records.', delivery_count - 1;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = ticket_a;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  IF delivery_count <> 2 THEN
    RAISE EXCEPTION 'Expected reopen transition not to create delivery, found %.', delivery_count;
  END IF;

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = ticket_a;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  SELECT count(DISTINCT event_key)
  INTO completed_key_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a
    AND event_type = 'completed';

  IF delivery_count <> 3 OR completed_key_count <> 2 THEN
    RAISE EXCEPTION 'Expected two distinct completed event keys, found % records and % keys.', delivery_count, completed_key_count;
  END IF;

  UPDATE public.tickets
  SET status = 'closed'
  WHERE id = ticket_a;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_a;

  IF delivery_count <> 4 THEN
    RAISE EXCEPTION 'Expected one closed delivery, found % total records.', delivery_count;
  END IF;

  PERFORM public.auto_close_completed_tickets();

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ticket_b;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected auto-close to create one closed delivery, found %.', delivery_count;
  END IF;

  SELECT event_type
  INTO delivery_event_type
  FROM public.notification_log
  WHERE ticket_id = ticket_b;

  IF delivery_event_type <> 'closed' THEN
    RAISE EXCEPTION 'Expected auto-close delivery event type closed, found %.', delivery_event_type;
  END IF;

  IF has_table_privilege('anon', 'public.notification_log', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read notification_log.';
  END IF;

  IF has_table_privilege('authenticated', 'public.notification_log', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated must not read notification_log.';
  END IF;

  IF has_function_privilege('anon', 'public.claim_notification_delivery(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute claim_notification_delivery.';
  END IF;

  IF has_function_privilege('authenticated', 'public.claim_notification_delivery(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute claim_notification_delivery.';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.claim_notification_delivery(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must be able to execute claim_notification_delivery.';
  END IF;
END
$$;

ROLLBACK;
