BEGIN;

CREATE OR REPLACE FUNCTION public.invoke_notification_delivery(p_delivery_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'simulated social dispatch failure';
END;
$$;

DO $notification_social_queue_smoke$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  eligible_account_id UUID := gen_random_uuid();
  inactive_account_id UUID := gen_random_uuid();
  preference_disabled_account_id UUID := gen_random_uuid();
  switch_disabled_account_id UUID := gen_random_uuid();
  eligible_ticket_id UUID := gen_random_uuid();
  inactive_ticket_id UUID := gen_random_uuid();
  preference_disabled_ticket_id UUID := gen_random_uuid();
  switch_disabled_ticket_id UUID := gen_random_uuid();
  unbound_ticket_id UUID := gen_random_uuid();
  eligible_delivery_id UUID;
  social_delivery_count INTEGER;
  row_status TEXT;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Social Queue Smoke Building', 'SQS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Social Queue Smoke Category', 9994);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Social Queue Smoke Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (eligible_account_id, 'Eligible@Example.com'),
    (inactive_account_id, 'Inactive@Example.com'),
    (preference_disabled_account_id, 'PreferenceDisabled@Example.com'),
    (switch_disabled_account_id, 'SwitchDisabled@Example.com');

  UPDATE public.profiles
  SET is_active = false
  WHERE id = inactive_account_id;

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('ticket_status', false)
  WHERE id = preference_disabled_account_id;

  INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint, enabled)
  VALUES
    (eligible_account_id, 'https://discord.com/api/webhooks/1/fake-eligible', 'fingerprint-eligible', true),
    (inactive_account_id, 'https://discord.com/api/webhooks/2/fake-inactive', 'fingerprint-inactive', true),
    (
      preference_disabled_account_id,
      'https://discord.com/api/webhooks/3/fake-preference',
      'fingerprint-preference',
      true
    ),
    (
      switch_disabled_account_id,
      'https://discord.com/api/webhooks/4/fake-switch',
      'fingerprint-switch',
      false
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
    (eligible_ticket_id, 'pending', category_id, space_id, 'Eligible social smoke', 'eligible@example.com'),
    (inactive_ticket_id, 'pending', category_id, space_id, 'Inactive social smoke', 'inactive@example.com'),
    (
      preference_disabled_ticket_id,
      'pending',
      category_id,
      space_id,
      'Preference-disabled social smoke',
      'preferencedisabled@example.com'
    ),
    (
      switch_disabled_ticket_id,
      'pending',
      category_id,
      space_id,
      'Switch-disabled social smoke',
      'switchdisabled@example.com'
    ),
    (unbound_ticket_id, 'pending', category_id, space_id, 'Unbound social smoke', 'unbound@example.com');

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id IN (
    eligible_ticket_id,
    inactive_ticket_id,
    preference_disabled_ticket_id,
    switch_disabled_ticket_id,
    unbound_ticket_id
  );

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id = eligible_ticket_id
    AND channel = 'social'
    AND event_type = 'report_submitted'
    AND target_fingerprint = 'fingerprint-eligible';

  IF social_delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one eligible social Delivery, found %.', social_delivery_count;
  END IF;

  SELECT id INTO eligible_delivery_id
  FROM public.notification_log
  WHERE ticket_id = eligible_ticket_id
    AND channel = 'social';

  PERFORM public.enqueue_social_report_submitted_delivery(
    eligible_ticket_id,
    'Eligible@Example.com'
  );

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id = eligible_ticket_id
    AND channel = 'social';

  IF social_delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected social target deduplication, found % social rows.', social_delivery_count;
  END IF;

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id IN (
    inactive_ticket_id,
    preference_disabled_ticket_id,
    switch_disabled_ticket_id,
    unbound_ticket_id
  )
    AND channel = 'social';

  IF social_delivery_count <> 0 THEN
    RAISE EXCEPTION 'Expected inactive, preference-disabled, switch-disabled, or unbound targets to be skipped.', social_delivery_count;
  END IF;

  BEGIN
    INSERT INTO public.notification_log (
      ticket_id,
      event_type,
      event_key,
      channel,
      target_fingerprint
    )
    VALUES (
      eligible_ticket_id,
      'report_submitted',
      format('ticket:%s:report_submitted', eligible_ticket_id),
      'social',
      'fingerprint-eligible'
    );

    RAISE EXCEPTION 'Expected duplicate social event/target to be rejected.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  UPDATE public.notification_log
  SET status = 'sending', attempt_count = 1
  WHERE id = eligible_delivery_id;

  DELETE FROM public.social_webhooks WHERE account_id = eligible_account_id;

  UPDATE public.notification_log
  SET status = 'failed', next_attempt_at = NULL, last_error = 'No active social target'
  WHERE id = eligible_delivery_id
    AND channel = 'social'
    AND NOT EXISTS (
      SELECT 1
      FROM public.social_webhooks AS webhook
      JOIN public.profiles AS profile ON profile.id = webhook.account_id
      WHERE webhook.target_fingerprint = 'fingerprint-eligible'
        AND webhook.enabled IS TRUE
        AND profile.is_active IS TRUE
    )
  RETURNING status INTO row_status;

  IF row_status <> 'failed' THEN
    RAISE EXCEPTION 'Expected removed social target to become failed, found %.', row_status;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE id = eligible_delivery_id
      AND status <> 'failed'
  ) THEN
    RAISE EXCEPTION 'Expected no cancelled replacement for a removed social target.';
  END IF;

  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notification_log'::regclass) IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected RLS on notification_log.';
  END IF;

  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.social_webhooks'::regclass) IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected RLS on social_webhooks.';
  END IF;

  IF has_table_privilege('anon', 'public.notification_log', 'INSERT')
    OR has_table_privilege('authenticated', 'public.notification_log', 'INSERT') THEN
    RAISE EXCEPTION 'notification_log must be service-only.';
  END IF;

  IF has_table_privilege('anon', 'public.social_webhooks', 'SELECT')
    OR has_table_privilege('authenticated', 'public.social_webhooks', 'SELECT') THEN
    RAISE EXCEPTION 'social_webhooks must be service-only.';
  END IF;

  IF has_function_privilege('anon', 'public.enqueue_social_report_submitted_delivery(UUID, TEXT)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.enqueue_social_report_submitted_delivery(UUID, TEXT)', 'EXECUTE') THEN
    RAISE EXCEPTION 'social enqueue helper must be internal.';
  END IF;
END
$notification_social_queue_smoke$;

ROLLBACK;
