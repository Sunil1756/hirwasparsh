-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 21
-- Observation Model & Living Monitoring History Migration
-- ====================================================================

-- 1. Enhance and ensure complete columns for public.tree_observations
DO $$
BEGIN
  -- Add observer metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'observer_name') THEN
    ALTER TABLE public.tree_observations ADD COLUMN observer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'observer_role') THEN
    ALTER TABLE public.tree_observations ADD COLUMN observer_role TEXT;
  END IF;

  -- Add location & GPS accuracy attributes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'elevation_m') THEN
    ALTER TABLE public.tree_observations ADD COLUMN elevation_m NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'gps_accuracy_meters') THEN
    ALTER TABLE public.tree_observations ADD COLUMN gps_accuracy_meters NUMERIC;
  END IF;

  -- Add extended biometric condition attributes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'foliage_density_pct') THEN
    ALTER TABLE public.tree_observations ADD COLUMN foliage_density_pct NUMERIC CHECK (foliage_density_pct BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'pest_types') THEN
    ALTER TABLE public.tree_observations ADD COLUMN pest_types TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'treatment_applied') THEN
    ALTER TABLE public.tree_observations ADD COLUMN treatment_applied TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'care_recommendations') THEN
    ALTER TABLE public.tree_observations ADD COLUMN care_recommendations TEXT;
  END IF;

  -- Add evidence attributes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'sha256_hash') THEN
    ALTER TABLE public.tree_observations ADD COLUMN sha256_hash TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'evidence_type') THEN
    ALTER TABLE public.tree_observations ADD COLUMN evidence_type TEXT DEFAULT 'growth_photo';
  END IF;

  -- Add status and verification attributes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'verification_status') THEN
    ALTER TABLE public.tree_observations ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'verified_by') THEN
    ALTER TABLE public.tree_observations ADD COLUMN verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'verified_at') THEN
    ALTER TABLE public.tree_observations ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'verification_notes') THEN
    ALTER TABLE public.tree_observations ADD COLUMN verification_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tree_observations' AND column_name = 'updated_at') THEN
    ALTER TABLE public.tree_observations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- 2. Update health_status check constraint to support full taxonomy
ALTER TABLE public.tree_observations DROP CONSTRAINT IF EXISTS tree_observations_health_status_check;
ALTER TABLE public.tree_observations ADD CONSTRAINT tree_observations_health_status_check
  CHECK (health_status IN ('healthy', 'moderate', 'critical', 'dead', 'recovering', 'thriving', 'stressed', 'diseased', 'replaced'));

-- 3. Add verification_status check constraint
ALTER TABLE public.tree_observations DROP CONSTRAINT IF EXISTS tree_observations_verification_status_check;
ALTER TABLE public.tree_observations ADD CONSTRAINT tree_observations_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected'));

-- 4. Create composite high-performance indexes
CREATE INDEX IF NOT EXISTS idx_tree_obs_tree_date ON public.tree_observations(tree_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_tree_obs_health_status ON public.tree_observations(health_status);
CREATE INDEX IF NOT EXISTS idx_tree_obs_verification ON public.tree_observations(verification_status);
CREATE INDEX IF NOT EXISTS idx_tree_obs_spatial ON public.tree_observations(latitude, longitude);

-- 5. Trigger to automatically update parent tree height, health status, and biometrics on new observation
CREATE OR REPLACE FUNCTION public.sync_tree_on_observation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trees
  SET
    status = CASE
      WHEN NEW.health_status IN ('thriving', 'alive', 'healthy') THEN 'thriving'
      WHEN NEW.health_status = 'stressed' THEN 'stressed'
      WHEN NEW.health_status = 'diseased' THEN 'diseased'
      WHEN NEW.health_status = 'dead' THEN 'dead'
      WHEN NEW.health_status = 'replaced' THEN 'replaced'
      ELSE status
    END,
    height_cm = COALESCE(NEW.height_cm, height_cm),
    dbh_cm = COALESCE(NEW.dbh_cm, dbh_cm),
    canopy_radius_cm = COALESCE(NEW.canopy_width_cm / 2, canopy_radius_cm),
    health_score = COALESCE(NEW.ai_health_score, health_score),
    updated_at = now()
  WHERE id = NEW.tree_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tree_on_observation ON public.tree_observations;
CREATE TRIGGER trg_sync_tree_on_observation
AFTER INSERT OR UPDATE ON public.tree_observations
FOR EACH ROW
EXECUTE FUNCTION public.sync_tree_on_observation();
