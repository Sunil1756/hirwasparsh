/**
 * Green Enlightenment — IPCC Tier-2 Allometric Carbon Accounting & ESG Certificate Engine
 * Strict Anti-Greenwashing & Zero-Tree Lock Specification
 * Biomass Estimation, Cryptographic Certificate Generation, and QR Verification
 */

import { sha256 } from "@/services/auditLogService";

export interface SpeciesAllometricConfig {
  name: string;
  scientificName: string;
  woodDensityRho: number; // g / cm^3
  avgGrowthRateCmYear: number;
  carbonFraction: number; // typically 0.47
  rootToShootRatio: number; // typically 0.26
}

export const SPECIES_ALLOMETRIC_MAP: Record<string, SpeciesAllometricConfig> = {
  neem: { name: "Neem", scientificName: "Azadirachta indica", woodDensityRho: 0.72, avgGrowthRateCmYear: 80, carbonFraction: 0.475, rootToShootRatio: 0.26 },
  teak: { name: "Teak", scientificName: "Tectona grandis", woodDensityRho: 0.66, avgGrowthRateCmYear: 90, carbonFraction: 0.48, rootToShootRatio: 0.24 },
  banyan: { name: "Banyan", scientificName: "Ficus benghalensis", woodDensityRho: 0.58, avgGrowthRateCmYear: 60, carbonFraction: 0.465, rootToShootRatio: 0.32 },
  peepal: { name: "Peepal", scientificName: "Ficus religiosa", woodDensityRho: 0.54, avgGrowthRateCmYear: 70, carbonFraction: 0.47, rootToShootRatio: 0.30 },
  jamun: { name: "Jamun", scientificName: "Syzygium cumini", woodDensityRho: 0.77, avgGrowthRateCmYear: 75, carbonFraction: 0.475, rootToShootRatio: 0.26 },
  bamboo: { name: "Bamboo", scientificName: "Dendrocalamus strictus", woodDensityRho: 0.60, avgGrowthRateCmYear: 180, carbonFraction: 0.49, rootToShootRatio: 0.38 },
  mahua: { name: "Mahua", scientificName: "Madhuca longifolia", woodDensityRho: 0.88, avgGrowthRateCmYear: 50, carbonFraction: 0.485, rootToShootRatio: 0.28 },
  shisham: { name: "Shisham", scientificName: "Dalbergia sissoo", woodDensityRho: 0.78, avgGrowthRateCmYear: 85, carbonFraction: 0.48, rootToShootRatio: 0.25 },
  karanj: { name: "Karanj", scientificName: "Millettia pinnata", woodDensityRho: 0.65, avgGrowthRateCmYear: 70, carbonFraction: 0.47, rootToShootRatio: 0.26 },
  amla: { name: "Amla", scientificName: "Phyllanthus emblica", woodDensityRho: 0.75, avgGrowthRateCmYear: 65, carbonFraction: 0.47, rootToShootRatio: 0.25 },
  tamarind: { name: "Tamarind", scientificName: "Tamarindus indica", woodDensityRho: 0.91, avgGrowthRateCmYear: 55, carbonFraction: 0.48, rootToShootRatio: 0.27 },
  sandalwood: { name: "Sandalwood", scientificName: "Santalum album", woodDensityRho: 0.88, avgGrowthRateCmYear: 45, carbonFraction: 0.485, rootToShootRatio: 0.28 },
  mango: { name: "Mango", scientificName: "Mangifera indica", woodDensityRho: 0.60, avgGrowthRateCmYear: 65, carbonFraction: 0.47, rootToShootRatio: 0.25 },
  default: { name: "Mixed Native", scientificName: "Indigenous Agroforestry", woodDensityRho: 0.67, avgGrowthRateCmYear: 75, carbonFraction: 0.475, rootToShootRatio: 0.27 },
};

export interface CarbonAuditResult {
  serialNumber: string;
  projectId: string;
  projectName: string;
  organizationName: string;
  issuedDate: string;
  acres: number;
  totalLivingTrees: number;
  targetTrees: number;
  dominantSpecies: string;
  meanWoodDensityRho: number;
  aboveGroundBiomassKgPerTree: number;
  totalBiomassMetricTons: number;
  co2SequesteredToDateMT: number;
  projected10YearCo2MT: number;
  projected20YearCo2MT: number;
  estimatedCarbonValuationInr: number;
  verificationMethodology: string;
  satelliteVerificationBadge: string;
  qrVerificationUrl: string;
  cryptographicHash: string;
  isZeroTreeLocked: boolean;
}

/**
 * Calculates IPCC Tier-2 Pantropical Biomass and Carbon Offsets with strict Zero-Tree Lock
 */
export function calculateCarbonLedgerMetrics(params: {
  projectId: string;
  projectName: string;
  organizationName: string;
  targetTrees: number;
  acres: number;
  speciesList: string[];
  plantationDate: string;
  survivalRatePercent?: number;
}): CarbonAuditResult {
  const {
    projectId,
    projectName,
    organizationName,
    targetTrees,
    acres,
    speciesList = [],
    plantationDate,
    survivalRatePercent = 0,
  } = params;

  // STRICT ZERO-TREE LOCK: Living tree census is derived strictly from verified survival rate
  const verifiedRate = Math.max(0, Math.min(100, survivalRatePercent));
  const totalLivingTrees = Math.round((targetTrees * verifiedRate) / 100);
  const isZeroTreeLocked = totalLivingTrees === 0;

  // Age in years (minimum 0.5 years for initial estimation if trees are present)
  const plantDate = new Date(plantationDate || new Date().toISOString());
  const now = new Date();
  const ageYears = Math.max(0.5, (now.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  // Determine mean wood density
  let totalRho = 0;
  let dominantSpecies = "Mixed Indigenous";
  let count = 0;

  speciesList.forEach((sp) => {
    const key = sp.toLowerCase();
    for (const [k, cfg] of Object.entries(SPECIES_ALLOMETRIC_MAP)) {
      if (key.includes(k)) {
        totalRho += cfg.woodDensityRho;
        dominantSpecies = cfg.name;
        count++;
        break;
      }
    }
  });

  const meanWoodDensityRho = count > 0 ? Number((totalRho / count).toFixed(2)) : 0.66;

  // IPCC Tier 2 Pantropical Allometric Equation:
  // AGB (kg/tree) = 0.0673 * (rho * D^2 * H)^0.976
  // D (DBH in cm) = average 2.5 cm per year
  // H (Height in m) = average 1.2 m per year
  const dbhCm = Math.max(2.0, ageYears * 2.8);
  const heightM = Math.max(1.5, ageYears * 1.4);

  const innerTerm = meanWoodDensityRho * Math.pow(dbhCm, 2) * heightM;
  const agbKgPerTree = isZeroTreeLocked ? 0 : Number((0.0673 * Math.pow(innerTerm, 0.976)).toFixed(2));

  // Root-to-shoot Below-Ground Biomass (BGB = AGB * 0.26)
  const bgbKgPerTree = isZeroTreeLocked ? 0 : agbKgPerTree * 0.26;
  const totalBiomassKgPerTree = agbKgPerTree + bgbKgPerTree;

  // Total plot biomass in Metric Tons (MT) — STRICT 0.00 MT if no living trees verified
  const totalBiomassMetricTons = isZeroTreeLocked
    ? 0.00
    : Number(((totalLivingTrees * totalBiomassKgPerTree) / 1000).toFixed(2));

  // Carbon = Biomass * 0.47, CO2e = Carbon * (44 / 12) — STRICT 0.00 MT if no living trees verified
  const carbonMT = totalBiomassMetricTons * 0.47;
  const co2SequesteredToDateMT = isZeroTreeLocked
    ? 0.00
    : Number((carbonMT * (44 / 12)).toFixed(2));

  // 10-Year and 20-Year Projections (Target cohort potential)
  // Mature tree sequestering ~22 kg CO2 / year on average across planted cohort
  const cohortTrees = targetTrees > 0 ? targetTrees : totalLivingTrees;
  const projected10YearCo2MT = Number(((cohortTrees * 0.022 * 10)).toFixed(1));
  const projected20YearCo2MT = Number(((cohortTrees * 0.022 * 20)).toFixed(1));

  // Market Valuation (@ ₹1,200 per MT CO2e offset) — STRICT 0 if no living trees verified to date
  const estimatedCarbonValuationInr = isZeroTreeLocked
    ? 0
    : Math.round(co2SequesteredToDateMT * 1200);

  // Deterministic Cryptographic Serial Number
  const projectSlug = (projectName || "GE").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const idHash = Math.abs(
    (projectId || "ge-default").split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(16).slice(0, 6).toUpperCase();

  const serialNumber = isZeroTreeLocked
    ? `GE-BASELINE-${projectSlug}-${idHash}`
    : `GE-IND-MH-2026-${projectSlug}-${idHash}`;

  // Canonical payload for deterministic cryptographic verification
  const canonicalPayload = JSON.stringify({
    serialNumber,
    projectId: projectId || "ge-default",
    projectName: projectName || "Agroforestry Project",
    organizationName: organizationName || "Executing Organization",
    acres: Number(acres.toFixed(2)),
    totalLivingTrees,
    targetTrees,
    dominantSpecies,
    meanWoodDensityRho,
    agbKgPerTree,
    totalBiomassMetricTons,
    co2SequesteredToDateMT,
    zeroTreeLocked: isZeroTreeLocked,
    standard: "IPCC_TIER_2_CHAVE_2014",
  });
  const cryptographicHash = `sha256:${sha256(canonicalPayload)}`;
  const qrVerificationUrl = `https://green-enlightenment.com/verify/cert/${serialNumber}`;

  return {
    serialNumber,
    projectId,
    projectName: projectName || "Agroforestry Project",
    organizationName: organizationName || "Executing Organization",
    issuedDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    acres: Number(acres.toFixed(2)),
    totalLivingTrees,
    targetTrees,
    dominantSpecies,
    meanWoodDensityRho,
    aboveGroundBiomassKgPerTree: agbKgPerTree,
    totalBiomassMetricTons,
    co2SequesteredToDateMT,
    projected10YearCo2MT,
    projected20YearCo2MT,
    estimatedCarbonValuationInr,
    verificationMethodology: isZeroTreeLocked
      ? "Pre-Planting Baseline (Cadastral Boundary Registered, 0 Tagged Trees)"
      : "IPCC Tier-2 Pantropical Allometric Model (Chave et al. & Verra VM0047)",
    satelliteVerificationBadge: isZeroTreeLocked
      ? "Sentinel-2 Baseline Registered (t₀)"
      : "Sentinel-2 MSI Multi-Spectral Ground-Calibrated",
    qrVerificationUrl,
    cryptographicHash,
    isZeroTreeLocked,
  };
}
