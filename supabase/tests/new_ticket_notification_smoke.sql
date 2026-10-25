BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  other_category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  ready_ticket_id UUID := gen_random_uuid();
  unready_ticket_id UUID := gen_random_uuid();
  eligible_user_id UUID := gen_random_uuid();
  inactive_user_id UUID := gen_random_uuid();
  admin_user_id UUID := gen_random_uuid();
  unsubscribed_user_id UUID := gen_random_uuid();
  empty_email_user_id UUID := gen_random_uuid();
  delivery_count INTEGER;
  delivery_id UUID;
  delivery_event_key TEXT;
  delivery_recipient TEXT;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'New Ticket Smoke Building', 'NTS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES
    (category_id, 'New Ticket Smoke Category', 9998),
    (other_category_id, 'New Ticket Smoke Other Category', 9997);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'New Ticket Smoke Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (eligible_user_id, 'Eligible@Example.com'),
    (inactive_user_id, 'inactive@example.com'),
    (admin_user_id, 'admin@example.com'),
    (unsubscribed_user_id, 'unsubscribed@example.com'),
    (empty_email_user_id, '');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (eligible_user_id, inactive_user_id, unsubscribed_user_id, empty_email_user_id);

  UPDATE public.profiles
  SET user_role = 'admin'::public.user_role
  WHERE id = admin_user_id;

  UPDATE public.profiles
  SET is_active = false
  WHERE id = inactive_user_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES
    (eligible_user_id, category_id),
    (inactive_user_id, category_id),
    (admin_user_id, category_id),
    (unsubscribed_user_id, other_category_id),
    (empty_email_user_id, category_id);

  ALTER TABLE public.technician_categories
    DROP CONSTRAINT technician_categories_pkey;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES (eligible_user_id, category_id);

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
      ready_ticket_id,
      'pending',
      category_id,
      space_id,
      'New Ticket smoke description',
      'reporter@example.com',
      '0912345678'
    ),
    (
      unready_ticket_id,
      'pending',
      category_id,
      space_id,
      'New Ticket unready smoke description',
      'reporter@example.com',
      '0912345678'
    );

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id IN (ready_ticket_id, unready_ticket_id);

  IF delivery_count <> 0 THEN
    RAISE EXCEPTION 'Expected no delivery before readiness, found %.', delivery_count;
  END IF;

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = ready_ticket_id;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ready_ticket_id;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one eligible Technician delivery, found %.', delivery_count;
  END IF;

  SELECT id, event_key, recipient_email
  INTO delivery_id, delivery_event_key, delivery_recipient
  FROM public.notification_log
  WHERE ticket_id = ready_ticket_id;

  IF delivery_recipient <> 'eligible@example.com' THEN
    RAISE EXCEPTION 'Expected normalized eligible recipient, found %.', delivery_recipient;
  END IF;

  SELECT count(*)
  INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = unready_ticket_id;

  IF delivery_count <> 0 THEN
    RAISE EXCEPTION 'Expected no delivery for an unready Ticket, found %.', delivery_count;
  END IF;

  BEGIN
    INSERT INTO public.notification_log (
      ticket_id,
      event_type,
      event_key,
      recipient_email
    )
    VALUES (
      ready_ticket_id,
      'new_ticket',
      delivery_event_key,
      delivery_recipient
    );

    RAISE EXCEPTION 'Expected duplicate new-ticket delivery to be rejected.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  IF has_function_privilege('anon', 'public.enqueue_new_ticket_notification()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute enqueue_new_ticket_notification.';
  END IF;

  IF has_function_privilege('authenticated', 'public.enqueue_new_ticket_notification()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute enqueue_new_ticket_notification.';
  END IF;
END
$$;

ROLLBACK;
