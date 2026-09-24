/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 18
 * Automated Unit & Integration Test Suite for Tree ID & 7-Stage Registration Pipeline
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  treeRegistrationService,
  TreeRegistrationService,
  GE_TREE_CODE_REGEX,
} from "../services/treeRegistrationService";
import { supabase } from "../integrations/supabase/client";
import { photoEvidenceService } from "../services/photoEvidenceService";
import { gpsRegistrationService } from "../services/gpsRegistrationService";

// Mock Supabase
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    },
  };
});

// Mock Photo Evidence Service
vi.mock("../services/photoEvidenceService", () => {
  return {
    photoEvidenceService: {
      uploadPhotoEvidence: vi.fn(),
    },
  };
});

describe("Phase 4 Task 18 — Tree ID & Registration Pipeline Test Suite", () => {
  let service: TreeRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TreeRegistrationService();
  });

  describe("1. Unique Green Enlightenment Tree Identifier (GE-YYYY-NNNNNN)", () => {
    it("generates correctly formatted tree identifiers with 6-digit zero padding", () => {
      expect(service.generateTreeCode(1, 2026)).toBe("GE-2026-000001");
      expect(service.generateTreeCode(42, 2026)).toBe("GE-2026-000042");
      expect(service.generateTreeCode(9999, 2026)).toBe("GE-2026-009999");
      expect(service.generateTreeCode(100000, 2026)).toBe("GE-2026-100000");
    });

    it("validates compliant GE tree codes and rejects invalid formats", () => {
      expect(service.validateTreeCode("GE-2026-000001")).toBe(true);
      expect(service.validateTreeCode("GE-2025-999999")).toBe(true);
      expect(service.validateTreeCode("GE-2026-123456")).toBe(true);

      // Invalid formats
      expect(service.validateTreeCode("GE-26-000001")).toBe(false); // 2-digit year
      expect(service.validateTreeCode("TREE-2026-000001")).toBe(false); // Wrong prefix
      expect(service.validateTreeCode("GE-2026-1")).toBe(false); // Unpadded sequence
      expect(service.validateTreeCode("GE-2026-0000001")).toBe(false); // 7 digits
      expect(service.validateTreeCode("")).toBe(false);
      expect(service.validateTreeCode(null)).toBe(false);
      expect(service.validateTreeCode(undefined)).toBe(false);
    });

    it("parses valid tree codes into constituent year and sequence numbers", () => {
      const parsed = service.parseTreeCode("GE-2026-000042");
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(2026);
      expect(parsed?.sequence).toBe(42);

      expect(service.parseTreeCode("invalid-code")).toBeNull();
    });

    it("fetches next tree code from database sequence function or count fallback", async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: "GE-2026-000005",
        error: null,
      });

      const code = await service.fetchNextTreeCode();
      expect(code).toBe("GE-2026-000005");
      expect(service.validateTreeCode(code)).toBe(true);
    });
  });

  describe("2. 7-Stage End-to-End Registration Pipeline", () => {
    it("successfully registers tree through all 7 stages: User → Project → GPS → Photo → Tree Data → Database → Tree ID", async () => {
      // Mock Stage 4 Photo Upload
      (photoEvidenceService.uploadPhotoEvidence as any).mockResolvedValue({
        success: true,
        publicUrl: "https://treebank.hirwasparsh/storage/tree-1/after.jpg",
        sha256Hash: "hash_abc_123",
        phash: "dhash_def_456",
      });

      // Mock Stage 6 Database Insert
      const mockInsertTree = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tree-uuid-101",
              tree_code: "GE-2026-000001",
              species: "Neem (Azadirachta indica)",
              plantation_date: "2026-09-25",
              latitude: 18.52043,
              longitude: 73.85674,
              photo_url: "https://treebank.hirwasparsh/storage/tree-1/after.jpg",
              status: "alive",
            },
            error: null,
          }),
        }),
      });

      const mockUpdateProject = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockCountTrees = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
      });

      const mockProfileQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { trees_planted: 2, green_points: 20 }, error: null }),
        }),
      });

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return { insert: mockInsertTree, select: mockCountTrees };
        }
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "p-1", name: "Green Campus", status: "active" }, error: null }),
              }),
            }),
            update: mockUpdateProject,
          };
        }
        if (table === "profiles") {
          return { select: mockProfileQuery, update: mockProfileUpdate };
        }
        if (table === "audit_logs") {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      (supabase.rpc as any).mockResolvedValue({
        data: "GE-2026-000001",
        error: null,
      });

      const progressStages: string[] = [];

      const result = await service.registerTree({
        user: {
          userId: "user-123",
          email: "planter@hirwasparsh.org",
          fullName: "Sunil Shinde",
        },
        project: {
          projectId: "p-1",
          projectName: "Green Campus",
        },
        gps: {
          latitude: 18.52043,
          longitude: 73.85674,
          accuracyMeters: 4.2,
          locationName: "Pune Eco-Zone, Maharashtra",
        },
        photos: {
          afterPhoto: new File([new ArrayBuffer(30 * 1024)], "after.jpg", { type: "image/jpeg" }),
          caption: "Newly planted Neem sapling",
        },
        treeData: {
          species: "Neem (Azadirachta indica)",
          treeName: "Campus Neem Tree #1",
          plantationDate: "2026-09-25",
          heightCm: 45,
          status: "alive",
        },
        onProgress: (stage) => {
          progressStages.push(stage);
        },
      });

      expect(result.success).toBe(true);
      expect(result.treeCode).toBe("GE-2026-000001");
      expect(result.treeCode).toMatch(GE_TREE_CODE_REGEX);
      expect(result.qrToken).toBeDefined();
      expect(result.tree?.id).toBe("tree-uuid-101");
      expect(result.photoUrls?.primaryUrl).toContain("treebank.hirwasparsh");

      // Verify all pipeline stages executed
      expect(progressStages).toContain("user_validation");
      expect(progressStages).toContain("project_validation");
      expect(progressStages).toContain("gps_validation");
      expect(progressStages).toContain("photo_processing");
      expect(progressStages).toContain("tree_data_validation");
      expect(progressStages).toContain("database_persistence");
      expect(progressStages).toContain("tree_id_generation");

      expect(mockInsertTree).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          project_id: "p-1",
          species: "Neem (Azadirachta indica)",
          latitude: 18.52043,
          longitude: 73.85674,
          tree_code: "GE-2026-000001",
        })
      );
    });

    it("fails at Stage 1 if user ID is missing", async () => {
      const result = await service.registerTree({
        user: { userId: "" },
        gps: { latitude: 18.5, longitude: 73.8 },
        photos: { afterPhoto: new File([], "a.jpg") },
        treeData: { species: "Banyan" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("user_validation");
      expect(result.error).toContain("User authentication required");
    });

    it("fails at Stage 3 if GPS coordinates are invalid (Null Island or out of bounds)", async () => {
      const result = await service.registerTree({
        user: { userId: "u-1" },
        gps: { latitude: 0, longitude: 0 }, // Null Island
        photos: { afterPhoto: new File([], "a.jpg") },
        treeData: { species: "Banyan" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("gps_validation");
      expect(result.error).toContain("GPS validation failed");
    });

    it("fails at Stage 4 if required 'after' photo is missing", async () => {
      const result = await service.registerTree({
        user: { userId: "u-1" },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: null as any },
        treeData: { species: "Banyan" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("photo_processing");
      expect(result.error).toContain("Photo evidence required");
    });

    it("fails at Stage 5 if species is empty", async () => {
      (photoEvidenceService.uploadPhotoEvidence as any).mockResolvedValue({
        success: true,
        publicUrl: "https://treebank.hirwasparsh/photo.jpg",
      });

      const result = await service.registerTree({
        user: { userId: "u-1" },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024 * 10)], "a.jpg", { type: "image/jpeg" }) },
        treeData: { species: "" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("tree_data_validation");
      expect(result.error).toContain("Species name is required");
    });
  });

  describe("3. Lookup Tree by Code", () => {
    it("fetches tree by its unique Green Enlightenment code", async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "tree-uuid-1",
                tree_code: "GE-2026-000001",
                species: "Peepal (Ficus religiosa)",
              },
              error: null,
            }),
          }),
        }),
      });

      const tree = await service.getTreeByCode("GE-2026-000001");
      expect(tree).not.toBeNull();
      expect(tree?.tree_code).toBe("GE-2026-000001");
      expect(tree?.species).toBe("Peepal (Ficus religiosa)");

      // Malformed code returns null immediately
      const invalidTree = await service.getTreeByCode("bad-code");
      expect(invalidTree).toBeNull();
    });
  });
});
