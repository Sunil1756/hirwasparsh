/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 21
 * Automated Test Suite for Observation Model & Monitoring History Subsystem
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  observationService,
  ALLOWED_OBSERVATION_HEALTH_STATUSES,
  ALLOWED_OBSERVATION_VERIFICATION_STATUSES,
} from "../services/observationService";
import { supabase } from "../integrations/supabase/client";
import { TreeObservation, CreateObservationInput } from "../types/coreDatabase";

// Mock Supabase
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 5 Task 21 — Observation Model & Living Monitoring History", () => {
  let inMemoryObservations: Map<string, any>;
  let inMemoryTrees: Map<string, any>;
  let inMemoryAuditLogs: any[];

  const mockParentTree = {
    id: "tree-neem-001",
    tree_code: "GE-2026-000001",
    species: "Azadirachta indica (Neem)",
    status: "alive",
    height_cm: 50,
    dbh_cm: 2.0,
    canopy_radius_cm: 15,
    user_id: "user-planter-01",
    project_id: "proj-pune-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    inMemoryObservations = new Map();
    inMemoryTrees = new Map();
    inMemoryAuditLogs = [];

    inMemoryTrees.set(mockParentTree.id, { ...mockParentTree });

    // Mock supabase.from queries
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "trees") {
        return {
          select: vi.fn().mockImplementation((cols: string) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              const match = inMemoryTrees.get(val);
              return {
                maybeSingle: vi.fn().mockResolvedValue({ data: match || null, error: null }),
                single: vi.fn().mockResolvedValue({ data: match || null, error: match ? null : { message: "Tree not found" } }),
              };
            }),
          })),
          update: vi.fn().mockImplementation((updates: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (inMemoryTrees.has(val)) {
                const existing = inMemoryTrees.get(val);
                inMemoryTrees.set(val, { ...existing, ...updates });
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === "tree_observations") {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === "id") {
                const obs = inMemoryObservations.get(val);
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: obs || null, error: null }),
                  single: vi.fn().mockResolvedValue({ data: obs || null, error: obs ? null : { message: "Observation not found" } }),
                };
              }
              if (col === "tree_id") {
                const list = Array.from(inMemoryObservations.values()).filter((o) => o.tree_id === val);
                return {
                  order: vi.fn().mockImplementation((orderCol: string, orderOpts: any) => {
                    const sorted = [...list].sort((a, b) => {
                      const diff = new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime();
                      return orderOpts?.ascending ? -diff : diff;
                    });
                    return {
                      limit: vi.fn().mockImplementation((num: number) => {
                        return Promise.resolve({ data: sorted.slice(0, num), error: null });
                      }),
                      then: (resolve: any) => resolve({ data: sorted, error: null }),
                    };
                  }),
                };
              }
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
          })),
          insert: vi.fn().mockImplementation((record: any) => {
            const obsId = record.id || `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const fullRecord = {
              id: obsId,
              ...record,
              created_at: record.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            inMemoryObservations.set(obsId, fullRecord);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: fullRecord, error: null }),
              }),
            };
          }),
          update: vi.fn().mockImplementation((updates: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (inMemoryObservations.has(val)) {
                const existing = inMemoryObservations.get(val);
                const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
                inMemoryObservations.set(val, updated);
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: updated, error: null }),
                  }),
                };
              }
              return Promise.resolve({ error: { message: "Observation not found" } });
            }),
          })),
        };
      }

      if (table === "audit_logs") {
        return {
          insert: vi.fn().mockImplementation((rec: any) => {
            inMemoryAuditLogs.push(rec);
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    });
  });

  // ==========================================================================
  // 1. OBSERVATION INPUT VALIDATION
  // ==========================================================================
  describe("1. Observation Input Validation", () => {
    it("validates a complete, well-formed observation input with all 8 fields", () => {
      const input: CreateObservationInput = {
        tree_id: "tree-neem-001",
        observer_id: "user-field-worker-01",
        observer_name: "Ganesh Shinde",
        observer_role: "Field Forester",
        observation_date: "2026-09-25T09:00:00Z",
        latitude: 18.52043,
        longitude: 73.856744,
        elevation_m: 560,
        gps_accuracy_meters: 3.2,
        health_status: "thriving",
        height_cm: 85,
        dbh_cm: 3.2,
        canopy_width_cm: 40,
        foliage_density_pct: 90,
        pest_disease_detected: false,
        condition_notes: "Vigorous apical shoot growth with rich chlorophyll density.",
        care_recommendations: "Maintain current drip watering schedule.",
        photo_url: "https://treebank.hirwasparsh.org/obs/neem_85cm.jpg",
        evidence_type: "growth_photo",
        sha256_hash: "hash_growth_85cm",
        verification_status: "pending",
      };

      const result = observationService.validateObservationInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.normalizedData?.tree_id).toBe("tree-neem-001");
      expect(result.normalizedData?.health_status).toBe("thriving");
      expect(result.normalizedData?.height_cm).toBe(85);
      expect(result.normalizedData?.canopy_width_cm).toBe(40);
    });

    it("rejects observation input with missing tree ID", () => {
      const result = observationService.validateObservationInput({
        tree_id: "",
        health_status: "healthy",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Tree ID is required for recording an observation.");
    });

    it("rejects observation dates in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        observation_date: futureDate.toISOString(),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Observation date cannot be in the future.");
    });

    it("rejects invalid health status and validates allowed taxonomy", () => {
      const result = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        health_status: "super_healthy" as any,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Invalid health status");

      // Verify all allowed statuses pass
      ALLOWED_OBSERVATION_HEALTH_STATUSES.forEach((status) => {
        const val = observationService.validateObservationInput({
          tree_id: "tree-neem-001",
          health_status: status,
        });
        expect(val.isValid).toBe(true);
      });
    });

    it("rejects Null Island (0, 0) and out-of-bounds geographic coordinates", () => {
      const nullIsland = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        latitude: 0,
        longitude: 0,
      });
      expect(nullIsland.isValid).toBe(false);
      expect(nullIsland.errors[0]).toContain("Null Island");

      const outOfBounds = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        latitude: 92.5,
        longitude: -185.0,
      });
      expect(outOfBounds.isValid).toBe(false);
      expect(outOfBounds.errors.length).toBe(2);
    });

    it("rejects invalid negative or absurd biometric values", () => {
      const badHeight = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        height_cm: -50,
      });
      expect(badHeight.isValid).toBe(false);

      const absurdDbh = observationService.validateObservationInput({
        tree_id: "tree-neem-001",
        dbh_cm: 2000, // 20 meters DBH
      });
      expect(absurdDbh.isValid).toBe(false);
    });
  });

  // ==========================================================================
  // 2. CREATE OBSERVATION & AUTO-SYNC
  // ==========================================================================
  describe("2. Create Observation & Automatic Parent Tree Synchronization", () => {
    it("successfully creates observation, persists record, updates parent tree biometrics, and logs audit", async () => {
      const createRes = await observationService.createObservation({
        tree_id: "tree-neem-001",
        observer_id: "user-forester-01",
        observer_name: "Priya Sharma",
        observer_role: "Lead Arborist",
        observation_date: "2026-09-25T10:00:00Z",
        latitude: 18.52043,
        longitude: 73.856744,
        health_status: "thriving",
        height_cm: 95,
        dbh_cm: 3.8,
        canopy_width_cm: 50,
        condition_notes: "Remarkable canopy expansion post-monsoon.",
        photo_url: "https://treebank.hirwasparsh.org/evidence/month6_95cm.jpg",
        ai_health_score: 96,
      }, "user-forester-01");

      expect(createRes.success).toBe(true);
      expect(createRes.observation).toBeDefined();
      expect(createRes.observation?.tree_id).toBe("tree-neem-001");
      expect(createRes.observation?.height_cm).toBe(95);
      expect(createRes.observation?.health_status).toBe("thriving");

      // Verify parent tree biometrics synchronized
      const parent = inMemoryTrees.get("tree-neem-001");
      expect(parent.height_cm).toBe(95);
      expect(parent.dbh_cm).toBe(3.8);
      expect(parent.canopy_radius_cm).toBe(25); // 50cm width / 2
      expect(parent.status).toBe("thriving");
      expect(parent.health_score).toBe(96);

      // Verify audit log entry
      expect(inMemoryAuditLogs.length).toBeGreaterThan(0);
      const audit = inMemoryAuditLogs.find((a) => a.action === "RECORD_TREE_OBSERVATION");
      expect(audit).toBeDefined();
      expect(audit.actor_id).toBe("user-forester-01");
      expect(audit.new_status).toBe("thriving");
    });

    it("rejects observation creation if target parent tree does not exist", async () => {
      const res = await observationService.createObservation({
        tree_id: "non-existent-tree-id",
        health_status: "healthy",
        height_cm: 50,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("does not exist");
    });
  });

  // ==========================================================================
  // 3. TIME-SERIES QUERYING & CHRONOLOGICAL ORDERING
  // ==========================================================================
  describe("3. Time-Series Observation Querying", () => {
    it("retrieves time-series observations in descending chronological order", async () => {
      // Create 3 observations across different dates
      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-01-15T10:00:00Z",
        height_cm: 50,
        health_status: "healthy",
      });

      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-05-20T10:00:00Z",
        height_cm: 80,
        health_status: "thriving",
      });

      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-09-25T10:00:00Z",
        height_cm: 110,
        health_status: "thriving",
      });

      const observations = await observationService.getObservationsByTree("tree-neem-001");
      expect(observations.length).toBe(3);

      // Verify descending order (newest first)
      expect(new Date(observations[0].observation_date).getTime()).toBeGreaterThan(
        new Date(observations[1].observation_date).getTime()
      );
      expect(new Date(observations[1].observation_date).getTime()).toBeGreaterThan(
        new Date(observations[2].observation_date).getTime()
      );
      expect(observations[0].height_cm).toBe(110);
      expect(observations[2].height_cm).toBe(50);
    });

    it("retrieves a single observation by unique ID", async () => {
      const createRes = await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-09-25T10:00:00Z",
        height_cm: 120,
        condition_notes: "Detailed biometric inspection",
      });

      const obsId = createRes.observation!.id;
      const single = await observationService.getObservationById(obsId);

      expect(single).not.toBeNull();
      expect(single?.id).toBe(obsId);
      expect(single?.condition_notes).toBe("Detailed biometric inspection");
    });
  });

  // ==========================================================================
  // 4. ADMINISTRATIVE VERIFICATION WORKFLOW
  // ==========================================================================
  describe("4. Administrative Verification Workflow", () => {
    it("updates observation verification status with verifier credentials and audit trail", async () => {
      const createRes = await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-09-25T10:00:00Z",
        height_cm: 90,
        health_status: "healthy",
      });

      const obsId = createRes.observation!.id;
      expect(createRes.observation?.verification_status).toBe("pending");

      // Verifier approves observation
      const verifyRes = await observationService.verifyObservation(
        obsId,
        "admin-verifier-01",
        "verified",
        "Photo evidence and height biometric cross-verified with drone scan."
      );

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.observation?.verification_status).toBe("verified");
      expect(verifyRes.observation?.verified_by).toBe("admin-verifier-01");
      expect(verifyRes.observation?.verification_notes).toContain("cross-verified");

      // Verify audit log
      const audit = inMemoryAuditLogs.find((a) => a.action === "VERIFY_TREE_OBSERVATION");
      expect(audit).toBeDefined();
      expect(audit.actor_id).toBe("admin-verifier-01");
      expect(audit.new_status).toBe("verified");
    });

    it("rejects verification with invalid status", async () => {
      const res = await observationService.verifyObservation(
        "obs-123",
        "admin-01",
        "super_approved" as any
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid verification status");
    });
  });

  // ==========================================================================
  // 5. STATISTICAL AGGREGATIONS & GROWTH VELOCITY
  // ==========================================================================
  describe("5. Observation Statistical Aggregations & Growth Velocity", () => {
    it("calculates accurate growth delta, annual velocity, and verified metrics", async () => {
      // Observation 1: Day 0 (50cm)
      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2025-09-25T10:00:00Z",
        height_cm: 50,
        health_status: "healthy",
        verification_status: "verified",
      });

      // Observation 2: Day 180 (75cm, pest detected)
      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-03-25T10:00:00Z",
        height_cm: 75,
        health_status: "stressed",
        pest_disease_detected: true,
        pest_types: ["Aphids"],
        verification_status: "verified",
      });

      // Observation 3: Day 365 (110cm)
      await observationService.createObservation({
        tree_id: "tree-neem-001",
        observation_date: "2026-09-25T10:00:00Z",
        height_cm: 110,
        health_status: "thriving",
        pest_disease_detected: false,
        verification_status: "verified",
      });

      const stats = await observationService.getObservationStats("tree-neem-001");

      expect(stats.totalObservations).toBe(3);
      expect(stats.initialHeightCm).toBe(50);
      expect(stats.currentHeightCm).toBe(110);
      expect(stats.growthDeltaCm).toBe(60); // 110 - 50 = 60 cm
      expect(stats.averageAnnualGrowthRateCm).toBeCloseTo(60, 0); // ~60 cm per year
      expect(stats.pestIssuesCount).toBe(1);
      expect(stats.verifiedObservationsCount).toBe(3);
      expect(stats.latestHealthStatus).toBe("thriving");
    });

    it("returns zero metrics for trees with no recorded observations", async () => {
      const stats = await observationService.getObservationStats("tree-without-obs");
      expect(stats.totalObservations).toBe(0);
      expect(stats.growthDeltaCm).toBe(0);
      expect(stats.latestObservationDate).toBeNull();
    });
  });
});
