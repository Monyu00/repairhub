ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 舊頭像只存在 auth metadata，先搬到 profile，後面讀取才只以 profile 為準。
UPDATE public.profiles AS p
SET avatar_url = nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
FROM auth.users AS u
WHERE u.id = p.id
  AND p.avatar_url IS NULL
  AND nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '') IS NOT NULL;

GRANT UPDATE (display_name, department, phone, notification_preferences, updated_at, avatar_url) ON public.profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated users to read avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow anyone to read avatars" ON storage.objects;
CREATE POLICY "Allow anyone to read avatars"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow users to insert own avatar" ON storage.objects;
CREATE POLICY "Allow users to insert own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Allow users to delete own avatar" ON storage.objects;
CREATE POLICY "Allow users to delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
