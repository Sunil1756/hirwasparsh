import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  satelliteVegetationIndicatorsService,
  SatelliteVegetationIndicatorsService,
} from "../services/satelliteVegetationIndicatorsService";
import { MultiSpectralBands } from "../lib/geospatialSatelliteService";

describe("PHASE 10 TASK 57 — Satellite Vegetation Indicators & Multi-Spectral Biometric Suite", () => {
  let service: SatelliteVegetationIndicatorsService;

  beforeEach(() => {
    service = new SatelliteVegetationIndicatorsService();
  });

  describe("1. Multi-Spectral Indices Calculation (NDVI, EVI, SAVI, NDRE, MSAVI2, NDWI, NDMI)", () => {
    it("computes accurate vegetation indices for healthy dense agroforest canopy", () => {
      const denseCanopyBands: MultiSpectralBands = {
        b02Blue: 0.025,
        b03Green: 0.055,
        b04Red: 0.035,
        b05RedEdge: 0.18,
        b08Nir: 0.65,
        b11Swir: 0.12,
      };

      const indices = service.calculateVegetationIndices(denseCanopyBands);

      // Expected NDVI = (0.65 - 0.035) / (0.65 + 0.035) = 0.615 / 0.685 ≈ 0.898
      expect(indices.ndvi).toBeGreaterThan(0.8);
      expect(indices.ndvi).toBeLessThanOrEqual(1.0);

      // Expected EVI = 2.5 * (0.65 - 0.035) / (0.65 + 6.0*0.035 - 7.5*0.025 + 1.0)
      expect(indices.evi).toBeGreaterThan(0.5);
      expect(indices.evi).toBeLessThanOrEqual(1.0);

      // SAVI (L=0.5)
      expect(indices.savi).toBeGreaterThan(0.6);

      // NDRE = (0.65 - 0.18) / (0.65 + 0.18) = 0.47 / 0.83 ≈ 0.566
      expect(indices.ndre).toBeGreaterThan(0.5);

      // MSAVI2
      expect(indices.msavi2).toBeGreaterThan(0.6);

      // NDWI Water (Green - NIR) / (Green + NIR) should be negative for healthy vegetation
      expect(indices.ndwiWater).toBeLessThan(0);

      // NDMI Moisture (NIR - SWIR) / (NIR + SWIR) = (0.65 - 0.12) / 0.77 ≈ 0.688
      expect(indices.ndmiMoisture).toBeGreaterThan(0.5);
    });

    it("computes accurate vegetation indices for barren / dry soil terrain", () => {
      const barrenSoilBands: MultiSpectralBands = {
        b02Blue: 0.12,
        b03Green: 0.18,
        b04Red: 0.24,
        b05RedEdge: 0.26,
        b08Nir: 0.28,
        b11Swir: 0.32,
      };

      const indices = service.calculateVegetationIndices(barrenSoilBands);

      // NDVI = (0.28 - 0.24) / (0.28 + 0.24) = 0.04 / 0.52 ≈ 0.077
      expect(indices.ndvi).toBeLessThan(0.15);
      expect(indices.evi).toBeLessThan(0.2);
      expect(indices.savi).toBeLessThan(0.15);
      expect(indices.ndre).toBeLessThan(0.1);
    });
  });

  describe("2. Vegetation Change & Disturbance Tracking (ΔNDVI, VCI, Degradation vs Regrowth)", () => {
    it("detects high canopy regrowth when current NDVI significantly exceeds baseline", () => {
      const assessment = service.evaluateVegetationChange(0.72, 0.42, 0.2, 0.8);

      expect(assessment.deltaNdvi).toBe(0.3);
      expect(assessment.relativeChangePct).toBe(71.4);
      expect(assessment.changeClassification).toBe("high_regrowth");
      expect(assessment.isPositiveGrowth).toBe(true);
      expect(assessment.isDegradationAlert).toBe(false);
      expect(assessment.vegetationConditionIndex).toBeGreaterThan(80);
      expect(assessment.biomassDeltaTonsPerHa).toBeGreaterThan(0);
    });

    it("triggers degradation alert when current NDVI shows severe loss", () => {
      const assessment = service.evaluateVegetationChange(0.25, 0.55, 0.2, 0.8);

      expect(assessment.deltaNdvi).toBe(-0.3);
      expect(assessment.relativeChangePct).toBe(-54.5);
      expect(assessment.changeClassification).toBe("severe_degradation");
      expect(assessment.isPositiveGrowth).toBe(false);
      expect(assessment.isDegradationAlert).toBe(true);
      expect(assessment.vegetationConditionIndex).toBeLessThan(20);
      expect(assessment.biomassDeltaTonsPerHa).toBeLessThan(0);
    });

    it("evaluates stable canopy equilibrium within acceptable margin", () => {
      const assessment = service.evaluateVegetationChange(0.52, 0.5, 0.2, 0.8);

      expect(assessment.deltaNdvi).toBe(0.02);
      expect(assessment.changeClassification).toBe("stable_canopy");
      expect(assessment.isDegradationAlert).toBe(false);
    });
  });

  describe("3. Canopy & Land-Cover Indicators (FVC, LAI, AGBD, Density Zoning)", () => {
    it("evaluates dense forest classification for high NDVI and FVC", () => {
      const canopy = service.evaluateCanopyAndLandCover(0.75, 0.58, 25.0);

      expect(canopy.fractionalVegetationCoverPct).toBeGreaterThanOrEqual(70);
      expect(canopy.canopyDensityClass).toBe("dense_forest");
      expect(canopy.leafAreaIndex).toBeGreaterThan(2.0);
      expect(canopy.aboveGroundBiomassDensityTonsHa).toBeGreaterThan(80);
      expect(canopy.vegetatedAreaHa).toBeGreaterThan(17.0);
      expect(canopy.canopyChlorophyllRating).toBe("optimal");
    });

    it("evaluates open woodland / agroforestry classification for moderate canopy", () => {
      const canopy = service.evaluateCanopyAndLandCover(0.32, 0.25, 10.0);

      expect(canopy.canopyDensityClass).toBe("open_woodland");
      expect(canopy.fractionalVegetationCoverPct).toBeGreaterThanOrEqual(20);
      expect(canopy.fractionalVegetationCoverPct).toBeLessThan(40);
      expect(canopy.canopyChlorophyllRating).toBe("low");
    });
  });

  describe("4. Seasonal Phenology Trends (Kharif, Rabi, Zaid, SOS/POS/EOS, Mann-Kendall Trend)", () => {
    it("decomposes 3 phenological agroforestry seasons with proper peak during Kharif monsoon", () => {
      const phenology = service.evaluateSeasonalPhenologyTrends(0.65);

      expect(phenology.phenologicalTrajectory).toHaveLength(3);

      const kharif = phenology.phenologicalTrajectory.find((p) => p.season === "kharif_monsoon");
      const rabi = phenology.phenologicalTrajectory.find((p) => p.season === "rabi_winter");
      const zaid = phenology.phenologicalTrajectory.find((p) => p.season === "zaid_summer");

      expect(kharif).toBeDefined();
      expect(rabi).toBeDefined();
      expect(zaid).toBeDefined();

      // Kharif monsoon should have the highest NDVI
      expect(kharif!.meanNdvi).toBeGreaterThan(rabi!.meanNdvi);
      expect(rabi!.meanNdvi).toBeGreaterThan(zaid!.meanNdvi);

      // Amplitude
      expect(phenology.seasonalAmplitude).toBeGreaterThan(0);
      expect(phenology.peakOfSeasonNdvi).toBe(kharif!.peakNdvi);
      expect(phenology.annualIntegralNppProxy).toBeGreaterThan(0.4);
    });

    it("detects improving trend for high current NDVI stands", () => {
      const phenology = service.evaluateSeasonalPhenologyTrends(0.72);
      expect(phenology.mannKendallTrendDirection).toBe("improving");
      expect(phenology.trendSlopePerYear).toBeGreaterThan(0);
    });
  });

  describe("5. End-to-End Project Vegetation Indicators Generation", () => {
    it(
      "generates full project vegetation indicators package with histogram distribution and MRV digest",
      async () => {
        const result = await service.generateProjectVegetationIndicators("proj_sat_test_57");

        expect(result.projectId).toBe("proj_sat_test_57");
        expect(result.indices.ndvi).toBeGreaterThan(0);
        expect(result.vegetationChange).toBeDefined();
        expect(result.canopyCover).toBeDefined();
        expect(result.seasonalTrends).toBeDefined();

        // Histogram verification
        expect(result.pixelLevelDistribution.ndviHistogram).toHaveLength(5);
        const totalPct = result.pixelLevelDistribution.ndviHistogram.reduce(
          (acc, b) => acc + b.percentage,
          0
        );
        expect(Math.round(totalPct)).toBeCloseTo(100, 0);

        // MRV Cryptographic digest
        expect(result.mrvComplianceDigest).toContain("VERRA-VM0047-NDVI");
      },
      20000
    );
  });
});
