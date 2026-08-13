-- Migration: Auto-close completed tickets after 7 days via pg_cron

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- 2. Create partial index for performance on completed tickets lookup
CREATE INDEX IF NOT EXISTS idx_tickets_completed_updated_at
  ON public.tickets (updated_at)
  WHERE status = 'completed'::public.ticket_status;

-- 3. Create function to process auto-closing tickets
CREATE OR REPLACE FUNCTION public.auto_close_completed_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  FOR v_ticket IN
    SELECT id
    FROM public.tickets
    WHERE status = 'completed'::public.ticket_status
      AND updated_at < NOW() - INTERVAL '7 days'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Update ticket status to closed
    UPDATE public.tickets
    SET status = 'closed'::public.ticket_status,
        updated_at = NOW()
    WHERE id = v_ticket.id;

    -- Insert system audit note
    INSERT INTO public.ticket_notes (ticket_id, author_id, content, type)
    VALUES (
      v_ticket.id,
      NULL,
      'Ticket auto-closed after 7 days without reporter response.',
      'status_change'::public.ticket_note_type
    );
  END LOOP;
END;
$$;

-- 4. Revoke execution permissions from public API roles for security
REVOKE EXECUTE ON FUNCTION public.auto_close_completed_tickets() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_close_completed_tickets() FROM anon, authenticated;

-- 5. Schedule daily pg_cron job at 03:00 UTC
SELECT cron.schedule(
  'auto-close-completed-tickets',
  '0 3 * * *',
  $$SELECT public.auto_close_completed_tickets()$$
);
