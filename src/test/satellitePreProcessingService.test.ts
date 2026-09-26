import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  satellitePreProcessingService,
  SatellitePreProcessingService,
  SclClassificationCode,
  SpectralRasterPixel,
  PreProcessedScenePackage,
} from "../services/satellitePreProcessingService";
import { MultiSpectralBands } from "../lib/geospatialSatelliteService";

describe("PHASE 10 TASK 56 — Satellite Pre-Processing Service Test Suite", () => {
  let service: SatellitePreProcessingService;

  const mockBands: MultiSpectralBands = {
    b02Blue: 0.035,
    b03Green: 0.095,
    b04Red: 0.038,
    b05RedEdge: 0.230,
    b08Nir: 0.540,
    b11Swir: 0.110,
  };

  beforeEach(() => {
    service = new SatellitePreProcessingService();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Cloud & Shadow Masking (SCL 20m)
  // =========================================================================
  describe("1. Cloud & Shadow Masking via SCL", () => {
    it("masks out cloud shadows (SCL 3), clouds (SCL 8, 9), and cirrus (SCL 10)", () => {
      const samplePixels: SpectralRasterPixel[] = [
        { lat: 18.52, lng: 73.85, bands: mockBands, sclCode: SclClassificationCode.VEGETATION, isValid: true },
        { lat: 18.53, lng: 73.85, bands: mockBands, sclCode: SclClassificationCode.NOT_VEGETATED, isValid: true },
        { lat: 18.54, lng: 73.85, bands: mockBands, sclCode: SclClassificationCode.WATER, isValid: true },
        { lat: 18.52, lng: 73.86, bands: mockBands, sclCode: SclClassificationCode.CLOUD_SHADOWS, isValid: true },
        { lat: 18.53, lng: 73.86, bands: mockBands, sclCode: SclClassificationCode.CLOUD_MEDIUM_PROBABILITY, isValid: true },
        { lat: 18.54, lng: 73.86, bands: mockBands, sclCode: SclClassificationCode.CLOUD_HIGH_PROBABILITY, isValid: true },
        { lat: 18.52, lng: 73.87, bands: mockBands, sclCode: SclClassificationCode.THIN_CIRRUS, isValid: true },
        { lat: 18.53, lng: 73.87, bands: mockBands, sclCode: SclClassificationCode.SATURATED_OR_DEFECTIVE, isValid: true },
      ];

      const result = service.applySclCloudMask(samplePixels, 25);

      expect(result.totalPixels).toBe(8);
      expect(result.validPixels).toBe(3); // Vegetation, Not_Vegetated, Water
      expect(result.shadowPixels).toBe(1);
      expect(result.cloudPixels).toBe(2);
      expect(result.cirrusPixels).toBe(1);
      expect(result.usablePixelCoveragePct).toBe(37.5);
      expect(result.isAcceptableForMRV).toBe(false); // Below 80%
    });

    it("accepts clean scenes with >= 80% valid unclouded pixels", () => {
      const cleanPixels: SpectralRasterPixel[] = Array.from({ length: 20 }, (_, i) => ({
        lat: 18.52 + i * 0.001,
        lng: 73.85 + i * 0.001,
        bands: mockBands,
        sclCode: i === 0 ? SclClassificationCode.CLOUD_MEDIUM_PROBABILITY : SclClassificationCode.VEGETATION,
        isValid: true,
      }));

      const result = service.applySclCloudMask(cleanPixels, 20);

      expect(result.totalPixels).toBe(20);
      expect(result.validPixels).toBe(19);
      expect(result.usablePixelCoveragePct).toBe(95.0);
      expect(result.isAcceptableForMRV).toBe(true);
    });
  });

  // =========================================================================
  // 2. Phenological Seasonal Classification & Temporal Compositing
  // =========================================================================
  describe("2. Temporal Selection & Seasonal Compositing", () => {
    it("accurately classifies Indian agroforestry phenological seasons", () => {
      expect(service.classifyPhenologicalSeason("2026-07-15T00:00:00Z")).toBe("kharif_monsoon");
      expect(service.classifyPhenologicalSeason("2026-12-10T00:00:00Z")).toBe("rabi_winter");
      expect(service.classifyPhenologicalSeason("2026-04-20T00:00:00Z")).toBe("zaid_summer");
    });

    it("generates Greenest Pixel MVC composite maximizing NDVI over temporal stack", () => {
      const mockSceneA: any = {
        sceneId: "SCENE_A",
        cloudCoverPct: 5.0,
        derivedIndices: { ndvi: 0.65 },
      };
      const mockSceneB: any = {
        sceneId: "SCENE_B",
        cloudCoverPct: 2.0,
        derivedIndices: { ndvi: 0.82 },
      };

      const composite = service.synthesizeTemporalComposite([mockSceneA, mockSceneB], "greenest_pixel_mvc");

      expect(composite.selectedSceneIds.length).toBe(2);
      expect(composite.meanNdvi).toBe(0.82);
      expect(composite.compositeBands.b08Nir).toBeGreaterThan(0.5);
    });
  });

  // =========================================================================
  // 3. Vector-Raster Spatial Boundary Clipping & Setback Buffer
  // =========================================================================
  describe("3. Spatial Clipping & Edge Buffer Setback", () => {
    it("clips multi-spectral bands to project polygon and computes 10m interior setback buffer", () => {
      const sampleRings = [
        [
          [18.52, 73.85],
          [18.54, 73.85],
          [18.54, 73.87],
          [18.52, 73.87],
          [18.52, 73.85],
        ],
      ];

      const spatial = service.clipBandsToProjectBoundary("proj-sahayadri", sampleRings, 10);

      expect(spatial.projectId).toBe("proj-sahayadri");
      expect(spatial.totalBoundaryAreaHa).toBe(1250.0);
      expect(spatial.interiorAreaHa).toBeLessThan(1250.0); // Setback applied
      expect(spatial.setbackBufferMeters).toBe(10);
      expect(spatial.sampledPixelsCount).toBeGreaterThan(0);
      expect(spatial.subCompartmentBreakdown.length).toBe(4);
    });
  });

  // =========================================================================
  // 4. Radiometric Normalization & Illumination Correction
  // =========================================================================
  describe("4. Radiometric Calibration & Topographic Solar Correction", () => {
    it("scales raw BOA Digital Numbers (DN) to reflectance and applies solar zenith correction", () => {
      const rawDn = {
        B02: 1350,
        B03: 1950,
        B04: 1380,
        B05: 3300,
        B08: 6400,
        B11: 2100,
      };

      const norm = service.normalizeRadiometricData(rawDn, 62.4, "04.00");

      expect(norm.scaledSurfaceReflectance.b04Red).toBeCloseTo(0.038, 2);
      expect(norm.scaledSurfaceReflectance.b08Nir).toBeCloseTo(0.540, 2);
      expect(norm.solarZenithCosine).toBeGreaterThan(0.8);
      expect(norm.topographicallyCorrectedBands.b08Nir).toBeGreaterThan(0);
      expect(norm.harmonizedLandsatEquivalent.b08Nir).toBeDefined();
      expect(norm.calibrationQualityScore).toBe(98);
    });
  });

  // =========================================================================
  // 5. Master Pre-Processing Pipeline Execution
  // =========================================================================
  describe("5. End-to-End Pre-Processing Pipeline Execution", () => {
    it("executes the master pre-processing pipeline for project boundary and issues audit certificate", async () => {
      const pkg = await service.executePreProcessingPipeline("proj-sahayadri", {
        compositeMethod: "greenest_pixel_mvc",
        maxCloudThresholdPct: 20,
      });

      expect(pkg.projectId).toBe("proj-sahayadri");
      expect(pkg.sceneId).toBeDefined();
      expect(pkg.temporalSelection.phenologicalSeason).toBeDefined();
      expect(pkg.cloudMasking.usablePixelCoveragePct).toBeGreaterThan(80);
      expect(pkg.spatialClipping.interiorAreaHa).toBeGreaterThan(0);
      expect(pkg.radiometricNormalization.calibrationQualityScore).toBeGreaterThanOrEqual(90);
      expect(pkg.cleanIndices.ndvi).toBeGreaterThan(0.6);
      expect(pkg.preProcessingAuditCertificate.qaGatePassed).toBe(true);
      expect(pkg.preProcessingAuditCertificate.verificationDigestSha256).toMatch(/^sha256_/);
    }, 25000);
  });
});
