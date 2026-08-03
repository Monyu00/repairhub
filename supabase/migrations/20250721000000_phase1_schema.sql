-- Phase 1 database schema setup

-- Create custom enums
CREATE TYPE public.user_role AS ENUM ('admin', 'technician');
CREATE TYPE public.ticket_status AS ENUM ('pending', 'in_progress', 'completed', 'closed', 'cancelled');
CREATE TYPE public.ticket_photo_phase AS ENUM ('report', 'closure');
CREATE TYPE public.ticket_note_type AS ENUM ('note', 'status_change');

-- Enable updated_at trigger helper
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  user_role public.user_role,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for auto updated_at on profiles
CREATE TRIGGER trigger_update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-create profile when user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role)
  VALUES (NEW.id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure the trigger function so it cannot be executed by unauthorized roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 2. Buildings
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_buildings_timestamp
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- 3. Spaces
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  floor INTEGER NOT NULL,
  building_id UUID REFERENCES public.buildings ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(building_id, name, floor)
);

CREATE TRIGGER trigger_update_spaces_timestamp
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_categories_timestamp
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Technician categories (many-to-many link)
CREATE TABLE public.technician_categories (
  technician_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (technician_id, category_id)
);

-- 5b. Equipment
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  space_id UUID REFERENCES public.spaces ON DELETE RESTRICT NOT NULL,
  purchase_date DATE,
  warranty_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_equipment_timestamp
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.ticket_status DEFAULT 'pending'::public.ticket_status NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE RESTRICT NOT NULL,
  space_id UUID REFERENCES public.spaces ON DELETE RESTRICT NOT NULL,
  equipment_id UUID REFERENCES public.equipment ON DELETE SET NULL,
  description TEXT NOT NULL,
  reporter_email TEXT NOT NULL,
  reporter_phone TEXT,
  assigned_to UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_tickets_timestamp
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Ticket Photos
CREATE TABLE public.ticket_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  phase public.ticket_photo_phase NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Ticket Notes
CREATE TABLE public.ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles ON DELETE SET NULL,
  content TEXT NOT NULL,
  type public.ticket_note_type DEFAULT 'note'::public.ticket_note_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =========================================
-- SECURITY DEFINER / INVOKER RPC Functions
-- =========================================

-- Claim ticket RPC (atomically updates status and assigned technician)
CREATE OR REPLACE FUNCTION public.claim_ticket(
  p_ticket_id UUID,
  p_technician_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
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

-- =========================================
-- Enable Row Level Security (RLS)
-- =========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Buildings Policies
CREATE POLICY "Allow anyone to read buildings"
  ON public.buildings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admins to manage buildings"
  ON public.buildings FOR ALL
  TO authenticated
  USING ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

-- Spaces Policies
CREATE POLICY "Allow anyone to read spaces"
  ON public.spaces FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admins to manage spaces"
  ON public.spaces FOR ALL
  TO authenticated
  USING ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

-- Categories Policies
CREATE POLICY "Allow anyone to read categories"
  ON public.categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admins to manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

-- Equipment Policies
CREATE POLICY "Allow anyone to read equipment"
  ON public.equipment FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admins to manage equipment"
  ON public.equipment FOR ALL
  TO authenticated
  USING ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

-- Technician Categories Policies
CREATE POLICY "Allow authenticated users to read technician categories"
  ON public.technician_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow technician or admin to manage link"
  ON public.technician_categories FOR ALL
  TO authenticated
  USING (
    auth.uid() = technician_id OR
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role
  )
  WITH CHECK (
    auth.uid() = technician_id OR
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role
  );

-- Tickets Policies
CREATE POLICY "Allow anonymous or logged in users to create tickets"
  ON public.tickets FOR INSERT
  TO authenticated, anon
  WITH CHECK (status = 'pending'::public.ticket_status);

CREATE POLICY "Allow authenticated users to read tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins and assigned technicians to update tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role
  );

-- Ticket Photos Policies
CREATE POLICY "Allow anyone to insert photos"
  ON public.ticket_photos FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read photos"
  ON public.ticket_photos FOR SELECT
  TO authenticated
  USING (true);

-- Ticket Notes Policies
CREATE POLICY "Allow authenticated users to insert notes"
  ON public.ticket_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow authenticated users to read notes"
  ON public.ticket_notes FOR SELECT
  TO authenticated
  USING (true);

-- =========================================
-- Explicit Grants for API settings fallback
-- =========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT SELECT ON public.buildings, public.spaces, public.categories, public.equipment TO anon;
GRANT INSERT ON public.tickets, public.ticket_photos TO anon;
