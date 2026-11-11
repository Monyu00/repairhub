CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_event_type_check CHECK (event_type = 'new_ticket'),
  CONSTRAINT notifications_recipient_ticket_event_unique UNIQUE (recipient_id, ticket_id, event_type)
);

CREATE INDEX notifications_recipient_created_at_idx
  ON public.notifications (recipient_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notifications FROM PUBLIC;
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO service_role;

CREATE POLICY "Allow recipients to read notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = recipient_id);

-- Add in-app records at the same readiness point as Email dispatch, without
-- allowing a failed in-app write to prevent the ticket state change.
CREATE OR REPLACE FUNCTION public.enqueue_ticket_ready_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient TEXT;
  recipient_id UUID;
BEGIN
  IF OLD.notification_ready_at IS NOT NULL OR NEW.notification_ready_at IS NULL THEN
    RETURN NEW;
  END IF;

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
        ON CONFLICT (recipient_id, ticket_id, event_type) DO NOTHING;
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
