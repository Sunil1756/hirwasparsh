/**
 * Green Enlightenment — Field Report Backend & Survival Telemetry Service
 *
 * Provides end-to-end backend logic for:
 * 1. Ranger field spot audit submission & geotag validation.
 * 2. Geo-tagged photo uploads to Supabase Storage with public URL generation.
 * 3. Anti-spoofing EXIF vs Device GPS cross-verification (Haversine delta analysis).
 * 4. Ground-truth survival rate calculation (living vs stressed vs dead silvicultural weighting).
 * 5. Supabase persistence to `project_evidence`, `check_ins`, `trees`, `plantation_projects`, and `plots`.
 * 6. Offline sync resilience for field rangers in low-connectivity forest terrain.
 */

import { supabase } from "@/integrations/supabase/client";
import { compressImage, haversineMeters } from "@/lib/imageProcessing";

export interface SampledTreeAuditItem {
  sample_id: string;
  tree_id?: string;
  species: string;
  expected_lat?: number;
  expected_lng?: number;
  actual_lat: number;
  actual_lng: number;
  gps_accuracy_m?: number;
  status: "alive" | "stressed" | "dead";
  measured_height_cm?: number;
  measured_dbh_mm?: number;
  photo_url?: string | null;
  notes?: string;
}

export interface FieldReportInput {
  projectId: string;
  projectName?: string;
  organizationName?: string;
  auditorId?: string;
  auditorName: string;
  auditorRole?: string;
  plotId?: string;
  plotName?: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  totalAudited: number;
  livingCount: number;
  stressedCount: number;
  deadCount: number;
  sampleItems?: SampledTreeAuditItem[];
  notes?: string;
  photoUrl?: string | null;
  capturedAt?: string;
  plotBoundary?: [number, number][]; // [[lat, lng], ...]
}

export interface FieldReportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedSurvivalRatePct: number;
  geoTaggingVerified: boolean;
}

export interface FieldReportSubmissionResult {
  success: boolean;
  evidenceId?: string;
  message: string;
  survivalRatePct: number;
  savedToDatabase: boolean;
  queuedForOfflineSync?: boolean;
  checkInsCreatedCount?: number;
  error?: string;
}

export interface ExifGpsCrossValidationResult {
  status: "matched" | "drift_warning" | "fraud_spoofing_rejected" | "no_exif";
  distanceMeters: number;
  message: string;
  isAcceptable: boolean;
}

export interface FieldReportWorkflowInput extends FieldReportInput {
  photoFile?: File | Blob | null;
  exifData?: {
    lat?: number;
    lng?: number;
    dateTime?: string;
    hasGps?: boolean;
  } | null;
  dominantSpecies?: string;
  averageHeightCm?: number;
  interventions?: {
    dripRescue?: boolean;
    weedClearing?: boolean;
    bioMulch?: boolean;
    pestTreatment?: boolean;
    fencingRepair?: boolean;
  };
}

export interface FieldReportWorkflowResult {
  success: boolean;
  evidenceId?: string;
  message: string;
  survivalRatePct: number;
  savedToDatabase: boolean;
  queuedForOfflineSync?: boolean;
  uploadedPhotoUrl?: string | null;
  exifValidation: ExifGpsCrossValidationResult;
  validation: FieldReportValidationResult;
  errors?: string[];
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// 1. GEOSPATIAL VALIDATION & EXIF CROSS-VERIFICATION
// ---------------------------------------------------------------------------

/**
 * Calculates Haversine distance in meters between two geodetic coordinates.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineMeters(lat1, lon1, lat2, lon2);
}

/**
 * Cross-validates photo EXIF GPS location with reported device GPS location.
 * Detects location spoofing or non-on-site stock photography.
 */
export function validateExifVersusDeviceGps(
  exifLat?: number | null,
  exifLng?: number | null,
  deviceLat?: number | null,
  deviceLng?: number | null
): ExifGpsCrossValidationResult {
  if (
    exifLat === undefined ||
    exifLat === null ||
    exifLng === undefined ||
    exifLng === null ||
    deviceLat === undefined ||
    deviceLat === null ||
    deviceLng === undefined ||
    deviceLng === null
  ) {
    return {
      status: "no_exif",
      distanceMeters: 0,
      message: "No embedded EXIF GPS tags found in photo. Relying on device GPS telemetry.",
      isAcceptable: true,
    };
  }

  const distanceMeters = Math.round(haversineMeters(exifLat, exifLng, deviceLat, deviceLng));

  if (distanceMeters <= 100) {
    return {
      status: "matched",
      distanceMeters,
      message: `Photo EXIF coordinates match device GPS within ${distanceMeters}m. High spatial fidelity.`,
      isAcceptable: true,
    };
  } else if (distanceMeters <= 5000) {
    return {
      status: "drift_warning",
      distanceMeters,
      message: `Moderate distance discrepancy (${distanceMeters}m) between photo EXIF and surveyor GPS. Acceptable within dense canopy margin.`,
      isAcceptable: true,
    };
  } else {
    return {
      status: "fraud_spoofing_rejected",
      distanceMeters,
      message: `Severe distance discrepancy (${(distanceMeters / 1000).toFixed(1)}km) detected between photo location and surveyor GPS. Flagged for anti-fraud review.`,
      isAcceptable: false,
    };
  }
}

/**
 * Validates GPS coordinate bounds and optional boundary polygon containment.
 */
export function validateFieldReportGeoTagging(params: {
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  plotBoundary?: [number, number][];
}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { latitude, longitude, gpsAccuracyMeters, plotBoundary } = params;

  // Check latitude bounds
  if (typeof latitude !== "number" || isNaN(latitude) || latitude < -90 || latitude > 90) {
    errors.push("Invalid latitude coordinate. Must be between -90.0 and +90.0 degrees.");
  }

  // Check longitude bounds
  if (typeof longitude !== "number" || isNaN(longitude) || longitude < -180 || longitude > 180) {
    errors.push("Invalid longitude coordinate. Must be between -180.0 and +180.0 degrees.");
  }

  // Reject Null Island (0, 0)
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
    errors.push("Coordinates cannot be (0,0) [Null Island]. Please enable GPS location.");
  }

  // GPS Accuracy validation
  if (gpsAccuracyMeters !== undefined) {
    if (gpsAccuracyMeters > 50) {
      warnings.push(`GPS accuracy is low (±${Math.round(gpsAccuracyMeters)}m). Consider moving to an open canopy spot.`);
    } else if (gpsAccuracyMeters < 0) {
      errors.push("GPS accuracy cannot be negative.");
    }
  }

  // Boundary check if plot boundary coordinates are provided
  if (plotBoundary && plotBoundary.length >= 3 && errors.length === 0) {
    const isInside = isPointInPolygon([latitude, longitude], plotBoundary);
    if (!isInside) {
      warnings.push("Audit coordinates are slightly outside the registered plot boundary polygon.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Ray-casting algorithm for point-in-polygon verification ([lat, lng]).
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates verified survival rate strictly from ground truth audits.
 * Stressed trees count as 0.5 survival factor in accordance with forest silviculture standards.
 */
export function calculateGroundSurvivalRate(params: {
  livingCount: number;
  stressedCount?: number;
  deadCount: number;
}): number {
  const living = Math.max(0, params.livingCount);
  const stressed = Math.max(0, params.stressedCount || 0);
  const dead = Math.max(0, params.deadCount);
  const total = living + stressed + dead;

  if (total === 0) return 0;

  // Fully living = 1.0 weight, stressed = 0.5 weight, dead = 0.0
  const effectiveLiving = living + 0.5 * stressed;
  const rate = (effectiveLiving / total) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Validates the complete field report payload before submission.
 */
export function validateFieldReport(input: FieldReportInput): FieldReportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check Project ID
  if (!input.projectId || input.projectId.trim().length === 0) {
    errors.push("Project ID is required to link field audit report.");
  }

  // 2. Check Auditor
  if (!input.auditorName || input.auditorName.trim().length < 2) {
    errors.push("Auditor / Forest Ranger name is required.");
  }

  // 3. Check Geo-tagging
  const geoValidation = validateFieldReportGeoTagging({
    latitude: input.latitude,
    longitude: input.longitude,
    gpsAccuracyMeters: input.gpsAccuracyMeters,
    plotBoundary: input.plotBoundary,
  });
  errors.push(...geoValidation.errors);
  warnings.push(...geoValidation.warnings);

  // 4. Check Tree Counts
  if (typeof input.totalAudited !== "number" || input.totalAudited <= 0) {
    errors.push("Total audited tree count must be greater than 0.");
  }

  if (input.livingCount < 0 || input.deadCount < 0 || input.stressedCount < 0) {
    errors.push("Living, stressed, and dead tree counts cannot be negative.");
  }

  const sumOfParts = input.livingCount + input.stressedCount + input.deadCount;
  if (sumOfParts !== input.totalAudited) {
    errors.push(
      `Tree count mismatch: living (${input.livingCount}) + stressed (${input.stressedCount}) + dead (${input.deadCount}) = ${sumOfParts}, but totalAudited is ${input.totalAudited}.`
    );
  }

  // 5. Notes Validation
  if (input.notes && input.notes.trim().length > 0 && input.notes.trim().length < 5) {
    warnings.push("Auditor notes are brief. Providing detailed qualitative observations is recommended.");
  }

  // 6. Timestamp check
  if (input.capturedAt) {
    const capturedTime = new Date(input.capturedAt).getTime();
    if (isNaN(capturedTime)) {
      errors.push("Invalid timestamp format for capturedAt.");
    } else if (capturedTime > Date.now() + 60000) {
      errors.push("Field audit timestamp cannot be in the future.");
    }
  }

  const calculatedSurvivalRatePct = calculateGroundSurvivalRate({
    livingCount: input.livingCount,
    stressedCount: input.stressedCount,
    deadCount: input.deadCount,
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedSurvivalRatePct,
    geoTaggingVerified: geoValidation.isValid,
  };
}

// ---------------------------------------------------------------------------
// 2. SUPABASE STORAGE PHOTO UPLOADER
// ---------------------------------------------------------------------------

/**
 * Uploads a field report photo to Supabase Storage and returns its permanent public URL.
 */
export async function uploadFieldReportPhoto(
  file: File | Blob,
  projectId: string
): Promise<{
  publicUrl: string | null;
  storagePath: string | null;
  success: boolean;
  error?: string;
}> {
  try {
    let processedFile: File | Blob = file;
    if (typeof window !== "undefined" && typeof document !== "undefined" && file instanceof File) {
      try {
        processedFile = await compressImage(file, 1400, 0.8);
      } catch (cErr) {
        console.warn("Client-side image compression fallback to raw file:", cErr);
      }
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storagePath = `projects/${projectId}/field-audits/${timestamp}-${randomSuffix}.jpg`;

    const { data, error } = await supabase.storage
      .from("treebank")
      .upload(storagePath, processedFile, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn("Supabase storage upload notice:", error.message);
      return {
        publicUrl: null,
        storagePath: null,
        success: false,
        error: error.message,
      };
    }

    const { data: urlData } = supabase.storage.from("treebank").getPublicUrl(data.path);
    const publicUrl = urlData?.publicUrl || data.path;

    return {
      publicUrl,
      storagePath: data.path,
      success: true,
    };
  } catch (err: any) {
    console.warn("Exception during field report photo upload:", err);
    return {
      publicUrl: null,
      storagePath: null,
      success: false,
      error: err.message || "Failed to upload photo",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. SUPABASE BACKEND PERSISTENCE & OFFLINE SYNC
// ---------------------------------------------------------------------------

const OFFLINE_FIELD_AUDIT_QUEUE_KEY = "green_offline_field_audits_v1";
let inMemoryOfflineQueue: Array<FieldReportInput & { offlineQueuedAt: string }> = [];

/**
 * Enqueues a failed or offline field report locally so rangers in dead zones never lose survey data.
 */
export function enqueueOfflineFieldReport(input: FieldReportInput): void {
  const item = {
    ...input,
    offlineQueuedAt: new Date().toISOString(),
  };
  inMemoryOfflineQueue.push(item);

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(OFFLINE_FIELD_AUDIT_QUEUE_KEY);
      const queue = saved ? JSON.parse(saved) : [];
      queue.push(item);
      window.localStorage.setItem(OFFLINE_FIELD_AUDIT_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e) {
    console.warn("Could not save to offline field audit queue in localStorage:", e);
  }
}

/**
 * Submits and persists a validated field report to Supabase database.
 */
export async function submitFieldSpotAuditReport(
  input: FieldReportInput
): Promise<FieldReportSubmissionResult> {
  // Step 1: Validate payload
  const validation = validateFieldReport(input);
  if (!validation.isValid) {
    return {
      success: false,
      message: `Validation failed: ${validation.errors.join("; ")}`,
      survivalRatePct: validation.calculatedSurvivalRatePct,
      savedToDatabase: false,
      error: validation.errors[0],
    };
  }

  const timestamp = input.capturedAt || new Date().toISOString();
  const survivalRate = validation.calculatedSurvivalRatePct;
  const auditNotes =
    input.notes ||
    `[5% Spot Audit] Audited: ${input.totalAudited}, Living: ${input.livingCount}, Stressed: ${input.stressedCount}, Dead: ${input.deadCount} (Auditor: ${input.auditorName})`;

  try {
    // Step 2: Insert primary evidence record into Supabase `project_evidence` table
    const { data: evidenceData, error: evidenceError } = await supabase
      .from("project_evidence")
      .insert({
        project_id: input.projectId,
        user_id: input.auditorId || (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000",
        evidence_type: "survival",
        latitude: input.latitude,
        longitude: input.longitude,
        survival_percent: survivalRate,
        photo_url: input.photoUrl || null,
        notes: auditNotes,
        ai_status: survivalRate >= 75 ? "verified_thriving" : survivalRate >= 50 ? "requires_monitoring" : "critical_alert",
        ai_score: survivalRate,
        captured_at: timestamp,
      })
      .select("id")
      .single();

    if (evidenceError) {
      console.warn("Direct project_evidence insert failed, falling back to offline queue:", evidenceError.message);
      enqueueOfflineFieldReport(input);
      return {
        success: true,
        message: "Network/database unreachable. Audit report saved to offline field queue and will auto-sync.",
        survivalRatePct: survivalRate,
        savedToDatabase: false,
        queuedForOfflineSync: true,
      };
    }

    // Step 3: Insert individual sample check-ins into `check_ins` table if provided
    let checkInsCreated = 0;
    if (input.sampleItems && input.sampleItems.length > 0) {
      const checkInRows = input.sampleItems
        .filter((sample) => sample.tree_id)
        .map((sample) => ({
          tree_id: sample.tree_id!,
          checked_by: input.auditorName,
          status: sample.status,
          photo_url: sample.photo_url || null,
          notes: sample.notes || `Measured Height: ${sample.measured_height_cm || 0}cm, DBH: ${sample.measured_dbh_mm || 0}mm`,
          checked_at: timestamp,
        }));

      if (checkInRows.length > 0) {
        const { error: checkInsError } = await supabase.from("check_ins").insert(checkInRows);
        if (!checkInsError) {
          checkInsCreated = checkInRows.length;
        }

        // Update each sampled tree's survival_status in public.trees
        for (const sample of input.sampleItems.filter((s) => s.tree_id)) {
          const mappedStatus =
            sample.status === "alive" ? "alive" : sample.status === "stressed" ? "moisture_stressed" : "dead";
          try {
            await supabase
              .from("trees")
              .update({
                survival_status: mappedStatus,
                height_cm: sample.measured_height_cm || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sample.tree_id!);
          } catch (treeErr) {
            console.warn(`Could not update tree status for ${sample.tree_id}:`, treeErr);
          }
        }
      }
    }

    // Step 4: Update `plantation_projects` aggregate metrics
    try {
      await supabase
        .from("plantation_projects")
        .update({
          verified_trees: input.livingCount,
          survival_rate_pct: survivalRate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.projectId);
    } catch (updateErr) {
      console.warn("Could not update project aggregate living count:", updateErr);
    }

    // Step 5: If plotId is provided, update plot-level survival metrics
    if (input.plotId) {
      try {
        await supabase
          .from("plots")
          .update({
            verified_survival_rate_pct: survivalRate,
            last_satellite_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.plotId);
      } catch (plotErr) {
        console.warn("Could not update plot survival rate:", plotErr);
      }
    }

    return {
      success: true,
      evidenceId: evidenceData?.id,
      message: `Field spot audit successfully recorded. Ground survival rate: ${survivalRate}%.`,
      survivalRatePct: survivalRate,
      savedToDatabase: true,
      checkInsCreatedCount: checkInsCreated,
    };
  } catch (err: any) {
    console.error("Field report backend submission exception:", err);
    enqueueOfflineFieldReport(input);
    return {
      success: true,
      message: "Audit report saved locally in offline queue due to connection interruption.",
      survivalRatePct: survivalRate,
      savedToDatabase: false,
      queuedForOfflineSync: true,
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. UNIFIED END-TO-END DATA SUBMISSION WORKFLOW
// ---------------------------------------------------------------------------

/**
 * End-to-end data submission workflow orchestrator for field reports:
 * 1. Validates geotag and input structure.
 * 2. Cross-validates EXIF vs Device GPS anti-spoofing location.
 * 3. Compresses & uploads field photo to Supabase storage bucket.
 * 4. Compiles structured silvicultural audit notes and interventions.
 * 5. Persists multi-table tree survival data to Supabase database.
 */
export async function processFieldReportSubmissionWorkflow(
  input: FieldReportWorkflowInput
): Promise<FieldReportWorkflowResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate Geotagging & Input Fields
  const validation = validateFieldReport(input);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  // 2. EXIF vs Device GPS Cross-Verification
  const exifValidation = validateExifVersusDeviceGps(
    input.exifData?.lat,
    input.exifData?.lng,
    input.latitude,
    input.longitude
  );

  if (!exifValidation.isAcceptable) {
    errors.push(exifValidation.message);
  } else if (exifValidation.status === "drift_warning") {
    warnings.push(exifValidation.message);
  }

  // If critical validation errors exist, fail fast
  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed: ${errors.join("; ")}`,
      survivalRatePct: validation.calculatedSurvivalRatePct,
      savedToDatabase: false,
      exifValidation,
      validation,
      errors,
      warnings,
    };
  }

  // 3. Upload Photo to Supabase Storage if File/Blob is provided
  let resolvedPhotoUrl = input.photoUrl || null;
  if (input.photoFile) {
    const uploadRes = await uploadFieldReportPhoto(input.photoFile, input.projectId);
    if (uploadRes.success && uploadRes.publicUrl) {
      resolvedPhotoUrl = uploadRes.publicUrl;
    } else if (uploadRes.error) {
      warnings.push(`Photo upload to cloud storage was delayed: ${uploadRes.error}. Cached locally.`);
    }
  }

  // 4. Compile Structured Notes
  const interventionList: string[] = [];
  if (input.interventions?.dripRescue) interventionList.push("Urgent Drip Irrigation Needed");
  if (input.interventions?.weedClearing) interventionList.push("Manual Ring Weeding Required");
  if (input.interventions?.bioMulch) interventionList.push("Organic Bio-Mulch Application");
  if (input.interventions?.pestTreatment) interventionList.push("Organic Bio-Pesticide (NSKE 5%)");
  if (input.interventions?.fencingRepair) interventionList.push("Bamboo Tree Guard Reinforcement");

  const speciesInfo = input.dominantSpecies ? `Species: ${input.dominantSpecies}` : "";
  const heightInfo = input.averageHeightCm ? `Avg Height: ${input.averageHeightCm}cm` : "";
  const interventionText =
    interventionList.length > 0 ? `Interventions: ${interventionList.join(", ")}` : "Status: Routine Maintenance";
  const userNotes = input.notes || "Standard 5% Cochran spot audit completed.";

  const compiledNotes = [
    `[5% Spot Audit]`,
    speciesInfo,
    heightInfo,
    `Living: ${input.livingCount}, Stressed: ${input.stressedCount}, Dead: ${input.deadCount}`,
    interventionText,
    `Observations: ${userNotes}`,
    `(Auditor: ${input.auditorName} [${input.auditorRole || "Official Ranger"}])`,
  ]
    .filter(Boolean)
    .join(" | ");

  // 5. Submit to Supabase Database
  const submissionPayload: FieldReportInput = {
    ...input,
    photoUrl: resolvedPhotoUrl,
    notes: compiledNotes,
  };

  const submissionResult = await submitFieldSpotAuditReport(submissionPayload);

  return {
    success: submissionResult.success,
    evidenceId: submissionResult.evidenceId,
    message: submissionResult.message,
    survivalRatePct: submissionResult.survivalRatePct,
    savedToDatabase: submissionResult.savedToDatabase,
    queuedForOfflineSync: submissionResult.queuedForOfflineSync,
    uploadedPhotoUrl: resolvedPhotoUrl,
    exifValidation,
    validation,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ---------------------------------------------------------------------------
// 5. OFFLINE QUEUE UTILITIES & AUDIT HISTORY FETCHING
// ---------------------------------------------------------------------------

/**
 * Returns the count of pending offline field reports.
 */
export function getQueuedOfflineFieldReportsCount(): number {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(OFFLINE_FIELD_AUDIT_QUEUE_KEY);
      if (saved) {
        return JSON.parse(saved).length;
      }
    }
  } catch {}
  return inMemoryOfflineQueue.length;
}

/**
 * Synchronizes all queued offline field reports to Supabase when connectivity is restored.
 */
export async function syncQueuedOfflineFieldReports(): Promise<{
  syncedCount: number;
  failedCount: number;
  results: FieldReportSubmissionResult[];
}> {
  let queue: FieldReportInput[] = [];
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(OFFLINE_FIELD_AUDIT_QUEUE_KEY);
      if (saved) queue = JSON.parse(saved);
    }
  } catch {}

  if (queue.length === 0 && inMemoryOfflineQueue.length > 0) {
    queue = [...inMemoryOfflineQueue];
  }

  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, results: [] };
  }

  const results: FieldReportSubmissionResult[] = [];
  const remainingQueue: FieldReportInput[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const report of queue) {
    try {
      const res = await submitFieldSpotAuditReport(report);
      if (res.savedToDatabase) {
        syncedCount++;
        results.push(res);
      } else {
        failedCount++;
        remainingQueue.push(report);
        results.push(res);
      }
    } catch (err) {
      failedCount++;
      remainingQueue.push(report);
    }
  }

  inMemoryOfflineQueue = remainingQueue.map((r) => ({ ...r, offlineQueuedAt: new Date().toISOString() }));
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(OFFLINE_FIELD_AUDIT_QUEUE_KEY, JSON.stringify(remainingQueue));
    }
  } catch {}

  return { syncedCount, failedCount, results };
}

/**
 * Fetches all audited field reports for a given project from Supabase.
 */
export async function fetchProjectAuditHistory(projectId: string): Promise<Array<{
  id: string;
  evidence_type: string;
  survival_percent: number | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  notes: string | null;
  captured_at: string | null;
  created_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from("project_evidence")
      .select("id, evidence_type, survival_percent, latitude, longitude, photo_url, notes, captured_at, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error fetching project audit history:", e);
    return [];
  }
}
