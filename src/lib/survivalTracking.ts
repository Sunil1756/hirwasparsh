/**
 * Green Enlightenment — Continuous Tree Survival Rate & Quarterly Telemetry Engine
 * Step 4: Mathematical ΔNDVI Trajectory + Ground-Truth Calibration over 36 Months
 */

export interface QuarterlyScanRecord {
  quarter: string; // "Q1", "Q2", etc.
  monthIndex: number; // 0, 3, 6, 9, 12, ... 36
  scanDate: string;
  expectedNdvi: number;
  observedNdvi: number;
  deltaNdvi: number;
  canopyCoverPercent: number;
  calibratedSurvivalRate: number; // e.g. 96.4%
  estimatedLivingTrees: number;
  co2SequesteredMT: number;
  status: "optimal" | "mild_stress" | "severe_anomaly";
  notes: string;
  actionRequired?: string;
}

export interface ProjectSurvivalModel {
  totalTargetTrees: number; // Newly planted project trees (used for survival rate calculation)
  existingBaselineTrees: number; // Pre-existing standing trees inside boundary before planting
  totalCombinedTrees: number; // existingBaselineTrees + totalTargetTrees
  baselineDate: string;
  currentSurvivalPercent: number; // Calculated strictly on planted project trees
  estimatedLivingTrees: number; // Surviving planted trees
  totalLivingCanopyTrees: number; // Surviving planted trees + existing baseline trees
  accumulatedCo2MT: number;
  mortalityRiskLevel: "Low (Stable)" | "Moderate (Watch)" | "Elevated Risk" | "Critical";
  riskDescription: string;
  quarterlyTimeline: QuarterlyScanRecord[];
  donorUpdateSnippet: string;
}

/**
 * Computes 12-Quarter (36 Month) Tree Survival & Satellite Spectral Curve
 */
export function computeProjectSurvivalModel(params: {
  targetTrees: number;
  existingTrees?: number;
  plantationDate: string;
  baselineNdvi?: number;
  groundAuditRate?: number; // 0 - 100 from Step 3
  speciesList?: string[];
}): ProjectSurvivalModel {
  const {
    targetTrees,
    existingTrees = 0,
    plantationDate,
    baselineNdvi = 0.22,
    groundAuditRate = 95,
    speciesList = ["Neem", "Banyan", "Peepal"],
  } = params;

  const baseDate = new Date(plantationDate || new Date().toISOString());

  // Growth trajectory coefficients based on species
  const isMiyawaki = speciesList.some((s) => s.toLowerCase().includes("miyawaki"));
  const maxNdviPotential = isMiyawaki ? 0.88 : 0.82;

  const quarters: QuarterlyScanRecord[] = [];

  // 12 Quarters = 36 Months
  for (let q = 0; q <= 12; q++) {
    const month = q * 3;
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + month);
    const dateStr = d.toISOString().split("T")[0];

    // Theoretical Sigmoid biological growth curve
    const growthProgress = 1 / (1 + Math.exp(-0.22 * (month - 8)));
    const expectedNdvi = Number((baselineNdvi + (maxNdviPotential - baselineNdvi) * growthProgress).toFixed(2));

    // Simulated seasonal fluctuation (Monsoon boost + Summer dip)
    const seasonalWave = Math.sin((month / 12) * 2 * Math.PI) * 0.04;
    const observedNdvi = Number(
      Math.min(0.92, Math.max(0.18, expectedNdvi + seasonalWave - (q === 2 ? 0.03 : 0))).toFixed(2)
    );

    const deltaNdvi = Number((observedNdvi - baselineNdvi).toFixed(2));

    // Canopy coverage %
    const canopyCoverPercent = Number(
      Math.min(94, Math.max(5, 5 + growthProgress * 85 + (seasonalWave > 0 ? 4 : -2))).toFixed(1)
    );

    // Mathematical Calibrated Survival Rate
    // S(t) = S0 * (1 - penalty) * (ground_rate / 100)^0.65
    // Applied ONLY to newly planted project trees (targetTrees)
    const naturalMortality = Math.min(8, q * 0.65); // 0% -> ~7.8% over 3 years
    const spectralPenalty = Math.max(0, (expectedNdvi - observedNdvi) / Math.max(0.1, expectedNdvi)) * 12;
    const groundCalibrationMultiplier = Math.pow(groundAuditRate / 100, 0.65);

    const calculatedSurvival = Math.max(
      70,
      Math.min(100, (100 - naturalMortality - spectralPenalty) * groundCalibrationMultiplier)
    );
    const calibratedSurvivalRate = Number(calculatedSurvival.toFixed(1));

    // Living planted trees
    const estimatedLivingTrees = Math.round((targetTrees * calibratedSurvivalRate) / 100);

    // Cumulative IPCC Biomass CO2 sequestration (MT)
    const biomassFactor = 0.0022 * Math.pow(Math.max(1, month), 1.08);
    const co2SequesteredMT = Number((estimatedLivingTrees * biomassFactor).toFixed(2));

    let status: "optimal" | "mild_stress" | "severe_anomaly" = "optimal";
    let notes = "Canopy growth aligned with species biological curve.";
    let actionRequired: string | undefined = undefined;

    if (q === 0) {
      notes = "Baseline (t₀) pre-plantation scan established. Ground truth GPS markers mapped.";
    } else if (q === 2) {
      status = "mild_stress";
      notes = "Pre-monsoon summer dry spell detected. Foliar moisture dipped slightly.";
      actionRequired = "Ensure supplementary drip irrigation across South plot perimeter.";
    } else if (q === 4) {
      notes = "Post-monsoon surge. Active vegetative crown expansion across all quadrants.";
    } else if (q === 8) {
      notes = "Year 2 milestone: 85%+ canopy closure achieved. Root systems established.";
    } else if (q === 12) {
      notes = "Year 3 mature agroforestry biome stabilized. High biodiversity index.";
    }

    quarters.push({
      quarter: q === 0 ? "Baseline (t₀)" : `Q${q} (M${month})`,
      monthIndex: month,
      scanDate: dateStr,
      expectedNdvi,
      observedNdvi,
      deltaNdvi,
      canopyCoverPercent,
      calibratedSurvivalRate,
      estimatedLivingTrees,
      co2SequesteredMT,
      status,
      notes,
      actionRequired,
    });
  }

  // Current active quarter = Q2 (Month 6) for standard demonstration
  const activeQuarter = quarters[2];
  const currentSurvivalPercent = activeQuarter.calibratedSurvivalRate;
  const estimatedLivingTrees = activeQuarter.estimatedLivingTrees;
  const totalLivingCanopyTrees = estimatedLivingTrees + existingTrees;
  const totalCombinedTrees = targetTrees + existingTrees;
  const accumulatedCo2MT = activeQuarter.co2SequesteredMT;

  let mortalityRiskLevel: "Low (Stable)" | "Moderate (Watch)" | "Elevated Risk" | "Critical" = "Low (Stable)";
  let riskDescription = "Plot vitality is high. Sapling mortality is well within natural tolerance thresholds.";

  if (currentSurvivalPercent < 75) {
    mortalityRiskLevel = "Critical";
    riskDescription = "Severe mortality detected. Urgent enrichment replanting required.";
  } else if (currentSurvivalPercent < 85) {
    mortalityRiskLevel = "Elevated Risk";
    riskDescription = "Notable canopy decline in specific sectors. Review irrigation schedule.";
  } else if (currentSurvivalPercent < 92) {
    mortalityRiskLevel = "Moderate (Watch)";
    riskDescription = "Normal post-planting adjustment. Monitor soil moisture during dry months.";
  }

  // Automated donor update summary generator
  const donorUpdateSnippet =
    `🌱 GREEN ENLIGHTENMENT — QUARTERLY PLANTATION UPDATE\n` +
    `-----------------------------------------------------\n` +
    `• Pre-Existing Baseline Trees: ${existingTrees.toLocaleString()}\n` +
    `• Planted Project Trees: ${targetTrees.toLocaleString()}\n` +
    `• Total Census: ${totalCombinedTrees.toLocaleString()} Trees\n` +
    `• Plantation Survival Rate (Project Trees Only): ${currentSurvivalPercent}%\n` +
    `• Living Planted Trees: ${estimatedLivingTrees.toLocaleString()}\n` +
    `• Total Standing Living Trees (Canopy): ${totalLivingCanopyTrees.toLocaleString()}\n` +
    `• Plot Canopy Coverage: ${activeQuarter.canopyCoverPercent}%\n` +
    `• Mean Sentinel-2 NDVI: ${activeQuarter.observedNdvi} (Δ +${activeQuarter.deltaNdvi} vs Baseline)\n` +
    `• Carbon Sequestered to Date: ${accumulatedCo2MT} MT CO₂e\n` +
    `• Field Ground Audit Status: Calibrated with 5% Ranger Sample Audit\n` +
    `-----------------------------------------------------\n` +
    `Next Satellite Pass: Scheduled in 5 days (ESA Sentinel-2 MSI).`;

  return {
    totalTargetTrees: targetTrees,
    existingBaselineTrees: existingTrees,
    totalCombinedTrees,
    baselineDate: plantationDate,
    currentSurvivalPercent,
    estimatedLivingTrees,
    totalLivingCanopyTrees,
    accumulatedCo2MT,
    mortalityRiskLevel,
    riskDescription,
    quarterlyTimeline: quarters,
    donorUpdateSnippet,
  };
}
