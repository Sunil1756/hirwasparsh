import { describe, it, expect } from "vitest";
import {
  validateGeodeticBoundary,
  isPointInsideProjectBoundary,
  LatLngPoint,
} from "../lib/projectOnboardingService";

describe("Project Onboarding & Geodetic Boundary Service", () => {
  const validPunePolygon: LatLngPoint[] = [
    [18.5204, 73.8567],
    [18.5255, 73.861],
    [18.527, 73.854],
    [18.522, 73.851],
  ];

  it("should validate a valid geodetic polygon and calculate geodesic area", () => {
    const result = validateGeodeticBoundary(validPunePolygon);
    expect(result.isValid).toBe(true);
    expect(result.hectares).toBeGreaterThan(0.05);
    expect(result.acres).toBeGreaterThan(0.1);
    expect(result.centroid[0]).toBeCloseTo(18.5237, 2);
    expect(result.centroid[1]).toBeCloseTo(73.856, 2);
    expect(result.boundingBox.length).toBe(4);
    expect(result.geoJsonPolygon.type).toBe("Polygon");
  });

  it("should reject a boundary with fewer than 3 vertices", () => {
    const invalidTwoPoints: LatLngPoint[] = [
      [18.5204, 73.8567],
      [18.5255, 73.861],
    ];
    const result = validateGeodeticBoundary(invalidTwoPoints);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("at least 3 distinct geographic coordinate vertices");
  });

  it("should reject out-of-range geodetic coordinates", () => {
    const outOfBounds: LatLngPoint[] = [
      [105.0, 73.8567], // Invalid Latitude > 90
      [18.5255, 73.861],
      [18.527, 73.854],
    ];
    const result = validateGeodeticBoundary(outOfBounds);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("invalid latitude/longitude");
  });

  it("should reject a microscopic plot smaller than 0.05 ha (500 sqm)", () => {
    // 1 meter by 1 meter box
    const tinyBox: LatLngPoint[] = [
      [18.5204, 73.8567],
      [18.520405, 73.8567],
      [18.520405, 73.856705],
      [18.5204, 73.856705],
    ];
    const result = validateGeodeticBoundary(tinyBox);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("Minimum plot size is 0.05 ha");
  });

  it("should verify point-in-polygon containment accurately", () => {
    const boundaryGeoJson = {
      type: "Polygon" as const,
      coordinates: [
        [
          [73.8567, 18.5204],
          [73.861, 18.5255],
          [73.854, 18.527],
          [73.851, 18.522],
          [73.8567, 18.5204],
        ],
      ],
    };

    const insidePoint: LatLngPoint = [18.5235, 73.856];
    const outsidePoint: LatLngPoint = [19.0, 74.0];

    expect(isPointInsideProjectBoundary(insidePoint, boundaryGeoJson)).toBe(true);
    expect(isPointInsideProjectBoundary(outsidePoint, boundaryGeoJson)).toBe(false);
  });
});
