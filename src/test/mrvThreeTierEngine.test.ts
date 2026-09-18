import { describe, it, expect } from "vitest";
import {
  evaluateTier1GroundEvidence,
  evaluateTier2SatelliteSpectral,
  evaluateTier3FusionTrustScore,
} from "../lib/mrvThreeTierEngine";

describe("3-Tier Multi-Source MRV Verification & Cryptographic Trust Engine", () => {
  describe("1. Tier 1 (Months 1–12): Ground & Drone Truth Protocol", () => {
    it("verifies genuine ground-truth submission with 3-photos, AI botanical vision, and EXIF GPS", () => {
      const result = evaluateTier1GroundEvidence({
        totalPlantedTrees: 1000,
        verifiedGroundTrees: 950,
        hasInitial3Photos: true,
        aiBotanicalConfidence: 94,
        exifGpsValid: true,
        growthCheckinsCount: 3,
        hasDroneOrthomosaic: true,
      });

      expect(result.isPassed).toBe(true);
      expect(result.tier1Score).toBe(100); // 25 + 25 + 20 + 15 + 15
      expect(result.status).toBe("verified");
      expect(result.checks.aiVisionPassed).toBe(true);
      expect(result.checks.exifGpsPassed).toBe(true);
      expect(result.checks.antiFraudPassed).toBe(true);
    });

    it("immediately rejects submissions flagged for perceptual dHash duplicate fraud", () => {
      const result = evaluateTier1GroundEvidence({
        totalPlantedTrees: 500,
        verifiedGroundTrees: 500,
        hasInitial3Photos: true,
        dhashDuplicateFraudDetected: true,
      });

      expect(result.isPassed).toBe(false);
      expect(result.tier1Score).toBe(0);
      expect(result.status).toBe("rejected");
      expect(result.checks.antiFraudPassed).toBe(false);
      expect(result.summary).toContain("Fraud Alert");
    });
  });

  describe("2. Tier 2 (Years 1–5+): Copernicus Sentinel-2 STAC Multi-Spectral Vigor", () => {
    it("computes spectral indices and verifies accretion delta with pre-existing tree baseline", () => {
      const result = evaluateTier2SatelliteSpectral({
        plotAreaAcres: 12.5,
        baselineNdvi: 0.62,
        currentMeanNdvi: 0.78, // Delta = +0.16
        overpassCount: 8,
        baselineExistingTrees: 754,
        targetNewTrees: 1000,
      });

      expect(result.isPassed).toBe(true);
      expect(result.tier2Score).toBe(100);
      expect(result.trend).toBe("accretion");
      expect(result.ndviDelta).toBe(0.16);
      expect(result.totalCanopyCapacity).toBe(1754); // 754 + 1000
      expect(result.carbonAdditionalityVerified).toBe(true);
    });

    it("handles drought or vegetation stress where NDVI drops below baseline", () => {
      const result = evaluateTier2SatelliteSpectral({
        plotAreaAcres: 5.0,
        baselineNdvi: 0.70,
        currentMeanNdvi: 0.50, // Delta = -0.20
        overpassCount: 4,
      });

      expect(result.trend).toBe("stress");
      expect(result.ndviDelta).toBe(-0.2);
      expect(result.carbonAdditionalityVerified).toBe(false);
    });
  });

  describe("3. Tier 3 (Verification & Fusion): 5% Ranger Audit & Cryptographic Trust Seal", () => {
    it("awards Zero-Greenwashing Gold Tier when Tier 1, Tier 2, and 5% Ranger Audit are all satisfied", () => {
      const tier1 = evaluateTier1GroundEvidence({
        totalPlantedTrees: 1000,
        verifiedGroundTrees: 950,
        hasInitial3Photos: true,
        aiBotanicalConfidence: 95,
        hasDroneOrthomosaic: true,
        growthCheckinsCount: 3,
      });

      const tier2 = evaluateTier2SatelliteSpectral({
        plotAreaAcres: 10.0,
        baselineNdvi: 0.60,
        currentMeanNdvi: 0.76,
        overpassCount: 6,
        baselineExistingTrees: 754,
        targetNewTrees: 1000,
      });

      const fusion = evaluateTier3FusionTrustScore({
        tier1,
        tier2,
        fieldScoutRangerAuditsCount: 55, // 55 >= 5% of 1000 (50)
        totalPlantedTrees: 1000,
        weatherSuitabilityScore: 90,
        daysSinceLastUpdate: 5,
        projectId: "proj-sahyadri-001",
        projectName: "Sahyadri Watershed Basin",
      });

      expect(fusion.fivePercentAuditSatisfied).toBe(true);
      expect(fusion.requiredAuditTreesCount).toBe(50);
      expect(fusion.actualAuditTreesCount).toBe(55);
      expect(fusion.overallTrustScore).toBeGreaterThanOrEqual(80);
      expect(fusion.verificationTier).toBe("zero_greenwashing_gold");
      expect(fusion.isEligibleForCarbonCredits).toBe(true);
      expect(fusion.isBrsrEsgCompliant).toBe(true);
      expect(fusion.cryptographicSeal.hashDigest).toMatch(/^0x[a-f0-9]+/);
      expect(fusion.cryptographicSeal.serialNumber).toContain("GE-MRV-");
    });

    it("applies penalty and downgrades tier when 5% Ranger Audit is missing or time decay occurs", () => {
      const tier1 = evaluateTier1GroundEvidence({
        totalPlantedTrees: 1000,
        verifiedGroundTrees: 900,
        hasInitial3Photos: true,
      });

      const tier2 = evaluateTier2SatelliteSpectral({
        plotAreaAcres: 10.0,
        baselineNdvi: 0.65,
        currentMeanNdvi: 0.70,
        overpassCount: 3,
      });

      const fusion = evaluateTier3FusionTrustScore({
        tier1,
        tier2,
        fieldScoutRangerAuditsCount: 0, // 0 < 50 required
        totalPlantedTrees: 1000,
        daysSinceLastUpdate: 65, // 35 days past grace period
      });

      expect(fusion.fivePercentAuditSatisfied).toBe(false);
      expect(fusion.weightsBreakdown.timeDecayPenalty).toBeGreaterThan(0);
      expect(fusion.verificationTier).not.toBe("zero_greenwashing_gold");
      expect(fusion.isEligibleForCarbonCredits).toBe(false);
    });
  });
});
