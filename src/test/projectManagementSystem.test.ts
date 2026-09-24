import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  projectService,
  ALLOWED_STATUS_TRANSITIONS,
  CreateProjectPayload,
  ProjectBoundaryInput,
} from "@/services/projectService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe("Phase 3 Task 12 — Real Project Management System & Lifecycle State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Project Creation & Validation", () => {
    it("rejects project creation when name is empty", async () => {
      const result = await projectService.createProject({
        name: "",
        project_type: "community",
        target_trees: 500,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project name is required");
    });

    it("rejects project creation when target trees is less than or equal to 0", async () => {
      const result = await projectService.createProject({
        name: "Western Ghats Miyawaki",
        project_type: "urban_greenery",
        target_trees: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Target trees must be greater than 0");
    });

    it("successfully creates project linked to organization and user with audit log", async () => {
      const mockCreatedProject = {
        id: "proj-uuid-101",
        name: "Sahyadri Sacred Grove Restoration",
        description: "Restoring native endemic tree biodiversity in Pune district",
        project_type: "reforestation",
        organization_id: "org-uuid-101",
        status: "draft",
        target_trees: 5000,
        planted_trees: 0,
        target_area_hectares: 0,
        location_name: "Pune, Maharashtra",
        species_list: ["Neem", "Banyan", "Peepal", "Mahua"],
        start_date: "2026-10-01",
        created_by: "user-uuid-999",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProjectInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockCreatedProject, error: null }),
        }),
      });

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return { insert: mockProjectInsert };
        }
        if (table === "audit_logs") {
          return { insert: mockAuditInsert };
        }
        return { insert: vi.fn(), select: vi.fn(), update: vi.fn(), delete: vi.fn() };
      });

      const payload: CreateProjectPayload = {
        name: "Sahyadri Sacred Grove Restoration",
        description: "Restoring native endemic tree biodiversity in Pune district",
        project_type: "reforestation",
        organization_id: "org-uuid-101",
        target_trees: 5000,
        location_name: "Pune, Maharashtra",
        species_list: ["Neem", "Banyan", "Peepal", "Mahua"],
        start_date: "2026-10-01",
        created_by: "user-uuid-999",
      };

      const result = await projectService.createProject(payload);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      if (result.project) {
        expect(result.project.name).toBe("Sahyadri Sacred Grove Restoration");
        expect(result.project.organization_id).toBe("org-uuid-101");
        expect(result.project.status).toBe("draft");
        expect(result.project.target_trees).toBe(5000);
      }
      expect(mockProjectInsert).toHaveBeenCalled();
      expect(mockAuditInsert).toHaveBeenCalled();
    });

    it("creates project with initial geodetic boundary and computes area in hectares", async () => {
      const validPoints: [number, number][] = [
        [18.5204, 73.8567],
        [18.5214, 73.8567],
        [18.5214, 73.8577],
        [18.5204, 73.8577],
      ];

      const mockCreated = {
        id: "proj-with-boundary-1",
        name: "Khandala Agroforestry Plot",
        project_type: "agroforestry",
        target_trees: 1500,
        centroid_latitude: 18.5209,
        centroid_longitude: 73.8572,
        target_area_hectares: 1.15,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockBoundaryInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
              }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return { insert: mockBoundaryInsert };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { insert: vi.fn(), select: vi.fn(), update: vi.fn(), delete: vi.fn() };
      });

      const payload: CreateProjectPayload = {
        name: "Khandala Agroforestry Plot",
        project_type: "agroforestry",
        target_trees: 1500,
        initial_boundary: {
          points: validPoints,
          boundary_name: "Zone A1",
          compartment_code: "COMP-A1",
          boundary_type: "planting_zone",
        },
      };

      const result = await projectService.createProject(payload);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      if (result.project) {
        expect(result.project.centroid_latitude).toBeCloseTo(18.5209, 3);
        expect(result.project.centroid_longitude).toBeCloseTo(73.8572, 3);
        expect(result.project.target_area_hectares).toBeGreaterThan(0);
      }
      expect(mockBoundaryInsert).toHaveBeenCalled();
    });
  });

  describe("2. Project Queries & Filtering", () => {
    it("fetches list of projects with status and type filters", async () => {
      const mockProjects = [
        { id: "p1", name: "Sahyadri 1", status: "active", project_type: "reforestation" },
        { id: "p2", name: "Sahyadri 2", status: "active", project_type: "reforestation" },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockProjects, count: 2, error: null })),
      };

      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      const res = await projectService.getProjects({
        status: "active",
        project_type: "reforestation",
        searchQuery: "Sahyadri",
      });

      expect(res).toBeDefined();
      expect(res.projects.length).toBe(2);
      expect(res.total).toBe(2);
    });

    it("fetches complete project details with boundaries and metrics", async () => {
      const mockProject = {
        id: "mock-proj-1",
        name: "Western Ghats Ecological Corridor",
        target_trees: 10000,
        planted_trees: 4500,
        status: "active",
      };

      const mockBoundaries = [
        { id: "b1", boundary_name: "Zone A", area_hectares: 4.5, area_acres: 11.12 },
        { id: "b2", boundary_name: "Buffer Zone", area_hectares: 2.0, area_acres: 4.94 },
      ];

      const mockTrees = [
        { id: "t1", status: "alive" },
        { id: "t2", status: "thriving" },
        { id: "t3", status: "dead" },
      ];

      const mockAudits = [
        { id: "a1", action: "CREATE_PROJECT", created_at: new Date().toISOString() },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
              }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockBoundaries, error: null }),
              }),
            }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
            }),
          };
        }
        if (table === "audit_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockAudits, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const details = await projectService.getProjectDetails("mock-proj-1");

      expect(details).toBeDefined();
      if (details) {
        expect(details.id).toBe("mock-proj-1");
        expect(details.boundaries.length).toBe(2);
        expect(details.trees_count).toBe(3);
        expect(details.alive_trees_count).toBe(2);
        expect(details.total_hectares).toBe(6.5);
        expect(details.audit_history.length).toBe(1);
      }
    });
  });

  describe("3. Lifecycle State Machine Transitions", () => {
    it("verifies allowed state machine transitions graph", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.draft).toContain("submitted");
      expect(ALLOWED_STATUS_TRANSITIONS.draft).toContain("suspended");
      expect(ALLOWED_STATUS_TRANSITIONS.draft).not.toContain("active");
      expect(ALLOWED_STATUS_TRANSITIONS.draft).not.toContain("completed");

      expect(ALLOWED_STATUS_TRANSITIONS.submitted).toContain("under_review");
      expect(ALLOWED_STATUS_TRANSITIONS.under_review).toContain("active");
      expect(ALLOWED_STATUS_TRANSITIONS.active).toContain("completed");
      expect(ALLOWED_STATUS_TRANSITIONS.active).toContain("suspended");
    });

    it("rejects illegal transitions according to state machine", async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "proj-draft-1",
                status: "draft",
                name: "Draft Plot",
              },
              error: null,
            }),
          }),
        }),
      });

      // Attempt illegal transition: draft -> completed directly
      const result = await projectService.transitionProjectStatus(
        "proj-draft-1",
        "completed",
        "actor-uuid-1",
        "Attempting premature completion"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Illegal state transition");
    });

    it("allows valid lifecycle transition and updates verification notes", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "proj-submitted-1",
                    status: "submitted",
                    name: "Submitted Project",
                  },
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "proj-submitted-1",
                    status: "under_review",
                    name: "Submitted Project",
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "proj-submitted-1",
                      status: "under_review",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { select: vi.fn() };
      });

      (supabase.rpc as any).mockResolvedValue({
        data: { success: true, project_id: "proj-submitted-1", new_status: "under_review" },
        error: null,
      });

      const result = await projectService.transitionProjectStatus(
        "proj-submitted-1",
        "under_review",
        "auditor-uuid-1",
        "Field inspection initiated"
      );

      expect(result.success).toBe(true);
      expect(result.project?.status).toBe("under_review");
    });
  });

  describe("4. Multi-Plot Boundary Compartment Management", () => {
    it("rejects boundary with fewer than 3 GPS vertices", async () => {
      const invalidBoundary: ProjectBoundaryInput = {
        boundary_name: "Malformed Plot",
        boundary_type: "planting_zone",
        points: [[18.5204, 73.8567]],
      };

      const result = await projectService.saveProjectBoundary(
        "proj-uuid-1",
        invalidBoundary
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("requires at least 3 GPS vertices");
    });

    it("computes geodesic polygon hectares and saves compartment", async () => {
      const validPoints: [number, number][] = [
        [18.5200, 73.8560],
        [18.5220, 73.8560],
        [18.5220, 73.8580],
        [18.5200, 73.8580],
      ];

      const mockSavedBoundary = {
        id: "bound-new-1",
        project_id: "proj-uuid-1",
        boundary_name: "Compartment B2 (Buffer Zone)",
        compartment_code: "COMP-B2",
        boundary_type: "buffer_zone",
        area_hectares: 4.88,
        area_acres: 12.06,
        created_at: new Date().toISOString(),
      };

      const mockBoundaryInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockSavedBoundary, error: null }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "project_boundaries") {
          return {
            insert: mockBoundaryInsert,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ area_hectares: 4.88, area_acres: 12.06 }],
                error: null,
              }),
            }),
          };
        }
        if (table === "projects") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { insert: vi.fn(), select: vi.fn() };
      });

      const boundaryInput: ProjectBoundaryInput = {
        boundary_name: "Compartment B2 (Buffer Zone)",
        compartment_code: "COMP-B2",
        boundary_type: "buffer_zone",
        target_species: ["Bamboo", "Teak"],
        points: validPoints,
      };

      const result = await projectService.saveProjectBoundary(
        "proj-uuid-1",
        boundaryInput,
        "user-uuid-1"
      );

      expect(result.success).toBe(true);
      expect(result.boundary).toBeDefined();
      if (result.boundary) {
        expect(result.boundary.boundary_name).toBe("Compartment B2 (Buffer Zone)");
        expect(result.boundary.compartment_code).toBe("COMP-B2");
        expect(result.boundary.boundary_type).toBe("buffer_zone");
        expect(result.boundary.area_hectares).toBeGreaterThan(0);
        expect(result.boundary.area_acres).toBeGreaterThan(0);
      }
    });

    it("deletes boundary compartment and recalculates project area", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "project_boundaries") {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ area_hectares: 2.5 }],
                error: null,
              }),
            }),
          };
        }
        if (table === "projects") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { delete: vi.fn() };
      });

      const result = await projectService.deleteProjectBoundary(
        "boundary-uuid-99",
        "proj-uuid-1",
        "user-uuid-1"
      );

      expect(result.success).toBe(true);
    });
  });

  describe("5. Administrative Review & Approval Workflow", () => {
    it("processes approval decision transitioning project to active", async () => {
      const mockActiveProject = {
        id: "proj-review-1",
        status: "active",
        reviewed_by: "gov-auditor-101",
        verification_notes: "Complies with regional afforestation standards",
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockActiveProject, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { update: vi.fn() };
      });

      const result = await projectService.reviewProjectSubmission(
        "proj-review-1",
        "approve",
        "gov-auditor-101",
        "Complies with regional afforestation standards"
      );

      expect(result.success).toBe(true);
      expect(result.project?.status).toBe("active");
      expect(result.project?.reviewed_by).toBe("gov-auditor-101");
      expect(result.project?.verification_notes).toBe("Complies with regional afforestation standards");
    });

    it("processes rejection decision transitioning project to suspended", async () => {
      const mockSuspendedProject = {
        id: "proj-review-2",
        status: "suspended",
        reviewed_by: "gov-auditor-102",
        verification_notes: "Cadastral boundary overlaps with designated highway corridor",
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockSuspendedProject, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { update: vi.fn() };
      });

      const result = await projectService.reviewProjectSubmission(
        "proj-review-2",
        "reject",
        "gov-auditor-102",
        "Cadastral boundary overlaps with designated highway corridor"
      );

      expect(result.success).toBe(true);
      expect(result.project?.status).toBe("suspended");
      expect(result.project?.verification_notes).toContain("highway corridor");
    });
  });
});
