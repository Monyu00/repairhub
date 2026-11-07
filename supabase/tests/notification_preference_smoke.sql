BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  ready_ticket_id UUID := gen_random_uuid();
  status_ticket_disabled_id UUID := gen_random_uuid();
  status_ticket_enabled_id UUID := gen_random_uuid();
  status_ticket_gated_id UUID := gen_random_uuid();
  technician_disabled_id UUID := gen_random_uuid();
  technician_enabled_id UUID := gen_random_uuid();
  technician_explicit_true_id UUID := gen_random_uuid();
  reporter_disabled_id UUID := gen_random_uuid();
  reporter_enabled_id UUID := gen_random_uuid();
  unsupported_event_raised BOOLEAN := FALSE;
  delivery_count INTEGER;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Notification Preference Smoke Building', 'NPS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Notification Preference Smoke Category', 9995);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Notification Preference Smoke Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (technician_disabled_id, 'pref-tech-disabled@example.com'),
    (technician_enabled_id, 'pref-tech-enabled@example.com'),
    (technician_explicit_true_id, 'pref-tech-explicit-true@example.com'),
    (reporter_disabled_id, 'pref-reporter-disabled@example.com'),
    (reporter_enabled_id, 'pref-reporter-enabled@example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (technician_disabled_id, technician_enabled_id, technician_explicit_true_id);

  UPDATE public.profiles
  SET notification_preferences = '{"new_ticket": false}'::jsonb
  WHERE id = technician_disabled_id;

  UPDATE public.profiles
  SET notification_preferences = '{"new_ticket": true}'::jsonb
  WHERE id = technician_explicit_true_id;

  UPDATE public.profiles
  SET notification_preferences = '{"ticket_status": false}'::jsonb
  WHERE id = reporter_disabled_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES
    (technician_disabled_id, category_id),
    (technician_enabled_id, category_id),
    (technician_explicit_true_id, category_id);

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
      'Notification preference new-ticket smoke fixture',
      'pref-tech-disabled@example.com',
      '0912345678'
    ),
    (
      status_ticket_disabled_id,
      'pending',
      category_id,
      space_id,
      'Notification preference status smoke fixture A',
      'pref-reporter-disabled@example.com',
      '0912345678'
    ),
    (
      status_ticket_enabled_id,
      'pending',
      category_id,
      space_id,
      'Notification preference status smoke fixture B',
      'pref-reporter-enabled@example.com',
      '0912345678'
    ),
    (
      status_ticket_gated_id,
      'pending',
      category_id,
      space_id,
      'Notification preference status smoke fixture C',
      'pref-reporter-disabled@example.com',
      '0912345678'
    );

  -- a. Two Technicians share the category; only the one with new_ticket off is skipped.
  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = ready_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = ready_ticket_id
      AND recipient_email = 'pref-tech-disabled@example.com'
  ) THEN
    RAISE EXCEPTION 'a. A disabled new_ticket preference must not write a Delivery.';
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = ready_ticket_id;

  IF delivery_count <> 2 THEN
    RAISE EXCEPTION 'a. Expected the enabled and explicitly-true Technicians, found %.', delivery_count;
  END IF;

  -- b. The Reporter preference gates the status change, and completed/closed share its key.
  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id IN (status_ticket_disabled_id, status_ticket_enabled_id);

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = status_ticket_disabled_id
  ) THEN
    RAISE EXCEPTION 'b. A disabled ticket_status preference must not write a Delivery.';
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = status_ticket_enabled_id;

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'b. Expected one Reporter Delivery with a default preference, found %.', delivery_count;
  END IF;

  PERFORM public.enqueue_notification_delivery(
    status_ticket_gated_id,
    'completed',
    'pref-reporter-disabled@example.com',
    now()
  );

  PERFORM public.enqueue_notification_delivery(
    status_ticket_gated_id,
    'closed',
    'pref-reporter-disabled@example.com',
    now()
  );

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = status_ticket_gated_id
  ) THEN
    RAISE EXCEPTION 'b. completed and closed must use the ticket_status preference key.';
  END IF;

  -- c. Missing keys and unknown Accounts stay enabled; the whitelist still raises.
  IF public.notification_preference_enabled('pref-tech-disabled@example.com', 'new_ticket') THEN
    RAISE EXCEPTION 'c. An explicit false must disable the Event.';
  END IF;

  IF NOT public.notification_preference_enabled('Pref-Tech-Disabled@Example.com', 'unknown_event') THEN
    RAISE EXCEPTION 'c. A missing key must stay enabled.';
  END IF;

  IF NOT public.notification_preference_enabled('pref-tech-enabled@example.com', 'new_ticket') THEN
    RAISE EXCEPTION 'c. An empty object must stay enabled.';
  END IF;

  IF NOT public.notification_preference_enabled('pref-tech-explicit-true@example.com', 'new_ticket') THEN
    RAISE EXCEPTION 'c. An explicit true must stay enabled.';
  END IF;

  IF NOT public.notification_preference_enabled('unknown-account@example.com', 'new_ticket') THEN
    RAISE EXCEPTION 'c. An unknown Account must stay enabled without raising.';
  END IF;

  IF NOT public.notification_preference_enabled(NULL::text, 'new_ticket') THEN
    RAISE EXCEPTION 'c. A NULL recipient must stay enabled without raising.';
  END IF;

  BEGIN
    PERFORM public.enqueue_notification_delivery(
      status_ticket_gated_id,
      'unsupported_event',
      'pref-reporter-disabled@example.com',
      now()
    );
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'Unsupported notification event type%' THEN
      unsupported_event_raised := TRUE;
    ELSE
      RAISE EXCEPTION 'c. Unsupported event types must still raise, found %', SQLERRM;
    END IF;
  END;

  IF NOT unsupported_event_raised THEN
    RAISE EXCEPTION 'c. Unsupported event types must still raise.';
  END IF;

  -- d. anon/authenticated keep no EXECUTE on the new helper or the enqueue functions.
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('anon', 'public.notification_preference_enabled(TEXT, TEXT)'),
      ('authenticated', 'public.notification_preference_enabled(TEXT, TEXT)'),
      ('anon', 'public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ)'),
      ('authenticated', 'public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ)'),
      ('anon', 'public.enqueue_ticket_status_notification()'),
      ('authenticated', 'public.enqueue_ticket_status_notification()'),
      ('anon', 'public.enqueue_new_ticket_notification()'),
      ('authenticated', 'public.enqueue_new_ticket_notification()')
    ) AS gated(role_name, function_signature)
    WHERE has_function_privilege(gated.role_name::name, gated.function_signature::regprocedure, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'd. anon/authenticated must not execute the gated functions.';
  END IF;
END
$$;

ROLLBACK;
