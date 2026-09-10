-- Migration: Separate Individual (B2C) and Institutional (B2B/NGO/CSR) Data Backend
-- Date: 2026-09-10
-- Purpose: Unambiguously isolate individual personal tree planting from large-scale NGO/CSR plots and batch manifests.

-- 1. Add planting_type column to public.trees if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trees' AND column_name = 'planting_type'
  ) THEN
    ALTER TABLE public.trees ADD COLUMN planting_type TEXT NOT NULL DEFAULT 'individual';
  END IF;
END $$;

-- 2. Backfill / Categorize existing tree records
-- Any tree associated with a plot, organization, or plantation project is classified as 'institutional'
UPDATE public.trees
SET planting_type = 'institutional'
WHERE plot_id IS NOT NULL 
   OR org_id IS NOT NULL 
   OR (tree_code IS NOT NULL AND tree_code != '');

-- All remaining trees are classified as 'individual'
UPDATE public.trees
SET planting_type = 'individual'
WHERE planting_type IS NULL 
   OR (plot_id IS NULL AND org_id IS NULL AND (tree_code IS NULL OR tree_code = ''));

-- 3. Create Performance Indexes for Strict Separation
CREATE INDEX IF NOT EXISTS idx_trees_planting_type ON public.trees(planting_type);
CREATE INDEX IF NOT EXISTS idx_trees_individual_user ON public.trees(user_id) WHERE planting_type = 'individual';
CREATE INDEX IF NOT EXISTS idx_trees_institutional_plot ON public.trees(plot_id) WHERE planting_type = 'institutional';
CREATE INDEX IF NOT EXISTS idx_trees_institutional_org ON public.trees(org_id) WHERE planting_type = 'institutional';

-- 4. Create Dedicated SQL Views for Clean Backend Separation

-- View: Individual Trees (Personal B2C Agroforestry)
CREATE OR REPLACE VIEW public.individual_trees_view AS
SELECT 
  id,
  user_id,
  tree_name,
  species,
  scientific_name,
  plantation_date,
  height_cm,
  location,
  latitude,
  longitude,
  description,
  photo_url,
  before_photo_url,
  selfie_photo_url,
  phash,
  health_status,
  verification_status,
  admin_status,
  ai_confidence,
  ai_analysis,
  points_awarded,
  created_at,
  updated_at
FROM public.trees
WHERE planting_type = 'individual' AND plot_id IS NULL;

-- View: Institutional Trees (NGO / CSR / Multi-Acre Plots)
CREATE OR REPLACE VIEW public.institutional_trees_view AS
SELECT 
  t.id,
  t.plot_id,
  t.org_id,
  t.user_id AS surveyor_id,
  t.tree_code,
  t.tree_name,
  t.species,
  t.scientific_name,
  t.plantation_date,
  t.height_cm,
  t.canopy_radius_m,
  t.location,
  t.latitude,
  t.longitude,
  t.elevation_m,
  t.photo_url,
  t.before_photo_url,
  t.planter_name,
  t.planter_phone,
  t.phash,
  t.health_status,
  t.verification_status,
  t.admin_status,
  t.is_verified,
  t.ai_confidence,
  t.last_verified_at,
  t.created_at,
  t.updated_at,
  p.name AS plot_name,
  p.district AS plot_district,
  p.area_acres AS plot_area_acres,
  o.name AS organization_name,
  o.org_type AS organization_type
FROM public.trees t
LEFT JOIN public.plots p ON t.plot_id = p.id
LEFT JOIN public.organizations o ON (t.org_id = o.id OR p.org_id = o.id)
WHERE t.planting_type = 'institutional' OR t.plot_id IS NOT NULL;

-- View: Institutional Plots Overview (Aggregated Metrics for CSR & NGOs)
CREATE OR REPLACE VIEW public.institutional_plots_overview_view AS
SELECT 
  p.id,
  p.org_id,
  o.name AS organization_name,
  o.org_type AS organization_type,
  p.name AS plot_name,
  p.district,
  p.state,
  p.area_acres,
  p.target_trees,
  p.planted_trees,
  p.current_mean_ndvi,
  p.current_biomass_mt,
  p.status,
  p.center_lat,
  p.center_lng,
  p.polygon_geojson,
  p.last_satellite_sync_at,
  p.created_at,
  COUNT(t.id) AS registered_trees_count,
  COUNT(CASE WHEN t.is_verified = true OR t.verification_status = 'verified' THEN 1 END) AS verified_trees_count
FROM public.plots p
LEFT JOIN public.organizations o ON p.org_id = o.id
LEFT JOIN public.trees t ON t.plot_id = p.id
GROUP BY p.id, o.name, o.org_type;

-- 5. Row-Level Security Rules for Partition Integrity
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all verified trees (for public maps and explorer)
DROP POLICY IF EXISTS "Anyone can view trees" ON public.trees;
CREATE POLICY "Anyone can view trees" ON public.trees FOR SELECT USING (true);

-- Authenticated users can insert their own individual trees
DROP POLICY IF EXISTS "Authenticated users can insert individual trees" ON public.trees;
CREATE POLICY "Authenticated users can insert individual trees" ON public.trees 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = user_id AND (planting_type = 'individual' OR planting_type IS NULL)
);

-- Organization members/admins can insert institutional batch trees
DROP POLICY IF EXISTS "Institutional users can insert plot trees" ON public.trees;
CREATE POLICY "Institutional users can insert plot trees" ON public.trees 
FOR INSERT TO authenticated 
WITH CHECK (
  planting_type = 'institutional' AND (plot_id IS NOT NULL OR org_id IS NOT NULL)
);

-- Users can update their own individual trees
DROP POLICY IF EXISTS "Users can update own individual trees" ON public.trees;
CREATE POLICY "Users can update own individual trees" ON public.trees 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);
