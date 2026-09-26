-- ====================================================================
-- HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 10 TASK 58
-- Satellite & Multi-Spectral Time Series Observations Storage
-- ====================================================================

-- 1. Create satellite_time_series_observations table
CREATE TABLE IF NOT EXISTS public.satellite_time_series_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    plot_id TEXT,
    scene_id TEXT NOT NULL,
    satellite_constellation TEXT NOT NULL DEFAULT 'Sentinel-2A MSI',
    acquisition_timestamp TIMESTAMPTZ NOT NULL,
    observation_date DATE NOT NULL,
    cloud_cover_pct NUMERIC(5, 2) DEFAULT 0.0,
    scl_vegetation_pct NUMERIC(5, 2) DEFAULT 0.0,
    
    -- Multi-Spectral Vegetation Indices
    ndvi NUMERIC(5, 3) NOT NULL,
    evi NUMERIC(5, 3),
    savi NUMERIC(5, 3),
    ndre NUMERIC(5, 3),
    msavi2 NUMERIC(5, 3),
    ndwi NUMERIC(5, 3),
    ndmi NUMERIC(5, 3),
    
    -- Physical Canopy & Land-Cover Indicators
    fvc_pct NUMERIC(5, 2),
    lai NUMERIC(5, 2),
    agbd_tons_ha NUMERIC(6, 2),
    
    -- Change & Phenological Metrics
    delta_ndvi NUMERIC(5, 3) DEFAULT 0.000,
    vci_pct NUMERIC(5, 2) DEFAULT 50.00,
    phenological_season TEXT NOT NULL DEFAULT 'kharif_monsoon',
    
    -- Agro-Climatic Telemetry (Open-Meteo / Soil)
    soil_moisture_pct NUMERIC(5, 2),
    temperature_c NUMERIC(5, 2),
    rainfall_mm NUMERIC(6, 2) DEFAULT 0.0,
    
    -- Verification & Audit
    qa_passed BOOLEAN NOT NULL DEFAULT true,
    sha256_hash TEXT,
    raw_telemetry JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance & Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_sat_time_series_project_date
    ON public.satellite_time_series_observations(project_id, acquisition_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sat_time_series_obs_date
    ON public.satellite_time_series_observations(observation_date DESC);

CREATE INDEX IF NOT EXISTS idx_sat_time_series_ndvi
    ON public.satellite_time_series_observations(project_id, ndvi);

CREATE INDEX IF NOT EXISTS idx_sat_time_series_season
    ON public.satellite_time_series_observations(phenological_season);

-- 3. Row Level Security (RLS)
ALTER TABLE public.satellite_time_series_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to satellite time series" ON public.satellite_time_series_observations;
CREATE POLICY "Allow public read access to satellite time series"
    ON public.satellite_time_series_observations
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to satellite time series" ON public.satellite_time_series_observations;
CREATE POLICY "Allow authenticated insert to satellite time series"
    ON public.satellite_time_series_observations
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role update to satellite time series" ON public.satellite_time_series_observations;
CREATE POLICY "Allow service role update to satellite time series"
    ON public.satellite_time_series_observations
    FOR UPDATE
    USING (true);

-- 4. Stored Procedure: Get Project Time Series Summary & Trajectory
CREATE OR REPLACE FUNCTION public.get_project_time_series_trajectory(p_project_id TEXT, p_limit INT DEFAULT 36)
RETURNS TABLE (
    id UUID,
    project_id TEXT,
    scene_id TEXT,
    satellite_constellation TEXT,
    acquisition_timestamp TIMESTAMPTZ,
    observation_date DATE,
    ndvi NUMERIC,
    evi NUMERIC,
    savi NUMERIC,
    ndre NUMERIC,
    fvc_pct NUMERIC,
    agbd_tons_ha NUMERIC,
    delta_ndvi NUMERIC,
    vci_pct NUMERIC,
    phenological_season TEXT,
    qa_passed BOOLEAN,
    sha256_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.project_id,
        s.scene_id,
        s.satellite_constellation,
        s.acquisition_timestamp,
        s.observation_date,
        s.ndvi,
        s.evi,
        s.savi,
        s.ndre,
        s.fvc_pct,
        s.agbd_tons_ha,
        s.delta_ndvi,
        s.vci_pct,
        s.phenological_season,
        s.qa_passed,
        s.sha256_hash
    FROM public.satellite_time_series_observations s
    WHERE s.project_id = p_project_id
    ORDER BY s.acquisition_timestamp DESC
    LIMIT p_limit;
END;
$$;
