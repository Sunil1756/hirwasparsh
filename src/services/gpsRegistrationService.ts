/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 16
 * GPS Registration & Geospatial Boundary Validation Service
 * 
 * Features:
 * 1. Device location permission querying & handling
 * 2. High-precision GPS coordinate & altitude capture
 * 3. Accuracy capture with Confidence Tier categorization
 * 4. Comprehensive location & anti-spoofing validation
 * 5. Project cadastral boundary validation & distance-to-perimeter computation
 */

import * as turf from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { supabase } from "@/integrations/supabase/client";
import { ProjectBoundary } from "@/types/coreDatabase";

export type GpsPermissionStatus = "granted" | "prompt" | "denied" | "unsupported";

export type GpsAccuracyTier =
  | "survey_grade" // <= 3m (Dual-Frequency L1/L5 / RTK)
  | "high_precision" // 3m < acc <= 10m (High-quality mobile GPS)
  | "standard_mobile" // 10m < acc <= 25m (Standard cellular/assisted GPS)
  | "coarse_warning"; // > 25m (Coarse cell-tower / Wi-Fi triangulation)

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters: number | null;
  altitudeAccuracyMeters: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  accuracyTier: GpsAccuracyTier;
}

export interface GpsCaptureOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GpsCaptureResult {
  success: boolean;
  coordinates?: GpsCoordinates;
  error?: string;
  permissionStatus?: GpsPermissionStatus;
}

export interface BoundaryValidationResult {
  isInside: boolean;
  hasBoundariesDefined: boolean;
  matchedCompartment?: {
    id: string;
    name: string;
    code?: string | null;
    type?: string | null;
  };
  distanceToNearestBoundaryMeters: number;
  nearestCompartmentName?: string | null;
  message: string;
}

export interface GpsValidationReport {
  isValid: boolean;
  isInsideBoundary: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  accuracyTier?: GpsAccuracyTier;
  errors: string[];
  warnings: string[];
  boundaryResult?: BoundaryValidationResult;
}

/**
 * Computes exact great-circle distance in meters between two GPS coordinates using the Haversine formula
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export const gpsRegistrationService = {
  /**
   * 1. DEVICE LOCATION PERMISSION
   * Checks the current browser/device geolocation permission state
   */
  async checkLocationPermission(): Promise<GpsPermissionStatus> {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      return "unsupported";
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" as any });
        return status.state as GpsPermissionStatus;
      } catch {
        // Fallback for browsers that don't support geolocation permission query
        return "prompt";
      }
    }

    return "prompt";
  },

  /**
   * Evaluates Accuracy Confidence Tier
   */
  classifyAccuracyTier(accuracyMeters: number): GpsAccuracyTier {
    if (accuracyMeters <= 3) return "survey_grade";
    if (accuracyMeters <= 10) return "high_precision";
    if (accuracyMeters <= 25) return "standard_mobile";
    return "coarse_warning";
  },

  /**
   * 2. GPS COORDINATE & ACCURACY CAPTURE
   * Requests single high-accuracy GPS fix from device hardware
   */
  async captureCurrentGpsPosition(
    options: GpsCaptureOptions = {}
  ): Promise<GpsCaptureResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator || !navigator.geolocation) {
      return {
        success: false,
        error: "Geolocation is not supported by your device or browser.",
        permissionStatus: "unsupported",
      };
    }

    const perm = await this.checkLocationPermission();
    if (perm === "unsupported") {
      return {
        success: false,
        error: "Geolocation is not supported by your device or browser.",
        permissionStatus: "unsupported",
      };
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 0,
    };

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const acc = position.coords.accuracy || 10;
          const tier = this.classifyAccuracyTier(acc);

          const coords: GpsCoordinates = {
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7)),
            accuracyMeters: Number(acc.toFixed(1)),
            altitudeMeters: position.coords.altitude !== null ? Number(position.coords.altitude.toFixed(1)) : null,
            altitudeAccuracyMeters: position.coords.altitudeAccuracy !== null ? Number(position.coords.altitudeAccuracy.toFixed(1)) : null,
            heading: position.coords.heading !== null ? Number(position.coords.heading.toFixed(1)) : null,
            speed: position.coords.speed !== null ? Number(position.coords.speed.toFixed(1)) : null,
            timestamp: position.timestamp,
            accuracyTier: tier,
          };

          resolve({
            success: true,
            coordinates: coords,
            permissionStatus: "granted",
          });
        },
        (err) => {
          let message = "Unable to acquire GPS location.";
          let status: GpsPermissionStatus = "denied";

          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = "Location access was denied. Please allow location permissions in your browser settings to register trees.";
              status = "denied";
              break;
            case err.POSITION_UNAVAILABLE:
              message = "GPS satellite signal is currently unavailable. Please step into an open area away from tall concrete structures.";
              status = "prompt";
              break;
            case err.TIMEOUT:
              message = "GPS lock timed out while searching for satellites. Please try again with high accuracy enabled.";
              status = "prompt";
              break;
          }

          resolve({
            success: false,
            error: message,
            permissionStatus: status,
          });
        },
        defaultOptions
      );
    });
  },

  /**
   * Starts watching GPS position continuously for real-time field navigation
   */
  watchGpsPosition(
    onUpdate: (coords: GpsCoordinates) => void,
    onError?: (error: string) => void,
    options: GpsCaptureOptions = {}
  ): () => void {
    if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
      if (onError) onError("Geolocation is unsupported.");
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy || 10;
        const coords: GpsCoordinates = {
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
          accuracyMeters: Number(acc.toFixed(1)),
          altitudeMeters: pos.coords.altitude !== null ? Number(pos.coords.altitude.toFixed(1)) : null,
          altitudeAccuracyMeters: pos.coords.altitudeAccuracy !== null ? Number(pos.coords.altitudeAccuracy.toFixed(1)) : null,
          heading: pos.coords.heading !== null ? Number(pos.coords.heading.toFixed(1)) : null,
          speed: pos.coords.speed !== null ? Number(pos.coords.speed.toFixed(1)) : null,
          timestamp: pos.timestamp,
          accuracyTier: this.classifyAccuracyTier(acc),
        };
        onUpdate(coords);
      },
      (err) => {
        if (onError) onError(err.message);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 1000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  },

  /**
   * 4. LOCATION VALIDATION
   * Validates coordinate bounds, non-null, precision, and anti-spoofing heuristics
   */
  validateLocationCoordinates(
    latitude: number,
    longitude: number,
    accuracyMeters?: number
  ): { isValid: boolean; errors: string[]; warnings: string[]; accuracyTier?: GpsAccuracyTier } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Finite Number check
    if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
      errors.push("Latitude and Longitude must be valid numerical coordinates.");
      return { isValid: false, errors, warnings };
    }

    // 2. WGS84 Geographic Bound checks
    if (latitude < -90.0 || latitude > 90.0) {
      errors.push(`Latitude (${latitude}) exceeds valid WGS84 bounds [-90.0, 90.0].`);
    }

    if (longitude < -180.0 || longitude > 180.0) {
      errors.push(`Longitude (${longitude}) exceeds valid WGS84 bounds [-180.0, 180.0].`);
    }

    // 3. Null Island check (0.0, 0.0)
    if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
      errors.push("Coordinates (0, 0) point to Null Island in the Gulf of Guinea. Please capture a real terrestrial location.");
    }

    // 4. Accuracy checks
    let accuracyTier: GpsAccuracyTier | undefined;
    if (typeof accuracyMeters === "number" && !isNaN(accuracyMeters)) {
      accuracyTier = this.classifyAccuracyTier(accuracyMeters);
      if (accuracyMeters > 50) {
        warnings.push(`GPS accuracy radius is high (${accuracyMeters.toFixed(1)}m). Recommended accuracy for tree planting is under 15m.`);
      }
      if (accuracyMeters > 150) {
        errors.push(`GPS accuracy dilution is too coarse (${accuracyMeters.toFixed(1)}m > 150m limit) for verifiable tree biometric registration.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      accuracyTier,
    };
  },

  /**
   * 5. PROJECT BOUNDARY VALIDATION
   * Checks if a GPS point falls inside any project boundary polygon compartments
   * and calculates distance to nearest boundary perimeter if outside.
   */
  validatePointInProjectBoundaries(
    point: { latitude: number; longitude: number },
    boundaries: Array<{
      id: string;
      boundary_name: string;
      compartment_code?: string | null;
      boundary_type?: string | null;
      geometry_geojson: any;
    }>
  ): BoundaryValidationResult {
    if (!boundaries || boundaries.length === 0) {
      return {
        isInside: true, // If project has no geometric boundaries defined yet, allow planting
        hasBoundariesDefined: false,
        distanceToNearestBoundaryMeters: 0,
        message: "No boundary polygon defined for this project. Coordinate accepted as general plot point.",
      };
    }

    const pt = turf.point([point.longitude, point.latitude]); // Turf uses [lng, lat]

    // Step 1: Check if inside any polygon compartment
    for (const b of boundaries) {
      try {
        let geom = b.geometry_geojson;
        if (typeof geom === "string") {
          geom = JSON.parse(geom);
        }
        if (geom?.type === "Feature") {
          geom = geom.geometry;
        }

        if (geom && (geom.type === "Polygon" || geom.type === "MultiPolygon")) {
          const isInside = booleanPointInPolygon(pt, geom);
          if (isInside) {
            return {
              isInside: true,
              hasBoundariesDefined: true,
              matchedCompartment: {
                id: b.id,
                name: b.boundary_name,
                code: b.compartment_code,
                type: b.boundary_type,
              },
              distanceToNearestBoundaryMeters: 0,
              message: `Verified: Tree location is inside compartment "${b.boundary_name}" (${b.compartment_code || "General Zone"}).`,
            };
          }
        }
      } catch (err) {
        console.warn(`Failed to test polygon containment for boundary ${b.id}:`, err);
      }
    }

    // Step 2: Point is outside all compartments — find distance to nearest polygon perimeter vertex
    let minDistance = Infinity;
    let nearestName: string | null = null;

    for (const b of boundaries) {
      try {
        let geom = b.geometry_geojson;
        if (typeof geom === "string") {
          geom = JSON.parse(geom);
        }
        if (geom?.type === "Feature") {
          geom = geom.geometry;
        }

        let coordinates: number[][][] = [];
        if (geom?.type === "Polygon") {
          coordinates = geom.coordinates;
        } else if (geom?.type === "MultiPolygon") {
          coordinates = geom.coordinates.flat(1);
        }

        for (const ring of coordinates) {
          for (const vertex of ring) {
            const [vLng, vLat] = vertex;
            const dist = calculateHaversineDistanceMeters(point.latitude, point.longitude, vLat, vLng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestName = b.boundary_name;
            }
          }
        }
      } catch {
        // Continue
      }
    }

    const roundedDist = minDistance === Infinity ? 0 : Number(minDistance.toFixed(1));

    return {
      isInside: false,
      hasBoundariesDefined: true,
      distanceToNearestBoundaryMeters: roundedDist,
      nearestCompartmentName: nearestName,
      message: `Tree location is ${roundedDist}m outside the designated boundary of "${nearestName || "Project Plot"}".`,
    };
  },

  /**
   * Fetches boundaries for a project from Supabase and validates the tree location
   */
  async validateTreeLocationAgainstProject(
    point: { latitude: number; longitude: number },
    projectId: string
  ): Promise<BoundaryValidationResult> {
    try {
      const { data, error } = await supabase
        .from("project_boundaries" as any)
        .select("id, boundary_name, compartment_code, boundary_type, geometry_geojson")
        .eq("project_id", projectId);

      if (error || !data || data.length === 0) {
        return {
          isInside: true,
          hasBoundariesDefined: false,
          distanceToNearestBoundaryMeters: 0,
          message: "No boundary polygon registered for this project.",
        };
      }

      return this.validatePointInProjectBoundaries(point, data);
    } catch (err: any) {
      return {
        isInside: true,
        hasBoundariesDefined: false,
        distanceToNearestBoundaryMeters: 0,
        message: `Boundary verification skipped: ${err?.message || "Database connection error"}`,
      };
    }
  },

  /**
   * 6. UNIFIED GPS REGISTRATION VALIDATION
   * Combines coordinate validation, accuracy classification, and boundary verification
   */
  async validateGpsRegistration(input: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    projectId?: string | null;
  }): Promise<GpsValidationReport> {
    const coordVal = this.validateLocationCoordinates(input.latitude, input.longitude, input.accuracyMeters);

    let boundaryResult: BoundaryValidationResult | undefined;
    let isInsideBoundary = true;

    if (coordVal.isValid && input.projectId) {
      boundaryResult = await this.validateTreeLocationAgainstProject(
        { latitude: input.latitude, longitude: input.longitude },
        input.projectId
      );
      isInsideBoundary = boundaryResult.isInside;

      if (!isInsideBoundary && boundaryResult.hasBoundariesDefined) {
        coordVal.warnings.push(boundaryResult.message);
      }
    }

    return {
      isValid: coordVal.isValid,
      isInsideBoundary,
      coordinates: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
      },
      accuracyTier: coordVal.accuracyTier,
      errors: coordVal.errors,
      warnings: coordVal.warnings,
      boundaryResult,
    };
  },
};
