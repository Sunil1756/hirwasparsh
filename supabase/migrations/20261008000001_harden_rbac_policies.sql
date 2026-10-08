-- ====================================================================
-- HIRWA SPARSH — PHASE 1 STEP 3: FULL RLS + RBAC SECURITY HARDENING
-- Eradicates USING(true) bypasses, strictly enforces organization bounds,
-- and limits writes on evidence, observations, and telemetry.
-- ====================================================================

-- 1. Public Data Distinction
-- Adding a definitive flag for public exhibition to avoid inferring from 'status'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='is_public') THEN
        ALTER TABLE public.projects ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update previously active projects to be public (based on legacy behavior expectation for TreeMap)
UPDATE public.projects SET is_public = true WHERE status = 'active';

-- 2. Hardened Projects Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects read policy" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
CREATE POLICY "Projects read policy" ON public.projects
  FOR SELECT USING (
    is_public = true
    OR public.is_project_accessible(id)
  );

DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Projects insert policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (organization_id IS NULL OR public.is_org_admin(organization_id) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
DROP POLICY IF EXISTS "Project creators and managers can update projects" ON public.projects;
CREATE POLICY "Projects update policy" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id)) OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id)) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy" ON public.projects
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id)) OR public.is_admin()
  );

-- 3. Hardened Project Boundaries Policies
ALTER TABLE public.project_boundaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Boundaries read policy" ON public.project_boundaries;
CREATE POLICY "Boundaries read policy" ON public.project_boundaries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_boundaries.project_id AND p.is_public = true)
    OR public.is_project_accessible(project_id)
  );

DROP POLICY IF EXISTS "Boundaries write policy" ON public.project_boundaries;
CREATE POLICY "Boundaries insert policy" ON public.project_boundaries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accessible(project_id));

CREATE POLICY "Boundaries update policy" ON public.project_boundaries
  FOR UPDATE TO authenticated
  USING (public.is_project_accessible(project_id))
  WITH CHECK (public.is_project_accessible(project_id));

CREATE POLICY "Boundaries delete policy" ON public.project_boundaries
  FOR DELETE TO authenticated
  USING (public.is_project_accessible(project_id));

-- 4. Hardened Trees Policies
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trees read policy" ON public.trees;
DROP POLICY IF EXISTS "Anyone can view trees" ON public.trees;
CREATE POLICY "Trees read policy" ON public.trees
  FOR SELECT USING (
    (admin_status = 'approved' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = trees.project_id AND p.is_public = true))
    OR user_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Trees insert policy" ON public.trees;
DROP POLICY IF EXISTS "Authenticated users can insert trees" ON public.trees;
CREATE POLICY "Trees insert policy" ON public.trees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (project_id IS NOT NULL AND public.is_project_accessible(project_id))
      OR (project_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Trees update policy" ON public.trees;
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
CREATE POLICY "Trees update policy" ON public.trees
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_accessible(project_id)) OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_accessible(project_id)) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Trees delete policy" ON public.trees;
CREATE POLICY "Trees delete policy" ON public.trees
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR (project_id IS NOT NULL AND public.is_project_accessible(project_id)) OR public.is_admin()
  );

-- 5. Hardened Observations Policies
ALTER TABLE public.tree_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tree observations read policy" ON public.tree_observations;
CREATE POLICY "Tree observations read policy" ON public.tree_observations
  FOR SELECT TO authenticated
  USING (
    observer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_observations.tree_id AND public.is_project_accessible(t.project_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Tree observations insert policy" ON public.tree_observations;
CREATE POLICY "Tree observations insert policy" ON public.tree_observations
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_observations.tree_id AND public.is_project_accessible(t.project_id))
  );

DROP POLICY IF EXISTS "Tree observations update policy" ON public.tree_observations;
CREATE POLICY "Tree observations update policy" ON public.tree_observations
  FOR UPDATE TO authenticated
  USING (
    observer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_observations.tree_id AND public.is_project_accessible(t.project_id))
  )
  WITH CHECK (
    observer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_observations.tree_id AND public.is_project_accessible(t.project_id))
  );

DROP POLICY IF EXISTS "Tree observations delete policy" ON public.tree_observations;
CREATE POLICY "Tree observations delete policy" ON public.tree_observations
  FOR DELETE TO authenticated
  USING (
    observer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_observations.tree_id AND public.is_project_accessible(t.project_id))
  );

-- 6. Hardened Evidence Policies (formerly tree_photos)
ALTER TABLE public.tree_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tree photos read policy" ON public.tree_evidence;
DROP POLICY IF EXISTS "Tree photos insert policy" ON public.tree_evidence;
DROP POLICY IF EXISTS "Tree evidence read policy" ON public.tree_evidence;
DROP POLICY IF EXISTS "Tree evidence insert policy" ON public.tree_evidence;

CREATE POLICY "Tree evidence read policy" ON public.tree_evidence
  FOR SELECT TO authenticated
  USING (
    uploader_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR (tree_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_evidence.tree_id AND public.is_project_accessible(t.project_id)))
    OR public.is_admin()
  );

CREATE POLICY "Tree evidence insert policy" ON public.tree_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND (
      (project_id IS NOT NULL AND public.is_project_accessible(project_id))
      OR (tree_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_evidence.tree_id AND public.is_project_accessible(t.project_id)))
    )
  );

CREATE POLICY "Tree evidence update policy" ON public.tree_evidence
  FOR UPDATE TO authenticated
  USING (
    uploader_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR (tree_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_evidence.tree_id AND public.is_project_accessible(t.project_id)))
  )
  WITH CHECK (
    uploader_id = auth.uid()
    AND (
      (project_id IS NOT NULL AND public.is_project_accessible(project_id))
      OR (tree_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_evidence.tree_id AND public.is_project_accessible(t.project_id)))
    )
  );

CREATE POLICY "Tree evidence delete policy" ON public.tree_evidence
  FOR DELETE TO authenticated
  USING (
    uploader_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR (tree_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_evidence.tree_id AND public.is_project_accessible(t.project_id)))
  );

-- 7. Hardened Satellite Data
-- Only trusted backend should insert satellite telemetry. Users read what they own.
ALTER TABLE public.satellite_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Satellite data read" ON public.satellite_telemetry;
CREATE POLICY "Satellite data read" ON public.satellite_telemetry
  FOR SELECT TO authenticated
  USING (
    (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR public.is_admin()
  );
-- (No insert/update policies for authenticated users; service role bypasses RLS).

-- 8. Hardened Verifications
-- Disallow public client from generating trusted verification scores.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'confidence_scores') THEN
        EXECUTE 'ALTER TABLE public.confidence_scores ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "Confidence scores read" ON public.confidence_scores;';
        EXECUTE 'CREATE POLICY "Confidence scores read" ON public.confidence_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.trees t WHERE t.id = confidence_scores.tree_id AND public.is_project_accessible(t.project_id)) OR public.is_admin());';
    END IF;
END $$;

-- 9. Legacy Lockdown
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_plantation_projects') THEN
        EXECUTE 'ALTER TABLE public.legacy_plantation_projects ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "Owners manage their projects" ON public.legacy_plantation_projects;';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can view all projects" ON public.legacy_plantation_projects;';
        EXECUTE 'DROP POLICY IF EXISTS "Legacy plantation read" ON public.legacy_plantation_projects;';
        EXECUTE 'CREATE POLICY "Legacy plantation read" ON public.legacy_plantation_projects FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());';
    END IF;
END $$;
