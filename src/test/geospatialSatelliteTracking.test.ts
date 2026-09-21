import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateGpsCoordinates,
  computeMultiSpectralIndices,
  getCalibratedRegionalBands,
  fetchSentinel2SceneForCoordinates,
  syncCoordinateSatelliteTelemetry,
  GeoCoordinate,
  MultiSpectralBands,
} from "@/lib/geospatialSatelliteService";
import {
  evaluateTreeSurvivalStatus,
  generate36MonthSurvivalTrajectory,
  calculatePlotSurvivalOverview,
  updateTreeSurvivalInDatabase,
  TreeSurvivalEvaluationInput,
} from "@/lib/treeSurvivalTrackingEngine";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: "test-telemetry-uuid" }, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: { id: "test-tree-uuid" }, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
          }),
        }),
      }),
    },
  };
});

describe("Geospatial Satellite Monitoring & GPS Survival Tracking Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GPS Coordinate Validation & Anti-Spoofing", () => {
    it("validates correct GPS coordinates within standard bounds", () => {
      const coord: GeoCoordinate = {
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 4.8,
        elevationMeters: 560,
      };

      const res = validateGpsCoordinates(coord);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.isWithinIndiaBounds).toBe(true);
      expect(res.accuracyMeters).toBe(4.8);
      expect(res.elevationM).toBe(560);
    });

    it("rejects invalid out-of-range coordinates", () => {
      const res = validateGpsCoordinates({
        latitude: 110.5, // > 90
        longitude: -205.0, // < -180
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
      expect(res.errors[0]).toContain("Latitude");
      expect(res.errors[1]).toContain("Longitude");
    });

    it("rejects Null Island (0, 0) placeholder coordinates", () => {
      const res = validateGpsCoordinates({ latitude: 0, longitude: 0 });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("Null Island");
    });

    it("surfaces warning for low accuracy GPS lock", () => {
      const res = validateGpsCoordinates({
        latitude: 19.7512,
        longitude: 75.7139,
        accuracyMeters: 45.0,
      });

      expect(res.isValid).toBe(true);
      expect(res.warnings.length).toBeGreaterThanOrEqual(1);
      expect(res.warnings[0]).toContain("accuracy is low");
    });
  });

  describe("2. Multi-Spectral Surface Reflectance & Index Calculations", () => {
    it("computes accurate NDVI, NDRE, NDWI, EVI, and SAVI from Sentinel-2 bands", () => {
      const bands: MultiSpectralBands = {
        b02Blue: 0.035,
        b03Green: 0.090,
        b04Red: 0.045,
        b05RedEdge: 0.210,
        b08Nir: 0.510,
        b11Swir: 0.120,
      };

      const indices = computeMultiSpectralIndices(bands);

      // NDVI = (0.510 - 0.045) / (0.510 + 0.045) = 0.465 / 0.555 ≈ 0.84
      expect(indices.ndvi).toBeCloseTo(0.84, 1);
      expect(indices.ndvi).toBeGreaterThan(0.70);

      // NDRE = (0.510 - 0.210) / (0.510 + 0.210) = 0.300 / 0.720 ≈ 0.42
      expect(indices.ndre).toBeCloseTo(0.42, 1);

      // NDWI = (0.090 - 0.510) / (0.090 + 0.510) = -0.420 / 0.600 = -0.70
      expect(indices.ndwi).toBeLessThanOrEqual(0.60);

      // Biomass & thermal cooling
      expect(indices.standingBiomassMTPerHa).toBeGreaterThan(20);
      expect(indices.surfaceTempC).toBeLessThanOrEqual(32);
      expect(indices.canopyCoveragePct).toBeGreaterThanOrEqual(50);
    });

    it("extracts region-specific calibrated reflectance for Western Ghats vs Vidarbha", () => {
      const ghatsBands = getCalibratedRegionalBands(18.5, 73.8); // Western Ghats
      const vidarbhaBands = getCalibratedRegionalBands(21.1, 79.0); // Vidarbha

      // Western Ghats has higher NIR and lower Red (denser canopy)
      expect(ghatsBands.b08Nir).toBeGreaterThan(vidarbhaBands.b08Nir);
      expect(ghatsBands.b04Red).toBeLessThan(vidarbhaBands.b04Red);
    });
  });

  describe("3. Sentinel-2 STAC Telemetry Query & Database Persistence", () => {
    it("fetches and constructs complete Sentinel-2 overpass telemetry for coordinates", async () => {
      const scene = await fetchSentinel2SceneForCoordinates(18.5204, 73.8567);

      expect(scene).toBeDefined();
      expect(scene.tileId).toBeDefined();
      expect(scene.acquisitionDate).toBeDefined();
      expect(scene.indices.ndvi).toBeGreaterThan(0.50);
      expect(scene.agroWeather).toBeDefined();
      expect(scene.agroWeather!.soilMoisture0to7cmPct).toBeGreaterThan(0);
    });

    it("syncs coordinate telemetry to Supabase database without throwing", async () => {
      const res = await syncCoordinateSatelliteTelemetry(
        18.5204,
        73.8567,
        "test-tree-123",
        "test-plot-456"
      );

      expect(res.success).toBe(true);
      expect(res.scene).toBeDefined();
      expect(res.scene.centerLat).toBeCloseTo(18.5204, 2);
    });
  });

  describe("4. Space-Borne Tree Survival Status & Multi-Source Fusion Engine", () => {
    it("classifies high NDVI & positive NDWI as Healthy Thriving Canopy", () => {
      const input: TreeSurvivalEvaluationInput = {
        treeId: "tree-001",
        latitude: 18.5204,
        longitude: 73.8567,
        currentNdvi: 0.82,
        historicalBaselineNdvi: 0.75,
        currentNdwi: 0.25,
        monthsMonitored: 12,
        latestGroundCheckIn: {
          status: "healthy",
          checkedAt: new Date().toISOString(),
          aiConfidence: 95,
        },
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(result.survivalStatus).toBe("healthy");
      expect(result.survivalProbabilityPct).toBeGreaterThanOrEqual(85);
      expect(result.threatLevel).toBe("NONE");
      expect(result.requiresImmediateFieldDispatch).toBe(false);
      expect(result.statusBadge.label).toContain("Thriving");
    });

    it("classifies negative NDWI as Moisture Stressed with recommended irrigation", () => {
      const input: TreeSurvivalEvaluationInput = {
        treeId: "tree-002",
        latitude: 19.1200,
        longitude: 75.8000,
        currentNdvi: 0.58,
        historicalBaselineNdvi: 0.70,
        currentNdwi: -0.12, // severe moisture deficit
        monthsMonitored: 8,
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(result.survivalStatus).toBe("moisture_stressed");
      expect(result.threatLevel).toBe("HIGH");
      expect(result.recommendedIntervention).toContain("drip irrigation");
      expect(result.requiresImmediateFieldDispatch).toBe(true);
      expect(result.statusBadge.label).toContain("Moisture Stressed");
    });

    it("classifies sharp NDVI drop as Critical Mortality Risk requiring emergency dispatch", () => {
      const input: TreeSurvivalEvaluationInput = {
        treeId: "tree-003",
        latitude: 19.5000,
        longitude: 76.2000,
        currentNdvi: 0.32,
        historicalBaselineNdvi: 0.78,
        currentNdwi: -0.20,
        monthsMonitored: 14,
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(result.survivalStatus).toBe("critical_risk");
      expect(result.threatLevel).toBe("CRITICAL");
      expect(result.requiresImmediateFieldDispatch).toBe(true);
      expect(result.recommendedIntervention).toContain("emergency field ranger");
    });

    it("classifies physical audit 'dead' confirmation as Dead with replanting task", () => {
      const input: TreeSurvivalEvaluationInput = {
        treeId: "tree-004",
        latitude: 19.5000,
        longitude: 76.2000,
        currentNdvi: 0.18,
        currentNdwi: -0.30,
        latestGroundCheckIn: {
          status: "dead",
          checkedAt: new Date().toISOString(),
          aiConfidence: 98,
        },
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(result.survivalStatus).toBe("dead");
      expect(result.threatLevel).toBe("CRITICAL");
      expect(result.recommendedIntervention).toContain("replanting");
    });

    it("generates 36-month survival assurance curve with unmonitored baseline contrast", () => {
      const trajectory = generate36MonthSurvivalTrajectory(92, 0.74, 6);
      expect(trajectory).toHaveLength(36);

      const m1 = trajectory[0];
      const m12 = trajectory[11];
      const m36 = trajectory[35];

      expect(m1.month).toBe(1);
      expect(m36.month).toBe(36);

      // Monitored survival stays high
      expect(m36.satelliteSurvivalPct).toBeGreaterThanOrEqual(88);

      // Unmonitored baseline degrades significantly over 3 years
      expect(m36.unmonitoredBaselinePct).toBeLessThan(60);
      expect(m36.satelliteSurvivalPct).toBeGreaterThan(m36.unmonitoredBaselinePct);
    });

    it("aggregates plot-level survival overview and avoided mortality gain", () => {
      const sampleTrees = [
        { id: "t1", survival_status: "healthy", current_ndvi: 0.80, current_ndwi: 0.25 },
        { id: "t2", survival_status: "alive", current_ndvi: 0.74, current_ndwi: 0.20 },
        { id: "t3", survival_status: "moisture_stressed", current_ndvi: 0.55, current_ndwi: -0.08 },
        { id: "t4", survival_status: "dead", current_ndvi: 0.15, current_ndwi: -0.25 },
      ];

      const overview = calculatePlotSurvivalOverview(sampleTrees);
      expect(overview.totalTrees).toBe(4);
      expect(overview.aliveCount).toBe(3);
      expect(overview.deadCount).toBe(1);
      expect(overview.verifiedSurvivalRatePct).toBe(75.0); // 3 / 4 = 75%
      expect(overview.mortalityAvoidanceGainPct).toBe(23.0); // 75 - 52 = 23%
    });

    it("updates tree survival in database successfully", async () => {
      const evalResult = evaluateTreeSurvivalStatus({
        treeId: "test-update-tree",
        latitude: 18.5204,
        longitude: 73.8567,
        currentNdvi: 0.78,
      });

      const dbRes = await updateTreeSurvivalInDatabase("test-update-tree", evalResult);
      expect(dbRes.success).toBe(true);
    });
  });
});
