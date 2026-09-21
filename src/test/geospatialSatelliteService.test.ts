import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateGpsCoordinates,
  computeMultiSpectralIndices,
  fetchSentinel2SceneForCoordinates,
  MultiSpectralBands,
} from "@/lib/geospatialSatelliteService";
import {
  evaluateTreeSurvivalStatus,
  calculatePlotSurvivalOverview,
} from "@/lib/treeSurvivalTrackingEngine";
import {
  calculateCompositeAiVerificationScore,
  BotanicalAiAnalysisResult,
} from "@/lib/geminiBotanicalVision";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe("Geospatial Remote Sensing & AI Verification Workflow Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GPS Coordinate Validation & Anti-Spoofing", () => {
    it("validates legitimate coordinates within Indian agroforestry boundaries", () => {
      const coord = { latitude: 19.076, longitude: 72.8777, accuracyMeters: 4.2, elevationMeters: 14 };
      const res = validateGpsCoordinates(coord);
      expect(res.isValid).toBe(true);
      expect(res.isWithinIndiaBounds).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.warnings.length).toBe(0);
    });

    it("rejects Null Island (0, 0) coordinates", () => {
      const coord = { latitude: 0, longitude: 0, accuracyMeters: 5 };
      const res = validateGpsCoordinates(coord);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain("GPS coordinate (0, 0) is at Null Island and rejected as invalid placeholder.");
    });

    it("rejects out-of-range latitude and longitude", () => {
      const coord = { latitude: 95.5, longitude: -200, accuracyMeters: 5 };
      const res = validateGpsCoordinates(coord);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("flags low GPS accuracy fixes above 30m with a warning", () => {
      const coord = { latitude: 18.5204, longitude: 73.8567, accuracyMeters: 45 };
      const res = validateGpsCoordinates(coord);
      expect(res.isValid).toBe(true);
      expect(res.warnings.some((w) => w.includes("GPS accuracy is low"))).toBe(true);
    });
  });

  describe("2. Multi-Spectral Band Indices Calculation", () => {
    it("correctly calculates NDVI, NDRE, NDWI, EVI, and SAVI", () => {
      const bands: MultiSpectralBands = {
        b02Blue: 0.04,
        b03Green: 0.08,
        b04Red: 0.05,
        b05RedEdge: 0.18,
        b08Nir: 0.45,
        b11Swir: 0.12,
      };

      const indices = computeMultiSpectralIndices(bands);

      // NDVI = (NIR - Red) / (NIR + Red) = (0.45 - 0.05) / (0.45 + 0.05) = 0.40 / 0.50 = 0.80
      expect(indices.ndvi).toBeCloseTo(0.8, 2);

      // NDRE = (NIR - RedEdge) / (NIR + RedEdge) = (0.45 - 0.18) / (0.45 + 0.18) = 0.27 / 0.63 ≈ 0.43
      expect(indices.ndre).toBeGreaterThan(0.35);

      // NDWI = (Green - NIR) / (Green + NIR) = (0.08 - 0.45) / (0.08 + 0.45) = -0.37 / 0.53 ≈ -0.70 clamped
      expect(indices.ndwi).toBeDefined();

      // SAVI with L = 0.5
      expect(indices.savi).toBeGreaterThan(0.4);
      expect(indices.standingBiomassMTPerHa).toBeGreaterThan(0);
    });

    it("fetches calibrated Sentinel-2 scene for coordinates without crashing", async () => {
      const scene = await fetchSentinel2SceneForCoordinates(19.7515, 75.7139);
      expect(scene.tileId).toBeDefined();
      expect(scene.indices.ndvi).toBeGreaterThanOrEqual(-1.0);
      expect(scene.indices.ndvi).toBeLessThanOrEqual(1.0);
      expect(scene.bands.b08Nir).toBeGreaterThan(0);
    });
  });

  describe("3. Botanical AI Verification & Automated Scoring Engine", () => {
    it("auto-approves high-confidence genuine living trees", () => {
      const result: BotanicalAiAnalysisResult = {
        isLivingTree: true,
        speciesCommon: "Neem",
        speciesScientific: "Azadirachta indica",
        botanicalFamily: "Meliaceae",
        crownHealthScore: 92,
        vitalityStatus: "healthy",
        growthStage: "young_tree",
        confidenceScore: 0.94,
        detectedStressFactors: [],
        fraudRiskScore: 3,
        fraudFlags: [],
        perceptualHash: "a1b2c3d4e5f60718",
        aiReport: "Healthy specimen.",
      };

      const decision = calculateCompositeAiVerificationScore(result, {
        accountType: "individual",
        plantingType: "individual",
      });
      expect(decision.isAutoApproved).toBe(true);
      expect(decision.routingDecision).toBe("auto_approved");
      expect(decision.compositeScore).toBeGreaterThanOrEqual(70);
    });

    it("strictly isolates institutional NGO and CSR projects from individual single-photo auto-approval", () => {
      const result: BotanicalAiAnalysisResult = {
        isLivingTree: true,
        speciesCommon: "Teak",
        speciesScientific: "Tectona grandis",
        botanicalFamily: "Lamiaceae",
        crownHealthScore: 95,
        vitalityStatus: "healthy",
        growthStage: "young_tree",
        confidenceScore: 0.96,
        detectedStressFactors: [],
        fraudRiskScore: 2,
        fraudFlags: [],
        perceptualHash: "ffff111122223333",
        aiReport: "High-density plot planting candidate.",
      };

      // 1. NGO Account Context
      const ngoDecision = calculateCompositeAiVerificationScore(result, {
        accountType: "ngo",
        plantingType: "organization",
        projectId: "proj-ngo-001",
      });
      expect(ngoDecision.isAutoApproved).toBe(false);
      expect(ngoDecision.routingDecision).toBe("institutional_mrv_audit_queue");
      expect(ngoDecision.rationale).toContain("Institutional NGO/CSR");

      // 2. CSR Corporate Context
      const csrDecision = calculateCompositeAiVerificationScore(result, {
        accountType: "csr",
        plantingType: "csr_sponsored",
        projectId: "proj-csr-002",
      });
      expect(csrDecision.isAutoApproved).toBe(false);
      expect(csrDecision.routingDecision).toBe("institutional_mrv_audit_queue");
    });

    it("rejects non-tree fraud or synthetic duplicate images", () => {
      const result: BotanicalAiAnalysisResult = {
        isLivingTree: false,
        speciesCommon: "Unknown",
        speciesScientific: "N/A",
        botanicalFamily: "N/A",
        crownHealthScore: 10,
        vitalityStatus: "not_a_tree_fraud",
        growthStage: "sapling",
        confidenceScore: 0.3,
        detectedStressFactors: ["Synthetic materials"],
        fraudRiskScore: 85,
        fraudFlags: ["Indoor computer screen detected"],
        perceptualHash: "0000000000000000",
        aiReport: "Fraud detected.",
      };

      const decision = calculateCompositeAiVerificationScore(result, { accountType: "individual" });
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.routingDecision).toBe("fraud_rejected");
    });

    it("routes borderline cases to forestry supervisor manual review queue", () => {
      const result: BotanicalAiAnalysisResult = {
        isLivingTree: true,
        speciesCommon: "Banyan",
        speciesScientific: "Ficus benghalensis",
        botanicalFamily: "Moraceae",
        crownHealthScore: 60,
        vitalityStatus: "moderate_stress",
        growthStage: "sapling",
        confidenceScore: 0.68,
        detectedStressFactors: ["Mild leaf browning"],
        fraudRiskScore: 15,
        fraudFlags: [],
        perceptualHash: "12345678abcdef01",
        aiReport: "Moderate foliage stress.",
      };

      const decision = calculateCompositeAiVerificationScore(result, { accountType: "individual" });
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.routingDecision).toBe("manual_review_queue");
    });
  });

  describe("4. Tree Survival Status Tracking & 36-Month Trajectory", () => {
    it("evaluates healthy tree survival and computes trajectory curves", () => {
      const input = {
        treeId: "test-tree-001",
        treeName: "Pecan Plot #1",
        species: "Azadirachta indica",
        latitude: 19.8,
        longitude: 75.8,
        currentNdvi: 0.78,
        historicalBaselineNdvi: 0.65,
        currentNdwi: 0.22,
        monthsMonitored: 12,
        latestGroundCheckIn: {
          status: "healthy" as const,
          checkedAt: new Date().toISOString(),
          aiConfidence: 0.95,
        },
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(result.survivalStatus).toBe("healthy");
      expect(result.survivalProbabilityPct).toBeGreaterThanOrEqual(80);
      expect(result.threatLevel).toBe("NONE");
      expect(result.requiresImmediateFieldDispatch).toBe(false);
      expect(result.trajectory36Months.length).toBe(36);
      expect(result.trajectory36Months[35].satelliteSurvivalPct).toBeGreaterThan(
        result.trajectory36Months[35].unmonitoredBaselinePct
      );
    });

    it("flags moisture stressed trees requiring field intervention", () => {
      const input = {
        treeId: "test-tree-002",
        treeName: "Arid Plot #4",
        species: "Tectona grandis",
        latitude: 19.8,
        longitude: 75.8,
        currentNdvi: 0.42,
        historicalBaselineNdvi: 0.70,
        currentNdwi: -0.15, // Severe foliar water deficit
        monthsMonitored: 8,
      };

      const result = evaluateTreeSurvivalStatus(input);
      expect(["moisture_stressed", "critical_risk"]).toContain(result.survivalStatus);
      expect(result.requiresImmediateFieldDispatch).toBe(true);
      expect(result.recommendedIntervention.length).toBeGreaterThan(10);
    });

    it("aggregates plot-level survival metrics", () => {
      const trees = [
        {
          id: "1",
          latitude: 19.0,
          longitude: 72.0,
          currentNdvi: 0.8,
          historicalBaselineNdvi: 0.7,
        },
        {
          id: "2",
          latitude: 19.0,
          longitude: 72.0,
          currentNdvi: 0.75,
          historicalBaselineNdvi: 0.7,
        },
        {
          id: "3",
          latitude: 19.0,
          longitude: 72.0,
          currentNdvi: 0.3,
          historicalBaselineNdvi: 0.7,
          currentNdwi: -0.2,
        },
      ];

      const overview = calculatePlotSurvivalOverview(trees);
      expect(overview.totalTrees).toBe(3);
      expect(overview.aliveCount).toBeGreaterThanOrEqual(2);
      expect(overview.verifiedSurvivalRatePct).toBeGreaterThan(60);
      expect(overview.meanCanopyNdvi).toBeGreaterThan(0.5);
    });
  });
});
