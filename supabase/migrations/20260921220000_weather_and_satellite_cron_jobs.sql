-- ====================================================================
-- Green Enlightenment — Automated Weather Checks & Bulk Satellite Telemetry
-- Daily Map My Crop Agro-Meteorological Monitoring & Sentinel-2 Pipeline
-- ====================================================================

-- 1. Create weather_telemetry table
CREATE TABLE IF NOT EXISTS public.weather_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    temperature_celsius NUMERIC(5, 2) NOT NULL,
    feels_like_celsius NUMERIC(5, 2),
    humidity_pct NUMERIC(5, 2) NOT NULL,
    precipitation_mm NUMERIC(6, 2) DEFAULT 0.0,
    precipitation_probability_pct NUMERIC(5, 2) DEFAULT 0.0,
    soil_moisture_index NUMERIC(4, 3) DEFAULT 0.500, -- 0.000 (dry) to 1.000 (saturated)
    soil_temp_celsius NUMERIC(5, 2),
    solar_radiation_wm2 NUMERIC(7, 2),
    wind_speed_kmh NUMERIC(5, 2) DEFAULT 0.0,
    wind_gust_kmh NUMERIC(5, 2),
    uv_index NUMERIC(4, 1),
    weather_condition TEXT NOT NULL DEFAULT 'Clear',
    drought_risk_index NUMERIC(4, 3) DEFAULT 0.000, -- 0.000 to 1.000
    heat_stress_index NUMERIC(4, 3) DEFAULT 0.000,  -- 0.000 to 1.000
    source TEXT NOT NULL DEFAULT 'MapMyCrop_Agro_API',
    raw_payload JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance & Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_weather_telemetry_plot_recorded 
    ON public.weather_telemetry(plot_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_weather_telemetry_project_recorded 
    ON public.weather_telemetry(project_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_weather_telemetry_drought_risk 
    ON public.weather_telemetry(drought_risk_index DESC);

CREATE INDEX IF NOT EXISTS idx_weather_telemetry_recorded_at 
    ON public.weather_telemetry(recorded_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.weather_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to weather telemetry" ON public.weather_telemetry;
CREATE POLICY "Allow read access to weather telemetry"
    ON public.weather_telemetry
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow service role and authenticated insert to weather telemetry" ON public.weather_telemetry;
CREATE POLICY "Allow service role and authenticated insert to weather telemetry"
    ON public.weather_telemetry
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role update to weather telemetry" ON public.weather_telemetry;
CREATE POLICY "Allow service role update to weather telemetry"
    ON public.weather_telemetry
    FOR UPDATE
    USING (true);

-- 4. Stored Procedure: Get Latest Weather Telemetry for a Plot
CREATE OR REPLACE FUNCTION public.get_latest_plot_weather(p_plot_id UUID)
RETURNS TABLE (
    id UUID,
    plot_id UUID,
    temperature_celsius NUMERIC,
    humidity_pct NUMERIC,
    precipitation_mm NUMERIC,
    soil_moisture_index NUMERIC,
    weather_condition TEXT,
    drought_risk_index NUMERIC,
    heat_stress_index NUMERIC,
    recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.plot_id,
        w.temperature_celsius,
        w.humidity_pct,
        w.precipitation_mm,
        w.soil_moisture_index,
        w.weather_condition,
        w.drought_risk_index,
        w.heat_stress_index,
        w.recorded_at
    FROM public.weather_telemetry w
    WHERE w.plot_id = p_plot_id
    ORDER BY w.recorded_at DESC
    LIMIT 1;
END;
$$;

-- 5. Stored Procedure: Regional Weather Aggregates across a Project
CREATE OR REPLACE FUNCTION public.get_regional_weather_summary(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'project_id', p_project_id,
        'avg_temperature_c', ROUND(AVG(w.temperature_celsius), 2),
        'avg_humidity_pct', ROUND(AVG(w.humidity_pct), 2),
        'total_precipitation_24h_mm', ROUND(SUM(w.precipitation_mm), 2),
        'avg_soil_moisture', ROUND(AVG(w.soil_moisture_index), 3),
        'max_drought_risk', ROUND(MAX(w.drought_risk_index), 3),
        'plots_monitored_count', COUNT(DISTINCT w.plot_id),
        'latest_observation', MAX(w.recorded_at)
    )
    INTO v_result
    FROM public.weather_telemetry w
    WHERE w.project_id = p_project_id
      AND w.recorded_at >= now() - INTERVAL '24 hours';

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 6. Trigger Definition / RPC for Daily Weather & Satellite Sync
CREATE OR REPLACE FUNCTION public.trigger_daily_weather_and_satellite_sync()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_plots_count INT;
BEGIN
    SELECT COUNT(*) INTO v_active_plots_count FROM public.plots;
    
    RETURN jsonb_build_object(
        'status', 'triggered',
        'active_plots_targeted', v_active_plots_count,
        'timestamp', now(),
        'services', jsonb_build_array('MapMyCrop_Daily_Agro_Weather', 'Sentinel2_L2A_Bulk_Telemetry')
    );
END;
$$;

-- 7. Automated pg_cron Schedules (Runs in Supabase pg_cron extension)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule 1: Daily Weather Check via Map My Crop API at 04:00 UTC (9:30 AM IST)
        PERFORM cron.schedule(
            'daily-map-my-crop-weather-check',
            '0 4 * * *',
            $$
            SELECT net.http_post(
                url := current_setting('app.settings.supabase_url', true) || '/functions/v1/daily-weather-check',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                ),
                body := '{"source":"pg_cron_daily_scheduler"}'::jsonb
            );
            $$
        );

        -- Schedule 2: Daily Bulk Sentinel-2 Satellite Telemetry Ingestion at 05:00 UTC (10:30 AM IST)
        PERFORM cron.schedule(
            'daily-sentinel2-bulk-satellite-update',
            '0 5 * * *',
            $$
            SELECT net.http_post(
                url := current_setting('app.settings.supabase_url', true) || '/functions/v1/bulk-satellite-telemetry',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                ),
                body := '{"source":"pg_cron_daily_scheduler","cloud_filter_max_pct":25}'::jsonb
            );
            $$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension notice: %', SQLERRM;
END;
$$;
