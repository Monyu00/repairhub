BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  active_admin_id UUID := gen_random_uuid();
  other_admin_id UUID := gen_random_uuid();
  disabled_admin_id UUID := gen_random_uuid();
  inactive_admin_id UUID := gen_random_uuid();
  active_technician_id UUID := gen_random_uuid();
  other_technician_id UUID := gen_random_uuid();
  admin_ticket_id UUID := gen_random_uuid();
  technician_ticket_id UUID := gen_random_uuid();
  uid_actor_ticket_id UUID := gen_random_uuid();
  notification_count INTEGER;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);

  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Admin New Ticket Smoke Building', 'ANTS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Admin New Ticket Smoke Category', 9991);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Admin New Ticket Smoke Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (active_admin_id, 'admin-new-ticket-a@example.com'),
    (other_admin_id, 'admin-new-ticket-b@example.com'),
    (disabled_admin_id, 'admin-new-ticket-disabled@example.com'),
    (inactive_admin_id, 'admin-new-ticket-inactive@example.com'),
    (active_technician_id, 'technician-new-ticket-a@example.com'),
    (other_technician_id, 'technician-new-ticket-b@example.com');

  UPDATE public.profiles
  SET user_role = 'admin'::public.user_role
  WHERE id IN (active_admin_id, other_admin_id, disabled_admin_id, inactive_admin_id);

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (active_technician_id, other_technician_id);

  UPDATE public.profiles
  SET notification_preferences = '{"new_ticket": false}'::jsonb
  WHERE id = disabled_admin_id;

  UPDATE public.profiles
  SET is_active = false
  WHERE id = inactive_admin_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES
    (active_technician_id, category_id),
    (other_technician_id, category_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email,
    reporter_phone
  )
  VALUES
    (
      admin_ticket_id,
      'pending',
      category_id,
      space_id,
      'Admin actor smoke fixture',
      'admin-new-ticket-a@example.com',
      '0912345678'
    ),
    (
      technician_ticket_id,
      'pending',
      category_id,
      space_id,
      'Technician actor smoke fixture',
      'technician-new-ticket-a@example.com',
      '0912345678'
    ),
    (
      uid_actor_ticket_id,
      'pending',
      category_id,
      space_id,
      'auth.uid actor smoke fixture',
      'uid-actor-reporter@example.com',
      '0912345678'
    );

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id IN (admin_ticket_id, technician_ticket_id);

  -- Admin actor is excluded; other active Admins receive the in-app Notice.
  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = admin_ticket_id
    AND recipient_id = other_admin_id
    AND event_type = 'new_ticket';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected the other active Admin to receive one in-app new_ticket Notice.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = admin_ticket_id
    AND recipient_id = active_admin_id;

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'The Admin actor must not receive their own new_ticket Notice.';
  END IF;

  -- Preference and active-status gates still apply to Admins.
  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = admin_ticket_id
    AND recipient_id IN (disabled_admin_id, inactive_admin_id);

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'A disabled or inactive Admin must not receive a new_ticket Notice.';
  END IF;

  -- Technician actors use the same Email fallback when auth.uid() is NULL.
  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = technician_ticket_id
    AND recipient_id = active_technician_id;

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'A Technician actor must not receive their own new_ticket Notice.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = technician_ticket_id
    AND recipient_id = other_technician_id
    AND event_type = 'new_ticket';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Another subscribed Technician must still receive one new_ticket Notice.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = technician_ticket_id
    AND recipient_id IN (active_admin_id, other_admin_id)
    AND event_type = 'new_ticket';

  IF notification_count <> 2 THEN
    RAISE EXCEPTION 'Both active Admins must receive the Technician-created Ticket Notice.';
  END IF;

  -- auth.uid() is the primary actor identity when a non-service-role caller writes readiness.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', other_admin_id, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = uid_actor_ticket_id;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = uid_actor_ticket_id
    AND recipient_id = other_admin_id;

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'The auth.uid() actor must not receive their own new_ticket Notice.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = uid_actor_ticket_id
    AND recipient_id = active_admin_id
    AND event_type = 'new_ticket';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'A non-actor Admin must still receive the new_ticket Notice.';
  END IF;

  PERFORM set_config('request.jwt.claims', NULL, true);

  -- Admin is in-app only; Technician Email Dispatch behavior is unchanged.
  SELECT count(*) INTO notification_count
  FROM public.notification_log
  WHERE ticket_id = admin_ticket_id
    AND event_type = 'new_ticket'
    AND recipient_email IN (
      'admin-new-ticket-a@example.com',
      'admin-new-ticket-b@example.com',
      'admin-new-ticket-disabled@example.com',
      'admin-new-ticket-inactive@example.com'
    );

  IF notification_count <> 0 THEN
    RAISE EXCEPTION 'Admins must not receive new_ticket Email Deliveries.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notification_log
  WHERE ticket_id = admin_ticket_id
    AND event_type = 'new_ticket'
    AND recipient_email = 'technician-new-ticket-a@example.com';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'A subscribed Technician must still receive the new_ticket Email for an Admin Ticket.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notification_log
  WHERE ticket_id = technician_ticket_id
    AND event_type = 'new_ticket'
    AND recipient_email = 'technician-new-ticket-a@example.com';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'A Technician actor must still receive the existing new_ticket Email Delivery.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notification_log
  WHERE ticket_id = technician_ticket_id
    AND event_type = 'new_ticket'
    AND recipient_email = 'technician-new-ticket-b@example.com';

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'The other subscribed Technician must still receive the new_ticket Email.';
  END IF;

  SELECT count(*) INTO notification_count
  FROM public.notification_log
  WHERE ticket_id IN (admin_ticket_id, technician_ticket_id, uid_actor_ticket_id)
    AND event_type = 'report_submitted';

  IF notification_count <> 3 THEN
    RAISE EXCEPTION 'The Reporter Submission Confirmation must remain in place for every Ticket.';
  END IF;
END
$$;

ROLLBACK;
