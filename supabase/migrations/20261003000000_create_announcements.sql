-- Create announcement_audience enum
CREATE TYPE public.announcement_audience AS ENUM ('internal', 'public', 'all');

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience public.announcement_audience NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto updated_at
CREATE TRIGGER trigger_update_announcements_timestamp
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;

-- Policies:
-- 1. Admins full access
CREATE POLICY "Allow admins to manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

-- 2. Authenticated users can read valid announcements
CREATE POLICY "Allow authenticated users to read valid announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    published_at <= NOW() AND
    (expires_at IS NULL OR expires_at > NOW())
  );

-- 3. Anonymous users can read valid public/all announcements
CREATE POLICY "Allow public users to read valid announcements"
  ON public.announcements FOR SELECT
  TO anon
  USING (
    audience IN ('public', 'all') AND
    published_at <= NOW() AND
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Indexes
CREATE INDEX idx_announcements_published_expires ON public.announcements (published_at, expires_at);
CREATE INDEX idx_announcements_audience ON public.announcements (audience);
