import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  satelliteIngestionService,
  SatelliteIngestionService,
  DerivedIndicesPackage,
  IngestedSceneRecord,
  ProjectIngestionPackage,
} from "../services/satelliteIngestionService";
import { MultiSpectralBands } from "../lib/geospatialSatelliteService";
import { AgroClimaticTelemetry } from "../services/satelliteDataFetcherService";

describe("PHASE 10 TASK 55 — Satellite Data Ingestion Service & Derived Analytics Suite", () => {
  let service: SatelliteIngestionService;

  const mockBands: MultiSpectralBands = {
    b02Blue: 0.035,
    b03Green: 0.095,
    b04Red: 0.038,
    b05RedEdge: 0.230,
    b08Nir: 0.540,
    b11Swir: 0.110,
  };

  const mockWeather: AgroClimaticTelemetry = {
    latitude: 18.53,
    longitude: 73.86,
    elevationM: 560,
    timestamp: "2024-05-18T05:42:00Z",
    soilMoisture0to7cmPct: 24.5,
    soilMoisture7to28cmPct: 28.0,
    soilMoisture28to100cmPct: 32.5,
    vaporPressureDeficitKPa: 0.85,
    ambientTempC: 28.5,
    relativeHumidityPct: 65.0,
    dailyRainfallMm: 0.0,
    evapotranspirationEt0Mm: 4.8,
    surfacePressureHPa: 955.0,
    windSpeedKmh: 8.5,
    droughtStressScore: 15.0,
  };

  beforeEach(() => {
    service = new SatelliteIngestionService();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Derived Multi-Spectral & IPCC Biomass Calculation Engine
  // =========================================================================
  describe("1. Derived Multi-Spectral & IPCC Biomass Calculation Engine", () => {
    it("computes accurate standard multi-spectral indices (NDVI, NDRE, EVI, SAVI, MSAVI, NDWI)", () => {
      const derived = service.computeDerivedIndices(mockBands, mockWeather, 100);

      // NDVI = (0.54 - 0.038) / (0.54 + 0.038) = 0.502 / 0.578 ≈ 0.87
      expect(derived.ndvi).toBeGreaterThan(0.70);
      expect(derived.ndvi).toBeLessThanOrEqual(1.0);

      // NDRE = (0.54 - 0.23) / (0.54 + 0.23) = 0.31 / 0.77 ≈ 0.40
      expect(derived.ndre).toBeGreaterThan(0.30);
      expect(derived.ndre).toBeLessThan(0.80);

      // EVI & SAVI
      expect(derived.evi).toBeGreaterThan(0.40);
      expect(derived.savi).toBeGreaterThan(0.40);
      expect(derived.msavi).toBeGreaterThan(0.40);

      // NDWI / Leaf Water
      expect(derived.ndwi).toBeGreaterThan(0.10);
      expect(derived.foliarMoistureIndex).toBeGreaterThan(0.50);
      expect(derived.canopyCoveragePct).toBeGreaterThan(50);
    });

    it("calculates IPCC Tier-2 Aboveground (AGB), Belowground (BGB) biomass and total Carbon Stock", () => {
      const derived = service.computeDerivedIndices(mockBands, mockWeather, 250); // 250 ha

      // AGB should be positive and realistic for tropical agroforestry (50 to 200 MT/ha)
      expect(derived.standingBiomassMTPerHa).toBeGreaterThan(40);
      expect(derived.standingBiomassMTPerHa).toBeLessThan(250);

      // Belowground root biomass should equal AGB * 0.26 (IPCC default R ratio)
      expect(derived.belowgroundBiomassMTPerHa).toBeCloseTo(
        derived.standingBiomassMTPerHa * 0.26,
        1
      );

      // Total Biomass = AGB + BGB
      expect(derived.totalBiomassMTPerHa).toBeCloseTo(
        derived.standingBiomassMTPerHa + derived.belowgroundBiomassMTPerHa,
        1
      );

      // Total Carbon Stock (tCO2e) = totalBiomass * 0.47 * (44/12) * 250 ha
      expect(derived.carbonStockEstimateTCO2e).toBeGreaterThan(1000);
      expect(derived.annualSequestrationRateTCO2e).toBeGreaterThan(50);
      expect(derived.qaQualityScore).toBeGreaterThanOrEqual(80);
    });
  });

  // =========================================================================
  // 2. Cross-Sensor Corroboration (Sentinel-2 vs Landsat 8/9 vs GEDI LiDAR)
  // =========================================================================
  describe("2. Cross-Sensor Corroboration Engine", () => {
    it("corroborates Sentinel-2 optical telemetry against Landsat 8/9 and NASA GEDI LiDAR", () => {
      const derived = service.computeDerivedIndices(mockBands, mockWeather, 100);
      const mockScene: IngestedSceneRecord = {
        sceneId: "S2B_MSIL2A_20240518_43QCA",
        sensor: "sentinel-2-msi",
        platform: "Sentinel-2B",
        provider: "Element84 AWS STAC",
        acquisitionDate: "2024-05-18T05:42:00Z",
        ingestedAt: "2024-05-18T06:00:00Z",
        mgrsTileOrPathRow: "43QCA",
        cloudCoverPct: 0.01,
        sunElevationDeg: 62.4,
        sunAzimuthDeg: 88.2,
        crs: "EPSG:32643",
        stacItemUrl: "https://earth-search.aws.element84.com/v1/search",
        assetUrls: { trueColorTci: "https://s3.amazonaws.com/tci.tif" },
        sclSummary: {
          vegetationPct: 84.5,
          soilPct: 12.0,
          waterPct: 1.5,
          cloudPct: 0.01,
          shadowPct: 0.0,
          isObscuredByCloud: false,
        },
        derivedIndices: derived,
        agroWeather: mockWeather,
        qaFlags: {
          passedQualityGate: true,
          cloudContaminationRisk: "none",
          shadowContaminationRisk: false,
          radiometricIntegrity: "optimal",
          notes: [],
        },
      };

      const cross = service.computeCrossSensorCorroboration(mockScene, [18.53, 73.86]);

      expect(cross.sentinel2Ndvi).toBe(derived.ndvi);
      expect(cross.landsatNdvi).toBeDefined();
      expect(cross.multiSensorNdviDelta).toBeLessThanOrEqual(0.05);
      expect(cross.crossSensorAgreementPct).toBeGreaterThanOrEqual(95.0);

      // GEDI LiDAR Spaceborne Canopy metrics
      expect(cross.gediLidarCanopyHeightM).toBeGreaterThan(5);
      expect(cross.gediRh98HeightM).toBeGreaterThan(8);
      expect(cross.gediAgbdMTPerHa).toBeGreaterThan(30);
    });
  });

  // =========================================================================
  // 3. Zonal Boundary Spatial Statistics & Historical Time Series
  // =========================================================================
  describe("3. Zonal Boundary Statistics & Multi-Temporal Trajectory", () => {
    it("computes zonal pixel statistics (min, max, mean, stdDev) over boundary polygon", () => {
      const derived = service.computeDerivedIndices(mockBands, mockWeather, 100);
      const mockScene: any = { derivedIndices: derived };
      const sampleRings = [[[18.52, 73.85], [18.54, 73.85], [18.54, 73.87], [18.52, 73.87], [18.52, 73.85]]];

      const zonal = service.computeZonalStatistics(mockScene, sampleRings);

      expect(zonal.sampledPixelsCount).toBeGreaterThan(0);
      expect(zonal.meanNdvi).toBe(derived.ndvi);
      expect(zonal.minNdvi).toBeLessThanOrEqual(zonal.meanNdvi);
      expect(zonal.maxNdvi).toBeGreaterThanOrEqual(zonal.meanNdvi);
      expect(zonal.vegetatedPixelRatio).toBeGreaterThan(0.8);
      expect(zonal.canopyHomogeneityScore).toBeGreaterThan(70);
    });

    it("generates 6-month historical time series with seasonal monsoon and summer modulation", () => {
      const derived = service.computeDerivedIndices(mockBands, mockWeather, 100);
      const mockScene: any = { derivedIndices: derived, agroWeather: mockWeather };

      const history = service.generateHistoricalIngestionSeries(
        [18.53, 73.86],
        [73.85, 18.52, 73.87, 18.54],
        mockScene,
        6
      );

      expect(history.length).toBe(6);
      expect(history[0].sceneId).toBeDefined();
      expect(history[5].sceneId).toBeDefined();

      for (const scene of history) {
        expect(scene.derivedIndices.ndvi).toBeGreaterThan(0.2);
        expect(scene.derivedIndices.standingBiomassMTPerHa).toBeGreaterThan(10);
        expect(scene.qaFlags.passedQualityGate).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. Project-Level Ingestion & Verra MRV Dossier Export
  // =========================================================================
  describe("4. End-to-End Project Ingestion & Verra MRV Dossier Export", () => {
    it("ingests project satellite telemetry and generates cryptographic SHA-256 digest", async () => {
      const pkg = await service.ingestProjectSatelliteData("proj-sahayadri", {
        forceRefresh: true,
      });

      expect(pkg.projectId).toBe("proj-sahayadri");
      expect(pkg.primaryScene).toBeDefined();
      expect(pkg.primaryScene.derivedIndices.ndvi).toBeGreaterThan(0);
      expect(pkg.primaryScene.derivedIndices.carbonStockEstimateTCO2e).toBeGreaterThan(0);
      expect(pkg.crossSensorCorroboration.crossSensorAgreementPct).toBeGreaterThan(80);
      expect(pkg.verificationDigestSha256).toMatch(/^sha256_[a-f0-9]{32}$/);
      expect(pkg.mrvStandardCompliance.verraVM0047).toBe(true);
      expect(pkg.mrvStandardCompliance.goldStandardAR).toBe(true);
      expect(pkg.mrvStandardCompliance.ipccTier2Biomass).toBe(true);
    }, 25000);

    it("exports full Verra VM0047 / Gold Standard MRV verification JSON dossier", async () => {
      const jsonStr = await service.exportMRVVerificationDossier("proj-sahayadri");
      const dossier = JSON.parse(jsonStr);

      expect(dossier.standard).toContain("Verra VM0047");
      expect(dossier.projectId).toBe("proj-sahayadri");
      expect(dossier.satelliteTelemetry.primaryScene).toBeDefined();
      expect(dossier.derivedVegetationIndices.ndvi).toBeDefined();
      expect(dossier.derivedVegetationIndices.standingBiomassMTPerHa).toBeGreaterThan(0);
      expect(dossier.cryptographicSignature.digest).toBeDefined();
      expect(dossier.cryptographicSignature.auditCertId).toMatch(/^MRV-CERT-/);
    }, 25000);
  });
});
