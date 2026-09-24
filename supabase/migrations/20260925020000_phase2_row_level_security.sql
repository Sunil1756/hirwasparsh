-- ====================================================================
-- PHASE 2: ROW LEVEL SECURITY & SERVER-SIDE ACCESS CONTROL (TASK 9)
-- ====================================================================

-- 1. Security Helper Functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_user_id IS NULL OR check_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = check_org_id
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(check_org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_user_id IS NULL OR check_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = check_org_id
      AND user_id = check_user_id
      AND member_role IN ('owner', 'admin', 'manager')
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_accessible(check_proj_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj RECORD;
BEGIN
  IF check_proj_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT organization_id, created_by, status INTO v_proj
  FROM public.projects
  WHERE id = check_proj_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admin always has access
  IF public.is_admin(check_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Public active projects
  IF v_proj.status = 'active' THEN
    RETURN TRUE;
  END IF;

  -- Project creator
  IF check_user_id IS NOT NULL AND v_proj.created_by = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- Member of owning organization
  IF v_proj.organization_id IS NOT NULL AND public.is_org_member(v_proj.organization_id, check_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Precision RLS Policies for 11 Core Entities

-- PROFILES
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles user self update" ON public.profiles;
CREATE POLICY "Profiles user self update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles insert self" ON public.profiles;
CREATE POLICY "Profiles insert self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Organizations read policy" ON public.organizations;
CREATE POLICY "Organizations read policy" ON public.organizations
  FOR SELECT USING (
    is_verified = true
    OR public.is_org_member(id)
    OR created_by = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Organizations insert policy" ON public.organizations;
CREATE POLICY "Organizations insert policy" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Organizations update policy" ON public.organizations;
CREATE POLICY "Organizations update policy" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id) OR public.is_admin());

DROP POLICY IF EXISTS "Organizations delete policy" ON public.organizations;
CREATE POLICY "Organizations delete policy" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_admin() OR (created_by = auth.uid() AND public.is_org_admin(id)));

-- ORGANIZATION MEMBERS
DROP POLICY IF EXISTS "Org members read policy" ON public.organization_members;
CREATE POLICY "Org members read policy" ON public.organization_members
  FOR SELECT USING (
    public.is_org_member(organization_id)
    OR user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Org members insert policy" ON public.organization_members;
CREATE POLICY "Org members insert policy" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id) OR public.is_admin());

DROP POLICY IF EXISTS "Org members update policy" ON public.organization_members;
CREATE POLICY "Org members update policy" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR public.is_admin());

DROP POLICY IF EXISTS "Org members delete policy" ON public.organization_members;
CREATE POLICY "Org members delete policy" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id) OR user_id = auth.uid() OR public.is_admin());

-- PROJECTS
DROP POLICY IF EXISTS "Projects read policy" ON public.projects;
CREATE POLICY "Projects read policy" ON public.projects
  FOR SELECT USING (
    status = 'active'
    OR created_by = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
CREATE POLICY "Projects insert policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (organization_id IS NULL OR public.is_org_admin(organization_id) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
CREATE POLICY "Projects update policy" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy" ON public.projects
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    OR public.is_admin()
  );

-- PROJECT BOUNDARIES
DROP POLICY IF EXISTS "Boundaries read policy" ON public.project_boundaries;
CREATE POLICY "Boundaries read policy" ON public.project_boundaries
  FOR SELECT USING (public.is_project_accessible(project_id));

DROP POLICY IF EXISTS "Boundaries write policy" ON public.project_boundaries;
CREATE POLICY "Boundaries write policy" ON public.project_boundaries
  FOR ALL TO authenticated
  USING (public.is_project_accessible(project_id));

-- TREES
DROP POLICY IF EXISTS "Trees read policy" ON public.trees;
CREATE POLICY "Trees read policy" ON public.trees
  FOR SELECT USING (
    admin_status = 'approved'
    OR user_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Trees insert policy" ON public.trees;
CREATE POLICY "Trees insert policy" ON public.trees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Trees update policy" ON public.trees;
CREATE POLICY "Trees update policy" ON public.trees
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_accessible(project_id))
    OR public.is_admin()
  );

-- TREE PHOTOS
DROP POLICY IF EXISTS "Tree photos read policy" ON public.tree_photos;
CREATE POLICY "Tree photos read policy" ON public.tree_photos
  FOR SELECT USING (
    evidence_type != 'selfie'
    OR uploader_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Tree photos insert policy" ON public.tree_photos;
CREATE POLICY "Tree photos insert policy" ON public.tree_photos
  FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid() OR public.is_admin());

-- TREE OBSERVATIONS
DROP POLICY IF EXISTS "Tree observations read policy" ON public.tree_observations;
CREATE POLICY "Tree observations read policy" ON public.tree_observations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tree observations insert policy" ON public.tree_observations;
CREATE POLICY "Tree observations insert policy" ON public.tree_observations
  FOR INSERT TO authenticated
  WITH CHECK (observer_id = auth.uid() OR public.is_admin());

-- MONITORING TASKS
DROP POLICY IF EXISTS "Tasks read policy" ON public.monitoring_tasks;
CREATE POLICY "Tasks read policy" ON public.monitoring_tasks
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_project_accessible(project_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Tasks write policy" ON public.monitoring_tasks;
CREATE POLICY "Tasks write policy" ON public.monitoring_tasks
  FOR ALL TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_project_accessible(project_id)
    OR public.is_admin()
  );

-- NOTIFICATIONS (Strict Isolation)
DROP POLICY IF EXISTS "Notifications isolate to user" ON public.notifications;
CREATE POLICY "Notifications isolate to user" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- AUDIT LOGS (Admin Read-Only, Immutable)
DROP POLICY IF EXISTS "Audit logs admin view" ON public.audit_logs;
CREATE POLICY "Audit logs admin view" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Explicitly disallow update and delete on audit logs
DROP POLICY IF EXISTS "Audit logs no update" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs no delete" ON public.audit_logs;
