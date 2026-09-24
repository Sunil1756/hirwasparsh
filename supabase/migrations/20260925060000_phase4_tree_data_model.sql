-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 15
-- Tree Data Model Specification & Constraint Hardening
--
-- Core 9 Attributes:
-- 1. id (Tree ID - UUID PK)
-- 2. project_id (Project ID - UUID FK -> projects.id)
-- 3. species (Species Name - TEXT NOT NULL)
-- 4. plantation_date (Plantation Date - DATE NOT NULL)
-- 5. latitude (Latitude - DOUBLE PRECISION NOT NULL [-90, +90])
-- 6. longitude (Longitude - DOUBLE PRECISION NOT NULL [-180, +180])
-- 7. created_by (Created by - UUID FK -> auth.users.id)
-- 8. status (Initial status - TEXT NOT NULL DEFAULT 'alive')
-- 9. created_at (Created timestamp - TIMESTAMPTZ NOT NULL DEFAULT now())
-- ====================================================================

-- 1. Ensure created_by column exists on trees and is synced with user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.trees ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Populate created_by from user_id if missing
UPDATE public.trees SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;

-- 2. Add Coordinate and Field Check Constraints if not already present
DO $$
BEGIN
  -- Latitude Check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_trees_latitude'
  ) THEN
    ALTER TABLE public.trees ADD CONSTRAINT check_trees_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0);
  END IF;

  -- Longitude Check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_trees_longitude'
  ) THEN
    ALTER TABLE public.trees ADD CONSTRAINT check_trees_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0);
  END IF;

  -- Species Non-Empty Check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_trees_species_nonempty'
  ) THEN
    ALTER TABLE public.trees ADD CONSTRAINT check_trees_species_nonempty CHECK (length(trim(species)) > 0);
  END IF;
END $$;

-- 3. Composite and Specialized Indexes for High-Performance Tree Lookups
CREATE INDEX IF NOT EXISTS idx_trees_created_by ON public.trees(created_by);
CREATE INDEX IF NOT EXISTS idx_trees_project_species ON public.trees(project_id, species);
CREATE INDEX IF NOT EXISTS idx_trees_plantation_date ON public.trees(plantation_date DESC);
CREATE INDEX IF NOT EXISTS idx_trees_project_status ON public.trees(project_id, status);

-- 4. Comment on Core Attributes for Schema Documentation
COMMENT ON TABLE public.trees IS 'Core Tree Data Model registry for individual and project afforestation records';
COMMENT ON COLUMN public.trees.id IS '1. Tree ID: Unique UUID primary key';
COMMENT ON COLUMN public.trees.project_id IS '2. Project ID: Nullable UUID referencing parent project';
COMMENT ON COLUMN public.trees.species IS '3. Species: Vernacular or botanical common tree species';
COMMENT ON COLUMN public.trees.plantation_date IS '4. Plantation date: Date when tree was planted in the ground';
COMMENT ON COLUMN public.trees.latitude IS '5. Latitude: WGS84 GPS decimal latitude [-90.0, 90.0]';
COMMENT ON COLUMN public.trees.longitude IS '6. Longitude: WGS84 GPS decimal longitude [-180.0, 180.0]';
COMMENT ON COLUMN public.trees.created_by IS '7. Created by: UUID of the planter or recorder';
COMMENT ON COLUMN public.trees.status IS '8. Initial status: Current health/lifecycle status (default alive)';
COMMENT ON COLUMN public.trees.created_at IS '9. Created timestamp: System creation timestamp in UTC';
