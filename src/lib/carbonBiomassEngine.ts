/**
 * Scientific Allometric Biomass & Carbon Sequestration Engine
 * Based on Forest Survey of India (FSI), IPCC Good Practice Guidance,
 * and Chave et al. Pantropical Forestry Allometric Equations.
 */

export interface TreeSpeciesAllometry {
  speciesName: string;
  scientificName: string;
  woodDensity: number; // g/cm³ (specific gravity)
  growthRateCategory: "fast" | "medium" | "slow";
  annualDbhGrowthCm: number; // average annual diameter increase
  annualHeightGrowthM: number; // average annual height increase
  rootToShootRatio: number; // below-ground biomass multiplier (typically 0.20 - 0.30)
  carbonFraction: number; // fraction of dry biomass that is carbon (typically 0.47)
  ecologicalBenefit: string;
}

export const SPECIES_ALLOMETRY_CATALOG: Record<string, TreeSpeciesAllometry> = {
  neem: {
    speciesName: "Neem",
    scientificName: "Azadirachta indica",
    woodDensity: 0.72,
    growthRateCategory: "fast",
    annualDbhGrowthCm: 2.2,
    annualHeightGrowthM: 1.4,
    rootToShootRatio: 0.26,
    carbonFraction: 0.475,
    ecologicalBenefit: "High pest resistance, soil salinity remediation, air purification",
  },
  teak: {
    speciesName: "Teak / Sagwan",
    scientificName: "Tectona grandis",
    woodDensity: 0.65,
    growthRateCategory: "medium",
    annualDbhGrowthCm: 1.8,
    annualHeightGrowthM: 1.6,
    rootToShootRatio: 0.24,
    carbonFraction: 0.48,
    ecologicalBenefit: "High commercial timber value, deep carbon sink, structural durability",
  },
  banyan: {
    speciesName: "Banyan / Vad",
    scientificName: "Ficus benghalensis",
    woodDensity: 0.58,
    growthRateCategory: "fast",
    annualDbhGrowthCm: 3.5,
    annualHeightGrowthM: 1.2,
    rootToShootRatio: 0.32,
    carbonFraction: 0.465,
    ecologicalBenefit: "Massive microclimate cooling, keystone biodiversity shelter, soil binding",
  },
  peepal: {
    speciesName: "Peepal / Pimpal",
    scientificName: "Ficus religiosa",
    woodDensity: 0.55,
    growthRateCategory: "fast",
    annualDbhGrowthCm: 3.2,
    annualHeightGrowthM: 1.3,
    rootToShootRatio: 0.30,
    carbonFraction: 0.47,
    ecologicalBenefit: "24-hour oxygen release, high ozone tolerance, bird habitat",
  },
  bamboo: {
    speciesName: "Bamboo / Manvel",
    scientificName: "Dendrocalamus strictus",
    woodDensity: 0.70,
    growthRateCategory: "fast",
    annualDbhGrowthCm: 2.8,
    annualHeightGrowthM: 3.2,
    rootToShootRatio: 0.38,
    carbonFraction: 0.49,
    ecologicalBenefit: "Fastest vegetative carbon sequestration, heavy watershed protection",
  },
  mango: {
    speciesName: "Mango / Amba",
    scientificName: "Mangifera indica",
    woodDensity: 0.60,
    growthRateCategory: "medium",
    annualDbhGrowthCm: 1.9,
    annualHeightGrowthM: 1.1,
    rootToShootRatio: 0.25,
    carbonFraction: 0.47,
    ecologicalBenefit: "Rural farmer livelihoods, pollinator nectar source, canopy shade",
  },
  sandalwood: {
    speciesName: "Sandalwood / Chandan",
    scientificName: "Santalum album",
    woodDensity: 0.88,
    growthRateCategory: "slow",
    annualDbhGrowthCm: 1.1,
    annualHeightGrowthM: 0.8,
    rootToShootRatio: 0.28,
    carbonFraction: 0.485,
    ecologicalBenefit: "High aromatic value, semi-parasitic root biodiversity enhancement",
  },
  mixed_native: {
    speciesName: "Mixed Western Ghats Native Forest",
    scientificName: "Terminalia + Syzygium + Ficus Poly-culture",
    woodDensity: 0.67,
    growthRateCategory: "medium",
    annualDbhGrowthCm: 2.0,
    annualHeightGrowthM: 1.3,
    rootToShootRatio: 0.27,
    carbonFraction: 0.475,
    ecologicalBenefit: "Maximized resilience, drought immunity, multi-strata canopy cover",
  },
};

export interface CarbonBiomassResult {
  dbhCm: number;
  heightM: number;
  aboveGroundBiomassKgPerTree: number;
  belowGroundBiomassKgPerTree: number;
  totalDryBiomassKgPerTree: number;
  totalPlotDryBiomassMetricTons: number;
  carbonStoredKgPerTree: number;
  co2eSequesteredKgPerTree: number;
  annualPlotCo2eMetricTons: number;
  tenYearPlotCo2eMetricTons: number;
  carbonCreditValuationInr: number; // based on ₹1,250/ton ($15/ton)
  carbonCreditValuationUsd: number;
  speciesDetails: TreeSpeciesAllometry;
}

/**
 * Calculates scientific biomass and carbon sequestration using IPCC & Chave Allometry
 */
export function calculateAllometricCarbon(params: {
  speciesKey: string;
  treeCount: number;
  ageMonths: number;
  customDbhCm?: number;
  customHeightM?: number;
}): CarbonBiomassResult {
  const species = SPECIES_ALLOMETRY_CATALOG[params.speciesKey] || SPECIES_ALLOMETRY_CATALOG.mixed_native;
  const ageYears = Math.max(0.2, params.ageMonths / 12);

  // If DBH & Height are not measured in field, estimate using species growth constants
  const dbh = params.customDbhCm && params.customDbhCm > 0
    ? params.customDbhCm
    : Math.max(1.5, Math.min(65, 2.0 + species.annualDbhGrowthCm * ageYears));

  const height = params.customHeightM && params.customHeightM > 0
    ? params.customHeightM
    : Math.max(1.0, Math.min(30, 1.2 + species.annualHeightGrowthM * ageYears));

  // Chave et al. Pantropical Allometric Equation for Above-Ground Biomass (AGB):
  // AGB (kg) = 0.0673 * (woodDensity * DBH^2 * Height)^0.976
  const agbKg = 0.0673 * Math.pow(species.woodDensity * Math.pow(dbh, 2) * height, 0.976);

  // Below-Ground Biomass (BGB) via Root-to-Shoot Ratio
  const bgbKg = agbKg * species.rootToShootRatio;

  // Total Dry Biomass (TB)
  const totalBiomassKg = agbKg + bgbKg;

  // Carbon Content: Biomass * Carbon Fraction (0.47 to 0.49)
  const carbonKg = totalBiomassKg * species.carbonFraction;

  // CO2 Equivalent = Carbon * (Molecular weight CO2 / C) = Carbon * (44 / 12) = Carbon * 3.667
  const co2eKgPerTree = carbonKg * 3.667;

  // Cumulative Plot Totals
  const totalPlotDryBiomassMT = (totalBiomassKg * params.treeCount) / 1000;
  const totalCo2eMT = (co2eKgPerTree * params.treeCount) / 1000;

  // Annualized rate
  const annualPlotCo2eMT = totalCo2eMT / Math.max(1, ageYears);

  // 10-Year cumulative carbon projection
  const tenYearPlotCo2eMT = annualPlotCo2eMT * 10 * 1.15; // accounting for accelerating mature biomass curve

  // Market valuation (Standard Gold Standard / Verra rate ~ $15 / ₹1,250 per ton)
  const creditPricePerTonUsd = 15;
  const inrConversionRate = 86;
  const carbonCreditValuationUsd = Math.round(tenYearPlotCo2eMT * creditPricePerTonUsd);
  const carbonCreditValuationInr = Math.round(carbonCreditValuationUsd * inrConversionRate);

  return {
    dbhCm: Math.round(dbh * 10) / 10,
    heightM: Math.round(height * 10) / 10,
    aboveGroundBiomassKgPerTree: Math.round(agbKg * 10) / 10,
    belowGroundBiomassKgPerTree: Math.round(bgbKg * 10) / 10,
    totalDryBiomassKgPerTree: Math.round(totalBiomassKg * 10) / 10,
    totalPlotDryBiomassMetricTons: Math.round(totalPlotDryBiomassMT * 10) / 10,
    carbonStoredKgPerTree: Math.round(carbonKg * 10) / 10,
    co2eSequesteredKgPerTree: Math.round(co2eKgPerTree * 10) / 10,
    annualPlotCo2eMetricTons: Math.round(annualPlotCo2eMT * 10) / 10,
    tenYearPlotCo2eMetricTons: Math.round(tenYearPlotCo2eMT * 10) / 10,
    carbonCreditValuationInr,
    carbonCreditValuationUsd,
    speciesDetails: species,
  };
}

/**
 * Generates 36-Month Time-Series Satellite NDVI & Biomass Progression Curve
 */
export function generateNDVITimeSeries(params: {
  speciesKey: string;
  treeCount: number;
  initialDate?: string;
}) {
  const species = SPECIES_ALLOMETRY_CATALOG[params.speciesKey] || SPECIES_ALLOMETRY_CATALOG.mixed_native;
  const months = [
    "M01 (Planting)", "M03", "M06", "M09", "M12 (Year 1)",
    "M15", "M18", "M21", "M24 (Year 2)",
    "M27", "M30", "M33", "M36 (Year 3)",
  ];

  const data = months.map((m, index) => {
    const monthNum = index === 0 ? 1 : index * 3;
    const yearFraction = monthNum / 12;

    // Seasonal fluctuation (Monsoon peak in July-Sept, dry dip in March-May)
    const seasonalWave = Math.sin((monthNum % 12) * (Math.PI / 6)) * 0.06;

    // Base vegetative canopy growth curve (Logistics growth model)
    const baseNdvi = 0.18 + 0.62 / (1 + Math.exp(-0.18 * (monthNum - 8)));
    const ndvi = Math.min(0.88, Math.max(0.15, Math.round((baseNdvi + seasonalWave) * 100) / 100));

    // NDWI Moisture index (correlated with monsoon cycles)
    const ndwi = Math.round((0.15 + (seasonalWave > 0 ? 0.28 : 0.08) + (monthNum * 0.008)) * 100) / 100;

    // Biomass growth accumulation
    const allometry = calculateAllometricCarbon({
      speciesKey: params.speciesKey,
      treeCount: params.treeCount,
      ageMonths: monthNum,
    });

    return {
      month: m,
      monthNumber: monthNum,
      ndvi,
      ndwi,
      biomassMT: allometry.totalPlotDryBiomassMetricTons,
      co2eMT: Math.round((allometry.co2eSequesteredKgPerTree * params.treeCount / 1000) * 10) / 10,
      canopyCoverPercent: Math.min(92, Math.round(ndvi * 100)),
      isMonsoonSeason: [6, 7, 8, 9, 18, 19, 20, 21, 30, 31, 32, 33].includes(monthNum),
    };
  });

  return data;
}
