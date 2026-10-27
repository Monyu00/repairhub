-- A failure while queuing the Edge Function call must not roll back the Ticket
-- write that triggered it. A bytea-escaped Vault value already blocked every
-- intake through net.http_post raising "Bad scheme". Delivery stays in the
-- ledger and the cron worker reclaims it.

CREATE OR REPLACE FUNCTION public.enqueue_new_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  delivery_id UUID;
  delivery_status TEXT;
  stable_event_key TEXT;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- A Ticket has one logical new_ticket event, regardless of later row updates.
  stable_event_key := format('ticket:%s:new_ticket', NEW.id);

  FOR recipient IN
    SELECT DISTINCT lower(btrim(auth_user.email))
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
    INSERT INTO public.notification_log (
      ticket_id,
      event_type,
      event_key,
      recipient_email,
      status
    )
    VALUES (
      NEW.id,
      'new_ticket',
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
        SET last_error = SQLERRM,
            next_attempt_at = pg_catalog.now() + interval '5 minutes'
        WHERE id = delivery_id;

        RAISE WARNING 'Notification delivery % could not be invoked: %', delivery_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_new_ticket_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_new_ticket_notification() FROM anon, authenticated;
