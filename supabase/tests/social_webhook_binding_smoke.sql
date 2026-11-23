BEGIN;

DO $$
DECLARE
  smoke_account_id UUID := gen_random_uuid();
  attempt_number INTEGER;
  binding_count INTEGER;
  attempt_count INTEGER;
BEGIN
  INSERT INTO auth.users (id, email)
  VALUES (smoke_account_id, 'social-webhook-smoke@example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id = smoke_account_id;

  IF has_table_privilege('anon', 'public.social_webhooks', 'SELECT')
    OR has_table_privilege('authenticated', 'public.social_webhooks', 'SELECT')
    OR has_table_privilege('anon', 'public.social_webhook_attempts', 'SELECT')
    OR has_table_privilege('authenticated', 'public.social_webhook_attempts', 'SELECT') THEN
    RAISE EXCEPTION 'Social webhook data must not be readable by anon or authenticated.';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.social_webhooks', 'INSERT')
    OR NOT has_table_privilege('service_role', 'public.social_webhook_attempts', 'INSERT') THEN
    RAISE EXCEPTION 'service_role must manage social webhook data.';
  END IF;

  INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint)
  VALUES (
    smoke_account_id,
    'https://discord.com/api/webhooks/123/fake-token',
    'a7d0e51dde9176ce4853b120c6711ccc99218932a4e0b42066ae715978daaaf9'
  );

  BEGIN
    INSERT INTO public.social_webhooks (account_id, webhook_url, target_fingerprint)
    VALUES (
      smoke_account_id,
      'https://discord.com/api/webhooks/456/fake-token',
      '0c94aa8cf3019c27a1576ff0fa6df40b51510a5cf9b4868544b90eaad4d5abdf'
    );

    RAISE EXCEPTION 'Expected one binding per account.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  SELECT count(*) INTO binding_count
  FROM public.social_webhooks
  WHERE account_id = smoke_account_id;

  IF binding_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one binding, found %.', binding_count;
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', smoke_account_id::text)::text, true);

  FOR attempt_number IN 1..5 LOOP
    IF NOT public.reserve_social_webhook_attempt() THEN
      RAISE EXCEPTION 'Expected binding attempt % to be allowed.', attempt_number;
    END IF;
  END LOOP;

  IF public.reserve_social_webhook_attempt() THEN
    RAISE EXCEPTION 'Expected the sixth binding attempt to be rate limited.';
  END IF;

  RESET ROLE;

  SELECT count(*) INTO attempt_count
  FROM public.social_webhook_attempts
  WHERE account_id = smoke_account_id;

  IF attempt_count <> 5 THEN
    RAISE EXCEPTION 'Expected exactly five recorded attempts, found %.', attempt_count;
  END IF;

  DELETE FROM auth.users
  WHERE id = smoke_account_id;

  SELECT count(*) INTO binding_count
  FROM public.social_webhooks
  WHERE account_id = smoke_account_id;

  SELECT count(*) INTO attempt_count
  FROM public.social_webhook_attempts
  WHERE account_id = smoke_account_id;

  IF binding_count <> 0 OR attempt_count <> 0 THEN
    RAISE EXCEPTION 'Expected account deletion to cascade, found % bindings and % attempts.', binding_count, attempt_count;
  END IF;
END
$$;

ROLLBACK;
