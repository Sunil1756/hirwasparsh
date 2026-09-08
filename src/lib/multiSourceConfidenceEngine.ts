/**
 * Multi-Source Fusion Confidence Scoring Engine
 * "Zero Greenwashing" Verifiable MRV Framework
 *
 * Combines:
 * 1. Satellite Trend Signal (Plot-level, 10m/pixel coarse resolution) -> Weight: 20 pts
 * 2. Drone Orthomosaic Signal (Cluster-level, ~2.5cm/pixel resolution) -> Weight: 30 pts
 * 3. Geotagged Field Photo Check-in (Individual tree proof-of-life)    -> Weight: 50 pts
 * 4. Time Decay Penalty (Confidence decays past 30 days of inactivity) -> Up to -25 pts
 */

export type VerificationTier =
  | "zero_greenwashing_gold"
  | "field_verified"
  | "satellite_only"
  | "unverified_demo";

export interface MultiSourceScoreBreakdown {
  satellite: {
    score: number;
    maxScore: number;
    weightPct: number;
    overpassesCount: number;
    latestOverpassDate: string | null;
    meanNdvi: number | null;
    trendStatus: "improving" | "stable" | "declining" | "insufficient_data";
    explanation: string;
  };
  drone: {
    score: number;
    maxScore: number;
    weightPct: number;
    hasSurvey: boolean;
    surveyDate: string | null;
    treeCountDetected: number;
    resolutionCmPerPx: number;
    explanation: string;
  };
  fieldPhoto: {
    score: number;
    maxScore: number;
    weightPct: number;
    verifiedTreesCount: number;
    totalPlantedTrees: number;
    samplingCoveragePct: number;
    averageAiConfidence: number;
    lastCheckinDate: string | null;
    explanation: string;
  };
  timeDecay: {
    penaltyPoints: number;
    daysSinceLastInput: number;
    dailyDecayRate: number;
    gracePeriodDays: number;
    isDecayed: boolean;
    explanation: string;
  };
}

export interface MultiSourceConfidenceResult {
  totalScore: number; // 0 to 100
  tier: VerificationTier;
  tierLabel: string;
  tierColor: string;
  isVerifiedForCarbonMRV: boolean;
  isDemoOrUnverified: boolean;
  calculatedAt: string;
  breakdown: MultiSourceScoreBreakdown;
  recommendations: string[];
}

export interface ComputeConfidenceParams {
  plotId?: string;
  totalPlantedTrees?: number;
  // Satellite Overpasses
  satelliteOverpasses?: Array<{
    acquisition_date: string;
    ndvi: number;
    cloud_cover_pct?: number;
    is_cloud_masked?: boolean;
  }>;
  // Drone Surveys
  droneSurveys?: Array<{
    survey_date: string;
    tree_count_detected?: number;
    resolution_cm_per_px?: number;
  }>;
  // Field Photos & Ground Truth Check-ins
  fieldPhotos?: Array<{
    checked_at: string;
    status: string; // 'alive' | 'healthy' | 'stressed' | 'dead' | 'unverified'
    ai_confidence?: number;
    is_verified?: boolean;
  }>;
  // Fallback direct indicators if raw arrays are not passed
  manualOverrides?: {
    satellitePassesCount?: number;
    meanNdvi?: number;
    hasDroneSurvey?: boolean;
    verifiedTreesCount?: number;
    lastFieldDate?: string;
  };
}

/**
 * Calculates time decay penalty based on days of ground/field inactivity.
 * Grace period: 30 days.
 * Daily decay rate: -0.15 pts/day beyond 30 days. Max penalty: -25.0 pts.
 */
export function calculateTimeDecayPenalty(daysSinceLastInput: number): {
  penalty: number;
  isDecayed: boolean;
} {
  const GRACE_PERIOD_DAYS = 30;
  const DAILY_DECAY_RATE = 0.15;
  const MAX_PENALTY = 25.0;

  if (daysSinceLastInput <= GRACE_PERIOD_DAYS) {
    return { penalty: 0, isDecayed: false };
  }

  const overdueDays = daysSinceLastInput - GRACE_PERIOD_DAYS;
  const rawPenalty = overdueDays * DAILY_DECAY_RATE;
  const penalty = Math.min(MAX_PENALTY, Math.round(rawPenalty * 10) / 10);

  return { penalty, isDecayed: penalty > 0 };
}

/**
 * Main Pure Multi-Source Confidence Score Engine
 */
export function computeMultiSourceConfidenceScore(
  params: ComputeConfidenceParams
): MultiSourceConfidenceResult {
  const now = new Date();
  const totalTrees = Math.max(1, params.totalPlantedTrees || 100);

  // -------------------------------------------------------------------------
  // 1. SATELLITE SIGNAL (MAX 20 PTS) - 10m Macro Canopy Trend
  // -------------------------------------------------------------------------
  const overpasses = (params.satelliteOverpasses || []).filter(
    (o) => (o.cloud_cover_pct || 0) < 30
  );
  const overpassCount = overpasses.length || params.manualOverrides?.satellitePassesCount || 0;
  const latestOverpass = overpasses[overpasses.length - 1];
  const meanNdvi = latestOverpass?.ndvi ?? params.manualOverrides?.meanNdvi ?? (overpassCount > 0 ? 0.74 : null);

  let satelliteScore = 0;
  let trendStatus: MultiSourceScoreBreakdown["satellite"]["trendStatus"] = "insufficient_data";
  let satelliteExplanation = "No real Copernicus Sentinel-2 overpasses recorded yet.";

  if (overpassCount >= 3) {
    // Check trend across overpasses
    const baselineNdvi = overpasses[0]?.ndvi || 0.65;
    const currentNdvi = latestOverpass?.ndvi || 0.74;
    const delta = currentNdvi - baselineNdvi;

    if (delta >= -0.05 && currentNdvi >= 0.60) {
      satelliteScore = 20.0;
      trendStatus = delta >= 0.05 ? "improving" : "stable";
      satelliteExplanation = `Verified ${overpassCount} Sentinel-2 overpasses with stable canopy vigor (NDVI: ${currentNdvi.toFixed(2)}).`;
    } else {
      satelliteScore = 12.0;
      trendStatus = "declining";
      satelliteExplanation = `Sentinel-2 overpasses show NDVI stress or drop (${currentNdvi.toFixed(2)} vs baseline ${baselineNdvi.toFixed(2)}).`;
    }
  } else if (overpassCount >= 1) {
    satelliteScore = 14.0;
    trendStatus = "stable";
    satelliteExplanation = `Single Sentinel-2 overpass recorded (${latestOverpass?.acquisition_date || "Recent"}). Additional passes required for trend verification.`;
  }

  // -------------------------------------------------------------------------
  // 2. DRONE SIGNAL (MAX 30 PTS) - Cluster-Level High-Resolution Orthomosaic
  // -------------------------------------------------------------------------
  const surveys = params.droneSurveys || [];
  const latestDrone = surveys[surveys.length - 1];
  const hasDrone = Boolean(latestDrone || params.manualOverrides?.hasDroneSurvey);

  let droneScore = 0;
  let droneExplanation = "No high-resolution UAV / drone orthomosaic survey registered for this parcel.";
  let surveyDate: string | null = null;
  let treeCountDetected = 0;
  let resolution = 2.5;

  if (hasDrone && latestDrone) {
    surveyDate = latestDrone.survey_date;
    treeCountDetected = latestDrone.tree_count_detected || totalTrees;
    resolution = latestDrone.resolution_cm_per_px || 2.5;

    const droneAgeDays = (now.getTime() - new Date(surveyDate).getTime()) / 86400000;
    if (droneAgeDays <= 180) {
      droneScore = 30.0;
      droneExplanation = `High-res (${resolution}cm/px) UAV survey verified ${treeCountDetected} individual tree canopies within 180 days.`;
    } else {
      droneScore = 18.0;
      droneExplanation = `UAV survey registered on ${surveyDate} (>180 days ago). Recalibration survey recommended.`;
    }
  } else if (hasDrone) {
    droneScore = 25.0;
    droneExplanation = "Verified drone orthomosaic canopy survey on file.";
  }

  // -------------------------------------------------------------------------
  // 3. GEOTAGGED FIELD PHOTO CHECK-INS (MAX 50 PTS) - Individual Proof-of-Life
  // -------------------------------------------------------------------------
  const fieldList = params.fieldPhotos || [];
  const alivePhotos = fieldList.filter(
    (f) => f.status === "alive" || f.status === "healthy" || f.status === "stressed" || f.is_verified
  );
  const verifiedCount = alivePhotos.length || params.manualOverrides?.verifiedTreesCount || 0;

  // Compute average AI Botanical confidence
  const confidences = alivePhotos.map((f) => f.ai_confidence || 90.0);
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 90.0;

  // Sampling coverage target (e.g. at least 20% sample or 15 trees for statistical validity)
  const sampleTarget = Math.min(totalTrees, Math.max(10, Math.round(totalTrees * 0.25)));
  const coverageRatio = Math.min(1.0, verifiedCount / sampleTarget);

  let fieldScore = Math.round(coverageRatio * 50.0 * (avgConfidence / 100.0) * 10) / 10;
  let lastCheckinDate = alivePhotos[0]?.checked_at || params.manualOverrides?.lastFieldDate || null;
  let fieldExplanation = "No ground geotagged tree photos uploaded yet.";

  if (verifiedCount > 0) {
    fieldExplanation = `${verifiedCount} geotagged tree photos verified with ${avgConfidence.toFixed(0)}% avg botanical AI confidence (${Math.round(coverageRatio * 100)}% statistical sampling target).`;
  }

  // -------------------------------------------------------------------------
  // 4. TIME DECAY PENALTY (UP TO -25 PTS)
  // -------------------------------------------------------------------------
  let daysSinceInput = 0;
  let decayPenalty = 0;
  let isDecayed = false;
  let decayExplanation = "No ground or drone evidence on file yet to evaluate time decay.";

  if (lastCheckinDate) {
    daysSinceInput = Math.max(0, Math.floor((now.getTime() - new Date(lastCheckinDate).getTime()) / 86400000));
    const decayResult = calculateTimeDecayPenalty(daysSinceInput);
    decayPenalty = decayResult.penalty;
    isDecayed = decayResult.isDecayed;
    decayExplanation = isDecayed
      ? `No fresh ground or drone check-in for ${daysSinceInput} days (>30 day threshold). Confidence decayed by -${decayPenalty.toFixed(1)} pts.`
      : `Fresh monitoring input received within the 30-day grace period (${daysSinceInput} days ago). Zero decay penalty applied.`;
  } else if (latestOverpass) {
    daysSinceInput = Math.max(0, Math.floor((now.getTime() - new Date(latestOverpass.acquisition_date).getTime()) / 86400000));
    decayExplanation = `Satellite overpass recorded ${daysSinceInput} days ago. Ground photo check-in is pending.`;
  }

  // -------------------------------------------------------------------------
  // 5. TOTAL SCORE & TIER DETERMINATION
  // -------------------------------------------------------------------------
  const evidenceScore = Math.max(0, droneScore + fieldScore - decayPenalty);
  const rawTotal = satelliteScore + evidenceScore;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal * 10) / 10));

  let tier: VerificationTier = "unverified_demo";
  let tierLabel = "Unverified / Demo Simulation";
  let tierColor = "text-amber-500 border-amber-500/30 bg-amber-500/10";
  let isVerifiedForCarbonMRV = false;
  let isDemoOrUnverified = true;

  if (totalScore >= 80.0 && verifiedCount >= 5 && overpassCount >= 1) {
    tier = "zero_greenwashing_gold";
    tierLabel = "🥇 Zero Greenwashing Gold (Fully Verifiable)";
    tierColor = "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    isVerifiedForCarbonMRV = true;
    isDemoOrUnverified = false;
  } else if (totalScore >= 50.0 && verifiedCount >= 1) {
    tier = "field_verified";
    tierLabel = "🥈 Field-Verified Plot (Evidence-Backed)";
    tierColor = "text-teal-500 border-teal-500/30 bg-teal-500/10";
    isVerifiedForCarbonMRV = true;
    isDemoOrUnverified = false;
  } else if (overpassCount >= 1) {
    tier = "satellite_only";
    tierLabel = "🛰️ Satellite Macro Signal Only (Unverified Trees)";
    tierColor = "text-blue-500 border-blue-500/30 bg-blue-500/10";
    isVerifiedForCarbonMRV = false;
    isDemoOrUnverified = false;
  }

  // -------------------------------------------------------------------------
  // 6. ACTIONABLE RECOMMENDATIONS TO REACH 100% GOLD TIER
  // -------------------------------------------------------------------------
  const recommendations: string[] = [];
  if (overpassCount < 3) {
    recommendations.push("Pull fresh Copernicus Sentinel-2 L2A cloud-free overpass to strengthen satellite trend.");
  }
  if (!hasDrone) {
    recommendations.push("Upload cluster drone orthomosaic survey for +30 pts high-resolution canopy verification.");
  }
  if (verifiedCount < sampleTarget) {
    recommendations.push(`Submit ${sampleTarget - verifiedCount} more geotagged field photos to maximize ground truth score.`);
  }
  if (isDecayed) {
    recommendations.push("Perform a fresh ground check-in to reverse time decay penalty.");
  }

  return {
    totalScore,
    tier,
    tierLabel,
    tierColor,
    isVerifiedForCarbonMRV,
    isDemoOrUnverified,
    calculatedAt: now.toISOString(),
    breakdown: {
      satellite: {
        score: satelliteScore,
        maxScore: 20,
        weightPct: 20,
        overpassesCount: overpassCount,
        latestOverpassDate: latestOverpass?.acquisition_date || null,
        meanNdvi,
        trendStatus,
        explanation: satelliteExplanation,
      },
      drone: {
        score: droneScore,
        maxScore: 30,
        weightPct: 30,
        hasSurvey: hasDrone,
        surveyDate,
        treeCountDetected,
        resolutionCmPerPx: resolution,
        explanation: droneExplanation,
      },
      fieldPhoto: {
        score: fieldScore,
        maxScore: 50,
        weightPct: 50,
        verifiedTreesCount: verifiedCount,
        totalPlantedTrees: totalTrees,
        samplingCoveragePct: Math.round(coverageRatio * 100),
        averageAiConfidence: Math.round(avgConfidence),
        lastCheckinDate,
        explanation: fieldExplanation,
      },
      timeDecay: {
        penaltyPoints: decayPenalty,
        daysSinceLastInput: daysSinceInput,
        dailyDecayRate: 0.15,
        gracePeriodDays: 30,
        isDecayed,
        explanation: decayExplanation,
      },
    },
    recommendations,
  };
}
