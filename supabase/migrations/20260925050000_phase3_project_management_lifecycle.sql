-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 3 TASK 12 MIGRATION
-- Project Management Lifecycle, Multi-Plot Boundaries, and State Machine
-- ====================================================================

-- 1. Extend projects table with lifecycle and species fields
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('draft', 'submitted', 'under_review', 'active', 'completed', 'suspended'));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS species_list TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_area_hectares NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Extend project_boundaries with compartment and multi-plot metrics
ALTER TABLE public.project_boundaries
  ADD COLUMN IF NOT EXISTS compartment_code TEXT,
  ADD COLUMN IF NOT EXISTS target_species TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS area_acres NUMERIC;

-- 3. Helper function to check if a user can manage a specific project
CREATE OR REPLACE FUNCTION public.can_manage_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_is_admin BOOLEAN;
  v_is_org_mgr BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Check if user is platform admin
  SELECT (role IN ('admin', 'government')) INTO v_is_admin
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_admin IS TRUE THEN
    RETURN TRUE;
  END IF;

  -- 2. Check if user is creator of the project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_project.created_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- 3. Check if user is owner/admin/manager of the associated organization
  IF v_project.organization_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = v_project.organization_id
        AND user_id = p_user_id
        AND member_role IN ('owner', 'admin', 'manager')
        AND status = 'active'
    ) INTO v_is_org_mgr;

    IF v_is_org_mgr IS TRUE THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- 4. Secure function for transitioning project status with audit trail
CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_project RECORD;
  v_can_manage BOOLEAN;
  v_is_admin BOOLEAN;
  v_actor_email TEXT;
BEGIN
  -- Fetch current project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;

  v_current_status := v_project.status;

  -- Fetch actor info
  SELECT email INTO v_actor_email FROM auth.users WHERE id = p_actor_id;
  SELECT (role IN ('admin', 'government')) INTO v_is_admin FROM public.profiles WHERE id = p_actor_id;
  v_can_manage := public.can_manage_project(p_project_id, p_actor_id);

  IF NOT v_can_manage AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: unauthorized actor');
  END IF;

  -- Validate state machine rules
  -- Allowed transitions:
  -- draft -> submitted, suspended
  -- submitted -> under_review, draft, suspended
  -- under_review -> active, submitted, draft, suspended
  -- active -> completed, suspended, under_review
  -- suspended -> draft, under_review, active
  -- completed -> active (admin only)
  
  IF v_current_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Status unchanged', 'status', p_new_status);
  END IF;

  IF v_current_status = 'completed' AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can reopen a completed project');
  END IF;

  IF p_new_status = 'active' AND v_current_status NOT IN ('under_review', 'suspended', 'completed', 'submitted', 'draft') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status transition');
  END IF;

  -- Perform status update
  UPDATE public.projects
  SET 
    status = p_new_status,
    reviewed_by = CASE WHEN p_new_status IN ('active', 'under_review') THEN p_actor_id ELSE reviewed_by END,
    reviewed_at = CASE WHEN p_new_status IN ('active', 'under_review') THEN now() ELSE reviewed_at END,
    verification_notes = COALESCE(p_reason, verification_notes),
    updated_at = now()
  WHERE id = p_project_id;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    previous_status,
    new_status,
    new_state,
    created_at
  ) VALUES (
    p_actor_id,
    v_actor_email,
    'PROJECT_STATUS_TRANSITION',
    'projects',
    p_project_id,
    v_current_status,
    p_new_status,
    jsonb_build_object('reason', p_reason, 'timestamp', now()),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
END;
$$;

-- 5. Enable updated RLS Policies on project_boundaries
ALTER TABLE public.project_boundaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view project boundaries" ON public.project_boundaries;
CREATE POLICY "Anyone can view project boundaries"
  ON public.project_boundaries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Project managers can insert boundaries" ON public.project_boundaries;
CREATE POLICY "Project managers can insert boundaries"
  ON public.project_boundaries FOR INSERT
  WITH CHECK (
    public.can_manage_project(project_id, auth.uid()) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Project managers can update boundaries" ON public.project_boundaries;
CREATE POLICY "Project managers can update boundaries"
  ON public.project_boundaries FOR UPDATE
  USING (
    public.can_manage_project(project_id, auth.uid()) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Project managers can delete boundaries" ON public.project_boundaries;
CREATE POLICY "Project managers can delete boundaries"
  ON public.project_boundaries FOR DELETE
  USING (
    public.can_manage_project(project_id, auth.uid()) OR public.is_admin()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_species_list ON public.projects USING GIN (species_list);
CREATE INDEX IF NOT EXISTS idx_boundaries_compartment ON public.project_boundaries(compartment_code);
