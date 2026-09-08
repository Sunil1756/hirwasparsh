-- Migration: Multi-Source Fusion Engine & Zero Greenwashing Verification
-- Tables: satellite_overpasses, spectral_anomalies, drone_surveys, confidence_scores

-- 1. Real Copernicus Sentinel-2 L2A Satellite Overpasses Table
CREATE TABLE IF NOT EXISTS public.satellite_overpasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.plantation_projects(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL,
  acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  satellite_source TEXT NOT NULL DEFAULT 'copernicus_sentinel2_l2a', -- 'copernicus_sentinel2_l2a' | 'earth_search_stac' | 'planetary_computer'
  cloud_cover_pct NUMERIC NOT NULL DEFAULT 0.0,
  scl_cloud_shadow_pct NUMERIC NOT NULL DEFAULT 0.0,
  valid_pixel_pct NUMERIC NOT NULL DEFAULT 100.0,
  is_cloud_masked BOOLEAN NOT NULL DEFAULT true,
  -- Raw BOA Surface Reflectance Bands (0.0 - 1.0)
  b02_blue NUMERIC,
  b03_green NUMERIC,
  b04_red NUMERIC,
  b05_red_edge NUMERIC,
  b08_nir NUMERIC,
  b11_swir NUMERIC,
  -- Computed Spectral Vegetation & Moisture Indices
  ndvi NUMERIC NOT NULL,
  ndre NUMERIC NOT NULL,
  ndwi NUMERIC NOT NULL,
  evi NUMERIC NOT NULL,
  savi NUMERIC NOT NULL,
  surface_temp_c NUMERIC,
  estimated_biomass_mt_per_ha NUMERIC NOT NULL,
  total_carbon_stock_co2e_mt NUMERIC NOT NULL,
  quality_flags JSONB DEFAULT '{"scl_clean": true, "atmospheric_correction": "sen2cor"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for satellite_overpasses
ALTER TABLE public.satellite_overpasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view satellite_overpasses" ON public.satellite_overpasses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert satellite_overpasses" ON public.satellite_overpasses FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Spectral Anomaly Detection & Field Task Automation Table
CREATE TABLE IF NOT EXISTS public.spectral_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.plantation_projects(id) ON DELETE CASCADE,
  overpass_id UUID REFERENCES public.satellite_overpasses(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  anomaly_type TEXT NOT NULL DEFAULT 'ndvi_drop', -- 'ndvi_drop' | 'canopy_loss_risk' | 'moisture_stress' | 'cloud_occlusion'
  baseline_ndvi NUMERIC NOT NULL,
  current_ndvi NUMERIC NOT NULL,
  drop_percentage NUMERIC NOT NULL, -- e.g. -24.5%
  severity TEXT NOT NULL DEFAULT 'high', -- 'low' | 'medium' | 'high' | 'critical'
  status TEXT NOT NULL DEFAULT 'task_dispatched', -- 'open' | 'task_dispatched' | 'verified_in_field' | 'resolved' | 'false_positive'
  auto_generated_task_id UUID REFERENCES public.field_tasks(id) ON DELETE SET NULL,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for spectral_anomalies
ALTER TABLE public.spectral_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spectral_anomalies" ON public.spectral_anomalies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage spectral_anomalies" ON public.spectral_anomalies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Drone Aerial Surveys Table (Cluster-Level High-Resolution Verification)
CREATE TABLE IF NOT EXISTS public.drone_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.plantation_projects(id) ON DELETE CASCADE,
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  orthomosaic_url TEXT,
  tree_count_detected INTEGER NOT NULL DEFAULT 0,
  mean_canopy_height_m NUMERIC,
  resolution_cm_per_px NUMERIC DEFAULT 2.5,
  survey_operator TEXT NOT NULL DEFAULT 'Certified UAV Partner',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for drone_surveys
ALTER TABLE public.drone_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view drone_surveys" ON public.drone_surveys FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert drone_surveys" ON public.drone_surveys FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Multi-Source Confidence Scores & Verification Tiers Table
CREATE TABLE IF NOT EXISTS public.confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'plot', -- 'plot' | 'tree' | 'project'
  entity_id UUID NOT NULL,
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL DEFAULT 0.0, -- 0.0 to 100.0
  satellite_signal_score NUMERIC NOT NULL DEFAULT 0.0, -- Max 20.0
  drone_signal_score NUMERIC NOT NULL DEFAULT 0.0, -- Max 30.0
  field_photo_score NUMERIC NOT NULL DEFAULT 0.0, -- Max 50.0
  time_decay_penalty NUMERIC NOT NULL DEFAULT 0.0, -- Max -25.0
  verification_tier TEXT NOT NULL DEFAULT 'unverified_demo', -- 'unverified_demo' | 'satellite_only' | 'field_verified' | 'zero_greenwashing_gold'
  satellite_details JSONB DEFAULT '{}',
  drone_details JSONB DEFAULT '{}',
  field_details JSONB DEFAULT '{}',
  decay_details JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for confidence_scores
ALTER TABLE public.confidence_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view confidence_scores" ON public.confidence_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert confidence_scores" ON public.confidence_scores FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Indexes for Fast GIS and Audit Querying
CREATE INDEX IF NOT EXISTS idx_satellite_overpasses_plot ON public.satellite_overpasses(plot_id);
CREATE INDEX IF NOT EXISTS idx_satellite_overpasses_date ON public.satellite_overpasses(acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_spectral_anomalies_plot ON public.spectral_anomalies(plot_id);
CREATE INDEX IF NOT EXISTS idx_spectral_anomalies_status ON public.spectral_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_drone_surveys_plot ON public.drone_surveys(plot_id);
CREATE INDEX IF NOT EXISTS idx_confidence_scores_entity ON public.confidence_scores(entity_id);
