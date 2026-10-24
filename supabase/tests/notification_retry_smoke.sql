BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  ticket_id UUID := gen_random_uuid();
  pending_id UUID;
  due_failed_id UUID;
  future_failed_id UUID;
  permanent_failed_id UUID;
  stuck_sending_id UUID;
  max_sending_id UUID;
  claimed_id UUID;
  next_attempt TIMESTAMPTZ;
  delivery_status TEXT;
  delivery_attempts INTEGER;
  cron_job_count INTEGER;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'Notification Retry Smoke Building', 'NRS-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'Notification Retry Smoke Category', 9999);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'Notification Retry Smoke Space', 1, building_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email
  )
  VALUES (
    ticket_id,
    'pending',
    category_id,
    space_id,
    'Notification retry smoke fixture',
    'retry-smoke@example.com'
  );

  INSERT INTO public.notification_log (
    id,
    ticket_id,
    event_type,
    event_key,
    recipient_email,
    status,
    attempt_count,
    next_attempt_at
  )
  VALUES (gen_random_uuid(), ticket_id, 'in_progress', 'retry-smoke:pending', 'retry-smoke@example.com', 'pending', 0, NULL)
  RETURNING id INTO pending_id;

  INSERT INTO public.notification_log (
    ticket_id,
    event_type,
    event_key,
    recipient_email,
    status,
    attempt_count,
    next_attempt_at
  )
  VALUES
    (ticket_id, 'in_progress', 'retry-smoke:due-failed', 'retry-smoke@example.com', 'failed', 1, now() - interval '5 minutes'),
    (ticket_id, 'in_progress', 'retry-smoke:future-failed', 'retry-smoke@example.com', 'failed', 1, now() + interval '1 hour'),
    (ticket_id, 'in_progress', 'retry-smoke:permanent-failed', 'retry-smoke@example.com', 'failed', 1, NULL),
    (ticket_id, 'in_progress', 'retry-smoke:stuck-sending', 'retry-smoke@example.com', 'sending', 3, NULL),
    (ticket_id, 'in_progress', 'retry-smoke:max-sending', 'retry-smoke@example.com', 'sending', 5, NULL);

  SELECT id INTO due_failed_id
  FROM public.notification_log WHERE event_key = 'retry-smoke:due-failed';
  SELECT id INTO future_failed_id
  FROM public.notification_log WHERE event_key = 'retry-smoke:future-failed';
  SELECT id INTO permanent_failed_id
  FROM public.notification_log WHERE event_key = 'retry-smoke:permanent-failed';
  SELECT id INTO stuck_sending_id
  FROM public.notification_log WHERE event_key = 'retry-smoke:stuck-sending';
  SELECT id INTO max_sending_id
  FROM public.notification_log WHERE event_key = 'retry-smoke:max-sending';

  UPDATE public.notification_log
  SET updated_at = now() - interval '6 minutes'
  WHERE event_key IN ('retry-smoke:stuck-sending', 'retry-smoke:max-sending');

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(pending_id) AS claim;

  IF claimed_id IS NULL OR claimed_id <> pending_id THEN
    RAISE EXCEPTION 'Pending delivery was not claimed.';
  END IF;

  SELECT status, attempt_count INTO delivery_status, delivery_attempts
  FROM public.notification_log WHERE id = pending_id;

  IF delivery_status <> 'sending' OR delivery_attempts <> 1 THEN
    RAISE EXCEPTION 'Expected first claim to send with attempt 1, found %/%.', delivery_status, delivery_attempts;
  END IF;

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(pending_id) AS claim;

  IF claimed_id IS NOT NULL THEN
    RAISE EXCEPTION 'An active sending delivery was claimed twice.';
  END IF;

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(due_failed_id) AS claim;

  IF claimed_id IS NULL OR claimed_id <> due_failed_id THEN
    RAISE EXCEPTION 'Due failed delivery was not reclaimed.';
  END IF;

  SELECT attempt_count INTO delivery_attempts
  FROM public.notification_log WHERE id = due_failed_id;

  IF delivery_attempts <> 2 THEN
    RAISE EXCEPTION 'Expected failed reclamation to increment to attempt 2, found %.', delivery_attempts;
  END IF;

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(future_failed_id) AS claim;

  IF claimed_id IS NOT NULL THEN
    RAISE EXCEPTION 'Future failed delivery was reclaimed early.';
  END IF;

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(permanent_failed_id) AS claim;

  IF claimed_id IS NOT NULL THEN
    RAISE EXCEPTION 'Permanent failed delivery was reclaimed.';
  END IF;

  SELECT claim.id INTO claimed_id
  FROM public.claim_notification_delivery(stuck_sending_id) AS claim;

  IF claimed_id IS NULL OR claimed_id <> stuck_sending_id THEN
    RAISE EXCEPTION 'Timed-out sending delivery was not reclaimed.';
  END IF;

  SELECT attempt_count INTO delivery_attempts
  FROM public.notification_log WHERE id = stuck_sending_id;

  IF delivery_attempts <> 4 THEN
    RAISE EXCEPTION 'Expected timed-out sending reclamation to increment to attempt 4, found %.', delivery_attempts;
  END IF;

  PERFORM public.process_due_notification_deliveries();

  SELECT status, attempt_count, next_attempt_at INTO delivery_status, delivery_attempts, next_attempt
  FROM public.notification_log WHERE id = max_sending_id;

  IF delivery_status <> 'failed' OR delivery_attempts <> 5 OR next_attempt IS NOT NULL THEN
    RAISE EXCEPTION 'Expected maxed stuck delivery to remain failed with no next attempt.';
  END IF;

  SELECT count(*) INTO cron_job_count
  FROM cron.job
  WHERE jobname = 'repairhub-notification-delivery-retry'
    AND schedule = '*/5 * * * *';

  IF cron_job_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one five-minute notification retry cron job, found %.', cron_job_count;
  END IF;
END
$$;

ROLLBACK;
