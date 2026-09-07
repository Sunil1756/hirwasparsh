-- Migration: Core Metrics Schema for Real Database Grounding
-- Tables: organizations, plots, trees, verifications, satellite_readings

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ngo', -- 'ngo' | 'csr' | 'institution' | 'government'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Plots / Plantation Parcels Table
CREATE TABLE IF NOT EXISTS public.plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  boundary_geojson JSONB NOT NULL DEFAULT '{"type":"FeatureCollection","features":[]}',
  location TEXT NOT NULL DEFAULT 'Maharashtra, India',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Trees Table
CREATE TABLE IF NOT EXISTS public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  species TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  planted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'alive', -- 'alive' | 'healthy' | 'stressed' | 'dead'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add compatibility columns if table already existed with different column names
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='plot_id') THEN
    ALTER TABLE public.trees ADD COLUMN plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='lat') THEN
    ALTER TABLE public.trees ADD COLUMN lat DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='lng') THEN
    ALTER TABLE public.trees ADD COLUMN lng DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='planted_date') THEN
    ALTER TABLE public.trees ADD COLUMN planted_date DATE DEFAULT CURRENT_DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trees' AND column_name='status') THEN
    ALTER TABLE public.trees ADD COLUMN status TEXT DEFAULT 'alive';
  END IF;
END $$;

-- 4. Verifications Table
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  ai_confidence NUMERIC NOT NULL DEFAULT 95.0,
  verification_type TEXT NOT NULL DEFAULT 'ai_vision', -- 'ai_vision' | 'field_inspector' | 'satellite_crosscheck'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Satellite Readings Table
CREATE TABLE IF NOT EXISTS public.satellite_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  ndvi NUMERIC NOT NULL,
  ndre NUMERIC NOT NULL,
  ndwi NUMERIC NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'sentinel-2', -- 'sentinel-2' | 'landsat-8' | 'planet'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_plots_org_id ON public.plots(org_id);
CREATE INDEX IF NOT EXISTS idx_trees_plot_id ON public.trees(plot_id);
CREATE INDEX IF NOT EXISTS idx_trees_lat_lng ON public.trees(lat, lng);
CREATE INDEX IF NOT EXISTS idx_verifications_tree_id ON public.verifications(tree_id);
CREATE INDEX IF NOT EXISTS idx_satellite_readings_plot_id ON public.satellite_readings(plot_id);
CREATE INDEX IF NOT EXISTS idx_satellite_readings_date ON public.satellite_readings(reading_date DESC);

-- 7. Row Level Security Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow public read on plots" ON public.plots FOR SELECT USING (true);
CREATE POLICY "Allow public read on trees" ON public.trees FOR SELECT USING (true);
CREATE POLICY "Allow public read on verifications" ON public.verifications FOR SELECT USING (true);
CREATE POLICY "Allow public read on satellite_readings" ON public.satellite_readings FOR SELECT USING (true);

CREATE POLICY "Allow auth users to insert plots" ON public.plots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth users to insert trees" ON public.trees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth users to insert verifications" ON public.verifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth users to insert satellite_readings" ON public.satellite_readings FOR INSERT TO authenticated WITH CHECK (true);
