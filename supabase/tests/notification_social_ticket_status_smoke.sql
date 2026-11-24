BEGIN;

DO $notification_social_ticket_status_smoke$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  technician_id UUID := gen_random_uuid();
  reporter_id UUID := gen_random_uuid();
  actor_id UUID := gen_random_uuid();
  shared_technician_id UUID := gen_random_uuid();
  shared_reporter_id UUID := gen_random_uuid();
  preference_disabled_id UUID := gen_random_uuid();
  switch_disabled_id UUID := gen_random_uuid();
  lifecycle_ticket_id UUID := gen_random_uuid();
  reopen_ticket_id UUID := gen_random_uuid();
  actor_excluded_ticket_id UUID := gen_random_uuid();
  anonymous_reporter_ticket_id UUID := gen_random_uuid();
  shared_target_ticket_id UUID := gen_random_uuid();
  preference_disabled_ticket_id UUID := gen_random_uuid();
  switch_disabled_ticket_id UUID := gen_random_uuid();
  delivery_count INTEGER;
  event_keys TEXT[];
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Social Status Smoke Building', 'SSS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Social Status Smoke Category', 9993);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Social Status Smoke Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (technician_id, 'SocialStatusTechnician@Example.com'),
    (reporter_id, 'SocialStatusReporter@Example.com'),
    (actor_id, 'SocialStatusActor@Example.com'),
    (shared_technician_id, 'SocialStatusSharedTechnician@Example.com'),
    (shared_reporter_id, 'SocialStatusSharedReporter@Example.com'),
    (preference_disabled_id, 'SocialStatusPreferenceDisabled@Example.com'),
    (switch_disabled_id, 'SocialStatusSwitchDisabled@Example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (
    technician_id,
    actor_id,
    shared_technician_id,
    preference_disabled_id,
    switch_disabled_id
  );

  INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint, enabled)
  VALUES
    (technician_id, 'https://discord.com/api/webhooks/1/fake-status-tech', 'status-tech', true),
    (reporter_id, 'https://discord.com/api/webhooks/2/fake-status-reporter', 'status-reporter', true),
    (actor_id, 'https://discord.com/api/webhooks/3/fake-status-actor', 'status-actor', true),
    (shared_technician_id, 'https://discord.com/api/webhooks/4/fake-status-shared-tech', 'status-shared', true),
    (shared_reporter_id, 'https://discord.com/api/webhooks/5/fake-status-shared-reporter', 'status-shared', true),
    (preference_disabled_id, 'https://discord.com/api/webhooks/6/fake-status-preference', 'status-preference-disabled', true),
    (switch_disabled_id, 'https://discord.com/api/webhooks/7/fake-status-switch', 'status-switch-disabled', false);

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('ticket_status', false)
  WHERE id = preference_disabled_id;

  INSERT INTO public.tickets (
    id,
    status,
    assigned_to,
    category_id,
    space_id,
    description,
    reporter_email
  )
  VALUES
    (
      lifecycle_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'Lifecycle social status smoke',
      'SocialStatusReporter@Example.com'
    ),
    (
      reopen_ticket_id,
      'completed',
      technician_id,
      category_id,
      space_id,
      'Reopen social status smoke',
      'SocialStatusReporter@Example.com'
    ),
    (
      actor_excluded_ticket_id,
      'pending',
      actor_id,
      category_id,
      space_id,
      'Actor excluded social status smoke',
      'SocialStatusReporter@Example.com'
    ),
    (
      anonymous_reporter_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'Anonymous reporter social status smoke',
      'anonymous-social-status@example.com'
    ),
    (
      shared_target_ticket_id,
      'pending',
      shared_technician_id,
      category_id,
      space_id,
      'Shared target social status smoke',
      'SocialStatusSharedReporter@Example.com'
    ),
    (
      preference_disabled_ticket_id,
      'pending',
      preference_disabled_id,
      category_id,
      space_id,
      'Preference disabled social status smoke',
      'SocialStatusReporter@Example.com'
    ),
    (
      switch_disabled_ticket_id,
      'pending',
      switch_disabled_id,
      category_id,
      space_id,
      'Switch disabled social status smoke',
      'SocialStatusReporter@Example.com'
    );

  PERFORM set_config('request.jwt.claims', NULL, true);

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = lifecycle_ticket_id;

  UPDATE public.tickets
  SET status = 'completed'
  WHERE id = lifecycle_ticket_id;

  UPDATE public.tickets
  SET status = 'closed'
  WHERE id = lifecycle_ticket_id;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = reopen_ticket_id;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_id::text)::text,
    true
  );

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = actor_excluded_ticket_id;

  PERFORM set_config('request.jwt.claims', NULL, true);

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = anonymous_reporter_ticket_id;

  UPDATE public.tickets
  SET status = 'cancelled'
  WHERE id = shared_target_ticket_id;

  UPDATE public.tickets
  SET status = 'cancelled'
  WHERE id = preference_disabled_ticket_id;

  UPDATE public.tickets
  SET status = 'cancelled'
  WHERE id = switch_disabled_ticket_id;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = lifecycle_ticket_id
    AND channel = 'social';

  IF delivery_count <> 6 THEN
    RAISE EXCEPTION 'Expected Technician and Reporter social rows for lifecycle and reopen, found %.', delivery_count;
  END IF;

  SELECT array_agg(event_key ORDER BY event_key) INTO event_keys
  FROM public.notification_log
  WHERE ticket_id = lifecycle_ticket_id
    AND channel = 'social'
    AND event_type = 'in_progress';

  IF array_length(event_keys, 1) <> 4 THEN
    RAISE EXCEPTION 'Expected in_progress and reopened in_progress social rows, found %.', coalesce(array_length(event_keys, 1), 0);
  END IF;

  IF (SELECT count(DISTINCT event_key) FROM unnest(event_keys) AS event_key(value)) <> 4 THEN
    RAISE EXCEPTION 'Expected repeated status events to keep distinct social event keys.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = actor_excluded_ticket_id
      AND channel = 'social'
      AND target_fingerprint = 'status-actor'
  ) THEN
    RAISE EXCEPTION 'Expected the acting Technician to be excluded.';
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = actor_excluded_ticket_id
    AND channel = 'social'
    AND target_fingerprint = 'status-reporter';

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected the Reporter despite the acting Technician, found %.', delivery_count;
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = anonymous_reporter_ticket_id
    AND channel = 'social';

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected only the Technician for an anonymous Reporter, found %.', delivery_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = anonymous_reporter_ticket_id
      AND channel = 'social'
      AND target_fingerprint = 'status-reporter'
  ) THEN
    RAISE EXCEPTION 'Expected an anonymous Reporter to be skipped.';
  END IF;

  SELECT count(*) INTO delivery_count
  FROM public.notification_log
  WHERE ticket_id = shared_target_ticket_id
    AND channel = 'social'
    AND event_type = 'cancelled';

  IF delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one row for a shared status target, found %.', delivery_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id IN (preference_disabled_ticket_id, switch_disabled_ticket_id)
      AND channel = 'social'
  ) THEN
    RAISE EXCEPTION 'Expected preference-disabled or switch-disabled targets to be skipped.';
  END IF;

  IF has_function_privilege('anon', 'public.enqueue_social_ticket_status_deliveries(UUID, TEXT, UUID)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.enqueue_social_ticket_status_deliveries(UUID, TEXT, UUID)', 'EXECUTE') THEN
    RAISE EXCEPTION 'social status helper must be internal.';
  END IF;
END
$notification_social_ticket_status_smoke$;

ROLLBACK;
