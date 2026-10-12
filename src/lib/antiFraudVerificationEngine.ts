/**
 * Green Enlightenment — Phase 4: AI Multi-Modal Verification & Anti-Fraud Engine
 * 
 * Comprehensive fraud defense orchestrating:
 * 1. Cryptographic Binary Hash Deduplication (SHA-256 exact collision check)
 * 2. Perceptual Difference Hashing (64-bit dHash & Hamming Distance)
 * 3. EXIF Metadata Integrity & Freshness (24-hour freshness, device vs EXIF GPS cross-check)
 * 4. Multi-Modal Botanical & Environmental Verification (Gemini AI gatekeeper)
 * 5. Mature Tree Fraud Detection (Rejecting pre-existing adult trees masquerading as saplings)
 */

import { calculateHammingDistance, calculateHashSimilarity } from "./perceptualHash";
import { haversineMeters } from "./imageProcessing";
import { VerificationResult } from "./gemini";

export type AntiFraudVerdict =
  | "VERIFIED_AUTHENTIC"
  | "FLAGGED_FOR_MANUAL_REVIEW"
  | "AUTO_REJECTED";

export interface ExifValidationInput {
  photoTimestamp?: string | Date | null;
  exifLatitude?: number | null;
  exifLongitude?: number | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  submissionTimestamp?: string | Date;
  deviceLatitude: number;
  deviceLongitude: number;
}

export interface ExifValidationResult {
  isValid: boolean;
  isFresh: boolean;
  ageHours: number;
  hasGpsMetadata: boolean;
  gpsDiscrepancyMeters: number | null;
  isGpsConsistent: boolean;
  hasCameraHardwareMetadata: boolean;
  warnings: string[];
}

export interface DuplicateCheckInput {
  candidateSha256?: string | null;
  candidateDhash?: string | null;
  existingRecords: Array<{
    id: string;
    tree_name?: string;
    sha256?: string | null;
    photo_hash?: string | null;
    phash?: string | null;
  }>;
}

export interface DuplicateCheckResult {
  isExactDuplicate: boolean;
  isPerceptualDuplicate: boolean;
  matchedTreeId?: string;
  matchedTreeName?: string;
  lowestHammingDistance: number;
  highestSimilarityPct: number;
  riskLevel: "none" | "low" | "suspect" | "critical_fraud";
  reason?: string;
}

export interface MultiModalFraudInput {
  sha256Hash?: string | null;
  dhashFingerprint?: string | null;
  existingRecords?: DuplicateCheckInput["existingRecords"];
  exifInput?: ExifValidationInput;
  aiVerification?: Partial<VerificationResult> | null;
  claimedSpecies?: string;
}

export interface ComprehensiveAntiFraudResult {
  verdict: AntiFraudVerdict;
  compositeTrustScore: number; // 0 - 100
  autoRejected: boolean;
  isDuplicateFraud: boolean;
  isExifSuspect: boolean;
  isNonTreeOrIndoor: boolean;
  isMatureTreeFraud: boolean;
  speciesMatchConfirmed: boolean;
  rejectionReasons: string[];
  fraudSignals: string[];
  auditNotes: string;
  duplicateDetails: DuplicateCheckResult;
  exifDetails?: ExifValidationResult;
}

/**
 * Validates EXIF metadata timestamp freshness, camera hardware authenticity,
 * and cross-validates photo GPS coordinates against live device GPS.
 */
export function validateExifMetadata(input: ExifValidationInput): ExifValidationResult {
  const warnings: string[] = [];
  const submissionTime = input.submissionTimestamp
    ? new Date(input.submissionTimestamp).getTime()
    : Date.now();

  let ageHours = 0;
  let isFresh = true;

  if (input.photoTimestamp) {
    const photoTime = new Date(input.photoTimestamp).getTime();
    if (!isNaN(photoTime)) {
      ageHours = Math.max(0, Math.round(((submissionTime - photoTime) / (1000 * 60 * 60)) * 10) / 10);
      if (ageHours > 24) {
        isFresh = false;
        warnings.push(`Photo timestamp is ${ageHours}h old (exceeds 24-hour freshness requirement for live ground truth).`);
      }
    } else {
      warnings.push("Malformed EXIF photo timestamp.");
    }
  } else {
    warnings.push("No EXIF timestamp found. Image may be a screenshot or re-saved file.");
  }

  // Camera hardware inspection (screenshots/downloads typically strip make & model)
  const hasCameraHardwareMetadata = Boolean(input.cameraMake || input.cameraModel);
  if (!hasCameraHardwareMetadata) {
    warnings.push("Camera hardware tags missing. Potential web download or edited screenshot.");
  }

  // GPS cross-check: Compare photo EXIF GPS against live device GPS lock
  const hasGpsMetadata =
    typeof input.exifLatitude === "number" &&
    typeof input.exifLongitude === "number" &&
    !isNaN(input.exifLatitude) &&
    !isNaN(input.exifLongitude);

  let gpsDiscrepancyMeters: number | null = null;
  let isGpsConsistent = true;

  if (hasGpsMetadata && input.exifLatitude !== null && input.exifLongitude !== null) {
    gpsDiscrepancyMeters = Math.round(
      haversineMeters(
        input.exifLatitude,
        input.exifLongitude,
        input.deviceLatitude,
        input.deviceLongitude
      )
    );

    // If EXIF GPS is more than 100 meters away from live registered GPS
    if (gpsDiscrepancyMeters > 100) {
      isGpsConsistent = false;
      warnings.push(
        `EXIF GPS location is ${gpsDiscrepancyMeters}m away from live device GPS lock (threshold: 100m).`
      );
    }
  } else {
    warnings.push("No GPS metadata found in photo EXIF headers.");
  }

  const isValid = isFresh && isGpsConsistent;

  return {
    isValid,
    isFresh,
    ageHours,
    hasGpsMetadata,
    gpsDiscrepancyMeters,
    isGpsConsistent,
    hasCameraHardwareMetadata,
    warnings,
  };
}

/**
 * Evaluates binary SHA-256 collisions and perceptual dHash Hamming distance
 * against the existing tree repository.
 */
export function evaluateDuplicatePhotoIntegrity(input: DuplicateCheckInput): DuplicateCheckResult {
  const { candidateSha256, candidateDhash, existingRecords } = input;

  if (!existingRecords || existingRecords.length === 0) {
    return {
      isExactDuplicate: false,
      isPerceptualDuplicate: false,
      lowestHammingDistance: 64,
      highestSimilarityPct: 0,
      riskLevel: "none",
    };
  }

  // 1. Exact Binary SHA-256 Collision Check
  if (candidateSha256) {
    const cleanCandSha = candidateSha256.trim().toLowerCase();
    for (const record of existingRecords) {
      const existingSha = (record.sha256 || record.photo_hash || "").trim().toLowerCase();
      if (existingSha && existingSha === cleanCandSha) {
        return {
          isExactDuplicate: true,
          isPerceptualDuplicate: true,
          matchedTreeId: record.id,
          matchedTreeName: record.tree_name,
          lowestHammingDistance: 0,
          highestSimilarityPct: 100,
          riskLevel: "critical_fraud",
          reason: `Exact identical binary photo match detected (Tree #${record.id.slice(0, 8)}). The exact same image file has already been registered.`,
        };
      }
    }
  }

  // 2. Perceptual dHash Hamming Distance Check
  if (!candidateDhash) {
    return {
      isExactDuplicate: false,
      isPerceptualDuplicate: false,
      lowestHammingDistance: 64,
      highestSimilarityPct: 0,
      riskLevel: "none",
    };
  }

  let lowestDistance = 64;
  let highestSimilarity = 0;
  let closestRecord: (typeof existingRecords)[0] | null = null;

  for (const record of existingRecords) {
    if (!record.phash) continue;
    const distance = calculateHammingDistance(candidateDhash, record.phash);
    const similarity = calculateHashSimilarity(candidateDhash, record.phash);

    if (distance < lowestDistance) {
      lowestDistance = distance;
      highestSimilarity = similarity;
      closestRecord = record;
    }
  }

  // Critical Perceptual Fraud: Hamming Distance <= 3 (>= 95% identical)
  if (lowestDistance <= 3) {
    return {
      isExactDuplicate: false,
      isPerceptualDuplicate: true,
      matchedTreeId: closestRecord?.id,
      matchedTreeName: closestRecord?.tree_name,
      lowestHammingDistance: lowestDistance,
      highestSimilarityPct: highestSimilarity,
      riskLevel: "critical_fraud",
      reason: `Near-identical re-compressed image detected (${highestSimilarity}% visual match with Tree #${closestRecord?.id?.slice(0, 8)}). Photo recycling is strictly forbidden.`,
    };
  }

  // Suspect Perceptual Similarity: Hamming Distance <= 6 (>= 90% identical)
  if (lowestDistance <= 6) {
    return {
      isExactDuplicate: false,
      isPerceptualDuplicate: true,
      matchedTreeId: closestRecord?.id,
      matchedTreeName: closestRecord?.tree_name,
      lowestHammingDistance: lowestDistance,
      highestSimilarityPct: highestSimilarity,
      riskLevel: "suspect",
      reason: `High perceptual visual similarity (${highestSimilarity}% match with Tree #${closestRecord?.id?.slice(0, 8)}). Queued for manual verification.`,
    };
  }

  return {
    isExactDuplicate: false,
    isPerceptualDuplicate: false,
    matchedTreeId: closestRecord?.id,
    matchedTreeName: closestRecord?.tree_name,
    lowestHammingDistance: lowestDistance,
    highestSimilarityPct: highestSimilarity,
    riskLevel: lowestDistance <= 10 ? "low" : "none",
  };
}

/**
 * End-to-end master anti-fraud gatekeeper synthesizing:
 * - SHA-256 exact deduplication
 * - Perceptual dHash visual collision
 * - EXIF metadata freshness and location consistency
 * - Multi-modal botanical vision (Gemini AI)
 */
export function evaluateTreeSubmissionFraudRisk(
  input: MultiModalFraudInput
): ComprehensiveAntiFraudResult {
  const rejectionReasons: string[] = [];
  const fraudSignals: string[] = [];

  // 1. Evaluate Duplicate Integrity
  const duplicateDetails = evaluateDuplicatePhotoIntegrity({
    candidateSha256: input.sha256Hash,
    candidateDhash: input.dhashFingerprint,
    existingRecords: input.existingRecords || [],
  });

  const isDuplicateFraud =
    duplicateDetails.isExactDuplicate ||
    (duplicateDetails.isPerceptualDuplicate && duplicateDetails.riskLevel === "critical_fraud");

  if (isDuplicateFraud) {
    rejectionReasons.push(duplicateDetails.reason || "Duplicate photo fraud detected.");
    fraudSignals.push("DUPLICATE_PHOTO_COLLISION");
  } else if (duplicateDetails.riskLevel === "suspect") {
    fraudSignals.push("SUSPECT_PERCEPTUAL_SIMILARITY");
  }

  // 2. Evaluate EXIF Freshness & Device Consistency
  let exifDetails: ExifValidationResult | undefined;
  let isExifSuspect = false;

  if (input.exifInput) {
    exifDetails = validateExifMetadata(input.exifInput);
    if (!exifDetails.isFresh) {
      fraudSignals.push("STALE_PHOTO_METADATA");
      isExifSuspect = true;
    }
    if (!exifDetails.isGpsConsistent) {
      fraudSignals.push("GPS_EXIF_DISCREPANCY");
      isExifSuspect = true;
    }
  }

  // 3. Evaluate AI Multi-Modal Screening
  const ai = input.aiVerification;
  let isNonTreeOrIndoor = false;
  let isMatureTreeFraud = false;
  let speciesMatchConfirmed = true;

  if (ai) {
    // Check if image fails basic living tree criteria
    if (ai.is_tree === false) {
      isNonTreeOrIndoor = true;
      rejectionReasons.push("AI Screening: No living tree or sapling detected in image.");
      fraudSignals.push("NON_TREE_IMAGE");
    }

    if (ai.is_indoor === true) {
      isNonTreeOrIndoor = true;
      rejectionReasons.push("AI Screening: Indoor setting detected (tile, wall, or tabletop). Outdoor plantation required.");
      fraudSignals.push("INDOOR_PHOTO");
    }

    if (ai.is_screenshot === true || ai.is_ai_generated === true) {
      isNonTreeOrIndoor = true;
      rejectionReasons.push("AI Screening: Digital screenshot, screen capture, or synthetic AI image detected.");
      fraudSignals.push("SYNTHETIC_SCREENSHOT");
    }

    // Mature Tree Fraud Detection
    if (ai.plantation_stage === "mature") {
      isMatureTreeFraud = true;
      rejectionReasons.push("Mature Tree Fraud: Photo depicts an existing full-grown adult tree rather than a newly planted sapling.");
      fraudSignals.push("MATURE_TREE_FRAUD");
    }

    // Species verification
    if (input.claimedSpecies && ai.detected_species) {
      const claimed = input.claimedSpecies.trim().toLowerCase();
      const detected = ai.detected_species.trim().toLowerCase();
      if (!detected.includes(claimed) && !claimed.includes(detected)) {
        speciesMatchConfirmed = false;
        fraudSignals.push(`SPECIES_MISMATCH: Claimed '${input.claimedSpecies}', AI detected '${ai.detected_species}'`);
      }
    }

    if (ai.auto_rejected && ai.rejection_reasons && ai.rejection_reasons.length > 0) {
      ai.rejection_reasons.forEach((r) => {
        if (!rejectionReasons.includes(r)) rejectionReasons.push(r);
      });
    }
  }

  // 4. Calculate Composite Trust Score (0 - 100)
  let score = 100;

  if (isDuplicateFraud) score -= 90;
  else if (duplicateDetails.riskLevel === "suspect") score -= 35;

  if (isNonTreeOrIndoor) score -= 60;
  if (isMatureTreeFraud) score -= 60;
  if (!speciesMatchConfirmed) score -= 15;
  if (isExifSuspect) score -= 20;

  if (ai?.environmental_authenticity_score !== undefined) {
    score = Math.round((score * 0.6 + ai.environmental_authenticity_score * 0.4));
  }

  const compositeTrustScore = Math.max(0, Math.min(100, score));

  // 5. Final Verdict Determination
  let verdict: AntiFraudVerdict = "VERIFIED_AUTHENTIC";
  const autoRejected = rejectionReasons.length > 0 || isDuplicateFraud || isNonTreeOrIndoor || isMatureTreeFraud;

  if (autoRejected) {
    verdict = "AUTO_REJECTED";
  } else if (compositeTrustScore < 70 || fraudSignals.length > 0) {
    verdict = "FLAGGED_FOR_MANUAL_REVIEW";
  }

  const auditNotes = autoRejected
    ? `Submission rejected: ${rejectionReasons.join("; ")}`
    : verdict === "FLAGGED_FOR_MANUAL_REVIEW"
    ? `Submission flagged for admin review (${fraudSignals.join(", ")}). Composite Trust Score: ${compositeTrustScore}%.`
    : `Submission verified authentic. Trust score: ${compositeTrustScore}%. Clean perceptual & botanical evidence.`;

  return {
    verdict,
    compositeTrustScore,
    autoRejected,
    isDuplicateFraud,
    isExifSuspect,
    isNonTreeOrIndoor,
    isMatureTreeFraud,
    speciesMatchConfirmed,
    rejectionReasons,
    fraudSignals,
    auditNotes,
    duplicateDetails,
    exifDetails,
  };
}
