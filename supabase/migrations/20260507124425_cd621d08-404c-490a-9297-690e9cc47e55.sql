
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
SECURITY INVOKER
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
