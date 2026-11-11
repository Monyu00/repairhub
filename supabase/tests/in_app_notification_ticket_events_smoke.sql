BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  admin_id UUID := gen_random_uuid();
  technician_id UUID := gen_random_uuid();
  disabled_technician_id UUID := gen_random_uuid();
  disabled_reporter_id UUID := gen_random_uuid();
  assignment_ticket_id UUID := gen_random_uuid();
  completed_ticket_id UUID := gen_random_uuid();
  closed_ticket_id UUID := gen_random_uuid();
  reopened_ticket_id UUID := gen_random_uuid();
  returned_ticket_id UUID := gen_random_uuid();
  self_claim_ticket_id UUID := gen_random_uuid();
  disabled_ticket_id UUID := gen_random_uuid();
  failure_ticket_id UUID := gen_random_uuid();
  notification_count INTEGER;
  ticket_status TEXT;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'In App Ticket Event Building', 'IATE-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'In App Ticket Event Category', 9993);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'In App Ticket Event Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (admin_id, 'in-app-ticket-admin@example.com'),
    (technician_id, 'in-app-ticket-technician@example.com'),
    (disabled_technician_id, 'in-app-ticket-disabled@example.com'),
    (disabled_reporter_id, 'in-app-ticket-reporter@example.com');

  UPDATE public.profiles
  SET user_role = 'admin'::public.user_role
  WHERE id = admin_id;

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (technician_id, disabled_technician_id);

  UPDATE public.profiles
  SET notification_preferences = '{"ticket_status": false}'::jsonb
  WHERE id IN (disabled_reporter_id, disabled_technician_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email,
    reporter_phone,
    assigned_to
  )
  VALUES
    (
      assignment_ticket_id,
      'pending',
      category_id,
      space_id,
      'In-app assignment smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      NULL
    ),
    (
      completed_ticket_id,
      'in_progress',
      category_id,
      space_id,
      'In-app completed smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      technician_id
    ),
    (
      closed_ticket_id,
      'completed',
      category_id,
      space_id,
      'In-app closed smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      technician_id
    ),
    (
      reopened_ticket_id,
      'completed',
      category_id,
      space_id,
      'In-app reopen smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      technician_id
    ),
    (
      returned_ticket_id,
      'in_progress',
      category_id,
      space_id,
      'In-app return smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      technician_id
    ),
    (
      self_claim_ticket_id,
      'pending',
      category_id,
      space_id,
      'In-app self-claim smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      NULL
    ),
    (
      disabled_ticket_id,
      'in_progress',
      category_id,
      space_id,
      'In-app disabled preference smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      disabled_technician_id
    ),
    (
      failure_ticket_id,
      'in_progress',
      category_id,
      space_id,
      'In-app failure smoke fixture',
      'in-app-ticket-reporter@example.com',
      '0912345678',
      technician_id
    );

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET status = 'in_progress', assigned_to = technician_id
  WHERE id = assignment_ticket_id;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = assignment_ticket_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one assignment notification, found %.', notification_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = assignment_ticket_id
      AND (event_type <> 'assigned' OR recipient_id <> technician_id)
  ) THEN
    RAISE EXCEPTION 'Assignment must notify only the assigned technician.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', technician_id, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET status = 'in_progress', assigned_to = technician_id
  WHERE id = self_claim_ticket_id;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = self_claim_ticket_id;

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'A self-claim must not create an in-app notification, found %.', notification_count;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = completed_ticket_id;

  UPDATE public.tickets
  SET status = 'closed'
  WHERE id = closed_ticket_id;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = reopened_ticket_id;

  UPDATE public.tickets
  SET status = 'pending', assigned_to = NULL
  WHERE id = returned_ticket_id;

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = disabled_ticket_id;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = completed_ticket_id
    AND event_type = 'completed'
    AND recipient_id = technician_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one completed notification, found %.', notification_count;
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = closed_ticket_id
    AND event_type = 'closed'
    AND recipient_id = technician_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one closed notification, found %.', notification_count;
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = reopened_ticket_id
    AND event_type = 'in_progress'
    AND recipient_id = technician_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one reopened notification, found %.', notification_count;
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = returned_ticket_id
    AND event_type = 'pending'
    AND recipient_id = technician_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one returned-to-pending notification, found %.', notification_count;
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = disabled_ticket_id;

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'A disabled ticket_status preference must not create an in-app notification, found %.', notification_count;
  END IF;

  CREATE FUNCTION public.block_in_app_ticket_event_smoke()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $smoke$
  BEGIN
    RAISE EXCEPTION 'Simulated in-app Ticket event failure.';
  END;
  $smoke$;

  CREATE TRIGGER block_in_app_ticket_event_smoke
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.block_in_app_ticket_event_smoke();

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = failure_ticket_id;

  SELECT status INTO ticket_status
  FROM public.tickets
  WHERE id = failure_ticket_id;

  IF ticket_status <> 'completed'::public.ticket_status THEN
    RAISE EXCEPTION 'A failed in-app notification must not block the Ticket write.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = failure_ticket_id
  ) THEN
    RAISE EXCEPTION 'A failed in-app notification insert must not remain.';
  END IF;
END
$$;

ROLLBACK;
