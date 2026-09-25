import { describe, it, expect, beforeEach } from "vitest";
import {
  reviewerApprovalService,
  VerificationChecklist,
  RejectionCategory,
} from "../services/reviewerApprovalService";

const defaultChecklist: VerificationChecklist = {
  speciesMatch: true,
  photoAuthenticity: true,
  spatiotemporalKinematics: true,
  geofenceContainment: true,
  silviculturalGrowth: true,
};

describe("Reviewer & Admin Approval Workflow Subsystem (Task 43)", () => {
  beforeEach(() => {
    reviewerApprovalService.resetToDefaults();
  });

  it("initializes with multi-stage approval queue claims", () => {
    const claims = reviewerApprovalService.getAllClaims();
    expect(claims.length).toBeGreaterThanOrEqual(4);

    const l1Pending = reviewerApprovalService.getClaimsByStage("pending_l1_review");
    expect(l1Pending.length).toBeGreaterThanOrEqual(1);

    const leadPending = reviewerApprovalService.getClaimsByStage("pending_lead_approval");
    expect(leadPending.length).toBeGreaterThanOrEqual(1);
  });

  it("allows Field Auditor to directly approve clean high-trust claim with certificate", () => {
    const claim = reviewerApprovalService.getClaimById("APPR-CLM-001");
    expect(claim).toBeDefined();
    expect(claim?.stage).toBe("pending_l1_review");

    const updated = reviewerApprovalService.submitL1Review(
      "APPR-CLM-001",
      { reviewerId: "REV-AUDITOR-99", reviewerName: "Rohan Varma", role: "field_auditor" },
      "approved",
      defaultChecklist,
      "Verified all 5 checkpoints cleanly."
    );

    expect(updated.stage).toBe("approved_certified");
    expect(updated.cryptographicCertificate).toBeDefined();
    expect(updated.l1Review?.decision).toBe("approved");
    expect(updated.auditLogs.some((l) => l.action.includes("L1 Field Audit"))).toBe(true);
  });

  it("enforces Four-Eyes Principle: L2 review rejects if reviewer is identical to L1 reviewer", () => {
    const claim = reviewerApprovalService.getClaimById("APPR-CLM-002");
    expect(claim?.l1Review?.reviewerId).toBe("REV-AUDITOR-01");

    // Attempting L2 review with same reviewer ID should throw Four-Eyes violation
    expect(() => {
      reviewerApprovalService.submitL2Review(
        "APPR-CLM-002",
        { reviewerId: "REV-AUDITOR-01", reviewerName: "Amol Joshi", role: "lead_verifier" },
        "approved",
        defaultChecklist,
        "Attempting self-dual review."
      );
    }).toThrow(/Four-Eyes Principle Violation/i);
  });

  it("allows distinct Lead Verifier to execute L2 dual-signatory endorsement", () => {
    const updated = reviewerApprovalService.submitL2Review(
      "APPR-CLM-002",
      { reviewerId: "REV-LEAD-88", reviewerName: "Dr. Sunita Rao", role: "lead_verifier" },
      "approved",
      defaultChecklist,
      "Lead arborist endorsement granted."
    );

    expect(updated.stage).toBe("approved_certified");
    expect(updated.l2Review?.reviewerId).toBe("REV-LEAD-88");
    expect(updated.cryptographicCertificate).toBeDefined();
  });

  it("prevents planters from self-approving their own tree claims", () => {
    const claim = reviewerApprovalService.getClaimById("APPR-CLM-001");
    expect(claim?.planterId).toBe("USR-PUNE-101");

    expect(() => {
      reviewerApprovalService.submitL1Review(
        "APPR-CLM-001",
        { reviewerId: "USR-PUNE-101", reviewerName: "Ramesh Shinde", role: "field_auditor" },
        "approved",
        defaultChecklist,
        "Self review"
      );
    }).toThrow(/Conflict of Interest: Planter cannot review/i);
  });

  it("allows Admin Certifier to execute L3 root sealing on escalated claims", () => {
    const claim = reviewerApprovalService.getClaimById("APPR-CLM-003");
    expect(claim?.stage).toBe("pending_admin_certification");

    const updated = reviewerApprovalService.submitL3Certification(
      "APPR-CLM-003",
      { reviewerId: "ADMIN-ROOT-01", reviewerName: "Chief Carbon Registrar", role: "admin_certifier" },
      "approved",
      "Executive platform sealing approved."
    );

    expect(updated.stage).toBe("approved_certified");
    expect(updated.l3Review?.role).toBe("admin_certifier");
    expect(updated.cryptographicCertificate).toBeDefined();
  });

  it("rejects claim with structured category taxonomy and audit trail", () => {
    const updated = reviewerApprovalService.rejectClaimWithCategory(
      "APPR-CLM-001",
      { reviewerId: "REV-AUDITOR-01", reviewerName: "Amol Joshi", role: "field_auditor" },
      "fraudulent_photo_reuse",
      "Perceptual dHash collision detected with another plantation plot."
    );

    expect(updated.stage).toBe("rejected");
    expect(updated.rejectionDetails?.category).toBe("fraudulent_photo_reuse");
    expect(updated.rejectionDetails?.reason).toContain("Perceptual dHash");
    expect(updated.auditLogs.some((l) => l.action.includes("Claim Formally Rejected"))).toBe(true);
  });

  it("executes safe batch approval while automatically quarantining low-trust and flagged claims", () => {
    const allIds = reviewerApprovalService.getAllClaims().map((c) => c.id);

    const result = reviewerApprovalService.executeBatchApproval(
      allIds,
      { reviewerId: "REV-ADMIN-01", reviewerName: "Senior Certifier", role: "admin_certifier" },
      "Platform bulk release"
    );

    expect(result.approvedCount).toBeGreaterThan(0);
    expect(result.quarantinedCount).toBeGreaterThan(0);

    // Verify low-trust / rejected claims were quarantined
    expect(result.quarantinedClaims.some((c) => c.trustTier === "low_flagged" || c.stage === "rejected")).toBe(true);

    // Verify approved claims are certified and sealed
    expect(result.approvedClaims.every((c) => c.stage === "approved_certified")).toBe(true);
    expect(result.merkleRoot).toBeDefined();
  });
});
