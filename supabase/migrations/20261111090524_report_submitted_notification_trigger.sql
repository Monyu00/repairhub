-- Move the readiness trigger to enqueue_ticket_ready_notification so the same
-- readiness point also creates the Reporter Submission Confirmation, and drop
-- the superseded enqueue_new_ticket_notification.

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

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_ticket_ready_notification() FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.enqueue_new_ticket_notification();

DROP TRIGGER IF EXISTS ticket_notification_on_readiness ON public.tickets;

CREATE TRIGGER ticket_notification_on_readiness
  AFTER UPDATE OF notification_ready_at ON public.tickets
  FOR EACH ROW
  WHEN (OLD.notification_ready_at IS NULL AND NEW.notification_ready_at IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_ticket_ready_notification();
