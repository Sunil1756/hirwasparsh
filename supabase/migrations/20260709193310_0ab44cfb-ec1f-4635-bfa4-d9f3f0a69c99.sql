
ALTER TABLE public.growth_updates ADD COLUMN IF NOT EXISTS photo_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_growth_updates_photo_hash ON public.growth_updates(photo_hash);
