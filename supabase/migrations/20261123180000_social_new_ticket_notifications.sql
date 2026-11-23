-- Restore the #193 in-app recipient model before adding the #212 social leg.
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
  v_target_fingerprint TEXT;
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
    IF p_event_type NOT IN ('new_ticket', 'report_submitted') THEN
      RAISE EXCEPTION 'Unsupported social notification event type: %', p_event_type;
    END IF;

    v_target_fingerprint := lower(btrim(coalesce(p_target_fingerprint, '')));
    IF v_target_fingerprint = '' THEN
      RETURN;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.social_webhooks AS webhook
      JOIN public.profiles AS profile ON profile.id = webhook.account_id
      WHERE webhook.target_fingerprint = v_target_fingerprint
        AND webhook.enabled IS TRUE
        AND profile.is_active IS TRUE
    ) THEN
      RETURN;
    END IF;

    IF p_event_type = 'new_ticket'
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_webhooks AS webhook
        JOIN public.profiles AS profile ON profile.id = webhook.account_id
        JOIN auth.users AS auth_user ON auth_user.id = profile.id
        WHERE webhook.target_fingerprint = v_target_fingerprint
          AND webhook.enabled IS TRUE
          AND profile.is_active IS TRUE
          AND public.notification_preference_enabled(auth_user.email, 'new_ticket')
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
    v_target_fingerprint,
    status
  )
  VALUES (
    p_ticket_id,
    p_event_type,
    stable_event_key,
    CASE WHEN p_channel = 'email' THEN recipient END,
    p_channel,
    v_target_fingerprint,
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
        OR (p_channel = 'social' AND notification.target_fingerprint = v_target_fingerprint)
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

-- The generalized function defaults the new parameters, so retaining the old
-- overload makes existing 3-argument calls ambiguous.
DROP FUNCTION public.enqueue_notification_delivery(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.enqueue_social_new_ticket_deliveries(
  p_ticket_id UUID,
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
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.social_webhooks AS webhook ON webhook.account_id = profile.id
    JOIN public.tickets AS ticket ON ticket.id = p_ticket_id
    LEFT JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
      AND subscription.category_id = ticket.category_id
    WHERE profile.is_active IS TRUE
      AND profile.id IS DISTINCT FROM p_actor_id
      AND webhook.enabled IS TRUE
      AND public.notification_preference_enabled(auth_user.email, 'new_ticket')
      AND (
        profile.user_role = 'admin'::public.user_role
        OR (
          profile.user_role = 'technician'::public.user_role
          AND subscription.category_id IS NOT NULL
        )
      )
    ORDER BY 1
  LOOP
    PERFORM public.enqueue_notification_delivery(
      p_ticket_id,
      'new_ticket',
      NULL,
      NULL,
      'social',
      target_fingerprint
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_social_new_ticket_deliveries(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_social_new_ticket_deliveries(UUID, UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  recipient_id UUID;
  recipient_role public.user_role;
  actor_id UUID;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  actor_id := auth.uid();

  FOR recipient_id, recipient, recipient_role IN
    SELECT DISTINCT profile.id, auth_user.email, profile.user_role
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    LEFT JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
      AND subscription.category_id = NEW.category_id
    WHERE profile.is_active IS TRUE
      AND (
        profile.user_role = 'admin'::public.user_role
        OR (
          profile.user_role = 'technician'::public.user_role
          AND subscription.category_id IS NOT NULL
        )
      )
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY auth_user.email
  LOOP
    IF recipient_id IS DISTINCT FROM actor_id
      AND lower(btrim(recipient)) IS DISTINCT FROM lower(btrim(NEW.reporter_email))
      AND public.notification_preference_enabled(recipient, 'new_ticket') THEN
      BEGIN
        INSERT INTO public.notifications (
          recipient_id,
          ticket_id,
          event_type
        )
        VALUES (
          recipient_id,
          NEW.id,
          'new_ticket'
        )
        ON CONFLICT (recipient_id, ticket_id, event_type)
          WHERE event_type = 'new_ticket'
        DO NOTHING;
      EXCEPTION WHEN others THEN
        RAISE WARNING 'In-app notification could not be written for ticket %: %', NEW.id, SQLERRM;
      END;
    END IF;

    -- Email behavior is unchanged for subscribed Technicians, including actors.
    IF recipient_role = 'technician'::public.user_role THEN
      PERFORM public.enqueue_notification_delivery(
        NEW.id,
        'new_ticket',
        recipient
      );
    END IF;
  END LOOP;

  PERFORM public.enqueue_social_new_ticket_deliveries(
    NEW.id,
    actor_id
  );

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
