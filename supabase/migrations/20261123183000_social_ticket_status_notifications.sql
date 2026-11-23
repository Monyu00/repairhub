-- Extend social intake to the same status events covered by Email/In-app intake.
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
    IF p_event_type NOT IN (
      'new_ticket',
      'report_submitted',
      'in_progress',
      'completed',
      'closed',
      'cancelled'
    ) THEN
      RAISE EXCEPTION 'Unsupported social notification event type: %', p_event_type;
    END IF;

    target_fingerprint := lower(btrim(coalesce(p_target_fingerprint, '')));
    IF target_fingerprint = '' THEN
      RETURN;
    END IF;

    preference_key := CASE p_event_type
      WHEN 'new_ticket' THEN 'new_ticket'
      ELSE 'ticket_status'
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM public.social_webhooks AS webhook
      JOIN public.profiles AS profile ON profile.id = webhook.account_id
      JOIN auth.users AS auth_user ON auth_user.id = profile.id
      WHERE webhook.target_fingerprint = target_fingerprint
        AND webhook.enabled IS TRUE
        AND profile.is_active IS TRUE
        AND public.notification_preference_enabled(auth_user.email, preference_key)
    ) THEN
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

CREATE OR REPLACE FUNCTION public.enqueue_social_ticket_status_deliveries(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_fingerprint TEXT;
BEGIN
  FOR target_fingerprint IN
    SELECT DISTINCT webhook.target_fingerprint
    FROM public.tickets AS ticket
    JOIN public.profiles AS profile ON lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    WHERE ticket.id = p_ticket_id
      AND profile.is_active IS TRUE
      AND profile.id IS DISTINCT FROM p_actor_id
      AND webhook.enabled IS TRUE
      AND public.notification_preference_enabled(auth_user.email, 'ticket_status')
      AND btrim(ticket.reporter_email) <> ''

    UNION

    SELECT DISTINCT webhook.target_fingerprint
    FROM public.tickets AS ticket
    JOIN public.profiles AS profile ON profile.id = ticket.assigned_to
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    WHERE ticket.id = p_ticket_id
      AND profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND profile.id IS DISTINCT FROM p_actor_id
      AND webhook.enabled IS TRUE
      AND public.notification_preference_enabled(auth_user.email, 'ticket_status')
  LOOP
    PERFORM public.enqueue_notification_delivery(
      p_ticket_id,
      p_event_type,
      NULL,
      (SELECT updated_at FROM public.tickets WHERE id = p_ticket_id),
      'social',
      target_fingerprint
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_social_ticket_status_deliveries(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_social_ticket_status_deliveries(UUID, TEXT, UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_ticket_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  event_type TEXT;
BEGIN
  IF OLD.status = 'pending'::public.ticket_status AND NEW.status = 'in_progress'::public.ticket_status THEN
    event_type := 'in_progress';
  ELSIF OLD.status = 'in_progress'::public.ticket_status AND NEW.status = 'completed'::public.ticket_status THEN
    event_type := 'completed';
  ELSIF OLD.status = 'completed'::public.ticket_status AND NEW.status = 'closed'::public.ticket_status THEN
    event_type := 'closed';
  ELSIF OLD.status = 'completed'::public.ticket_status AND NEW.status = 'in_progress'::public.ticket_status THEN
    event_type := 'in_progress';
  ELSIF OLD.status IN ('pending'::public.ticket_status, 'in_progress'::public.ticket_status)
    AND NEW.status = 'cancelled'::public.ticket_status THEN
    event_type := 'cancelled';
  ELSE
    RETURN NEW;
  END IF;

  actor_id := auth.uid();

  PERFORM public.enqueue_social_ticket_status_deliveries(
    NEW.id,
    event_type,
    actor_id
  );

  IF NOT (
    OLD.status = 'completed'::public.ticket_status
    AND NEW.status = 'in_progress'::public.ticket_status
  ) THEN
    PERFORM public.enqueue_notification_delivery(
      NEW.id,
      event_type,
      NEW.reporter_email,
      NEW.updated_at
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_status_notification() FROM anon, authenticated;
