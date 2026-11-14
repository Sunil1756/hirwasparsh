/**
 * Automated Anomaly Evaluator & Multi-Channel Alert Dispatcher
 * Continuously evaluates tree health telemetry, Sentinel-2 spectral indices,
 * and ground-truth survival rates to trigger automated alerts for Field Workers & Adopters.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  triggerAiRiskAlertPipeline,
  RiskAlertDispatchParams,
  RiskAlertDispatchResult,
} from "@/lib/riskAlertNotificationService";
import { ThreatType, ThreatSeverity } from "@/lib/predictiveRiskEngine";

export interface TreeAnomalyInput {
  treeId: string;
  treeName?: string;
  species?: string;
  projectId?: string;
  projectName?: string;
  latitude?: number;
  longitude?: number;
  currentNdvi?: number;
  ndviDelta?: number;
  foliarNdwi?: number;
  healthStatus?: "healthy" | "stressed" | "unhealthy" | "dead";
  heightCm?: number;
}

export interface ProjectSurvivalAnomalyInput {
  projectId: string;
  projectName: string;
  location?: string;
  targetTrees: number;
  verifiedTrees: number;
  previousSurvivalRatePct?: number;
  currentSurvivalRatePct?: number;
  meanNdvi?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Evaluates individual tree health metrics and triggers automated alert if an anomaly is present
 */
export async function evaluateTreeHealthAnomaly(
  tree: TreeAnomalyInput
): Promise<RiskAlertDispatchResult | null> {
  const isStressed = tree.healthStatus === "stressed" || (tree.currentNdvi !== undefined && tree.currentNdvi < 0.45);
  const isUnhealthy = tree.healthStatus === "unhealthy" || tree.healthStatus === "dead" || (tree.currentNdvi !== undefined && tree.currentNdvi < 0.35);

  if (!isStressed && !isUnhealthy) {
    return null; // Healthy tree, no alert needed
  }

  let threatType: ThreatType = "CANOPY_HEALTH_ANOMALY";
  let severity: ThreatSeverity = isUnhealthy ? "CRITICAL" : "HIGH";
  let primaryDriver = `Ground photo or satellite telemetry indicates foliar stress (Health: ${tree.healthStatus || "Stressed"}, NDVI: ${tree.currentNdvi ?? "0.42"}).`;
  let recommendedAction = "Conduct on-site foliar inspection, inspect root crown for rot or borers, and apply organic bio-stimulant.";
  let leadDays = isUnhealthy ? 3 : 7;

  if (tree.foliarNdwi !== undefined && tree.foliarNdwi < 0.05) {
    threatType = "DROUGHT_SHOCK";
    primaryDriver = `Severe leaf hydration deficit detected (NDWI: ${tree.foliarNdwi}).`;
    recommendedAction = "Deploy emergency drip hydration and apply 3-inch organic mulch ring around root collar.";
    leadDays = 4;
  } else if (tree.ndviDelta !== undefined && tree.ndviDelta <= -0.15) {
    threatType = "PEST_DEFOLIATION";
    primaryDriver = `Accelerated canopy loss (-${Math.abs(tree.ndviDelta).toFixed(2)} ΔNDVI) within 30 days.`;
    recommendedAction = "Inspect underside of leaves for leaf miner/caterpillar infestation; apply 2% neem bio-spray.";
    leadDays = 5;
  }

  const dispatchParams: RiskAlertDispatchParams = {
    treeId: tree.treeId,
    treeName: tree.treeName || `Tree #${tree.treeId.slice(0, 6)}`,
    species: tree.species,
    projectId: tree.projectId,
    projectName: tree.projectName,
    threatType,
    threatTitle: `${threatType.replace(/_/g, " ")}: ${tree.treeName || "Adopted Tree"}`,
    severity,
    riskProbabilityPct: isUnhealthy ? 92 : 74,
    daysUntilCriticalBreach: leadDays,
    primaryDriver,
    recommendedAction,
    latitude: tree.latitude,
    longitude: tree.longitude,
    currentNdvi: tree.currentNdvi,
    ndviDelta: tree.ndviDelta,
    foliarNdwi: tree.foliarNdwi,
  };

  return await triggerAiRiskAlertPipeline(dispatchParams);
}

/**
 * Evaluates plot or project-wide survival rates and triggers automated alerts when thresholds are breached
 */
export async function evaluateSurvivalRateAnomaly(
  project: ProjectSurvivalAnomalyInput
): Promise<RiskAlertDispatchResult | null> {
  const survivalRate =
    project.currentSurvivalRatePct !== undefined
      ? project.currentSurvivalRatePct
      : project.targetTrees > 0
      ? Math.round((project.verifiedTrees / project.targetTrees) * 100)
      : 100;

  const previousRate = project.previousSurvivalRatePct ?? 95;
  const survivalDrop = previousRate - survivalRate;

  // Threshold criteria: Survival < 85% OR sudden drop >= 10%
  const isSevereDeficit = survivalRate < 75 || survivalDrop >= 15;
  const isModerateDeficit = survivalRate < 85 || survivalDrop >= 10;

  if (!isSevereDeficit && !isModerateDeficit) {
    return null; // Within normal silvicultural tolerance
  }

  const severity: ThreatSeverity = isSevereDeficit ? "CRITICAL" : "HIGH";
  const primaryDriver = `Plot survival rate dropped to ${survivalRate}% (${survivalDrop > 0 ? `-${survivalDrop}% drop from baseline` : "below 85% standard"}). Ground mortality detected.`;
  const recommendedAction = `Dispatch field rangers to perform 5% Cochran random spot audit, investigate moisture/pest vectors, and schedule sapling replanting.`;
  const leadDays = isSevereDeficit ? 3 : 7;

  const dispatchParams: RiskAlertDispatchParams = {
    projectId: project.projectId,
    projectName: project.projectName,
    plotName: project.projectName,
    threatType: "SURVIVAL_RATE_DROP",
    threatTitle: `Survival Rate Anomaly at ${project.projectName} (${survivalRate}%)`,
    severity,
    riskProbabilityPct: isSevereDeficit ? 95 : 80,
    daysUntilCriticalBreach: leadDays,
    survivalRatePct: survivalRate,
    survivalRateDropPct: survivalDrop,
    primaryDriver,
    recommendedAction,
    latitude: project.latitude,
    longitude: project.longitude,
    currentNdvi: project.meanNdvi,
  };

  return await triggerAiRiskAlertPipeline(dispatchParams);
}

/**
 * Scans all plantation projects in Supabase and triggers alerts for any plots with detected anomalies
 */
export async function scanAndDispatchProjectAnomalies(): Promise<{
  scanned: number;
  alertsDispatched: number;
  results: RiskAlertDispatchResult[];
}> {
  const results: RiskAlertDispatchResult[] = [];
  let scanned = 0;

  try {
    const { data: projects, error } = await supabase
      .from("plantation_projects")
      .select("id, project_name, location, target_trees, verified_trees, latitude, longitude");

    if (error || !projects) return { scanned: 0, alertsDispatched: 0, results: [] };

    scanned = projects.length;

    for (const p of projects) {
      const target = Number(p.target_trees) || 0;
      const verified = Number(p.verified_trees) || 0;
      if (target <= 0) continue;

      const rate = Math.round((verified / target) * 100);
      if (rate < 85 && verified > 0) {
        const dispatchRes = await evaluateSurvivalRateAnomaly({
          projectId: p.id,
          projectName: p.project_name || "Agroforestry Plot",
          location: p.location,
          targetTrees: target,
          verifiedTrees: verified,
          currentSurvivalRatePct: rate,
          latitude: p.latitude ? Number(p.latitude) : undefined,
          longitude: p.longitude ? Number(p.longitude) : undefined,
        });

        if (dispatchRes && dispatchRes.success) {
          results.push(dispatchRes);
        }
      }
    }
  } catch (ex) {
    console.warn("Automated anomaly scan encountered an error:", ex);
  }

  return {
    scanned,
    alertsDispatched: results.length,
    results,
  };
}
