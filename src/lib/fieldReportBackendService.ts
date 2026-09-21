/**
 * Green Enlightenment — Field Report Backend & Survival Telemetry Service
 *
 * Provides end-to-end backend logic for:
 * 1. Ranger field spot audit submission & geotag validation.
 * 2. Survival rate calculation (living vs dead vs stressed).
 * 3. Supabase persistence to `project_evidence` and `check_ins` tables.
 * 4. Offline sync resilience for field rangers in low-connectivity forest terrain.
 * 5. Aggregation of verified living tree counts on `plantation_projects`.
 */

import { supabase } from "@/integrations/supabase/client";

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

// ---------------------------------------------------------------------------
// 1. PURE VALIDATION & MATHEMATICAL ENGINES
// ---------------------------------------------------------------------------

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
// 2. SUPABASE BACKEND PERSISTENCE & OFFLINE SYNC
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
  const auditNotes = input.notes || `[5% Spot Audit] Audited: ${input.totalAudited}, Living: ${input.livingCount}, Stressed: ${input.stressedCount}, Dead: ${input.deadCount} (Auditor: ${input.auditorName})`;

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

