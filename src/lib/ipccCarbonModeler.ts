/**
 * IPCC Tier-2 Allometric Carbon Credit Modeler & Sequestration Engine
 * Calculates annual and cumulative CO2 offsets based on verified tree survival data,
 * phenological growth stages, and species-specific allometric biomass equations.
 * Compliant with IPCC Good Practice Guidance, Chave et al. (2014) Pantropical Model,
 * and Verra VM0047 / Gold Standard methodologies.
 */

export type TreeGrowthStage =
  | "sapling_establishment" // 0 - 2 Years: Root anchoring, high vulnerability
  | "young_vegetative" // 3 - 5 Years: Exponential foliage accretion
  | "maturing_stand" // 6 - 10 Years: Peak stem wood biomass accumulation
  | "mature_climax"; // 10+ Years: Climax carbon reservoir & deep soil carbon

export interface GrowthStageDetails {
  stage: TreeGrowthStage;
  stageLabel: string;
  ageRangeYears: string;
  description: string;
  annualCo2PerTreeKg: number; // Baseline typical sequestration rate
  mortalityVulnerability: "high" | "medium" | "low" | "minimal";
  badgeColor: string;
}

export interface SpeciesAllometricProfile {
  speciesKey: string;
  speciesName: string;
  scientificName: string;
  woodDensityRho: number; // Wood specific gravity (g/cm³)
  annualDbhGrowthCm: number; // Average annual diameter growth at breast height
  annualHeightGrowthM: number; // Average annual height growth
  rootToShootRatio: number; // Below-ground biomass ratio (BGB = AGB * ratio)
  carbonFraction: number; // Fraction of dry biomass that is elemental carbon (typically 0.47 - 0.49)
  ecologicalRole: string;
}

export const IPCC_SPECIES_PROFILES: Record<string, SpeciesAllometricProfile> = {
  neem: {
    speciesKey: "neem",
    speciesName: "Neem",
    scientificName: "Azadirachta indica",
    woodDensityRho: 0.72,
    annualDbhGrowthCm: 2.2,
    annualHeightGrowthM: 1.4,
    rootToShootRatio: 0.26,
    carbonFraction: 0.475,
    ecologicalRole: "High drought resilience, pest repellent, bio-remediation",
  },
  teak: {
    speciesKey: "teak",
    speciesName: "Teak / Sagwan",
    scientificName: "Tectona grandis",
    woodDensityRho: 0.66,
    annualDbhGrowthCm: 1.8,
    annualHeightGrowthM: 1.6,
    rootToShootRatio: 0.24,
    carbonFraction: 0.48,
    ecologicalRole: "High-density hardwood carbon sink, durable structural timber",
  },
  banyan: {
    speciesKey: "banyan",
    speciesName: "Banyan / Vad",
    scientificName: "Ficus benghalensis",
    woodDensityRho: 0.58,
    annualDbhGrowthCm: 3.5,
    annualHeightGrowthM: 1.2,
    rootToShootRatio: 0.32,
    carbonFraction: 0.465,
    ecologicalRole: "Massive keystone microclimate cooler, soil binder, biodiversity sanctuary",
  },
  peepal: {
    speciesKey: "peepal",
    speciesName: "Peepal / Pimpal",
    scientificName: "Ficus religiosa",
    woodDensityRho: 0.54,
    annualDbhGrowthCm: 3.2,
    annualHeightGrowthM: 1.3,
    rootToShootRatio: 0.30,
    carbonFraction: 0.47,
    ecologicalRole: "Continuous oxygen release, high air pollution tolerance, bird nesting",
  },
  jamun: {
    speciesKey: "jamun",
    speciesName: "Black Plum / Jamun",
    scientificName: "Syzygium cumini",
    woodDensityRho: 0.77,
    annualDbhGrowthCm: 2.0,
    annualHeightGrowthM: 1.4,
    rootToShootRatio: 0.26,
    carbonFraction: 0.475,
    ecologicalRole: "Riparian buffer, wetland stability, keystone avian food source",
  },
  karanj: {
    speciesKey: "karanj",
    speciesName: "Indian Beech / Karanj",
    scientificName: "Pongamia pinnata",
    woodDensityRho: 0.65,
    annualDbhGrowthCm: 2.4,
    annualHeightGrowthM: 1.5,
    rootToShootRatio: 0.26,
    carbonFraction: 0.47,
    ecologicalRole: "Nitrogen fixation, saline soil restoration, bio-diesel seed production",
  },
  mahua: {
    speciesKey: "mahua",
    speciesName: "Butter Tree / Mahua",
    scientificName: "Madhuca longifolia",
    woodDensityRho: 0.88,
    annualDbhGrowthCm: 1.2,
    annualHeightGrowthM: 0.9,
    rootToShootRatio: 0.28,
    carbonFraction: 0.485,
    ecologicalRole: "Tribal livelihood security, deep taproot watershed retention, heavy biomass",
  },
  amla: {
    speciesKey: "amla",
    speciesName: "Indian Gooseberry / Amla",
    scientificName: "Phyllanthus emblica",
    woodDensityRho: 0.75,
    annualDbhGrowthCm: 1.6,
    annualHeightGrowthM: 1.1,
    rootToShootRatio: 0.25,
    carbonFraction: 0.47,
    ecologicalRole: "High medicinal value, soil stabilization, pollinator support",
  },
  tamarind: {
    speciesKey: "tamarind",
    speciesName: "Tamarind / Chinch",
    scientificName: "Tamarindus indica",
    woodDensityRho: 0.91,
    annualDbhGrowthCm: 1.4,
    annualHeightGrowthM: 1.0,
    rootToShootRatio: 0.27,
    carbonFraction: 0.48,
    ecologicalRole: "Extreme arid drought tolerance, high wood density carbon sink",
  },
  shisham: {
    speciesKey: "shisham",
    speciesName: "Indian Rosewood / Shisham",
    scientificName: "Dalbergia sissoo",
    woodDensityRho: 0.78,
    annualDbhGrowthCm: 2.5,
    annualHeightGrowthM: 1.7,
    rootToShootRatio: 0.25,
    carbonFraction: 0.48,
    ecologicalRole: "Nitrogen-fixing root nodules, riverbank erosion control, premium hardwood",
  },
  bamboo: {
    speciesKey: "bamboo",
    speciesName: "Bamboo / Manvel",
    scientificName: "Dendrocalamus strictus",
    woodDensityRho: 0.60,
    annualDbhGrowthCm: 2.8,
    annualHeightGrowthM: 3.2,
    rootToShootRatio: 0.38,
    carbonFraction: 0.49,
    ecologicalRole: "Rapid vegetative carbon accumulation, steep slope watershed conservation",
  },
  mango: {
    speciesKey: "mango",
    speciesName: "Mango / Amba",
    scientificName: "Mangifera indica",
    woodDensityRho: 0.60,
    annualDbhGrowthCm: 1.9,
    annualHeightGrowthM: 1.1,
    rootToShootRatio: 0.25,
    carbonFraction: 0.47,
    ecologicalRole: "Agroforestry farmer revenue, pollinator nectar source, dense shade",
  },
  sandalwood: {
    speciesKey: "sandalwood",
    speciesName: "Sandalwood / Chandan",
    scientificName: "Santalum album",
    woodDensityRho: 0.88,
    annualDbhGrowthCm: 1.1,
    annualHeightGrowthM: 0.8,
    rootToShootRatio: 0.28,
    carbonFraction: 0.485,
    ecologicalRole: "High economic valuation, semi-parasitic native root biodiversity",
  },
  mixed_native: {
    speciesKey: "mixed_native",
    speciesName: "Mixed Western Ghats Poly-culture",
    scientificName: "Terminalia + Syzygium + Ficus Native Blend",
    woodDensityRho: 0.67,
    annualDbhGrowthCm: 2.0,
    annualHeightGrowthM: 1.3,
    rootToShootRatio: 0.27,
    carbonFraction: 0.475,
    ecologicalRole: "Maximal climate resilience, disease immunity, stratified canopy architecture",
  },
};

export interface CarbonYearProjection {
  year: number;
  growthStage: TreeGrowthStage;
  growthStageLabel: string;
  dbhCm: number;
  heightM: number;
  aboveGroundBiomassKgPerTree: number;
  belowGroundBiomassKgPerTree: number;
  totalBiomassKgPerTree: number;
  annualCo2ePerTreeKg: number;
  cumulativeCo2ePerTreeKg: number;
  grossPlotCo2eMT: number;
  bufferDeductionMT: number;
  netCertifiedCreditsIssuedMT: number; // (tCO2e)
  cumulativeNetCreditsMT: number;
  valuationInr: number;
  valuationUsd: number;
}

export interface IpccCarbonModelResult {
  plantedTrees: number;
  survivalRatePct: number;
  verifiedLivingTrees: number;
  standAgeYears: number;
  currentGrowthStage: GrowthStageDetails;
  speciesProfile: SpeciesAllometricProfile;
  // Per-tree metrics at current age
  currentDbhCm: number;
  currentHeightM: number;
  aboveGroundBiomassKgPerTree: number;
  belowGroundBiomassKgPerTree: number;
  totalBiomassKgPerTree: number;
  carbonStoredKgPerTree: number;
  co2eKgPerTree: number;
  // Plot-level Annual & Cumulative Metrics
  totalPlotBiomassMT: number;
  annualGrossPlotCo2eMT: number;
  permanenceBufferPct: number; // e.g. 15%
  permanenceBufferMT: number;
  annualNetCertifiedCreditsMT: number; // tCO2e / year issued to funder
  tenYearNetCertifiedCreditsMT: number;
  twentyYearNetCertifiedCreditsMT: number;
  // Economic Credit Valuation
  carbonCreditPriceUsdPerTon: number; // $15 / MT
  annualValuationInr: number;
  annualValuationUsd: number;
  tenYearValuationInr: number;
  tenYearValuationUsd: number;
  // Full 20-Year Growth Timeline
  projections20Years: CarbonYearProjection[];
  methodologyStandard: string;
  esgBrsrClassification: string;
  isZeroTreeLocked: boolean;
  zeroTreeReason?: string;
}

export interface ModelCarbonParams {
  plantedTrees: number;
  survivalRatePct?: number;
  ageYears?: number;
  speciesKey?: string;
  permanenceBufferPct?: number; // default 12% (Verra buffer pool)
  customDbhCm?: number;
  customHeightM?: number;
  creditPriceUsdPerTon?: number; // default $15
}

/**
 * Returns Growth Stage Classification details based on plantation age in years
 */
export function determineGrowthStage(ageYears: number): GrowthStageDetails {
  if (ageYears <= 2.0) {
    return {
      stage: "sapling_establishment",
      stageLabel: "Sapling Establishment Phase",
      ageRangeYears: "0 - 2 Years",
      description: "Root anchoring and photosynthetic initiation. Vulnerable to moisture deficit.",
      annualCo2PerTreeKg: 6.5,
      mortalityVulnerability: "high",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    };
  } else if (ageYears <= 5.0) {
    return {
      stage: "young_vegetative",
      stageLabel: "Young Vegetative Growth Phase",
      ageRangeYears: "3 - 5 Years",
      description: "Rapid canopy expansion, active root deepening, and accelerated foliar biomass growth.",
      annualCo2PerTreeKg: 16.0,
      mortalityVulnerability: "medium",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    };
  } else if (ageYears <= 10.0) {
    return {
      stage: "maturing_stand",
      stageLabel: "Maturing Agroforestry Stand",
      ageRangeYears: "6 - 10 Years",
      description: "Substantial woody stem accumulation, linear volume increment, high carbon sink efficiency.",
      annualCo2PerTreeKg: 26.5,
      mortalityVulnerability: "low",
      badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    };
  } else {
    return {
      stage: "mature_climax",
      stageLabel: "Mature Keystone Climax Canopy",
      ageRangeYears: "10+ Years",
      description: "Climax carbon reservoir, stable perennial biomass, deep rhizosphere carbon storage.",
      annualCo2PerTreeKg: 32.0,
      mortalityVulnerability: "minimal",
      badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    };
  }
}

/**
 * Pure Mathematical Engine for IPCC Tier-2 Carbon Credit Modeling with strict Zero-Tree Lock
 */
export function calculateIpccCarbonModel(params: ModelCarbonParams): IpccCarbonModelResult {
  const planted = Math.max(0, params.plantedTrees ?? 0);
  const survivalRate = params.survivalRatePct !== undefined
    ? Math.min(100, Math.max(0, params.survivalRatePct))
    : 0;
  const verifiedLiving = Math.round((planted * survivalRate) / 100);
  const isZeroTreeLocked = verifiedLiving === 0;
  const zeroTreeReason = planted === 0
    ? "Zero-Tree Lock: Plantation has 0 registered trees. Credit issuance and biomass totals are locked at 0."
    : survivalRate === 0
    ? "Zero-Tree Lock: Ground survival census indicates 0 verified living trees. Credit issuance is locked at 0."
    : undefined;

  const ageYears = Math.max(0.2, params.ageYears ?? 2.5);
  const bufferPct = Math.min(30, Math.max(5, params.permanenceBufferPct ?? 12));
  const creditPriceUsd = params.creditPriceUsdPerTon ?? 15;
  const inrRate = 86; // USD to INR conversion

  const species =
    IPCC_SPECIES_PROFILES[params.speciesKey || "mixed_native"] ||
    IPCC_SPECIES_PROFILES.mixed_native;

  const currentStage = determineGrowthStage(ageYears);

  // Compute DBH & Height at current age
  const dbh = params.customDbhCm && params.customDbhCm > 0
    ? params.customDbhCm
    : Math.max(1.5, Math.min(80, 1.8 + species.annualDbhGrowthCm * ageYears));

  const height = params.customHeightM && params.customHeightM > 0
    ? params.customHeightM
    : Math.max(1.0, Math.min(35, 1.2 + species.annualHeightGrowthM * ageYears));

  // Chave et al. (2014) Pantropical Allometric Model:
  // AGB (kg) = 0.0673 * (rho * DBH^2 * Height)^0.976
  const agbKg = 0.0673 * Math.pow(species.woodDensityRho * Math.pow(dbh, 2) * height, 0.976);
  const bgbKg = agbKg * species.rootToShootRatio;
  const totalBiomassKg = agbKg + bgbKg;
  const carbonKg = totalBiomassKg * species.carbonFraction;
  const co2eKg = carbonKg * 3.667; // Carbon to CO2 stoichiometric ratio (44/12)

  // Plot Total Metrics at Current Stand Age (Strictly 0 when Zero-Tree Locked)
  const totalPlotBiomassMT = isZeroTreeLocked ? 0 : (totalBiomassKg * verifiedLiving) / 1000;
  const grossPlotCo2eMT = isZeroTreeLocked ? 0 : (co2eKg * verifiedLiving) / 1000;
  const annualGrossPlotCo2eMT = isZeroTreeLocked ? 0 : grossPlotCo2eMT / Math.max(1, ageYears);

  // Verra / Gold Standard Buffer Deduction
  const bufferDeductionMT = isZeroTreeLocked ? 0 : (annualGrossPlotCo2eMT * bufferPct) / 100;
  const annualNetCertifiedCreditsMT = isZeroTreeLocked ? 0 : Math.max(0, annualGrossPlotCo2eMT - bufferDeductionMT);

  // 20-Year Timeline Projections
  const projections: CarbonYearProjection[] = [];
  let cumulativeGrossCo2e = 0;
  let cumulativeNetCredits = 0;

  for (let yr = 1; yr <= 20; yr++) {
    const stage = determineGrowthStage(yr);
    const yrDbh = Math.max(1.5, Math.min(80, 1.8 + species.annualDbhGrowthCm * yr));
    const yrHeight = Math.max(1.0, Math.min(35, 1.2 + species.annualHeightGrowthM * yr));

    const yrAgb = 0.0673 * Math.pow(species.woodDensityRho * Math.pow(yrDbh, 2) * yrHeight, 0.976);
    const yrBgb = yrAgb * species.rootToShootRatio;
    const yrTotalBiomass = yrAgb + yrBgb;
    const yrCarbonKg = yrTotalBiomass * species.carbonFraction;
    const yrCumulativeCo2ePerTree = yrCarbonKg * 3.667;

    const prevCumulativeCo2e = yr === 1 ? 0 : projections[yr - 2].cumulativeCo2ePerTreeKg;
    const yrAnnualCo2ePerTree = Math.max(1.0, yrCumulativeCo2ePerTree - prevCumulativeCo2e);

    const yrGrossPlotMT = isZeroTreeLocked ? 0 : (yrAnnualCo2ePerTree * verifiedLiving) / 1000;
    const yrBufferMT = isZeroTreeLocked ? 0 : (yrGrossPlotMT * bufferPct) / 100;
    const yrNetCredits = isZeroTreeLocked ? 0 : yrGrossPlotMT - yrBufferMT;

    if (!isZeroTreeLocked) {
      cumulativeGrossCo2e += yrGrossPlotMT;
      cumulativeNetCredits += yrNetCredits;
    }

    const yrValUsd = isZeroTreeLocked ? 0 : yrNetCredits * creditPriceUsd;
    const yrValInr = isZeroTreeLocked ? 0 : yrValUsd * inrRate;

    projections.push({
      year: yr,
      growthStage: stage.stage,
      growthStageLabel: stage.stageLabel,
      dbhCm: Math.round(yrDbh * 10) / 10,
      heightM: Math.round(yrHeight * 10) / 10,
      aboveGroundBiomassKgPerTree: Math.round(yrAgb * 10) / 10,
      belowGroundBiomassKgPerTree: Math.round(yrBgb * 10) / 10,
      totalBiomassKgPerTree: Math.round(yrTotalBiomass * 10) / 10,
      annualCo2ePerTreeKg: Math.round(yrAnnualCo2ePerTree * 10) / 10,
      cumulativeCo2ePerTreeKg: Math.round(yrCumulativeCo2ePerTree * 10) / 10,
      grossPlotCo2eMT: Math.round(yrGrossPlotMT * 100) / 100,
      bufferDeductionMT: Math.round(yrBufferMT * 100) / 100,
      netCertifiedCreditsIssuedMT: Math.round(yrNetCredits * 100) / 100,
      cumulativeNetCreditsMT: Math.round(cumulativeNetCredits * 10) / 10,
      valuationInr: Math.round(yrValInr),
      valuationUsd: Math.round(yrValUsd),
    });
  }

  const tenYearNetCredits = isZeroTreeLocked ? 0 : projections[9].cumulativeNetCreditsMT;
  const twentyYearNetCredits = isZeroTreeLocked ? 0 : projections[19].cumulativeNetCreditsMT;

  const annualValuationUsd = isZeroTreeLocked ? 0 : Math.round(annualNetCertifiedCreditsMT * creditPriceUsd);
  const annualValuationInr = isZeroTreeLocked ? 0 : Math.round(annualValuationUsd * inrRate);

  const tenYearValuationUsd = isZeroTreeLocked ? 0 : Math.round(tenYearNetCredits * creditPriceUsd);
  const tenYearValuationInr = isZeroTreeLocked ? 0 : Math.round(tenYearValuationUsd * inrRate);

  return {
    plantedTrees: planted,
    survivalRatePct: survivalRate,
    verifiedLivingTrees: verifiedLiving,
    standAgeYears: Math.round(ageYears * 10) / 10,
    currentGrowthStage: currentStage,
    speciesProfile: species,
    currentDbhCm: Math.round(dbh * 10) / 10,
    currentHeightM: Math.round(height * 10) / 10,
    aboveGroundBiomassKgPerTree: Math.round(agbKg * 10) / 10,
    belowGroundBiomassKgPerTree: Math.round(bgbKg * 10) / 10,
    totalBiomassKgPerTree: Math.round(totalBiomassKg * 10) / 10,
    carbonStoredKgPerTree: Math.round(carbonKg * 10) / 10,
    co2eKgPerTree: Math.round(co2eKg * 10) / 10,
    totalPlotBiomassMT: Math.round(totalPlotBiomassMT * 10) / 10,
    annualGrossPlotCo2eMT: Math.round(annualGrossPlotCo2eMT * 10) / 10,
    permanenceBufferPct: bufferPct,
    permanenceBufferMT: Math.round(bufferDeductionMT * 10) / 10,
    annualNetCertifiedCreditsMT: Math.round(annualNetCertifiedCreditsMT * 10) / 10,
    tenYearNetCertifiedCreditsMT: Math.round(tenYearNetCredits * 10) / 10,
    twentyYearNetCertifiedCreditsMT: Math.round(twentyYearNetCredits * 10) / 10,
    carbonCreditPriceUsdPerTon: creditPriceUsd,
    annualValuationInr,
    annualValuationUsd,
    tenYearValuationInr,
    tenYearValuationUsd,
    projections20Years: projections,
    methodologyStandard: "IPCC Tier-2 Allometric Model (Chave et al., 2014 & Verra VM0047)",
    esgBrsrClassification: "SEBI BRSR Core Principal 6 (GHG Scope 1/3 Removal Verification)",
    isZeroTreeLocked,
    zeroTreeReason,
  };
}
