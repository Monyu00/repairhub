ALTER TABLE public.tickets
  ADD COLUMN building_id UUID REFERENCES public.buildings ON DELETE RESTRICT;

ALTER TABLE public.tickets
  ALTER COLUMN space_id DROP NOT NULL;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_location_required CHECK (building_id IS NOT NULL OR space_id IS NOT NULL);
