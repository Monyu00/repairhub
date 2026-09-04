-- Migration: Fix claim_ticket RPC to run as SECURITY DEFINER
-- Reason: Under SECURITY INVOKER, RLS on public.tickets prevents updating unassigned (pending) tickets 
-- because assigned_to is NULL, which fails the (assigned_to = auth.uid()) check.

CREATE OR REPLACE FUNCTION public.claim_ticket(
  p_ticket_id UUID,
  p_technician_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  -- Verify caller is claiming for themselves when called via Supabase Auth
  IF auth.uid() IS NOT NULL AND auth.uid() != p_technician_id THEN
    RAISE EXCEPTION 'Cannot claim ticket on behalf of another technician.';
  END IF;

  -- Validate technician profile role exists
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_technician_id AND user_role = 'technician'
  ) THEN
    RAISE EXCEPTION 'Claimant is not a registered technician.';
  END IF;

  -- Atomic claim update
  UPDATE public.tickets
  SET status = 'in_progress'::public.ticket_status,
      assigned_to = p_technician_id,
      updated_at = NOW()
  WHERE id = p_ticket_id
    AND status = 'pending'::public.ticket_status
    AND assigned_to IS NULL;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows > 0 THEN
    -- Log this state change in the ticket notes
    INSERT INTO public.ticket_notes (ticket_id, author_id, content, type)
    VALUES (
      p_ticket_id,
      p_technician_id,
      'Ticket claimed by technician.',
      'status_change'::public.ticket_note_type
    );
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_ticket(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ticket(UUID, UUID) TO authenticated;
