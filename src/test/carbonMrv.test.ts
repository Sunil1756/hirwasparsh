import { describe, it, expect } from "vitest";
import {
  calculateIpccCarbonModel,
  IPCC_SPECIES_PROFILES,
  determineGrowthStage,
} from "../lib/ipccCarbonModeler";
import {
  calculateAllometricCarbon,
  SPECIES_ALLOMETRY_CATALOG,
} from "../lib/carbonBiomassEngine";
import {
  calculateCarbonLedgerMetrics,
  SPECIES_ALLOMETRIC_MAP,
} from "../lib/carbonLedger";
import {
  evaluateTier1GroundEvidence,
  evaluateTier2SatelliteSpectral,
  evaluateTier3FusionTrustScore,
} from "../lib/mrvThreeTierEngine";

describe("IPCC Tier-2 Allometric Biomass & Sequestration Modeler", () => {
  it("calculates biomass using exact Chave et al. pantropical allometric formula", () => {
    // Neem: wood density = 0.72 g/cm3, DBH = 10 cm, Height = 6 m
    const neemModel = calculateIpccCarbonModel({
      plantedTrees: 100,
      survivalRatePct: 100,
      speciesKey: "neem",
      customDbhCm: 10,
      customHeightM: 6,
      permanenceBufferPct: 12,
    });

    expect(neemModel.isZeroTreeLocked).toBe(false);
    expect(neemModel.verifiedLivingTrees).toBe(100);

    // Chave formula: AGB = 0.0673 * (rho * DBH^2 * H)^0.976
    // innerTerm = 0.72 * 10^2 * 6 = 432
    // AGB = 0.0673 * (432)^0.976 ≈ 24.88 kg
    expect(neemModel.aboveGroundBiomassKgPerTree).toBeCloseTo(24.9, 0);

    // Below Ground: BGB = AGB * 0.26 ≈ 6.47 kg
    expect(neemModel.belowGroundBiomassKgPerTree).toBeCloseTo(6.5, 0);

    // Total Biomass = AGB + BGB ≈ 31.35 kg
    expect(neemModel.totalBiomassKgPerTree).toBeCloseTo(31.4, 0);

    // Carbon = Total * 0.475 ≈ 15.1 kg
    expect(neemModel.carbonStoredKgPerTree).toBeCloseTo(15.1, 0);

    // CO2e = Carbon * (44/12) ≈ 55.2 kg
    expect(neemModel.co2eKgPerTree).toBeCloseTo(55.2, 0);
  });

  it("proves wood density sensitivity: high-density Tamarind yields more biomass than low-density Peepal", () => {
    // Identical dimensions: DBH = 15 cm, Height = 8 m
    const tamarind = calculateIpccCarbonModel({
      plantedTrees: 50,
      survivalRatePct: 100,
      speciesKey: "tamarind", // rho = 0.91
      customDbhCm: 15,
      customHeightM: 8,
    });

    const peepal = calculateIpccCarbonModel({
      plantedTrees: 50,
      survivalRatePct: 100,
      speciesKey: "peepal", // rho = 0.54
      customDbhCm: 15,
      customHeightM: 8,
    });

    expect(tamarind.speciesProfile.woodDensityRho).toBe(0.91);
    expect(peepal.speciesProfile.woodDensityRho).toBe(0.54);

    // Tamarind should have ~65% more above-ground biomass than Peepal
    expect(tamarind.aboveGroundBiomassKgPerTree).toBeGreaterThan(peepal.aboveGroundBiomassKgPerTree * 1.5);
    expect(tamarind.totalPlotBiomassMT).toBeGreaterThan(peepal.totalPlotBiomassMT);
  });

  it("deducts Verra / Gold Standard permanence buffer pool reserve from gross CO2e", () => {
    const modelWith12PctBuffer = calculateIpccCarbonModel({
      plantedTrees: 500,
      survivalRatePct: 90,
      speciesKey: "teak",
      permanenceBufferPct: 12,
    });

    const modelWith20PctBuffer = calculateIpccCarbonModel({
      plantedTrees: 500,
      survivalRatePct: 90,
      speciesKey: "teak",
      permanenceBufferPct: 20,
    });

    expect(modelWith12PctBuffer.annualGrossPlotCo2eMT).toBe(modelWith20PctBuffer.annualGrossPlotCo2eMT);
    expect(modelWith20PctBuffer.permanenceBufferMT).toBeGreaterThan(modelWith12PctBuffer.permanenceBufferMT);
    expect(modelWith12PctBuffer.annualNetCertifiedCreditsMT).toBeGreaterThan(modelWith20PctBuffer.annualNetCertifiedCreditsMT);
  });
});

describe("Strict Zero-Tree Lock & Anti-Greenwashing Enforcement", () => {
  it("enforces Zero-Tree Lock when plantedTrees = 0 in IPCC model", () => {
    const result = calculateIpccCarbonModel({
      plantedTrees: 0,
      survivalRatePct: 95,
      speciesKey: "neem",
    });

    expect(result.isZeroTreeLocked).toBe(true);
    expect(result.verifiedLivingTrees).toBe(0);
    expect(result.totalPlotBiomassMT).toBe(0);
    expect(result.annualGrossPlotCo2eMT).toBe(0);
    expect(result.annualNetCertifiedCreditsMT).toBe(0);
    expect(result.tenYearNetCertifiedCreditsMT).toBe(0);
    expect(result.twentyYearNetCertifiedCreditsMT).toBe(0);
    expect(result.annualValuationInr).toBe(0);
    expect(result.annualValuationUsd).toBe(0);
    expect(result.tenYearValuationInr).toBe(0);
    expect(result.zeroTreeReason).toContain("0 registered trees");

    // All 20-year projection rows must be strictly 0 credits
    result.projections20Years.forEach((yr) => {
      expect(yr.grossPlotCo2eMT).toBe(0);
      expect(yr.netCertifiedCreditsIssuedMT).toBe(0);
      expect(yr.cumulativeNetCreditsMT).toBe(0);
      expect(yr.valuationInr).toBe(0);
    });
  });

  it("enforces Zero-Tree Lock when survivalRatePct = 0 in IPCC model", () => {
    const result = calculateIpccCarbonModel({
      plantedTrees: 1000,
      survivalRatePct: 0,
      speciesKey: "banyan",
    });

    expect(result.isZeroTreeLocked).toBe(true);
    expect(result.verifiedLivingTrees).toBe(0);
    expect(result.totalPlotBiomassMT).toBe(0);
    expect(result.annualNetCertifiedCreditsMT).toBe(0);
    expect(result.annualValuationInr).toBe(0);
    expect(result.zeroTreeReason).toContain("0 verified living trees");
  });

  it("does NOT secretly fall back to fake default 92% survival if survivalRatePct is omitted", () => {
    const result = calculateIpccCarbonModel({
      plantedTrees: 1000,
      // survivalRatePct omitted!
    });

    expect(result.survivalRatePct).toBe(0);
    expect(result.verifiedLivingTrees).toBe(0);
    expect(result.isZeroTreeLocked).toBe(true);
    expect(result.annualNetCertifiedCreditsMT).toBe(0);
  });

  it("enforces Zero-Tree Lock in calculateAllometricCarbon when treeCount is 0", () => {
    const result = calculateAllometricCarbon({
      speciesKey: "jamun",
      treeCount: 0,
      ageMonths: 24,
    });

    expect(result.isZeroTreeLocked).toBe(true);
    expect(result.totalPlotDryBiomassMetricTons).toBe(0);
    expect(result.annualPlotCo2eMetricTons).toBe(0);
    expect(result.tenYearPlotCo2eMetricTons).toBe(0);
    expect(result.carbonCreditValuationInr).toBe(0);
    expect(result.carbonCreditValuationUsd).toBe(0);
  });

  it("enforces Zero-Tree Lock in carbonLedger and assigns GE-BASELINE- prefix", () => {
    const ledger = calculateCarbonLedgerMetrics({
      projectId: "proj-zero-census",
      projectName: "Nashik Dryland Plantation",
      organizationName: "Sahyadri Agro",
      targetTrees: 500,
      acres: 3.0,
      speciesList: ["Neem", "Karanj"],
      plantationDate: "2025-01-01",
      survivalRatePercent: 0,
    });

    expect(ledger.isZeroTreeLocked).toBe(true);
    expect(ledger.totalLivingTrees).toBe(0);
    expect(ledger.totalBiomassMetricTons).toBe(0);
    expect(ledger.co2SequesteredToDateMT).toBe(0);
    expect(ledger.estimatedCarbonValuationInr).toBe(0);
    expect(ledger.serialNumber).toMatch(/^GE-BASELINE-/);
    expect(ledger.verificationMethodology).toContain("Pre-Planting Baseline");
  });
});

describe("Cryptographic Certificate SHA-256 Digest Engine", () => {
  it("generates a genuine 64-character hex SHA-256 digest for carbon certificates", () => {
    const ledger = calculateCarbonLedgerMetrics({
      projectId: "proj-crypto-verify",
      projectName: "Pune Watershed Project",
      organizationName: "Western Ghats Foundation",
      targetTrees: 300,
      acres: 2.0,
      speciesList: ["Teak", "Jamun"],
      plantationDate: "2024-06-01",
      survivalRatePercent: 85,
    });

    expect(ledger.cryptographicHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("exhibits cryptographic avalanche effect: altering 1 parameter completely mutates the SHA-256 hash", () => {
    const certA = calculateCarbonLedgerMetrics({
      projectId: "proj-avalanche-test",
      projectName: "Konkan Agro",
      organizationName: "Konkan FPO",
      targetTrees: 200,
      acres: 1.5,
      speciesList: ["Mango"],
      plantationDate: "2024-01-01",
      survivalRatePercent: 80, // 160 trees
    });

    const certB = calculateCarbonLedgerMetrics({
      projectId: "proj-avalanche-test",
      projectName: "Konkan Agro",
      organizationName: "Konkan FPO",
      targetTrees: 200,
      acres: 1.5,
      speciesList: ["Mango"],
      plantationDate: "2024-01-01",
      survivalRatePercent: 81, // 162 trees (different)
    });

    expect(certA.cryptographicHash).not.toBe(certB.cryptographicHash);
  });

  it("guarantees deterministic idempotency: identical parameters produce identical SHA-256 hash", () => {
    const cert1 = calculateCarbonLedgerMetrics({
      projectId: "proj-idempotent",
      projectName: "Baramati Pilot",
      organizationName: "KVK Baramati",
      targetTrees: 100,
      acres: 1.0,
      speciesList: ["Neem"],
      plantationDate: "2024-03-15",
      survivalRatePercent: 90,
    });

    const cert2 = calculateCarbonLedgerMetrics({
      projectId: "proj-idempotent",
      projectName: "Baramati Pilot",
      organizationName: "KVK Baramati",
      targetTrees: 100,
      acres: 1.0,
      speciesList: ["Neem"],
      plantationDate: "2024-03-15",
      survivalRatePercent: 90,
    });

    expect(cert1.cryptographicHash).toBe(cert2.cryptographicHash);
  });
});

describe("Multi-Source MRV 3-Tier Fusion Trust Engine", () => {
  it("computes 3-Tier MRV fusion score and signs with genuine SHA-256 seal", () => {
    const tier1 = evaluateTier1GroundEvidence({
      totalPlantedTrees: 1000,
      verifiedGroundTrees: 900,
      hasInitial3Photos: true,
      aiBotanicalConfidence: 92,
      exifGpsValid: true,
      growthCheckinsCount: 3,
      hasDroneOrthomosaic: true,
    });

    const tier2 = evaluateTier2SatelliteSpectral({
      plotAreaAcres: 5.0,
      currentMeanNdvi: 0.74,
      baselineNdvi: 0.65,
      overpassCount: 8,
      baselineExistingTrees: 0,
      targetNewTrees: 1000,
    });

    const tier3 = evaluateTier3FusionTrustScore({
      tier1,
      tier2,
      fieldScoutRangerAuditsCount: 55, // > 50 (5% of 1000)
      totalPlantedTrees: 1000,
      projectId: "proj-fusion-gold",
    });

    expect(tier1.isPassed).toBe(true);
    expect(tier2.isPassed).toBe(true);
    expect(tier3.fivePercentAuditSatisfied).toBe(true);
    expect(tier3.overallTrustScore).toBeGreaterThanOrEqual(80);
    expect(tier3.verificationTier).toBe("zero_greenwashing_gold");
    expect(tier3.isEligibleForCarbonCredits).toBe(true);
    expect(tier3.cryptographicSeal.hashDigest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(tier3.cryptographicSeal.serialNumber).toMatch(/^GE-MRV-2026-[0-9A-F]{8}$/);
  });

  it("penalizes trust score when 5% randomized field ranger audit requirement is not satisfied", () => {
    const tier1 = evaluateTier1GroundEvidence({
      totalPlantedTrees: 1000,
      verifiedGroundTrees: 900,
      hasInitial3Photos: true,
      aiBotanicalConfidence: 92,
      exifGpsValid: true,
      growthCheckinsCount: 3,
      hasDroneOrthomosaic: true,
    });

    const tier2 = evaluateTier2SatelliteSpectral({
      plotAreaAcres: 5.0,
      currentMeanNdvi: 0.74,
      baselineNdvi: 0.65,
      overpassCount: 8,
      baselineExistingTrees: 0,
      targetNewTrees: 1000,
    });

    // Only 10 trees audited out of 50 required (5% of 1000)
    const tier3Unaudited = evaluateTier3FusionTrustScore({
      tier1,
      tier2,
      fieldScoutRangerAuditsCount: 10,
      totalPlantedTrees: 1000,
      projectId: "proj-fusion-pending-audit",
    });

    expect(tier3Unaudited.fivePercentAuditSatisfied).toBe(false);
    expect(tier3Unaudited.requiredAuditTreesCount).toBe(50);
    expect(tier3Unaudited.actualAuditTreesCount).toBe(10);
    // Cannot achieve Gold tier without fulfilling 5% spot check
    expect(tier3Unaudited.verificationTier).not.toBe("zero_greenwashing_gold");
    expect(tier3Unaudited.isEligibleForCarbonCredits).toBe(false);
  });
});

describe("Native Maharashtra Botanical Profiles Catalog Coverage", () => {
  it("contains all 14 Maharashtra native species with scientifically vetted wood densities", () => {
    const expectedSpecies = [
      "neem",
      "teak",
      "banyan",
      "peepal",
      "jamun",
      "karanj",
      "mahua",
      "amla",
      "tamarind",
      "shisham",
      "bamboo",
      "mango",
      "sandalwood",
      "mixed_native",
    ];

    expectedSpecies.forEach((sp) => {
      expect(IPCC_SPECIES_PROFILES[sp]).toBeDefined();
      expect(IPCC_SPECIES_PROFILES[sp].woodDensityRho).toBeGreaterThan(0.4);
      expect(IPCC_SPECIES_PROFILES[sp].woodDensityRho).toBeLessThan(1.2);
      expect(IPCC_SPECIES_PROFILES[sp].carbonFraction).toBeGreaterThanOrEqual(0.46);
      expect(IPCC_SPECIES_PROFILES[sp].rootToShootRatio).toBeGreaterThanOrEqual(0.2);
    });
  });
});
