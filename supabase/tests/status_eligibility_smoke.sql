BEGIN;

DO $status_eligibility_smoke$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  actor_id UUID := gen_random_uuid();
  reporter_id UUID := gen_random_uuid();
  inactive_reporter_id UUID := gen_random_uuid();
  disabled_reporter_id UUID := gen_random_uuid();
  mismatched_reporter_id UUID := gen_random_uuid();
  technician_id UUID := gen_random_uuid();
  inactive_technician_id UUID := gen_random_uuid();
  disabled_technician_id UUID := gen_random_uuid();
  reporter_actor_id UUID := gen_random_uuid();
  all_channel_ticket_id UUID := gen_random_uuid();
  anonymous_ticket_id UUID := gen_random_uuid();
  actor_ticket_id UUID := gen_random_uuid();
  reporter_actor_ticket_id UUID := gen_random_uuid();
  inactive_ticket_id UUID := gen_random_uuid();
  disabled_ticket_id UUID := gen_random_uuid();
  mismatched_ticket_id UUID := gen_random_uuid();
  reopen_suppression_ticket_id UUID := gen_random_uuid();
  combined_ticket_id UUID := gen_random_uuid();
  repeated_ticket_id UUID := gen_random_uuid();
  eligibility_count INTEGER;
  row_count INTEGER;
  event_keys TEXT[];
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Status Eligibility Building', 'SEB-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Status Eligibility Category', 9995);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Status Eligibility Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (actor_id, 'Status.Actor@Example.com'),
    (reporter_id, 'Reporter.Status@Example.com'),
    (inactive_reporter_id, 'Inactive.Reporter@Example.com'),
    (disabled_reporter_id, 'Disabled.Reporter@Example.com'),
    (mismatched_reporter_id, 'Other.Reporter@Example.com'),
    (technician_id, 'Technician.Status@Example.com'),
    (inactive_technician_id, 'Inactive.Technician@Example.com'),
    (disabled_technician_id, 'Disabled.Technician@Example.com'),
    (reporter_actor_id, 'Reporter.Actor@Example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (
    technician_id,
    inactive_technician_id,
    disabled_technician_id,
    reporter_actor_id
  );

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('ticket_status', false)
  WHERE id IN (disabled_reporter_id, disabled_technician_id);

  UPDATE public.profiles
  SET is_active = false
  WHERE id IN (inactive_reporter_id, inactive_technician_id);

  INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint, enabled)
  VALUES
    (actor_id, 'https://discord.com/api/webhooks/1/status-actor', 'status-actor-target', true),
    (reporter_id, 'https://discord.com/api/webhooks/2/status-reporter', 'status-reporter-target', true),
    (
      inactive_reporter_id,
      'https://discord.com/api/webhooks/3/status-inactive-reporter',
      'status-inactive-reporter-target',
      true
    ),
    (
      disabled_reporter_id,
      'https://discord.com/api/webhooks/4/status-disabled-reporter',
      'status-disabled-reporter-target',
      true
    ),
    (technician_id, 'https://discord.com/api/webhooks/5/status-technician', 'status-technician-target', true),
    (
      disabled_technician_id,
      'https://discord.com/api/webhooks/6/status-disabled-technician',
      'status-disabled-technician-target',
      true
    ),
    (
      reporter_actor_id,
      'https://discord.com/api/webhooks/7/status-reporter-actor',
      'status-reporter-actor-target',
      true
    );

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
      all_channel_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'All-channel status eligibility fixture',
      'REPORTER.STATUS@example.com'
    ),
    (
      anonymous_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'Anonymous Reporter status fixture',
      'anonymous-status@example.com'
    ),
    (
      actor_ticket_id,
      'pending',
      actor_id,
      category_id,
      space_id,
      'Staff actor exclusion fixture',
      'REPORTER.STATUS@example.com'
    ),
    (
      reporter_actor_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'Reporter actor exclusion fixture',
      'Reporter.Actor@Example.com'
    ),
    (
      inactive_ticket_id,
      'pending',
      inactive_technician_id,
      category_id,
      space_id,
      'Inactive account fixture',
      'Inactive.Reporter@Example.com'
    ),
    (
      disabled_ticket_id,
      'pending',
      disabled_technician_id,
      category_id,
      space_id,
      'Disabled preference fixture',
      'Disabled.Reporter@Example.com'
    ),
    (
      mismatched_ticket_id,
      'pending',
      technician_id,
      category_id,
      space_id,
      'Mismatched Reporter Email fixture',
      'different.reporter@example.com'
    ),
    (
      reopen_suppression_ticket_id,
      'completed',
      technician_id,
      category_id,
      space_id,
      'Reopen email suppression fixture',
      'REPORTER.STATUS@example.com'
    ),
    (
      combined_ticket_id,
      'pending',
      NULL,
      category_id,
      space_id,
      'Combined assignment and status fixture',
      'REPORTER.STATUS@example.com'
    ),
    (
      repeated_ticket_id,
      'completed',
      technician_id,
      category_id,
      space_id,
      'Repeated In Progress fixture',
      'REPORTER.STATUS@example.com'
    );

  SELECT count(*) INTO row_count
  FROM public.resolve_ticket_status_eligibility(all_channel_ticket_id, actor_id);

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected Reporter and assigned Technician eligibility rows, found %.', row_count;
  END IF;

  SELECT count(*) INTO eligibility_count
  FROM public.resolve_ticket_status_eligibility(anonymous_ticket_id, actor_id);

  IF eligibility_count <> 2 THEN
    RAISE EXCEPTION 'Expected an anonymous Reporter row and Technician row, found %.', eligibility_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resolve_ticket_status_eligibility(anonymous_ticket_id, actor_id)
    WHERE recipient_id IS NULL
      AND recipient_kind = 'reporter'
      AND account_email IS NULL
      AND recipient_email = 'anonymous-status@example.com'
      AND NOT eligible_for_in_app
      AND eligible_for_email
      AND NOT eligible_for_social
      AND target_fingerprint IS NULL
  ) THEN
    RAISE EXCEPTION 'Expected an anonymous Reporter status email row with NULL account fields.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resolve_ticket_status_eligibility(all_channel_ticket_id, actor_id)
    WHERE recipient_id = reporter_id
      AND account_email = 'Reporter.Status@Example.com'
      AND recipient_email = 'REPORTER.STATUS@example.com'
      AND eligible_for_in_app
      AND eligible_for_email
      AND eligible_for_social
      AND target_fingerprint = 'status-reporter-target'
  ) THEN
    RAISE EXCEPTION 'Expected an active mixed-case Reporter to resolve all three channels.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resolve_ticket_status_eligibility(all_channel_ticket_id, actor_id)
    WHERE recipient_id = technician_id
      AND NOT eligible_for_email
      AND eligible_for_in_app
      AND eligible_for_social
      AND target_fingerprint = 'status-technician-target'
  ) THEN
    RAISE EXCEPTION 'Expected an active assigned Technician to resolve In-app and Social eligibility.';
  END IF;

  CREATE OR REPLACE FUNCTION public.invoke_notification_delivery(p_delivery_id UUID)
  RETURNS BIGINT
  LANGUAGE plpgsql
  AS $smoke$
  BEGIN
    RAISE EXCEPTION 'simulated notification dispatch failure';
  END;
  $smoke$;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_id::text, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = all_channel_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = all_channel_ticket_id
    AND recipient_id IN (reporter_id, technician_id)
    AND event_type = 'in_progress';

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected Reporter and Technician In-app status rows, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = all_channel_ticket_id
    AND channel = 'email'
    AND event_type = 'in_progress';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected only the Reporter Email status row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = all_channel_ticket_id
    AND channel = 'social'
    AND event_type = 'in_progress'
    AND target_fingerprint IN ('status-reporter-target', 'status-technician-target');

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected Reporter and Technician Social status rows, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = actor_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = actor_ticket_id
      AND recipient_id = actor_id
  ) THEN
    RAISE EXCEPTION 'Expected the staff actor to be excluded from In-app status eligibility.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = actor_ticket_id
      AND channel = 'social'
      AND target_fingerprint = 'status-actor-target'
  ) THEN
    RAISE EXCEPTION 'Expected the staff actor Social target to be excluded.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = actor_ticket_id
    AND channel = 'email'
    AND recipient_email = 'reporter.status@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the Reporter Email despite the staff actor, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = reporter_actor_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = reporter_actor_ticket_id
      AND recipient_id = reporter_actor_id
  ) THEN
    RAISE EXCEPTION 'Expected the Reporter actor to be excluded from In-app status eligibility.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = reporter_actor_ticket_id
      AND channel = 'social'
      AND target_fingerprint = 'status-reporter-actor-target'
  ) THEN
    RAISE EXCEPTION 'Expected the Reporter actor Social target to be excluded.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = reporter_actor_ticket_id
    AND channel = 'email'
    AND recipient_email = 'reporter.actor@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the Reporter Email despite being the actor, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = inactive_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = inactive_ticket_id
    AND recipient_email = 'inactive.reporter@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the inactive Reporter Email to remain eligible, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = inactive_ticket_id
    AND recipient_id = inactive_reporter_id
    AND event_type = 'in_progress';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the inactive Reporter In-app status row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = inactive_ticket_id
    AND recipient_id = inactive_technician_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected no In-app row for the inactive Technician, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = inactive_ticket_id
      AND channel = 'social'
  ) THEN
    RAISE EXCEPTION 'Expected no Social rows for inactive accounts.';
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = anonymous_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = anonymous_ticket_id
    AND channel = 'email'
    AND recipient_email = 'anonymous-status@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the anonymous Reporter status email, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = anonymous_ticket_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected no In-app rows for an anonymous Reporter, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = anonymous_ticket_id
      AND channel = 'social'
  ) THEN
    RAISE EXCEPTION 'Expected no Social rows for an anonymous Reporter.';
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = reopen_suppression_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = reopen_suppression_ticket_id
    AND channel = 'email'
    AND event_type = 'in_progress';

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected completed-to-in_progress to suppress Reporter email, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = reopen_suppression_ticket_id
    AND recipient_id = technician_id
    AND event_type = 'in_progress';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected completed-to-in_progress Technician In-app row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = reopen_suppression_ticket_id
    AND channel = 'social'
    AND event_type = 'in_progress'
    AND target_fingerprint IN ('status-reporter-target', 'status-technician-target');

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected completed-to-in_progress Social rows, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress', assigned_to = technician_id
  WHERE id = combined_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = combined_ticket_id
    AND recipient_id = technician_id
    AND event_type = 'assigned';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected combined assignment to create the assigned In-app row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = combined_ticket_id
    AND recipient_id = reporter_id
    AND event_type = 'in_progress';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected combined status to keep the Reporter In-app row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = combined_ticket_id
    AND recipient_id = technician_id
    AND event_type = 'in_progress';

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected combined assignment to suppress the Technician status In-app row, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = combined_ticket_id
    AND channel = 'email'
    AND recipient_email = 'reporter.status@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected combined status to keep the Reporter email, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = combined_ticket_id
    AND channel = 'social'
    AND event_type = 'in_progress'
    AND target_fingerprint IN ('status-reporter-target', 'status-technician-target');

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected combined status to keep both Social rows, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = disabled_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = disabled_ticket_id
  ) THEN
    RAISE EXCEPTION 'Expected a disabled preference to suppress In-app status rows.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = disabled_ticket_id
  ) THEN
    RAISE EXCEPTION 'Expected a disabled preference to suppress status Deliveries.';
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress'
  WHERE id = mismatched_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = mismatched_ticket_id
    AND channel = 'email'
    AND recipient_email = 'different.reporter@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the mismatched Reporter Ticket Email Delivery, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = mismatched_ticket_id
      AND recipient_id = mismatched_reporter_id
  ) THEN
    RAISE EXCEPTION 'Expected a mismatched Reporter account not to receive In-app status.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = mismatched_ticket_id
      AND channel = 'social'
  ) THEN
    RAISE EXCEPTION 'Expected a mismatched Reporter account not to receive Social status.';
  END IF;

  UPDATE public.tickets
  SET status = 'in_progress', updated_at = clock_timestamp()
  WHERE id = repeated_ticket_id;

  UPDATE public.tickets
  SET status = 'completed', updated_at = clock_timestamp()
  WHERE id = repeated_ticket_id;

  UPDATE public.tickets
  SET status = 'in_progress', updated_at = clock_timestamp()
  WHERE id = repeated_ticket_id;

  SELECT array_agg(delivery.event_key ORDER BY delivery.event_key) INTO event_keys
  FROM public.notification_log AS delivery
  WHERE delivery.ticket_id = repeated_ticket_id
    AND delivery.channel = 'email'
    AND delivery.event_type = 'in_progress';

  IF array_length(event_keys, 1) <> 2
    OR (SELECT count(DISTINCT value) FROM unnest(event_keys) AS event_key(value)) <> 2 THEN
    RAISE EXCEPTION 'Expected repeated In Progress Deliveries to keep distinct event keys.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = repeated_ticket_id
    AND recipient_id = technician_id
    AND event_type = 'in_progress';

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected repeated In Progress In-app notifications, found %.', row_count;
  END IF;

  IF has_function_privilege('anon', 'public.resolve_ticket_status_eligibility(UUID, UUID)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.resolve_ticket_status_eligibility(UUID, UUID)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Ticket status eligibility must not be public.';
  END IF;
END
$status_eligibility_smoke$;

ROLLBACK;
