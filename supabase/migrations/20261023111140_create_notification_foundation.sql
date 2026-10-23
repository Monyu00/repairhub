-- Create the notification delivery ledger and the pending -> in_progress tracer.
-- This migration intentionally converges the unversioned production objects
-- without creating a second notification pipeline.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_key TEXT,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  resend_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_key TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_message_id TEXT,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.notification_log
  ALTER COLUMN sent_at DROP DEFAULT,
  ALTER COLUMN sent_at DROP NOT NULL;

UPDATE public.notification_log
SET event_key = 'legacy:' || id::text
WHERE event_key IS NULL OR btrim(event_key) = '';

UPDATE public.notification_log
SET recipient_email = lower(btrim(recipient_email));

UPDATE public.notification_log
SET
  status = CASE
    WHEN status IN ('pending', 'sending', 'sent', 'failed') THEN status
    ELSE 'failed'
  END,
  attempt_count = CASE
    WHEN status = 'sent' THEN greatest(attempt_count, 1)
    ELSE greatest(attempt_count, 0)
  END;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY event_key, lower(btrim(recipient_email))
      ORDER BY sent_at NULLS LAST, id
    ) AS duplicate_number
  FROM public.notification_log
)
UPDATE public.notification_log AS notification
SET event_key = notification.event_key || ':legacy:' || notification.id::text
FROM ranked
WHERE notification.id = ranked.id
  AND ranked.duplicate_number > 1;

ALTER TABLE public.notification_log
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN attempt_count SET DEFAULT 0,
  ALTER COLUMN attempt_count SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN event_key SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notification_log'::regclass
      AND conname = 'notification_log_status_check'
  ) THEN
    ALTER TABLE public.notification_log
      DROP CONSTRAINT notification_log_status_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notification_log'::regclass
      AND conname = 'notification_log_attempt_count_check'
  ) THEN
    ALTER TABLE public.notification_log
      DROP CONSTRAINT notification_log_attempt_count_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notification_log'::regclass
      AND conname = 'notification_log_recipient_email_normalized_check'
  ) THEN
    ALTER TABLE public.notification_log
      DROP CONSTRAINT notification_log_recipient_email_normalized_check;
  END IF;
END
$$;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_status_check
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  ADD CONSTRAINT notification_log_attempt_count_check
    CHECK (attempt_count >= 0),
  ADD CONSTRAINT notification_log_recipient_email_normalized_check
    CHECK (recipient_email = lower(btrim(recipient_email)));

CREATE UNIQUE INDEX IF NOT EXISTS notification_log_event_recipient_key
  ON public.notification_log (event_key, recipient_email);

CREATE INDEX IF NOT EXISTS idx_notification_log_ticket_id
  ON public.notification_log (ticket_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_delivery_queue
  ON public.notification_log (next_attempt_at, status)
  WHERE status IN ('pending', 'sending', 'failed');

CREATE OR REPLACE FUNCTION public.handle_notification_log_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_notification_log_timestamp ON public.notification_log;

CREATE TRIGGER trigger_update_notification_log_timestamp
  BEFORE UPDATE ON public.notification_log
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_log_updated_at();

REVOKE EXECUTE ON FUNCTION public.handle_notification_log_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_notification_log_updated_at() FROM anon, authenticated;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_log FROM PUBLIC;
REVOKE ALL ON TABLE public.notification_log FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_log TO service_role;

-- Remove the unversioned function and any triggers that depend on it. The
-- replacement below owns the supported event mapping.
DROP FUNCTION IF EXISTS public.notify_ticket_email() CASCADE;

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
  SELECT id, ticket_id, event_type, status, created_at
  INTO delivery_record
  FROM public.notification_log
  WHERE id = p_delivery_id;

  IF NOT FOUND OR delivery_record.status <> 'pending' THEN
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
BEGIN
  RETURN QUERY
  UPDATE public.notification_log AS notification
  SET
    status = 'sending',
    attempt_count = notification.attempt_count + 1,
    next_attempt_at = NULL,
    last_error = NULL
  WHERE notification.id = p_delivery_id
    AND notification.status = 'pending'
    AND notification.attempt_count < 5
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

CREATE OR REPLACE FUNCTION public.enqueue_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_id UUID;
  delivery_status TEXT;
  recipient TEXT;
  stable_event_key TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'in_progress' THEN
    recipient := lower(btrim(coalesce(NEW.reporter_email, '')));

    IF recipient <> '' THEN
      stable_event_key := format(
        'ticket:%s:in_progress:%s',
        NEW.id,
        extract(epoch FROM coalesce(NEW.updated_at, pg_catalog.now()))::text
      );

      INSERT INTO public.notification_log (
        ticket_id,
        event_type,
        event_key,
        recipient_email,
        status
      )
      VALUES (
        NEW.id,
        'in_progress',
        stable_event_key,
        recipient,
        'pending'
      )
      ON CONFLICT (event_key, recipient_email) DO NOTHING
      RETURNING id INTO delivery_id;

      IF delivery_id IS NULL THEN
        SELECT notification.id, notification.status
        INTO delivery_id, delivery_status
        FROM public.notification_log AS notification
        WHERE notification.event_key = stable_event_key
          AND notification.recipient_email = recipient;
      ELSE
        delivery_status := 'pending';
      END IF;

      IF delivery_id IS NOT NULL AND delivery_status = 'pending' THEN
        PERFORM public.invoke_notification_delivery(delivery_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_notification() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ticket_notification_on_progress ON public.tickets;

CREATE TRIGGER ticket_notification_on_progress
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enqueue_ticket_notification();
