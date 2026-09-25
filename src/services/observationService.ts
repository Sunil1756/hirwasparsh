/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 21
 * Tree Observation Model & Monitoring History Service
 * 
 * Manages biometric observations, living monitoring history, field inspections,
 * and growth audits for registered trees.
 * 
 * Required Fields:
 * 1. Tree ID (tree_id: UUID)
 * 2. Observer (observer_id: UUID | null, observer_name, observer_role)
 * 3. Date/Time (observation_date: ISO 8601)
 * 4. Location if required (latitude, longitude, elevation_m, gps_accuracy_meters)
 * 5. Condition (health_status, height_cm, canopy_width_cm, dbh_cm, foliage_density_pct, pest/disease)
 * 6. Notes (condition_notes, notes, care_recommendations)
 * 7. Evidence (photo_url, evidence_type, sha256_hash)
 * 8. Status (verification_status: 'pending' | 'verified' | 'flagged' | 'rejected')
 */

import { supabase } from "@/integrations/supabase/client";
import {
  TreeObservation,
  CreateObservationInput,
  ObservationValidationResult,
  ObservationSummaryStats,
  TreeHealthStatus,
  VerificationStatus,
} from "@/types/coreDatabase";

export const ALLOWED_OBSERVATION_HEALTH_STATUSES: TreeHealthStatus[] = [
  "healthy",
  "thriving",
  "stressed",
  "moderate",
  "critical",
  "diseased",
  "dead",
  "recovering",
  "replaced",
];

export const ALLOWED_OBSERVATION_VERIFICATION_STATUSES: VerificationStatus[] = [
  "pending",
  "verified",
  "flagged",
  "rejected",
];

export const observationService = {
  /**
   * 1. VALIDATE OBSERVATION INPUT
   * Performs strict validation on all 8 foundational observation dimensions
   */
  validateObservationInput(input: Partial<CreateObservationInput>): ObservationValidationResult {
    const errors: string[] = [];

    // 1. Tree ID (Required)
    const treeId = input.tree_id?.trim();
    if (!treeId || treeId.length === 0) {
      errors.push("Tree ID is required for recording an observation.");
    }

    // 2. Observer Details
    const observerId = input.observer_id?.trim() || null;
    const observerName = input.observer_name?.trim() || null;

    // 3. Date / Time (Defaults to now, cannot be future)
    let observationDate = input.observation_date?.trim() || input.observed_at?.trim();
    if (!observationDate) {
      observationDate = new Date().toISOString();
    } else {
      const parsedDate = new Date(observationDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push("Observation date must be a valid ISO date format.");
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (parsedDate > tomorrow) {
          errors.push("Observation date cannot be in the future.");
        }
      }
    }

    // 4. Location if provided
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (input.latitude !== undefined && input.latitude !== null) {
      latitude = typeof input.latitude === "number" ? input.latitude : parseFloat(input.latitude as any);
      if (isNaN(latitude) || latitude < -90.0 || latitude > 90.0) {
        errors.push("Latitude must be a valid coordinate between -90.0 and 90.0.");
      }
    }

    if (input.longitude !== undefined && input.longitude !== null) {
      longitude = typeof input.longitude === "number" ? input.longitude : parseFloat(input.longitude as any);
      if (isNaN(longitude) || longitude < -180.0 || longitude > 180.0) {
        errors.push("Longitude must be a valid coordinate between -180.0 and 180.0.");
      }
    }

    if (latitude !== null && longitude !== null) {
      if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
        errors.push("Coordinates (0, 0) point to Null Island. Please provide real terrestrial coordinates.");
      }
    }

    // 5. Condition & Health Status
    const rawStatus = (input.health_status || input.condition || "healthy").toLowerCase() as TreeHealthStatus;
    let healthStatus: TreeHealthStatus = "healthy";

    if (ALLOWED_OBSERVATION_HEALTH_STATUSES.includes(rawStatus)) {
      healthStatus = rawStatus;
    } else {
      errors.push(`Invalid health status: "${rawStatus}". Allowed: [${ALLOWED_OBSERVATION_HEALTH_STATUSES.join(", ")}]`);
    }

    // Biometric bounds
    const heightCm = input.height_cm !== undefined && input.height_cm !== null ? Number(input.height_cm) : null;
    if (heightCm !== null && (isNaN(heightCm) || heightCm < 0 || heightCm > 15000)) {
      errors.push("Height must be a positive number in cm (0 to 15,000 cm).");
    }

    const dbhCm = input.dbh_cm !== undefined && input.dbh_cm !== null ? Number(input.dbh_cm) : null;
    if (dbhCm !== null && (isNaN(dbhCm) || dbhCm < 0 || dbhCm > 1000)) {
      errors.push("DBH must be a positive number in cm (0 to 1,000 cm).");
    }

    const canopyWidthCm = input.canopy_width_cm !== undefined && input.canopy_width_cm !== null ? Number(input.canopy_width_cm) : null;
    if (canopyWidthCm !== null && (isNaN(canopyWidthCm) || canopyWidthCm < 0 || canopyWidthCm > 5000)) {
      errors.push("Canopy width must be a positive number in cm (0 to 5,000 cm).");
    }

    // 6. Notes
    const conditionNotes = input.condition_notes?.trim() || input.notes?.trim() || null;

    // 7. Evidence
    const photoUrl = input.photo_url?.trim() || null;

    // 8. Status & Verification
    let verificationStatus: VerificationStatus = "pending";
    if (input.verification_status && ALLOWED_OBSERVATION_VERIFICATION_STATUSES.includes(input.verification_status)) {
      verificationStatus = input.verification_status;
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      normalizedData: {
        tree_id: treeId!,
        observer_id: observerId,
        observer_name: observerName,
        observation_date: observationDate,
        latitude,
        longitude,
        health_status: healthStatus,
        height_cm: heightCm,
        dbh_cm: dbhCm,
        canopy_width_cm: canopyWidthCm,
        condition_notes: conditionNotes,
        photo_url: photoUrl,
        verification_status: verificationStatus,
      },
    };
  },

  /**
   * 2. CREATE OBSERVATION RECORD
   * Validates, records biometric observation, synchronizes parent tree, and logs audit trail
   */
  async createObservation(
    input: CreateObservationInput,
    actorId?: string
  ): Promise<{ success: boolean; observation?: TreeObservation; error?: string }> {
    try {
      // Step 1: Validate input
      const validation = this.validateObservationInput({
        ...input,
        observer_id: input.observer_id || actorId,
      });

      if (!validation.isValid || !validation.normalizedData) {
        return { success: false, error: validation.errors.join("; ") };
      }

      const norm = validation.normalizedData;
      const observer = norm.observer_id || actorId || null;

      // Step 2: Verify parent tree exists
      const { data: parentTree, error: treeErr } = await supabase
        .from("trees" as any)
        .select("id, status, height_cm, dbh_cm, species")
        .eq("id", norm.tree_id)
        .maybeSingle();

      if (treeErr || !parentTree) {
        return { success: false, error: `Parent tree "${norm.tree_id}" does not exist in registry.` };
      }

      // Step 3: Insert observation into database
      const observationRecord: Record<string, any> = {
        tree_id: norm.tree_id,
        observer_id: observer,
        observer_name: norm.observer_name || input.observer_name || null,
        observer_role: input.observer_role || null,
        observation_date: norm.observation_date,
        latitude: norm.latitude,
        longitude: norm.longitude,
        elevation_m: input.elevation_m || null,
        gps_accuracy_meters: input.gps_accuracy_meters || null,
        health_status: norm.health_status,
        height_cm: norm.height_cm,
        dbh_cm: norm.dbh_cm,
        canopy_width_cm: norm.canopy_width_cm,
        foliage_density_pct: input.foliage_density_pct || null,
        pest_disease_detected: input.pest_disease_detected || false,
        pest_types: input.pest_types || [],
        disease_description: input.disease_description || null,
        treatment_applied: input.treatment_applied || null,
        condition_notes: norm.condition_notes,
        care_recommendations: input.care_recommendations || null,
        photo_url: norm.photo_url,
        evidence_type: input.evidence_type || "growth_photo",
        sha256_hash: input.sha256_hash || null,
        verification_status: norm.verification_status,
        ai_health_score: input.ai_health_score || null,
        ai_diagnosis_json: input.ai_diagnosis_json || {},
        co2_sequestered_kg: input.co2_sequestered_kg || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("tree_observations" as any)
        .insert(observationRecord)
        .select("*")
        .single();

      if (insertErr || !inserted) {
        return { success: false, error: insertErr?.message || "Failed to record observation." };
      }

      const createdObservation = inserted as unknown as TreeObservation;

      // Step 4: Synchronize parent tree biometrics & status if applicable
      const treeUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (norm.height_cm && norm.height_cm > 0) {
        treeUpdates.height_cm = norm.height_cm;
      }
      if (norm.dbh_cm && norm.dbh_cm > 0) {
        treeUpdates.dbh_cm = norm.dbh_cm;
      }
      if (norm.canopy_width_cm && norm.canopy_width_cm > 0) {
        treeUpdates.canopy_radius_cm = Math.round(norm.canopy_width_cm / 2);
      }

      // Map health status to tree status
      if (norm.health_status === "thriving" || norm.health_status === "healthy") {
        treeUpdates.status = "thriving";
      } else if (norm.health_status === "stressed" || norm.health_status === "moderate") {
        treeUpdates.status = "stressed";
      } else if (norm.health_status === "diseased" || norm.health_status === "critical") {
        treeUpdates.status = "diseased";
      } else if (norm.health_status === "dead") {
        treeUpdates.status = "dead";
      } else if (norm.health_status === "replaced") {
        treeUpdates.status = "replaced";
      }

      if (input.ai_health_score) {
        treeUpdates.health_score = input.ai_health_score;
      }

      await supabase
        .from("trees" as any)
        .update(treeUpdates)
        .eq("id", norm.tree_id);

      // Step 5: Write Immutable Audit Log
      try {
        await supabase.from("audit_logs" as any).insert({
          actor_id: observer,
          action: "RECORD_TREE_OBSERVATION",
          entity_type: "tree_observations",
          entity_id: createdObservation.id,
          new_status: norm.health_status,
          new_state: {
            tree_id: norm.tree_id,
            height_cm: norm.height_cm,
            health_status: norm.health_status,
            observation_date: norm.observation_date,
          },
        });
      } catch {
        // Non-blocking audit
      }

      return { success: true, observation: createdObservation };
    } catch (err: any) {
      return { success: false, error: err?.message || "Unexpected error recording observation." };
    }
  },

  /**
   * 3. GET OBSERVATIONS BY TREE
   * Returns chronological time-series observations for a tree
   */
  async getObservationsByTree(treeId: string, limit: number = 100): Promise<TreeObservation[]> {
    try {
      const { data, error } = await supabase
        .from("tree_observations" as any)
        .select("*")
        .eq("tree_id", treeId)
        .order("observation_date", { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data as unknown as TreeObservation[];
    } catch {
      return [];
    }
  },

  /**
   * 4. GET OBSERVATION BY ID
   */
  async getObservationById(observationId: string): Promise<TreeObservation | null> {
    try {
      const { data, error } = await supabase
        .from("tree_observations" as any)
        .select("*")
        .eq("id", observationId)
        .maybeSingle();

      if (error || !data) return null;
      return data as unknown as TreeObservation;
    } catch {
      return null;
    }
  },

  /**
   * 5. VERIFY OBSERVATION
   * Validates or flags an observation (Administrative MRV audit)
   */
  async verifyObservation(
    observationId: string,
    verifierId: string,
    status: VerificationStatus,
    notes?: string
  ): Promise<{ success: boolean; observation?: TreeObservation; error?: string }> {
    try {
      if (!ALLOWED_OBSERVATION_VERIFICATION_STATUSES.includes(status)) {
        return { success: false, error: `Invalid verification status: "${status}".` };
      }

      const { data: updated, error } = await supabase
        .from("tree_observations" as any)
        .update({
          verification_status: status,
          verified_by: verifierId,
          verified_at: new Date().toISOString(),
          verification_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", observationId)
        .select("*")
        .single();

      if (error || !updated) {
        return { success: false, error: error?.message || "Failed to update observation verification." };
      }

      // Audit log
      try {
        await supabase.from("audit_logs" as any).insert({
          actor_id: verifierId,
          action: "VERIFY_TREE_OBSERVATION",
          entity_type: "tree_observations",
          entity_id: observationId,
          new_status: status,
          new_state: { notes, verified_at: new Date().toISOString() },
        });
      } catch {
        // Non-blocking
      }

      return { success: true, observation: updated as unknown as TreeObservation };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to verify observation." };
    }
  },

  /**
   * 6. GET OBSERVATION SUMMARY STATS
   * Computes growth progression, velocity, and health statistics from observation history
   */
  async getObservationStats(treeId: string): Promise<ObservationSummaryStats> {
    const observations = await this.getObservationsByTree(treeId);

    if (observations.length === 0) {
      return {
        totalObservations: 0,
        latestObservationDate: null,
        latestHealthStatus: null,
        initialHeightCm: null,
        currentHeightCm: null,
        growthDeltaCm: 0,
        averageAnnualGrowthRateCm: 0,
        pestIssuesCount: 0,
        verifiedObservationsCount: 0,
      };
    }

    const sortedAsc = [...observations].sort(
      (a, b) => new Date(a.observation_date).getTime() - new Date(b.observation_date).getTime()
    );

    const latest = observations[0];
    const initial = sortedAsc[0];

    const initialHeight = initial.height_cm || null;
    const currentHeight = latest.height_cm || null;
    const growthDelta = (currentHeight !== null && initialHeight !== null) ? Math.max(0, currentHeight - initialHeight) : 0;

    // Calculate annual growth rate if multi-date observations exist
    let annualRate = 0;
    if (sortedAsc.length > 1 && initialHeight !== null && currentHeight !== null) {
      const daysElapsed = Math.max(
        1,
        (new Date(latest.observation_date).getTime() - new Date(initial.observation_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      annualRate = Number(((growthDelta / daysElapsed) * 365.25).toFixed(1));
    }

    const pestCount = observations.filter((o) => o.pest_disease_detected).length;
    const verifiedCount = observations.filter((o) => o.verification_status === "verified").length;

    return {
      totalObservations: observations.length,
      latestObservationDate: latest.observation_date,
      latestHealthStatus: latest.health_status,
      initialHeightCm: initialHeight,
      currentHeightCm: currentHeight,
      growthDeltaCm: growthDelta,
      averageAnnualGrowthRateCm: annualRate,
      pestIssuesCount: pestCount,
      verifiedObservationsCount: verifiedCount,
    };
  },
};
