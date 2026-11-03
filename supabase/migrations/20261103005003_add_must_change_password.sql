ALTER TABLE public.profiles
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.must_change_password IS
  'Set for accounts using an admin-assisted initial password until the user changes it.';
