-- Per-account Notification Preferences live on the profile as a flat JSON object (ADR-0009).
-- A missing event key means that Event stays enabled for accounts created before this change.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Flat object mapping Event key to boolean. A missing key means the Event is enabled.';

-- 20261103030816 revoked the table-wide UPDATE grant, so re-grant it with the new column included.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (display_name, department, phone, notification_preferences, updated_at) ON public.profiles TO authenticated;
