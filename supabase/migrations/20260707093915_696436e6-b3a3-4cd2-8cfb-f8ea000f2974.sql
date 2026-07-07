
-- 1. growth_updates: restrict to owner + admin/moderator
DROP POLICY IF EXISTS "Owners admins and approved tree viewers can read growth updates" ON public.growth_updates;
CREATE POLICY "Owners and staff can read growth updates"
ON public.growth_updates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. treebank storage: replace blanket authenticated read with folder-owner + staff
DROP POLICY IF EXISTS "Authenticated users can read treebank files" ON storage.objects;
CREATE POLICY "Owners and staff can read treebank files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treebank'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- 3. trees: revoke sensitive column reads from anon/authenticated
REVOKE SELECT (
  selfie_photo_url,
  device_fingerprint,
  photo_hash,
  qr_token,
  exif_timestamp,
  flagged_reason,
  ai_validation_score,
  points_awarded
) ON public.trees FROM anon, authenticated;
