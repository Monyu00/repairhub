-- Notification Preferences gate the enqueue path (ADR-0009): a disabled Event writes
-- no Delivery at all, so the Account preference is read before the ledger write.
-- Deliveries already queued stay untouched because only the INSERT is gated.

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
  -- A missing Account or a missing key keeps the Event enabled instead of failing intake.
  SELECT COALESCE(
    (
      SELECT (prefs.notification_preferences ->> p_event_key) IS DISTINCT FROM 'false'
      FROM public.profiles AS prefs
      JOIN auth.users AS auth_user ON auth_user.id = prefs.id
      WHERE auth_user.email = lower(btrim(p_recipient_email))
      LIMIT 1
    ),
    TRUE
  );
$$;

REVOKE EXECUTE ON FUNCTION public.notification_preference_enabled(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notification_preference_enabled(TEXT, TEXT) FROM anon, authenticated;

-- Same signature and body as the original queue migration, with the preference
-- gate inserted after the empty-recipient early return.
CREATE OR REPLACE FUNCTION public.enqueue_notification_delivery(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_recipient_email TEXT,
  p_event_at TIMESTAMPTZ DEFAULT NULL
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
BEGIN
  IF p_event_type NOT IN ('new_ticket', 'in_progress', 'completed', 'closed') THEN
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

  IF p_event_type = 'new_ticket' THEN
    stable_event_key := format('ticket:%s:new_ticket', p_ticket_id);
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
    status
  )
  VALUES (
    p_ticket_id,
    p_event_type,
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

REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM anon, authenticated;
