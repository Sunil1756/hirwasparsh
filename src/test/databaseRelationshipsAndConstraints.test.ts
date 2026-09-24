import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  relationalDatabaseService,
  OrganizationDetail,
  ProjectHierarchy,
  TreeDetailWithHistory,
} from "../services/relationalDatabaseService";
import { supabase } from "../integrations/supabase/client";

// Mock Supabase client
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 2 — Relationships & Constraints Engine (Task 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Organization -> Member -> Project Relational Assembly", () => {
    it("retrieves full organization details with joined members and projects", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Sahyadri Bio-Reserve Trust",
        type: "ngo",
        is_verified: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const mockMembers = [
        { id: "m-1", organization_id: "org-123", user_id: "u-1", member_role: "admin", status: "active" },
        { id: "m-2", organization_id: "org-123", user_id: "u-2", member_role: "field_worker", status: "active" },
      ];

      const mockProjects = [
        { id: "p-1", organization_id: "org-123", name: "Western Ghats Corridor", status: "active", target_trees: 1000 },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
          };
        }
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          };
        }
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const result = await relationalDatabaseService.getOrganizationDetails("org-123");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("org-123");
      expect(result?.members).toHaveLength(2);
      expect(result?.projects).toHaveLength(1);
      expect(result?.projects[0].name).toBe("Western Ghats Corridor");
    });
  });

  describe("2. Project -> Boundaries & Trees Relational Hierarchy", () => {
    it("fetches project hierarchy with spatial boundaries and computes alive tree stats", async () => {
      const mockProject = {
        id: "proj-100",
        organization_id: "org-123",
        name: "Konkan Mangrove Restoration",
        status: "active",
        target_trees: 500,
        planted_trees: 300,
      };

      const mockBoundaries = [
        { id: "b-1", project_id: "proj-100", boundary_name: "Tidal Creek Plot 1", boundary_type: "planting_zone" },
      ];

      const mockTrees = [
        { id: "t-1", project_id: "proj-100", species: "Rhizophora mucronata", status: "alive" },
        { id: "t-2", project_id: "proj-100", species: "Avicennia marina", status: "thriving" },
        { id: "t-3", project_id: "proj-100", species: "Sonneratia alba", status: "dead" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockBoundaries, error: null }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const result = await relationalDatabaseService.getProjectHierarchy("proj-100");
      expect(result).not.toBeNull();
      expect(result?.boundaries).toHaveLength(1);
      expect(result?.trees).toHaveLength(3);
      expect(result?.total_trees_count).toBe(3);
      expect(result?.alive_trees_count).toBe(2); // t-1 (alive) + t-2 (thriving)
    });
  });

  describe("3. Tree -> Biometrics, Photos & Observations History", () => {
    it("assembles comprehensive tree history with audit photos and observations", async () => {
      const mockTree = {
        id: "tree-teak-1",
        tree_name: "Mahavriksha 1",
        species: "Tectona grandis",
        height_cm: 180,
        status: "alive",
      };

      const mockPhotos = [
        { id: "p-1", tree_id: "tree-teak-1", photo_url: "https://treebank.internal/p1.jpg", evidence_type: "planting_photo" },
      ];

      const mockObservations = [
        { id: "obs-1", tree_id: "tree-teak-1", height_cm: 180, health_status: "healthy", observation_date: "2026-09-01" },
      ];

      const mockTasks = [
        { id: "task-1", tree_id: "tree-teak-1", task_type: "growth_audit", status: "pending" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
          };
        }
        if (table === "tree_photos") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
          };
        }
        if (table === "tree_observations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockObservations, error: null }),
          };
        }
        if (table === "monitoring_tasks") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const result = await relationalDatabaseService.getTreeDetailWithHistory("tree-teak-1");
      expect(result).not.toBeNull();
      expect(result?.photos).toHaveLength(1);
      expect(result?.observations).toHaveLength(1);
      expect(result?.tasks).toHaveLength(1);
      expect(result?.observations[0].health_status).toBe("healthy");
    });
  });

  describe("4. Field Worker Monitoring Task Queues", () => {
    it("partitions worker task queues by status and priority", async () => {
      const mockTasks = [
        { id: "t-1", assigned_to: "worker-1", status: "pending", priority: "urgent", due_date: "2026-09-26" },
        { id: "t-2", assigned_to: "worker-1", status: "in_progress", priority: "medium", due_date: "2026-09-28" },
        { id: "t-3", assigned_to: "worker-1", status: "completed", priority: "low", due_date: "2026-09-20" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "monitoring_tasks") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const queue = await relationalDatabaseService.getFieldWorkerTaskQueue("worker-1");
      expect(queue.total_assigned).toBe(3);
      expect(queue.pending_tasks).toHaveLength(1);
      expect(queue.in_progress_tasks).toHaveLength(1);
      expect(queue.completed_tasks).toHaveLength(1);
      expect(queue.pending_tasks[0].priority).toBe("urgent");
    });
  });

  describe("5. Immutable Audit Log Dispatcher", () => {
    it("successfully posts state transition audit records", async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "audit_logs") {
          return { insert: insertMock };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const success = await relationalDatabaseService.logAuditEvent({
        actor_id: "admin-01",
        actor_email: "superadmin@hirwasparsh.internal",
        action: "UPDATE_PROJECT_STATUS",
        entity_type: "project",
        entity_id: "proj-100",
        previous_status: "draft",
        new_status: "active",
        previous_state: { status: "draft" },
        new_state: { status: "active" },
      });

      expect(success).toBe(true);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE_PROJECT_STATUS",
          entity_type: "project",
          entity_id: "proj-100",
          previous_status: "draft",
          new_status: "active",
        })
      );
    });
  });
});
