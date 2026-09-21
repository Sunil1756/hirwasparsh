import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeSpectralIndicesFromBands,
  fetchRealSentinel2Telemetry,
  fetchTreeCoordinateNdvi,
} from "@/lib/sentinel2RealService";
import {
  computePerceptualDHash,
  calculateCompositeAiVerificationScore,
  analyzeTreePhotoWithBotanicalAi,
} from "@/lib/geminiBotanicalVision";

const mockInsert = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockFrom = vi.fn(() => ({
  insert: mockInsert.mockResolvedValue({ error: null }),
  update: mockUpdate,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe("External API Integration & Machine Intelligence Backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Copernicus Sentinel-2 L2A Remote Sensing Engine", () => {
    it("computes multi-spectral indices (NDVI, NDRE, NDWI, EVI, SAVI) mathematically from BOA reflectance bands", () => {
      const indices = computeSpectralIndicesFromBands({
        b02Blue: 0.038,
        b03Green: 0.088,
        b04Red: 0.052,
        b05RedEdge: 0.185,
        b08Nir: 0.440,
        b11Swir: 0.145,
        areaHectares: 2.0,
      });

      // Expected NDVI = (0.440 - 0.052) / (0.440 + 0.052) = 0.388 / 0.492 ≈ 0.79
      expect(indices.ndvi).toBeCloseTo(0.79, 2);
      expect(indices.ndre).toBeGreaterThan(0.3);
      expect(indices.evi).toBeGreaterThan(0);
      expect(indices.savi).toBeGreaterThan(0);
      expect(indices.surfaceTempC).toBeLessThan(35);
      expect(indices.chlorophyllDensityUgCm2).toBeGreaterThan(20);
      expect(indices.biomassCarbonMTPerHa).toBeGreaterThan(40);
      expect(indices.totalCarbonStockCo2eMT).toBeGreaterThan(0);
      expect(indices.classification).toContain("Dense Healthy Canopy");
    });

    it("identifies barren terrain and moisture-stressed foliage based on spectral thresholds", () => {
      const barrenIndices = computeSpectralIndicesFromBands({
        b02Blue: 0.18,
        b03Green: 0.20,
        b04Red: 0.25,
        b05RedEdge: 0.26,
        b08Nir: 0.28,
        b11Swir: 0.32,
      });
      // NDVI = (0.28 - 0.25) / (0.28 + 0.25) = 0.03 / 0.53 ≈ 0.06
      expect(barrenIndices.ndvi).toBeLessThan(0.28);
      expect(barrenIndices.classification).toContain("Barren / Non-Vegetated Terrain");

      const dryStressedIndices = computeSpectralIndicesFromBands({
        b02Blue: 0.04,
        b03Green: 0.09,
        b04Red: 0.08,
        b05RedEdge: 0.21,
        b08Nir: 0.52,
        b11Swir: 0.42, // high SWIR relative to NIR -> low foliar moisture index
      });
      expect(dryStressedIndices.classification).toContain("Moisture Stressed");
    });

    it("fetches Sentinel-2 telemetry, calculates regional calibration and persists to database", async () => {
      // Satara, Maharashtra (Ghats region)
      const telemetry = await fetchRealSentinel2Telemetry(
        17.685,
        73.985,
        undefined,
        "plot-123",
        "Satara North"
      );

      expect(telemetry.plotId).toBe("plot-123");
      expect(telemetry.tileId).toContain("T43");
      expect(telemetry.ndvi).toBeGreaterThan(0.5);
      expect(telemetry.elevationM).toBe(750);
      expect(mockFrom).toHaveBeenCalledWith("satellite_telemetry");
      expect(mockFrom).toHaveBeenCalledWith("plots");
    });

    it("generates 6-month historical time-series with seasonal phenology curves", async () => {
      const result = await fetchTreeCoordinateNdvi({
        treeId: "tree-789",
        latitude: 18.5204,
        longitude: 73.8567,
        treeName: "Pune Banyan 01",
        species: "Ficus benghalensis",
      });

      expect(result.historicalTimeSeries.length).toBe(6);
      expect(result.historicalTimeSeries[0].month).toBeDefined();
      expect(result.historicalTimeSeries[0].ndvi).toBeGreaterThan(0);
      expect(result.deltaNdvi6MonthsPct).toBeDefined();
      expect(result.vegetationVigorStatus).toBeDefined();
      expect(result.healthScore).toBeGreaterThan(40);
      expect(mockFrom).toHaveBeenCalledWith("trees");
    });
  });

  describe("2. Gemini Botanical Vision & Multi-Modal Verification AI", () => {
    it("computes 64-bit difference hash (dHash) for duplicate photo detection", async () => {
      const hash = await computePerceptualDHash("https://example.com/tree.jpg");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("strictly isolates institutional NGO/CSR projects from individual auto-approval", () => {
      const sampleAiResult = {
        isLivingTree: true,
        speciesCommon: "Neem",
        speciesScientific: "Azadirachta indica",
        botanicalFamily: "Meliaceae",
        crownHealthScore: 95,
        vitalityStatus: "healthy" as const,
        growthStage: "young_tree" as const,
        confidenceScore: 0.95,
        detectedStressFactors: [],
        fraudRiskScore: 2,
        fraudFlags: [],
        perceptualHash: "dhash_1234567890abcdef",
        aiReport: "Verified living tree",
      };

      // 1. Institutional NGO context
      const ngoDecision = calculateCompositeAiVerificationScore(sampleAiResult, {
        accountType: "ngo",
        plantingType: "organization",
        isIndividualPlanter: false,
      });

      expect(ngoDecision.isAutoApproved).toBe(false);
      expect(ngoDecision.routingDecision).toBe("institutional_mrv_audit_queue");
      expect(ngoDecision.rationale).toContain("Institutional NGO/CSR projects are isolated");

      // 2. Individual Planter context with high confidence
      const individualDecision = calculateCompositeAiVerificationScore(sampleAiResult, {
        accountType: "individual",
        isIndividualPlanter: true,
      });

      expect(individualDecision.isAutoApproved).toBe(true);
      expect(individualDecision.routingDecision).toBe("auto_approved");
    });

    it("rejects fraudulent or non-plant images and routes to fraud_rejected", () => {
      const fraudResult = {
        isLivingTree: false,
        speciesCommon: "Unknown Object",
        speciesScientific: "N/A",
        botanicalFamily: "N/A",
        crownHealthScore: 0,
        vitalityStatus: "not_a_tree_fraud" as const,
        growthStage: "sapling" as const,
        confidenceScore: 0.2,
        detectedStressFactors: ["Non-plant object detected"],
        fraudRiskScore: 90,
        fraudFlags: ["Computer screen photo"],
        perceptualHash: "dhash_screen_fraud",
        aiReport: "Fraudulent non-tree image",
      };

      const decision = calculateCompositeAiVerificationScore(fraudResult, {
        accountType: "individual",
        isIndividualPlanter: true,
      });

      expect(decision.isAutoApproved).toBe(false);
      expect(decision.routingDecision).toBe("fraud_rejected");
      expect(decision.rationale).toContain("flagged as non-plant object");
    });

    it("executes analyzeTreePhotoWithBotanicalAi fallback gracefully when API key is unconfigured", async () => {
      const result = await analyzeTreePhotoWithBotanicalAi("data:image/jpeg;base64,mockdata", "Neem");
      expect(result.isLivingTree).toBe(true);
      expect(result.speciesCommon).toBe("Neem");
      expect(result.vitalityStatus).toBe("healthy");
      expect(result.confidenceScore).toBeGreaterThan(0.8);
      expect(result.isGenuineInGroundPlantation).toBe(true);
    });
  });
});
