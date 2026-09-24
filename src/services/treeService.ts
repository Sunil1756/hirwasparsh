/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 15
 * Core Tree Data Model & Service Layer
 * 
 * Defines and enforces the 9 foundational attributes of a tree:
 * 1. Tree ID (id: UUID)
 * 2. Project ID (project_id: UUID | null)
 * 3. Species (species: string)
 * 4. Plantation date (plantation_date: string YYYY-MM-DD)
 * 5. Latitude (latitude: number [-90.0, 90.0])
 * 6. Longitude (longitude: number [-180.0, 180.0])
 * 7. Created by (created_by: UUID | null)
 * 8. Initial status (status: TreeStatus)
 * 9. Created timestamp (created_at: string ISO 8601)
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Tree,
  CreateTreeInput,
  TreeValidationResult,
  TreeStatus,
} from "@/types/coreDatabase";

export const ALLOWED_TREE_STATUSES: TreeStatus[] = [
  "alive",
  "thriving",
  "stressed",
  "diseased",
  "dead",
  "replaced",
];

// UUID v4 format validator regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const treeService = {
  /**
   * 1. VALIDATE TREE INPUT (Strict Schema & Constraint Validation)
   */
  validateTreeInput(input: Partial<CreateTreeInput>): TreeValidationResult {
    const errors: string[] = [];

    // 1. Tree ID (optional on input, but if provided must be valid UUID)
    let treeId = input.id?.trim();
    if (treeId) {
      if (!UUID_REGEX.test(treeId) && !treeId.startsWith("tree-")) {
        errors.push("Tree ID must be a valid UUID format");
      }
    } else {
      treeId = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // 2. Project ID (optional/nullable, but if provided must be valid identifier)
    const projectId = input.project_id?.trim() || null;

    // 3. Species (Required, non-empty string)
    const species = input.species?.trim();
    if (!species || species.length === 0) {
      errors.push("Species is required and cannot be empty");
    }

    // 4. Plantation Date (Required / defaults to today, cannot be in future)
    let plantationDate = input.plantation_date?.trim();
    if (!plantationDate) {
      plantationDate = new Date().toISOString().split("T")[0];
    } else {
      const parsedDate = new Date(plantationDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push("Plantation date must be a valid date format (YYYY-MM-DD)");
      } else {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (parsedDate > today) {
          errors.push("Plantation date cannot be in the future");
        }
      }
    }

    // 5. Latitude (Required, must be between -90 and 90)
    const latitude = typeof input.latitude === "number" ? input.latitude : parseFloat(input.latitude as any);
    if (isNaN(latitude) || latitude < -90.0 || latitude > 90.0) {
      errors.push("Latitude must be a valid WGS84 coordinate between -90.0 and 90.0");
    }

    // 6. Longitude (Required, must be between -180 and 180)
    const longitude = typeof input.longitude === "number" ? input.longitude : parseFloat(input.longitude as any);
    if (isNaN(longitude) || longitude < -180.0 || longitude > 180.0) {
      errors.push("Longitude must be a valid WGS84 coordinate between -180.0 and 180.0");
    }

    // 7. Created By (UUID or null)
    const createdBy = input.created_by?.trim() || input.user_id?.trim() || null;

    // 8. Initial Status (Must be in allowed statuses, defaults to 'alive')
    let status: TreeStatus = input.status || "alive";
    if (!ALLOWED_TREE_STATUSES.includes(status)) {
      errors.push(`Invalid tree status: "${status}". Allowed statuses: [${ALLOWED_TREE_STATUSES.join(", ")}]`);
      status = "alive";
    }

    // 9. Created Timestamp
    const createdAt = new Date().toISOString();

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      normalizedData: {
        id: treeId,
        project_id: projectId,
        species: species!,
        plantation_date: plantationDate,
        latitude,
        longitude,
        created_by: createdBy,
        status,
        created_at: createdAt,
      },
    };
  },

  /**
   * 2. CREATE TREE RECORD
   */
  async createTree(
    input: CreateTreeInput,
    actorId?: string
  ): Promise<{ success: boolean; tree?: Tree; error?: string }> {
    try {
      // Step 1: Validate input against data model rules
      const validation = this.validateTreeInput({
        ...input,
        created_by: input.created_by || actorId || input.user_id,
      });

      if (!validation.isValid || !validation.normalizedData) {
        return { success: false, error: validation.errors.join("; ") };
      }

      const normalized = validation.normalizedData;
      const planterId = normalized.created_by || actorId || null;

      // Step 2: Prepare tree record
      const treeRecord: Record<string, any> = {
        project_id: normalized.project_id,
        boundary_id: input.boundary_id || null,
        organization_id: input.organization_id || null,
        user_id: planterId,
        created_by: planterId,
        tree_name: input.tree_name?.trim() || `${normalized.species} Tree`,
        species: normalized.species,
        botanical_name: input.botanical_name?.trim() || null,
        plantation_date: normalized.plantation_date,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        elevation_m: input.elevation_m || null,
        location: input.location || `${normalized.latitude.toFixed(5)}, ${normalized.longitude.toFixed(5)}`,
        height_cm: input.height_cm || 0,
        dbh_cm: input.dbh_cm || 0,
        canopy_radius_cm: input.canopy_radius_cm || 0,
        photo_url: input.photo_url || null,
        status: normalized.status,
        verification_status: "pending",
        admin_status: "pending",
        planting_type: input.planting_type || (normalized.project_id ? "institutional" : "individual"),
        points_awarded: 10,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        treeRecord.id = input.id;
      }

      // Step 3: Insert into database
      const { data, error } = await supabase
        .from("trees" as any)
        .insert(treeRecord)
        .select("*")
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to insert tree record" };
      }

      const createdTree = data as unknown as Tree;

      // Step 4: If linked to project, update project planted_trees count
      if (normalized.project_id) {
        const { data: countData } = await supabase
          .from("trees" as any)
          .select("id", { count: "exact" })
          .eq("project_id", normalized.project_id);

        const totalPlanted = countData ? (countData as any).length : 1;
        await supabase
          .from("projects" as any)
          .update({
            planted_trees: totalPlanted,
            updated_at: new Date().toISOString(),
          })
          .eq("id", normalized.project_id);
      }

      // Step 5: Audit log
      await supabase.from("audit_logs" as any).insert({
        actor_id: planterId,
        action: "PLANT_TREE",
        entity_type: "trees",
        entity_id: createdTree.id,
        new_status: createdTree.status,
        new_state: {
          species: createdTree.species,
          project_id: createdTree.project_id,
          latitude: createdTree.latitude,
          longitude: createdTree.longitude,
          plantation_date: createdTree.plantation_date,
        },
      });

      return { success: true, tree: createdTree };
    } catch (err: any) {
      return { success: false, error: err?.message || "Unexpected error creating tree record" };
    }
  },

  /**
   * 3. GET TREE BY ID
   */
  async getTreeById(treeId: string): Promise<Tree | null> {
    try {
      const { data, error } = await supabase
        .from("trees" as any)
        .select("*")
        .eq("id", treeId)
        .maybeSingle();

      if (error || !data) return null;
      return data as unknown as Tree;
    } catch {
      return null;
    }
  },

  /**
   * 4. GET TREES BY PROJECT
   */
  async getTreesByProject(
    projectId: string,
    filters?: { status?: TreeStatus; species?: string }
  ): Promise<Tree[]> {
    try {
      let query = supabase
        .from("trees" as any)
        .select("*")
        .eq("project_id", projectId);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.species) {
        query = query.ilike("species", `%${filters.species}%`);
      }

      query = query.order("plantation_date", { ascending: false });

      const { data, error } = await query;
      if (error || !data) return [];
      return data as unknown as Tree[];
    } catch {
      return [];
    }
  },

  /**
   * 5. GET TREES BY USER
   */
  async getTreesByUser(userId: string): Promise<Tree[]> {
    try {
      const { data, error } = await supabase
        .from("trees" as any)
        .select("*")
        .or(`created_by.eq.${userId},user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as unknown as Tree[];
    } catch {
      return [];
    }
  },

  /**
   * 6. UPDATE TREE STATUS (HEALTH TRANSITION & AUDIT)
   */
  async updateTreeStatus(
    treeId: string,
    newStatus: TreeStatus,
    actorId?: string,
    notes?: string
  ): Promise<{ success: boolean; tree?: Tree; error?: string }> {
    try {
      if (!ALLOWED_TREE_STATUSES.includes(newStatus)) {
        return { success: false, error: `Invalid status: "${newStatus}"` };
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("trees" as any)
        .select("*")
        .eq("id", treeId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return { success: false, error: "Tree not found" };
      }

      const { data: updated, error: updateErr } = await supabase
        .from("trees" as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", treeId)
        .select("*")
        .single();

      if (updateErr || !updated) {
        return { success: false, error: updateErr?.message || "Failed to update tree status" };
      }

      // Record biometric observation
      await supabase.from("tree_observations" as any).insert({
        tree_id: treeId,
        observer_id: actorId || null,
        observation_date: new Date().toISOString(),
        health_status: newStatus === "alive" || newStatus === "thriving" ? "healthy" : (newStatus === "dead" ? "dead" : "moderate"),
        condition_notes: notes || `Status updated to ${newStatus}`,
      });

      // Audit log
      await supabase.from("audit_logs" as any).insert({
        actor_id: actorId || null,
        action: "UPDATE_TREE_STATUS",
        entity_type: "trees",
        entity_id: treeId,
        previous_status: existing.status,
        new_status: newStatus,
        new_state: { notes, timestamp: new Date().toISOString() },
      });

      return { success: true, tree: updated as unknown as Tree };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update tree status" };
    }
  },

  /**
   * 7. CREATE BULK TREES (BATCH INGESTION)
   */
  async createBulkTrees(
    inputs: CreateTreeInput[],
    actorId?: string
  ): Promise<{ success: boolean; trees: Tree[]; errorCount: number; errors: string[] }> {
    const validRecords: any[] = [];
    const errors: string[] = [];

    inputs.forEach((input, index) => {
      const val = this.validateTreeInput({
        ...input,
        created_by: input.created_by || actorId || input.user_id,
      });

      if (!val.isValid || !val.normalizedData) {
        errors.push(`Row ${index + 1}: ${val.errors.join(", ")}`);
      } else {
        const norm = val.normalizedData;
        const planterId = norm.created_by || actorId || null;

        validRecords.push({
          project_id: norm.project_id,
          boundary_id: input.boundary_id || null,
          organization_id: input.organization_id || null,
          user_id: planterId,
          created_by: planterId,
          tree_name: input.tree_name?.trim() || `${norm.species} #${index + 1}`,
          species: norm.species,
          plantation_date: norm.plantation_date,
          latitude: norm.latitude,
          longitude: norm.longitude,
          location: input.location || `${norm.latitude.toFixed(5)}, ${norm.longitude.toFixed(5)}`,
          status: norm.status,
          verification_status: "pending",
          admin_status: "pending",
          planting_type: input.planting_type || (norm.project_id ? "institutional" : "individual"),
          points_awarded: 10,
          updated_at: new Date().toISOString(),
        });
      }
    });

    if (validRecords.length === 0) {
      return { success: false, trees: [], errorCount: errors.length, errors };
    }

    const { data, error } = await supabase
      .from("trees" as any)
      .insert(validRecords)
      .select("*");

    if (error || !data) {
      return {
        success: false,
        trees: [],
        errorCount: errors.length + 1,
        errors: [...errors, error?.message || "Bulk database insert failed"],
      };
    }

    const createdTrees = data as unknown as Tree[];

    return {
      success: true,
      trees: createdTrees,
      errorCount: errors.length,
      errors,
    };
  },
};
