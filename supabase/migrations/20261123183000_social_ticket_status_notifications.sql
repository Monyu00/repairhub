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
    JOIN auth.users AS auth_user ON lower(btrim(auth_user.email)) = lower(btrim(ticket.reporter_email))
    JOIN public.profiles AS profile ON profile.id = auth_user.id
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
