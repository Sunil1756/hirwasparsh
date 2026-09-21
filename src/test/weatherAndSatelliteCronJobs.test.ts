import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  calculateAgroClimaticDroughtRisk,
  parseMapMyCropWeatherPayload,
  generateSimulatedWeather,
  computeSentinel2SpectralIndices,
  type Sentinel2SpectralBands,
  fetchLatestPlotWeather,
  fetchPlotWeatherHistory,
  triggerManualWeatherSync,
  triggerBulkSatelliteSync,
} from "../lib/weatherService";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation((limitCount: number) => {
                const sampleRecord = {
                  id: "weather-rec-1",
                  plot_id: "plot-test-123",
                  temperature_celsius: 29.5,
                  soil_moisture_index: 0.45,
                  drought_risk_index: 0.28,
                  recorded_at: new Date().toISOString(),
                };
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: sampleRecord, error: null }),
                  then: (resolve: any) => resolve({ data: [sampleRecord], error: null }),
                };
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: { success: true, plotsChecked: 2, alertsDispatched: 0 },
          error: null,
        }),
      },
    },
  };
});

describe("Automated Weather Checks (Map My Crop) & Bulk Sentinel-2 Telemetry Cron Jobs", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("1. Map My Crop Agro-Meteorological & Drought Risk Modeling", () => {
    it("calculates severe drought risk when soil moisture is low, temp is high, and rainfall is zero", () => {
      // High temp (38°C), 0mm rain, 15% soil moisture, 35% humidity
      const { droughtRisk, heatStress } = calculateAgroClimaticDroughtRisk(38.0, 0.0, 0.15, 35.0);

      expect(droughtRisk).toBeGreaterThanOrEqual(0.70);
      expect(heatStress).toBeGreaterThanOrEqual(0.50);
    });

    it("calculates low drought risk under optimal precipitation and high soil moisture", () => {
      // Mild temp (24°C), 18mm rain, 65% soil moisture, 75% humidity
      const { droughtRisk, heatStress } = calculateAgroClimaticDroughtRisk(24.0, 18.0, 0.65, 75.0);

      expect(droughtRisk).toBeLessThan(0.30);
      expect(heatStress).toBe(0);
    });

    it("correctly parses raw Map My Crop API JSON payloads", () => {
      const mockRawApiData = {
        main: { temp: 305.15, humidity: 55 }, // 32°C
        rain: { "1h": 0.5 },
        soil: { moisture: 0.38 },
        weather: [{ main: "Partly Cloudy" }],
      };

      const parsed = parseMapMyCropWeatherPayload(mockRawApiData);
      expect(parsed.temperature_celsius).toBe(32.0);
      expect(parsed.humidity_pct).toBe(55.0);
      expect(parsed.soil_moisture_index).toBe(0.38);
      expect(parsed.weather_condition).toBe("Partly Cloudy");
      expect(parsed.drought_risk_index).toBeDefined();
    });

    it("generates realistic simulated weather within physical boundaries", () => {
      const weather = generateSimulatedWeather(19.9975, 73.7898);
      expect(weather.temperature_celsius).toBeGreaterThan(15);
      expect(weather.temperature_celsius).toBeLessThan(50);
      expect(weather.humidity_pct).toBeGreaterThan(10);
      expect(weather.humidity_pct).toBeLessThan(100);
      expect(weather.soil_moisture_index).toBeGreaterThanOrEqual(0);
      expect(weather.soil_moisture_index).toBeLessThanOrEqual(1);
      expect(weather.drought_risk_index).toBeGreaterThanOrEqual(0);
      expect(weather.drought_risk_index).toBeLessThanOrEqual(1);
    });
  });

  describe("2. Bulk Sentinel-2 Multi-Spectral Telemetry & Biomass Pipeline", () => {
    it("computes accurate NDVI, NDRE, NDWI, EVI, SAVI and biomass metrics", () => {
      const sampleBands: Sentinel2SpectralBands = {
        b02_blue: 0.05,
        b03_green: 0.08,
        b04_red: 0.04,
        b05_red_edge: 0.16,
        b08_nir: 0.44,
        b11_swir: 0.14,
        cloud_cover_pct: 5.0,
      };

      const indices = computeSentinel2SpectralIndices(sampleBands, 10.0); // 10 hectares

      // NDVI = (0.44 - 0.04) / (0.44 + 0.04) = 0.40 / 0.48 = 0.8333
      expect(indices.ndvi).toBeCloseTo(0.8333, 2);
      // NDRE = (0.44 - 0.16) / (0.44 + 0.16) = 0.28 / 0.60 = 0.4667
      expect(indices.ndre).toBeCloseTo(0.4667, 2);
      // NDWI = (0.08 - 0.44) / (0.08 + 0.44) = -0.36 / 0.52 = -0.6923
      expect(indices.ndwi).toBeCloseTo(-0.6923, 2);
      expect(indices.evi).toBeGreaterThan(0);
      expect(indices.savi).toBeGreaterThan(0);
      expect(indices.estimatedBiomassMtPerHa).toBeGreaterThan(50);
      expect(indices.totalCarbonStockCo2eMt).toBeGreaterThan(100);
    });
  });

  describe("3. Supabase Edge Functions Implementation", () => {
    it("verifies daily-weather-check edge function exists and contains Map My Crop logic", () => {
      const weatherFnPath = path.join(rootDir, "supabase/functions/daily-weather-check/index.ts");
      expect(existsSync(weatherFnPath)).toBe(true);

      const content = readFileSync(weatherFnPath, "utf-8");
      expect(content).toContain("MapMyCrop");
      expect(content).toContain("weather_telemetry");
      expect(content).toContain("computeAgroDroughtRisk");
      expect(content).toContain("DROUGHT_SHOCK");
      expect(content).toContain("risk-alert-dispatcher");
    });

    it("verifies bulk-satellite-telemetry edge function exists and contains Sentinel-2 STAC pipeline", () => {
      const satelliteFnPath = path.join(rootDir, "supabase/functions/bulk-satellite-telemetry/index.ts");
      expect(existsSync(satelliteFnPath)).toBe(true);

      const content = readFileSync(satelliteFnPath, "utf-8");
      expect(content).toContain("Sentinel-2");
      expect(content).toContain("satellite_telemetry");
      expect(content).toContain("computeSpectralIndices");
      expect(content).toContain("CANOPY_HEALTH_ANOMALY");
      expect(content).toContain("risk-alert-dispatcher");
    });
  });

  describe("4. Database Migration & pg_cron Scheduling", () => {
    const migrationPath = path.join(rootDir, "supabase/migrations/20260921220000_weather_and_satellite_cron_jobs.sql");

    it("verifies weather and satellite migration file exists and is well-formed SQL", () => {
      expect(existsSync(migrationPath)).toBe(true);
      const sql = readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.weather_telemetry");
      expect(sql).toContain("drought_risk_index NUMERIC");
      expect(sql).toContain("heat_stress_index NUMERIC");
      expect(sql).toContain("soil_moisture_index NUMERIC");
      expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_weather_telemetry_plot_recorded");
      expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_weather_telemetry_drought_risk");
      expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    });

    it("verifies stored procedures and pg_cron schedule configurations in migration", () => {
      const sql = readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_latest_plot_weather");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_regional_weather_summary");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.trigger_daily_weather_and_satellite_sync");
      expect(sql).toContain("daily-map-my-crop-weather-check");
      expect(sql).toContain("0 4 * * *");
      expect(sql).toContain("daily-sentinel2-bulk-satellite-update");
      expect(sql).toContain("0 5 * * *");
    });
  });

  describe("5. Client Weather & Satellite Telemetry Service", () => {
    it("fetches latest plot weather and returns non-null record", async () => {
      const result = await fetchLatestPlotWeather("plot-test-123");
      expect(result).toBeDefined();
      expect(result?.temperature_celsius).toBeDefined();
      expect(result?.soil_moisture_index).toBeDefined();
      expect(result?.drought_risk_index).toBeDefined();
    });

    it("fetches weather history series for trend visualization", async () => {
      const history = await fetchPlotWeatherHistory("plot-test-123", 7);
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].recorded_at).toBeDefined();
    });

    it("triggers manual sync without throwing uncaught exceptions", async () => {
      const weatherSync = await triggerManualWeatherSync();
      expect(weatherSync).toBeDefined();

      const satelliteSync = await triggerBulkSatelliteSync(20);
      expect(satelliteSync).toBeDefined();
    });
  });
});
