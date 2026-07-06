
-- tree_adopters: owner + admin/mod only
DROP POLICY IF EXISTS "Anyone authenticated can read adopters" ON public.tree_adopters;
CREATE POLICY "Owners and admins can read adopters"
  ON public.tree_adopters
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- growth_updates: owner + admin/mod + viewers of approved trees
DROP POLICY IF EXISTS "Authenticated users can read growth updates" ON public.growth_updates;
CREATE POLICY "Owners admins and approved tree viewers can read growth updates"
  ON public.growth_updates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id = growth_updates.tree_id
        AND t.admin_status = 'approved'
    )
  );

-- Belt & braces: re-revoke sensitive columns from public roles at the column level.
REVOKE SELECT (selfie_photo_url, device_fingerprint, photo_hash, qr_token, exif_timestamp, flagged_reason)
  ON public.trees FROM anon, authenticated;

REVOKE SELECT (selfie_photo_url) ON public.tree_adopters FROM anon, authenticated;
