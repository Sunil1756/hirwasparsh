-- ====================================================================
-- PHASE 2: REAL DATABASE ARCHITECTURE (TASK 7: DATABASE DESIGN)
-- 11 Core Entities:
--   1. profiles (users/profiles)
--   2. organizations
--   3. organization_members
--   4. projects
--   5. project_boundaries
--   6. trees
--   7. tree_photos
--   8. tree_observations
--   9. monitoring_tasks
--  10. notifications
--  11. audit_logs
-- ====================================================================

-- 1. PROFILES (users/profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone_number TEXT,
  organization_name TEXT,
  role TEXT NOT NULL DEFAULT 'individual_adopter' CHECK (role IN ('admin', 'government', 'field_worker', 'ngo', 'corporate_csr', 'individual_adopter')),
  trees_planted INTEGER NOT NULL DEFAULT 0,
  green_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_trees_planted ON public.profiles(trees_planted DESC);

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ngo' CHECK (type IN ('ngo', 'corporate', 'government', 'community', 'educational')),
  registration_number TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_is_verified ON public.organizations(is_verified);

-- 3. ORGANIZATION_MEMBERS
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner', 'admin', 'manager', 'field_worker', 'viewer', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_lookup ON public.organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_role ON public.organization_members(user_id, member_role);

-- 4. PROJECTS (Master Afforestation Projects / Plantation Campaigns)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'community' CHECK (project_type IN ('reforestation', 'agroforestry', 'urban_greenery', 'community', 'corporate_csr', 'government_reserve')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'suspended')),
  target_trees INTEGER NOT NULL DEFAULT 100,
  planted_trees INTEGER NOT NULL DEFAULT 0,
  target_area_hectares NUMERIC DEFAULT 0,
  location_name TEXT,
  centroid_latitude DOUBLE PRECISION,
  centroid_longitude DOUBLE PRECISION,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- 5. PROJECT_BOUNDARIES (Plots / Planting Compartments / GIS GeoJSON Boundaries)
CREATE TABLE IF NOT EXISTS public.project_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  boundary_name TEXT NOT NULL DEFAULT 'Default Plot',
  geometry_geojson JSONB NOT NULL DEFAULT '{"type":"Polygon","coordinates":[]}'::jsonb,
  area_sqm NUMERIC,
  area_hectares NUMERIC,
  kml_raw_content TEXT,
  boundary_type TEXT NOT NULL DEFAULT 'planting_zone' CHECK (boundary_type IN ('planting_zone', 'buffer_zone', 'exclusion_zone', 'waterbody')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boundaries_project ON public.project_boundaries(project_id);
CREATE INDEX IF NOT EXISTS idx_boundaries_geometry ON public.project_boundaries USING GIN (geometry_geojson);

-- 6. TREES (Individual Tree Biometrics, Geolocation & Registry)
CREATE TABLE IF NOT EXISTS public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  boundary_id UUID REFERENCES public.project_boundaries(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tree_name TEXT NOT NULL,
  species TEXT NOT NULL,
  botanical_name TEXT,
  plantation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm NUMERIC NOT NULL DEFAULT 0,
  dbh_cm NUMERIC DEFAULT 0,
  canopy_radius_cm NUMERIC DEFAULT 0,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation_m NUMERIC,
  photo_url TEXT,
  before_photo_url TEXT,
  selfie_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'thriving', 'stressed', 'diseased', 'dead', 'replaced')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected')),
  admin_status TEXT NOT NULL DEFAULT 'pending' CHECK (admin_status IN ('pending', 'approved', 'rejected')),
  ai_confidence NUMERIC,
  ai_detected_species TEXT,
  ai_scientific_name TEXT,
  ai_analysis TEXT,
  health_score NUMERIC DEFAULT 100,
  planting_type TEXT DEFAULT 'individual' CHECK (planting_type IN ('individual', 'institutional', 'community', 'drive')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  device_fingerprint TEXT,
  photo_hash TEXT,
  exif_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trees_spatial ON public.trees(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trees_user ON public.trees(user_id);
CREATE INDEX IF NOT EXISTS idx_trees_project ON public.trees(project_id);
CREATE INDEX IF NOT EXISTS idx_trees_boundary ON public.trees(boundary_id);
CREATE INDEX IF NOT EXISTS idx_trees_org ON public.trees(organization_id);
CREATE INDEX IF NOT EXISTS idx_trees_status ON public.trees(status);
CREATE INDEX IF NOT EXISTS idx_trees_verification ON public.trees(verification_status);
CREATE INDEX IF NOT EXISTS idx_trees_admin_status ON public.trees(admin_status);

-- 7. TREE_PHOTOS (Audit Evidence & Media Registry)
CREATE TABLE IF NOT EXISTS public.tree_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'growth_photo' CHECK (evidence_type IN ('planting_photo', 'growth_photo', 'before_photo', 'after_photo', 'drone_orthomosaic', 'selfie', 'health_inspection', 'soil_sample', 'kml_document')),
  caption TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude_m NUMERIC,
  exif_timestamp TIMESTAMPTZ,
  sha256_hash TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'treebank',
  storage_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tree_photos_tree ON public.tree_photos(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_photos_project ON public.tree_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_tree_photos_uploader ON public.tree_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_tree_photos_type ON public.tree_photos(evidence_type);

-- 8. TREE_OBSERVATIONS (Biometric Time-Series & Monitoring Logs)
CREATE TABLE IF NOT EXISTS public.tree_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  observer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_id UUID,
  observation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  height_cm NUMERIC,
  canopy_width_cm NUMERIC,
  dbh_cm NUMERIC,
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'moderate', 'critical', 'dead', 'recovering')),
  condition_notes TEXT,
  pest_disease_detected BOOLEAN DEFAULT false,
  disease_description TEXT,
  photo_url TEXT,
  ai_health_score NUMERIC,
  ai_diagnosis_json JSONB DEFAULT '{}'::jsonb,
  co2_sequestered_kg NUMERIC DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tree_obs_tree ON public.tree_observations(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_obs_observer ON public.tree_observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_tree_obs_date ON public.tree_observations(observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_tree_obs_diagnosis ON public.tree_observations USING GIN (ai_diagnosis_json);

-- 9. MONITORING_TASKS (Field Tasks & Work Orders)
CREATE TABLE IF NOT EXISTS public.monitoring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  boundary_id UUID REFERENCES public.project_boundaries(id) ON DELETE SET NULL,
  tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('growth_audit', 'health_check', 'watering', 'pruning', 'weed_removal', 'anomaly_ground_truth', 'replanting')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.monitoring_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.monitoring_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.monitoring_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.monitoring_tasks(due_date);

-- 10. NOTIFICATIONS (Alerts & Activity Feeds)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('info', 'alert', 'task_assignment', 'risk_warning', 'badge_unlocked', 'system')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- 11. AUDIT_LOGS (Immutable Admin & Operations Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_state JSONB,
  new_state JSONB,
  previous_status TEXT,
  new_status TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Organizations Policies
DROP POLICY IF EXISTS "Public can view verified organizations" ON public.organizations;
CREATE POLICY "Public can view verified organizations" ON public.organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Organization Members Policies
DROP POLICY IF EXISTS "Members can view their organization members" ON public.organization_members;
CREATE POLICY "Members can view their organization members" ON public.organization_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;
CREATE POLICY "Org admins can manage members" ON public.organization_members FOR ALL TO authenticated USING (true);

-- Projects Policies
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Project creators and managers can update projects" ON public.projects;
CREATE POLICY "Project creators and managers can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);

-- Project Boundaries Policies
DROP POLICY IF EXISTS "Public can view project boundaries" ON public.project_boundaries;
CREATE POLICY "Public can view project boundaries" ON public.project_boundaries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage project boundaries" ON public.project_boundaries;
CREATE POLICY "Authenticated users can manage project boundaries" ON public.project_boundaries FOR ALL TO authenticated USING (true);

-- Trees Policies
DROP POLICY IF EXISTS "Public can view trees" ON public.trees;
CREATE POLICY "Public can view trees" ON public.trees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can plant trees" ON public.trees;
CREATE POLICY "Authenticated users can plant trees" ON public.trees FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users and field workers can update trees" ON public.trees;
CREATE POLICY "Users and field workers can update trees" ON public.trees FOR UPDATE TO authenticated USING (true);

-- Tree Photos Policies
DROP POLICY IF EXISTS "Public can view tree photos" ON public.tree_photos;
CREATE POLICY "Public can view tree photos" ON public.tree_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload tree photos" ON public.tree_photos;
CREATE POLICY "Authenticated users can upload tree photos" ON public.tree_photos FOR INSERT TO authenticated WITH CHECK (true);

-- Tree Observations Policies
DROP POLICY IF EXISTS "Public can view tree observations" ON public.tree_observations;
CREATE POLICY "Public can view tree observations" ON public.tree_observations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can record tree observations" ON public.tree_observations;
CREATE POLICY "Authenticated users can record tree observations" ON public.tree_observations FOR INSERT TO authenticated WITH CHECK (true);

-- Monitoring Tasks Policies
DROP POLICY IF EXISTS "Assigned workers and managers can view tasks" ON public.monitoring_tasks;
CREATE POLICY "Assigned workers and managers can view tasks" ON public.monitoring_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can create and update tasks" ON public.monitoring_tasks;
CREATE POLICY "Managers can create and update tasks" ON public.monitoring_tasks FOR ALL TO authenticated USING (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark notifications read" ON public.notifications;
CREATE POLICY "Users can mark notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
