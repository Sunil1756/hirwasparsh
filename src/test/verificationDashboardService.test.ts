import { describe, it, expect, beforeEach } from "vitest";
import {
  verificationDashboardService,
  ZERO_GREENWASHING_DISCLAIMER,
} from "../services/verificationDashboardService";
import { evidenceVerificationService } from "../services/evidenceVerificationService";
import { reviewerApprovalService } from "../services/reviewerApprovalService";

describe("PHASE 8 TASK 45 — VerificationDashboardService & MRV Pipeline Command Center", () => {
  beforeEach(() => {
    evidenceVerificationService.resetState();
    reviewerApprovalService.resetClaims();
  });

  it("1. Computes 4-stage MRV pipeline funnel metrics accurately", () => {
    const metrics = verificationDashboardService.getDashboardMetricsSync();

    expect(metrics.totalSubmissions).toBeGreaterThanOrEqual(4);
    expect(metrics.pipelineStages.length).toBe(4);

    expect(metrics.pipelineStages[0].stage).toBe("stage_1_submission");
    expect(metrics.pipelineStages[1].stage).toBe("stage_2_automated_screening");
    expect(metrics.pipelineStages[2].stage).toBe("stage_3_reviewer_triage");
    expect(metrics.pipelineStages[3].stage).toBe("stage_4_final_decision");

    expect(metrics.automatedScreeningPassed).toBeGreaterThanOrEqual(1);
    expect(metrics.automatedScreeningFlagged).toBeGreaterThanOrEqual(1);
  });

  it("2. Derives probabilistic screening metrics and enforces transparency", () => {
    const metrics = verificationDashboardService.getDashboardMetricsSync();

    expect(metrics.probabilisticMetrics.botanicalVisionConfidenceAvg).toBeGreaterThan(0);
    expect(metrics.probabilisticMetrics.perceptualDedupCollisionRate).toBeDefined();
    expect(metrics.probabilisticMetrics.spatiotemporalPlausibilityRate).toBeGreaterThan(0);
    expect(metrics.probabilisticMetrics.geofenceContainmentRate).toBeGreaterThan(0);
    expect(metrics.probabilisticMetrics.isProbabilisticDisclaimerAcknowledged).toBe(true);
  });

  it("3. Standard zero-greenwashing disclaimer is defined with mandatory transparency wording", () => {
    expect(ZERO_GREENWASHING_DISCLAIMER).toContain("Zero-Greenwashing Principle");
    expect(ZERO_GREENWASHING_DISCLAIMER).toContain("probabilistic");
    expect(ZERO_GREENWASHING_DISCLAIMER).toContain("do NOT prove ground truth with absolute certainty");
    expect(ZERO_GREENWASHING_DISCLAIMER).toContain("human auditor");
  });

  it("4. Maps claims into rich pipeline items with probabilistic checks breakdown", () => {
    const items = verificationDashboardService.getPipelineClaimsSync();

    expect(items.length).toBeGreaterThanOrEqual(4);

    items.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.treeId).toBeDefined();
      expect(item.currentStage).toBeDefined();
      expect(item.probabilisticChecks).toBeDefined();
      expect(item.probabilisticChecks.botanicalMatch).toBeDefined();
      expect(item.probabilisticChecks.photoDeduplication).toBeDefined();
      expect(item.probabilisticChecks.spatiotemporalKinematics).toBeDefined();
      expect(item.probabilisticChecks.geofenceContainment).toBeDefined();
    });
  });

  it("5. Simulates end-to-end pipeline execution from submission to L3 certification", async () => {
    const simResult = await verificationDashboardService.simulateEndToEndPipeline();

    expect(simResult.claimId).toBeDefined();
    expect(simResult.stage1Success).toBe(true);
    expect(simResult.stage2ScreeningResult.passed).toBe(true);
    expect(simResult.stage3ReviewerApproval.l1Approved).toBe(true);
    expect(simResult.stage3ReviewerApproval.l2DualControl).toBe(true);
    expect(simResult.stage4Certification.certified).toBe(true);
    expect(simResult.stage4Certification.serial).toContain("HS-SIM-");
  });
});
