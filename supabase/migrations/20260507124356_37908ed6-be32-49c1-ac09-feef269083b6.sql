
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS qr_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS ai_validation_score numeric;

UPDATE public.trees SET qr_token = gen_random_uuid()::text WHERE qr_token IS NULL;

CREATE OR REPLACE FUNCTION public.set_tree_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tree_qr_token ON public.trees;
CREATE TRIGGER trg_set_tree_qr_token
BEFORE INSERT ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.set_tree_qr_token();

DROP TRIGGER IF EXISTS trg_award_points_on_approval ON public.trees;
CREATE TRIGGER trg_award_points_on_approval
BEFORE UPDATE ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_approval();

DROP TRIGGER IF EXISTS trg_guard_tree_privileged ON public.trees;
CREATE TRIGGER trg_guard_tree_privileged
BEFORE UPDATE ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.guard_tree_privileged_columns();

CREATE TABLE IF NOT EXISTS public.tree_adopters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'adopter' CHECK (role IN ('adopter','guardian')),
  current_photo_url text,
  selfie_photo_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tree_id, user_id)
);

ALTER TABLE public.tree_adopters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read adopters" ON public.tree_adopters;
CREATE POLICY "Anyone authenticated can read adopters"
ON public.tree_adopters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can adopt trees" ON public.tree_adopters;
CREATE POLICY "Users can adopt trees"
ON public.tree_adopters FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their adoption" ON public.tree_adopters;
CREATE POLICY "Users can remove their adoption"
ON public.tree_adopters FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.find_nearby_trees(
  _lat double precision,
  _lng double precision,
  _max_meters double precision DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  tree_name text,
  species text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  qr_token text,
  photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT t.id, t.tree_name, t.species, t.user_id, t.latitude, t.longitude,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians((t.latitude - _lat) / 2)), 2) +
        cos(radians(_lat)) * cos(radians(t.latitude)) *
        power(sin(radians((t.longitude - _lng) / 2)), 2)
      )))::double precision AS distance_meters,
      t.qr_token,
      t.photo_url
    FROM public.trees t
    WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      AND t.admin_status != 'rejected'
  ) sub
  WHERE distance_meters <= _max_meters
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_trees(double precision, double precision, double precision) TO authenticated;
