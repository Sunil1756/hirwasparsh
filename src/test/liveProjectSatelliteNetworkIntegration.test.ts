import { describe, it, expect } from "vitest";
import { projectGeometrySatelliteService } from "../services/projectGeometrySatelliteService";
import { satelliteDataFetcherService } from "../services/satelliteDataFetcherService";

describe("PHASE 10 TASK 54 — Live Network Verification: Real Project Boundaries -> Live STAC & Open-Meteo APIs", () => {
  // Sahayadri Tiger Reserve Afforestation Real Coordinates in Western Ghats, Maharashtra, India
  const sahayadriPolygon = [
    [
      [18.5204, 73.8567],
      [18.5404, 73.8567],
      [18.5404, 73.8767],
      [18.5204, 73.8767],
      [18.5204, 73.8567],
    ] as [number, number][],
  ];

  it("1. LIVE NETWORK: Queries live Element84 AWS Sentinel-2 STAC API with real project bounding box", async () => {
    const bbox = projectGeometrySatelliteService.extractBoundingBoxFromRings(sahayadriPolygon);
    expect(bbox).toEqual([73.8557, 18.5194, 73.8777, 18.5414]);

    // Live query to real STAC endpoint without mocks
    const items = await satelliteDataFetcherService.querySTAC({
      bbox,
      collections: ["sentinel-2-l2a"],
      datetime: "2024-01-01T00:00:00Z/2024-06-01T23:59:59Z",
      limit: 1,
      maxCloudCoverPct: 20,
    });

    expect(items.length).toBeGreaterThan(0);
    const scene = items[0];

    // Validate real Sentinel-2 satellite metadata returned from AWS / ESA
    expect(scene.id).toMatch(/^S2[AB]_/);
    expect(scene.properties["s2:mgrs_tile"] || scene.properties["grid:code"] || scene.id).toContain("43Q");
    expect(scene.properties["eo:cloud_cover"]).toBeDefined();
    expect(scene.properties["eo:cloud_cover"]).toBeLessThanOrEqual(20);

    // Verify real AWS S3 Cloud-Optimized GeoTIFF (COG) asset URLs
    expect(scene.assets).toBeDefined();
    const hasNirAsset = Boolean(scene.assets?.nir?.href || scene.assets?.B08?.href || scene.assets?.nir08?.href);
    const hasRedAsset = Boolean(scene.assets?.red?.href || scene.assets?.B04?.href);
    expect(hasNirAsset || hasRedAsset).toBe(true);
  });

  it("2. LIVE NETWORK: Ingests real Open-Meteo Agro-Climatic telemetry for project centroid", async () => {
    const centroid = projectGeometrySatelliteService.computePolygonCentroid(sahayadriPolygon);
    expect(centroid[0]).toBeCloseTo(18.5304, 3);
    expect(centroid[1]).toBeCloseTo(73.8667, 3);

    // Live call to Open-Meteo endpoint
    const telemetry = await satelliteDataFetcherService.fetchAgroClimaticTelemetry(
      centroid[0],
      centroid[1],
      true // force live refresh, bypass cache
    );

    // Verify real meteorological and soil data returned by ECMWF/Open-Meteo
    expect(telemetry.latitude).toBeCloseTo(18.5304, 1);
    expect(telemetry.longitude).toBeCloseTo(73.8667, 1);
    expect(telemetry.elevationM).toBeGreaterThan(400); // Pune/Western Ghats elevation is > 500m
    expect(telemetry.soilMoisture0to7cmPct).toBeGreaterThan(0);
    expect(telemetry.soilMoisture28to100cmPct).toBeGreaterThan(0);
    expect(telemetry.vaporPressureDeficitKPa).toBeGreaterThan(0);
    expect(telemetry.ambientTempC).toBeGreaterThan(10);
    expect(telemetry.relativeHumidityPct).toBeGreaterThan(10);
    expect(telemetry.droughtStressScore).toBeGreaterThanOrEqual(0);
    expect(telemetry.droughtStressScore).toBeLessThanOrEqual(100);
  });

  it("3. INTEGRATION: Full end-to-end pipeline converts project boundary polygon into verified remote-sensing telemetry", async () => {
    const projectTelemetry = await projectGeometrySatelliteService.fetchProjectSatelliteTelemetry(
      "proj-sahayadri",
      { forceRefresh: true }
    );

    expect(projectTelemetry.projectId).toBe("proj-sahayadri");
    expect(projectTelemetry.totalHectares).toBeGreaterThan(0);
    expect(projectTelemetry.centroid).toBeDefined();
    expect(projectTelemetry.mgrsTilesCovered.length).toBeGreaterThan(0);

    // Spectral indices derived from live or calibrated Bottom-of-Atmosphere reflectance
    expect(projectTelemetry.overallIndices.ndvi).toBeGreaterThan(0.2);
    expect(projectTelemetry.overallIndices.ndvi).toBeLessThan(0.95);
    expect(projectTelemetry.overallIndices.ndre).toBeGreaterThan(0.1);
    expect(projectTelemetry.overallIndices.standingBiomassMTPerHa).toBeGreaterThan(10);
    expect(projectTelemetry.carbonAccrualEstimateTCO2e).toBeGreaterThan(1000);

    // Multi-plot breakdown inside the boundary polygon
    expect(projectTelemetry.plotBreakdowns.length).toBeGreaterThanOrEqual(4);
    for (const plot of projectTelemetry.plotBreakdowns) {
      expect(plot.plotId).toBeDefined();
      expect(plot.meanNdvi).toBeGreaterThan(0);
      expect(plot.areaHectares).toBeGreaterThan(0);
      expect(["optimal", "healthy", "stressed", "critical"]).toContain(plot.survivalStatus);
    }

    // Agro-weather attached
    expect(projectTelemetry.agroWeather.soilMoisture0to7cmPct).toBeGreaterThan(0);
  });
});
