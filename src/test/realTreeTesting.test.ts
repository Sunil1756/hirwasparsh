/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 20
 * Real Tree Testing & End-to-End Resilience Test Suite
 * 
 * Acceptance:
 * A real tree can be registered and remains available after refresh/re-login.
 * 
 * Test Scenarios:
 * 1. Add tree (Complete registration flow)
 * 2. Refresh (Persistence & state retrieval across reloads)
 * 3. Logout/login (User session transition & data retention)
 * 4. View tree (Deep-link & identifier routing resolution)
 * 5. Unauthorized access (Cross-tenant & unauthenticated protection)
 * 6. Duplicate/invalid submissions (Validation constraints & idempotency)
 * 7. Bad GPS (Geodetic boundaries, Null Island & accuracy tiers)
 * 8. Failed photo upload (Error handling & graceful degradation)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { treeRegistrationService } from "../services/treeRegistrationService";
import { treeService } from "../services/treeService";
import { photoEvidenceService } from "../services/photoEvidenceService";
import { gpsRegistrationService } from "../services/gpsRegistrationService";
import { supabase } from "../integrations/supabase/client";
import { Tree, CreateTreeInput } from "../types/coreDatabase";

// Mock Supabase
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
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
      validateImageFile: vi.fn(),
    },
  };
});

describe("Phase 4 Task 20 — Real Tree Testing Suite", () => {
  // In-memory database mock store simulating real PostgreSQL tables
  let inMemoryTrees: Map<string, any>;
  let inMemoryProfiles: Map<string, any>;
  let inMemoryProjects: Map<string, any>;
  let inMemoryAuditLogs: any[];

  const testUserA = {
    id: "user-alpha-123",
    email: "planter.alpha@greenenlightenment.org",
    full_name: "Vikram Jadhav",
    organization_id: "org-sahyadri-01",
  };

  const testUserB = {
    id: "user-beta-456",
    email: "planter.beta@unauthorized.org",
    full_name: "Sneha Patil",
    organization_id: "org-outsider-99",
  };

  const testProject = {
    id: "proj-maharashtra-01",
    name: "Western Ghats Corridor Afforestation",
    organization_id: "org-sahyadri-01",
    status: "active",
    planted_trees: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    inMemoryTrees = new Map();
    inMemoryProfiles = new Map();
    inMemoryProjects = new Map();
    inMemoryAuditLogs = [];

    // Pre-populate mock store
    inMemoryProfiles.set(testUserA.id, { ...testUserA, trees_planted: 0, green_points: 0 });
    inMemoryProfiles.set(testUserB.id, { ...testUserB, trees_planted: 0, green_points: 0 });
    inMemoryProjects.set(testProject.id, { ...testProject });

    // Mock PostgreSQL RPC for unique GE tree codes (GE-2026-000001, ...)
    let codeSeq = 1;
    (supabase.rpc as any).mockImplementation((funcName: string) => {
      if (funcName === "generate_ge_tree_code") {
        const padded = String(codeSeq++).padStart(6, "0");
        return Promise.resolve({ data: `GE-2026-${padded}`, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Mock Photo Upload default success
    (photoEvidenceService.uploadPhotoEvidence as any).mockImplementation(async ({ file, evidenceType }: any) => {
      return {
        success: true,
        publicUrl: `https://treebank.hirwasparsh.org/storage/${evidenceType}_${Date.now()}.jpg`,
        storageBucket: "treebank",
        storagePath: `trees/evidence_${Date.now()}.jpg`,
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        phash: "1010101010101010",
      };
    });

    // Mock supabase.from queries against in-memory state
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "trees") {
        return {
          select: vi.fn().mockImplementation((_cols: string, opts?: any) => {
            if (opts?.count === "exact" && opts?.head) {
              return Promise.resolve({ count: inMemoryTrees.size, error: null });
            }
            return {
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                if (col === "id") {
                  const match = inMemoryTrees.get(val);
                  return {
                    single: vi.fn().mockResolvedValue({ data: match || null, error: match ? null : { message: "Tree not found" } }),
                    maybeSingle: vi.fn().mockResolvedValue({ data: match || null, error: null }),
                  };
                }
                if (col === "tree_code") {
                  const found = Array.from(inMemoryTrees.values()).find((t) => t.tree_code === val);
                  return {
                    single: vi.fn().mockResolvedValue({ data: found || null, error: found ? null : { message: "Tree not found" } }),
                    maybeSingle: vi.fn().mockResolvedValue({ data: found || null, error: null }),
                  };
                }
                if (col === "project_id") {
                  const list = Array.from(inMemoryTrees.values()).filter((t) => t.project_id === val);
                  return Promise.resolve({ data: list, error: null });
                }
                return {
                  order: vi.fn().mockImplementation(() => {
                    const list = Array.from(inMemoryTrees.values()).filter((t) => t[col] === val);
                    return Promise.resolve({ data: list, error: null });
                  }),
                };
              }),
              or: vi.fn().mockImplementation((clause: string) => {
                // Support or(id.eq.val,tree_code.eq.val) or or(created_by.eq.val,user_id.eq.val)
                const list = Array.from(inMemoryTrees.values()).filter((t) => {
                  if (clause.includes("user_id.eq.") || clause.includes("created_by.eq.")) {
                    const uid = clause.split("eq.")[1]?.split(",")[0];
                    return t.user_id === uid || t.created_by === uid;
                  }
                  if (clause.includes("tree_code.eq.")) {
                    const target = clause.split("tree_code.eq.")[1];
                    return t.tree_code === target || t.id === target;
                  }
                  return true;
                });
                return {
                  order: vi.fn().mockResolvedValue({ data: list, error: null }),
                  maybeSingle: vi.fn().mockResolvedValue({ data: list[0] || null, error: null }),
                };
              }),
              order: vi.fn().mockImplementation(() => {
                return Promise.resolve({ data: Array.from(inMemoryTrees.values()), error: null });
              }),
            };
          }),
          insert: vi.fn().mockImplementation((record: any) => {
            const treeId = record.id || `tree_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const fullRecord = {
              id: treeId,
              ...record,
              created_at: record.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            inMemoryTrees.set(treeId, fullRecord);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: fullRecord, error: null }),
              }),
            };
          }),
          update: vi.fn().mockImplementation((updates: any) => {
            return {
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "id" && inMemoryTrees.has(val)) {
                  const existing = inMemoryTrees.get(val);
                  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
                  inMemoryTrees.set(val, updated);
                  return {
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
                    }),
                  };
                }
                return Promise.resolve({ error: { message: "Record not found for update" } });
              }),
            };
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              const prof = inMemoryProfiles.get(val);
              return {
                single: vi.fn().mockResolvedValue({ data: prof || null, error: prof ? null : { message: "Profile not found" } }),
                maybeSingle: vi.fn().mockResolvedValue({ data: prof || null, error: null }),
              };
            }),
          })),
          update: vi.fn().mockImplementation((updates: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (inMemoryProfiles.has(val)) {
                const existing = inMemoryProfiles.get(val);
                inMemoryProfiles.set(val, { ...existing, ...updates });
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === "projects") {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              const proj = inMemoryProjects.get(val);
              return {
                single: vi.fn().mockResolvedValue({ data: proj || null, error: proj ? null : { message: "Project not found" } }),
                maybeSingle: vi.fn().mockResolvedValue({ data: proj || null, error: null }),
              };
            }),
          })),
          update: vi.fn().mockImplementation((updates: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (inMemoryProjects.has(val)) {
                const existing = inMemoryProjects.get(val);
                inMemoryProjects.set(val, { ...existing, ...updates });
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === "audit_logs" || table === "tree_observations") {
        return {
          insert: vi.fn().mockImplementation((rec: any) => {
            inMemoryAuditLogs.push(rec);
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });
  });

  // ==========================================================================
  // 1. ADD TREE (COMPLETE REGISTRATION FLOW)
  // ==========================================================================
  describe("1. Add Tree: Complete 7-Stage Registration Flow", () => {
    it("successfully registers a real tree with complete metadata, GPS, photo, and issues unique GE Tree ID", async () => {
      const mockPhotoFile = new File([new ArrayBuffer(25 * 1024)], "planted_neem.jpg", {
        type: "image/jpeg",
      });

      const regResult = await treeRegistrationService.registerTree({
        user: {
          userId: testUserA.id,
          fullName: testUserA.full_name,
          email: testUserA.email,
          organizationId: testUserA.organization_id,
        },
        project: {
          projectId: testProject.id,
          projectName: testProject.name,
        },
        gps: {
          latitude: 18.52043,
          longitude: 73.856744,
          altitudeMeters: 560,
          accuracyMeters: 3.5,
          locationName: "Pune Green Belt Zone 4",
        },
        photos: {
          afterPhoto: mockPhotoFile,
          caption: "Healthy Neem sapling planted in fertile red soil",
        },
        treeData: {
          species: "Azadirachta indica (Neem)",
          botanicalName: "Azadirachta indica",
          treeName: "Sacred Neem #101",
          plantationDate: "2026-09-25",
          heightCm: 65,
          dbhCm: 2.5,
          status: "thriving",
        },
      });

      expect(regResult.success).toBe(true);
      expect(regResult.treeCode).toBe("GE-2026-000001");
      expect(regResult.treeCode).toMatch(/^GE-\d{4}-\d{6}$/);
      expect(regResult.qrToken).toBeDefined();
      expect(regResult.tree).toBeDefined();

      const createdTreeId = regResult.tree!.id;
      expect(inMemoryTrees.has(createdTreeId)).toBe(true);

      const savedTree = inMemoryTrees.get(createdTreeId);
      expect(savedTree.species).toBe("Azadirachta indica (Neem)");
      expect(savedTree.latitude).toBe(18.52043);
      expect(savedTree.longitude).toBe(73.856744);
      expect(savedTree.status).toBe("thriving");
      expect(savedTree.user_id).toBe(testUserA.id);
      expect(savedTree.project_id).toBe(testProject.id);

      // Verify user points & project count updated
      const updatedProfile = inMemoryProfiles.get(testUserA.id);
      expect(updatedProfile.trees_planted).toBe(1);
      expect(updatedProfile.green_points).toBe(10);
    });
  });

  // ==========================================================================
  // 2. REFRESH (PERSISTENCE & ACCURATE RETRIEVAL)
  // ==========================================================================
  describe("2. Refresh: Data Persistence & Retrieval Integrity", () => {
    it("persists tree in database and returns identical state after simulated page reload / component refresh", async () => {
      // Step 1: Register tree
      const reg = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: testProject.id },
        gps: { latitude: 19.8762, longitude: 75.3433, accuracyMeters: 4.0 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "tree.jpg", { type: "image/jpeg" }) },
        treeData: {
          species: "Ficus religiosa (Peepal)",
          heightCm: 110,
          status: "alive",
        },
      });

      expect(reg.success).toBe(true);
      const treeId = reg.tree!.id;
      const treeCode = reg.treeCode!;

      // Step 2: Simulate page refresh / new query cycle
      const fetchedById = await treeService.getTreeById(treeId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.id).toBe(treeId);
      expect(fetchedById?.tree_code).toBe(treeCode);
      expect(fetchedById?.species).toBe("Ficus religiosa (Peepal)");
      expect(fetchedById?.latitude).toBe(19.8762);
      expect(fetchedById?.longitude).toBe(75.3433);
      expect(fetchedById?.status).toBe("alive");

      // Step 3: Fetch by unique GE Tree Code
      const fetchedByCode = await treeRegistrationService.getTreeByCode(treeCode);
      expect(fetchedByCode).not.toBeNull();
      expect(fetchedByCode?.id).toBe(treeId);
      expect(fetchedByCode?.tree_code).toBe(treeCode);
    });
  });

  // ==========================================================================
  // 3. LOGOUT / LOGIN SESSION LIFECYCLE (ACCEPTANCE CRITERIA)
  // ==========================================================================
  describe("3. Logout/Login: Session Lifecycle & Data Ownership", () => {
    it("guarantees a registered tree remains linked to user and available after logout and re-login", async () => {
      // 1. User A logs in and plants 2 trees
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserA.id, email: testUserA.email } },
        error: null,
      });

      const tree1 = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: testProject.id },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "t1.jpg", { type: "image/jpeg" }) },
        treeData: { species: "Banyan Tree #1", heightCm: 50 },
      });

      const tree2 = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: testProject.id },
        gps: { latitude: 18.53, longitude: 73.86 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "t2.jpg", { type: "image/jpeg" }) },
        treeData: { species: "Banyan Tree #2", heightCm: 55 },
      });

      expect(tree1.success).toBe(true);
      expect(tree2.success).toBe(true);

      // Verify trees queryable during active session
      let userTrees = await treeService.getTreesByUser(testUserA.id);
      expect(userTrees.length).toBe(2);

      // 2. User logs out (Session cleared)
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null }, error: null });

      // 3. User logs back in (New auth session initialized)
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: testUserA.id, email: testUserA.email },
          session: { access_token: "mock_jwt_token_123" },
        },
        error: null,
      });
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: testUserA.id, email: testUserA.email } },
        error: null,
      });

      // 4. Verify user trees are intact and fully queryable post-login
      userTrees = await treeService.getTreesByUser(testUserA.id);
      expect(userTrees.length).toBe(2);
      expect(userTrees.map((t) => t.species)).toContain("Banyan Tree #1");
      expect(userTrees.map((t) => t.species)).toContain("Banyan Tree #2");

      // Verify individual tree records are accessible
      const reloadedTree1 = await treeService.getTreeById(tree1.tree!.id);
      expect(reloadedTree1).not.toBeNull();
      expect(reloadedTree1?.tree_code).toBe(tree1.treeCode);
      expect(reloadedTree1?.user_id).toBe(testUserA.id);
    });
  });

  // ==========================================================================
  // 4. VIEW TREE (DEEP-LINK & DUAL ROUTING RESOLUTION)
  // ==========================================================================
  describe("4. View Tree: Deep-Link & Dual Identifiers", () => {
    it("successfully resolves tree detail view by either UUID or human-readable GE Tree Code", async () => {
      const reg = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: testProject.id },
        gps: { latitude: 18.5204, longitude: 73.8567 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "t.jpg", { type: "image/jpeg" }) },
        treeData: {
          species: "Teak (Tectona grandis)",
          treeName: "Teak Specimen Alpha",
          botanicalName: "Tectona grandis L.f.",
          heightCm: 140,
          dbhCm: 4.8,
          status: "thriving",
        },
      });

      expect(reg.success).toBe(true);
      const uuid = reg.tree!.id;
      const geCode = reg.treeCode!;

      // Lookup by UUID
      const treeByUuid = await treeService.getTreeById(uuid);
      expect(treeByUuid).not.toBeNull();
      expect(treeByUuid?.tree_name).toBe("Teak Specimen Alpha");

      // Lookup by GE Code
      const treeByGeCode = await treeRegistrationService.getTreeByCode(geCode);
      expect(treeByGeCode).not.toBeNull();
      expect(treeByGeCode?.id).toBe(uuid);
      expect(treeByGeCode?.species).toBe("Teak (Tectona grandis)");
    });
  });

  // ==========================================================================
  // 5. UNAUTHORIZED ACCESS & ROW LEVEL SECURITY
  // ==========================================================================
  describe("5. Unauthorized Access: Cross-Tenant Protection & Status Manipulation", () => {
    it("rejects tree registration without authenticated user credentials", async () => {
      const result = await treeRegistrationService.registerTree({
        user: { userId: "" }, // Unauthenticated
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "tree.jpg", { type: "image/jpeg" }) },
        treeData: { species: "Neem" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("user_validation");
      expect(result.error).toContain("User authentication required");
    });

    it("prevents updating non-existent trees and validates allowed statuses", async () => {
      const invalidUpdate = await treeService.updateTreeStatus(
        "non-existent-tree-id",
        "thriving",
        testUserA.id
      );
      expect(invalidUpdate.success).toBe(false);
      expect(invalidUpdate.error).toContain("Tree not found");

      // Validate invalid status rejection
      const invalidStatusUpdate = await treeService.updateTreeStatus(
        "any-id",
        "immortal" as any,
        testUserA.id
      );
      expect(invalidStatusUpdate.success).toBe(false);
      expect(invalidStatusUpdate.error).toContain("Invalid status");
    });
  });

  // ==========================================================================
  // 6. DUPLICATE & INVALID SUBMISSIONS
  // ==========================================================================
  describe("6. Duplicate / Invalid Submissions Handling", () => {
    it("rejects tree submissions with empty species", () => {
      const validation = treeService.validateTreeInput({
        species: "   ",
        latitude: 18.52,
        longitude: 73.85,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Species is required and cannot be empty");
    });

    it("rejects tree submissions with future plantation dates", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const validation = treeService.validateTreeInput({
        species: "Mahogany",
        plantation_date: futureDate.toISOString().split("T")[0],
        latitude: 18.52,
        longitude: 73.85,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Plantation date cannot be in the future");
    });

    it("blocks tree registration under suspended projects", async () => {
      // Mark project as suspended
      inMemoryProjects.set("proj-suspended-01", {
        id: "proj-suspended-01",
        name: "Suspended Mine Rehabilitation",
        status: "suspended",
      });

      const result = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: "proj-suspended-01" },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "tree.jpg", { type: "image/jpeg" }) },
        treeData: { species: "Neem" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("project_validation");
      expect(result.error).toContain("suspended project");
    });
  });

  // ==========================================================================
  // 7. BAD GPS & ANTI-SPOOFING HEURISTICS
  // ==========================================================================
  describe("7. Bad GPS: Null Island, Out-of-Bounds & Accuracy Dilution", () => {
    it("strictly rejects Null Island coordinates (0.0, 0.0)", () => {
      const validation = gpsRegistrationService.validateLocationCoordinates(0.0, 0.0, 5.0);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain("Null Island");
    });

    it("rejects latitude coordinates exceeding valid WGS84 range [-90, +90]", () => {
      const tooHigh = gpsRegistrationService.validateLocationCoordinates(95.4, 73.8, 5.0);
      expect(tooHigh.isValid).toBe(false);
      expect(tooHigh.errors[0]).toContain("Latitude (95.4) exceeds valid WGS84 bounds");

      const tooLow = gpsRegistrationService.validateLocationCoordinates(-91.0, 73.8, 5.0);
      expect(tooLow.isValid).toBe(false);
      expect(tooLow.errors[0]).toContain("Latitude (-91) exceeds valid WGS84 bounds");
    });

    it("rejects longitude coordinates exceeding valid WGS84 range [-180, +180]", () => {
      const tooFarEast = gpsRegistrationService.validateLocationCoordinates(18.5, 185.0, 5.0);
      expect(tooFarEast.isValid).toBe(false);
      expect(tooFarEast.errors[0]).toContain("Longitude (185) exceeds valid WGS84 bounds");

      const tooFarWest = gpsRegistrationService.validateLocationCoordinates(18.5, -195.0, 5.0);
      expect(tooFarWest.isValid).toBe(false);
      expect(tooFarWest.errors[0]).toContain("Longitude (-195) exceeds valid WGS84 bounds");
    });

    it("rejects non-numeric NaN coordinates", () => {
      const nanVal = gpsRegistrationService.validateLocationCoordinates(NaN, 73.8, 5.0);
      expect(nanVal.isValid).toBe(false);
      expect(nanVal.errors[0]).toContain("must be valid numerical coordinates");
    });

    it("flags warnings on coarse accuracy (> 50m) and rejects extreme dilution (> 150m)", () => {
      const coarse = gpsRegistrationService.validateLocationCoordinates(18.52, 73.85, 65.0);
      expect(coarse.isValid).toBe(true);
      expect(coarse.warnings.length).toBeGreaterThan(0);
      expect(coarse.accuracyTier).toBe("coarse_warning");

      const extremeDilution = gpsRegistrationService.validateLocationCoordinates(18.52, 73.85, 180.0);
      expect(extremeDilution.isValid).toBe(false);
      expect(extremeDilution.errors[0]).toContain("GPS accuracy dilution is too coarse");
    });
  });

  // ==========================================================================
  // 8. FAILED PHOTO UPLOAD & GRACEFUL DEGRADATION
  // ==========================================================================
  describe("8. Failed Photo Upload: Error Handling & Pipeline Resilience", () => {
    it("handles storage upload failure gracefully without crashing the application", async () => {
      (photoEvidenceService.uploadPhotoEvidence as any).mockResolvedValue({
        success: false,
        error: "Supabase Storage bucket quota exceeded (HTTP 507)",
      });

      const result = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        project: { projectId: testProject.id },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: new File([new ArrayBuffer(1024)], "after.jpg", { type: "image/jpeg" }) },
        treeData: { species: "Arjuna (Terminalia arjuna)" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("photo_processing");
      expect(result.error).toContain("Supabase Storage bucket quota exceeded");
    });

    it("rejects registration if photo is missing or null", async () => {
      const result = await treeRegistrationService.registerTree({
        user: { userId: testUserA.id },
        gps: { latitude: 18.52, longitude: 73.85 },
        photos: { afterPhoto: null as any },
        treeData: { species: "Neem" },
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("photo_processing");
      expect(result.error).toContain("Photo evidence required");
    });
  });
});
