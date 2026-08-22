-- Add reporter and equipment fields to tickets
ALTER TABLE public.tickets
  ADD COLUMN reporter_name TEXT,
  ADD COLUMN reporter_department TEXT,
  ADD COLUMN equipment_name TEXT;

-- Add department and phone to profiles
ALTER TABLE public.profiles
  ADD COLUMN department TEXT,
  ADD COLUMN phone TEXT;

-- Update handle_new_user trigger function to also include phone and department if present in auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role, display_name, phone, department)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'department'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
