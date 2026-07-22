-- Create storage bucket for ticket photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-photos', 'ticket-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
CREATE POLICY "Allow anyone to upload ticket photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'ticket-photos');

CREATE POLICY "Allow anyone to read ticket photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'ticket-photos');
