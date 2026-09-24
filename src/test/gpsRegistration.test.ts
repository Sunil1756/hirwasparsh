/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 16
 * GPS Registration & Geospatial Boundary Validation Test Suite
 * 
 * Acceptance:
 * 1. Device location permission checking & error handling
 * 2. High-precision GPS coordinate & altitude capture
 * 3. Accuracy capture with Confidence Tier categorization
 * 4. Location validation & anti-spoofing heuristics
 * 5. Project boundary validation with geodetic distance-to-perimeter calculation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  gpsRegistrationService,
  calculateHaversineDistanceMeters,
  GpsCoordinates,
} from "@/services/gpsRegistrationService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 4 Task 16 — GPS Registration & Boundary Validation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup global window and navigator mocks
    if (typeof global.window === "undefined") {
      // @ts-ignore
      global.window = {} as any;
    }
    // @ts-ignore
    global.navigator = {
      permissions: {
        query: vi.fn().mockResolvedValue({ state: "granted" }),
      },
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    };
  });

  // Sample Polygon: Khandala Afforestation Zone (Pune / Western Ghats)
  // Coordinates in GeoJSON [lng, lat]
  const sampleBoundaryGeoJson = {
    type: "Polygon",
    coordinates: [
      [
        [73.8500, 18.5200],
        [73.8600, 18.5200],
        [73.8600, 18.5300],
        [73.8500, 18.5300],
        [73.8500, 18.5200], // Closed ring
      ],
    ],
  };

  const sampleBoundaries = [
    {
      id: "bound-khandala-1",
      boundary_name: "Compartment A1 (Primary Planting Zone)",
      compartment_code: "COMP-A1",
      boundary_type: "planting_zone",
      geometry_geojson: sampleBoundaryGeoJson,
    },
  ];

  // =========================================================================
  // 1. DEVICE LOCATION PERMISSION & HARDWARE INTERACTION
  // =========================================================================
  describe("1. Device Location Permission Handling", () => {
    it("returns 'unsupported' when navigator.geolocation is absent", async () => {
      // @ts-ignore
      global.navigator = {};

      const perm = await gpsRegistrationService.checkLocationPermission();
      expect(perm).toBe("unsupported");
    });

    it("queries permissions API and returns granted status", async () => {
      const mockQuery = vi.fn().mockResolvedValue({ state: "granted" });
      // @ts-ignore
      global.navigator = {
        permissions: { query: mockQuery },
        geolocation: { getCurrentPosition: vi.fn(), watchPosition: vi.fn() },
      };

      const perm = await gpsRegistrationService.checkLocationPermission();
      expect(perm).toBe("granted");
      expect(mockQuery).toHaveBeenCalledWith({ name: "geolocation" });
    });
  });

  // =========================================================================
  // 2. GPS COORDINATE & ACCURACY CAPTURE
  // =========================================================================
  describe("2. GPS Coordinate & Altitude Capture", () => {
    it("captures high-precision GPS fix with accuracy, altitude and speed", async () => {
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 18.5204312,
          longitude: 73.8567421,
          accuracy: 4.2,
          altitude: 560.5,
          altitudeAccuracy: 2.0,
          heading: 180.0,
          speed: 0.5,
        },
        timestamp: Date.now(),
      };

      // @ts-ignore
      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
        watchPosition: vi.fn(),
      };

      const result = await gpsRegistrationService.captureCurrentGpsPosition();

      expect(result.success).toBe(true);
      expect(result.coordinates).toBeDefined();
      if (result.coordinates) {
        expect(result.coordinates.latitude).toBeCloseTo(18.5204312, 5);
        expect(result.coordinates.longitude).toBeCloseTo(73.8567421, 5);
        expect(result.coordinates.accuracyMeters).toBe(4.2);
        expect(result.coordinates.altitudeMeters).toBe(560.5);
        expect(result.coordinates.accuracyTier).toBe("high_precision");
      }
    });

    it("handles geolocation hardware timeout error gracefully", async () => {
      const mockError = {
        code: 3, // TIMEOUT
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "Timeout expired",
      };

      // @ts-ignore
      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success, error) => error(mockError)),
      };

      const result = await gpsRegistrationService.captureCurrentGpsPosition();

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
      expect(result.permissionStatus).toBe("prompt");
    });

    it("handles geolocation permission denied error gracefully", async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "User denied Geolocation",
      };

      // @ts-ignore
      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success, error) => error(mockError)),
      };

      const result = await gpsRegistrationService.captureCurrentGpsPosition();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Location access was denied");
      expect(result.permissionStatus).toBe("denied");
    });
  });

  // =========================================================================
  // 3. ACCURACY CONFIDENCE TIER CATEGORIZATION
  // =========================================================================
  describe("3. Accuracy Confidence Tier Categorization", () => {
    it("categorizes accuracy into appropriate tiers", () => {
      expect(gpsRegistrationService.classifyAccuracyTier(2.5)).toBe("survey_grade");
      expect(gpsRegistrationService.classifyAccuracyTier(3.0)).toBe("survey_grade");
      expect(gpsRegistrationService.classifyAccuracyTier(5.5)).toBe("high_precision");
      expect(gpsRegistrationService.classifyAccuracyTier(10.0)).toBe("high_precision");
      expect(gpsRegistrationService.classifyAccuracyTier(15.0)).toBe("standard_mobile");
      expect(gpsRegistrationService.classifyAccuracyTier(25.0)).toBe("standard_mobile");
      expect(gpsRegistrationService.classifyAccuracyTier(35.0)).toBe("coarse_warning");
      expect(gpsRegistrationService.classifyAccuracyTier(120.0)).toBe("coarse_warning");
    });
  });

  // =========================================================================
  // 4. LOCATION COORDINATE VALIDATION
  // =========================================================================
  describe("4. Location Coordinate Validation & Anti-Spoofing", () => {
    it("validates compliant WGS84 terrestrial coordinates", () => {
      const report = gpsRegistrationService.validateLocationCoordinates(18.5204, 73.8567, 8.5);
      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.accuracyTier).toBe("high_precision");
    });

    it("rejects coordinates outside valid latitude [-90, +90] bounds", () => {
      const report = gpsRegistrationService.validateLocationCoordinates(92.5, 73.8567);
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("Latitude (92.5) exceeds valid WGS84 bounds");
    });

    it("rejects coordinates outside valid longitude [-180, +180] bounds", () => {
      const report = gpsRegistrationService.validateLocationCoordinates(18.5204, -185.2);
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("Longitude (-185.2) exceeds valid WGS84 bounds");
    });

    it("detects and rejects Null Island coordinates (0.0, 0.0)", () => {
      const report = gpsRegistrationService.validateLocationCoordinates(0.0, 0.0);
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("Null Island");
    });

    it("rejects NaN and non-numeric coordinate inputs", () => {
      const report = gpsRegistrationService.validateLocationCoordinates(NaN, 73.8567);
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("valid numerical coordinates");
    });

    it("flags warning for coarse GPS accuracy over 50m and error over 150m", () => {
      const warnReport = gpsRegistrationService.validateLocationCoordinates(18.5204, 73.8567, 65.0);
      expect(warnReport.isValid).toBe(true);
      expect(warnReport.warnings.length).toBeGreaterThan(0);
      expect(warnReport.warnings[0]).toContain("GPS accuracy radius is high");

      const errReport = gpsRegistrationService.validateLocationCoordinates(18.5204, 73.8567, 180.0);
      expect(errReport.isValid).toBe(false);
      expect(errReport.errors[0]).toContain("GPS accuracy dilution is too coarse");
    });
  });

  // =========================================================================
  // 5. PROJECT BOUNDARY VALIDATION
  // =========================================================================
  describe("5. Project Boundary Validation & Distance to Perimeter", () => {
    it("confirms tree coordinate located INSIDE project boundary compartment", () => {
      // Point inside [73.8500-73.8600, 18.5200-18.5300]
      const insidePoint = { latitude: 18.5250, longitude: 73.8550 };

      const result = gpsRegistrationService.validatePointInProjectBoundaries(insidePoint, sampleBoundaries);

      expect(result.isInside).toBe(true);
      expect(result.hasBoundariesDefined).toBe(true);
      expect(result.matchedCompartment).toBeDefined();
      expect(result.matchedCompartment?.id).toBe("bound-khandala-1");
      expect(result.matchedCompartment?.code).toBe("COMP-A1");
      expect(result.distanceToNearestBoundaryMeters).toBe(0);
      expect(result.message).toContain("Verified: Tree location is inside compartment");
    });

    it("flags tree coordinate located OUTSIDE project boundary and calculates distance", () => {
      // Point outside the bounding box (approx 500m north)
      const outsidePoint = { latitude: 18.5350, longitude: 73.8550 };

      const result = gpsRegistrationService.validatePointInProjectBoundaries(outsidePoint, sampleBoundaries);

      expect(result.isInside).toBe(false);
      expect(result.hasBoundariesDefined).toBe(true);
      expect(result.distanceToNearestBoundaryMeters).toBeGreaterThan(0);
      expect(result.nearestCompartmentName).toBe("Compartment A1 (Primary Planting Zone)");
      expect(result.message).toContain("outside the designated boundary");
    });

    it("permits coordinate when project has no geometric boundaries defined yet", () => {
      const point = { latitude: 18.5250, longitude: 73.8550 };
      const result = gpsRegistrationService.validatePointInProjectBoundaries(point, []);

      expect(result.isInside).toBe(true);
      expect(result.hasBoundariesDefined).toBe(false);
      expect(result.distanceToNearestBoundaryMeters).toBe(0);
    });

    it("queries project boundaries from Supabase and validates location", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: sampleBoundaries,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const insidePoint = { latitude: 18.5250, longitude: 73.8550 };
      const result = await gpsRegistrationService.validateTreeLocationAgainstProject(insidePoint, "proj-1");

      expect(result.isInside).toBe(true);
      expect(result.matchedCompartment?.code).toBe("COMP-A1");
    });
  });

  // =========================================================================
  // 6. HAVERSINE DISTANCE COMPUTATION
  // =========================================================================
  describe("6. Geodesic Distance Computations", () => {
    it("computes accurate distance in meters between known GPS points", () => {
      // Pune (18.5204, 73.8567) to Mumbai (18.9220, 72.8347) ~116 km
      const distance = calculateHaversineDistanceMeters(18.5204, 73.8567, 18.9220, 72.8347);
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(125000);

      // Distance to self is 0m
      const selfDist = calculateHaversineDistanceMeters(18.5204, 73.8567, 18.5204, 73.8567);
      expect(selfDist).toBe(0);
    });
  });

  // =========================================================================
  // 7. UNIFIED GPS REGISTRATION REPORT
  // =========================================================================
  describe("7. Unified GPS Registration Report", () => {
    it("generates a comprehensive report combining coordinates, accuracy tier, and boundary status", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: sampleBoundaries,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const report = await gpsRegistrationService.validateGpsRegistration({
        latitude: 18.5250,
        longitude: 73.8550,
        accuracyMeters: 4.5,
        projectId: "proj-1",
      });

      expect(report.isValid).toBe(true);
      expect(report.isInsideBoundary).toBe(true);
      expect(report.accuracyTier).toBe("high_precision");
      expect(report.boundaryResult?.matchedCompartment?.code).toBe("COMP-A1");
    });
  });
});
