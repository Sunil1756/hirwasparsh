-- Migration: Geospatial GPS Coordinate Tracking & Tree Survival Status Engine
-- Extends trees and plots with high-precision GPS fields, polygon boundaries, and survival status

-- 1. Extend trees table with high-precision GPS, elevation, and survival metrics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='gps_accuracy_meters') THEN
    ALTER TABLE public.trees ADD COLUMN gps_accuracy_meters NUMERIC DEFAULT 5.0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='elevation_m') THEN
    ALTER TABLE public.trees ADD COLUMN elevation_m NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='survival_status') THEN
    ALTER TABLE public.trees ADD COLUMN survival_status TEXT NOT NULL DEFAULT 'alive' CHECK (survival_status IN ('alive', 'healthy', 'moderate_growth', 'moisture_stressed', 'critical_risk', 'dead', 'unverified'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='survival_probability_pct') THEN
    ALTER TABLE public.trees ADD COLUMN survival_probability_pct NUMERIC DEFAULT 95.0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='last_satellite_sync_at') THEN
    ALTER TABLE public.trees ADD COLUMN last_satellite_sync_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='current_ndvi') THEN
    ALTER TABLE public.trees ADD COLUMN current_ndvi NUMERIC DEFAULT 0.72;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trees' AND column_name='current_ndwi') THEN
    ALTER TABLE public.trees ADD COLUMN current_ndwi NUMERIC DEFAULT 0.22;
  END IF;
END $$;

-- 2. Extend plots table with center coordinates, boundary geojson, and survival aggregates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='center_latitude') THEN
    ALTER TABLE public.plots ADD COLUMN center_latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='center_longitude') THEN
    ALTER TABLE public.plots ADD COLUMN center_longitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='boundary_geojson') THEN
    ALTER TABLE public.plots ADD COLUMN boundary_geojson JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='verified_survival_rate_pct') THEN
    ALTER TABLE public.plots ADD COLUMN verified_survival_rate_pct NUMERIC DEFAULT 94.0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='last_satellite_sync_at') THEN
    ALTER TABLE public.plots ADD COLUMN last_satellite_sync_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Spatial & Status Indexes
CREATE INDEX IF NOT EXISTS idx_trees_gps_coords ON public.trees(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trees_survival_status ON public.trees(survival_status);
CREATE INDEX IF NOT EXISTS idx_plots_center_coords ON public.plots(center_latitude, center_longitude);

-- 4. Stored Procedure: update_tree_gps_coordinates
CREATE OR REPLACE FUNCTION public.update_tree_gps_coordinates(
  p_tree_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy_meters NUMERIC DEFAULT 5.0,
  p_elevation_m NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_tree RECORD;
BEGIN
  UPDATE public.trees
  SET
    latitude = p_latitude,
    longitude = p_longitude,
    gps_accuracy_meters = p_accuracy_meters,
    elevation_m = COALESCE(p_elevation_m, elevation_m),
    updated_at = now()
  WHERE id = p_tree_id
  RETURNING id, tree_name, latitude, longitude, gps_accuracy_meters, elevation_m INTO v_updated_tree;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tree not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tree_id', v_updated_tree.id,
    'latitude', v_updated_tree.latitude,
    'longitude', v_updated_tree.longitude,
    'accuracy_meters', v_updated_tree.gps_accuracy_meters
  );
END;
$$;

-- 5. Stored Procedure: find_nearby_trees (Haversine formula)
CREATE OR REPLACE FUNCTION public.find_nearby_trees(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
  id UUID,
  tree_name TEXT,
  species TEXT,
  user_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  qr_token TEXT,
  photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.tree_name,
    t.species,
    t.user_id,
    t.latitude,
    t.longitude,
    (
      6371000 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(lat)) * cos(radians(t.latitude)) *
          cos(radians(t.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(t.latitude))
        ))
      )
    ) AS distance_meters,
    t.qr_token,
    t.photo_url
  FROM public.trees t
  WHERE
    t.latitude IS NOT NULL
    AND t.longitude IS NOT NULL
    AND (
      6371000 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(lat)) * cos(radians(t.latitude)) *
          cos(radians(t.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(t.latitude))
        ))
      )
    ) <= radius_meters
  ORDER BY distance_meters ASC
  LIMIT 20;
END;
$$;
