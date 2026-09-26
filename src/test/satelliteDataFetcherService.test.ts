import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  satelliteDataFetcherService,
  SatelliteDataFetcherService,
} from "../services/satelliteDataFetcherService";

describe("PHASE 10 TASK 54 — Satellite Remote Sensing & Agro-Climatic Data Fetcher Service", () => {
  let service: SatelliteDataFetcherService;

  beforeEach(() => {
    service = new SatelliteDataFetcherService();
    service.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Spatial Geometry & Bounding Box Utilities
  // =========================================================================
  describe("1. Spatial Bounding Box Calculation", () => {
    it("generates correct metric bounding box around coordinate center", () => {
      const [minLng, minLat, maxLng, maxLat] = service.buildBoundingBox(18.5204, 73.8567, 1.0);

      expect(minLng).toBeLessThan(73.8567);
      expect(maxLng).toBeGreaterThan(73.8567);
      expect(minLat).toBeLessThan(18.5204);
      expect(maxLat).toBeGreaterThan(18.5204);

      // Verify aspect ratio roughly ~0.009 deg per km
      expect(maxLat - minLat).toBeCloseTo(0.018, 2);
    });
  });

  // =========================================================================
  // 2. Open-Meteo Agro-Climatic Telemetry Ingestion
  // =========================================================================
  describe("2. Open-Meteo Agro-Climatic Ingestion & Drought Stress Scoring", () => {
    it("successfully parses live Open-Meteo telemetry response and computes drought stress", async () => {
      const mockWeatherResponse = {
        elevation: 560,
        hourly: {
          soil_moisture_0_to_7cm: [0.18, 0.18, 0.17, 0.16, 0.15, 0.14, 0.14, 0.13, 0.12, 0.12, 0.11, 0.11, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.17, 0.18, 0.18, 0.18, 0.18],
          soil_moisture_7_to_28cm: [0.22, 0.22, 0.22, 0.21, 0.21, 0.20, 0.20, 0.20, 0.19, 0.19, 0.19, 0.19, 0.19, 0.19, 0.20, 0.20, 0.21, 0.21, 0.21, 0.22, 0.22, 0.22, 0.22, 0.22],
          soil_moisture_28_to_100cm: [0.30, 0.30, 0.30, 0.30, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.29, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30],
          vapor_pressure_deficit: [1.2, 1.1, 1.0, 0.9, 0.8, 1.4, 1.9, 2.3, 2.7, 3.1, 3.3, 3.4, 3.5, 3.4, 3.2, 2.9, 2.4, 1.9, 1.6, 1.4, 1.3, 1.3, 1.2, 1.2],
          temperature_2m: [24, 23, 23, 22, 22, 24, 27, 29, 31, 33, 34, 35, 35, 34, 33, 31, 29, 27, 26, 25, 25, 24, 24, 24],
          relative_humidity_2m: [75, 78, 80, 82, 83, 72, 60, 52, 44, 38, 35, 33, 34, 36, 40, 48, 55, 62, 68, 71, 73, 74, 75, 75],
          precipitation: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          surface_pressure: [945, 945, 946, 946, 946, 947, 947, 947, 946, 945, 944, 943, 943, 943, 944, 945, 945, 946, 946, 946, 946, 946, 945, 945],
          wind_speed_10m: [8.5, 8.0, 7.8, 7.5, 7.2, 8.9, 11.2, 13.4, 15.1, 16.8, 17.5, 18.0, 17.8, 16.5, 14.8, 12.9, 10.8, 9.5, 8.9, 8.5, 8.2, 8.0, 8.1, 8.3],
        },
        daily: {
          precipitation_sum: [0.0],
          et0_fao_evapotranspiration: [5.2],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      const telemetry = await service.fetchAgroClimaticTelemetry(18.5204, 73.8567, true);

      expect(telemetry.elevationM).toBe(560);
      expect(telemetry.soilMoisture0to7cmPct).toBeGreaterThan(0);
      expect(telemetry.soilMoisture28to100cmPct).toBeGreaterThan(telemetry.soilMoisture0to7cmPct);
      expect(telemetry.vaporPressureDeficitKPa).toBeGreaterThan(0);
      expect(telemetry.droughtStressScore).toBeGreaterThanOrEqual(0);
      expect(telemetry.droughtStressScore).toBeLessThanOrEqual(100);
    });

    it("falls back to regionally calibrated bio-geographical climate when Open-Meteo API fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

      const fallback = await service.fetchAgroClimaticTelemetry(17.92, 73.65, true); // Western Ghats

      expect(fallback.elevationM).toBe(780);
      expect(fallback.soilMoisture0to7cmPct).toBe(38.2);
      expect(fallback.relativeHumidityPct).toBe(75);
      expect(fallback.droughtStressScore).toBe(15);
    });
  });

  // =========================================================================
  // 3. STAC Multi-Provider Querying & Parsing
  // =========================================================================
  describe("3. STAC Query & Multi-Provider Failover", () => {
    it("parses Element84 STAC response with all multi-spectral asset URLs", async () => {
      const mockStacItem = {
        id: "S2B_MSIL2A_20260920T053000_T43QEE",
        collection: "sentinel-2-l2a",
        geometry: { type: "Polygon", coordinates: [] },
        bbox: [73.8, 18.5, 73.9, 18.6],
        properties: {
          datetime: "2026-09-20T05:30:00Z",
          "eo:cloud_cover": 3.2,
          "s2:mgrs_tile": "43QEE",
          platform: "Sentinel-2B",
        },
        assets: {
          thumbnail: { href: "https://sentinel-cogs.s3.amazonaws.com/thumbnail.jpg" },
          B02: { href: "https://sentinel-cogs.s3.amazonaws.com/B02.tif" },
          B04: { href: "https://sentinel-cogs.s3.amazonaws.com/B04.tif" },
          B08: { href: "https://sentinel-cogs.s3.amazonaws.com/B08.tif" },
          B11: { href: "https://sentinel-cogs.s3.amazonaws.com/B11.tif" },
          SCL: { href: "https://sentinel-cogs.s3.amazonaws.com/SCL.tif" },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [mockStacItem] }),
      } as Response);

      const items = await service.querySTAC({
        bbox: [73.8, 18.5, 73.9, 18.6],
        maxCloudCoverPct: 15,
      });

      expect(items.length).toBe(1);
      expect(items[0].id).toBe("S2B_MSIL2A_20260920T053000_T43QEE");
      expect(items[0].properties["eo:cloud_cover"]).toBe(3.2);
      expect(items[0].assets.B08.href).toContain("B08.tif");
    });

    it("fails over to Planetary Computer when Earth Search STAC fails", async () => {
      const mockPcItem = {
        id: "S2A_MSIL2A_20260918_T43QEE",
        collection: "sentinel-2-l2a",
        geometry: {},
        bbox: [73.8, 18.5, 73.9, 18.6],
        properties: {
          datetime: "2026-09-18T05:25:00Z",
          "eo:cloud_cover": 5.4,
          "s2:mgrs_tile": "43QEE",
        },
        assets: {},
      };

      // 1st call (Earth Search) fails
      // 2nd call (Planetary Computer) succeeds
      vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("Earth search timeout"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [mockPcItem] }),
        } as Response);

      const items = await service.querySTAC({
        bbox: [73.8, 18.5, 73.9, 18.6],
      });

      expect(items.length).toBe(1);
      expect(items[0].id).toBe("S2A_MSIL2A_20260918_T43QEE");
    });
  });

  // =========================================================================
  // 4. Complete Scene Fetching by Coordinates
  // =========================================================================
  describe("4. End-to-End Scene Retrieval & Index Computation", () => {
    it("fetches scene by coordinates and computes all vegetative indices & SCL cloud mask", async () => {
      const scene = await service.fetchSceneByCoordinates(19.076, 72.8777, { forceRefresh: true });

      expect(scene.sceneId).toBeDefined();
      expect(scene.tileId).toBeDefined();
      expect(scene.centerCoordinates.lat).toBe(19.076);
      expect(scene.centerCoordinates.lng).toBe(72.8777);

      // Multi-spectral indices
      expect(scene.indices.ndvi).toBeGreaterThanOrEqual(-1.0);
      expect(scene.indices.ndvi).toBeLessThanOrEqual(1.0);
      expect(scene.indices.ndre).toBeGreaterThanOrEqual(0.0);
      expect(scene.indices.ndwi).toBeDefined();
      expect(scene.indices.standingBiomassMTPerHa).toBeGreaterThan(0);

      // SCL Summary
      expect(scene.sclSummary.vegetationPct).toBeGreaterThan(0);
      expect(scene.sclSummary.isObscuredByCloud).toBe(false);

      // Agro-Climatic correlation
      expect(scene.agroWeather).toBeDefined();
      expect(scene.agroWeather.soilMoisture0to7cmPct).toBeGreaterThan(0);
    });

    it("serves subsequent requests from memory cache when forceRefresh is false", async () => {
      const scene1 = await service.fetchSceneByCoordinates(18.5204, 73.8567, { forceRefresh: true });
      expect(scene1.isCached).toBe(false);

      const scene2 = await service.fetchSceneByCoordinates(18.5204, 73.8567, { forceRefresh: false });
      expect(scene2.isCached).toBe(true);
      expect(scene2.sceneId).toBe(scene1.sceneId);
    });
  });

  // =========================================================================
  // 5. Multi-Temporal Time Series (Phenology & Progression)
  // =========================================================================
  describe("5. Multi-Temporal Progression Time Series", () => {
    it("generates 6-month historical time series with seasonal canopy modulation", async () => {
      const series = await service.fetchTimeSliderSeries(19.75, 75.71, 6);

      expect(series.length).toBe(6);
      // Chronological progression
      expect(new Date(series[0].acquisitionDate).getTime()).toBeLessThan(
        new Date(series[5].acquisitionDate).getTime()
      );

      for (const entry of series) {
        expect(entry.indices.ndvi).toBeGreaterThanOrEqual(0.15);
        expect(entry.indices.ndvi).toBeLessThanOrEqual(0.95);
        expect(entry.bands.b08Nir).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // 6. Cache Management & Metrics
  // =========================================================================
  describe("6. Cache Management & Resource Cleanup", () => {
    it("clears cached items and returns stats correctly", async () => {
      await service.fetchSceneByCoordinates(18.52, 73.85, { forceRefresh: true });
      await service.fetchSceneByCoordinates(19.07, 72.87, { forceRefresh: true });

      const statsBefore = service.getCacheStats();
      expect(statsBefore.entriesCount).toBeGreaterThanOrEqual(2);

      service.clearCache();
      const statsAfter = service.getCacheStats();
      expect(statsAfter.entriesCount).toBe(0);
    });
  });
});
