-- ======================================================================================
-- MIGRATION: 20260921200000_optimize_performance_and_backup.sql
-- PURPOSE: Supabase Database Performance Optimization, Automated Indexing,
--          Query Acceleration RPCs, and Automated Data Backup & Recovery Protocols.
-- ======================================================================================

-- 1. HIGH-PERFORMANCE QUERY OPTIMIZATION INDEXES
-- Creates B-Tree and composite indexes on frequently filtered & sorted columns.

-- Index for tree queries by project, plot, user, and verification status
CREATE INDEX IF NOT EXISTS idx_trees_project_status ON public.trees (project_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_trees_plot_health ON public.trees (plot_id, health_status);
CREATE INDEX IF NOT EXISTS idx_trees_user_created ON public.trees (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trees_coords ON public.trees (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trees_admin_verification ON public.trees (admin_status, verification_status);

-- Index for plots queries by organization, district, and status
CREATE INDEX IF NOT EXISTS idx_plots_org_id ON public.plots (org_id, status);
CREATE INDEX IF NOT EXISTS idx_plots_district_state ON public.plots (district, state);
CREATE INDEX IF NOT EXISTS idx_plots_center_coords ON public.plots (center_lat, center_lng);

-- Index for satellite telemetry time-series queries
CREATE INDEX IF NOT EXISTS idx_satellite_telemetry_plot_date ON public.satellite_telemetry (plot_id, acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_telemetry_source_ndvi ON public.satellite_telemetry (satellite_source, mean_ndvi);

-- Index for AI risk alerts by tree, target persona, status, and severity
CREATE INDEX IF NOT EXISTS idx_risk_alerts_tree_status ON public.risk_alerts (tree_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_target_unread ON public.risk_alerts (target_persona, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_project ON public.risk_alerts (project_id, created_at DESC);

-- Index for field reports and scout synchronizations
CREATE INDEX IF NOT EXISTS idx_field_reports_tree_date ON public.field_reports (tree_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_scout_status ON public.field_reports (scout_id, sync_status);

-- Index for carbon ledger and certificate lookups
CREATE INDEX IF NOT EXISTS idx_carbon_ledger_project ON public.carbon_ledger_entries (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_ledger_serial ON public.carbon_ledger_entries (serial_number);

-- Index for profiles and RBAC leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_points ON public.profiles (role, green_points DESC);

-- --------------------------------------------------------------------------------------
-- 2. AUTOMATED DATA BACKUP & DISASTER RECOVERY PROTOCOLS SCHEMA
-- --------------------------------------------------------------------------------------

-- Database Backups Registry Table
CREATE TABLE IF NOT EXISTS public.database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'ngo_project', 'carbon_mrv')),
  project_id UUID REFERENCES public.plantation_projects(id) ON DELETE SET NULL,
  organization_name TEXT,
  total_tables INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  payload_size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  storage_path TEXT,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'verified', 'failed')),
  retention_days INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

-- Admins and Organization Owners can manage backups
CREATE POLICY "Admins can view all backups" ON public.database_backups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo', 'government'))
  );

CREATE POLICY "Admins can create backups" ON public.database_backups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo'))
  );

-- Disaster Recovery & Integrity Verification Log
CREATE TABLE IF NOT EXISTS public.disaster_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL CHECK (check_type IN ('pitr_health_check', 'checksum_audit', 'restoration_dry_run', 'orphan_record_cleanup')),
  target_backup_id UUID REFERENCES public.database_backups(id) ON DELETE SET NULL,
  integrity_score NUMERIC NOT NULL DEFAULT 100.0,
  anomalies_detected INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_recoverable BOOLEAN NOT NULL DEFAULT true,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disaster_recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view recovery logs" ON public.disaster_recovery_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ngo', 'government'))
  );

-- --------------------------------------------------------------------------------------
-- 3. QUERY ACCELERATION RPCS (STORED PROCEDURES)
-- --------------------------------------------------------------------------------------

-- Fast Server-Side Aggregation for NGO Projects
CREATE OR REPLACE FUNCTION public.get_ngo_project_aggregates(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'project_id', p_project_id,
    'total_trees', COUNT(t.id),
    'living_trees', COUNT(t.id) FILTER (WHERE t.health_status IN ('healthy', 'moderate') OR t.verification_status = 'verified'),
    'verified_trees', COUNT(t.id) FILTER (WHERE t.verification_status = 'verified' OR t.admin_status = 'approved'),
    'pending_verification', COUNT(t.id) FILTER (WHERE t.verification_status = 'pending' AND t.admin_status != 'approved'),
    'mean_health_score', ROUND(COALESCE(AVG(t.health_score), 85.0), 1),
    'total_biomass_mt', ROUND(COALESCE(SUM(t.height_cm * 0.0018), 0.0), 2),
    'latest_activity_at', MAX(t.created_at)
  ) INTO v_result
  FROM public.trees t
  WHERE t.project_id = p_project_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Database Health and Data Integrity Verifier
CREATE OR REPLACE FUNCTION public.verify_database_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_trees BIGINT;
  v_total_plots BIGINT;
  v_total_projects BIGINT;
  v_orphan_trees BIGINT;
  v_orphan_reports BIGINT;
  v_corrupted_coords BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_trees FROM public.trees;
  SELECT COUNT(*) INTO v_total_plots FROM public.plots;
  SELECT COUNT(*) INTO v_total_projects FROM public.plantation_projects;

  -- Count trees with invalid coordinates
  SELECT COUNT(*) INTO v_corrupted_coords
  FROM public.trees
  WHERE latitude IS NOT NULL AND (latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180);

  -- Count orphan reports
  SELECT COUNT(*) INTO v_orphan_reports
  FROM public.field_reports r
  LEFT JOIN public.trees t ON r.tree_id = t.id
  WHERE r.tree_id IS NOT NULL AND t.id IS NULL;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_corrupted_coords = 0 AND v_orphan_reports = 0 THEN 'healthy' ELSE 'warning' END,
    'total_trees', v_total_trees,
    'total_plots', v_total_plots,
    'total_projects', v_total_projects,
    'corrupted_coords_count', v_corrupted_coords,
    'orphan_field_reports_count', v_orphan_reports,
    'integrity_score', CASE WHEN v_total_trees > 0 THEN ROUND(100.0 - (v_corrupted_coords + v_orphan_reports) * 100.0 / v_total_trees, 2) ELSE 100.0 END,
    'verified_at', now()
  );
END;
$$;
