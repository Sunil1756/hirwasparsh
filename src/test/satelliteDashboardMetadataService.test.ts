import { describe, it, expect, beforeEach } from "vitest";
import {
  satelliteDashboardMetadataService,
  SatelliteDashboardMetadataService,
} from "../services/satelliteDashboardMetadataService";

describe("PHASE 10 TASK 59 — Satellite Dashboard Metadata & Transparency Suite", () => {
  let service: SatelliteDashboardMetadataService;
  const testProjectId = "proj_test_meta_59";

  beforeEach(() => {
    service = new SatelliteDashboardMetadataService();
  });

  describe("1. Data Source Metadata Dimension", () => {
    it("clearly identifies satellite constellation, instrument, provider, and processing level", () => {
      const meta = service.getDashboardMetadata(testProjectId);

      expect(meta.source.constellation).toContain("Copernicus Sentinel-2");
      expect(meta.source.constellation).toContain("Landsat-8/9");
      expect(meta.source.instrumentName).toContain("MSI");
      expect(meta.source.agencyProvider).toContain("European Space Agency");
      expect(meta.source.processingLevel).toContain("Level-2A");
      expect(meta.source.processingLevel).toContain("Bottom-of-Atmosphere");
      expect(meta.source.datumAndProjection).toContain("WGS 84");
      expect(meta.source.stacEndpoint).toContain("element84.com");
    });
  });

  describe("2. Acquisition Date & Temporal Cadence Dimension", () => {
    it("clearly identifies exact acquisition timestamp, MGRS Tile, orbit cycle, and sun angles", () => {
      const customDate = "2026-09-25T05:40:00.000Z";
      const meta = service.getDashboardMetadata(testProjectId, customDate, "43QDE");

      expect(meta.acquisition.acquisitionTimestampUtc).toBe(customDate);
      expect(meta.acquisition.acquisitionDateFormattedLocal).toContain("2026");
      expect(meta.acquisition.mgrsTileId).toBe("43QDE");
      expect(meta.acquisition.relativeOrbitNumber).toBe(62);
      expect(meta.acquisition.sunElevationAngleDeg).toBeGreaterThan(0);
      expect(meta.acquisition.sunAzimuthAngleDeg).toBeGreaterThan(0);
      expect(meta.acquisition.temporalRevisitCadenceDays).toBe(5);
      expect(meta.acquisition.nextScheduledOverpassDate).toBeDefined();
    });
  });

  describe("3. Multi-Resolution Specifications Dimension", () => {
    it("clearly identifies spatial, temporal, radiometric, and spectral resolution specifications", () => {
      const meta = service.getDashboardMetadata(testProjectId);

      // Spatial Resolution
      expect(meta.resolution.spatialResolution.visibleAndNirBandsMeters).toBe(10);
      expect(meta.resolution.spatialResolution.redEdgeAndSwirBandsMeters).toBe(20);
      expect(meta.resolution.spatialResolution.atmosphericBandsMeters).toBe(60);
      expect(meta.resolution.spatialResolution.minimumDetectableCanopyAreaSqm).toBe(100);

      // Temporal Resolution
      expect(meta.resolution.temporalResolution.revisitFrequencyDays).toBe(5);
      expect(meta.resolution.temporalResolution.orbitalPeriodMinutes).toBeGreaterThan(90);

      // Radiometric Resolution
      expect(meta.resolution.radiometricResolution.nativeBitDepth).toBe(12);
      expect(meta.resolution.radiometricResolution.quantizationScale).toContain("DN / 10000.0");

      // Spectral Resolution (13 bands)
      expect(meta.resolution.spectralResolution.bandsCount).toBe(13);
      expect(meta.resolution.spectralResolution.keyBandsUsed.length).toBeGreaterThanOrEqual(7);

      const b04 = meta.resolution.spectralResolution.keyBandsUsed.find((b) => b.band === "B04");
      const b08 = meta.resolution.spectralResolution.keyBandsUsed.find((b) => b.band === "B08");
      expect(b04?.name).toBe("Red");
      expect(b08?.name).toContain("NIR");
    });
  });

  describe("4. Scientific Remote Sensing Limitations & Caveats Dimension", () => {
    it("explicitly documents all 5 core remote sensing constraints with mitigations and Verra compliance", () => {
      const meta = service.getDashboardMetadata(testProjectId);

      expect(meta.limitations.length).toBe(5);

      const categories = meta.limitations.map((l) => l.category);
      expect(categories).toContain("spatial_scale");
      expect(categories).toContain("atmospheric_cloud");
      expect(categories).toContain("topographic_illumination");
      expect(categories).toContain("ndvi_saturation");
      expect(categories).toContain("sensor_harmonization");

      for (const lim of meta.limitations) {
        expect(lim.title).toBeDefined();
        expect(lim.shortWarning).toBeDefined();
        expect(lim.detailedTechnicalExplanation.length).toBeGreaterThan(50);
        expect(lim.recommendedMitigationStrategy.length).toBeGreaterThan(20);
        expect(lim.verraMrvComplianceNote).toBeDefined();
        expect(["low", "medium", "high"]).toContain(lim.severity);
      }
    });
  });

  describe("5. Master MRV Cryptographic Auditability", () => {
    it("issues a unique Verra VM0047 cryptographic metadata digest", () => {
      const meta = service.getDashboardMetadata(testProjectId);
      expect(meta.mrvComplianceDigest).toContain("VERRA-VM0047-METADATA-");
    });
  });
});
