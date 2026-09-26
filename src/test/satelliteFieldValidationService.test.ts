import { describe, it, expect, beforeEach } from "vitest";
import {
  satelliteFieldValidationService,
  SatelliteFieldValidationService,
} from "../services/satelliteFieldValidationService";

describe("PHASE 10 TASK 60 — Satellite vs Field Ground-Truth Cross-Validation Engine", () => {
  let service: SatelliteFieldValidationService;
  const testProjectId = "proj_deodhar_validation_60";

  beforeEach(() => {
    service = new SatelliteFieldValidationService();
  });

  describe("1. Ground-Truth to 10m Multi-Spectral Pixel Colocation", () => {
    it("successfully colocates individual field surveyed trees with 10m Sentinel-2 pixels", async () => {
      const report = await service.executeCrossValidation(testProjectId);

      expect(report.projectId).toBe(testProjectId);
      expect(report.colocatedTreeRecords.length).toBeGreaterThan(0);
      expect(report.discrepancyMatrix.totalTreesEvaluated).toBe(report.colocatedTreeRecords.length);

      for (const record of report.colocatedTreeRecords) {
        expect(record.treeId).toBeDefined();
        expect(record.species).toBeDefined();
        expect(record.fieldHealthStatus).toBeDefined();
        expect(record.fieldGpsAccuracyM).toBeGreaterThanOrEqual(0);
        expect(record.colocatedPixel.pixelLat).toBeGreaterThan(0);
        expect(record.colocatedPixel.pixelLng).toBeGreaterThan(0);
        expect(record.colocatedPixel.ndvi).toBeGreaterThanOrEqual(-1);
        expect(record.colocatedPixel.ndvi).toBeLessThanOrEqual(1);
        expect(record.colocatedPixel.savi).toBeDefined();
        expect(record.actionMessage).toBeDefined();
      }
    });
  });

  describe("2. Discrepancy Matrix & False Signal Diagnostics", () => {
    it("accurately classifies understory weed false positives and young sapling soil background masking", async () => {
      const report = await service.executeCrossValidation(testProjectId);
      const matrix = report.discrepancyMatrix;

      expect(matrix.totalTreesEvaluated).toBe(report.colocatedTreeRecords.length);
      expect(matrix.overallConcordanceRatePct).toBeGreaterThanOrEqual(0);
      expect(matrix.overallConcordanceRatePct).toBeLessThanOrEqual(100);

      const totalDiscrepancies =
        matrix.concordantHealthyCount +
        matrix.concordantStressedCount +
        matrix.understoryWeedFalsePositiveCount +
        matrix.youngSaplingSoilMaskingCount +
        matrix.boundaryEdgeNoiseCount;

      expect(totalDiscrepancies).toBe(matrix.totalTreesEvaluated);

      // Verify specific flags exist in dataset
      const hasWeedFalsePositives = report.colocatedTreeRecords.some(
        (rec) => rec.validationType === "understory_weed_false_positive"
      );
      const hasSoilMasking = report.colocatedTreeRecords.some(
        (rec) => rec.validationType === "young_sapling_soil_masking"
      );
      expect(hasWeedFalsePositives).toBe(true);
      expect(hasSoilMasking).toBe(true);
    });
  });

  describe("3. Multi-Source Bayesian Survival Weighting System", () => {
    it("weights field ground truth at 50%, satellite BOA NDVI at 30%, and agro-climatic telemetry at 20%", async () => {
      const report = await service.executeCrossValidation(testProjectId);
      const fusion = report.evidenceWeighting;

      expect(fusion.fieldGroundTruthWeightPct).toBe(50);
      expect(fusion.satelliteMultiSpectralWeightPct).toBe(30);
      expect(fusion.agroClimaticWeatherWeightPct).toBe(20);

      // Check weights sum to 100%
      expect(
        fusion.fieldGroundTruthWeightPct +
          fusion.satelliteMultiSpectralWeightPct +
          fusion.agroClimaticWeatherWeightPct
      ).toBe(100);

      expect(fusion.compositeSurvivalIndexPct).toBeGreaterThan(0);
      expect(fusion.compositeSurvivalIndexPct).toBeLessThanOrEqual(100);
      expect(fusion.confidenceInterval95Pct[0]).toBeLessThanOrEqual(fusion.compositeSurvivalIndexPct);
      expect(fusion.confidenceInterval95Pct[1]).toBeGreaterThanOrEqual(fusion.compositeSurvivalIndexPct);
    });
  });

  describe("4. Strict Scientific Limitation Disclosures", () => {
    it("ensures satellite data is explicitly marked as non-proof of young sapling survival", async () => {
      const report = await service.executeCrossValidation(testProjectId);
      const caveats = report.scientificLimitationNotice;

      expect(caveats.statement).toContain("must NOT be interpreted as autonomous proof");
      expect(caveats.youngTreeCaveat).toContain("Young saplings");
      expect(caveats.understoryInterferenceCaveat).toContain("understory grass or weed flushes");
      expect(caveats.verraComplianceStandard).toContain("Verra Methodology VM0047");
    });
  });

  describe("5. Cryptographic MRV Audit Digest", () => {
    it("generates a Verra VM0047 cryptographic validation hash digest", async () => {
      const report = await service.executeCrossValidation(testProjectId);

      expect(report.mrvCrossValidationDigest).toContain("VERRA-VM0047-XVAL-");
      expect(report.generatedAt).toBeDefined();
    });
  });
});
