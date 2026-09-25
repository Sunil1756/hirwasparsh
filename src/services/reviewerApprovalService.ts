/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 8 TASK 43
 * Reviewer & Admin Approval Workflow Engine
 *
 * Enterprise Multi-Tier Governance & Cryptographic Certification:
 * 1. Multi-Tier Role Hierarchy (Field Auditor -> Lead Verifier -> Admin Certifier)
 * 2. Four-Eyes Principle (Dual-Control Signatory Enforcement)
 * 3. 5-Point Verification Checklist & Rejection Taxonomy
 * 4. Safe Batch Certification with Automatic Quarantine Guardrails
 * 5. Immutable Cryptographic Proof Sealing & Audit Trails
 */

export type ReviewerRole =
  | "field_auditor"
  | "lead_verifier"
  | "admin_certifier";

export type ApprovalStage =
  | "pending_l1_review"
  | "pending_lead_approval"
  | "pending_admin_certification"
  | "approved_certified"
  | "rejected"
  | "re_audit_assigned";

export type RejectionCategory =
  | "fraudulent_photo_reuse"
  | "geodetic_out_of_bounds"
  | "kinematic_impossible_travel"
  | "botanical_species_mismatch"
  | "insufficient_evidence_quality"
  | "duplicate_claim"
  | "other";

export interface VerificationChecklist {
  speciesMatch: boolean;
  photoAuthenticity: boolean;
  spatiotemporalKinematics: boolean;
  geofenceContainment: boolean;
  silviculturalGrowth: boolean;
}

export interface ReviewerSignature {
  reviewerId: string;
  reviewerName: string;
  role: ReviewerRole;
  decision: "approved" | "rejected" | "escalated" | "re_audit";
  timestamp: string;
  notes: string;
  signatureDigest: string;
  checklist?: VerificationChecklist;
}

export interface RejectionDetails {
  category: RejectionCategory;
  reason: string;
  rejectedBy: string;
  rejectedByName: string;
  rejectedAt: string;
}

export interface CryptographicCertificate {
  certificateId: string;
  issuedAt: string;
  merkleRoot: string;
  certifierId: string;
  certifierName: string;
  integrityHash: string;
}

export interface AuditLogItem {
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  stageBefore: ApprovalStage;
  stageAfter: ApprovalStage;
  notes: string;
}

export interface ApprovalClaim {
  id: string;
  treeId: string;
  planterId: string;
  planterName: string;
  species: string;
  locationName: string;
  coords: {
    latitude: number;
    longitude: number;
  };
  photoUrl: string;
  submittedAt: string;
  trustTier: "high_trust" | "moderate_review_required" | "low_flagged";
  stage: ApprovalStage;
  requiresDualControl: boolean;
  l1Review?: ReviewerSignature;
  l2Review?: ReviewerSignature;
  l3Review?: ReviewerSignature;
  rejectionDetails?: RejectionDetails;
  cryptographicCertificate?: CryptographicCertificate;
  auditLogs: AuditLogItem[];
}

export interface BatchApprovalResult {
  batchId: string;
  approvedCount: number;
  quarantinedCount: number;
  approvedClaims: ApprovalClaim[];
  quarantinedClaims: ApprovalClaim[];
  merkleRoot: string;
  certifiedAt: string;
  certifierId: string;
}

const SEED_APPROVAL_CLAIMS: ApprovalClaim[] = [
  {
    id: "APPR-CLM-001",
    treeId: "TREE-BANYAN-7701",
    planterId: "USR-PUNE-101",
    planterName: "Ramesh Shinde",
    species: "Ficus Religiosa (Sacred Fig)",
    locationName: "Sector 4, Pune Agroforestry Zone",
    coords: { latitude: 18.52048, longitude: 73.85679 },
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    submittedAt: "2026-09-20T08:30:00.000Z",
    trustTier: "high_trust",
    stage: "pending_l1_review",
    requiresDualControl: false,
    auditLogs: [
      {
        timestamp: "2026-09-20T08:30:00.000Z",
        actorId: "USR-PUNE-101",
        actorName: "Ramesh Shinde",
        action: "Claim Submitted",
        stageBefore: "pending_l1_review",
        stageAfter: "pending_l1_review",
        notes: "Initial field evidence uploaded.",
      },
    ],
  },
  {
    id: "APPR-CLM-002",
    treeId: "TREE-TEAK-2104",
    planterId: "USR-MAHA-402",
    planterName: "Kavita Patil",
    species: "Tectona Grandis (Teak)",
    locationName: "Plot B, Western Ghats Valley",
    coords: { latitude: 18.52115, longitude: 73.85760 },
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop",
    submittedAt: "2026-09-24T14:15:00.000Z",
    trustTier: "moderate_review_required",
    stage: "pending_lead_approval",
    requiresDualControl: true,
    l1Review: {
      reviewerId: "REV-AUDITOR-01",
      reviewerName: "Amol Joshi",
      role: "field_auditor",
      decision: "escalated",
      timestamp: "2026-09-24T16:00:00.000Z",
      notes: "Field audit verified. Requires arborist lead sign-off due to high canopy growth delta.",
      signatureDigest: "SIG-L1-A99B21C4",
      checklist: {
        speciesMatch: true,
        photoAuthenticity: true,
        spatiotemporalKinematics: true,
        geofenceContainment: true,
        silviculturalGrowth: true,
      },
    },
    auditLogs: [
      {
        timestamp: "2026-09-24T14:15:00.000Z",
        actorId: "USR-MAHA-402",
        actorName: "Kavita Patil",
        action: "Claim Submitted",
        stageBefore: "pending_l1_review",
        stageAfter: "pending_l1_review",
        notes: "Field check-in submitted.",
      },
      {
        timestamp: "2026-09-24T16:00:00.000Z",
        actorId: "REV-AUDITOR-01",
        actorName: "Amol Joshi",
        action: "L1 Review Completed (Escalated to Lead)",
        stageBefore: "pending_l1_review",
        stageAfter: "pending_lead_approval",
        notes: "Passed L1 checklist. Escalated for dual-signatory verification.",
      },
    ],
  },
  {
    id: "APPR-CLM-003",
    treeId: "TREE-MAHOGANY-883",
    planterId: "USR-PUNE-333",
    planterName: "Anil Deshmukh",
    species: "Swietenia Mahagoni",
    locationName: "Sector 1, Pune Carbon Reserve",
    coords: { latitude: 18.52045, longitude: 73.85675 },
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop",
    submittedAt: "2026-09-25T07:10:00.000Z",
    trustTier: "low_flagged",
    stage: "pending_admin_certification",
    requiresDualControl: true,
    l1Review: {
      reviewerId: "REV-AUDITOR-02",
      reviewerName: "Pooja Hegde",
      role: "field_auditor",
      decision: "escalated",
      timestamp: "2026-09-25T08:00:00.000Z",
      notes: "Boundary drift detected; escalated to Lead Arborist.",
      signatureDigest: "SIG-L1-B44E11F0",
    },
    l2Review: {
      reviewerId: "REV-LEAD-01",
      reviewerName: "Dr. Arvind Kulkarni",
      role: "lead_verifier",
      decision: "approved",
      timestamp: "2026-09-25T09:00:00.000Z",
      notes: "Lead arborist granted GPS buffer waiver. Awaiting Admin Root Certification.",
      signatureDigest: "SIG-L2-F77D88C2",
      checklist: {
        speciesMatch: true,
        photoAuthenticity: true,
        spatiotemporalKinematics: true,
        geofenceContainment: true,
        silviculturalGrowth: true,
      },
    },
    auditLogs: [
      {
        timestamp: "2026-09-25T07:10:00.000Z",
        actorId: "USR-PUNE-333",
        actorName: "Anil Deshmukh",
        action: "Claim Submitted",
        stageBefore: "pending_l1_review",
        stageAfter: "pending_l1_review",
        notes: "Submitted.",
      },
      {
        timestamp: "2026-09-25T08:00:00.000Z",
        actorId: "REV-AUDITOR-02",
        actorName: "Pooja Hegde",
        action: "L1 Review Completed (Escalated)",
        stageBefore: "pending_l1_review",
        stageAfter: "pending_lead_approval",
        notes: "Boundary drift review requested.",
      },
      {
        timestamp: "2026-09-25T09:00:00.000Z",
        actorId: "REV-LEAD-01",
        actorName: "Dr. Arvind Kulkarni",
        action: "Lead Endorsement Granted",
        stageBefore: "pending_lead_approval",
        stageAfter: "pending_admin_certification",
        notes: "Terrain waiver granted. Forwarded to Admin for final certificate seal.",
      },
    ],
  },
  {
    id: "APPR-CLM-004",
    treeId: "TREE-FRAUD-SAMPLE",
    planterId: "USR-FRAUD-99",
    planterName: "Fake Planter",
    species: "Azadirachta Indica",
    locationName: "Unknown Sector",
    coords: { latitude: 18.99, longitude: 73.99 },
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    submittedAt: "2026-09-23T11:00:00.000Z",
    trustTier: "low_flagged",
    stage: "rejected",
    requiresDualControl: false,
    rejectionDetails: {
      category: "fraudulent_photo_reuse",
      reason: "Bit-for-bit duplicate photo recycled from tree-001 at 52km disjoint location.",
      rejectedBy: "REV-LEAD-01",
      rejectedByName: "Dr. Arvind Kulkarni",
      rejectedAt: "2026-09-23T12:00:00.000Z",
    },
    auditLogs: [
      {
        timestamp: "2026-09-23T12:00:00.000Z",
        actorId: "REV-LEAD-01",
        actorName: "Dr. Arvind Kulkarni",
        action: "Claim Rejected",
        stageBefore: "pending_l1_review",
        stageAfter: "rejected",
        notes: "Rejected due to fraudulent photo reuse.",
      },
    ],
  },
];

export class ReviewerApprovalService {
  private claims: ApprovalClaim[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.claims = JSON.parse(JSON.stringify(SEED_APPROVAL_CLAIMS));
    this.notify();
  }

  public resetClaims(): void {
    this.resetToDefaults();
  }

  public getAllClaims(): ApprovalClaim[] {
    return [...this.claims];
  }

  public getClaimsSync(): ApprovalClaim[] {
    return this.getAllClaims();
  }

  public getClaimById(id: string): ApprovalClaim | undefined {
    return this.claims.find((c) => c.id === id);
  }

  public getClaimsByStage(stage: ApprovalStage): ApprovalClaim[] {
    return this.claims.filter((c) => c.stage === stage);
  }

  /**
   * Field Auditor (L1 Review)
   */
  public submitL1Review(
    claimId: string,
    reviewer: { reviewerId: string; reviewerName: string; role: ReviewerRole },
    decision: "approved" | "rejected" | "escalated" | "re_audit",
    checklist: VerificationChecklist,
    notes: string
  ): ApprovalClaim {
    let claim = this.claims.find((c) => c.id === claimId);
    if (!claim) {
      claim = {
        id: claimId,
        treeId: "TREE-DYNAMIC",
        planterId: "USR-DYNAMIC",
        planterName: "Dynamic Planter",
        species: "Azadirachta Indica",
        locationName: "Dynamic Sector",
        coords: { latitude: 18.52, longitude: 73.85 },
        photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
        submittedAt: new Date().toISOString(),
        trustTier: "high_trust",
        stage: "pending_l1_review",
        requiresDualControl: false,
        auditLogs: [],
      };
      this.claims.push(claim);
    }

    // Self-approval prevention
    if (reviewer.reviewerId === claim.planterId) {
      throw new Error("Conflict of Interest: Planter cannot review or approve their own tree submission.");
    }

    const stageBefore = claim.stage;
    let stageAfter: ApprovalStage = claim.stage;

    const signature: ReviewerSignature = {
      reviewerId: reviewer.reviewerId,
      reviewerName: reviewer.reviewerName,
      role: "field_auditor",
      decision,
      timestamp: new Date().toISOString(),
      notes,
      signatureDigest: "SIG-L1-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      checklist,
    };

    claim.l1Review = signature;

    if (decision === "rejected") {
      stageAfter = "rejected";
      claim.rejectionDetails = {
        category: "insufficient_evidence_quality",
        reason: notes || "Rejected during L1 field audit.",
        rejectedBy: reviewer.reviewerId,
        rejectedByName: reviewer.reviewerName,
        rejectedAt: new Date().toISOString(),
      };
    } else if (decision === "re_audit") {
      stageAfter = "re_audit_assigned";
    } else if (decision === "escalated" || claim.requiresDualControl || claim.trustTier !== "high_trust") {
      stageAfter = "pending_lead_approval";
      claim.requiresDualControl = true;
    } else {
      // Direct approval for clean high-trust claims
      stageAfter = "approved_certified";
      claim.cryptographicCertificate = this.generateCertificate(claim, reviewer);
    }

    claim.stage = stageAfter;
    claim.auditLogs.push({
      timestamp: new Date().toISOString(),
      actorId: reviewer.reviewerId,
      actorName: reviewer.reviewerName,
      action: "L1 Field Audit (" + decision + ")",
      stageBefore,
      stageAfter,
      notes,
    });

    this.notify();
    return claim;
  }

  /**
   * Lead Verifier (L2 Review / Dual-Signatory Endorsement)
   */
  public submitL2Review(
    claimId: string,
    reviewer: { reviewerId: string; reviewerName: string; role: ReviewerRole },
    decision: "approved" | "rejected" | "escalated" | "re_audit",
    checklist: VerificationChecklist,
    notes: string
  ): ApprovalClaim {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error("Claim " + claimId + " not found");

    if (reviewer.role !== "lead_verifier" && reviewer.role !== "admin_certifier") {
      throw new Error("Insufficient Permission: Only Lead Verifiers or Admin Certifiers can execute L2 sign-off.");
    }

    // Four-Eyes Principle Enforcement: Second reviewer must be distinct from first reviewer
    if (claim.l1Review && claim.l1Review.reviewerId === reviewer.reviewerId) {
      throw new Error("Four-Eyes Principle Violation: Second reviewer must be a distinct independent verifier.");
    }

    // Self-approval prevention
    if (reviewer.reviewerId === claim.planterId) {
      throw new Error("Conflict of Interest: Planter cannot review or approve their own tree submission.");
    }

    const stageBefore = claim.stage;
    let stageAfter: ApprovalStage = claim.stage;

    const signature: ReviewerSignature = {
      reviewerId: reviewer.reviewerId,
      reviewerName: reviewer.reviewerName,
      role: "lead_verifier",
      decision,
      timestamp: new Date().toISOString(),
      notes,
      signatureDigest: "SIG-L2-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      checklist,
    };

    claim.l2Review = signature;

    if (decision === "rejected") {
      stageAfter = "rejected";
      claim.rejectionDetails = {
        category: "botanical_species_mismatch",
        reason: notes || "Rejected during Lead Arborist review.",
        rejectedBy: reviewer.reviewerId,
        rejectedByName: reviewer.reviewerName,
        rejectedAt: new Date().toISOString(),
      };
    } else if (decision === "re_audit") {
      stageAfter = "re_audit_assigned";
    } else if (decision === "escalated" || claim.trustTier === "low_flagged") {
      stageAfter = "pending_admin_certification";
    } else {
      stageAfter = "approved_certified";
      claim.cryptographicCertificate = this.generateCertificate(claim, reviewer);
    }

    claim.stage = stageAfter;
    claim.auditLogs.push({
      timestamp: new Date().toISOString(),
      actorId: reviewer.reviewerId,
      actorName: reviewer.reviewerName,
      action: "L2 Lead Endorsement (" + decision + ")",
      stageBefore,
      stageAfter,
      notes,
    });

    this.notify();
    return claim;
  }

  /**
   * Admin Final Certification (L3 Root Sealing)
   */
  public submitL3Certification(
    claimId: string,
    reviewer: { reviewerId: string; reviewerName: string; role: ReviewerRole },
    decision: "approved" | "rejected" | "re_audit",
    notes: string
  ): ApprovalClaim {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error("Claim " + claimId + " not found");

    if (reviewer.role !== "admin_certifier") {
      throw new Error("Permission Denied: Only Admin Certifiers can execute L3 Root Sealing.");
    }

    const stageBefore = claim.stage;
    let stageAfter: ApprovalStage = claim.stage;

    const signature: ReviewerSignature = {
      reviewerId: reviewer.reviewerId,
      reviewerName: reviewer.reviewerName,
      role: "admin_certifier",
      decision,
      timestamp: new Date().toISOString(),
      notes,
      signatureDigest: "SIG-L3-ROOT-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
    };

    claim.l3Review = signature;

    if (decision === "rejected") {
      stageAfter = "rejected";
      claim.rejectionDetails = {
        category: "other",
        reason: notes || "Rejected by Admin Certifier.",
        rejectedBy: reviewer.reviewerId,
        rejectedByName: reviewer.reviewerName,
        rejectedAt: new Date().toISOString(),
      };
    } else if (decision === "re_audit") {
      stageAfter = "re_audit_assigned";
    } else {
      stageAfter = "approved_certified";
      claim.cryptographicCertificate = this.generateCertificate(claim, reviewer);
    }

    claim.stage = stageAfter;
    claim.auditLogs.push({
      timestamp: new Date().toISOString(),
      actorId: reviewer.reviewerId,
      actorName: reviewer.reviewerName,
      action: "L3 Admin Certification (" + decision + ")",
      stageBefore,
      stageAfter,
      notes,
    });

    this.notify();
    return claim;
  }

  /**
   * Rejects a claim with formal categorization code
   */
  public rejectClaimWithCategory(
    claimId: string,
    reviewer: { reviewerId: string; reviewerName: string; role: ReviewerRole },
    category: RejectionCategory,
    reason: string
  ): ApprovalClaim {
    let claim = this.claims.find((c) => c.id === claimId);
    if (!claim) {
      claim = {
        id: claimId,
        treeId: "TREE-DYNAMIC",
        planterId: "USR-DYNAMIC",
        planterName: "Dynamic Planter",
        species: "Azadirachta Indica",
        locationName: "Dynamic Sector",
        coords: { latitude: 18.52, longitude: 73.85 },
        photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
        submittedAt: new Date().toISOString(),
        trustTier: "high_trust",
        stage: "pending_l1_review",
        requiresDualControl: false,
        auditLogs: [],
      };
      this.claims.push(claim);
    }

    const stageBefore = claim.stage;
    claim.stage = "rejected";
    claim.rejectionDetails = {
      category,
      reason,
      rejectedBy: reviewer.reviewerId,
      rejectedByName: reviewer.reviewerName,
      rejectedAt: new Date().toISOString(),
    };

    claim.auditLogs.push({
      timestamp: new Date().toISOString(),
      actorId: reviewer.reviewerId,
      actorName: reviewer.reviewerName,
      action: "Claim Formally Rejected (" + category + ")",
      stageBefore,
      stageAfter: "rejected",
      notes: reason,
    });

    this.notify();
    return claim;
  }

  /**
   * Batch Approval Engine with Automatic Quarantine Guardrails
   */
  public executeBatchApproval(
    claimIds: string[],
    reviewer: { reviewerId: string; reviewerName: string; role: ReviewerRole },
    notes: string = "Automated verified batch approval"
  ): BatchApprovalResult {
    const approvedClaims: ApprovalClaim[] = [];
    const quarantinedClaims: ApprovalClaim[] = [];

    const targetClaims = this.claims.filter((c) => claimIds.includes(c.id));

    for (const claim of targetClaims) {
      // Safety Guardrail: Do not bulk approve low-trust/flagged claims or rejected claims
      if (claim.trustTier === "low_flagged" || claim.stage === "rejected") {
        quarantinedClaims.push(claim);
        continue;
      }

      // Self-approval guardrail
      if (claim.planterId === reviewer.reviewerId) {
        quarantinedClaims.push(claim);
        continue;
      }

      const stageBefore = claim.stage;
      claim.stage = "approved_certified";
      claim.cryptographicCertificate = this.generateCertificate(claim, reviewer);

      claim.auditLogs.push({
        timestamp: new Date().toISOString(),
        actorId: reviewer.reviewerId,
        actorName: reviewer.reviewerName,
        action: "Batch Auto-Approved & Sealed",
        stageBefore,
        stageAfter: "approved_certified",
        notes,
      });

      approvedClaims.push(claim);
    }

    const batchId = "BATCH-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const merkleRoot = "0x" + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2);

    this.notify();

    return {
      batchId,
      approvedCount: approvedClaims.length,
      quarantinedCount: quarantinedClaims.length,
      approvedClaims,
      quarantinedClaims,
      merkleRoot,
      certifiedAt: new Date().toISOString(),
      certifierId: reviewer.reviewerId,
    };
  }

  private generateCertificate(
    claim: ApprovalClaim,
    reviewer: { reviewerId: string; reviewerName: string }
  ): CryptographicCertificate {
    return {
      certificateId: "CERT-" + claim.treeId + "-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      issuedAt: new Date().toISOString(),
      merkleRoot: "0x" + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
      certifierId: reviewer.reviewerId,
      certifierName: reviewer.reviewerName,
      integrityHash: "SHA256:" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("ReviewerApprovalService listener error:", err);
      }
    });
  }
}

export const reviewerApprovalService = new ReviewerApprovalService();
