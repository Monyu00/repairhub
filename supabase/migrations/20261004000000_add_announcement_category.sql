-- Create announcement_category enum
CREATE TYPE public.announcement_category AS ENUM (
  'general',
  'system_maintenance',
  'outage',
  'policy'
);

-- Add category column to announcements table
ALTER TABLE public.announcements
  ADD COLUMN category public.announcement_category NOT NULL DEFAULT 'general';

-- Index for category filtering
CREATE INDEX idx_announcements_category ON public.announcements (category);
