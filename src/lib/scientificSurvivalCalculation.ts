/**
 * Green Enlightenment — Phase 2: Scientific Plantation Survival & Census Engine
 * 
 * Implements the rigorous mathematical survival and census standard defined in
 * the Product Understanding & Technical Handover Brief (Document 1):
 * 
 * 1. Observed Survival (Assessed):
 *    confirmed_alive ÷ (confirmed_alive + confirmed_dead) × 100
 * 
 * 2. Confirmed Alive as Share of Planted Cohort:
 *    confirmed_alive ÷ total_planted × 100
 * 
 * 3. Assessment Coverage:
 *    (confirmed_alive + confirmed_dead + stressed + missing) ÷ total_planted × 100
 * 
 * Scientific Integrity Rules:
 * - Uninspected trees MUST NOT silently count as alive or dead.
 * - If 0 trees have been inspected, survival rate is NULL / NOT_ASSESSED (never 100% or 97%).
 * - Denominators must always be published alongside percentages.
 */

export interface TreeCensusInput {
  totalPlanted: number;
  confirmedAlive: number;
  confirmedDead: number;
  stressedOrDamaged?: number;
  missing?: number;
  notInspected?: number;
  cohortName?: string;
  observationDate?: string;
}

export type SurvivalAssessmentStatus =
  | "PENDING_INSPECTION"
  | "LOW_SAMPLE_WARNING"
  | "UNDER_SAMPLED"
  | "PARTIALLY_INSPECTED"
  | "STATISTICALLY_ROBUST"
  | "COMPREHENSIVE_AUDIT";

export interface ScientificSurvivalResult {
  totalPlanted: number;
  totalAssessed: number;
  confirmedAlive: number;
  confirmedDead: number;
  stressedOrDamaged: number;
  missing: number;
  notInspected: number;

  /** Alias for confirmedAlive */
  livingTreesCensus: number;
  /** Alias for notInspected */
  uninspectedTreesCount: number;

  /**
   * Survival rate among inspected trees:
   * confirmed_alive / (confirmed_alive + confirmed_dead) * 100
   * Null if no trees have been inspected (avoids misleading 100% or 0%).
   */
  observedSurvivalRateAssessedPct: number | null;

  /**
   * Confirmed alive as share of original planted cohort:
   * confirmed_alive / total_planted * 100
   */
  confirmedAliveShareOfPlantedPct: number | null;
  /** Alias for confirmedAliveShareOfPlantedPct */
  confirmedAlivePlantedCohortPct: number | null;

  /**
   * Total assessment coverage of the cohort:
   * totalAssessed / totalPlanted * 100
   */
  assessmentCoveragePct: number;
  /** Alias for assessmentCoveragePct */
  inspectionCoveragePct: number;

  sampleSizeWarning: boolean;
  assessmentStatus: SurvivalAssessmentStatus;
  statusLabel: string;
  statusDescription: string;
  provenanceSummary: string;
  observationDate: string;
}

/**
 * Calculates scientifically transparent survival metrics with full denominator attribution.
 */
export function calculateScientificSurvivalMetrics(input: TreeCensusInput): ScientificSurvivalResult {
  const totalPlanted = Math.max(0, Math.round(input.totalPlanted || 0));
  const confirmedAlive = Math.max(0, Math.round(input.confirmedAlive || 0));
  const confirmedDead = Math.max(0, Math.round(input.confirmedDead || 0));
  const stressedOrDamaged = Math.max(0, Math.round(input.stressedOrDamaged || 0));
  const missing = Math.max(0, Math.round(input.missing || 0));

  // Determine uninspected count:
  // confirmedAlive includes healthy and stressed trees, so do not double count
  const assessedWithoutUninspected = confirmedAlive + confirmedDead + missing;
  const notInspected =
    input.notInspected !== undefined
      ? Math.max(0, Math.round(input.notInspected))
      : Math.max(0, totalPlanted - assessedWithoutUninspected);

  const totalAssessed = confirmedAlive + confirmedDead + missing;
  const observationDate = input.observationDate || new Date().toISOString().split("T")[0];

  // Denominator for survival among binary alive/dead outcomes
  const aliveDeadDenominator = confirmedAlive + confirmedDead;

  let observedSurvivalRateAssessedPct: number | null = null;
  let confirmedAliveShareOfPlantedPct: number | null = null;
  let assessmentCoveragePct = 0;

  if (totalPlanted > 0) {
    confirmedAliveShareOfPlantedPct = Number(
      ((confirmedAlive / totalPlanted) * 100).toFixed(2)
    );
    assessmentCoveragePct = Number(
      (Math.min(100, (totalAssessed / totalPlanted) * 100)).toFixed(2)
    );
  }

  if (aliveDeadDenominator > 0) {
    observedSurvivalRateAssessedPct = Number(
      ((confirmedAlive / aliveDeadDenominator) * 100).toFixed(2)
    );
  }

  // Determine statistical assessment status
  let assessmentStatus: SurvivalAssessmentStatus = "PENDING_INSPECTION";
  let statusLabel = "Awaiting First Field Inspection";
  let statusDescription = "No individual trees have undergone ground-truth inspection yet.";
  let sampleSizeWarning = false;

  if (totalPlanted === 0) {
    statusLabel = "Zero-Tree Cohort";
    statusDescription = "No registered planting records exist for this cohort.";
    sampleSizeWarning = false;
  } else if (totalAssessed === 0) {
    assessmentStatus = "PENDING_INSPECTION";
    statusLabel = "Assessment Pending";
    statusDescription = `0 of ${totalPlanted.toLocaleString()} trees inspected. Survival calculation locked until field inspections occur.`;
    sampleSizeWarning = true;
  } else if (assessmentCoveragePct < 10) {
    assessmentStatus = "UNDER_SAMPLED";
    statusLabel = "Low Sample Size (<10%)";
    statusDescription = `Only ${totalAssessed.toLocaleString()} of ${totalPlanted.toLocaleString()} trees (${assessmentCoveragePct}%) inspected. Statistically insufficient for portfolio certification.`;
    sampleSizeWarning = true;
  } else if (assessmentCoveragePct < 80) {
    assessmentStatus = "PARTIALLY_INSPECTED";
    statusLabel = "Partially Inspected";
    statusDescription = `${totalAssessed.toLocaleString()} of ${totalPlanted.toLocaleString()} trees (${assessmentCoveragePct}%) inspected as of ${observationDate}.`;
    sampleSizeWarning = false;
  } else {
    assessmentStatus = "STATISTICALLY_ROBUST";
    statusLabel = "Comprehensive Ground Audit";
    statusDescription = `High inspection coverage (${assessmentCoveragePct}%). Robust ground-truth census.`;
    sampleSizeWarning = false;
  }

  let provenanceSummary: string;
  if (totalAssessed === 0) {
    provenanceSummary = `0 inspected of ${totalPlanted.toLocaleString()} planted (Pending Ground Census — Survival rate unassessed)`;
  } else if (assessmentCoveragePct < 10) {
    provenanceSummary = `Preliminary (Low Sample Size): ${confirmedAlive.toLocaleString()} alive of ${totalAssessed.toLocaleString()} assessed (${assessmentCoveragePct}% coverage)`;
  } else if (observedSurvivalRateAssessedPct !== null) {
    provenanceSummary = `${confirmedAlive.toLocaleString()} confirmed alive ÷ (${confirmedAlive.toLocaleString()} alive + ${confirmedDead.toLocaleString()} dead) = ${observedSurvivalRateAssessedPct}% among assessed (${notInspected.toLocaleString()} not inspected out of ${totalPlanted.toLocaleString()} planted)`;
  } else {
    provenanceSummary = `0 inspected of ${totalPlanted.toLocaleString()} planted (Pending Ground Census — Survival rate unassessed)`;
  }

  return {
    totalPlanted,
    totalAssessed,
    confirmedAlive,
    confirmedDead,
    stressedOrDamaged,
    missing,
    notInspected,
    livingTreesCensus: confirmedAlive,
    uninspectedTreesCount: notInspected,
    observedSurvivalRateAssessedPct,
    confirmedAliveShareOfPlantedPct,
    confirmedAlivePlantedCohortPct: confirmedAliveShareOfPlantedPct ?? 0,
    assessmentCoveragePct,
    inspectionCoveragePct: assessmentCoveragePct,
    sampleSizeWarning,
    assessmentStatus,
    statusLabel,
    statusDescription,
    provenanceSummary,
    observationDate,
  };
}

/**
 * Summarizes an array of raw tree records into scientific cohort survival metrics.
 */
export function summarizeCohortSurvivalFromRecords(
  records: Array<{ id?: string; survivalStatus?: string; status?: string }>,
  totalPlanted?: number
): ScientificSurvivalResult {
  let alive = 0;
  let dead = 0;
  let stressed = 0;
  let missing = 0;
  let uninspected = 0;

  for (const r of records) {
    const s = (r.survivalStatus || r.status || "UNINSPECTED").toUpperCase();
    if (s === "ALIVE") {
      alive++;
    } else if (s === "DEAD") {
      dead++;
    } else if (s === "STRESSED" || s === "DAMAGED") {
      alive++;
      stressed++;
    } else if (s === "MISSING") {
      missing++;
    } else {
      uninspected++;
    }
  }

  const effectiveTotal = Math.max(records.length, totalPlanted ?? records.length);
  return calculateScientificSurvivalMetrics({
    totalPlanted: effectiveTotal,
    confirmedAlive: alive,
    confirmedDead: dead,
    stressedOrDamaged: stressed,
    missing,
    notInspected: Math.max(0, effectiveTotal - (alive + dead + missing)),
  });
}
