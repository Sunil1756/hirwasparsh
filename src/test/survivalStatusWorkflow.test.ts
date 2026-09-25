/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 23
 * Survival Status & Human-in-the-Loop Verification Test Suite
 * 
 * Tests:
 * 1. 6-Status definition, mapping, and normalization
 * 2. Strict AI Guardrail: AI suggestions do NOT silently finalize status
 * 3. Automatic flagging to 'NEEDS_REVIEW' on low confidence or mortality anomalies
 * 4. Human-in-the-loop verification workflow with role attribution
 * 5. Provenance audit trail logging
 * 6. Mathematical project survival and retention metrics
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  survivalStatusService,
  ALLOWED_SURVIVAL_STATUSES,
} from "@/services/survivalStatusService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe("Phase 5 Task 23 — Survival Status & Verification Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Survival Status Definitions & Normalization", () => {
    it("defines exactly the 6 standardized survival statuses", () => {
      expect(ALLOWED_SURVIVAL_STATUSES).toEqual([
        "ALIVE",
        "STRESSED",
        "DAMAGED",
        "DEAD",
        "UNKNOWN",
        "NEEDS_REVIEW",
      ]);
    });

    it("normalizes standard status strings correctly", () => {
      expect(survivalStatusService.normalizeSurvivalStatus("ALIVE")).toBe("ALIVE");
      expect(survivalStatusService.normalizeSurvivalStatus("alive")).toBe("ALIVE");
      expect(survivalStatusService.normalizeSurvivalStatus("STRESSED")).toBe("STRESSED");
      expect(survivalStatusService.normalizeSurvivalStatus("stressed")).toBe("STRESSED");
      expect(survivalStatusService.normalizeSurvivalStatus("DAMAGED")).toBe("DAMAGED");
      expect(survivalStatusService.normalizeSurvivalStatus("damaged")).toBe("DAMAGED");
      expect(survivalStatusService.normalizeSurvivalStatus("DEAD")).toBe("DEAD");
      expect(survivalStatusService.normalizeSurvivalStatus("dead")).toBe("DEAD");
      expect(survivalStatusService.normalizeSurvivalStatus("UNKNOWN")).toBe("UNKNOWN");
      expect(survivalStatusService.normalizeSurvivalStatus("unknown")).toBe("UNKNOWN");
      expect(survivalStatusService.normalizeSurvivalStatus("NEEDS_REVIEW")).toBe("NEEDS_REVIEW");
      expect(survivalStatusService.normalizeSurvivalStatus("needs_review")).toBe("NEEDS_REVIEW");
      expect(survivalStatusService.normalizeSurvivalStatus("needs-review")).toBe("NEEDS_REVIEW");
    });

    it("normalizes fuzzy aliases accurately", () => {
      expect(survivalStatusService.normalizeSurvivalStatus("healthy")).toBe("ALIVE");
      expect(survivalStatusService.normalizeSurvivalStatus("thriving")).toBe("ALIVE");
      expect(survivalStatusService.normalizeSurvivalStatus("needs water")).toBe("STRESSED");
      expect(survivalStatusService.normalizeSurvivalStatus("wilting")).toBe("STRESSED");
      expect(survivalStatusService.normalizeSurvivalStatus("diseased")).toBe("DAMAGED");
      expect(survivalStatusService.normalizeSurvivalStatus("broken")).toBe("DAMAGED");
      expect(survivalStatusService.normalizeSurvivalStatus("mortality")).toBe("DEAD");
      expect(survivalStatusService.normalizeSurvivalStatus("flagged")).toBe("NEEDS_REVIEW");
      expect(survivalStatusService.normalizeSurvivalStatus(null)).toBe("UNKNOWN");
      expect(survivalStatusService.normalizeSurvivalStatus("")).toBe("UNKNOWN");
    });
  });

  describe("2. AI Status Suggestion & Anti-Silent Decision Guardrail", () => {
    it("flags tree as 'NEEDS_REVIEW' when AI confidence is low (< 80%)", async () => {
      const mockTree = {
        id: "tree-001",
        survival_status: "ALIVE",
        status: "alive",
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const insertAuditMock = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "tree_status_audit_log") {
          return {
            insert: insertAuditMock,
          };
        }
        return {};
      });

      const result = await survivalStatusService.submitAiStatusSuggestion("tree-001", {
        suggestedStatus: "ALIVE",
        confidence: 65, // Low confidence
        rationale: "Foliage partially occluded by shadow; confidence low.",
        source: "gemini_vision",
      });

      expect(result.success).toBe(true);
      expect(result.actionTaken).toBe("flagged_needs_review");
      expect(result.currentStatus).toBe("NEEDS_REVIEW");
      expect(result.aiSuggestedStatus).toBe("ALIVE");
      expect(result.confidence).toBe(65);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          survival_status: "NEEDS_REVIEW",
          ai_suggested_status: "ALIVE",
          ai_status_confidence: 65,
        })
      );
    });

    it("flags tree as 'NEEDS_REVIEW' when AI detects mortality regression against ALIVE tree", async () => {
      const mockTree = {
        id: "tree-002",
        survival_status: "ALIVE",
        status: "alive",
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "tree_status_audit_log") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await survivalStatusService.submitAiStatusSuggestion("tree-002", {
        suggestedStatus: "DEAD",
        confidence: 90,
        rationale: "Zero NDVI spectral signature; severe desiccation detected.",
        source: "sentinel2_ndvi",
      });

      expect(result.success).toBe(true);
      expect(result.actionTaken).toBe("flagged_needs_review");
      expect(result.currentStatus).toBe("NEEDS_REVIEW");
      expect(result.aiSuggestedStatus).toBe("DEAD");

      // Verifies AI did NOT silently change status directly to DEAD without human audit
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          survival_status: "NEEDS_REVIEW",
          ai_suggested_status: "DEAD",
        })
      );
    });

    it("proposes AI suggestion without silently altering verified ground status for consistent high-confidence observations", async () => {
      const mockTree = {
        id: "tree-003",
        survival_status: "ALIVE",
        status: "alive",
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "tree_status_audit_log") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await survivalStatusService.submitAiStatusSuggestion("tree-003", {
        suggestedStatus: "ALIVE",
        confidence: 96,
        rationale: "Vibrant chlorophyll reflectance and robust canopy expansion.",
        source: "multisource_fusion",
      });

      expect(result.success).toBe(true);
      expect(result.actionTaken).toBe("suggestion_recorded");
      expect(result.currentStatus).toBe("ALIVE");
      expect(result.aiSuggestedStatus).toBe("ALIVE");
    });
  });

  describe("3. Human-in-the-Loop Verification Workflow", () => {
    it("records verified survival status with reviewer attribution and audit logging", async () => {
      const mockTree = {
        id: "tree-004",
        survival_status: "NEEDS_REVIEW",
        status: "needs_review",
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const insertAuditMock = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "tree_status_audit_log") {
          return {
            insert: insertAuditMock,
          };
        }
        return {};
      });

      const result = await survivalStatusService.verifySurvivalStatus({
        treeId: "tree-004",
        verifiedStatus: "STRESSED",
        reviewerId: "forester-uuid-123",
        reviewerName: "Sunil Shinde",
        reviewerRole: "forester",
        verificationSource: "forester_audit",
        notes: "On-site audit confirmed mild drought stress; irrigation ordered.",
        photoUrl: "https://storage.hirwasparsh.org/audit.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("NEEDS_REVIEW");
      expect(result.verifiedStatus).toBe("STRESSED");

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          survival_status: "STRESSED",
          status_verified_by: "forester-uuid-123",
          status_verification_source: "forester_audit",
          status_verification_notes: "On-site audit confirmed mild drought stress; irrigation ordered.",
          status: "stressed",
        })
      );

      expect(insertAuditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tree_id: "tree-004",
          previous_status: "NEEDS_REVIEW",
          new_status: "STRESSED",
          changed_by: "forester-uuid-123",
          verification_source: "forester_audit",
        })
      );
    });
  });

  describe("4. Pending Reviews & Mathematical Metrics", () => {
    it("queries pending review and unknown trees", async () => {
      const mockPending = [
        { id: "t1", survival_status: "NEEDS_REVIEW" },
        { id: "t2", survival_status: "UNKNOWN" },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPending, error: null }),
          }),
        }),
      });

      const list = await survivalStatusService.getPendingReviewTrees();
      expect(list.length).toBe(2);
      expect(list[0].survival_status).toBe("NEEDS_REVIEW");
    });

    it("calculates accurate project survival and retention rate percentages", async () => {
      const mockTrees = [
        { id: "t1", survival_status: "ALIVE", status_verified_at: "2026-01-01" },
        { id: "t2", survival_status: "ALIVE", status_verified_at: "2026-01-01" },
        { id: "t3", survival_status: "STRESSED", status_verified_at: "2026-01-01" },
        { id: "t4", survival_status: "DAMAGED", status_verified_at: null },
        { id: "t5", survival_status: "DEAD", status_verified_at: "2026-01-01" },
        { id: "t6", survival_status: "NEEDS_REVIEW", status_verified_at: null },
        { id: "t7", survival_status: "UNKNOWN", status_verified_at: null }, // Excluded from surveyed denominator
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
      });

      const metrics = await survivalStatusService.getProjectSurvivalMetrics();

      expect(metrics.totalTrees).toBe(7);
      expect(metrics.aliveCount).toBe(2);
      expect(metrics.stressedCount).toBe(1);
      expect(metrics.damagedCount).toBe(1);
      expect(metrics.deadCount).toBe(1);
      expect(metrics.needsReviewCount).toBe(1);
      expect(metrics.unknownCount).toBe(1);

      // Surveyed trees = 7 - 1 = 6
      // survivalRatePct = 2 / 6 * 100 = 33.3%
      expect(metrics.survivalRatePct).toBe(33.3);
      // retentionRatePct = (2 + 1 + 1) / 6 * 100 = 4 / 6 * 100 = 66.7%
      expect(metrics.retentionRatePct).toBe(66.7);
      expect(metrics.verifiedCount).toBe(4);
      expect(metrics.pendingReviewCount).toBe(1);
    });
  });
});
