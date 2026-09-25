-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 24
-- Evidence History & Auditable Provenance (The 5 Ws) Migration
-- ====================================================================

-- 1. Create Auditable Evidence Record Table
CREATE TABLE IF NOT EXISTS public.observation_evidence_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES public.tree_observations(id) ON DELETE SET NULL,
  
  -- WHO: Attribution & Verification
  observer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observer_name TEXT NOT NULL DEFAULT 'Field Forester',
  observer_role TEXT NOT NULL DEFAULT 'field_worker',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  verified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by_name TEXT,
  
  -- WHEN: Time Provenance (EXIF + Server)
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  exif_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- WHAT: Biometrics, Health & Status
  event_type TEXT NOT NULL DEFAULT 'field_observation',
  survival_status TEXT NOT NULL DEFAULT 'ALIVE' CHECK (survival_status IN ('ALIVE', 'STRESSED', 'DAMAGED', 'DEAD', 'UNKNOWN', 'NEEDS_REVIEW')),
  health_status TEXT NOT NULL DEFAULT 'healthy',
  height_cm DOUBLE PRECISION,
  dbh_cm DOUBLE PRECISION,
  canopy_width_cm DOUBLE PRECISION,
  height_delta_cm DOUBLE PRECISION,
  dbh_delta_cm DOUBLE PRECISION,
  pest_disease_detected BOOLEAN DEFAULT false,
  disease_description TEXT,
  treatment_applied TEXT,
  notes TEXT,
  
  -- WHERE: Geodetic & Geofence Verification
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  elevation_m DOUBLE PRECISION,
  gps_accuracy_meters DOUBLE PRECISION,
  location_name TEXT,
  distance_from_baseline_meters DOUBLE PRECISION DEFAULT 0.0,
  geofence_status TEXT NOT NULL DEFAULT 'within_bounds' CHECK (geofence_status IN ('within_bounds', 'boundary_warning', 'out_of_bounds')),
  
  -- EVIDENCE: Cryptographic Hashes & Media
  photo_url TEXT,
  secondary_photo_urls TEXT[],
  evidence_type TEXT NOT NULL DEFAULT 'growth_photo',
  sha256_hash TEXT,
  device_fingerprint TEXT,
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected'))
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.observation_evidence_audit ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Allow public read access to evidence audit log" ON public.observation_evidence_audit;
CREATE POLICY "Allow public read access to evidence audit log"
  ON public.observation_evidence_audit FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated and anonymous insert to evidence audit log" ON public.observation_evidence_audit;
CREATE POLICY "Allow authenticated and anonymous insert to evidence audit log"
  ON public.observation_evidence_audit FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to evidence audit log" ON public.observation_evidence_audit;
CREATE POLICY "Allow authenticated update to evidence audit log"
  ON public.observation_evidence_audit FOR UPDATE
  USING (true);

-- 4. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_audit_tree_id ON public.observation_evidence_audit(tree_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_audit_obs_id ON public.observation_evidence_audit(observation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_audit_geofence ON public.observation_evidence_audit(geofence_status);
CREATE INDEX IF NOT EXISTS idx_evidence_audit_sha256 ON public.observation_evidence_audit(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_audit_created_at ON public.observation_evidence_audit(created_at DESC);
