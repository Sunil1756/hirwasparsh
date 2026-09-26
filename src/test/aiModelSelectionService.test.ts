import { describe, it, expect, beforeEach } from "vitest";
import {
  aiModelSelectionService,
  AiModelSelectionService,
} from "../services/aiModelSelectionService";

describe("PHASE 11 TASK 62 — AI Model & Service Selection Suite", () => {
  let service: AiModelSelectionService;

  beforeEach(() => {
    service = new AiModelSelectionService();
  });

  describe("1. Model Selection Coverage & Deployment Types", () => {
    it("evaluates and chooses foundational models & edge engines across all 5 domains", () => {
      const matrix = service.getModelSelectionMatrix();

      const domains = [
        "species_assistance",
        "tree_condition_classification",
        "image_quality_checks",
        "duplicate_image_detection",
        "anomaly_detection",
      ];

      for (const d of domains) {
        const pkg = matrix[d as keyof typeof matrix];
        expect(pkg).toBeDefined();
        expect(pkg.primarySelection).toBeDefined();
        expect(pkg.primarySelection.isRecommendedPrimary).toBe(true);
        expect(pkg.primarySelection.modelName.length).toBeGreaterThan(5);
        expect(pkg.primarySelection.provider.length).toBeGreaterThan(3);
        expect(pkg.primarySelection.accuracyBenchmarkPct).toBeGreaterThan(80);
        expect(pkg.secondaryFallback).toBeDefined();
        expect(pkg.decisionGates.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("2. Prioritization of Existing Foundational Models & Edge Algorithms", () => {
    it("selects Gemini 2.5 Flash for multimodal botanical reasoning and taxonomic identification", () => {
      const matrix = service.getModelSelectionMatrix();

      expect(matrix.species_assistance.primarySelection.modelName).toContain("Gemini 2.5 Flash");
      expect(matrix.species_assistance.primarySelection.deploymentType).toBe("cloud_multimodal_api");
      expect(matrix.species_assistance.customTrainingRecommendation).toBe("not_justified");

      expect(matrix.tree_condition_classification.primarySelection.modelName).toContain("Gemini 2.5 Flash");
      expect(matrix.tree_condition_classification.customTrainingRecommendation).toBe("not_justified");
    });

    it("selects deterministic edge algorithms (Laplacian & dHash) for zero-latency image quality & anti-fraud", () => {
      const matrix = service.getModelSelectionMatrix();

      // Image Quality Checks
      expect(matrix.image_quality_checks.primarySelection.modelName).toContain("Modified Laplacian");
      expect(matrix.image_quality_checks.primarySelection.deploymentType).toBe("edge_client_wasm");
      expect(matrix.image_quality_checks.primarySelection.costPer1kCallsUsd).toBe(0.0);
      expect(matrix.image_quality_checks.customTrainingRecommendation).toBe("unnecessary_deterministic");

      // Duplicate Image Detection
      expect(matrix.duplicate_image_detection.primarySelection.modelName).toContain("dHash");
      expect(matrix.duplicate_image_detection.primarySelection.deploymentType).toBe("edge_client_wasm");
      expect(matrix.duplicate_image_detection.primarySelection.latencyP95Ms).toBeLessThan(15);
      expect(matrix.duplicate_image_detection.customTrainingRecommendation).toBe("unnecessary_deterministic");
    });

    it("selects Sentinel-2 STAC and Open-Meteo for multi-spectral anomaly detection", () => {
      const matrix = service.getModelSelectionMatrix();

      expect(matrix.anomaly_detection.primarySelection.modelName).toContain("Sentinel-2");
      expect(matrix.anomaly_detection.primarySelection.deploymentType).toBe("spatial_stac_api");
    });
  });

  describe("3. Custom Training Decision Gate Evaluation", () => {
    it("justifies avoiding premature custom training with rigorous cost & accuracy comparisons", () => {
      const matrix = service.getModelSelectionMatrix();

      for (const pkg of Object.values(matrix)) {
        for (const gate of pkg.decisionGates) {
          expect(gate.question).toBeDefined();
          expect(gate.currentAssessment).toBeDefined();
          expect(gate.favorsCustomTraining).toBe(false);
          expect(gate.justification.length).toBeGreaterThan(10);
        }
      }
    });
  });

  describe("4. Resilient Inference Routing & Tier Switching", () => {
    it("routes to cloud primary when online, and switches to edge/deterministic when offline", () => {
      // Online route for species assistance (Standard Tier)
      const onlinePlan = service.routeInference("species_assistance", false, "standard_flash");
      expect(onlinePlan.selectedModel).toContain("Gemini 2.5 Flash");
      expect(onlinePlan.executionPath).toBe("cloud_primary");
      expect(onlinePlan.estimatedLatencyMs).toBeGreaterThan(500);

      // Offline route for species assistance (switches to edge TFLite fallback)
      const offlinePlan = service.routeInference("species_assistance", true);
      expect(offlinePlan.selectedModel).toContain("MobileNetV3");
      expect(offlinePlan.executionPath).toBe("edge_direct");
      expect(offlinePlan.estimatedCostUsd).toBe(0.0);
      expect(offlinePlan.fallbackTriggerReason).toContain("Offline mode active");
    });

    it("routes to Advanced Pro (Gemini 2.5 Pro) when paid premium tier is active", () => {
      const proPlan = service.routeInference("species_assistance", false, "advanced_pro");
      expect(proPlan.selectedModel).toContain("Gemini 2.5 Pro");
      expect(proPlan.confidenceThreshold).toBe(0.98);
      expect(proPlan.estimatedCostUsd).toBeGreaterThan(0.001);
    });

    it("routes to Custom Green Enlightenment fine-tuned model when custom tier is active", () => {
      const customPlan = service.routeInference("species_assistance", false, "custom_green_enlightenment");
      expect(customPlan.selectedModel).toContain("GreenEnlightenment-BioVision");
      expect(customPlan.confidenceThreshold).toBe(0.99);
    });
  });

  describe("5. Custom Model Training Blueprint & Architecture Specification", () => {
    it("defines an end-to-end blueprint for fine-tuning GE-BioVision on Vertex AI", () => {
      const blueprint = service.getCustomModelBlueprint();

      expect(blueprint.modelName).toBe("GreenEnlightenment-BioVision");
      expect(blueprint.codename).toBe("GE-BioVision-SFT");
      expect(blueprint.baseArchitecture).toContain("Gemini 2.5 Pro");
      expect(blueprint.datasetRequirements.minimumSampleCount).toBe(25000);
      expect(blueprint.datasetRequirements.classesCovered).toBe(150);
      expect(blueprint.lossFunctions).toContain("Triplet Margin Loss (Temporal Re-Identification Metric Learning)");
      expect(blueprint.trainingInfrastructure).toContain("Vertex AI");
      expect(blueprint.carbonAuditCompliance).toContain("Verra VM0047");
    });
  });

  describe("6. Master Architecture Decision Summary", () => {
    it("generates an audited decision summary with annual savings and compliance validation", () => {
      const summary = service.getArchitecturalDecisionSummary();

      expect(summary.totalEstimatedAnnualSavingsUsd).toBeGreaterThan(20000);
      expect(summary.recommendedFoundationalModel).toContain("Gemini");
      expect(summary.recommendedEdgeEngine).toContain("Laplacian");
      expect(summary.customTrainingGateConclusion).toContain("NOT JUSTIFIED");
      expect(summary.complianceStatus).toContain("VM0047");
    });
  });
});
