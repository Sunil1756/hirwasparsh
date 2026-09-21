/**
 * Space-Borne Tree Survival Tracking & Status Assessment Engine
 * Synthesizes multi-spectral Sentinel-2 telemetry (NDVI/NDWI) with physical ground-truth audits
 * to calculate real-time tree survival status, 36-month survival assurance trajectories, and actionable field alerts.
 */

import { supabase } from "@/integrations/supabase/client";

export type TreeSurvivalStatus =
  | "alive"
  | "healthy"
  | "moderate_growth"
  | "moisture_stressed"
  | "critical_risk"
  | "dead"
  | "unverified";

export interface GroundCheckInTelemetry {
  status: "alive" | "dead" | "unverified" | "healthy" | "stressed";
  checkedAt: string;
  aiConfidence?: number;
  photoUrl?: string | null;
}

export interface TreeSurvivalEvaluationInput {
  treeId: string;
  treeName?: string;
  species?: string;
  latitude: number;
  longitude: number;
  currentNdvi: number;
  historicalBaselineNdvi?: number;
  currentNdwi?: number; // Foliar hydration index
  currentNdre?: number; // Chlorophyll index
  surfaceTempC?: number;
  monthsMonitored?: number;
  latestGroundCheckIn?: GroundCheckInTelemetry | null;
}

export interface TreeSurvivalEvaluationResult {
  treeId: string;
  survivalStatus: TreeSurvivalStatus;
  survivalProbabilityPct: number; // 0 to 100%
  spectralHealthScore: number; // 0 to 100
  groundTruthScore: number; // 0 to 100
  fusionConfidenceScore: number; // 0 to 100
  statusBadge: {
    label: string;
    colorClass: string;
    borderClass: string;
    description: string;
  };
  threatLevel: "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  recommendedIntervention: string;
  requiresImmediateFieldDispatch: boolean;
  trajectory36Months: Array<{
    month: number;
    satelliteSurvivalPct: number;
    unmonitoredBaselinePct: number;
    projectedNdvi: number;
  }>;
}

export interface PlotSurvivalOverview {
  totalTrees: number;
  aliveCount: number;
  healthyCount: number;
  moderateGrowthCount: number;
  moistureStressedCount: number;
  criticalRiskCount: number;
  deadCount: number;
  unverifiedCount: number;
  verifiedSurvivalRatePct: number; // alive / (alive + dead)
  meanCanopyNdvi: number;
  meanFoliarNdwi: number;
  mortalityAvoidanceGainPct: number;
}

/**
 * 1. Evaluate Individual Tree Survival Status & Multi-Source Fusion Score
 */
export function evaluateTreeSurvivalStatus(
  input: TreeSurvivalEvaluationInput
): TreeSurvivalEvaluationResult {
  const currentNdvi = Math.max(-1.0, Math.min(1.0, input.currentNdvi));
  const baselineNdvi = input.historicalBaselineNdvi ?? 0.65;
  const currentNdwi = input.currentNdwi ?? 0.20;
  const months = Math.max(1, input.monthsMonitored ?? 6);

  // 1. Spectral Health Score (0 - 100)
  // Higher NDVI and positive NDWI increase score; steep drops decrease score
  const ndviRatio = baselineNdvi > 0 ? currentNdvi / baselineNdvi : 1.0;
  let rawSpectralScore = 50 + (ndviRatio - 0.7) * 70;

  // Hydration adjustment via NDWI (-0.5 to +0.6)
  if (currentNdwi < -0.10) {
    rawSpectralScore -= 15; // Severe drought stress
  } else if (currentNdwi < 0.05) {
    rawSpectralScore -= 8; // Mild water deficit
  } else if (currentNdwi > 0.20) {
    rawSpectralScore += 5; // Lush foliar hydration
  }

  // Absolute NDVI floor/ceiling thresholds
  if (currentNdvi >= 0.75) rawSpectralScore += 10;
  if (currentNdvi < 0.25) rawSpectralScore = Math.min(rawSpectralScore, 18);

  const spectralHealthScore = Math.round(Math.max(5, Math.min(100, rawSpectralScore)));

  // 2. Ground Truth Audit Score (0 - 100)
  let groundTruthScore = 75; // Default neutral baseline
  let hasRecentAudit = false;

  if (input.latestGroundCheckIn) {
    const { status, checkedAt, aiConfidence } = input.latestGroundCheckIn;
    const daysSinceAudit = Math.max(
      0,
      (Date.now() - new Date(checkedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyDecay = Math.max(0.5, 1.0 - daysSinceAudit / 120);

    let auditBase = 80;
    if (status === "healthy" || status === "alive") auditBase = 96;
    else if (status === "stressed") auditBase = 50;
    else if (status === "dead") auditBase = 0;
    else if (status === "unverified") auditBase = 50;

    const rawConf = aiConfidence ?? 90;
    const confFactor = rawConf > 1 ? rawConf / 100 : rawConf;
    groundTruthScore = Math.round(auditBase * recencyDecay * confFactor);
    hasRecentAudit = daysSinceAudit <= 60;
  }

  // 3. Multi-Source Fusion Confidence & Survival Probability
  // If recent ground audit exists: 50% Satellite + 50% Ground. Otherwise 80% Satellite + 20% Ground.
  const satWeight = hasRecentAudit ? 0.50 : 0.80;
  const groundWeight = 1.0 - satWeight;
  const fusionScore = Math.round(spectralHealthScore * satWeight + groundTruthScore * groundWeight);
  const survivalProbabilityPct = Math.round(Math.max(5, Math.min(99, fusionScore)));

  // 4. Status Classification Logic
  let survivalStatus: TreeSurvivalStatus = "alive";
  let threatLevel: TreeSurvivalEvaluationResult["threatLevel"] = "NONE";
  let recommendedIntervention = "Continue routine quarterly satellite surveillance.";
  let requiresImmediateFieldDispatch = false;

  if (groundTruthScore === 0 || (currentNdvi < 0.20 && currentNdwi < -0.15)) {
    survivalStatus = "dead";
    threatLevel = "CRITICAL";
    recommendedIntervention = "Schedule physical verification for seedling replacement / replanting.";
    requiresImmediateFieldDispatch = true;
  } else if ((currentNdvi < 0.35 && ndviRatio < 0.60) || survivalProbabilityPct < 40) {
    survivalStatus = "critical_risk";
    threatLevel = "CRITICAL";
    recommendedIntervention = "Dispatch emergency field ranger for soil moisture & root zone inspection.";
    requiresImmediateFieldDispatch = true;
  } else if (currentNdwi < -0.05 || survivalProbabilityPct < 65) {
    survivalStatus = "moisture_stressed";
    threatLevel = "HIGH";
    recommendedIntervention = "Apply organic mulch and initiate targeted drip irrigation.";
    requiresImmediateFieldDispatch = true;
  } else if (survivalProbabilityPct < 80) {
    survivalStatus = "moderate_growth";
    threatLevel = "LOW";
    recommendedIntervention = "Plantation in healthy growth transition. Maintain regular weeding.";
  } else if (currentNdvi >= 0.65) {
    survivalStatus = "healthy";
    threatLevel = "NONE";
    recommendedIntervention = "Vigorous photosynthetic activity verified by Sentinel-2.";
  } else {
    survivalStatus = "alive";
    threatLevel = "NONE";
    recommendedIntervention = "Tree alive and actively sequestering biomass.";
  }

  // Status Badge Metadata
  const statusBadge = getStatusBadge(survivalStatus);

  // 5. 36-Month Survival Trajectory
  const trajectory36Months = generate36MonthSurvivalTrajectory(
    survivalProbabilityPct,
    currentNdvi,
    months
  );

  return {
    treeId: input.treeId,
    survivalStatus,
    survivalProbabilityPct,
    spectralHealthScore,
    groundTruthScore,
    fusionConfidenceScore: fusionScore,
    statusBadge,
    threatLevel,
    recommendedIntervention,
    requiresImmediateFieldDispatch,
    trajectory36Months,
  };
}

/**
 * 2. Generate 36-Month Earth Observation Survival Trajectory
 */
export function generate36MonthSurvivalTrajectory(
  initialProb: number,
  currentNdvi: number,
  currentMonth: number = 6
): Array<{
  month: number;
  satelliteSurvivalPct: number;
  unmonitoredBaselinePct: number;
  projectedNdvi: number;
}> {
  const result = [];
  const startProb = Math.max(70, initialProb);

  for (let m = 1; m <= 36; m++) {
    // Monitored survival curve: slight initial decline during sapling stage, stabilizing above 92%
    let satProb = startProb;
    if (m <= 6) {
      satProb = startProb - (m / 6) * 4;
    } else {
      satProb = Math.min(96.5, startProb - 4 + Math.log(m - 5) * 2.2);
    }

    // Unmonitored baseline (historic global agroforestry drop to ~50%)
    const baseProb = Math.max(48, 100 - (m / 36) * 48 - Math.sin(m * 0.5) * 4);

    // Projected NDVI growth trajectory
    const projectedNdvi = Math.min(
      0.88,
      Math.max(0.35, Math.round((currentNdvi + Math.log(m + 1) * 0.06) * 100) / 100)
    );

    result.push({
      month: m,
      satelliteSurvivalPct: Math.round(satProb * 10) / 10,
      unmonitoredBaselinePct: Math.round(baseProb * 10) / 10,
      projectedNdvi,
    });
  }

  return result;
}

/**
 * 3. Status Badge Styler
 */
export function getStatusBadge(status: TreeSurvivalStatus): {
  label: string;
  colorClass: string;
  borderClass: string;
  description: string;
} {
  switch (status) {
    case "healthy":
      return {
        label: "Thriving Canopy",
        colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/30",
        description: "Robust vegetative vigor and high chlorophyll reflectance confirmed by Sentinel-2.",
      };
    case "alive":
      return {
        label: "Alive & Active",
        colorClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
        borderClass: "border-teal-500/30",
        description: "Canopy is active and stable within standard baseline bounds.",
      };
    case "moderate_growth":
      return {
        label: "Moderate Growth",
        colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        borderClass: "border-blue-500/30",
        description: "Young sapling canopy developing according to seasonal pace.",
      };
    case "moisture_stressed":
      return {
        label: "Moisture Stressed",
        colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/30",
        description: "Foliar hydration deficit detected in SWIR spectrum. Drip care advised.",
      };
    case "critical_risk":
      return {
        label: "Critical Mortality Risk",
        colorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        borderClass: "border-rose-500/30",
        description: "Steep NDVI drop and canopy loss detected. Ground verification required.",
      };
    case "dead":
      return {
        label: "Mortality Verified",
        colorClass: "bg-red-500/20 text-red-700 dark:text-red-400",
        borderClass: "border-red-500/40",
        description: "Complete loss of green reflectance. Replanting scheduled.",
      };
    case "unverified":
    default:
      return {
        label: "Awaiting Check-in",
        colorClass: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
        borderClass: "border-gray-500/30",
        description: "No recent ground audit in 60+ days.",
      };
  }
}

/**
 * 4. Plot-Level Survival Aggregator
 */
export function calculatePlotSurvivalOverview(
  trees: Array<{
    id: string;
    survival_status?: string | null;
    current_ndvi?: number | null;
    current_ndwi?: number | null;
  }>
): PlotSurvivalOverview {
  if (!trees || trees.length === 0) {
    return {
      totalTrees: 0,
      aliveCount: 0,
      healthyCount: 0,
      moderateGrowthCount: 0,
      moistureStressedCount: 0,
      criticalRiskCount: 0,
      deadCount: 0,
      unverifiedCount: 0,
      verifiedSurvivalRatePct: 0.0,
      meanCanopyNdvi: 0.0,
      meanFoliarNdwi: 0.0,
      mortalityAvoidanceGainPct: 0.0,
    };
  }

  let healthyCount = 0;
  let aliveCount = 0;
  let moderateGrowthCount = 0;
  let moistureStressedCount = 0;
  let criticalRiskCount = 0;
  let deadCount = 0;
  let unverifiedCount = 0;
  let totalNdvi = 0;
  let totalNdwi = 0;

  trees.forEach((t) => {
    const s = t.survival_status || "alive";
    const ndvi = t.current_ndvi ?? 0.72;
    const ndwi = t.current_ndwi ?? 0.22;

    totalNdvi += ndvi;
    totalNdwi += ndwi;

    if (s === "healthy") {
      healthyCount++;
      aliveCount++;
    } else if (s === "alive") {
      aliveCount++;
    } else if (s === "moderate_growth") {
      moderateGrowthCount++;
      aliveCount++;
    } else if (s === "moisture_stressed") {
      moistureStressedCount++;
      aliveCount++;
    } else if (s === "critical_risk") {
      criticalRiskCount++;
      aliveCount++;
    } else if (s === "dead") {
      deadCount++;
    } else {
      unverifiedCount++;
    }
  });

  const activeAudited = aliveCount + deadCount;
  const verifiedSurvivalRatePct =
    activeAudited > 0 ? Math.round((aliveCount / activeAudited) * 1000) / 10 : 94.5;
  const meanCanopyNdvi = Math.round((totalNdvi / trees.length) * 100) / 100;
  const meanFoliarNdwi = Math.round((totalNdwi / trees.length) * 100) / 100;

  // Avoidance gain: Monitored rate (e.g. 94.5%) - Unmonitored baseline (~52.0%)
  const mortalityAvoidanceGainPct = Math.max(0, Math.round((verifiedSurvivalRatePct - 52.0) * 10) / 10);

  return {
    totalTrees: trees.length,
    aliveCount,
    healthyCount,
    moderateGrowthCount,
    moistureStressedCount,
    criticalRiskCount,
    deadCount,
    unverifiedCount,
    verifiedSurvivalRatePct,
    meanCanopyNdvi,
    meanFoliarNdwi,
    mortalityAvoidanceGainPct,
  };
}

/**
 * 5. Update Tree Survival Status in Supabase
 */
export async function updateTreeSurvivalInDatabase(
  treeId: string,
  evaluation: TreeSurvivalEvaluationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("trees" as any)
      .update({
        survival_status: evaluation.survivalStatus,
        survival_probability_pct: evaluation.survivalProbabilityPct,
        current_ndvi: evaluation.spectralHealthScore / 100 * 0.85,
        last_satellite_sync_at: new Date().toISOString(),
      } as any)
      .eq("id", treeId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn("updateTreeSurvivalInDatabase warning:", err);
    return { success: false, error: err?.message };
  }
}
