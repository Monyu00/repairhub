-- Generalize the shared queue for social targets without changing Email intake.
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS target_fingerprint TEXT;

ALTER TABLE public.notification_log
  ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_channel_check
    CHECK (channel IN ('email', 'social')),
  ADD CONSTRAINT notification_log_email_shape_check
    CHECK (channel <> 'email' OR (target_fingerprint IS NULL AND recipient_email IS NOT NULL)),
  ADD CONSTRAINT notification_log_social_shape_check
    CHECK (channel <> 'social' OR (target_fingerprint IS NOT NULL AND recipient_email IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS notification_log_social_event_target_key
  ON public.notification_log (event_key, target_fingerprint)
  WHERE channel = 'social';

CREATE OR REPLACE FUNCTION public.enqueue_notification_delivery(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_recipient_email TEXT,
  p_event_at TIMESTAMPTZ DEFAULT NULL,
  p_channel TEXT DEFAULT 'email',
  p_target_fingerprint TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_id UUID;
  delivery_status TEXT;
  preference_key TEXT;
  recipient TEXT;
  stable_event_key TEXT;
  target_fingerprint TEXT;
BEGIN
  IF p_channel = 'email' THEN
    IF p_event_type NOT IN ('new_ticket', 'report_submitted', 'in_progress', 'completed', 'closed', 'cancelled') THEN
      RAISE EXCEPTION 'Unsupported notification event type: %', p_event_type;
    END IF;

    recipient := lower(btrim(coalesce(p_recipient_email, '')));
    IF recipient = '' THEN
      RETURN;
    END IF;

    preference_key := CASE p_event_type
      WHEN 'new_ticket' THEN 'new_ticket'
      ELSE 'ticket_status'
    END;

    IF NOT public.notification_preference_enabled(recipient, preference_key) THEN
      RETURN;
    END IF;
  ELSIF p_channel = 'social' THEN
    target_fingerprint := lower(btrim(coalesce(p_target_fingerprint, '')));
    IF target_fingerprint = '' THEN
      RETURN;
    END IF;

    -- Every Social shape is event plus the same target predicate.
    IF public.resolve_social_notification_target(target_fingerprint, p_event_type) IS NULL THEN
      RETURN;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported notification channel: %', p_channel;
  END IF;

  IF p_event_type IN ('new_ticket', 'report_submitted') THEN
    stable_event_key := format('ticket:%s:%s', p_ticket_id, p_event_type);
  ELSIF p_event_at IS NULL THEN
    RAISE EXCEPTION 'Event timestamp is required for notification event type: %', p_event_type;
  ELSE
    stable_event_key := format(
      'ticket:%s:%s:%s',
      p_ticket_id,
      p_event_type,
      extract(epoch FROM p_event_at)::text
    );
  END IF;

  INSERT INTO public.notification_log (
    ticket_id,
    event_type,
    event_key,
    recipient_email,
    channel,
    target_fingerprint,
    status
  )
  VALUES (
    p_ticket_id,
    p_event_type,
    stable_event_key,
    CASE WHEN p_channel = 'email' THEN recipient END,
    p_channel,
    target_fingerprint,
    'pending'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO delivery_id;

  IF delivery_id IS NULL THEN
    SELECT notification.id, notification.status
    INTO delivery_id, delivery_status
    FROM public.notification_log AS notification
    WHERE notification.event_key = stable_event_key
      AND (
        (p_channel = 'email' AND notification.recipient_email = recipient)
        OR (p_channel = 'social' AND notification.target_fingerprint = target_fingerprint)
      );
  ELSE
    delivery_status := 'pending';
  END IF;

  IF delivery_id IS NOT NULL AND delivery_status = 'pending' THEN
    BEGIN
      PERFORM public.invoke_notification_delivery(delivery_id);
    EXCEPTION WHEN others THEN
      UPDATE public.notification_log
      SET
        last_error = SQLERRM,
        next_attempt_at = pg_catalog.now() + interval '5 minutes'
      WHERE id = delivery_id;

      RAISE WARNING 'Notification delivery % could not be invoked: %', delivery_id, SQLERRM;
    END;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM anon, authenticated;

-- Generalizing this function adds defaults, so the 4-arg overload becomes ambiguous.
DROP FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ);

-- Mixed-case stored auth Emails must not turn a disabled preference back on.
CREATE OR REPLACE FUNCTION public.notification_preference_enabled(
  p_recipient_email TEXT,
  p_event_key TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT (prefs.notification_preferences ->> p_event_key) IS DISTINCT FROM 'false'
      FROM public.profiles AS prefs
      JOIN auth.users AS auth_user ON auth_user.id = prefs.id
      WHERE lower(btrim(auth_user.email)) = lower(btrim(p_recipient_email))
      LIMIT 1
    ),
    TRUE
  );
$$;

REVOKE EXECUTE ON FUNCTION public.notification_preference_enabled(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notification_preference_enabled(TEXT, TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_social_report_submitted_delivery(
  p_ticket_id UUID,
  p_reporter_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reporter_account_id UUID;
  target_fingerprint TEXT;
BEGIN
  SELECT profile.id, webhook.target_fingerprint
  INTO reporter_account_id, target_fingerprint
  FROM public.profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
  WHERE auth_user.email = lower(btrim(p_reporter_email))
    AND profile.is_active IS TRUE
    AND webhook.enabled IS TRUE
    AND public.notification_preference_enabled(p_reporter_email, 'ticket_status')
  LIMIT 1;

  IF reporter_account_id IS NOT NULL THEN
    PERFORM public.enqueue_notification_delivery(
      p_ticket_id,
      'report_submitted',
      NULL,
      NULL,
      'social',
      target_fingerprint
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_social_report_submitted_delivery(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_social_report_submitted_delivery(UUID, TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_social_notification_delivery(p_delivery_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  event_type TEXT,
  event_key TEXT,
  target_fingerprint TEXT,
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
  WHERE notification.id = (
    SELECT candidate.id
    FROM public.notification_log AS candidate
    WHERE candidate.id = p_delivery_id
      AND candidate.channel = 'social'
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
    notification.target_fingerprint,
    notification.status,
    notification.attempt_count,
    notification.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_social_notification_delivery(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_social_notification_delivery(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_social_notification_delivery(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_social_notification_target(
  p_target_fingerprint TEXT,
  p_event_type TEXT
)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT webhook.webhook_url
  FROM public.social_webhooks AS webhook
  JOIN public.profiles AS profile ON profile.id = webhook.account_id
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  WHERE webhook.target_fingerprint = lower(btrim(p_target_fingerprint))
    AND webhook.enabled IS TRUE
    AND profile.is_active IS TRUE
    AND public.notification_preference_enabled(
      auth_user.email,
      CASE WHEN p_event_type = 'new_ticket' THEN 'new_ticket' ELSE 'ticket_status' END
    )
  ORDER BY webhook.account_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_social_notification_target(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_social_notification_target(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_social_notification_target(TEXT, TEXT) TO service_role;

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
    channel,
    status,
    attempt_count,
    next_attempt_at,
    updated_at
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
    url := rtrim(project_url, '/') || CASE delivery_record.channel
      WHEN 'social' THEN '/functions/v1/send-ticket-social'
      ELSE '/functions/v1/send-ticket-email'
    END,
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

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  FOR recipient IN
    SELECT DISTINCT auth_user.email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
    WHERE profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND subscription.category_id = NEW.category_id
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY 1
  LOOP
    PERFORM public.enqueue_notification_delivery(
      NEW.id,
      'new_ticket',
      recipient
    );
  END LOOP;

  PERFORM public.enqueue_notification_delivery(
    NEW.id,
    'report_submitted',
    NEW.reporter_email
  );

  PERFORM public.enqueue_social_report_submitted_delivery(
    NEW.id,
    NEW.reporter_email
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM anon, authenticated;
