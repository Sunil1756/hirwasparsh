import { describe, it, expect, beforeEach } from "vitest";
import {
  evidenceVerificationService,
  PlantationClaim,
  GPSCoordinate,
  VerificationStatus,
  TrustTier,
} from "../services/evidenceVerificationService";

describe("Evidence Verification Workflow & Trust Engine (Task 40)", () => {
  beforeEach(() => {
    evidenceVerificationService.resetToDefaults();
  });

  it("initializes with sample claims and screening scores", () => {
    const claims = evidenceVerificationService.getClaims();
    expect(claims.length).toBeGreaterThanOrEqual(4);

    const highTrustClaim = claims.find((c) => c.id === "CLM-2026-001");
    expect(highTrustClaim).toBeDefined();
    expect(highTrustClaim?.trustTier).toBe("high_trust");
    expect(highTrustClaim?.compositeConfidenceScore).toBeGreaterThanOrEqual(85);
  });

  it("accurately screens Geodetic Geofence boundary proximity", () => {
    const claims = evidenceVerificationService.getClaims();
    const normalClaim = claims.find((c) => c.id === "CLM-2026-001")!;
    const screening = evidenceVerificationService.getScreeningResult(normalClaim.id);

    expect(screening).toBeDefined();
    expect(screening?.checks.geofence.passed).toBe(true);
    expect(screening?.checks.geofence.score).toBeGreaterThanOrEqual(90);
  });

  it("flags photo deduplication when duplicate image hash is submitted", () => {
    const claims = evidenceVerificationService.getClaims();
    const dupClaim = claims.find((c) => c.id === "CLM-2026-004")!;
    const screening = evidenceVerificationService.getScreeningResult(dupClaim.id);

    expect(screening?.checks.deduplication.passed).toBe(false);
    expect(screening?.checks.deduplication.score).toBeLessThan(50);
    expect(dupClaim.trustTier).toBe("low_flagged");
  });

  it("detects impossible silvicultural growth velocity anomalies", () => {
    const claims = evidenceVerificationService.getClaims();
    const anomalyClaim = claims.find((c) => c.id === "CLM-2026-003")!;
    const screening = evidenceVerificationService.getScreeningResult(anomalyClaim.id);

    expect(screening?.checks.growthPhysics.passed).toBe(false);
    expect(screening?.checks.growthPhysics.growthRateCmPerDay).toBeGreaterThan(3.0);
    expect(anomalyClaim.trustTier).toBe("low_flagged");
  });

  it("verifies a claim, updates status, generates cryptographic seal and audit record", async () => {
    const claimId = "CLM-2026-001";
    const receipt = await evidenceVerificationService.verifyClaim(
      claimId,
      "inspector_alice",
      "All parameters validated through screening matrix."
    );

    expect(receipt).toBeDefined();
    expect(receipt.claimId).toBe(claimId);
    expect(receipt.verifierId).toBe("inspector_alice");
    expect(receipt.sha256Seal).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.qrPayload).toContain("hirwasparsh.org/verify/receipt");

    const updatedClaim = evidenceVerificationService.getClaim(claimId);
    expect(updatedClaim?.status).toBe("verified");
    expect(updatedClaim?.verificationReceipt).toBeDefined();
    expect(updatedClaim?.auditLog.length).toBeGreaterThan(1);
    expect(updatedClaim?.auditLog[updatedClaim.auditLog.length - 1].action).toBe("VERIFIED");
  });

  it("rejects a claim with specified rationale and logs audit", async () => {
    const claimId = "CLM-2026-004";
    const updatedClaim = await evidenceVerificationService.rejectClaim(
      claimId,
      "auditor_bob",
      "Duplicate photo hash detected across multiple claims."
    );

    expect(updatedClaim.status).toBe("rejected");
    expect(updatedClaim.auditLog[updatedClaim.auditLog.length - 1].action).toBe("REJECTED");
    expect(updatedClaim.auditLog[updatedClaim.auditLog.length - 1].notes).toContain("Duplicate photo");
  });

  it("requests a re-audit for questionable evidence", async () => {
    const claimId = "CLM-2026-002";
    const updatedClaim = await evidenceVerificationService.requestReAudit(
      claimId,
      "auditor_charlie",
      "GPS position delta exceeds 15m; please recapture at trunk base."
    );

    expect(updatedClaim.status).toBe("re_audit_requested");
    expect(updatedClaim.auditLog[updatedClaim.auditLog.length - 1].action).toBe("RE_AUDIT_REQUESTED");
  });

  it("batch auto-approves all eligible high-trust claims", async () => {
    const result = await evidenceVerificationService.batchAutoApproveHighTrust("system_batch_verifier");
    expect(result.verifiedCount).toBeGreaterThanOrEqual(1);
    expect(result.receipts.length).toBe(result.verifiedCount);

    const highTrustClaim = evidenceVerificationService.getClaim("CLM-2026-001");
    expect(highTrustClaim?.status).toBe("verified");
  });

  it("supports submitting a new claim and immediately runs multi-check screening", () => {
    const newClaim = evidenceVerificationService.submitClaim({
      treeId: "TREE-NEEM-9999",
      species: "Azadirachta indica (Neem)",
      heightCm: 140,
      healthStatus: "healthy",
      gpsLocation: { latitude: 18.52044, longitude: 73.85675 },
      planterId: "USR-PUNE-888",
      photoEvidence: {
        photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
        imageSha256: "unique_fresh_image_hash_9999",
        capturedAt: new Date().toISOString(),
        exifData: {
          cameraModel: "Pixel 8 Pro",
          dateTimeOriginal: new Date().toISOString(),
          gpsLatitude: 18.52044,
          gpsLongitude: 73.85675,
          softwareVersion: "GCamera-v9",
        },
        watermarkData: {
          treeId: "TREE-NEEM-9999",
          timestamp: new Date().toISOString(),
          gpsCoords: { latitude: 18.52044, longitude: 73.85675 },
          planterId: "USR-PUNE-888",
        },
      },
      historicalBaseline: {
        heightCm: 110,
        recordedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      },
    });

    expect(newClaim.id).toBeDefined();
    expect(newClaim.status).toBe("submitted");
    expect(newClaim.compositeConfidenceScore).toBeGreaterThanOrEqual(80);
    expect(newClaim.trustTier).toBe("high_trust");

    const screening = evidenceVerificationService.getScreeningResult(newClaim.id);
    expect(screening).toBeDefined();
    expect(screening?.checks.geofence.passed).toBe(true);
    expect(screening?.checks.deduplication.passed).toBe(true);
    expect(screening?.checks.growthPhysics.passed).toBe(true);
  });
});
