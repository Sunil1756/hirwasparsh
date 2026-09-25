import { describe, it, expect, beforeEach } from "vitest";
import {
  duplicateEvidenceService,
  EvidenceRecord,
  CollisionVectorType,
  CollisionRiskLevel,
} from "../services/duplicateEvidenceService";

describe("Duplicate Photo & Evidence Detection Subsystem (Task 41)", () => {
  beforeEach(() => {
    duplicateEvidenceService.resetToDefaults();
  });

  it("initializes with indexed seed evidence records and discovers duplicate collisions", () => {
    const records = duplicateEvidenceService.getRepository();
    expect(records.length).toBeGreaterThanOrEqual(5);

    const collisions = duplicateEvidenceService.getCollisions();
    expect(collisions.length).toBeGreaterThanOrEqual(1);

    const criticalCollision = collisions.find((c) => c.riskLevel === "critical_fraud");
    expect(criticalCollision).toBeDefined();
    expect(criticalCollision?.candidateTreeId).toBe("TREE-NEEM-1029");
    expect(criticalCollision?.matchingRecord.treeId).toBe("TREE-BANYAN-7701");
  });

  it("detects exact bit-for-bit SHA-256 photo hash collision", () => {
    const candidate: Partial<EvidenceRecord> = {
      id: "CAND-001",
      treeId: "TREE-FRAUD-99",
      planterId: "USR-FRAUD-01",
      photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
      sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b", // Identical to EV-REC-001
      dhash: "a4f8c2e19b0d3e5f",
      gps: { latitude: 18.52048, longitude: 73.85679 },
      timestamp: "2026-09-25T10:00:00.000Z",
    };

    const collision = duplicateEvidenceService.checkCandidateEvidence(candidate);
    expect(collision).toBeDefined();
    expect(collision?.vectors).toContain("exact_sha256");
    expect(collision?.visualSimilarityPct).toBe(100);
    expect(collision?.riskLevel).toBe("critical_fraud");
    expect(collision?.matchingRecord.treeId).toBe("TREE-BANYAN-7701");
  });

  it("detects perceptual dHash visual similarity within Hamming distance threshold", () => {
    // 2-bit difference in dHash (approx 97% visual match)
    const candidate: Partial<EvidenceRecord> = {
      id: "CAND-002",
      treeId: "TREE-SIMILAR-12",
      planterId: "USR-PUNE-505",
      photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b",
      sha256: "unique_fresh_sha256_hash_different_compression",
      dhash: "f1e2d3c4b5a60788", // 1 bit diff from EV-REC-002 (f1e2d3c4b5a60789)
      gps: { latitude: 18.52115, longitude: 73.8576 },
      timestamp: "2026-09-25T11:00:00.000Z",
    };

    const collision = duplicateEvidenceService.checkCandidateEvidence(candidate);
    expect(collision).toBeDefined();
    expect(collision?.vectors).toContain("perceptual_dhash");
    expect(collision?.hammingDistance).toBeLessThanOrEqual(6);
    expect(collision?.visualSimilarityPct).toBeGreaterThanOrEqual(90);
    expect(collision?.matchingRecord.treeId).toBe("TREE-TEAK-2104");
  });

  it("detects spatiotemporal geodetic collision when photo is recycled at disjoint locations", () => {
    const candidate: Partial<EvidenceRecord> = {
      id: "CAND-003",
      treeId: "TREE-GHOST-LOCATION",
      planterId: "USR-SUSPECT-777",
      photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
      sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
      dhash: "a4f8c2e19b0d3e5f",
      gps: { latitude: 18.56000, longitude: 73.90000 }, // ~6.3 km away
      timestamp: "2026-09-25T12:00:00.000Z",
    };

    const collision = duplicateEvidenceService.checkCandidateEvidence(candidate);
    expect(collision).toBeDefined();
    expect(collision?.vectors).toContain("geospatial_mismatch");
    expect(collision?.spatialDistanceMeters).toBeGreaterThan(1000);
    expect(collision?.riskLevel).toBe("critical_fraud");
  });

  it("returns null for completely unique authentic evidence", () => {
    const candidate: Partial<EvidenceRecord> = {
      id: "CAND-004",
      treeId: "TREE-GENUINE-999",
      planterId: "USR-HONEST-101",
      photoUrl: "https://images.unsplash.com/photo-1502082553048-unique",
      sha256: "completely_fresh_random_hash_abc1234567890",
      dhash: "0011223344556677", // Completely distant from all seed hashes
      gps: { latitude: 18.52048, longitude: 73.85679 },
      timestamp: "2026-09-25T13:00:00.000Z",
    };

    const collision = duplicateEvidenceService.checkCandidateEvidence(candidate);
    expect(collision).toBeNull();
  });

  it("scans repository and clusters duplicates by perceptual hash fingerprints", () => {
    const summary = duplicateEvidenceService.scanRepositoryForDuplicates();
    expect(summary.scannedCount).toBeGreaterThanOrEqual(5);
    expect(summary.clusters.length).toBeGreaterThanOrEqual(1);
    expect(summary.criticalFraudCount).toBeGreaterThanOrEqual(1);

    const banyanCluster = summary.clusters.find((cl) => cl.dhashFingerprint.startsWith("a4f8c2e1"));
    expect(banyanCluster).toBeDefined();
    expect(banyanCluster?.records.length).toBeGreaterThanOrEqual(2);
  });

  it("allows auditors to resolve collisions with actions and notes", () => {
    const collisions = duplicateEvidenceService.getCollisions();
    expect(collisions.length).toBeGreaterThan(0);

    const targetCollision = collisions[0];
    const resolved = duplicateEvidenceService.resolveCollision(
      targetCollision.id,
      "confirmed_fraud_rejected",
      "Auditor confirmed duplicate photo submitted across disjoint coordinates.",
      "auditor_super"
    );

    expect(resolved.resolutionStatus).toBe("confirmed_fraud_rejected");
    expect(resolved.resolvedBy).toBe("auditor_super");
    expect(resolved.resolutionNotes).toContain("confirmed duplicate");
  });

  it("allows granting legitimate exception overrides for valid re-uploads", () => {
    const collisions = duplicateEvidenceService.getCollisions();
    const targetCollision = collisions[0];

    const resolved = duplicateEvidenceService.resolveCollision(
      targetCollision.id,
      "legitimate_exception_granted",
      "Legitimate re-upload by same planter after field re-inspection.",
      "auditor_super"
    );

    expect(resolved.resolutionStatus).toBe("legitimate_exception_granted");
  });
});
