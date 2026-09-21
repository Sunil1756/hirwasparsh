import { describe, it, expect, vi } from "vitest";
import {
  extractSpectralRiskFeatures,
  forecastNdviTrajectory,
  classifyPlantationThreat,
  runPredictiveRiskModel,
  dispatchPredictiveRiskFieldTask,
  calculateDaysUntilThresholdBreach,
  calculateMultiFactorRiskScore,
  SpectralTimePoint,
} from "../lib/predictiveRiskEngine";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "mock-task-id-123" },
              error: null,
            }),
          }),
        }),
      }),
    },
  };
});

describe("Machine Learning Predictive Risk & Threat Forecasting Engine", () => {
  describe("1. Spectral Feature Extraction & Statistical Metrics", () => {
    it("computes 1st derivative velocity, 2nd derivative acceleration, and Z-score departure accurately", () => {
      const series: SpectralTimePoint[] = [
        { date: "2026-01-01", ndvi: 0.75, ndre: 0.60, ndwi: 0.30, lstTempC: 25.0 },
        { date: "2026-01-31", ndvi: 0.70, ndre: 0.55, ndwi: 0.20, lstTempC: 27.0 },
        { date: "2026-03-02", ndvi: 0.60, ndre: 0.45, ndwi: 0.05, lstTempC: 31.0 },
      ];

      const features = extractSpectralRiskFeatures(series, 25.0);
      expect(features.currentNdvi).toBe(0.60);
      expect(features.baselineNdvi).toBe(0.75);
      expect(features.ndviDelta).toBe(-0.15);
      expect(features.ndviVelocity30d).toBeLessThan(0); // declining velocity
      expect(features.consecutiveDecliningPasses).toBe(2);
      expect(features.thermalAnomalyC).toBe(6.0); // 31 - 25 = 6.0
      expect(features.zScoreNdvi).toBeLessThan(0); // negative Z-score
      expect(features.ewmaSmoothedNdvi).toBeGreaterThan(0.60);
      expect(features.compositeRiskScore).toBeGreaterThan(30);
    });

    it("handles empty time series gracefully with regional baseline defaults", () => {
      const features = extractSpectralRiskFeatures([]);
      expect(features.currentNdvi).toBe(0.74);
      expect(features.baselineNdvi).toBe(0.65);
      expect(features.dataPointsCount).toBe(0);
      expect(features.compositeRiskScore).toBe(10);
    });

    it("calculates exact lead time days until critical breach (<0.40)", () => {
      // current NDVI = 0.55, velocity = -0.15 / 30 days -> daily slope = -0.005 / day
      // Days to cross 0.40 = (0.40 - 0.55) / (-0.005) = 30 days
      const days = calculateDaysUntilThresholdBreach(0.55, -0.15, 0.40);
      expect(days).toBe(30);

      // Already breached (<0.40)
      const breached = calculateDaysUntilThresholdBreach(0.35, -0.10, 0.40);
      expect(breached).toBe(0);

      // Positive velocity (improving, never breaches)
      const improving = calculateDaysUntilThresholdBreach(0.70, 0.05, 0.40);
      expect(improving).toBeNull();
    });
  });

  describe("2. Time-Series Trajectory Forecasting (Holt-Winters with Damped Trend)", () => {
    it("generates 30, 60, and 90-day forecast points with valid 95% confidence intervals", () => {
      const series: SpectralTimePoint[] = [
        { date: "2025-10-01", ndvi: 0.65 },
        { date: "2025-12-01", ndvi: 0.70 },
        { date: "2026-02-01", ndvi: 0.76 },
      ];

      const forecast = forecastNdviTrajectory(series, [30, 60, 90]);
      expect(forecast.length).toBe(6); // 3 historical + 3 forecast

      const f30 = forecast.find((p) => p.daysAhead === 30);
      const f60 = forecast.find((p) => p.daysAhead === 60);
      const f90 = forecast.find((p) => p.daysAhead === 90);

      expect(f30).toBeDefined();
      expect(f60).toBeDefined();
      expect(f90).toBeDefined();

      // Confidence Interval Ordering: lowerBound <= predicted <= upperBound
      expect(f30!.lowerBound95).toBeLessThanOrEqual(f30!.predictedNdvi);
      expect(f30!.predictedNdvi).toBeLessThanOrEqual(f30!.upperBound95);

      expect(f90!.lowerBound95).toBeLessThanOrEqual(f90!.predictedNdvi);
      expect(f90!.predictedNdvi).toBeLessThanOrEqual(f90!.upperBound95);
    });
  });

  describe("3. ML Threat Classification & Risk Alerts (6-Class Decision Matrix)", () => {
    it("detects Drought & Moisture Shock with calculated lead time", () => {
      const droughtSeries: SpectralTimePoint[] = [
        { date: "2026-01-15", ndvi: 0.74, ndre: 0.60, ndwi: 0.25, lstTempC: 27.0 },
        { date: "2026-02-15", ndvi: 0.65, ndre: 0.50, ndwi: 0.08, lstTempC: 30.0 },
        { date: "2026-03-15", ndvi: 0.52, ndre: 0.38, ndwi: -0.02, lstTempC: 34.0 },
      ];

      const alert = runPredictiveRiskModel(droughtSeries, 27.0);
      expect(alert.threatType).toBe("DROUGHT_SHOCK");
      expect(alert.severity).toBe("CRITICAL");
      expect(alert.riskProbabilityPct).toBeGreaterThanOrEqual(75);
      expect(alert.daysUntilCriticalBreach).toBeGreaterThan(0);
      expect(alert.recommendedAction).toContain("drip irrigation");
    });

    it("detects Encroachment & Illegal Tree Felling from abrupt catastrophic drop", () => {
      const clearingSeries: SpectralTimePoint[] = [
        { date: "2026-02-01", ndvi: 0.82, ndre: 0.70, ndwi: 0.35 },
        { date: "2026-02-20", ndvi: 0.42, ndre: 0.30, ndwi: 0.05 }, // -0.40 drop in 19 days
      ];

      const alert = runPredictiveRiskModel(clearingSeries);
      expect(alert.threatType).toBe("ENCROACHMENT_CLEARING");
      expect(alert.severity).toBe("CRITICAL");
      expect(alert.riskProbabilityPct).toBeGreaterThanOrEqual(90);
      expect(alert.recommendedAction).toContain("ranger");
    });

    it("detects Pest & Biological Defoliation from suppressed RedEdge ratio", () => {
      const pestSeries: SpectralTimePoint[] = [
        { date: "2026-01-10", ndvi: 0.76, ndre: 0.65, ndwi: 0.30 },
        { date: "2026-02-20", ndvi: 0.61, ndre: 0.35, ndwi: 0.28 }, // NDRE dropped sharply while NDWI is good
      ];

      const alert = runPredictiveRiskModel(pestSeries);
      expect(alert.threatType).toBe("PEST_DEFOLIATION");
      expect(alert.severity).toBe("HIGH");
      expect(alert.recommendedAction).toContain("Neem Oil");
    });

    it("detects Soil Salinization & Waterlogging / Root Hypoxia", () => {
      const waterlogSeries: SpectralTimePoint[] = [
        { date: "2026-01-05", ndvi: 0.74, ndre: 0.60, ndwi: 0.40 },
        { date: "2026-02-10", ndvi: 0.68, ndre: 0.48, ndwi: 0.45 },
        { date: "2026-03-18", ndvi: 0.60, ndre: 0.42, ndwi: 0.48 }, // High NDWI with declining NDVI and low RedEdge
      ];

      const alert = runPredictiveRiskModel(waterlogSeries);
      expect(alert.threatType).toBe("SOIL_SALINIZATION");
      expect(alert.severity).toBe("HIGH");
      expect(alert.recommendedAction).toContain("drainage channels");
    });

    it("detects Wildfire Susceptibility from severe thermal radiance and dry fuel", () => {
      const fireSeries: SpectralTimePoint[] = [
        { date: "2026-01-15", ndvi: 0.68, ndre: 0.54, ndwi: 0.10, lstTempC: 30.0 },
        { date: "2026-02-20", ndvi: 0.58, ndre: 0.44, ndwi: -0.05, lstTempC: 35.5 },
        { date: "2026-03-25", ndvi: 0.46, ndre: 0.32, ndwi: -0.15, lstTempC: 39.5 }, // LST anomaly > 4.5°C
      ];

      const alert = runPredictiveRiskModel(fireSeries, 28.0);
      expect(alert.threatType).toBe("WILDFIRE_SUSCEPTIBILITY");
      expect(alert.severity).toBe("HIGH");
      expect(alert.recommendedAction).toContain("firebreaks");
    });

    it("classifies healthy canopy accretion when NDVI trajectory expands", () => {
      const healthySeries: SpectralTimePoint[] = [
        { date: "2025-10-01", ndvi: 0.60, ndre: 0.45, ndwi: 0.20 },
        { date: "2025-12-01", ndvi: 0.68, ndre: 0.52, ndwi: 0.25 },
        { date: "2026-02-01", ndvi: 0.75, ndre: 0.60, ndwi: 0.30 },
      ];

      const alert = runPredictiveRiskModel(healthySeries);
      expect(alert.threatType).toBe("CANOPY_ACCRETION");
      expect(alert.severity).toBe("LOW");
      expect(alert.riskProbabilityPct).toBeLessThan(20);
    });
  });

  describe("4. Task Dispatch Integration", () => {
    it("generates an automated field verification task payload successfully", async () => {
      const alert = runPredictiveRiskModel([
        { date: "2026-01-01", ndvi: 0.70, ndwi: 0.10 },
        { date: "2026-02-01", ndvi: 0.52, ndwi: -0.05 },
      ]);

      const dispatchResult = await dispatchPredictiveRiskFieldTask(alert, "test-plot-id", "test-project-id");
      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.taskId).toBeDefined();
    });
  });
});
