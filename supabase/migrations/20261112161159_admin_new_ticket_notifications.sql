-- Issue #193: every active Admin gets an in-app new_ticket Notice for all Categories.
-- Admins stay out of Email delivery, and the Technician subscription path keeps its
-- current shape for everyone except the actor, plus the same Reporter confirmation.

CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  recipient_id UUID;
  actor_id UUID;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Intake writes through the service-role client, so auth.uid() is normally NULL.
  -- The Reporter Email is the fallback identity for actor exclusion.
  actor_id := auth.uid();

  FOR recipient_id, recipient IN
    SELECT DISTINCT profile.id, auth_user.email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.technician_categories AS subscription
      ON subscription.technician_id = profile.id
    WHERE profile.user_role = 'technician'::public.user_role
      AND profile.is_active IS TRUE
      AND subscription.category_id = NEW.category_id
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY auth_user.email
  LOOP
    IF recipient_id IS NOT DISTINCT FROM actor_id
      OR lower(btrim(recipient)) = lower(btrim(NEW.reporter_email)) THEN
      CONTINUE;
    END IF;

    BEGIN
      IF public.notification_preference_enabled(recipient, 'new_ticket') THEN
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
      END IF;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'In-app notification could not be written for ticket %: %', NEW.id, SQLERRM;
    END;

    PERFORM public.enqueue_notification_delivery(
      NEW.id,
      'new_ticket',
      recipient
    );
  END LOOP;

  FOR recipient_id, recipient IN
    SELECT DISTINCT profile.id, auth_user.email
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.user_role = 'admin'::public.user_role
      AND profile.is_active IS TRUE
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
    ORDER BY auth_user.email
  LOOP
    IF recipient_id IS NOT DISTINCT FROM actor_id
      OR lower(btrim(recipient)) = lower(btrim(NEW.reporter_email)) THEN
      CONTINUE;
    END IF;

    BEGIN
      IF public.notification_preference_enabled(recipient, 'new_ticket') THEN
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
      END IF;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'In-app notification could not be written for ticket %: %', NEW.id, SQLERRM;
    END;
  END LOOP;

  PERFORM public.enqueue_notification_delivery(
    NEW.id,
    'report_submitted',
    NEW.reporter_email
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM anon, authenticated;
