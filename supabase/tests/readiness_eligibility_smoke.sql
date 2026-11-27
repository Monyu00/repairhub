BEGIN;

DO $readiness_eligibility_smoke$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  shared_admin_id UUID := gen_random_uuid();
  duplicate_shared_admin_id UUID := gen_random_uuid();
  inactive_admin_id UUID := gen_random_uuid();
  disabled_preference_admin_id UUID := gen_random_uuid();
  subscribed_technician_id UUID := gen_random_uuid();
  mixed_case_technician_id UUID := gen_random_uuid();
  disabled_preference_technician_id UUID := gen_random_uuid();
  actor_technician_id UUID := gen_random_uuid();
  reporter_id UUID := gen_random_uuid();
  disabled_reporter_id UUID := gen_random_uuid();
  staff_ticket_id UUID := gen_random_uuid();
  actor_ticket_id UUID := gen_random_uuid();
  reporter_ticket_id UUID := gen_random_uuid();
  disabled_reporter_ticket_id UUID := gen_random_uuid();
  failure_ticket_id UUID := gen_random_uuid();
  eligibility_count INTEGER;
  row_count INTEGER;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Readiness Eligibility Building', 'REB-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Readiness Eligibility Category', 9989);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Readiness Eligibility Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (shared_admin_id, 'Admin.Shared@Example.com'),
    (duplicate_shared_admin_id, 'Admin.Duplicate@Example.com'),
    (inactive_admin_id, 'Admin.Inactive@Example.com'),
    (disabled_preference_admin_id, 'Admin.Disabled@Example.com'),
    (subscribed_technician_id, 'Tech.Subscribed@Example.com'),
    (mixed_case_technician_id, 'Tech.Mixed@Example.com'),
    (disabled_preference_technician_id, 'Tech.Disabled@Example.com'),
    (actor_technician_id, 'Tech.Actor@Example.com'),
    (reporter_id, 'Reporter.Ready@Example.com'),
    (disabled_reporter_id, 'Reporter.Disabled@Example.com');

  UPDATE public.profiles
  SET user_role = 'admin'::public.user_role
  WHERE id IN (
    shared_admin_id,
    duplicate_shared_admin_id,
    inactive_admin_id,
    disabled_preference_admin_id
  );

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (
    subscribed_technician_id,
    mixed_case_technician_id,
    disabled_preference_technician_id,
    actor_technician_id
  );

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('new_ticket', false)
  WHERE id IN (disabled_preference_admin_id, disabled_preference_technician_id);

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('ticket_status', false)
  WHERE id = disabled_reporter_id;

  UPDATE public.profiles
  SET is_active = false
  WHERE id = inactive_admin_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES
    (subscribed_technician_id, category_id),
    (mixed_case_technician_id, category_id),
    (disabled_preference_technician_id, category_id),
    (actor_technician_id, category_id);

  INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint, enabled)
  VALUES
    (shared_admin_id, 'https://discord.com/api/webhooks/1/readiness-admin', 'readiness-shared-target', true),
    (duplicate_shared_admin_id, 'https://discord.com/api/webhooks/2/readiness-duplicate', 'readiness-shared-target', true),
    (inactive_admin_id, 'https://discord.com/api/webhooks/3/readiness-inactive', 'readiness-inactive-target', true),
    (
      disabled_preference_admin_id,
      'https://discord.com/api/webhooks/4/readiness-disabled',
      'readiness-disabled-target',
      true
    ),
    (
      subscribed_technician_id,
      'https://discord.com/api/webhooks/5/readiness-technician',
      'readiness-technician-target',
      true
    ),
    (
      mixed_case_technician_id,
      'https://discord.com/api/webhooks/6/readiness-mixed',
      'readiness-mixed-target',
      true
    ),
    (
      disabled_preference_technician_id,
      'https://discord.com/api/webhooks/7/readiness-disabled-tech',
      'readiness-disabled-tech-target',
      true
    ),
    (
      actor_technician_id,
      'https://discord.com/api/webhooks/8/readiness-actor',
      'readiness-actor-target',
      true
    ),
    (reporter_id, 'https://discord.com/api/webhooks/9/readiness-reporter', 'readiness-reporter-target', true),
    (
      disabled_reporter_id,
      'https://discord.com/api/webhooks/10/readiness-disabled-reporter',
      'readiness-disabled-reporter-target',
      true
    );

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
      staff_ticket_id,
      'pending',
      category_id,
      space_id,
      'All-channel readiness fixture',
      'anonymous-reporter@example.com'
    ),
    (
      actor_ticket_id,
      'pending',
      category_id,
      space_id,
      'Actor readiness fixture',
      'TECH.ACTOR@example.com'
    ),
    (
      reporter_ticket_id,
      'pending',
      category_id,
      space_id,
      'Submission confirmation fixture',
      'REPORTER.READY@example.com'
    ),
    (
      disabled_reporter_ticket_id,
      'pending',
      category_id,
      space_id,
      'Disabled reporter confirmation fixture',
      'REPORTER.DISABLED@example.com'
    ),
    (
      failure_ticket_id,
      'pending',
      category_id,
      space_id,
      'Notification failure fixture',
      'failure-reporter@example.com'
    );

  SELECT count(*), count(*) FILTER (WHERE eligible_for_in_app)
  INTO eligibility_count, row_count
  FROM public.resolve_ticket_new_ticket_eligibility(staff_ticket_id, NULL);

  IF eligibility_count <> 6 OR row_count <> 5 THEN
    RAISE EXCEPTION 'Expected five active eligible staff, found % in-app of %.', row_count, eligibility_count;
  END IF;

  SELECT count(*), count(*) FILTER (
    WHERE account_id IS NULL
      AND eligible_for_email
      AND NOT eligible_for_social
      AND target_fingerprint IS NULL
  )
  INTO eligibility_count, row_count
  FROM public.resolve_ticket_submission_confirmation_eligibility(
    staff_ticket_id,
    'anonymous-reporter@example.com'
  );

  IF eligibility_count <> 1 OR row_count <> 1 THEN
    RAISE EXCEPTION 'Expected one anonymous Reporter confirmation with no account eligibility, found % of %.', row_count, eligibility_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resolve_ticket_new_ticket_eligibility(staff_ticket_id, NULL)
    WHERE account_id = shared_admin_id
      AND eligible_for_in_app
      AND NOT eligible_for_email
      AND eligible_for_social
      AND target_fingerprint = 'readiness-shared-target'
  ) THEN
    RAISE EXCEPTION 'Expected an active Admin to resolve In-app and Social eligibility.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resolve_ticket_new_ticket_eligibility(staff_ticket_id, NULL)
    WHERE account_id = subscribed_technician_id
      AND eligible_for_in_app
      AND eligible_for_email
      AND eligible_for_social
      AND target_fingerprint = 'readiness-technician-target'
  ) THEN
    RAISE EXCEPTION 'Expected a subscribed Technician to resolve all three channels.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_technician_id::text, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = actor_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = actor_ticket_id
    AND event_type = 'new_ticket';

  IF row_count <> 4 THEN
    RAISE EXCEPTION 'Expected four in-app staff excluding the actor, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = actor_ticket_id
      AND recipient_id = actor_technician_id
  ) THEN
    RAISE EXCEPTION 'Expected the actor account to be excluded from In-app eligibility.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = actor_ticket_id
    AND channel = 'email'
    AND event_type = 'new_ticket';

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'Expected enabled subscribed Technicians including the actor by email, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = actor_ticket_id
    AND channel = 'social'
    AND event_type = 'new_ticket';

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'Expected three distinct social targets excluding the actor, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = actor_ticket_id
      AND channel = 'social'
      AND target_fingerprint = 'readiness-actor-target'
  ) THEN
    RAISE EXCEPTION 'Expected the actor social target to be excluded.';
  END IF;

  PERFORM set_config('request.jwt.claims', NULL, true);

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = staff_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.notifications
  WHERE ticket_id = staff_ticket_id
    AND event_type = 'new_ticket';

  IF row_count <> 4 THEN
    RAISE EXCEPTION 'Expected four active eligible staff in-app, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = staff_ticket_id
    AND channel = 'email'
    AND event_type = 'new_ticket';

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'Expected three enabled subscribed Technician emails, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = staff_ticket_id
    AND channel = 'social'
    AND event_type = 'new_ticket';

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'Expected three distinct social targets after shared-target deduplication, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = staff_ticket_id
    AND channel = 'social'
    AND target_fingerprint = 'readiness-shared-target';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected repeated same-target accounts to deduplicate, found %.', row_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = staff_ticket_id
    AND channel = 'email'
    AND event_type = 'report_submitted'
    AND recipient_email = 'anonymous-reporter@example.com';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected the anonymous Reporter Submission Confirmation email, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = reporter_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.resolve_ticket_submission_confirmation_eligibility(
    reporter_ticket_id,
    'REPORTER.READY@example.com'
  )
  WHERE account_id = reporter_id
    AND eligible_for_email
    AND eligible_for_social
    AND target_fingerprint = 'readiness-reporter-target';

  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected mixed-case Reporter Submission Confirmation eligibility.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = reporter_ticket_id
    AND event_type = 'report_submitted';

  IF row_count <> 2 THEN
    RAISE EXCEPTION 'Expected Reporter email and social confirmations, found %.', row_count;
  END IF;

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = disabled_reporter_ticket_id;

  SELECT count(*) INTO row_count
  FROM public.resolve_ticket_submission_confirmation_eligibility(
    disabled_reporter_ticket_id,
    'REPORTER.DISABLED@example.com'
  );

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = disabled_reporter_ticket_id
    AND event_type = 'report_submitted';

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected a disabled Reporter preference to suppress confirmation eligibility.';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.notification_log
  WHERE ticket_id = disabled_reporter_ticket_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'Expected no Deliveries for a disabled Reporter confirmation, found %.', row_count;
  END IF;

  CREATE FUNCTION public.block_readiness_notifications_smoke()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $smoke$
  BEGIN
    RAISE EXCEPTION 'Simulated notification failure.';
  END;
  $smoke$;

  CREATE TRIGGER block_readiness_notifications_smoke
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.block_readiness_notifications_smoke();

  CREATE TRIGGER block_readiness_deliveries_smoke
    BEFORE INSERT ON public.notification_log
    FOR EACH ROW
    EXECUTE FUNCTION public.block_readiness_notifications_smoke();

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = failure_ticket_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE id = failure_ticket_id
      AND notification_ready_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Notification failure must not block readiness.';
  END IF;

  IF has_function_privilege('anon', 'public.resolve_ticket_new_ticket_eligibility(UUID, UUID)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.resolve_ticket_new_ticket_eligibility(UUID, UUID)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Ticket Event Eligibility must not be public.';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.resolve_ticket_submission_confirmation_eligibility(UUID, TEXT)',
    'EXECUTE'
  )
    OR has_function_privilege(
      'authenticated',
      'public.resolve_ticket_submission_confirmation_eligibility(UUID, TEXT)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Submission Confirmation eligibility must not be public.';
  END IF;
END
$readiness_eligibility_smoke$;

ROLLBACK;
