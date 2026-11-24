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
  admin_account_id UUID := gen_random_uuid();
  admin_duplicate_account_id UUID := gen_random_uuid();
  subscribed_technician_account_id UUID := gen_random_uuid();
  unsubscribed_technician_account_id UUID := gen_random_uuid();
  actor_account_id UUID := gen_random_uuid();
  new_ticket_preference_disabled_account_id UUID := gen_random_uuid();
  new_ticket_switch_disabled_account_id UUID := gen_random_uuid();
  eligible_ticket_id UUID := gen_random_uuid();
  inactive_ticket_id UUID := gen_random_uuid();
  preference_disabled_ticket_id UUID := gen_random_uuid();
  switch_disabled_ticket_id UUID := gen_random_uuid();
  unbound_ticket_id UUID := gen_random_uuid();
  new_ticket_ticket_id UUID := gen_random_uuid();
  actor_email_ticket_id UUID := gen_random_uuid();
  eligible_delivery_id UUID;
  claimed_delivery_id UUID;
  social_delivery_count INTEGER;
  row_status TEXT;
  resolved_webhook_url TEXT;
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
    (switch_disabled_account_id, 'SwitchDisabled@Example.com'),
    (admin_account_id, 'Admin@Example.com'),
    (admin_duplicate_account_id, 'AdminDuplicate@Example.com'),
    (subscribed_technician_account_id, 'SubscribedTechnician@Example.com'),
    (unsubscribed_technician_account_id, 'UnsubscribedTechnician@Example.com'),
    (actor_account_id, 'Actor@Example.com'),
    (new_ticket_preference_disabled_account_id, 'NewTicketPreferenceDisabled@Example.com'),
    (new_ticket_switch_disabled_account_id, 'NewTicketSwitchDisabled@Example.com');

  UPDATE public.profiles
  SET user_role = 'admin'::public.user_role
  WHERE id IN (admin_account_id, admin_duplicate_account_id, actor_account_id);

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (
    subscribed_technician_account_id,
    unsubscribed_technician_account_id
  );

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES (subscribed_technician_account_id, category_id);

  UPDATE public.profiles
  SET notification_preferences = jsonb_build_object('new_ticket', false)
  WHERE id IN (new_ticket_preference_disabled_account_id, admin_duplicate_account_id);

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
    ),
    (
      admin_account_id,
      'https://discord.com/api/webhooks/5/fake-admin',
      'fingerprint-new-ticket-shared',
      true
    ),
    (
      admin_duplicate_account_id,
      'https://discord.com/api/webhooks/6/fake-admin-duplicate',
      'fingerprint-new-ticket-shared',
      true
    ),
    (
      subscribed_technician_account_id,
      'https://discord.com/api/webhooks/7/fake-technician',
      'fingerprint-new-ticket-technician',
      true
    ),
    (
      unsubscribed_technician_account_id,
      'https://discord.com/api/webhooks/8/fake-unsubscribed',
      'fingerprint-new-ticket-unsubscribed',
      true
    ),
    (
      actor_account_id,
      'https://discord.com/api/webhooks/9/fake-actor',
      'fingerprint-new-ticket-actor',
      true
    ),
    (
      new_ticket_preference_disabled_account_id,
      'https://discord.com/api/webhooks/10/fake-preference',
      'fingerprint-new-ticket-preference-disabled',
      true
    ),
    (
      new_ticket_switch_disabled_account_id,
      'https://discord.com/api/webhooks/11/fake-switch',
      'fingerprint-new-ticket-switch-disabled',
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

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email
  )
  VALUES (
    new_ticket_ticket_id,
    'pending',
    category_id,
    space_id,
    'New ticket social smoke',
    'new-ticket-social-reporter@example.com'
  ),
  (
    actor_email_ticket_id,
    'pending',
    category_id,
    space_id,
    'Actor email fallback social smoke',
    'Actor@Example.com'
  );

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_account_id::text)::text,
    true
  );

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id IN (
    eligible_ticket_id,
    inactive_ticket_id,
    preference_disabled_ticket_id,
    switch_disabled_ticket_id,
    unbound_ticket_id
    ,new_ticket_ticket_id
  );

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id = new_ticket_ticket_id
    AND channel = 'social'
    AND event_type = 'new_ticket';

  IF social_delivery_count <> 2 THEN
    RAISE EXCEPTION 'Expected Admin and subscribed Technician new-ticket social Deliveries, found %.', social_delivery_count;
  END IF;

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id = new_ticket_ticket_id
    AND channel = 'social'
    AND target_fingerprint = 'fingerprint-new-ticket-shared';

  IF social_delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected one shared social target, found %.', social_delivery_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = new_ticket_ticket_id
      AND channel = 'social'
      AND target_fingerprint IN (
        'fingerprint-new-ticket-actor',
        'fingerprint-new-ticket-unsubscribed',
        'fingerprint-new-ticket-preference-disabled',
        'fingerprint-new-ticket-switch-disabled'
      )
  ) THEN
    RAISE EXCEPTION 'Expected actor, unsubscribed, preference-disabled, or switch-disabled targets to be skipped.';
  END IF;

  PERFORM public.enqueue_social_new_ticket_deliveries(
    new_ticket_ticket_id,
    actor_account_id
  );

  SELECT count(*) INTO social_delivery_count
  FROM public.notification_log
  WHERE ticket_id = new_ticket_ticket_id
    AND channel = 'social'
    AND event_type = 'new_ticket';

  IF social_delivery_count <> 2 THEN
    RAISE EXCEPTION 'Expected repeated new-ticket social intake to deduplicate, found % rows.', social_delivery_count;
  END IF;

  PERFORM set_config('request.jwt.claims', NULL, true);

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = actor_email_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notification_log
    WHERE ticket_id = actor_email_ticket_id
      AND channel = 'social'
      AND event_type = 'new_ticket'
      AND target_fingerprint = 'fingerprint-new-ticket-actor'
  ) THEN
    RAISE EXCEPTION 'Expected reporter email fallback to exclude the actor without a JWT claim.';
  END IF;

  SELECT public.resolve_social_notification_target('fingerprint-new-ticket-shared', 'new_ticket')
  INTO resolved_webhook_url;

  IF resolved_webhook_url IS DISTINCT FROM 'https://discord.com/api/webhooks/5/fake-admin' THEN
    RAISE EXCEPTION 'Expected the enabled Admin preference to resolve a shared target, found %.', resolved_webhook_url;
  END IF;

  IF public.resolve_social_notification_target('fingerprint-new-ticket-preference-disabled', 'new_ticket') IS NOT NULL
    OR public.resolve_social_notification_target('fingerprint-new-ticket-switch-disabled', 'new_ticket') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected send-time preference and switch checks to reject a target.';
  END IF;

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

  SELECT claim.id INTO claimed_delivery_id
  FROM public.claim_social_notification_delivery(eligible_delivery_id) AS claim;

  IF claimed_delivery_id IS DISTINCT FROM eligible_delivery_id THEN
    RAISE EXCEPTION 'Expected the social claim RPC to claim the requested Delivery.';
  END IF;

  DELETE FROM public.social_webhooks WHERE account_id = eligible_account_id;

  IF public.resolve_social_notification_target('fingerprint-eligible', 'report_submitted') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected a removed target not to resolve at send time.';
  END IF;

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

  IF has_function_privilege('anon', 'public.enqueue_social_new_ticket_deliveries(UUID, UUID)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.enqueue_social_new_ticket_deliveries(UUID, UUID)', 'EXECUTE') THEN
    RAISE EXCEPTION 'social new-ticket helper must be internal.';
  END IF;

  IF has_function_privilege('anon', 'public.resolve_social_notification_target(TEXT, TEXT)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.resolve_social_notification_target(TEXT, TEXT)', 'EXECUTE') THEN
    RAISE EXCEPTION 'social target resolver must be service-only.';
  END IF;
END
$notification_social_queue_smoke$;

ROLLBACK;
