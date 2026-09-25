-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 23
-- Survival Status & Human-in-the-Loop (HITL) Verification Migration
-- ====================================================================

-- 1. Ensure survival_status and verification tracking columns on public.trees
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'survival_status') THEN
    ALTER TABLE public.trees ADD COLUMN survival_status TEXT NOT NULL DEFAULT 'ALIVE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'ai_suggested_status') THEN
    ALTER TABLE public.trees ADD COLUMN ai_suggested_status TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'ai_status_confidence') THEN
    ALTER TABLE public.trees ADD COLUMN ai_status_confidence DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'ai_status_rationale') THEN
    ALTER TABLE public.trees ADD COLUMN ai_status_rationale TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'status_verified_by') THEN
    ALTER TABLE public.trees ADD COLUMN status_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'status_verified_at') THEN
    ALTER TABLE public.trees ADD COLUMN status_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'status_verification_source') THEN
    ALTER TABLE public.trees ADD COLUMN status_verification_source TEXT DEFAULT 'initial_planting';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'status_verification_notes') THEN
    ALTER TABLE public.trees ADD COLUMN status_verification_notes TEXT;
  END IF;
END $$;

-- 2. Check constraints for survival_status and verification_source
ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_survival_status_check;
ALTER TABLE public.trees ADD CONSTRAINT trees_survival_status_check
  CHECK (survival_status IN ('ALIVE', 'STRESSED', 'DAMAGED', 'DEAD', 'UNKNOWN', 'NEEDS_REVIEW'));

ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_verification_source_check;
ALTER TABLE public.trees ADD CONSTRAINT trees_verification_source_check
  CHECK (status_verification_source IS NULL OR status_verification_source IN ('field_observation', 'forester_audit', 'admin_override', 'initial_planting'));

-- 3. Create Tree Status Audit Log Table for Provenance
CREATE TABLE IF NOT EXISTS public.tree_status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_source TEXT NOT NULL,
  ai_confidence DOUBLE PRECISION,
  ai_suggested_status TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on audit log
ALTER TABLE public.tree_status_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to status audit log" ON public.tree_status_audit_log;
CREATE POLICY "Allow public read access to status audit log"
  ON public.tree_status_audit_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert status audit logs" ON public.tree_status_audit_log;
CREATE POLICY "Allow authenticated users to insert status audit logs"
  ON public.tree_status_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 5. Indexes for fast status & project queries
CREATE INDEX IF NOT EXISTS idx_trees_survival_status ON public.trees(survival_status);
CREATE INDEX IF NOT EXISTS idx_trees_project_survival ON public.trees(project_id, survival_status);
CREATE INDEX IF NOT EXISTS idx_tree_status_audit_tree_id ON public.tree_status_audit_log(tree_id, created_at DESC);
