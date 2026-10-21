-- ====================================================================
-- GREEN ENLIGHTENMENT — PRODUCTION STORAGE RLS HARDENING
-- Ensures public access and reliable uploads for:
--   1. treebank (Citizen & NGO Tree Photos)
--   2. evidence (MRV Audits, Ranger Field Photos)
--   3. tree-photos (Direct Tree Photos)
--   4. project-photos (Site Photos)
--   5. avatars (User Profiles)
-- ====================================================================

-- 1. Ensure buckets exist with public read enabled
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('treebank', 'treebank', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('evidence', 'evidence', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  ('tree-photos', 'tree-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('project-photos', 'project-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public Read Policies
DROP POLICY IF EXISTS "Public Read All Media" ON storage.objects;
CREATE POLICY "Public Read All Media" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('treebank', 'evidence', 'tree-photos', 'project-photos', 'avatars'));

-- 3. Resilient Insert Policy (Allows authenticated planters, field workers, and anon registrations)
DROP POLICY IF EXISTS "Allow Public and Authenticated Tree Uploads" ON storage.objects;
CREATE POLICY "Allow Public and Authenticated Tree Uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id IN ('treebank', 'evidence', 'tree-photos', 'project-photos', 'avatars'));

-- 4. Resilient Update/Upsert Policy
DROP POLICY IF EXISTS "Allow Upload Upsert" ON storage.objects;
CREATE POLICY "Allow Upload Upsert" ON storage.objects
  FOR UPDATE
  USING (bucket_id IN ('treebank', 'evidence', 'tree-photos', 'project-photos', 'avatars'));
