-- ======================================================================================
-- MIGRATION: 20260921210000_analytics_and_telemetry.sql
-- PURPOSE: Supabase Studio Analytics & Telemetry Schema for Platform Engagement Tracking
-- ======================================================================================

-- Analytics & User Engagement Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('navigation', 'engagement', 'mrv_workflow', 'performance', 'security', 'conversion')),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimize analytics query performance for Supabase Studio dashboard views
CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON public.analytics_events (event_category, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated clients to insert analytics events
CREATE POLICY "Allow public insert to analytics_events" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins and Government monitors can view platform analytics events
CREATE POLICY "Admins can view analytics_events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'government', 'ngo'))
  );

-- --------------------------------------------------------------------------------------
-- STORED PROCEDURES FOR SUPABASE STUDIO DASHBOARDS & FUNNEL ANALYSIS
-- --------------------------------------------------------------------------------------

-- Platform Conversion Funnel RPC for Supabase Studio
CREATE OR REPLACE FUNCTION public.get_platform_funnel_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups BIGINT;
  v_plantings BIGINT;
  v_checkins BIGINT;
  v_adoptions BIGINT;
  v_certificates BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_signups FROM public.profiles;
  SELECT COUNT(*) INTO v_plantings FROM public.trees;
  SELECT COUNT(*) INTO v_checkins FROM public.growth_updates;
  SELECT COUNT(*) INTO v_adoptions FROM public.tree_adoptions;
  SELECT COUNT(*) INTO v_certificates FROM public.carbon_ledger_entries;

  RETURN jsonb_build_object(
    'total_registered_users', v_signups,
    'total_planted_trees', v_plantings,
    'total_growth_checkins', v_checkins,
    'total_adopted_trees', v_adoptions,
    'total_carbon_certificates', v_certificates,
    'planter_to_checkin_conversion_pct', CASE WHEN v_plantings > 0 THEN ROUND(v_checkins * 100.0 / v_plantings, 1) ELSE 0.0 END,
    'adoption_rate_pct', CASE WHEN v_plantings > 0 THEN ROUND(v_adoptions * 100.0 / v_plantings, 1) ELSE 0.0 END,
    'computed_at', now()
  );
END;
$$;
