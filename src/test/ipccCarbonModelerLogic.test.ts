import { describe, it, expect } from "vitest";
import {
  determineGrowthStage,
  calculateIpccCarbonModel,
  IPCC_SPECIES_PROFILES,
} from "../lib/ipccCarbonModeler";

describe("IPCC Tier-2 Carbon Credit & Allometric Modeler Engine", () => {
  describe("1. Growth Stage Phenology Classification", () => {
    it("correctly classifies sapling establishment phase (0 - 2 years)", () => {
      const stage0 = determineGrowthStage(0.5);
      expect(stage0.stage).toBe("sapling_establishment");
      expect(stage0.ageRangeYears).toBe("0 - 2 Years");
      expect(stage0.mortalityVulnerability).toBe("high");
      expect(stage0.annualCo2PerTreeKg).toBe(6.5);

      const stage2 = determineGrowthStage(2.0);
      expect(stage2.stage).toBe("sapling_establishment");
    });

    it("correctly classifies young vegetative growth phase (3 - 5 years)", () => {
      const stage3 = determineGrowthStage(3.0);
      expect(stage3.stage).toBe("young_vegetative");
      expect(stage3.ageRangeYears).toBe("3 - 5 Years");
      expect(stage3.mortalityVulnerability).toBe("medium");
      expect(stage3.annualCo2PerTreeKg).toBe(16.0);
    });

    it("correctly classifies maturing agroforestry stand (6 - 10 years)", () => {
      const stage8 = determineGrowthStage(8.0);
      expect(stage8.stage).toBe("maturing_stand");
      expect(stage8.ageRangeYears).toBe("6 - 10 Years");
      expect(stage8.mortalityVulnerability).toBe("low");
      expect(stage8.annualCo2PerTreeKg).toBe(26.5);
    });

    it("correctly classifies mature keystone climax canopy (10+ years)", () => {
      const stage15 = determineGrowthStage(15.0);
      expect(stage15.stage).toBe("mature_climax");
      expect(stage15.ageRangeYears).toBe("10+ Years");
      expect(stage15.mortalityVulnerability).toBe("minimal");
      expect(stage15.annualCo2PerTreeKg).toBe(32.0);
    });
  });

  describe("2. Chave et al. (2014) Pantropical Biomass Model & Sequestration", () => {
    it("computes biomass, root-to-shoot ratio, carbon fraction, and CO2 stoichiometric conversion", () => {
      const result = calculateIpccCarbonModel({
        plantedTrees: 1000,
        survivalRatePct: 90,
        ageYears: 3.0,
        speciesKey: "neem",
        permanenceBufferPct: 12,
        creditPriceUsdPerTon: 15,
      });

      expect(result.plantedTrees).toBe(1000);
      expect(result.survivalRatePct).toBe(90);
      expect(result.verifiedLivingTrees).toBe(900); // 1000 * 90%
      expect(result.standAgeYears).toBe(3.0);
      expect(result.currentGrowthStage.stage).toBe("young_vegetative");
      expect(result.speciesProfile.speciesKey).toBe("neem");

      // Verify allometric biomass equations
      expect(result.currentDbhCm).toBeGreaterThan(0);
      expect(result.currentHeightM).toBeGreaterThan(0);
      expect(result.aboveGroundBiomassKgPerTree).toBeGreaterThan(0);
      expect(result.belowGroundBiomassKgPerTree).toBeCloseTo(
        result.aboveGroundBiomassKgPerTree * result.speciesProfile.rootToShootRatio,
        0
      );
      expect(result.totalBiomassKgPerTree).toBeCloseTo(
        result.aboveGroundBiomassKgPerTree + result.belowGroundBiomassKgPerTree,
        0
      );
      expect(result.carbonStoredKgPerTree).toBeCloseTo(
        result.totalBiomassKgPerTree * result.speciesProfile.carbonFraction,
        0
      );
      expect(result.co2eKgPerTree).toBeCloseTo(
        result.carbonStoredKgPerTree * 3.667,
        0
      );
    });

    it("verifies Verra VM0047 permanence buffer deduction on net certified credits", () => {
      const result = calculateIpccCarbonModel({
        plantedTrees: 5000,
        survivalRatePct: 95,
        ageYears: 5.0,
        speciesKey: "teak",
        permanenceBufferPct: 15, // 15% buffer
      });

      expect(result.verifiedLivingTrees).toBe(4750);
      expect(result.permanenceBufferPct).toBe(15);
      expect(result.permanenceBufferMT).toBeGreaterThan(0);
      expect(result.annualNetCertifiedCreditsMT).toBeLessThan(result.annualGrossPlotCo2eMT);
      expect(result.tenYearNetCertifiedCreditsMT).toBeGreaterThan(result.annualNetCertifiedCreditsMT);
      expect(result.twentyYearNetCertifiedCreditsMT).toBeGreaterThan(result.tenYearNetCertifiedCreditsMT);
    });

    it("evaluates multiple species profiles with unique wood densities and growth rates", () => {
      const neemRes = calculateIpccCarbonModel({ plantedTrees: 1000, ageYears: 4, speciesKey: "neem" });
      const banyanRes = calculateIpccCarbonModel({ plantedTrees: 1000, ageYears: 4, speciesKey: "banyan" });
      const bambooRes = calculateIpccCarbonModel({ plantedTrees: 1000, ageYears: 4, speciesKey: "bamboo" });
      const mixedRes = calculateIpccCarbonModel({ plantedTrees: 1000, ageYears: 4, speciesKey: "mixed_native" });

      expect(neemRes.speciesProfile.woodDensityRho).toBe(0.72);
      expect(banyanRes.speciesProfile.woodDensityRho).toBe(0.58);
      expect(bambooRes.speciesProfile.woodDensityRho).toBe(0.70);
      expect(mixedRes.speciesProfile.woodDensityRho).toBe(0.67);

      expect(neemRes.totalPlotBiomassMT).toBeGreaterThan(0);
      expect(banyanRes.totalPlotBiomassMT).toBeGreaterThan(0);
      expect(bambooRes.totalPlotBiomassMT).toBeGreaterThan(0);
      expect(mixedRes.totalPlotBiomassMT).toBeGreaterThan(0);
    });

    it("generates complete 20-year chronological projections with financial valuations", () => {
      const result = calculateIpccCarbonModel({
        plantedTrees: 1000,
        survivalRatePct: 92,
        speciesKey: "mixed_native",
        creditPriceUsdPerTon: 20,
      });

      expect(result.projections20Years).toHaveLength(20);
      expect(result.projections20Years[0].year).toBe(1);
      expect(result.projections20Years[19].year).toBe(20);

      // Verify year-on-year cumulative accumulation
      for (let i = 1; i < 20; i++) {
        expect(result.projections20Years[i].cumulativeNetCreditsMT).toBeGreaterThanOrEqual(
          result.projections20Years[i - 1].cumulativeNetCreditsMT
        );
        expect(result.projections20Years[i].cumulativeCo2ePerTreeKg).toBeGreaterThan(
          result.projections20Years[i - 1].cumulativeCo2ePerTreeKg
        );
      }

      // Check valuation calculations
      expect(result.annualValuationUsd).toBeGreaterThan(0);
      expect(result.annualValuationInr).toBe(result.annualValuationUsd * 86);
      expect(result.tenYearValuationInr).toBeGreaterThan(result.annualValuationInr);
      expect(result.methodologyStandard).toContain("IPCC Tier-2 Allometric Model");
      expect(result.esgBrsrClassification).toContain("SEBI BRSR Core Principal 6");
    });
  });
});
