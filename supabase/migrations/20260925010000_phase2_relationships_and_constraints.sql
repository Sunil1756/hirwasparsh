-- ====================================================================
-- PHASE 2: RELATIONSHIPS, CONSTRAINTS, INDEXES & TIMESTAMPS (TASK 8)
-- ====================================================================

-- 1. Automatic Timestamp Updated_At Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all mutable tables
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_org_members_updated_at ON public.organization_members;
CREATE TRIGGER set_org_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_boundaries_updated_at ON public.project_boundaries;
CREATE TRIGGER set_boundaries_updated_at
  BEFORE UPDATE ON public.project_boundaries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_trees_updated_at ON public.trees;
CREATE TRIGGER set_trees_updated_at
  BEFORE UPDATE ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_monitoring_tasks_updated_at ON public.monitoring_tasks;
CREATE TRIGGER set_monitoring_tasks_updated_at
  BEFORE UPDATE ON public.monitoring_tasks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 2. Unique Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_organizations_registration_number'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT uq_organizations_registration_number UNIQUE (registration_number);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tree_photos_sha256'
  ) THEN
    ALTER TABLE public.tree_photos
      ADD CONSTRAINT uq_tree_photos_sha256 UNIQUE (sha256_hash);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 3. High-Performance Compound & Specialized Indices
CREATE INDEX IF NOT EXISTS idx_trees_project_status ON public.trees(project_id, status);
CREATE INDEX IF NOT EXISTS idx_trees_geo_species ON public.trees(latitude, longitude, species);
CREATE INDEX IF NOT EXISTS idx_tree_obs_history ON public.tree_observations(tree_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_workload ON public.monitoring_tasks(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_inbox ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trail ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_boundaries_geojson_gin ON public.project_boundaries USING GIN (geometry_geojson);
CREATE INDEX IF NOT EXISTS idx_tree_obs_diagnosis_gin ON public.tree_observations USING GIN (ai_diagnosis_json);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON public.notifications USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_prev_state_gin ON public.audit_logs USING GIN (previous_state);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_state_gin ON public.audit_logs USING GIN (new_state);
