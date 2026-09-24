-- ====================================================================
-- PHASE 4: PHOTO EVIDENCE SYSTEM ENHANCEMENTS (TASK 17)
-- Extended audit columns for public.tree_photos
-- ====================================================================

ALTER TABLE public.tree_photos
  ADD COLUMN IF NOT EXISTS phash TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/jpeg',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_score NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tree_photos_phash ON public.tree_photos(phash);
CREATE INDEX IF NOT EXISTS idx_tree_photos_sha256 ON public.tree_photos(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_tree_photos_created ON public.tree_photos(created_at DESC);
