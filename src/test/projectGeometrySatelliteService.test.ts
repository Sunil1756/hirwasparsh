import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  projectGeometrySatelliteService,
  ProjectGeometrySatelliteService,
  LatLngTuple,
} from "../services/projectGeometrySatelliteService";
import { projectMapService } from "../services/projectMapService";

describe("PHASE 10 TASK 54 — Project Geometry & Cadastral Boundary Remote Sensing Integration", () => {
  let service: ProjectGeometrySatelliteService;

  // Sample Polygon (Sahayadri Agroforestry Compartment)
  const sampleRings: LatLngTuple[][] = [
    [
      [18.520, 73.850],
      [18.540, 73.850],
      [18.540, 73.870],
      [18.520, 73.870],
      [18.520, 73.850],
    ],
  ];

  beforeEach(() => {
    service = new ProjectGeometrySatelliteService();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Geometry & Bounding Box Extraction
  // =========================================================================
  describe("1. Geometry & Bounding Box Extraction", () => {
    it("extracts precise metric bounding box [minLng, minLat, maxLng, maxLat] with buffer", () => {
      const bbox = service.extractBoundingBoxFromRings(sampleRings);
      const [minLng, minLat, maxLng, maxLat] = bbox;

      expect(minLng).toBeLessThanOrEqual(73.850);
      expect(maxLng).toBeGreaterThanOrEqual(73.870);
      expect(minLat).toBeLessThanOrEqual(18.520);
      expect(maxLat).toBeGreaterThanOrEqual(18.540);
    });

    it("computes accurate centroid of polygon rings", () => {
      const centroid = service.computePolygonCentroid(sampleRings);
      expect(centroid[0]).toBeCloseTo(18.530, 2);
      expect(centroid[1]).toBeCloseTo(73.860, 2);
    });

    it("converts LatLng rings into standard GeoJSON Polygon format", () => {
      const geojson = service.convertRingsToGeoJson(sampleRings);
      expect(geojson.type).toBe("Polygon");
      expect(geojson.coordinates[0][0][0]).toBe(73.850); // lng first in GeoJSON
      expect(geojson.coordinates[0][0][1]).toBe(18.520); // lat second in GeoJSON
    });
  });

  // =========================================================================
  // 2. Point-in-Polygon & Spatial Sampling
  // =========================================================================
  describe("2. Point-in-Polygon & Stratified Spatial Sampling", () => {
    it("validates whether points lie strictly inside or outside project polygon", () => {
      const insidePoint: LatLngTuple = [18.530, 73.860];
      const outsidePoint: LatLngTuple = [18.590, 73.890];

      expect(service.isPointInPolygon(insidePoint, sampleRings[0])).toBe(true);
      expect(service.isPointInPolygon(outsidePoint, sampleRings[0])).toBe(false);
    });

    it("generates internal stratified grid sample points entirely enclosed inside polygon", () => {
      const samplePoints = service.generateInternalGridSamplingPoints(sampleRings, 8);
      expect(samplePoints.length).toBeGreaterThanOrEqual(4);

      for (const pt of samplePoints) {
        expect(service.isPointInPolygon(pt, sampleRings[0])).toBe(true);
      }
    });

    it("detects Sentinel-2 MGRS grid tiles covering the bounding box", () => {
      const bbox = service.extractBoundingBoxFromRings(sampleRings);
      const tiles = service.detectIntersectingMgrsTiles(bbox);

      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0]).toMatch(/^T43Q[A-Z]{2}$/);
    });
  });

  // =========================================================================
  // 3. Project-Level Remote Sensing Telemetry
  // =========================================================================
  describe("3. Project-Level Remote Sensing Ingestion & Multi-Plot Synthesis", () => {
    it("fetches comprehensive satellite telemetry aggregated across project boundary", async () => {
      const telemetry = await service.fetchProjectSatelliteTelemetry("proj-sahayadri", {
        forceRefresh: true,
      });

      expect(telemetry.projectId).toBe("proj-sahayadri");
      expect(telemetry.totalHectares).toBeGreaterThan(0);
      expect(telemetry.bbox.length).toBe(4);
      expect(telemetry.mgrsTilesCovered.length).toBeGreaterThan(0);

      // Overall spectral indices
      expect(telemetry.overallIndices.ndvi).toBeGreaterThanOrEqual(-1.0);
      expect(telemetry.overallIndices.ndvi).toBeLessThanOrEqual(1.0);
      expect(telemetry.overallIndices.standingBiomassMTPerHa).toBeGreaterThan(0);
      expect(telemetry.carbonAccrualEstimateTCO2e).toBeGreaterThan(0);

      // Multi-plot / quadrat breakdown
      expect(telemetry.plotBreakdowns.length).toBeGreaterThanOrEqual(4);
      const firstPlot = telemetry.plotBreakdowns[0];
      expect(firstPlot.plotId).toBeDefined();
      expect(firstPlot.meanNdvi).toBeDefined();
      expect(firstPlot.areaHectares).toBeGreaterThan(0);
      expect(firstPlot.survivalStatus).toBeDefined();

      // Agro-Climatic correlation
      expect(telemetry.agroWeather).toBeDefined();
      expect(telemetry.agroWeather.soilMoisture0to7cmPct).toBeGreaterThan(0);
    }, 25000);

    it("computes 12-month historical NDVI and carbon accrual trajectory for project boundary", async () => {
      const trajectory = await service.fetchProjectNdviTrajectory("proj-sahayadri", 12);

      expect(trajectory.length).toBe(12);
      expect(trajectory[0].date).toBeDefined();
      expect(trajectory[11].date).toBeDefined();

      for (const pt of trajectory) {
        expect(pt.meanNdvi).toBeGreaterThanOrEqual(0.2);
        expect(pt.meanNdvi).toBeLessThanOrEqual(0.95);
        expect(pt.canopyCoveragePct).toBeGreaterThan(0);
        expect(pt.estimatedBiomassTCO2e).toBeGreaterThan(0);
      }
    });
  });
});
