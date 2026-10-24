-- Add persistent delivery reclamation through transaction-safe claims and pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.invoke_notification_delivery(p_delivery_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_record RECORD;
  project_url TEXT;
  edge_function_secret TEXT;
  request_id BIGINT;
BEGIN
  SELECT
    id,
    ticket_id,
    event_type,
    status,
    attempt_count,
    next_attempt_at,
    updated_at,
    created_at
  INTO delivery_record
  FROM public.notification_log
  WHERE id = p_delivery_id;

  IF NOT FOUND OR delivery_record.attempt_count >= 5 OR NOT (
    delivery_record.status = 'pending'
    OR (
      delivery_record.status = 'failed'
      AND delivery_record.next_attempt_at <= pg_catalog.now()
    )
    OR (
      delivery_record.status = 'sending'
      AND delivery_record.updated_at < pg_catalog.now() - interval '5 minutes'
    )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret
  INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'repairhub_project_url'
  LIMIT 1;

  SELECT decrypted_secret
  INTO edge_function_secret
  FROM vault.decrypted_secrets
  WHERE name = 'repairhub_edge_function_secret'
  LIMIT 1;

  IF project_url IS NULL OR btrim(project_url) = '' OR edge_function_secret IS NULL OR btrim(edge_function_secret) = '' THEN
    RAISE WARNING 'Notification delivery % was queued but Vault secrets are not configured.', p_delivery_id;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/send-ticket-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-repairhub-service-secret', edge_function_secret
    ),
    body := jsonb_build_object(
      'delivery_id', delivery_record.id,
      'ticket_id', delivery_record.ticket_id,
      'event_type', delivery_record.event_type,
      'event_at', delivery_record.created_at
    ),
    timeout_milliseconds := 30000
  )
  INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_notification_delivery(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_notification_delivery(UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_notification_delivery(p_delivery_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  event_type TEXT,
  event_key TEXT,
  recipient_email TEXT,
  status TEXT,
  attempt_count INTEGER,
  event_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- attempt_count counts Edge Function claims; each claim may retry Resend in-process.
BEGIN
  RETURN QUERY
  UPDATE public.notification_log AS notification
  SET
    status = 'sending',
    attempt_count = notification.attempt_count + 1,
    next_attempt_at = NULL,
    last_error = NULL
  WHERE notification.id = (
    SELECT candidate.id
    FROM public.notification_log AS candidate
    WHERE candidate.id = p_delivery_id
      AND candidate.attempt_count < 5
      AND (
        candidate.status = 'pending'
        OR (
          candidate.status = 'failed'
          AND candidate.next_attempt_at <= pg_catalog.now()
        )
        OR (
          candidate.status = 'sending'
          AND candidate.updated_at < pg_catalog.now() - interval '5 minutes'
        )
      )
    ORDER BY candidate.id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    notification.id,
    notification.ticket_id,
    notification.event_type,
    notification.event_key,
    notification.recipient_email,
    notification.status,
    notification.attempt_count,
    notification.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_notification_delivery(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_notification_delivery(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_delivery(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.process_due_notification_deliveries()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  delivery_id UUID;
BEGIN
  UPDATE public.notification_log
  SET
    status = 'failed',
    next_attempt_at = NULL,
    last_error = coalesce(
      nullif(last_error, ''),
      'Delivery worker timed out after the maximum attempts.'
    )
  WHERE status = 'sending'
    AND attempt_count >= 5
    AND updated_at < pg_catalog.now() - interval '5 minutes';

  FOR delivery_id IN
    SELECT id
    FROM public.notification_log
    WHERE attempt_count < 5
      AND (
        status = 'pending'
        OR (status = 'failed' AND next_attempt_at <= pg_catalog.now())
        OR (status = 'sending' AND updated_at < pg_catalog.now() - interval '5 minutes')
      )
    ORDER BY coalesce(next_attempt_at, updated_at), id
    LIMIT 20
  LOOP
    PERFORM public.invoke_notification_delivery(delivery_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_due_notification_deliveries() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_due_notification_deliveries() FROM anon, authenticated;

SELECT cron.unschedule('repairhub-notification-delivery-retry');
SELECT cron.schedule(
  'repairhub-notification-delivery-retry',
  '*/5 * * * *',
  $$SELECT public.process_due_notification_deliveries()$$
);
