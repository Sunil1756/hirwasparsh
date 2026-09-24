/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 15
 * Tree Data Model Comprehensive Test Suite
 * 
 * Validates the 9 foundational attributes:
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { treeService, ALLOWED_TREE_STATUSES } from "@/services/treeService";
import { CreateTreeInput, Tree } from "@/types/coreDatabase";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 4 Task 15 — Core Tree Data Model Specification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSampleTree: CreateTreeInput = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    project_id: "p1111111-1111-1111-1111-111111111111",
    species: "Azadirachta indica (Neem)",
    plantation_date: "2026-09-20",
    latitude: 18.5204,
    longitude: 73.8567,
    created_by: "u2222222-2222-2222-2222-222222222222",
    status: "alive",
  };

  // =========================================================================
  // 1. NINE CORE ATTRIBUTES SCHEMA & VALIDATION
  // =========================================================================
  describe("1. Validation of the 9 Core Attributes", () => {
    it("validates a compliant tree input containing all 9 core attributes", () => {
      const result = treeService.validateTreeInput(validSampleTree);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.normalizedData).toBeDefined();

      if (result.normalizedData) {
        // 1. Tree ID
        expect(result.normalizedData.id).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
        // 2. Project ID
        expect(result.normalizedData.project_id).toBe("p1111111-1111-1111-1111-111111111111");
        // 3. Species
        expect(result.normalizedData.species).toBe("Azadirachta indica (Neem)");
        // 4. Plantation Date
        expect(result.normalizedData.plantation_date).toBe("2026-09-20");
        // 5. Latitude
        expect(result.normalizedData.latitude).toBe(18.5204);
        // 6. Longitude
        expect(result.normalizedData.longitude).toBe(73.8567);
        // 7. Created by
        expect(result.normalizedData.created_by).toBe("u2222222-2222-2222-2222-222222222222");
        // 8. Initial Status
        expect(result.normalizedData.status).toBe("alive");
        // 9. Created Timestamp
        expect(result.normalizedData.created_at).toBeDefined();
        expect(new Date(result.normalizedData.created_at).getTime()).toBeGreaterThan(0);
      }
    });

    it("auto-generates Tree ID and assigns current date and status='alive' when omitted", () => {
      const minimalInput: CreateTreeInput = {
        species: "Ficus religiosa (Peepal)",
        latitude: 19.0760,
        longitude: 72.8777,
      };

      const result = treeService.validateTreeInput(minimalInput);

      expect(result.isValid).toBe(true);
      expect(result.normalizedData).toBeDefined();
      if (result.normalizedData) {
        // 1. Tree ID generated
        expect(result.normalizedData.id).toBeDefined();
        expect(result.normalizedData.id.length).toBeGreaterThan(5);
        // 2. Project ID is null for individual tree
        expect(result.normalizedData.project_id).toBeNull();
        // 3. Species
        expect(result.normalizedData.species).toBe("Ficus religiosa (Peepal)");
        // 4. Plantation date defaulted to today
        expect(result.normalizedData.plantation_date).toBe(new Date().toISOString().split("T")[0]);
        // 8. Status defaulted to 'alive'
        expect(result.normalizedData.status).toBe("alive");
      }
    });

    it("rejects tree input with empty or missing species", () => {
      const result = treeService.validateTreeInput({
        species: "   ",
        latitude: 18.5204,
        longitude: 73.8567,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Species is required and cannot be empty");
    });

    it("rejects future plantation dates", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const result = treeService.validateTreeInput({
        species: "Santalum album (Sandalwood)",
        plantation_date: futureDateStr,
        latitude: 18.5204,
        longitude: 73.8567,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Plantation date cannot be in the future");
    });

    it("rejects invalid GPS latitude out of [-90, +90] range", () => {
      const resultLow = treeService.validateTreeInput({
        species: "Mangifera indica (Mango)",
        latitude: -91.5,
        longitude: 73.8567,
      });
      expect(resultLow.isValid).toBe(false);
      expect(resultLow.errors[0]).toContain("Latitude must be a valid WGS84 coordinate between -90.0 and 90.0");

      const resultHigh = treeService.validateTreeInput({
        species: "Mangifera indica (Mango)",
        latitude: 95.0,
        longitude: 73.8567,
      });
      expect(resultHigh.isValid).toBe(false);
    });

    it("rejects invalid GPS longitude out of [-180, +180] range", () => {
      const result = treeService.validateTreeInput({
        species: "Bambusa vulgaris (Bamboo)",
        latitude: 18.5204,
        longitude: 185.0,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Longitude must be a valid WGS84 coordinate between -180.0 and 180.0");
    });

    it("enforces allowed tree statuses", () => {
      expect(ALLOWED_TREE_STATUSES).toEqual(["alive", "thriving", "stressed", "diseased", "dead", "replaced"]);

      const invalidStatusResult = treeService.validateTreeInput({
        species: "Tectona grandis (Teak)",
        latitude: 18.5204,
        longitude: 73.8567,
        status: "non_existent_status" as any,
      });

      expect(invalidStatusResult.isValid).toBe(false);
      expect(invalidStatusResult.errors[0]).toContain("Invalid tree status");
    });
  });

  // =========================================================================
  // 2. DATABASE PERSISTENCE & AUDIT LOGGING
  // =========================================================================
  describe("2. Database Persistence & Audit Lifecycle", () => {
    it("inserts validated tree record and logs PLANT_TREE to audit_logs", async () => {
      const mockInsertedTree: Tree = {
        id: "tree-persisted-1",
        project_id: "p1111111-1111-1111-1111-111111111111",
        species: "Azadirachta indica (Neem)",
        plantation_date: "2026-09-20",
        latitude: 18.5204,
        longitude: 73.8567,
        created_by: "u2222222-2222-2222-2222-222222222222",
        user_id: "u2222222-2222-2222-2222-222222222222",
        status: "alive",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tree_name: "Azadirachta indica (Neem) Tree",
        location: "18.52040, 73.85670",
        height_cm: 50,
        verification_status: "pending",
        admin_status: "pending",
        planting_type: "institutional",
        points_awarded: 10,
      };

      const mockTreeInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInsertedTree, error: null }),
        }),
      });

      const mockProjectUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            insert: mockTreeInsert,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "tree-persisted-1" }], error: null }),
            }),
          };
        }
        if (table === "projects") {
          return { update: mockProjectUpdate };
        }
        if (table === "audit_logs") {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const response = await treeService.createTree(validSampleTree, "u2222222-2222-2222-2222-222222222222");

      expect(response.success).toBe(true);
      expect(response.tree).toBeDefined();
      if (response.tree) {
        expect(response.tree.id).toBe("tree-persisted-1");
        expect(response.tree.species).toBe("Azadirachta indica (Neem)");
        expect(response.tree.latitude).toBe(18.5204);
        expect(response.tree.longitude).toBe(73.8567);
        expect(response.tree.created_by).toBe("u2222222-2222-2222-2222-222222222222");
        expect(response.tree.status).toBe("alive");
      }

      expect(mockTreeInsert).toHaveBeenCalled();
      expect(mockProjectUpdate).toHaveBeenCalled();
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PLANT_TREE",
          entity_type: "trees",
          new_status: "alive",
        })
      );
    });
  });

  // =========================================================================
  // 3. TREE QUERIES & RETRIEVAL
  // =========================================================================
  describe("3. Tree Queries & Retrieval", () => {
    it("fetches tree by ID", async () => {
      const mockTree = {
        id: "tree-100",
        species: "Madhuca longifolia (Mahua)",
        status: "thriving",
        latitude: 20.1234,
        longitude: 78.5678,
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const tree = await treeService.getTreeById("tree-100");
      expect(tree).toBeDefined();
      expect(tree?.id).toBe("tree-100");
      expect(tree?.species).toBe("Madhuca longifolia (Mahua)");
      expect(tree?.status).toBe("thriving");
    });

    it("fetches trees filtered by project and species", async () => {
      const mockTrees = [
        { id: "t1", project_id: "proj-1", species: "Neem", status: "alive" },
        { id: "t2", project_id: "proj-1", species: "Neem", status: "alive" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  ilike: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const trees = await treeService.getTreesByProject("proj-1", { status: "alive", species: "Neem" });
      expect(trees.length).toBe(2);
      expect(trees[0].species).toBe("Neem");
    });
  });

  // =========================================================================
  // 4. STATUS UPDATES & BIOMETRIC OBSERVATION LOGS
  // =========================================================================
  describe("4. Status Updates & Observation Logs", () => {
    it("updates tree status to 'thriving' and records biometric observation", async () => {
      const existingTree = { id: "tree-1", status: "alive", species: "Peepal" };
      const updatedTree = { id: "tree-1", status: "thriving", species: "Peepal" };

      const mockObsInsert = vi.fn().mockResolvedValue({ error: null });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingTree, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedTree, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "tree_observations") {
          return { insert: mockObsInsert };
        }
        if (table === "audit_logs") {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const result = await treeService.updateTreeStatus(
        "tree-1",
        "thriving",
        "usr-auditor-1",
        "Canopy diameter increased by 25cm"
      );

      expect(result.success).toBe(true);
      expect(result.tree?.status).toBe("thriving");
      expect(mockObsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tree_id: "tree-1",
          health_status: "healthy",
          condition_notes: "Canopy diameter increased by 25cm",
        })
      );
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE_TREE_STATUS",
          previous_status: "alive",
          new_status: "thriving",
        })
      );
    });
  });

  // =========================================================================
  // 5. BATCH TREE INGESTION (BULK ONBOARDING)
  // =========================================================================
  describe("5. Batch Tree Ingestion", () => {
    it("processes batch of valid tree inputs and inserts them in a single query", async () => {
      const bulkInputs: CreateTreeInput[] = [
        { species: "Teak", latitude: 18.52, longitude: 73.85, project_id: "proj-1" },
        { species: "Bamboo", latitude: 18.53, longitude: 73.86, project_id: "proj-1" },
      ];

      const mockCreated = [
        { id: "b-1", species: "Teak", latitude: 18.52, longitude: 73.85, status: "alive" },
        { id: "b-2", species: "Bamboo", latitude: 18.53, longitude: 73.86, status: "alive" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
            }),
          };
        }
        return {};
      });

      const res = await treeService.createBulkTrees(bulkInputs, "user-batch-1");

      expect(res.success).toBe(true);
      expect(res.trees.length).toBe(2);
      expect(res.errorCount).toBe(0);
    });

    it("identifies row errors in bulk inputs and filters out invalid rows", async () => {
      const mixedInputs: CreateTreeInput[] = [
        { species: "Valid Neem", latitude: 18.52, longitude: 73.85 },
        { species: "", latitude: 18.53, longitude: 73.86 }, // Invalid species
        { species: "Invalid GPS", latitude: 100.0, longitude: 73.86 }, // Invalid lat
      ];

      const mockCreated = [
        { id: "b-1", species: "Valid Neem", latitude: 18.52, longitude: 73.85, status: "alive" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
            }),
          };
        }
        return {};
      });

      const res = await treeService.createBulkTrees(mixedInputs, "user-batch-1");

      expect(res.success).toBe(true);
      expect(res.trees.length).toBe(1);
      expect(res.errorCount).toBe(2); // 2 invalid rows identified
      expect(res.errors[0]).toContain("Row 2: Species is required");
      expect(res.errors[1]).toContain("Row 3: Latitude must be a valid WGS84 coordinate");
    });
  });
});
