-- Migration: Enterprise Data Spine for NGOs, CSR Donors, and Carbon MRV
-- Creates tables: organizations, plots, verifications, satellite_telemetry, growth_monitoring_logs
-- Enhances trees table with spatial, plot, and perceptual hash tracking

-- 1. Organizations Table (NGOs, CSR Corporates, Academic Institutions)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  org_type TEXT NOT NULL DEFAULT 'ngo', -- 'ngo' | 'csr_corporate' | 'institution' | 'government'
  registration_number TEXT, -- 80G, 12A, CSR-1, CIN, or Darpan ID
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  state TEXT DEFAULT 'Maharashtra',
  district TEXT,
  verification_status TEXT NOT NULL DEFAULT 'verified', -- 'pending' | 'verified' | 'rejected'
  tier TEXT NOT NULL DEFAULT 'free_pilot', -- 'free_pilot' | 'starter' | 'enterprise_mrv'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update organizations" ON public.organizations FOR UPDATE TO authenticated USING (true);

-- 2. Plots / Geofenced Plantation Parcels Table
CREATE TABLE IF NOT EXISTS public.plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Nagpur',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  country TEXT NOT NULL DEFAULT 'India',
  area_acres NUMERIC NOT NULL DEFAULT 1.0,
  area_sqm NUMERIC NOT NULL DEFAULT 4046.86,
  target_trees INTEGER NOT NULL DEFAULT 500,
  planted_trees INTEGER NOT NULL DEFAULT 0,
  polygon_geojson JSONB NOT NULL DEFAULT '[]',
  center_lat DOUBLE PRECISION NOT NULL DEFAULT 21.1458,
  center_lng DOUBLE PRECISION NOT NULL DEFAULT 79.0882,
  current_mean_ndvi NUMERIC DEFAULT 0.72,
  current_biomass_mt NUMERIC DEFAULT 45.0,
  last_satellite_sync_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- 'planned' | 'active' | 'completed' | 'monitoring'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for plots
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plots" ON public.plots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage plots" ON public.plots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Enhance Trees Table with Spatial & Audit Columns
DO $$
BEGIN
  -- Add plot_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='plot_id') THEN
    ALTER TABLE public.trees ADD COLUMN plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL;
  END IF;

  -- Add org_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='org_id') THEN
    ALTER TABLE public.trees ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  -- Add tree_code if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='tree_code') THEN
    ALTER TABLE public.trees ADD COLUMN tree_code TEXT;
  END IF;

  -- Add scientific_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='scientific_name') THEN
    ALTER TABLE public.trees ADD COLUMN scientific_name TEXT;
  END IF;

  -- Add elevation_m if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='elevation_m') THEN
    ALTER TABLE public.trees ADD COLUMN elevation_m NUMERIC;
  END IF;

  -- Add canopy_radius_m if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='canopy_radius_m') THEN
    ALTER TABLE public.trees ADD COLUMN canopy_radius_m NUMERIC DEFAULT 0.5;
  END IF;

  -- Add health_status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='health_status') THEN
    ALTER TABLE public.trees ADD COLUMN health_status TEXT NOT NULL DEFAULT 'healthy';
  END IF;

  -- Add before_photo_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='before_photo_url') THEN
    ALTER TABLE public.trees ADD COLUMN before_photo_url TEXT;
  END IF;

  -- Add planter_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='planter_name') THEN
    ALTER TABLE public.trees ADD COLUMN planter_name TEXT;
  END IF;

  -- Add planter_phone if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='planter_phone') THEN
    ALTER TABLE public.trees ADD COLUMN planter_phone TEXT;
  END IF;

  -- Add phash (Perceptual Image Hash) if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='phash') THEN
    ALTER TABLE public.trees ADD COLUMN phash TEXT;
  END IF;

  -- Add is_verified if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='is_verified') THEN
    ALTER TABLE public.trees ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add last_verified_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='last_verified_at') THEN
    ALTER TABLE public.trees ADD COLUMN last_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Verifications Table (Anti-fraud, Perceptual Hash matching, Botanical AI confidence)
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  phash TEXT,
  duplicate_matched_tree_id UUID REFERENCES public.trees(id) ON DELETE SET NULL,
  duplicate_similarity_pct NUMERIC DEFAULT 0,
  ai_confidence NUMERIC DEFAULT 95.0,
  species_match_confidence NUMERIC DEFAULT 90.0,
  health_score NUMERIC DEFAULT 92.0,
  fraud_flags JSONB DEFAULT '[]',
  verified_by_type TEXT NOT NULL DEFAULT 'ai', -- 'ai' | 'field_auditor' | 'satellite_crosscheck'
  verification_notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for verifications
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verifications" ON public.verifications FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert verifications" ON public.verifications FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Real Satellite Telemetry Table (Copernicus Sentinel-2 L2A / Earth Engine)
CREATE TABLE IF NOT EXISTS public.satellite_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bbox JSONB,
  satellite_source TEXT NOT NULL DEFAULT 'copernicus_sentinel2_l2a', -- 'copernicus_sentinel2_l2a' | 'earth_engine' | 'landsat_8'
  acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tile_id TEXT NOT NULL,
  cloud_cover_pct NUMERIC NOT NULL DEFAULT 0.0,
  b02_blue NUMERIC,
  b03_green NUMERIC,
  b04_red NUMERIC,
  b05_red_edge NUMERIC,
  b08_nir NUMERIC,
  b11_swir NUMERIC,
  mean_ndvi NUMERIC NOT NULL,
  mean_ndre NUMERIC NOT NULL,
  mean_ndwi NUMERIC NOT NULL,
  evi NUMERIC NOT NULL,
  savi NUMERIC NOT NULL,
  surface_temp_c NUMERIC,
  estimated_biomass_mt_per_ha NUMERIC NOT NULL,
  total_carbon_stock_co2e_mt NUMERIC NOT NULL,
  raw_band_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for satellite_telemetry
ALTER TABLE public.satellite_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view satellite_telemetry" ON public.satellite_telemetry FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert satellite_telemetry" ON public.satellite_telemetry FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Growth Monitoring Logs (Multi-temporal NDVI + Ground Verification check-ins)
CREATE TABLE IF NOT EXISTS public.growth_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm NUMERIC NOT NULL,
  canopy_spread_m NUMERIC,
  health_status TEXT NOT NULL DEFAULT 'healthy',
  ndvi_at_location NUMERIC,
  auditor_notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for growth_monitoring_logs
ALTER TABLE public.growth_monitoring_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view growth_monitoring_logs" ON public.growth_monitoring_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert growth_monitoring_logs" ON public.growth_monitoring_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trees_plot_id ON public.trees(plot_id);
CREATE INDEX IF NOT EXISTS idx_trees_org_id ON public.trees(org_id);
CREATE INDEX IF NOT EXISTS idx_trees_lat_lng ON public.trees(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trees_phash ON public.trees(phash);
CREATE INDEX IF NOT EXISTS idx_plots_org_id ON public.plots(org_id);
CREATE INDEX IF NOT EXISTS idx_verifications_tree_id ON public.verifications(tree_id);
CREATE INDEX IF NOT EXISTS idx_verifications_phash ON public.verifications(phash);
CREATE INDEX IF NOT EXISTS idx_satellite_telemetry_plot_id ON public.satellite_telemetry(plot_id);
CREATE INDEX IF NOT EXISTS idx_growth_monitoring_logs_tree_id ON public.growth_monitoring_logs(tree_id);
