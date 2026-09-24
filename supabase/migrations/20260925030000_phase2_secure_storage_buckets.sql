-- ====================================================================
-- PHASE 2: SECURE CLOUD STORAGE BUCKETS & RLS POLICIES (TASK 10)
-- 4 Core Storage Asset Categories:
--   1. avatars (Profile pictures)
--   2. treebank (Tree photos)
--   3. evidence (Audit photos, growth selfies, drone orthomosaics)
--   4. project-documents (KML/KMZ spatial files, DPRs, MOUs)
-- ====================================================================

-- 1. Initialize Storage Buckets in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('treebank', 'treebank', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('evidence', 'evidence', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  ('project-documents', 'project-documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.google-earth.kml+xml', 'application/vnd.google-earth.kmz', 'application/geo+json', 'application/json', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Row Level Security Policies (storage.objects)

-- AVATARS (Public Read, Owner/Admin Write)
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars user upload" ON storage.objects;
CREATE POLICY "Avatars user upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Avatars user update" ON storage.objects;
CREATE POLICY "Avatars user update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Avatars user delete" ON storage.objects;
CREATE POLICY "Avatars user delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );

-- TREEBANK (Public Read, Authenticated Write)
DROP POLICY IF EXISTS "Treebank public read" ON storage.objects;
CREATE POLICY "Treebank public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'treebank');

DROP POLICY IF EXISTS "Treebank upload" ON storage.objects;
CREATE POLICY "Treebank upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'treebank');

DROP POLICY IF EXISTS "Treebank update delete" ON storage.objects;
CREATE POLICY "Treebank update delete" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'treebank');

-- EVIDENCE (Private/Restricted, Signed URLs & Project Access)
DROP POLICY IF EXISTS "Evidence read policy" ON storage.objects;
CREATE POLICY "Evidence read policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Evidence upload policy" ON storage.objects;
CREATE POLICY "Evidence upload policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Evidence modify policy" ON storage.objects;
CREATE POLICY "Evidence modify policy" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'evidence');

-- PROJECT DOCUMENTS (Private/Restricted, Project/Org Member Access)
DROP POLICY IF EXISTS "Project documents read policy" ON storage.objects;
CREATE POLICY "Project documents read policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Project documents upload policy" ON storage.objects;
CREATE POLICY "Project documents upload policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Project documents modify policy" ON storage.objects;
CREATE POLICY "Project documents modify policy" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'project-documents');
