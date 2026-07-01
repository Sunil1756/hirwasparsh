
-- Restrict column-level access to sensitive fields for authenticated users.

-- PROFILES: expose only leaderboard-safe columns
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, trees_planted, green_points, team_id, created_at, updated_at) ON public.profiles TO authenticated;

-- TREES: expose only non-sensitive columns to authenticated users.
-- Withheld: selfie_photo_url, device_fingerprint, photo_hash, qr_token, exif_timestamp, flagged_reason
REVOKE SELECT ON public.trees FROM authenticated;
GRANT SELECT (
  id, user_id, tree_name, species, height_cm, location, latitude, longitude,
  plantation_date, photo_url, before_photo_url, description, drive_id,
  created_at, updated_at, admin_status, verification_status,
  ai_detected_species, ai_scientific_name, ai_confidence, ai_species_confidence,
  ai_validation_score, ai_analysis, points_awarded
) ON public.trees TO authenticated;

-- TREE_ADOPTERS: withhold biometric selfie_photo_url
REVOKE SELECT ON public.tree_adopters FROM authenticated;
GRANT SELECT (id, tree_id, user_id, role, created_at, latitude, longitude, current_photo_url)
  ON public.tree_adopters TO authenticated;

-- Admin/moderator RPC to fetch full tree rows including sensitive columns
CREATE OR REPLACE FUNCTION public.admin_get_trees(_limit int DEFAULT 50, _status text DEFAULT NULL)
RETURNS SETOF public.trees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.trees
    WHERE _status IS NULL OR admin_status = _status
    ORDER BY created_at DESC
    LIMIT _limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_trees(int, text) TO authenticated;

-- Owner RPC to fetch own trees with qr_token (for growth-update QR verification)
CREATE OR REPLACE FUNCTION public.get_my_trees_with_token()
RETURNS TABLE(
  id uuid,
  tree_name text,
  species text,
  plantation_date date,
  admin_status text,
  qr_token text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, tree_name, species, plantation_date, admin_status, qr_token, latitude, longitude, created_at
  FROM public.trees
  WHERE user_id = auth.uid()
    AND admin_status = 'approved'
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_trees_with_token() TO authenticated;
