/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 3 TASK 12
 * Production Project Management Service
 * 
 * Handles multi-tenant project creation, profile management, target configurations,
 * multi-plot cadastral boundaries, lifecycle state machine transitions, and review workflows.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Project,
  ProjectBoundary,
  ProjectStatus,
  ProjectType,
  BoundaryType,
  AuditLog,
} from "@/types/coreDatabase";
import { validateGeodeticBoundary, LatLngPoint } from "@/lib/projectOnboardingService";

export interface CreateProjectPayload {
  name: string;
  description?: string;
  project_type: ProjectType;
  organization_id?: string | null;
  target_trees: number;
  target_area_hectares?: number;
  location_name?: string;
  centroid_latitude?: number;
  centroid_longitude?: number;
  species_list?: string[];
  start_date?: string;
  end_date?: string;
  created_by?: string | null;
  status?: ProjectStatus;
  initial_boundary?: {
    points: LatLngPoint[];
    boundary_name?: string;
    boundary_type?: BoundaryType;
    compartment_code?: string;
  };
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  target_trees?: number;
  target_area_hectares?: number;
  location_name?: string;
  centroid_latitude?: number;
  centroid_longitude?: number;
  species_list?: string[];
  start_date?: string;
  end_date?: string;
}

export interface ProjectBoundaryInput {
  id?: string;
  boundary_name: string;
  compartment_code?: string;
  target_species?: string[];
  boundary_type: BoundaryType;
  points: LatLngPoint[];
  kml_raw_content?: string;
}

export interface ProjectFilterParams {
  organization_id?: string;
  created_by?: string;
  status?: ProjectStatus | 'all';
  project_type?: ProjectType;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectDetailsWithCompartments extends Project {
  boundaries: ProjectBoundary[];
  trees_count: number;
  alive_trees_count: number;
  total_hectares: number;
  total_acres: number;
  audit_history: AuditLog[];
}

// Deterministic State Machine Transition Validator
export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['submitted', 'suspended'],
  submitted: ['under_review', 'draft', 'suspended'],
  under_review: ['active', 'submitted', 'draft', 'suspended'],
  active: ['completed', 'suspended', 'under_review'],
  suspended: ['draft', 'under_review', 'active'],
  completed: ['active'], // Reopenable by administrators
};

export const projectService = {
  /**
   * Helper to check if actor has permissions to manage a project
   * (Project Owner/Creator, Org Admin/Manager/Owner, or Platform Superadmin)
   */
  async checkCanManageProject(projectId: string, actorId: string): Promise<boolean> {
    if (!actorId) return false;

    try {
      // 1. Fetch project owner & org
      const { data: project } = await supabase
        .from("projects" as any)
        .select("created_by, organization_id")
        .eq("id", projectId)
        .maybeSingle();

      if (!project) return false;
      if (project.created_by === actorId) return true;

      // 2. If organization_id is present, check org membership role
      if (project.organization_id) {
        const { data: member } = await supabase
          .from("organization_members" as any)
          .select("member_role, status")
          .eq("organization_id", project.organization_id)
          .eq("user_id", actorId)
          .maybeSingle();

        if (member && member.status === "active" && ["owner", "admin", "manager"].includes(member.member_role)) {
          return true;
        }
      }

      // 3. Platform Admin check
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("role")
        .eq("id", actorId)
        .maybeSingle();

      if (profile && profile.role === "admin") {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },

  /**
   * 1. CREATE PROJECT
   * Creates a master afforestation project linked to an organization or authenticated user
   */
  async createProject(payload: CreateProjectPayload): Promise<{
    success: boolean;
    project?: Project;
    error?: string;
  }> {
    try {
      if (!payload.name || payload.name.trim().length === 0) {
        return { success: false, error: "Project name is required" };
      }
      if (payload.target_trees <= 0) {
        return { success: false, error: "Target trees must be greater than 0" };
      }

      const initialStatus: ProjectStatus = payload.status || 'draft';

      let centroidLat = payload.centroid_latitude || null;
      let centroidLng = payload.centroid_longitude || null;
      let initialAreaHa = payload.target_area_hectares || 0;

      // If initial boundary points provided, validate and extract centroid + area
      let validatedGeoJson: any = null;
      let areaSqm = 0;
      let areaAcres = 0;

      if (payload.initial_boundary && payload.initial_boundary.points.length >= 3) {
        const boundaryVal = validateGeodeticBoundary(payload.initial_boundary.points);
        if (boundaryVal.isValid) {
          centroidLat = boundaryVal.centroid[0];
          centroidLng = boundaryVal.centroid[1];
          initialAreaHa = boundaryVal.hectares;
          areaSqm = boundaryVal.areaSqMeters;
          areaAcres = boundaryVal.acres;
          validatedGeoJson = boundaryVal.geoJsonPolygon;
        }
      }

      // Insert Project record
      const { data: projectData, error: projectError } = await supabase
        .from("projects" as any)
        .insert({
          organization_id: payload.organization_id || null,
          name: payload.name.trim(),
          description: payload.description || null,
          project_type: payload.project_type || 'community',
          status: initialStatus,
          target_trees: payload.target_trees,
          planted_trees: 0,
          target_area_hectares: initialAreaHa,
          location_name: payload.location_name || null,
          centroid_latitude: centroidLat,
          centroid_longitude: centroidLng,
          species_list: payload.species_list || [],
          start_date: payload.start_date || new Date().toISOString().split("T")[0],
          end_date: payload.end_date || null,
          created_by: payload.created_by || null,
        })
        .select("*")
        .single();

      if (projectError || !projectData) {
        return { success: false, error: projectError?.message || "Failed to insert project record" };
      }

      const createdProject = projectData as unknown as Project;

      // Insert initial boundary compartment if available
      if (validatedGeoJson) {
        await supabase.from("project_boundaries" as any).insert({
          project_id: createdProject.id,
          boundary_name: payload.initial_boundary?.boundary_name || "Primary Planting Zone",
          compartment_code: payload.initial_boundary?.compartment_code || "COMP-A1",
          boundary_type: payload.initial_boundary?.boundary_type || "planting_zone",
          geometry_geojson: validatedGeoJson,
          area_sqm: areaSqm,
          area_hectares: initialAreaHa,
          area_acres: areaAcres,
          target_species: payload.species_list || [],
        });
      }

      // Record in audit_logs
      await supabase.from("audit_logs" as any).insert({
        actor_id: payload.created_by || null,
        action: "CREATE_PROJECT",
        entity_type: "projects",
        entity_id: createdProject.id,
        new_status: initialStatus,
        new_state: {
          name: createdProject.name,
          target_trees: createdProject.target_trees,
          organization_id: createdProject.organization_id,
        },
      });

      return { success: true, project: createdProject };
    } catch (err: any) {
      return { success: false, error: err?.message || "Unexpected error during project creation" };
    }
  },

  /**
   * 2. GET PROJECTS (WITH FILTERING & PAGINATION)
   */
  async getProjects(filters?: ProjectFilterParams): Promise<{
    projects: Project[];
    total: number;
    error?: string;
  }> {
    try {
      let query = supabase
        .from("projects" as any)
        .select("*", { count: "exact" });

      if (filters?.organization_id) {
        query = query.eq("organization_id", filters.organization_id);
      }

      if (filters?.created_by) {
        query = query.eq("created_by", filters.created_by);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.project_type) {
        query = query.eq("project_type", filters.project_type);
      }

      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const q = `%${filters.searchQuery.trim()}%`;
        query = query.or(`name.ilike.${q},location_name.ilike.${q},description.ilike.${q}`);
      }

      query = query.order("created_at", { ascending: false });

      if (filters?.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, count, error } = await query;

      if (error) {
        return { projects: [], total: 0, error: error.message };
      }

      return {
        projects: (data || []) as unknown as Project[],
        total: count || (data?.length ?? 0),
      };
    } catch (err: any) {
      return { projects: [], total: 0, error: err?.message || "Failed to fetch projects" };
    }
  },

  /**
   * 3. GET PROJECT DETAILS WITH BOUNDARIES, TREES & AUDIT HISTORY
   */
  async getProjectDetails(projectId: string): Promise<ProjectDetailsWithCompartments | null> {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects" as any)
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError || !projectData) return null;

      const [boundariesRes, treesRes, auditRes] = await Promise.all([
        supabase
          .from("project_boundaries" as any)
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("trees" as any)
          .select("id, status")
          .eq("project_id", projectId),
        supabase
          .from("audit_logs" as any)
          .select("*")
          .eq("entity_id", projectId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const boundaries = (boundariesRes.data || []) as unknown as ProjectBoundary[];
      const trees = treesRes.data || [];
      const aliveCount = trees.filter((t: any) => t.status === "alive" || t.status === "thriving").length;

      const totalHectares = boundaries.reduce((sum, b) => sum + (Number(b.area_hectares) || 0), 0);
      const totalAcres = boundaries.reduce((sum, b) => sum + (Number(b.area_acres) || ((Number(b.area_hectares) || 0) * 2.47105)), 0);

      return {
        ...(projectData as unknown as Project),
        boundaries,
        trees_count: trees.length,
        alive_trees_count: aliveCount,
        total_hectares: Number(totalHectares.toFixed(3)),
        total_acres: Number(totalAcres.toFixed(2)),
        audit_history: (auditRes.data || []) as unknown as AuditLog[],
      };
    } catch (err) {
      console.error("Failed to load project details:", err);
      return null;
    }
  },

  /**
   * 4. UPDATE PROJECT PROFILE & TARGETS
   */
  async updateProjectProfile(
    projectId: string,
    updates: UpdateProjectPayload,
    actorId?: string
  ): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("projects" as any)
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return { success: false, error: "Project not found" };
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updatePayload.name = updates.name.trim();
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.project_type !== undefined) updatePayload.project_type = updates.project_type;
      if (updates.target_trees !== undefined) updatePayload.target_trees = updates.target_trees;
      if (updates.target_area_hectares !== undefined) updatePayload.target_area_hectares = updates.target_area_hectares;
      if (updates.location_name !== undefined) updatePayload.location_name = updates.location_name;
      if (updates.centroid_latitude !== undefined) updatePayload.centroid_latitude = updates.centroid_latitude;
      if (updates.centroid_longitude !== undefined) updatePayload.centroid_longitude = updates.centroid_longitude;
      if (updates.species_list !== undefined) updatePayload.species_list = updates.species_list;
      if (updates.start_date !== undefined) updatePayload.start_date = updates.start_date;
      if (updates.end_date !== undefined) updatePayload.end_date = updates.end_date;

      const { data, error } = await supabase
        .from("projects" as any)
        .update(updatePayload)
        .eq("id", projectId)
        .select("*")
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to update project" };
      }

      // Log update in audit_logs
      await supabase.from("audit_logs" as any).insert({
        actor_id: actorId || null,
        action: "UPDATE_PROJECT_PROFILE",
        entity_type: "projects",
        entity_id: projectId,
        previous_state: existing,
        new_state: data,
      });

      return { success: true, project: data as unknown as Project };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update project profile" };
    }
  },

  /**
   * 5. TRANSITION PROJECT STATUS (STATE MACHINE)
   */
  async transitionProjectStatus(
    projectId: string,
    targetStatus: ProjectStatus,
    actorId?: string,
    reason?: string
  ): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data: projectData, error: fetchError } = await supabase
        .from("projects" as any)
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (fetchError || !projectData) {
        return { success: false, error: "Project not found" };
      }

      const currentStatus = projectData.status as ProjectStatus;

      if (currentStatus === targetStatus) {
        return { success: true, project: projectData as unknown as Project };
      }

      // Check valid transitions
      const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        return {
          success: false,
          error: `Illegal state transition from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowed.join(", ")}]`,
        };
      }

      // Try RPC first for database-enforced security definer transition
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "transition_project_status" as any,
        {
          p_project_id: projectId,
          p_new_status: targetStatus,
          p_actor_id: actorId || null,
          p_reason: reason || null,
        }
      );

      if (!rpcError && rpcData?.success) {
        const { data: updated } = await supabase
          .from("projects" as any)
          .select("*")
          .eq("id", projectId)
          .single();

        return { success: true, project: updated as unknown as Project };
      }

      // Fallback: direct update + audit log
      const { data: updated, error: updateError } = await supabase
        .from("projects" as any)
        .update({
          status: targetStatus,
          verification_notes: reason || projectData.verification_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select("*")
        .single();

      if (updateError || !updated) {
        return { success: false, error: updateError?.message || "Failed to update status" };
      }

      await supabase.from("audit_logs" as any).insert({
        actor_id: actorId || null,
        action: "PROJECT_STATUS_TRANSITION",
        entity_type: "projects",
        entity_id: projectId,
        previous_status: currentStatus,
        new_status: targetStatus,
        new_state: { reason, timestamp: new Date().toISOString() },
      });

      return { success: true, project: updated as unknown as Project };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to transition project status" };
    }
  },

  /**
   * 6. SAVE OR UPDATE PROJECT BOUNDARY (MULTI-PLOT COMPARTMENT)
   */
  async saveProjectBoundary(
    projectId: string,
    input: ProjectBoundaryInput,
    actorId?: string
  ): Promise<{ success: boolean; boundary?: ProjectBoundary; error?: string }> {
    try {
      if (!input.points || input.points.length < 3) {
        return { success: false, error: "A boundary polygon requires at least 3 GPS vertices" };
      }

      const validation = validateGeodeticBoundary(input.points);
      if (!validation.isValid) {
        return { success: false, error: validation.errorMessage || "Invalid polygon geometry" };
      }

      const boundaryData: Record<string, any> = {
        project_id: projectId,
        boundary_name: input.boundary_name.trim(),
        compartment_code: input.compartment_code?.trim() || null,
        target_species: input.target_species || [],
        boundary_type: input.boundary_type || "planting_zone",
        geometry_geojson: validation.geoJsonPolygon,
        area_sqm: validation.areaSqMeters,
        area_hectares: validation.hectares,
        area_acres: validation.acres,
        kml_raw_content: input.kml_raw_content || null,
        updated_at: new Date().toISOString(),
      };

      let resultBoundary: ProjectBoundary;

      if (input.id) {
        // Update existing boundary
        const { data, error } = await supabase
          .from("project_boundaries" as any)
          .update(boundaryData)
          .eq("id", input.id)
          .eq("project_id", projectId)
          .select("*")
          .single();

        if (error || !data) {
          return { success: false, error: error?.message || "Failed to update boundary" };
        }
        resultBoundary = data as unknown as ProjectBoundary;
      } else {
        // Create new compartment boundary
        const { data, error } = await supabase
          .from("project_boundaries" as any)
          .insert(boundaryData)
          .select("*")
          .single();

        if (error || !data) {
          return { success: false, error: error?.message || "Failed to create boundary" };
        }
        resultBoundary = data as unknown as ProjectBoundary;
      }

      // Re-sync project centroid and total target hectares
      const { data: allBoundaries } = await supabase
        .from("project_boundaries" as any)
        .select("area_hectares, area_acres")
        .eq("project_id", projectId);

      const totalHa = (allBoundaries || []).reduce(
        (acc: number, b: any) => acc + (Number(b.area_hectares) || 0),
        0
      );

      await supabase
        .from("projects" as any)
        .update({
          target_area_hectares: Number(totalHa.toFixed(3)),
          centroid_latitude: validation.centroid[0],
          centroid_longitude: validation.centroid[1],
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      // Audit log
      await supabase.from("audit_logs" as any).insert({
        actor_id: actorId || null,
        action: input.id ? "UPDATE_PROJECT_BOUNDARY" : "CREATE_PROJECT_BOUNDARY",
        entity_type: "project_boundaries",
        entity_id: resultBoundary.id,
        new_state: {
          project_id: projectId,
          compartment: resultBoundary.compartment_code,
          hectares: resultBoundary.area_hectares,
        },
      });

      return { success: true, boundary: resultBoundary };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to save project boundary" };
    }
  },

  /**
   * 7. DELETE PROJECT BOUNDARY
   */
  async deleteProjectBoundary(
    boundaryId: string,
    projectId: string,
    actorId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("project_boundaries" as any)
        .delete()
        .eq("id", boundaryId)
        .eq("project_id", projectId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Recalculate remaining project area
      const { data: remaining } = await supabase
        .from("project_boundaries" as any)
        .select("area_hectares")
        .eq("project_id", projectId);

      const totalHa = (remaining || []).reduce(
        (acc: number, b: any) => acc + (Number(b.area_hectares) || 0),
        0
      );

      await supabase
        .from("projects" as any)
        .update({
          target_area_hectares: Number(totalHa.toFixed(3)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      await supabase.from("audit_logs" as any).insert({
        actor_id: actorId || null,
        action: "DELETE_PROJECT_BOUNDARY",
        entity_type: "project_boundaries",
        entity_id: boundaryId,
        new_state: { project_id: projectId, remaining_count: remaining?.length || 0 },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to delete boundary" };
    }
  },

  /**
   * 8. REVIEW PROJECT SUBMISSION (ADMIN / GOVERNMENT AUDITOR WORKFLOW)
   */
  async reviewProjectSubmission(
    projectId: string,
    decision: 'approve' | 'reject' | 'request_evidence',
    reviewerId: string,
    notes?: string
  ): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      let targetStatus: ProjectStatus;
      switch (decision) {
        case 'approve':
          targetStatus = 'active';
          break;
        case 'reject':
          targetStatus = 'suspended';
          break;
        case 'request_evidence':
        default:
          targetStatus = 'under_review';
          break;
      }

      const { data, error } = await supabase
        .from("projects" as any)
        .update({
          status: targetStatus,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          verification_notes: notes || `Project review decision: ${decision}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select("*")
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to process review" };
      }

      // Log review in audit_logs
      await supabase.from("audit_logs" as any).insert({
        actor_id: reviewerId,
        action: "PROJECT_AUDIT_REVIEW",
        entity_type: "projects",
        entity_id: projectId,
        new_status: targetStatus,
        new_state: { decision, notes, reviewerId, timestamp: new Date().toISOString() },
      });

      return { success: true, project: data as unknown as Project };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to submit project review" };
    }
  },
};
