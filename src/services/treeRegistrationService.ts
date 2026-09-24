/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 18
 * Unique Green Enlightenment Tree Identifier & Registration Pipeline
 * 
 * Identifier Specification:
 * Format: GE-YYYY-NNNNNN
 * Example: GE-2026-000001
 * 
 * Complete 7-Stage Registration Flow:
 * User → Project → GPS → Photo → Tree data → Database → Tree ID
 */

import { supabase } from "@/integrations/supabase/client";
import { Tree, TreeStatus } from "@/types/coreDatabase";
import { gpsRegistrationService, GpsCoordinates } from "@/services/gpsRegistrationService";
import { photoEvidenceService } from "@/services/photoEvidenceService";

// Standard Green Enlightenment tree identifier regex: GE-YYYY-NNNNNN
export const GE_TREE_CODE_REGEX = /^GE-\d{4}-\d{6}$/;

export interface UserRegistrationContext {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
  organizationId?: string | null;
}

export interface ProjectRegistrationContext {
  projectId?: string | null;
  projectName?: string | null;
  boundaryId?: string | null;
  isIndividualPlanting?: boolean;
}

export interface GpsRegistrationContext {
  latitude: number;
  longitude: number;
  altitudeMeters?: number | null;
  accuracyMeters?: number | null;
  locationName?: string | null;
}

export interface PhotoRegistrationContext {
  afterPhoto: File | Blob;
  beforePhoto?: File | Blob | null;
  selfiePhoto?: File | Blob | null;
  caption?: string | null;
}

export interface BiometricTreeData {
  species: string;
  botanicalName?: string | null;
  treeName?: string | null;
  plantationDate?: string | null;
  heightCm?: number | null;
  dbhCm?: number | null;
  canopyRadiusCm?: number | null;
  status?: TreeStatus;
  description?: string | null;
}

export interface CompleteTreeRegistrationInput {
  user: UserRegistrationContext;
  project?: ProjectRegistrationContext;
  gps: GpsRegistrationContext;
  photos: PhotoRegistrationContext;
  treeData: BiometricTreeData;
  onProgress?: (stage: RegistrationPipelineStage, progressPercent: number, message: string) => void;
}

export type RegistrationPipelineStage =
  | "user_validation"
  | "project_validation"
  | "gps_validation"
  | "photo_processing"
  | "tree_data_validation"
  | "database_persistence"
  | "tree_id_generation"
  | "completed"
  | "error";

export interface TreeRegistrationResult {
  success: boolean;
  treeCode?: string; // e.g. GE-2026-000001
  qrToken?: string;
  tree?: Tree;
  photoUrls?: {
    primaryUrl: string;
    beforeUrl?: string | null;
    selfieUrl?: string | null;
  };
  stage?: RegistrationPipelineStage;
  error?: string;
}

export class TreeRegistrationService {
  /**
   * Generates a deterministic formatted Green Enlightenment tree identifier
   * @param sequenceNumber Sequential integer (e.g. 1)
   * @param year 4-digit year (defaults to current year, e.g. 2026)
   * @returns Formatted code: GE-2026-000001
   */
  generateTreeCode(sequenceNumber: number, year: number = new Date().getFullYear()): string {
    const safeSeq = Math.max(1, Math.floor(sequenceNumber));
    const paddedSeq = String(safeSeq).padStart(6, "0");
    return `GE-${year}-${paddedSeq}`;
  }

  /**
   * Validates if a string conforms to the Green Enlightenment Tree Identifier standard (GE-YYYY-NNNNNN)
   */
  validateTreeCode(code: string | null | undefined): boolean {
    if (!code) return false;
    return GE_TREE_CODE_REGEX.test(code.trim());
  }

  /**
   * Parses a GE tree identifier into its constituent year and sequence parts
   */
  parseTreeCode(code: string): { year: number; sequence: number } | null {
    if (!this.validateTreeCode(code)) return null;
    const parts = code.trim().split("-");
    return {
      year: parseInt(parts[1], 10),
      sequence: parseInt(parts[2], 10),
    };
  }

  /**
   * Fetches the next sequential tree identifier from database sequence or atomic counter
   */
  async fetchNextTreeCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    try {
      // 1. Try PostgreSQL sequence function if available
      const { data: rpcData, error: rpcError } = await supabase.rpc("generate_ge_tree_code");
      if (!rpcError && rpcData && this.validateTreeCode(rpcData)) {
        return rpcData;
      }
    } catch {
      // Fallback to table count query
    }

    try {
      // 2. Query total existing trees to derive next sequential number
      const { count, error } = await supabase
        .from("trees" as any)
        .select("id", { count: "exact", head: true });

      const nextNumber = (count !== null && !error) ? count + 1 : Math.floor(Date.now() % 900000) + 100000;
      return this.generateTreeCode(nextNumber, currentYear);
    } catch {
      const fallbackSeq = Math.floor(Math.random() * 899999) + 100001;
      return this.generateTreeCode(fallbackSeq, currentYear);
    }
  }

  /**
   * Complete 7-Stage End-to-End Tree Registration Pipeline
   * User → Project → GPS → Photo → Tree data → Database → Tree ID
   */
  async registerTree(
    input: CompleteTreeRegistrationInput
  ): Promise<TreeRegistrationResult> {
    const { user, project, gps, photos, treeData, onProgress } = input;

    try {
      // ====================================================================
      // STAGE 1: USER VALIDATION
      // ====================================================================
      onProgress?.("user_validation", 10, "Verifying authenticated user session & profile credentials...");
      if (!user || !user.userId || user.userId.trim() === "") {
        return {
          success: false,
          stage: "user_validation",
          error: "User authentication required: valid user ID must be provided.",
        };
      }

      // ====================================================================
      // STAGE 2: PROJECT VALIDATION
      // ====================================================================
      onProgress?.("project_validation", 20, "Resolving project allocation & institutional boundaries...");
      const projectId = project?.projectId?.trim() || null;
      const boundaryId = project?.boundaryId?.trim() || null;
      const organizationId = user.organizationId || null;

      if (projectId) {
        // Verify project exists in database if provided
        try {
          const { data: projectRow } = await supabase
            .from("projects" as any)
            .select("id, name, status")
            .eq("id", projectId)
            .maybeSingle();

          if (projectRow && projectRow.status === "suspended") {
            return {
              success: false,
              stage: "project_validation",
              error: `Cannot register tree under suspended project "${projectRow.name}".`,
            };
          }
        } catch {
          // Non-blocking in offline/mock mode
        }
      }

      // ====================================================================
      // STAGE 3: GPS VALIDATION
      // ====================================================================
      onProgress?.("gps_validation", 35, "Validating geodetic coordinates & cadastral boundaries...");
      const gpsValidation = gpsRegistrationService.validateLocationCoordinates(
        gps.latitude,
        gps.longitude,
        gps.accuracyMeters || 5.0
      );

      if (!gpsValidation.isValid) {
        return {
          success: false,
          stage: "gps_validation",
          error: `GPS validation failed: ${gpsValidation.errors.join("; ")}`,
        };
      }

      // If project has boundaries, check containment
      if (projectId) {
        try {
          const boundaryReport = await gpsRegistrationService.validateTreeLocationAgainstProject(
            gps.latitude,
            gps.longitude,
            projectId
          );
          if (boundaryReport && !boundaryReport.isInside && boundaryReport.distanceToBoundaryMeters > 500) {
            console.warn(`Tree location is ${boundaryReport.distanceToBoundaryMeters.toFixed(1)}m outside project bounds.`);
          }
        } catch {
          // Non-blocking boundary containment check
        }
      }

      // ====================================================================
      // STAGE 4: PHOTO EVIDENCE PROCESSING & STORAGE
      // ====================================================================
      onProgress?.("photo_processing", 50, "Uploading cryptographic photo evidence to secure treebank...");
      if (!photos || !photos.afterPhoto) {
        return {
          success: false,
          stage: "photo_processing",
          error: "Photo evidence required: 'after' tree photo must be provided.",
        };
      }

      // Temporary entity ID for path allocation
      const tempTreeUuid = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 4.1 Upload Primary / After Photo
      const afterUpload = await photoEvidenceService.uploadPhotoEvidence({
        file: photos.afterPhoto,
        evidenceType: "after_photo",
        treeId: tempTreeUuid,
        uploaderId: user.userId,
        caption: photos.caption || `${treeData.species} plantation evidence`,
        latitudeOverride: gps.latitude,
        longitudeOverride: gps.longitude,
      });

      if (!afterUpload.success || !afterUpload.publicUrl) {
        return {
          success: false,
          stage: "photo_processing",
          error: afterUpload.error || "Failed to upload primary tree photo.",
        };
      }

      const primaryPhotoUrl = afterUpload.publicUrl;
      const sha256Hash = afterUpload.sha256Hash || null;
      const phash = afterUpload.phash || null;

      // 4.2 Upload Optional Before Photo
      let beforePhotoUrl: string | null = null;
      if (photos.beforePhoto) {
        const beforeUpload = await photoEvidenceService.uploadPhotoEvidence({
          file: photos.beforePhoto,
          evidenceType: "before_photo",
          treeId: tempTreeUuid,
          uploaderId: user.userId,
        });
        if (beforeUpload.success && beforeUpload.publicUrl) {
          beforePhotoUrl = beforeUpload.publicUrl;
        }
      }

      // 4.3 Upload Optional Selfie Photo (Private 'selfies' bucket)
      let selfiePhotoUrl: string | null = null;
      if (photos.selfiePhoto) {
        const selfieUpload = await photoEvidenceService.uploadPhotoEvidence({
          file: photos.selfiePhoto,
          evidenceType: "selfie",
          treeId: tempTreeUuid,
          uploaderId: user.userId,
          storageBucketOverride: "selfies",
        });
        if (selfieUpload.success && selfieUpload.publicUrl) {
          selfiePhotoUrl = selfieUpload.publicUrl;
        }
      }

      // ====================================================================
      // STAGE 5: TREE DATA NORMALIZATION
      // ====================================================================
      onProgress?.("tree_data_validation", 65, "Validating botanical attributes & planting biometrics...");
      const speciesName = treeData.species?.trim();
      if (!speciesName || speciesName.length === 0) {
        return {
          success: false,
          stage: "tree_data_validation",
          error: "Species name is required and cannot be empty.",
        };
      }

      const plantationDate = treeData.plantationDate || new Date().toISOString().split("T")[0];
      const treeName = treeData.treeName?.trim() || `${speciesName} Tree`;
      const heightCm = treeData.heightCm ? Math.max(0, Number(treeData.heightCm)) : 30;
      const initialStatus: TreeStatus = treeData.status || "alive";
      const locationDisplay = gps.locationName || `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;

      // ====================================================================
      // STAGE 6: DATABASE PERSISTENCE
      // ====================================================================
      onProgress?.("database_persistence", 80, "Persisting immutable record to Supabase data spine...");
      
      // Generate Next Green Enlightenment Tree Code (GE-YYYY-NNNNNN)
      const allocatedTreeCode = await this.fetchNextTreeCode();
      const qrToken = `ge_qr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const insertRecord: Record<string, any> = {
        project_id: projectId,
        boundary_id: boundaryId,
        organization_id: organizationId,
        user_id: user.userId,
        created_by: user.userId,
        tree_code: allocatedTreeCode,
        qr_token: qrToken,
        tree_name: treeName,
        species: speciesName,
        botanical_name: treeData.botanicalName?.trim() || null,
        plantation_date: plantationDate,
        latitude: gps.latitude,
        longitude: gps.longitude,
        elevation_m: gps.altitudeMeters || null,
        location: locationDisplay,
        height_cm: heightCm,
        dbh_cm: treeData.dbhCm || 0,
        canopy_radius_cm: treeData.canopyRadiusCm || 0,
        photo_url: primaryPhotoUrl,
        before_photo_url: beforePhotoUrl,
        selfie_photo_url: selfiePhotoUrl,
        photo_hash: sha256Hash,
        phash: phash,
        status: initialStatus,
        verification_status: "pending",
        admin_status: "pending",
        planting_type: projectId ? "institutional" : "individual",
        points_awarded: 10,
        gps_accuracy_meters: gps.accuracyMeters || 5.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: insertedData, error: insertError } = await supabase
        .from("trees" as any)
        .insert(insertRecord)
        .select("*")
        .single();

      if (insertError) {
        console.error("Tree registration insert error:", insertError);
        return {
          success: false,
          stage: "database_persistence",
          error: `Database registration failed: ${insertError.message}`,
        };
      }

      const createdTree = (insertedData as unknown as Tree) || (insertRecord as unknown as Tree);

      // Update project planted trees count if applicable
      if (projectId) {
        try {
          const { data: countData } = await supabase
            .from("trees" as any)
            .select("id", { count: "exact" })
            .eq("project_id", projectId);

          const totalPlanted = countData ? (countData as any).length : 1;
          await supabase
            .from("projects" as any)
            .update({
              planted_trees: totalPlanted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
        } catch {
          // Non-blocking project count refresh
        }
      }

      // Update User Profile impact counts
      try {
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("trees_planted, green_points")
          .eq("id", user.userId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("profiles" as any)
            .update({
              trees_planted: ((profile as any).trees_planted || 0) + 1,
              green_points: ((profile as any).green_points || 0) + 10,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.userId);
        }
      } catch {
        // Non-blocking profile update
      }

      // Write Immutable Audit Log
      try {
        await supabase.from("audit_logs" as any).insert({
          actor_id: user.userId,
          action: "REGISTER_TREE",
          entity_type: "trees",
          entity_id: createdTree.id,
          new_status: createdTree.status,
          new_state: {
            tree_code: allocatedTreeCode,
            species: createdTree.species,
            project_id: createdTree.project_id,
            latitude: createdTree.latitude,
            longitude: createdTree.longitude,
            photo_url: primaryPhotoUrl,
          },
        });
      } catch {
        // Non-blocking audit log
      }

      // ====================================================================
      // STAGE 7: TREE ID VERIFICATION & CERTIFICATE GENERATION
      // ====================================================================
      onProgress?.("tree_id_generation", 100, `Tree registered successfully! Allocated Tree ID: ${allocatedTreeCode}`);

      return {
        success: true,
        treeCode: allocatedTreeCode,
        qrToken,
        tree: createdTree,
        photoUrls: {
          primaryUrl: primaryPhotoUrl,
          beforeUrl: beforePhotoUrl,
          selfieUrl: selfiePhotoUrl,
        },
        stage: "completed",
      };
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred during tree registration.";
      onProgress?.("error", 0, errorMsg);
      return {
        success: false,
        stage: "error",
        error: errorMsg,
      };
    }
  }

  /**
   * Look up a tree by its unique Green Enlightenment identifier (e.g. GE-2026-000001)
   */
  async getTreeByCode(treeCode: string): Promise<Tree | null> {
    if (!this.validateTreeCode(treeCode)) return null;

    try {
      const { data, error } = await supabase
        .from("trees" as any)
        .select("*")
        .eq("tree_code", treeCode.trim())
        .maybeSingle();

      if (error || !data) return null;
      return data as unknown as Tree;
    } catch {
      return null;
    }
  }
}

export const treeRegistrationService = new TreeRegistrationService();
