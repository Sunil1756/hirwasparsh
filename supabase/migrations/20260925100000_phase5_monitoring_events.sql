-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 22
-- Monitoring Events, Schedules & Overdue Tracking Migration
-- ====================================================================

-- 1. Ensure next_monitoring_date and monitoring_status columns on public.trees
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'next_monitoring_date') THEN
    ALTER TABLE public.trees ADD COLUMN next_monitoring_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'last_monitored_at') THEN
    ALTER TABLE public.trees ADD COLUMN last_monitored_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'monitoring_status') THEN
    ALTER TABLE public.trees ADD COLUMN monitoring_status TEXT NOT NULL DEFAULT 'up_to_date';
  END IF;
END $$;

-- 2. Check constraint for monitoring_status
ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_monitoring_status_check;
ALTER TABLE public.trees ADD CONSTRAINT trees_monitoring_status_check
  CHECK (monitoring_status IN ('up_to_date', 'due_soon', 'overdue', 'critical_overdue'));

-- 3. Composite indexes for fast overdue & scheduling lookups
CREATE INDEX IF NOT EXISTS idx_trees_next_monitoring ON public.trees(next_monitoring_date);
CREATE INDEX IF NOT EXISTS idx_trees_monitoring_status ON public.trees(monitoring_status);
CREATE INDEX IF NOT EXISTS idx_trees_project_monitoring ON public.trees(project_id, next_monitoring_date);

-- 4. Function to calculate next monitoring date based on tree age & health
CREATE OR REPLACE FUNCTION public.calculate_next_monitoring_date(
  p_plantation_date DATE,
  p_health_status TEXT,
  p_last_monitored_at TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_base_time TIMESTAMPTZ;
  v_age_months INT;
  v_interval_days INT;
BEGIN
  v_base_time := COALESCE(p_last_monitored_at, now());
  v_age_months := GREATEST(0, ROUND((EXTRACT(EPOCH FROM (now() - p_plantation_date::timestamptz)) / 2629746)::numeric));

  -- Accelerated monitoring for diseased / stressed trees
  IF p_health_status IN ('diseased', 'critical', 'dead') THEN
    v_interval_days := 7;
  ELSIF p_health_status IN ('stressed', 'moderate', 'needs water') THEN
    v_interval_days := 14;
  -- Age-based routine intervals for healthy / thriving trees
  ELSIF v_age_months < 6 THEN
    v_interval_days := 30; -- Sapling phase: monthly check-ins
  ELSIF v_age_months < 24 THEN
    v_interval_days := 60; -- Young tree phase: bi-monthly check-ins
  ELSE
    v_interval_days := 120; -- Established tree phase: tri-annual check-ins
  END IF;

  RETURN v_base_time + (v_interval_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Updated trigger to recalculate next_monitoring_date and update parent tree
CREATE OR REPLACE FUNCTION public.sync_tree_on_observation()
RETURNS TRIGGER AS $$
DECLARE
  v_plantation_date DATE;
  v_next_date TIMESTAMPTZ;
BEGIN
  -- Get tree plantation date
  SELECT plantation_date INTO v_plantation_date FROM public.trees WHERE id = NEW.tree_id;

  -- Calculate next monitoring date
  v_next_date := public.calculate_next_monitoring_date(
    COALESCE(v_plantation_date, CURRENT_DATE),
    NEW.health_status,
    NEW.observation_date
  );

  UPDATE public.trees
  SET
    status = CASE
      WHEN NEW.health_status IN ('thriving', 'alive', 'healthy') THEN 'thriving'
      WHEN NEW.health_status IN ('stressed', 'moderate') THEN 'stressed'
      WHEN NEW.health_status IN ('diseased', 'critical') THEN 'diseased'
      WHEN NEW.health_status = 'dead' THEN 'dead'
      WHEN NEW.health_status = 'replaced' THEN 'replaced'
      ELSE status
    END,
    height_cm = COALESCE(NEW.height_cm, height_cm),
    dbh_cm = COALESCE(NEW.dbh_cm, dbh_cm),
    canopy_radius_cm = COALESCE(NEW.canopy_width_cm / 2, canopy_radius_cm),
    health_score = COALESCE(NEW.ai_health_score, health_score),
    last_monitored_at = NEW.observation_date,
    next_monitoring_date = v_next_date,
    monitoring_status = 'up_to_date',
    updated_at = now()
  WHERE id = NEW.tree_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
