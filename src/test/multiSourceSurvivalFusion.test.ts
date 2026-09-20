import { describe, it, expect, vi } from "vitest";
import {
  calculateSilviculturalGroundSurvival,
  calculateMultiSourceSurvivalConfidence,
  evaluateProjectMultiSourceSurvival,
} from "../lib/multiSourceSurvivalFusion";

describe("Multi-Source Fusion Survival Confidence Scoring Engine", () => {
  describe("1. Silvicultural Ground Survival Rate Calculations", () => {
    it("weights living trees at 1.0, stressed trees at 0.5, and dead trees at 0.0", () => {
      // 80 living, 20 stressed, 0 dead out of 100 total
      // Effective living = 80 + 0.5 * 20 = 90 -> 90.0%
      const result = calculateSilviculturalGroundSurvival(80, 20, 0);
      expect(result.rate).toBe(90.0);
      expect(result.totalAudited).toBe(100);
    });

    it("correctly penalizes dead trees with 0.0 weight", () => {
      // 70 living, 10 stressed, 20 dead out of 100
      // Effective living = 70 + 5 = 75 -> 75.0%
      const result = calculateSilviculturalGroundSurvival(70, 10, 20);
      expect(result.rate).toBe(75.0);
      expect(result.totalAudited).toBe(100);
    });

    it("handles 100% dead trees safely", () => {
      const result = calculateSilviculturalGroundSurvival(0, 0, 50);
      expect(result.rate).toBe(0.0);
      expect(result.totalAudited).toBe(50);
    });

    it("returns 100% when 0 trees have been audited (zero denominator guard)", () => {
      const result = calculateSilviculturalGroundSurvival(0, 0, 0);
      expect(result.rate).toBe(100);
      expect(result.totalAudited).toBe(0);
    });
  });

  describe("2. Pure Multi-Source Fusion Calculation", () => {
    it("achieves Gold Tier (Zero-Greenwashing) with high NDVI and 5% ground truth audit quota satisfied", () => {
      const result = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 1000,
        livingCount: 50, // 5% of 1000 is 50 trees (quota met)
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.82,
        baselineNdvi: 0.65,
        overpassCount: 6,
        weatherSuitabilityScore: 90,
        lastAuditDate: new Date().toISOString(), // fresh audit
      });

      expect(result.overallConfidenceScore).toBeGreaterThanOrEqual(80);
      expect(result.tier).toBe("zero_greenwashing_gold");
      expect(result.isCarbonMRVReady).toBe(true);
      expect(result.breakdown.auditMultiplier.isFullQuotaSatisfied).toBe(true);
      expect(result.breakdown.auditMultiplier.multiplier).toBe(1.0);
    });

    it("applies 5% audit multiplier penalty when ground sample quota is unmet", () => {
      // 1000 trees requires 50 trees quota. Only 5 audited -> partial multiplier 0.90
      const partialResult = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 1000,
        livingCount: 5,
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.74,
        baselineNdvi: 0.65,
        overpassCount: 4,
        lastAuditDate: new Date().toISOString(),
      });

      expect(partialResult.breakdown.auditMultiplier.isFullQuotaSatisfied).toBe(false);
      expect(partialResult.breakdown.auditMultiplier.multiplier).toBe(0.90);
    });

    it("applies time decay penalty when last audit is older than 30 days", () => {
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000).toISOString();

      const decayedResult = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 200,
        livingCount: 15,
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.75,
        overpassCount: 4,
        lastAuditDate: fortyFiveDaysAgo, // 15 days overdue -> 15 * 0.15 = 2.3 pts
      });

      expect(decayedResult.breakdown.timeDecay.isDecayed).toBe(true);
      expect(decayedResult.breakdown.timeDecay.penaltyPoints).toBeGreaterThan(0);
      expect(decayedResult.breakdown.timeDecay.summary).toContain("penalty applied");
    });

    it("correctly identifies moisture stress from declining NDVI and low NDWI", () => {
      const stressedResult = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 100,
        livingCount: 8,
        stressedCount: 12,
        deadCount: 2,
        currentMeanNdvi: 0.42,
        baselineNdvi: 0.65, // -0.23 drop
        meanNdwi: -0.05, // drought stress
        overpassCount: 3,
      });

      expect(stressedResult.healthStatus).toBe("moisture_stressed");
      expect(stressedResult.recommendedInterventions.length).toBeGreaterThan(0);
      expect(stressedResult.recommendedInterventions[0]).toContain("drip irrigation");
    });
  });

  describe("3. Database Project Level Evaluation", () => {
    it("evaluates a project safely with fallback when database record is unavailable", async () => {
      const result = await evaluateProjectMultiSourceSurvival("non-existent-project-id");
      expect(result).toBeDefined();
      expect(result.overallConfidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidenceScore).toBeLessThanOrEqual(100);
      expect(result.diagnosis).toContain("Multi-Source Fusion Analysis");
    });
  });
});
