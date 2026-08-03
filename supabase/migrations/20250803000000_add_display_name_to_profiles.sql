-- Add display_name column to profiles
ALTER TABLE public.profiles
  ADD COLUMN display_name TEXT;

-- Update handle_new_user trigger function to populate display_name from auth metadata or email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role, display_name)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with display_name from auth.users metadata or email prefix
UPDATE public.profiles p
SET display_name = COALESCE(
  u.raw_user_meta_data ->> 'display_name',
  u.raw_user_meta_data ->> 'full_name',
  split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND p.display_name IS NULL;
