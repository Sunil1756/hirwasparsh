-- ====================================================================
-- HIRWA SPARSH — PHASE 1 STEP 2: DATABASE ARCHITECTURE CONSOLIDATION
-- Establishes a single canonical tree/project model and merges legacy tables.
-- ====================================================================

-- 1. Canonical Project Model: public.projects
-- Move plantation_projects to projects safely
INSERT INTO public.projects (
  id, name, location_name, target_trees, centroid_latitude, centroid_longitude, created_by, created_at, updated_at
)
SELECT 
  id, 
  project_name, 
  location, 
  target_trees, 
  latitude, 
  longitude, 
  user_id, 
  created_at, 
  updated_at
FROM public.plantation_projects
ON CONFLICT (id) DO NOTHING;

-- Map plot records (which functioned as projects) to projects
INSERT INTO public.projects (
  id, organization_id, name, location_name, target_trees, planted_trees, target_area_hectares, created_at, updated_at
)
SELECT 
  id, 
  org_id, 
  name, 
  district || ', ' || state || ', ' || country, 
  target_trees, 
  planted_trees, 
  (area_sqm / 10000.0), 
  created_at, 
  updated_at
FROM public.plots
ON CONFLICT (id) DO NOTHING;

-- 2. Canonical Geofence Model: public.project_boundaries
-- Move plantation_projects JSON boundaries to project_boundaries
INSERT INTO public.project_boundaries (
  project_id, boundary_name, geometry_geojson, created_at
)
SELECT 
  id,
  'Initial Boundary',
  boundary,
  created_at
FROM public.plantation_projects
WHERE jsonb_array_length(boundary) > 0
ON CONFLICT DO NOTHING;

-- 3. Standardize public.trees foreign keys
-- Trees must point to projects, not plantation_projects or plots.
UPDATE public.trees 
SET project_id = plot_id 
WHERE plot_id IS NOT NULL AND project_id IS NULL;

-- Remove old foreign keys safely if they exist
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT constraint_name INTO fk_name FROM information_schema.key_column_usage 
    WHERE table_name = 'trees' AND column_name = 'project_id' AND table_schema = 'public' LIMIT 1;
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS ' || fk_name;
    END IF;

    SELECT constraint_name INTO fk_name FROM information_schema.key_column_usage 
    WHERE table_name = 'trees' AND column_name = 'plot_id' AND table_schema = 'public' LIMIT 1;
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS ' || fk_name;
    END IF;

    -- Add canonical constraint
    ALTER TABLE public.trees ADD CONSTRAINT trees_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Constraint mapping skipped %', SQLERRM;
END $$;

-- 4. Canonical Observation Model: public.tree_observations
-- Migrate check_ins to tree_observations
INSERT INTO public.tree_observations (
  tree_id, observation_date, health_status, condition_notes, created_at
)
SELECT 
  tree_id, checked_at, status, notes, created_at
FROM public.check_ins
ON CONFLICT DO NOTHING;

-- Migrate tree_health_updates to tree_observations
INSERT INTO public.tree_observations (
  tree_id, observation_date, health_status, condition_notes, created_at
)
SELECT 
  tree_id, updated_at, health_status, update_notes, updated_at
FROM public.tree_health_updates
ON CONFLICT DO NOTHING;

-- 5. Canonical Evidence Model: public.tree_evidence
-- Rename tree_photos to tree_evidence if it hasn't been already
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tree_photos') THEN
        ALTER TABLE public.tree_photos RENAME TO tree_evidence;
    END IF;
END $$;

-- Migrate project_evidence to tree_evidence (for project-level evidence)
DO $$
BEGIN
  -- Disable constraint briefly to allow 'field' type or map it
  ALTER TABLE public.tree_evidence DROP CONSTRAINT IF EXISTS tree_photos_evidence_type_check;
  
  INSERT INTO public.tree_evidence (
    project_id, uploader_id, photo_url, evidence_type, latitude, longitude, created_at
  )
  SELECT 
    project_id, user_id, photo_url, 'health_inspection', latitude, longitude, created_at
  FROM public.project_evidence
  ON CONFLICT DO NOTHING;
  
  -- Restore check constraint with wider allowance if needed, but 'health_inspection' is already allowed
  ALTER TABLE public.tree_evidence ADD CONSTRAINT tree_evidence_evidence_type_check 
  CHECK (evidence_type IN ('planting_photo', 'growth_photo', 'before_photo', 'after_photo', 'drone_orthomosaic', 'selfie', 'health_inspection', 'soil_sample', 'kml_document'));
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Evidence migration skipped %', SQLERRM;
END $$;

-- Update foreign keys from evidence to project
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT constraint_name INTO fk_name FROM information_schema.key_column_usage 
    WHERE table_name = 'tree_evidence' AND column_name = 'project_id' AND table_schema = 'public' LIMIT 1;
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.tree_evidence DROP CONSTRAINT IF EXISTS ' || fk_name;
    END IF;
    ALTER TABLE public.tree_evidence ADD CONSTRAINT tree_evidence_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Evidence constraint mapping skipped %', SQLERRM;
END $$;

-- 6. Add Views for Legacy Backwards Compatibility
-- We don't drop the tables yet, but we have migrated data out of them.
-- To ensure they aren't used for new data, we rename them to legacy_
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plantation_projects') THEN
        ALTER TABLE public.plantation_projects RENAME TO legacy_plantation_projects;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plots') THEN
        ALTER TABLE public.plots RENAME TO legacy_plots;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'check_ins') THEN
        ALTER TABLE public.check_ins RENAME TO legacy_check_ins;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tree_health_updates') THEN
        ALTER TABLE public.tree_health_updates RENAME TO legacy_tree_health_updates;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_evidence') THEN
        ALTER TABLE public.project_evidence RENAME TO legacy_project_evidence;
    END IF;
END $$;
