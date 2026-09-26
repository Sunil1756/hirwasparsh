import { describe, it, expect, beforeEach } from "vitest";
import {
  aiRequirementsService,
  AiRequirementsService,
} from "../services/aiRequirementsService";

describe("PHASE 11 TASK 61 — AI Requirements & Forestry Intelligence Problem Formulation Suite", () => {
  let service: AiRequirementsService;

  beforeEach(() => {
    service = new AiRequirementsService();
  });

  describe("1. Problem Coverage & Domain Taxonomy", () => {
    it("defines comprehensive problem specifications across all 5 core forestry applications", () => {
      const specs = service.getRequirementsSpecification();

      const requiredDomains = [
        "species_assistance",
        "tree_condition_classification",
        "image_quality_checks",
        "duplicate_image_detection",
        "anomaly_detection",
      ];

      for (const domain of requiredDomains) {
        const req = specs[domain as keyof typeof specs];
        expect(req).toBeDefined();
        expect(req.id).toMatch(/^REQ-AI-\d{3}$/);
        expect(req.domain).toBe(domain);
        expect(req.title.length).toBeGreaterThan(10);
        expect(req.shortDefinition.length).toBeGreaterThan(30);
        expect(req.operationalObjective.length).toBeGreaterThan(30);
        expect(req.inputModalities.length).toBeGreaterThanOrEqual(2);
        expect(Object.keys(req.outputSchema).length).toBeGreaterThanOrEqual(4);
        expect(req.targetLatencyMs).toBeGreaterThan(0);
        expect(["edge_client", "serverless_api", "batch_pipeline"]).toContain(req.inferenceTarget);
        expect(req.verraMrvComplianceRequirement).toContain("VM0047");
      }
    });
  });

  describe("2. Mathematical Formulation & Decision Criteria", () => {
    it("defines rigorous LaTeX formulations and decision thresholds for each AI problem", () => {
      const specs = service.getRequirementsSpecification();

      // Species Assistance
      expect(specs.species_assistance.mathematicalFormulation.formulaLatex).toContain("\\arg\\max");
      expect(specs.species_assistance.mathematicalFormulation.decisionThreshold).toContain("0.85");

      // Tree Condition
      expect(specs.tree_condition_classification.mathematicalFormulation.formulaLatex).toContain("H_{\\text{crown}}");
      expect(specs.tree_condition_classification.mathematicalFormulation.decisionThreshold).toContain("Thriving");

      // Image Quality
      expect(specs.image_quality_checks.mathematicalFormulation.formulaLatex).toContain("\\sigma^2_{\\nabla^2}");
      expect(specs.image_quality_checks.mathematicalFormulation.decisionThreshold).toContain("100.0");

      // Duplicate Detection
      expect(specs.duplicate_image_detection.mathematicalFormulation.formulaLatex).toContain("D_H");
      expect(specs.duplicate_image_detection.mathematicalFormulation.formulaLatex).toContain("d_{\\text{haversine}}");

      // Anomaly Detection
      expect(specs.anomaly_detection.mathematicalFormulation.formulaLatex).toContain("Z_{\\text{anomaly}}");
      expect(specs.anomaly_detection.mathematicalFormulation.decisionThreshold).toContain("Defoliation Shock");
    });
  });

  describe("3. 3-Tier Confidence Routing Pipeline", () => {
    it("configures high, medium, and low confidence tiers with actionable system behaviors", () => {
      const specs = service.getRequirementsSpecification();

      for (const req of Object.values(specs)) {
        expect(req.confidenceTiers.high.minConfidence).toBeGreaterThan(0.7);
        expect(req.confidenceTiers.high.action.length).toBeGreaterThan(10);

        expect(req.confidenceTiers.medium.minConfidence).toBeLessThan(req.confidenceTiers.high.minConfidence);
        expect(req.confidenceTiers.medium.maxConfidence).toBe(req.confidenceTiers.high.minConfidence);

        expect(req.confidenceTiers.low.maxConfidence).toBe(req.confidenceTiers.medium.minConfidence);
        expect(req.confidenceTiers.low.action.length).toBeGreaterThan(10);
      }
    });
  });

  describe("4. Failure Mode Identification & Mitigations", () => {
    it("documents critical failure modes, risks, and mitigation strategies", () => {
      const specs = service.getRequirementsSpecification();

      // Ensure nursery polybag pot fraud is mitigated in tree condition
      const treeCondFailures = specs.tree_condition_classification.failureModesAndMitigations;
      const potFraud = treeCondFailures.find((f) => f.failureMode.includes("polybag"));
      expect(potFraud).toBeDefined();
      expect(potFraud?.riskSeverity).toBe("critical");
      expect(potFraud?.mitigationStrategy).toContain("soil collar");

      // Ensure screen rephotography is mitigated in image quality
      const speciesFailures = specs.species_assistance.failureModesAndMitigations;
      const nonTree = speciesFailures.find((f) => f.failureMode.includes("Non-tree"));
      expect(nonTree).toBeDefined();
      expect(nonTree?.riskSeverity).toBe("high");
    });
  });

  describe("5. Client-Side Image Quality Evaluation Engine", () => {
    it("passes crisp, well-exposed, authentic photographs", () => {
      const result = service.evaluateImageQuality({
        width: 1920,
        height: 1080,
        meanLuminance: 125,
        laplacianVariance: 165.4,
        glarePixelPct: 0.02,
        isScreenDetected: false,
      });

      expect(result.passedQualityGate).toBe(true);
      expect(result.blurLaplacianScore).toBe(165.4);
      expect(result.isExposureAcceptable).toBe(true);
      expect(result.resolutionMpx).toBe(2.07);
      expect(result.viewfinderGuidance).toContain("Image quality optimal for botanical AI analysis.");
    });

    it("rejects blurry photos with Laplacian variance below 100.0", () => {
      const result = service.evaluateImageQuality({
        width: 1920,
        height: 1080,
        meanLuminance: 125,
        laplacianVariance: 42.0, // Blurry
        glarePixelPct: 0.02,
        isScreenDetected: false,
      });

      expect(result.passedQualityGate).toBe(false);
      expect(result.viewfinderGuidance.some((g) => g.includes("blurry"))).toBe(true);
    });

    it("rejects underexposed dark photos and screen re-photography", () => {
      const darkResult = service.evaluateImageQuality({
        width: 1280,
        height: 720,
        meanLuminance: 25, // Too dark (< 40)
        laplacianVariance: 120.0,
        glarePixelPct: 0.01,
        isScreenDetected: false,
      });
      expect(darkResult.passedQualityGate).toBe(false);
      expect(darkResult.viewfinderGuidance.some((g) => g.includes("Too dark"))).toBe(true);

      const screenResult = service.evaluateImageQuality({
        width: 1280,
        height: 720,
        meanLuminance: 120,
        laplacianVariance: 150.0,
        glarePixelPct: 0.01,
        isScreenDetected: true,
      });
      expect(screenResult.passedQualityGate).toBe(false);
      expect(screenResult.viewfinderGuidance.some((g) => g.includes("Screen re-photography"))).toBe(true);
    });
  });

  describe("6. Duplicate & Anti-Fraud Spatiotemporal Collision Engine", () => {
    it("flags exact bitwise SHA-256 duplicates immediately", () => {
      const sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const result = service.evaluateDuplicateCollision(
        "8f3c4e2a1b9d0e7f",
        "8f3c4e2a1b9d0e7f",
        undefined,
        undefined,
        sha,
        sha
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.collisionVector).toBe("exact_sha256");
      expect(result.fraudRiskLevel).toBe("critical_fraud");
    });

    it("detects impossible geodetic location jump with identical photo (>15m away)", () => {
      const dhashA = "8f3c4e2a1b9d0e7f";
      const dhashB = "8f3c4e2a1b9d0e7e"; // 1 bit diff (98.4% visual similarity)
      const gpsA = { lat: 18.5204, lng: 73.8567 }; // Pune Sector A
      const gpsB = { lat: 18.5294, lng: 73.8657 }; // 1.3 km away

      const result = service.evaluateDuplicateCollision(dhashA, dhashB, gpsA, gpsB);

      expect(result.isDuplicate).toBe(true);
      expect(result.collisionVector).toBe("spatiotemporal_geodesic");
      expect(result.fraudRiskLevel).toBe("critical_fraud");
      expect(result.spatialSeparationMeters).toBeGreaterThan(15);
      expect(result.actionRecommendation).toContain("impossible geodetic location jump");
    });

    it("accepts unique distinct tree photographs", () => {
      const dhashA = "8f3c4e2a1b9d0e7f";
      const dhashB = "00000000ffffffff"; // 32 bits diff (~50% similarity)
      const gpsA = { lat: 18.5204, lng: 73.8567 };
      const gpsB = { lat: 18.5205, lng: 73.8568 };

      const result = service.evaluateDuplicateCollision(dhashA, dhashB, gpsA, gpsB);

      expect(result.isDuplicate).toBe(false);
      expect(result.fraudRiskLevel).toBe("safe");
      expect(result.actionRecommendation).toContain("Unique tree photographic evidence");
    });
  });
});
