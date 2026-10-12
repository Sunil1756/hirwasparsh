import { describe, it, expect } from "vitest";
import {
  validateExifMetadata,
  evaluateDuplicatePhotoIntegrity,
  evaluateTreeSubmissionFraudRisk,
} from "../lib/antiFraudVerificationEngine";
import {
  calculateHammingDistance,
  calculateHashSimilarity,
} from "../lib/perceptualHash";

describe("Phase 4: EXIF Freshness & Device GPS Cross-Check", () => {
  const baseDeviceGps = {
    deviceLatitude: 18.5204,
    deviceLongitude: 73.8567,
  };

  it("verifies a fresh outdoor photo taken recently at the matching location", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = validateExifMetadata({
      photoTimestamp: oneHourAgo,
      exifLatitude: 18.52045, // ~6 meters away
      exifLongitude: 73.85672,
      cameraMake: "Samsung",
      cameraModel: "Galaxy S23",
      ...baseDeviceGps,
    });

    expect(result.isValid).toBe(true);
    expect(result.isFresh).toBe(true);
    expect(result.isGpsConsistent).toBe(true);
    expect(result.hasCameraHardwareMetadata).toBe(true);
    expect(result.gpsDiscrepancyMeters).toBeLessThan(15);
    expect(result.warnings).toHaveLength(0);
  });

  it("strictly flags stale photos older than 24 hours (gallery upload fraud)", () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const result = validateExifMetadata({
      photoTimestamp: threeDaysAgo,
      exifLatitude: 18.5204,
      exifLongitude: 73.8567,
      cameraMake: "Apple",
      cameraModel: "iPhone 15",
      ...baseDeviceGps,
    });

    expect(result.isValid).toBe(false);
    expect(result.isFresh).toBe(false);
    expect(result.ageHours).toBeGreaterThanOrEqual(71);
    expect(result.warnings.some((w) => w.includes("24-hour freshness"))).toBe(true);
  });

  it("detects GPS spoofing when photo EXIF is far away from device GPS (>100m)", () => {
    const freshTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const result = validateExifMetadata({
      photoTimestamp: freshTime,
      // Coordinates in Mumbai (~120km away from Pune)
      exifLatitude: 19.0760,
      exifLongitude: 72.8777,
      cameraMake: "Google",
      cameraModel: "Pixel 8",
      ...baseDeviceGps,
    });

    expect(result.isValid).toBe(false);
    expect(result.isGpsConsistent).toBe(false);
    expect(result.gpsDiscrepancyMeters).toBeGreaterThan(1000);
    expect(result.warnings.some((w) => w.includes("threshold: 100m"))).toBe(true);
  });

  it("flags missing camera hardware metadata (screenshots or downloaded memes)", () => {
    const result = validateExifMetadata({
      cameraMake: null,
      cameraModel: null,
      ...baseDeviceGps,
    });

    expect(result.hasCameraHardwareMetadata).toBe(false);
    expect(result.warnings.some((w) => w.includes("Camera hardware tags missing"))).toBe(true);
  });
});

describe("Phase 4: Cryptographic SHA-256 & Perceptual dHash Duplicate Detection", () => {
  const existingRecords = [
    {
      id: "tree-001",
      tree_name: "Original Neem Sapling",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      phash: "f8e0c08000000000",
    },
    {
      id: "tree-002",
      tree_name: "Original Banyan Sapling",
      sha256: "a1b2c3d4e5f600112233445566778899aabbccddeeff00112233445566778899",
      phash: "000000000000ffff",
    },
  ];

  it("blocks exact SHA-256 binary collisions immediately as critical fraud", () => {
    const dup = evaluateDuplicatePhotoIntegrity({
      candidateSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      candidateDhash: "1234567890abcdef",
      existingRecords,
    });

    expect(dup.isExactDuplicate).toBe(true);
    expect(dup.riskLevel).toBe("critical_fraud");
    expect(dup.matchedTreeId).toBe("tree-001");
    expect(dup.reason).toContain("Exact identical binary photo match detected");
  });

  it("blocks perceptual dHash near-identical images (Hamming distance <= 3)", () => {
    // Distance 1 from tree-001 ("f8e0c08000000000" vs "f8e0c08000000001")
    const dup = evaluateDuplicatePhotoIntegrity({
      candidateSha256: "unique-sha-different-compression",
      candidateDhash: "f8e0c08000000001",
      existingRecords,
    });

    expect(dup.isExactDuplicate).toBe(false);
    expect(dup.isPerceptualDuplicate).toBe(true);
    expect(dup.riskLevel).toBe("critical_fraud");
    expect(dup.lowestHammingDistance).toBe(1);
    expect(dup.highestSimilarityPct).toBeGreaterThanOrEqual(95);
    expect(dup.matchedTreeId).toBe("tree-001");
    expect(dup.reason).toContain("Near-identical re-compressed image detected");
  });

  it("flags suspect perceptual similarity (Hamming distance 4-6) for manual review", () => {
    // Difference of 5 bits from tree-001
    // f8e0c08000000000 vs f8e0c0800000001f (bits in 0x1f = 5 bits)
    const suspect = evaluateDuplicatePhotoIntegrity({
      candidateSha256: "another-sha",
      candidateDhash: "f8e0c0800000001f",
      existingRecords,
    });

    expect(suspect.isPerceptualDuplicate).toBe(true);
    expect(suspect.riskLevel).toBe("suspect");
    expect(suspect.lowestHammingDistance).toBe(5);
    expect(suspect.reason).toContain("High perceptual visual similarity");
  });

  it("clears unique botanical images with large Hamming distance", () => {
    // Inverted hash has Hamming distance 56
    const unique = evaluateDuplicatePhotoIntegrity({
      candidateSha256: "brand-new-hash",
      candidateDhash: "0f1f3f7fffffffff",
      existingRecords,
    });

    expect(unique.isExactDuplicate).toBe(false);
    expect(unique.isPerceptualDuplicate).toBe(false);
    expect(unique.riskLevel).toBe("none");
  });

  it("computes Hamming distance and hash similarity accurately", () => {
    expect(calculateHammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(calculateHashSimilarity("0000000000000000", "0000000000000000")).toBe(100);

    // 0x1 differs by 1 bit from 0x0
    expect(calculateHammingDistance("0000000000000000", "0000000000000001")).toBe(1);

    // 0xf (1111) differs by 4 bits from 0x0 (0000)
    expect(calculateHammingDistance("0000000000000000", "000000000000000f")).toBe(4);
  });
});

describe("Phase 4: Multi-Modal AI Screening & Fraud Gatekeeper", () => {
  it("auto-rejects non-tree images (e.g. selfies without plants, animals, cars)", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      aiVerification: {
        is_tree: false,
        auto_rejected: true,
        rejection_reasons: ["No living tree found in picture."],
        environmental_authenticity_score: 20,
      },
    });

    expect(result.verdict).toBe("AUTO_REJECTED");
    expect(result.autoRejected).toBe(true);
    expect(result.isNonTreeOrIndoor).toBe(true);
    expect(result.fraudSignals).toContain("NON_TREE_IMAGE");
    expect(result.compositeTrustScore).toBeLessThan(50);
  });

  it("auto-rejects indoor houseplant or tabletop photos", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      aiVerification: {
        is_tree: true,
        is_indoor: true,
        auto_rejected: true,
        rejection_reasons: ["Photo taken indoors on tile flooring."],
      },
    });

    expect(result.verdict).toBe("AUTO_REJECTED");
    expect(result.isNonTreeOrIndoor).toBe(true);
    expect(result.fraudSignals).toContain("INDOOR_PHOTO");
  });

  it("auto-rejects screenshots and computer screen captures", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      aiVerification: {
        is_tree: true,
        is_screenshot: true,
        auto_rejected: true,
      },
    });

    expect(result.verdict).toBe("AUTO_REJECTED");
    expect(result.fraudSignals).toContain("SYNTHETIC_SCREENSHOT");
  });

  it("strictly auto-rejects Mature Tree Fraud (claiming 10-year-old tree as new plantation)", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      aiVerification: {
        is_tree: true,
        is_indoor: false,
        plantation_stage: "mature", // Mature tree fraud
        auto_rejected: true,
        rejection_reasons: ["Full grown 10-year old adult tree detected."],
      },
    });

    expect(result.verdict).toBe("AUTO_REJECTED");
    expect(result.isMatureTreeFraud).toBe(true);
    expect(result.fraudSignals).toContain("MATURE_TREE_FRAUD");
    expect(result.rejectionReasons.some((r) => r.includes("Mature Tree Fraud"))).toBe(true);
  });

  it("flags species mismatch for manual review (Claimed Neem, AI detected Banyan)", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      claimedSpecies: "Neem",
      aiVerification: {
        is_tree: true,
        is_indoor: false,
        is_screenshot: false,
        plantation_stage: "sapling",
        detected_species: "Banyan",
        environmental_authenticity_score: 85,
      },
    });

    expect(result.speciesMatchConfirmed).toBe(false);
    expect(result.verdict).toBe("FLAGGED_FOR_MANUAL_REVIEW");
    expect(result.fraudSignals.some((s) => s.includes("SPECIES_MISMATCH"))).toBe(true);
  });

  it("approves genuine living sapling with clean perceptual and botanical evidence", () => {
    const result = evaluateTreeSubmissionFraudRisk({
      sha256Hash: "unique-sha-123",
      dhashFingerprint: "1122334455667788",
      claimedSpecies: "Neem",
      existingRecords: [],
      exifInput: {
        photoTimestamp: new Date().toISOString(),
        exifLatitude: 18.5204,
        exifLongitude: 73.8567,
        cameraMake: "OnePlus",
        cameraModel: "11R",
        deviceLatitude: 18.5204,
        deviceLongitude: 73.8567,
      },
      aiVerification: {
        is_tree: true,
        is_indoor: false,
        is_screenshot: false,
        is_ai_generated: false,
        plantation_stage: "sapling",
        detected_species: "Neem",
        environmental_authenticity_score: 95,
        image_authenticity_score: 92,
        tree_visibility_score: 90,
      },
    });

    expect(result.verdict).toBe("VERIFIED_AUTHENTIC");
    expect(result.autoRejected).toBe(false);
    expect(result.compositeTrustScore).toBeGreaterThanOrEqual(85);
    expect(result.speciesMatchConfirmed).toBe(true);
    expect(result.fraudSignals).toHaveLength(0);
    expect(result.auditNotes).toContain("verified authentic");
  });
});
