import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  satelliteTimeSeriesService,
  SatelliteTimeSeriesService,
  SatelliteObservationInput,
} from "../services/satelliteTimeSeriesService";

describe("PHASE 10 TASK 58 — Satellite Remote Sensing Time-Series Storage & Analytics Suite", () => {
  let service: SatelliteTimeSeriesService;
  const testProjectId = "proj_test_ts_58";

  beforeEach(() => {
    service = new SatelliteTimeSeriesService();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("1. Observation Storage & Recording", () => {
    it("records and stores a new observation with SHA-256 digest and biometric calculations", async () => {
      const input: SatelliteObservationInput = {
        projectId: testProjectId,
        acquisitionTimestamp: "2026-09-26T05:30:00.000Z",
        indices: {
          ndvi: 0.742,
          evi: 0.589,
          savi: 0.621,
          ndre: 0.534,
          msavi2: 0.645,
          ndwiWater: -0.31,
          ndmiMoisture: 0.495,
        },
        cloudCoverPct: 5.2,
        sclVegetationPct: 88.4,
        soilMoisturePct: 36.2,
        temperatureC: 27.8,
        rainfallMm: 6.4,
      };

      const result = await service.recordObservation(input);

      expect(result.id).toContain(testProjectId);
      expect(result.projectId).toBe(testProjectId);
      expect(result.indices.ndvi).toBe(0.742);
      expect(result.observationDate).toBe("2026-09-26");
      expect(result.phenologicalSeason).toBe("kharif_monsoon"); // September is Kharif
      expect(result.fvcPct).toBeGreaterThan(70);
      expect(result.lai).toBeGreaterThan(2.0);
      expect(result.agbdTonsHa).toBeGreaterThan(50);
      expect(result.qaPassed).toBe(true);
      expect(result.sha256Hash).toContain("SHA256-");
    });
  });

  describe("2. Historical Time-Series Querying & Filtering", () => {
    it("fetches historical observations with sorting and date filtering", async () => {
      // Seed 12 months of historical observations
      const observations = await service.getProjectTimeSeries(testProjectId, {
        limit: 12,
        sortOrder: "desc",
      });

      expect(observations.length).toBeGreaterThanOrEqual(6);
      expect(observations[0].projectId).toBe(testProjectId);

      // Verify descending order
      const firstDate = new Date(observations[0].acquisitionTimestamp).getTime();
      const secondDate = new Date(observations[1].acquisitionTimestamp).getTime();
      expect(firstDate).toBeGreaterThanOrEqual(secondDate);
    });

    it("filters observations by start and end dates", async () => {
      const all = await service.getProjectTimeSeries(testProjectId);
      const targetDate = all[Math.floor(all.length / 2)].observationDate;

      const filtered = await service.getProjectTimeSeries(testProjectId, {
        startDate: targetDate,
      });

      for (const obs of filtered) {
        expect(obs.observationDate >= targetDate).toBe(true);
      }
    });
  });

  describe("3. Multi-Temporal Aggregation (Monthly & 10-Day Dekad)", () => {
    it("aggregates raw observations into monthly summaries with mean and standard deviation", async () => {
      const aggregated = await service.getAggregatedTimeSeries(testProjectId, "monthly");

      expect(aggregated.length).toBeGreaterThan(0);
      for (const point of aggregated) {
        expect(point.periodKey).toMatch(/^\d{4}-\d{2}$/);
        expect(point.observationsCount).toBeGreaterThan(0);
        expect(point.meanNdvi).toBeGreaterThan(0);
        expect(point.minNdvi).toBeLessThanOrEqual(point.meanNdvi);
        expect(point.maxNdvi).toBeGreaterThanOrEqual(point.meanNdvi);
        expect(point.stdDevNdvi).toBeGreaterThanOrEqual(0);
      }
    });

    it("aggregates observations into 10-day dekad periods", async () => {
      const dekadAgg = await service.getAggregatedTimeSeries(testProjectId, "10day_dekad");

      expect(dekadAgg.length).toBeGreaterThan(0);
      for (const point of dekadAgg) {
        expect(point.periodKey).toMatch(/^\d{4}-\d{2}-D[1-3]$/);
        expect(point.meanFvcPct).toBeGreaterThan(0);
        expect(point.meanAgbdTonsHa).toBeGreaterThan(0);
      }
    });
  });

  describe("4. Time-Series Anomaly Detection", () => {
    it("detects sharp drop anomaly when a critical canopy loss occurs", async () => {
      // Record baseline observation
      await service.recordObservation({
        projectId: "proj_anomaly_test",
        acquisitionTimestamp: "2026-08-10T05:30:00.000Z",
        indices: { ndvi: 0.78, evi: 0.6, savi: 0.65, ndre: 0.58, msavi2: 0.68, ndwiWater: -0.3, ndmiMoisture: 0.5 },
      });

      // Record sudden drop (e.g. canopy disturbance / clearcut)
      await service.recordObservation({
        projectId: "proj_anomaly_test",
        acquisitionTimestamp: "2026-08-20T05:30:00.000Z",
        indices: { ndvi: 0.45, evi: 0.3, savi: 0.35, ndre: 0.28, msavi2: 0.38, ndwiWater: -0.1, ndmiMoisture: 0.2 },
      });

      // Record second point
      await service.recordObservation({
        projectId: "proj_anomaly_test",
        acquisitionTimestamp: "2026-08-30T05:30:00.000Z",
        indices: { ndvi: 0.42, evi: 0.28, savi: 0.33, ndre: 0.26, msavi2: 0.36, ndwiWater: -0.05, ndmiMoisture: 0.18 },
      });

      const anomalies = await service.detectTimeSeriesAnomalies("proj_anomaly_test");

      expect(anomalies.length).toBeGreaterThan(0);
      const sharpDrop = anomalies.find((a) => a.anomalyType === "sharp_drop");
      expect(sharpDrop).toBeDefined();
      expect(sharpDrop?.severity).toBe("critical");
      expect(sharpDrop?.message).toContain("Sharp canopy NDVI decrease");
    });
  });

  describe("5. Time-Series Dossier Export (Verra MRV & CSV)", () => {
    it("exports valid CSV formatted time series data", async () => {
      const csv = await service.exportTimeSeriesDossier(testProjectId, "csv");

      expect(csv).toContain("Observation_ID,Project_ID,Scene_ID");
      expect(csv).toContain(testProjectId);
      expect(csv).toContain("NDVI");
      expect(csv).toContain("SHA256_Hash");
    });

    it("exports comprehensive Verra VM0047 MRV JSON dossier with cryptographic digest", async () => {
      const jsonStr = await service.exportTimeSeriesDossier(testProjectId, "verra_mrv");
      const dossier = JSON.parse(jsonStr);

      expect(dossier.projectId).toBe(testProjectId);
      expect(dossier.totalObservationsCount).toBeGreaterThan(0);
      expect(dossier.observations).toBeInstanceOf(Array);
      expect(dossier.aggregatedMonthly).toBeInstanceOf(Array);
      expect(dossier.mrvCryptographicDigest).toContain("VERRA-VM0047-TS-");
    });
  });
});
