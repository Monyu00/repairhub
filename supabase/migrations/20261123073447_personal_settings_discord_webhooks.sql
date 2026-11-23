CREATE TABLE IF NOT EXISTS public.social_webhooks (
  account_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  target_fingerprint TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_webhook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_webhook_attempts_account_window
  ON public.social_webhook_attempts (account_id, attempted_at);

CREATE OR REPLACE FUNCTION public.handle_social_webhooks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_social_webhooks_timestamp ON public.social_webhooks;

CREATE TRIGGER trigger_update_social_webhooks_timestamp
  BEFORE UPDATE ON public.social_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_social_webhooks_updated_at();

CREATE OR REPLACE FUNCTION public.reserve_social_webhook_attempt()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  p_account_id UUID := auth.uid();
  recent_attempts INTEGER;
BEGIN
  IF account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = p_account_id
  FOR UPDATE;

  SELECT count(*)
  INTO recent_attempts
  FROM public.social_webhook_attempts
  WHERE account_id = p_account_id
    AND attempted_at > pg_catalog.now() - INTERVAL '15 minutes';

  IF recent_attempts >= 5 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.social_webhook_attempts (account_id)
  VALUES (p_account_id);

  RETURN TRUE;
END;
$$;

ALTER TABLE public.social_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_webhook_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.social_webhooks FROM PUBLIC;
REVOKE ALL ON TABLE public.social_webhooks FROM anon, authenticated;
REVOKE ALL ON TABLE public.social_webhook_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.social_webhook_attempts FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_webhooks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_webhook_attempts TO service_role;

REVOKE EXECUTE ON FUNCTION public.reserve_social_webhook_attempt() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_social_webhook_attempt() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_social_webhook_attempt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_social_webhook_attempt() TO service_role;
