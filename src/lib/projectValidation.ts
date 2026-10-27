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

/**
 * Advanced Anti-Gibberish & Keyboard Smash Detector
 * Inspects character diversity, repeating cyclical loops, adjacent keyboard clusters,
 * consonant/vowel balance, and prohibited test keywords.
 */
export function detectGibberishText(
  text: string,
  fieldName = "Field"
): { isValid: boolean; error?: string } {
  const trimmed = (text || "").trim();
  if (trimmed.length < 3) {
    return { isValid: false, error: `${fieldName} is too short (minimum 3 characters required).` };
  }

  const lower = trimmed.toLowerCase();

  // 1. Prohibited test / mock keywords
  const blockedKeywords = [
    "test", "demo", "dummy", "mock", "fake", "sample", "temp", "foo", "bar", "baz", "asdf", "qwerty", "tempdemo"
  ];
  for (const kw of blockedKeywords) {
    if (
      lower === kw ||
      lower.startsWith(kw + " ") ||
      lower.endsWith(" " + kw) ||
      lower.includes(" " + kw + " ") ||
      lower.startsWith(kw + "_") ||
      lower.startsWith(kw + "-")
    ) {
      return {
        isValid: false,
        error: `${fieldName} contains testing keyword "${kw}". Synthetic test projects are strictly prohibited on the live registry.`,
      };
    }
  }

  // 2. Reject pure digits or pure symbols
  if (/^[0-9\s\-_.,]+$/.test(trimmed)) {
    return { isValid: false, error: `${fieldName} cannot consist solely of numbers or punctuation.` };
  }

  // 3. Known keyboard row smash patterns (horizontal, reverse, vertical, or 4+ repeated chars)
  const smashPatterns = [
    /asdf/i, /sdfg/i, /dfgh/i, /fghj/i, /ghjk/i, /hjkl/i,
    /qwer/i, /wert/i, /erty/i, /rtyu/i, /tyui/i, /yuio/i, /uiop/i,
    /zxcv/i, /xcvb/i, /cvbn/i, /vbnm/i,
    /lkjh/i, /kjhg/i, /jhgf/i, /hgfd/i, /gfds/i, /fdsa/i,
    /poiuy/i, /oiuyt/i, /iuytr/i, /uytre/i, /ytrew/i, /trewq/i,
    /(.)\1{3,}/, // 4+ repeated identical characters (aaaa, xxxx, 1111)
    /[bcdfghjklmnpqrstvwxyz]{6,}/i, // 6+ consecutive consonants without a vowel
    /[aeiou]{5,}/i, // 5+ consecutive vowels without a consonant
  ];
  for (const pat of smashPatterns) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        error: `${fieldName} contains unnatural keyboard-smash characters or repetitive sequences.`,
      };
    }
  }

  // 4. Repeating cyclical loops (e.g. "dwedwedw", "abcabcabc", "xyxyxy")
  for (let cycleLen = 2; cycleLen <= Math.floor(lower.length / 2); cycleLen++) {
    const cycle = lower.slice(0, cycleLen);
    let repetitions = 0;
    for (let i = 0; i <= lower.length - cycleLen; i += cycleLen) {
      if (lower.slice(i, i + cycleLen) === cycle) {
        repetitions++;
      } else {
        break;
      }
    }
    const coveredRatio = (repetitions * cycleLen) / lower.length;
    if (repetitions >= 2 && coveredRatio >= 0.7) {
      return {
        isValid: false,
        error: `${fieldName} contains a repeating cyclical pattern ("${cycle}"). Please provide a meaningful, authentic title.`,
      };
    }
  }

  // 5. Keyboard quadrant mashing (e.g. "dwedwedw", "ddefdewfwf" using only adjacent left-hand keys)
  const words = lower.split(/\s+/).filter(Boolean);
  const leftHandCluster = new Set(["q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"]);
  const validLeftHandWords = new Set(["raw", "safe", "fade", "draw", "ward", "card", "dare", "wave", "crew", "acre", "weed", "reed", "deer"]);

  for (const w of words) {
    if (w.length >= 6) {
      const uniqueChars = new Set(w.split(""));
      // Abnormally low diversity for 6+ letters
      if (uniqueChars.size <= 3) {
        return {
          isValid: false,
          error: `Word "${w}" in ${fieldName} lacks character diversity and appears to be random typing.`,
        };
      }
      // Single keyboard quadrant cluster mashing
      const isAllLeftCluster = Array.from(uniqueChars).every((c) => leftHandCluster.has(c));
      if (isAllLeftCluster && uniqueChars.size <= 4 && !Array.from(validLeftHandWords).some((v) => w.includes(v))) {
        return {
          isValid: false,
          error: `Word "${w}" in ${fieldName} consists of keyboard-mashing characters.`,
        };
      }
    }
  }

  // 6. Natural English / Romanized Indian language consonant-to-vowel ratio
  const lettersOnly = lower.replace(/[^a-z]/g, "");
  if (lettersOnly.length >= 5) {
    const vowels = (lettersOnly.match(/[aeiouy]/g) || []).length;
    const vowelRatio = vowels / lettersOnly.length;
    if (vowelRatio < 0.15 || vowelRatio > 0.85) {
      return {
        isValid: false,
        error: `${fieldName} has an unnatural phonetic structure (insufficient or excessive vowels).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates terrestrial coordinates for India / Maharashtra operational domain
 */
export function validateTerrestrialCoordinates(lat: number, lng: number): {
  isValid: boolean;
  error?: string;
  isPrimaryRegion: boolean;
  warning?: string;
} {
  // Reject Null Island (0, 0)
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) {
    return {
      isValid: false,
      error: "Coordinates (0, 0) located at Null Island in the Atlantic Ocean are strictly rejected.",
      isPrimaryRegion: false,
    };
  }

  // Absolute coordinate boundaries
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      isValid: false,
      error: `Invalid geodetic coordinates (${lat}, ${lng}).`,
      isPrimaryRegion: false,
    };
  }

  // Reject ocean coordinates south of India (lat < 6.0 in Indian Ocean)
  if (lat < 6.0 && lng >= 60 && lng <= 100) {
    return {
      isValid: false,
      error: `Coordinates (${lat}, ${lng}) fall in the Indian Ocean. Plantations must be located on verified terrestrial land.`,
      isPrimaryRegion: false,
    };
  }

  // Check if within India bounding box (approx 6°N - 37.5°N, 68°E - 97.5°E)
  const isIndia = lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0;
  if (!isIndia) {
    return {
      isValid: false,
      error: `Coordinates (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E) fall outside India's sovereign terrestrial territory.`,
      isPrimaryRegion: false,
    };
  }

  // Check if within primary operational zone (Maharashtra: approx 15.6°N - 22.2°N, 72.5°E - 81.0°E)
  const isMaharashtra = lat >= 15.6 && lat <= 22.2 && lng >= 72.5 && lng <= 81.0;

  return {
    isValid: true,
    isPrimaryRegion: isMaharashtra,
    warning: !isMaharashtra
      ? `Notice: Coordinates fall outside Maharashtra (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E). Satellite pass latency may vary.`
      : undefined,
  };
}

// Zod Schema for strict Project Creation inputs
export const projectInputSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(3, "Project name must be at least 3 characters long")
    .max(120, "Project name cannot exceed 120 characters")
    .regex(/^[^<>]+$/, "Project name cannot contain HTML or angle brackets")
    .refine((val) => detectGibberishText(val, "Project name").isValid, (val) => ({
      message: detectGibberishText(val, "Project name").error || "Invalid project name",
    })),
  organization_id: z.string().uuid("Invalid organization ID format").nullable().optional(),
  target_trees: z
    .number({ required_error: "Target trees count is required" })
    .int("Target trees must be an integer")
    .min(10, "Target trees must be at least 10 saplings for an agroforestry/plantation project")
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
  location_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine(
      (val) => !val || detectGibberishText(val, "Location name").isValid,
      (val) => ({ message: detectGibberishText(val || "", "Location name").error || "Invalid location name" })
    ),
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

  const centroidLat = sumLat / normalized.length;
  const centroidLng = sumLng / normalized.length;
  const terrCheck = validateTerrestrialCoordinates(centroidLat, centroidLng);
  if (!terrCheck.isValid) {
    errors.push(terrCheck.error || "Boundary centroid falls outside verified terrestrial boundaries.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    centroid: [centroidLat, centroidLng],
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

  // 3. Geographic & Terrestrial Land Sanity Check
  if (centroidLat !== null && centroidLng !== null) {
    const terrCheck = validateTerrestrialCoordinates(centroidLat, centroidLng);
    if (!terrCheck.isValid) {
      errors.push(terrCheck.error || "Coordinates fail terrestrial land sanity check.");
    } else if (terrCheck.warning) {
      warnings.push(terrCheck.warning);
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
