/**
 * Green Enlightenment — Phase 1: Canonical Project Validation Engine
 * 
 * Enforces strict, server-grade validation rules for project creation,
 * boundaries, tree counts, geographic sanity, and duplicate prevention.
 * Rejects zero/negative counts, invalid coordinates, impossible dates, and malformed geometries.
 */

import { z } from "zod";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: {
    name: string;
    organization_id?: string | null;
    target_trees: number;
    project_type: string;
    location_name?: string;
    centroid_latitude?: number | null;
    centroid_longitude?: number | null;
    species_list: string[];
    start_date: string;
    end_date?: string | null;
  };
}

// Zod Schema for strict Project Creation inputs
export const projectInputSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(3, "Project name must be at least 3 characters long")
    .max(120, "Project name cannot exceed 120 characters")
    .regex(/^[^<>]+$/, "Project name cannot contain HTML or angle brackets"),
  organization_id: z.string().uuid("Invalid organization ID format").nullable().optional(),
  target_trees: z
    .number({ required_error: "Target trees count is required" })
    .int("Target trees must be an integer")
    .positive("Target trees must be greater than 0")
    .max(10_000_000, "Target trees exceeds maximum allowable limit of 10,000,000"),
  project_type: z
    .string()
    .default("reforestation")
    .refine(
      (val) =>
        [
          "reforestation",
          "afforestation",
          "agroforestry",
          "urban_greenery",
          "community",
          "corporate_csr",
          "government_reserve",
          "ngo",
          "corporate",
        ].includes(val.toLowerCase()),
      { message: "Invalid project type specified" }
    ),
  location_name: z.string().trim().max(200).optional(),
  centroid_latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .nullable()
    .optional(),
  centroid_longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .nullable()
    .optional(),
  species_list: z
    .array(z.string().trim().min(1))
    .max(100, "Species list cannot contain more than 100 species")
    .optional()
    .default([]),
  start_date: z
    .string()
    .optional()
    .refine(
      (dateStr) => {
        if (!dateStr) return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        if (year < 1900) return false;
        // Cannot be in the future by more than 1 year (365 days)
        const maxFuture = new Date();
        maxFuture.setDate(maxFuture.getDate() + 365);
        return d <= maxFuture;
      },
      { message: "Start date must be a valid date between 1900 and 1 year in the future" }
    ),
  end_date: z
    .string()
    .nullable()
    .optional(),
});

export type ValidatedProjectInput = z.infer<typeof projectInputSchema>;

/**
 * Validates coordinate array forming a closed geospatial boundary polygon
 */
export function validateBoundaryCoordinates(points: LatLng[] | [number, number][]): {
  isValid: boolean;
  errors: string[];
  centroid?: [number, number];
} {
  const errors: string[] = [];
  if (!points || points.length < 3) {
    return {
      isValid: false,
      errors: ["Boundary polygon requires at least 3 distinct geographic vertices."],
    };
  }

  // Normalize points to [lat, lng]
  const normalized: [number, number][] = points.map((p) =>
    Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]
  );

  let sumLat = 0;
  let sumLng = 0;

  for (let i = 0; i < normalized.length; i++) {
    const [lat, lng] = normalized[i];
    if (typeof lat !== "number" || isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Vertex #${i + 1} has invalid latitude: ${lat}`);
    }
    if (typeof lng !== "number" || isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(`Vertex #${i + 1} has invalid longitude: ${lng}`);
    }
    sumLat += lat;
    sumLng += lng;
  }

  // Check if all vertices are identical (degenerate point)
  const first = normalized[0];
  const allIdentical = normalized.every(
    ([lat, lng]) => Math.abs(lat - first[0]) < 1e-6 && Math.abs(lng - first[1]) < 1e-6
  );
  if (allIdentical) {
    errors.push("Degenerate boundary: all coordinates are identical points.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    centroid: [sumLat / normalized.length, sumLng / normalized.length],
  };
}

/**
 * Canonical Project Validation Function
 * Tests project creation payload against all integrity constraints.
 */
export function validateProjectCreation(input: {
  name?: string;
  organization_id?: string | null;
  target_trees?: number;
  project_type?: string;
  location_name?: string;
  centroid_latitude?: number | null;
  centroid_longitude?: number | null;
  species_list?: string[];
  start_date?: string;
  end_date?: string | null;
  boundary?: LatLng[] | [number, number][];
}): ProjectValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate Core Schema
  const parseResult = projectInputSchema.safeParse(input);
  if (!parseResult.success) {
    parseResult.error.errors.forEach((err) => {
      errors.push(`${err.path.join(".")}: ${err.message}`);
    });
    return { isValid: false, errors, warnings };
  }

  const data = parseResult.data;

  // 2. Validate Boundary if provided
  let centroidLat = data.centroid_latitude ?? null;
  let centroidLng = data.centroid_longitude ?? null;

  if (input.boundary && input.boundary.length > 0) {
    const boundaryCheck = validateBoundaryCoordinates(input.boundary);
    if (!boundaryCheck.isValid) {
      errors.push(...boundaryCheck.errors);
    } else if (boundaryCheck.centroid) {
      centroidLat = centroidLat ?? boundaryCheck.centroid[0];
      centroidLng = centroidLng ?? boundaryCheck.centroid[1];
    }
  }

  // 3. Geographic Context Warning (if coordinates outside target regions)
  if (centroidLat !== null && centroidLng !== null) {
    // Check if within India bounding box (approx 6°N - 37°N, 68°E - 98°E)
    const isIndia = centroidLat >= 6 && centroidLat <= 38 && centroidLng >= 68 && centroidLng <= 98;
    if (!isIndia) {
      warnings.push("Notice: Project coordinates appear outside primary service region (India / Maharashtra).");
    }
  }

  // 4. Biological sanity warning (e.g. 5,000 trees on less than 1 acre)
  if (data.target_trees > 2000 && (!input.boundary || input.boundary.length < 3)) {
    warnings.push("High target tree count (>2,000) specified without an attached site boundary polygon.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    sanitized: {
      name: data.name,
      organization_id: data.organization_id,
      target_trees: data.target_trees,
      project_type: data.project_type,
      location_name: data.location_name,
      centroid_latitude: centroidLat,
      centroid_longitude: centroidLng,
      species_list: data.species_list || [],
      start_date: data.start_date || new Date().toISOString().split("T")[0],
      end_date: data.end_date,
    },
  };
}

/**
 * Calculates Haversine distance in meters between two lat/lng points
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks for duplicate projects within existing project list
 * Rejects if identical normalized name exists, or if same name + within 1,000 meters.
 */
export function checkDuplicateProject(params: {
  projectName: string;
  centroidLat?: number | null;
  centroidLng?: number | null;
  existingProjects: Array<{
    id?: string;
    name?: string;
    project_name?: string;
    centroid_latitude?: number | null;
    centroid_longitude?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  currentProjectId?: string;
}): { isDuplicate: boolean; duplicateReason?: string; conflictingProjectId?: string } {
  const { projectName, centroidLat, centroidLng, existingProjects, currentProjectId } = params;
  const normalizedNewName = projectName.trim().toLowerCase();

  for (const existing of existingProjects) {
    if (existing.id && currentProjectId && existing.id === currentProjectId) {
      continue;
    }

    const existingName = (existing.name || existing.project_name || "").trim().toLowerCase();
    if (!existingName) continue;

    const existingLat = existing.centroid_latitude ?? existing.latitude ?? null;
    const existingLng = existing.centroid_longitude ?? existing.longitude ?? null;

    // Exact name match
    if (existingName === normalizedNewName) {
      // If coordinates are also within 1km or identical
      if (
        centroidLat != null &&
        centroidLng != null &&
        existingLat != null &&
        existingLng != null
      ) {
        const dist = haversineDistanceMeters(centroidLat, centroidLng, existingLat, existingLng);
        if (dist <= 1000) {
          return {
            isDuplicate: true,
            duplicateReason: `A project named "${projectName}" already exists within ${(dist / 1000).toFixed(2)} km of these coordinates.`,
            conflictingProjectId: existing.id,
          };
        }
      }
      return {
        isDuplicate: true,
        duplicateReason: `A project named "${projectName}" already exists. Please choose a distinct, descriptive name.`,
        conflictingProjectId: existing.id,
      };
    }
  }

  return { isDuplicate: false };
}
