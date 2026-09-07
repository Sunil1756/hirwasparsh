-- Migration: Comprehensive Survival Tracking Feature
-- Tables: check_ins, field_tasks, notifications
-- Views: plot_survival_rates
-- Functions: check_inactive_trees_and_notify, create_plot_verification_task

-- 1. Check-ins Table (Ground Truth Inspections)
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  photo_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('alive', 'dead', 'unverified', 'healthy', 'stressed')),
  checked_by TEXT NOT NULL DEFAULT 'Community Planter',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  ai_confidence NUMERIC DEFAULT 90.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Field Tasks Table (Actionable Ranger & Verification Tickets)
CREATE TABLE IF NOT EXISTS public.field_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'verification_needed', -- 'verification_needed' | 'drip_rescue' | 'sample_audit' | 'replanting'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'assigned' | 'in_progress' | 'completed' | 'dismissed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
  assigned_to TEXT,
  due_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Notifications Table (Planter Reminders & Field Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checkin_reminder', -- 'checkin_reminder' | 'ndvi_anomaly_alert' | 'task_assigned' | 'system'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add needs_verification / last_checkin columns to trees table if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='needs_verification') THEN
    ALTER TABLE public.trees ADD COLUMN needs_verification BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='last_checkin_at') THEN
    ALTER TABLE public.trees ADD COLUMN last_checkin_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_check_ins_tree_id ON public.check_ins(tree_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_at ON public.check_ins(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON public.check_ins(status);
CREATE INDEX IF NOT EXISTS idx_field_tasks_plot_id ON public.field_tasks(plot_id);
CREATE INDEX IF NOT EXISTS idx_field_tasks_status ON public.field_tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 5. Row Level Security Policies
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on check_ins" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "Allow public read on field_tasks" ON public.field_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read on notifications" ON public.notifications FOR SELECT USING (true);

CREATE POLICY "Allow public insert on check_ins" ON public.check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on field_tasks" ON public.field_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on field_tasks" ON public.field_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public update on notifications" ON public.notifications FOR UPDATE USING (true);

-- 6. PostgreSQL View: plot_survival_rates
-- Per plot survival calculation:
-- Verified Survival Rate = (alive check-ins) / (alive + dead check-ins)
-- Note: 'unverified' is strictly excluded from denominator to avoid inflating or distorting survival %
CREATE OR REPLACE VIEW public.plot_survival_rates AS
WITH latest_checkins AS (
  SELECT DISTINCT ON (tree_id)
    tree_id,
    status,
    checked_at,
    photo_url
  FROM public.check_ins
  ORDER BY tree_id, checked_at DESC
),
tree_status_agg AS (
  SELECT
    t.plot_id,
    COUNT(t.id) AS total_trees,
    COUNT(
      CASE
        WHEN lc.status IN ('alive', 'healthy') OR (lc.status IS NULL AND t.status IN ('alive', 'healthy')) THEN 1
      END
    ) AS alive_count,
    COUNT(
      CASE
        WHEN lc.status = 'dead' OR (lc.status IS NULL AND t.status = 'dead') THEN 1
      END
    ) AS dead_count,
    COUNT(
      CASE
        WHEN lc.status = 'unverified'
          OR t.needs_verification = true
          OR lc.checked_at < now() - interval '60 days'
          OR (lc.tree_id IS NULL AND t.created_at < now() - interval '60 days') THEN 1
      END
    ) AS unverified_count,
    MAX(lc.checked_at) AS latest_audit_at
  FROM public.trees t
  LEFT JOIN latest_checkins lc ON t.id = lc.tree_id
  GROUP BY t.plot_id
)
SELECT
  p.id AS plot_id,
  p.name AS plot_name,
  p.location,
  COALESCE(tsa.total_trees, 0) AS total_trees,
  COALESCE(tsa.alive_count, 0) AS alive_count,
  COALESCE(tsa.dead_count, 0) AS dead_count,
  COALESCE(tsa.unverified_count, 0) AS unverified_count,
  -- Verified Survival Rate %: alive / (alive + dead)
  CASE
    WHEN (COALESCE(tsa.alive_count, 0) + COALESCE(tsa.dead_count, 0)) = 0 THEN 0.0
    ELSE ROUND(
      (COALESCE(tsa.alive_count, 0)::numeric / (COALESCE(tsa.alive_count, 0) + COALESCE(tsa.dead_count, 0))) * 100,
      1
    )
  END AS verified_survival_rate_pct,
  -- Effective Conservative ESG Rate %: alive / total_trees
  CASE
    WHEN COALESCE(tsa.total_trees, 0) = 0 THEN 0.0
    ELSE ROUND(
      (COALESCE(tsa.alive_count, 0)::numeric / tsa.total_trees) * 100,
      1
    )
  END AS effective_survival_rate_pct,
  tsa.latest_audit_at
FROM public.plots p
LEFT JOIN tree_status_agg tsa ON p.id = tsa.plot_id;

-- 7. Stored Function: check_inactive_trees_and_notify()
-- Scheduled cron job (every 24 hours):
-- Flags trees with no check-in within 60 days as 'needs_verification'
-- Inserts a reminder into the notifications table for planters
CREATE OR REPLACE FUNCTION public.check_inactive_trees_and_notify()
RETURNS TABLE (
  flagged_count INT,
  notifications_sent INT
) AS $$
DECLARE
  v_flagged_count INT := 0;
  v_notifications_sent INT := 0;
  r RECORD;
BEGIN
  -- 1. Identify trees without check-in in 60 days
  FOR r IN
    SELECT
      t.id AS tree_id,
      t.species,
      t.plot_id,
      p.name AS plot_name,
      COALESCE(MAX(c.checked_at), t.created_at) AS last_activity
    FROM public.trees t
    LEFT JOIN public.plots p ON t.plot_id = p.id
    LEFT JOIN public.check_ins c ON t.id = c.tree_id
    GROUP BY t.id, t.species, t.plot_id, p.name, t.created_at
    HAVING COALESCE(MAX(c.checked_at), t.created_at) < now() - interval '60 days'
  LOOP
    -- Mark tree as needing verification
    UPDATE public.trees
    SET needs_verification = true
    WHERE id = r.tree_id;

    v_flagged_count := v_flagged_count + 1;

    -- Create checkin reminder notification
    INSERT INTO public.notifications (
      tree_id,
      plot_id,
      title,
      message,
      type
    ) VALUES (
      r.tree_id,
      r.plot_id,
      '📷 60-Day Survival Check-In Overdue',
      format('Tree %s in plot "%s" has not received a ground photo check-in in over 60 days. Please submit a fresh geotagged verification photo.', r.species, COALESCE(r.plot_name, 'Unknown Plot')),
      'checkin_reminder'
    );

    v_notifications_sent := v_notifications_sent + 1;
  END LOOP;

  -- Log execution in admin audit log
  INSERT INTO public.admin_audit_log (action, new_status, previous_status)
  VALUES (
    'CRON_60_DAY_TREE_INACTIVITY_SCAN',
    format('Flagged %s trees, sent %s notifications', v_flagged_count, v_notifications_sent),
    'CRON_COMPLETED'
  );

  RETURN QUERY SELECT v_flagged_count, v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

-- 8. Stored Function: create_plot_verification_task(...)
-- For bulk plots: triggers verification task if NDVI drops > 15% QoQ
CREATE OR REPLACE FUNCTION public.create_plot_verification_task(
  p_plot_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_priority TEXT DEFAULT 'high',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  INSERT INTO public.field_tasks (
    plot_id,
    title,
    description,
    task_type,
    priority,
    status,
    metadata,
    due_date
  ) VALUES (
    p_plot_id,
    p_title,
    p_description,
    'verification_needed',
    p_priority,
    'pending',
    p_metadata,
    (CURRENT_DATE + INTERVAL '7 days')::DATE
  )
  RETURNING id INTO v_task_id;

  -- Also insert notification
  INSERT INTO public.notifications (
    plot_id,
    title,
    message,
    type
  ) VALUES (
    p_plot_id,
    p_title,
    p_description,
    'ndvi_anomaly_alert'
  );

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;
