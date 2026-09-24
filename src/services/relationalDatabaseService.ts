import { supabase } from "@/integrations/supabase/client";
import {
  Organization,
  OrganizationMember,
  Project,
  ProjectBoundary,
  Tree,
  TreePhoto,
  TreeObservation,
  MonitoringTask,
  Notification,
  AuditLog,
} from "@/types/coreDatabase";

export interface OrganizationDetail extends Organization {
  members: OrganizationMember[];
  projects: Project[];
}

export interface ProjectHierarchy extends Project {
  boundaries: ProjectBoundary[];
  trees: Tree[];
  total_trees_count: number;
  alive_trees_count: number;
}

export interface TreeDetailWithHistory extends Tree {
  photos: TreePhoto[];
  observations: TreeObservation[];
  tasks: MonitoringTask[];
}

export interface UserTaskQueue {
  pending_tasks: MonitoringTask[];
  in_progress_tasks: MonitoringTask[];
  completed_tasks: MonitoringTask[];
  total_assigned: number;
}

export const relationalDatabaseService = {
  /**
   * Fetches full organization details including members and associated afforestation projects
   */
  async getOrganizationDetails(organizationId: string): Promise<OrganizationDetail | null> {
    const { data: orgData, error: orgError } = await supabase
      .from("organizations" as any)
      .select("*")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgError || !orgData) return null;

    const [membersRes, projectsRes] = await Promise.all([
      supabase
        .from("organization_members" as any)
        .select("*")
        .eq("organization_id", organizationId),
      supabase
        .from("projects" as any)
        .select("*")
        .eq("organization_id", organizationId),
    ]);

    return {
      ...(orgData as unknown as Organization),
      members: (membersRes.data || []) as unknown as OrganizationMember[],
      projects: (projectsRes.data || []) as unknown as Project[],
    };
  },

  /**
   * Fetches project hierarchy including spatial boundaries and all individual trees
   */
  async getProjectHierarchy(projectId: string): Promise<ProjectHierarchy | null> {
    const { data: projData, error: projError } = await supabase
      .from("projects" as any)
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projError || !projData) return null;

    const [boundariesRes, treesRes] = await Promise.all([
      supabase
        .from("project_boundaries" as any)
        .select("*")
        .eq("project_id", projectId),
      supabase
        .from("trees" as any)
        .select("*")
        .eq("project_id", projectId),
    ]);

    const trees = (treesRes.data || []) as unknown as Tree[];
    const aliveCount = trees.filter((t) => t.status === "alive" || t.status === "thriving").length;

    return {
      ...(projData as unknown as Project),
      boundaries: (boundariesRes.data || []) as unknown as ProjectBoundary[],
      trees,
      total_trees_count: trees.length,
      alive_trees_count: aliveCount,
    };
  },

  /**
   * Fetches tree biometrics, evidence photos, growth observations, and pending tasks
   */
  async getTreeDetailWithHistory(treeId: string): Promise<TreeDetailWithHistory | null> {
    const { data: treeData, error: treeError } = await supabase
      .from("trees" as any)
      .select("*")
      .eq("id", treeId)
      .maybeSingle();

    if (treeError || !treeData) return null;

    const [photosRes, obsRes, tasksRes] = await Promise.all([
      supabase
        .from("tree_photos" as any)
        .select("*")
        .eq("tree_id", treeId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tree_observations" as any)
        .select("*")
        .eq("tree_id", treeId)
        .order("observation_date", { ascending: false }),
      supabase
        .from("monitoring_tasks" as any)
        .select("*")
        .eq("tree_id", treeId),
    ]);

    return {
      ...(treeData as unknown as Tree),
      photos: (photosRes.data || []) as unknown as TreePhoto[],
      observations: (obsRes.data || []) as unknown as TreeObservation[],
      tasks: (tasksRes.data || []) as unknown as MonitoringTask[],
    };
  },

  /**
   * Retrieves organized task queue for field workers
   */
  async getFieldWorkerTaskQueue(userId: string): Promise<UserTaskQueue> {
    const { data, error } = await supabase
      .from("monitoring_tasks" as any)
      .select("*")
      .eq("assigned_to", userId)
      .order("due_date", { ascending: true });

    if (error || !data) {
      return {
        pending_tasks: [],
        in_progress_tasks: [],
        completed_tasks: [],
        total_assigned: 0,
      };
    }

    const tasks = data as unknown as MonitoringTask[];
    return {
      pending_tasks: tasks.filter((t) => t.status === "pending"),
      in_progress_tasks: tasks.filter((t) => t.status === "in_progress"),
      completed_tasks: tasks.filter((t) => t.status === "completed"),
      total_assigned: tasks.length,
    };
  },

  /**
   * Dispatches immutable audit logs for administrative / state transitions
   */
  async logAuditEvent(entry: Omit<AuditLog, "id" | "created_at">): Promise<boolean> {
    const { error } = await supabase.from("audit_logs" as any).insert({
      actor_id: entry.actor_id,
      actor_email: entry.actor_email,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      previous_state: entry.previous_state || null,
      new_state: entry.new_state || null,
      previous_status: entry.previous_status || null,
      new_status: entry.new_status || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    });

    return !error;
  },
};
