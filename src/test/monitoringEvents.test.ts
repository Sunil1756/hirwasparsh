/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 22
 * Monitoring Events Test Suite
 * 
 * Tests:
 * 1. Observation creation & validation
 * 2. Observation history & delta tracking
 * 3. Next monitoring date calculation (age & health condition matrix)
 * 4. Monitoring status evaluation (up_to_date, due_soon, overdue, critical_overdue)
 * 5. Overdue monitoring detection & task generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { monitoringEventService } from "@/services/monitoringEventService";
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

describe("Phase 5 Task 22 — Monitoring Events & Survival Scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Next Monitoring Date Calculation Matrix", () => {
    it("schedules 30-day interval for young saplings (< 6 months)", () => {
      const today = new Date();
      const plantationDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 2 months old

      const result = monitoringEventService.calculateNextMonitoringDate(
        plantationDate,
        "healthy",
        today.toISOString()
      );

      expect(result.intervalDays).toBe(30);
      expect(result.stageLabel).toContain("Sapling Establishment Phase");
      const diffDays = Math.round(
        (new Date(result.nextMonitoringDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });

    it("schedules 60-day interval for maturing trees (6–24 months)", () => {
      const today = new Date();
      const plantationDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 12 months old

      const result = monitoringEventService.calculateNextMonitoringDate(
        plantationDate,
        "thriving",
        today.toISOString()
      );

      expect(result.intervalDays).toBe(60);
      expect(result.stageLabel).toContain("Young Tree Maturation Phase");
      const diffDays = Math.round(
        (new Date(result.nextMonitoringDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(60);
    });

    it("schedules 120-day interval for established trees (> 24 months)", () => {
      const today = new Date();
      const plantationDate = new Date(today.getTime() - 900 * 24 * 60 * 60 * 1000).toISOString(); // ~30 months old

      const result = monitoringEventService.calculateNextMonitoringDate(
        plantationDate,
        "alive",
        today.toISOString()
      );

      expect(result.intervalDays).toBe(120);
      expect(result.stageLabel).toContain("Established Canopy Phase");
      const diffDays = Math.round(
        (new Date(result.nextMonitoringDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(120);
    });

    it("accelerates to 14-day interval for stressed trees regardless of age", () => {
      const today = new Date();
      const plantationDate = new Date(today.getTime() - 900 * 24 * 60 * 60 * 1000).toISOString(); // 30 months old

      const result = monitoringEventService.calculateNextMonitoringDate(
        plantationDate,
        "stressed",
        today.toISOString()
      );

      expect(result.intervalDays).toBe(14);
      expect(result.stageLabel).toContain("Stress Recovery Protocol");
    });

    it("accelerates to 7-day interval for diseased / critical trees", () => {
      const today = new Date();
      const plantationDate = new Date(today.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString();

      const result = monitoringEventService.calculateNextMonitoringDate(
        plantationDate,
        "diseased",
        today.toISOString()
      );

      expect(result.intervalDays).toBe(7);
      expect(result.stageLabel).toContain("Critical Care");
    });
  });

  describe("2. Monitoring Status Evaluation", () => {
    it("evaluates 'up_to_date' when next monitoring is > 7 days away", () => {
      const now = new Date("2026-06-01T00:00:00.000Z");
      const nextDate = new Date("2026-06-25T00:00:00.000Z"); // 24 days away

      const evalResult = monitoringEventService.evaluateMonitoringStatus(nextDate, now);

      expect(evalResult.status).toBe("up_to_date");
      expect(evalResult.daysRemaining).toBe(24);
      expect(evalResult.isOverdue).toBe(false);
      expect(evalResult.isCritical).toBe(false);
    });

    it("evaluates 'due_soon' when next monitoring is within 7 days", () => {
      const now = new Date("2026-06-01T00:00:00.000Z");
      const nextDate = new Date("2026-06-05T00:00:00.000Z"); // 4 days away

      const evalResult = monitoringEventService.evaluateMonitoringStatus(nextDate, now);

      expect(evalResult.status).toBe("due_soon");
      expect(evalResult.daysRemaining).toBe(4);
      expect(evalResult.isOverdue).toBe(false);
    });

    it("evaluates 'overdue' when next monitoring was 1 to 30 days ago", () => {
      const now = new Date("2026-06-15T00:00:00.000Z");
      const nextDate = new Date("2026-06-05T00:00:00.000Z"); // 10 days ago

      const evalResult = monitoringEventService.evaluateMonitoringStatus(nextDate, now);

      expect(evalResult.status).toBe("overdue");
      expect(evalResult.daysOverdue).toBe(10);
      expect(evalResult.isOverdue).toBe(true);
      expect(evalResult.isCritical).toBe(false);
    });

    it("evaluates 'critical_overdue' when next monitoring was > 30 days ago", () => {
      const now = new Date("2026-08-01T00:00:00.000Z");
      const nextDate = new Date("2026-06-01T00:00:00.000Z"); // 61 days ago

      const evalResult = monitoringEventService.evaluateMonitoringStatus(nextDate, now);

      expect(evalResult.status).toBe("critical_overdue");
      expect(evalResult.daysOverdue).toBe(61);
      expect(evalResult.isOverdue).toBe(true);
      expect(evalResult.isCritical).toBe(true);
    });
  });

  describe("3. Observation Creation & Parent Tree Sync", () => {
    it("validates and rejects invalid observation input", async () => {
      const result = await monitoringEventService.createMonitoringEvent({
        tree_id: "",
        health_status: "healthy",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tree ID is required");
    });

    it("creates observation, updates tree biometrics, and returns calculated schedule", async () => {
      const mockTree = {
        id: "tree-123",
        tree_code: "GE-2026-000042",
        species: "Azadirachta indica",
        plantation_date: "2026-01-01",
        status: "alive",
        height_cm: 120,
        dbh_cm: 5.0,
      };

      const mockObservation = {
        id: "obs-999",
        tree_id: "tree-123",
        health_status: "thriving",
        height_cm: 145,
        dbh_cm: 6.2,
        observation_date: "2026-06-01T10:00:00.000Z",
        photo_url: "https://storage.hirwasparsh.org/growth.jpg",
        verification_status: "verified",
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
        }),
      });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockObservation, error: null }),
        }),
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        if (table === "tree_observations") {
          return {
            insert: insertMock,
          };
        }
        if (table === "monitoring_tasks") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await monitoringEventService.createMonitoringEvent({
        tree_id: "tree-123",
        health_status: "thriving",
        height_cm: 145,
        dbh_cm: 6.2,
        observation_date: "2026-06-01T10:00:00.000Z",
        photo_url: "https://storage.hirwasparsh.org/growth.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.observation?.id).toBe("obs-999");
      expect(result.schedule?.monitoringStatus).toBe("up_to_date");
      expect(result.schedule?.treeCode).toBe("GE-2026-000042");
    });
  });

  describe("4. Overdue Monitoring Detection & Task Generation", () => {
    it("fetches overdue trees and sorts by most critically overdue", async () => {
      const now = new Date();
      const mockTrees = [
        {
          id: "tree-1",
          tree_code: "GE-2026-000001",
          species: "Banyan",
          plantation_date: "2025-01-01",
          next_monitoring_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days overdue (critical)
          status: "alive",
        },
        {
          id: "tree-2",
          tree_code: "GE-2026-000002",
          species: "Peepal",
          plantation_date: "2025-01-01",
          next_monitoring_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days overdue
          status: "alive",
        },
        {
          id: "tree-3",
          tree_code: "GE-2026-000003",
          species: "Neem",
          plantation_date: "2025-01-01",
          next_monitoring_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days in future (up to date)
          status: "thriving",
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
      });

      const overdueList = await monitoringEventService.getOverdueTrees();

      expect(overdueList.length).toBe(2);
      expect(overdueList[0].id).toBe("tree-1");
      expect(overdueList[0].monitoring_status).toBe("critical_overdue");
      expect(overdueList[1].id).toBe("tree-2");
      expect(overdueList[1].monitoring_status).toBe("overdue");
    });

    it("calculates accurate monitoring compliance statistics", async () => {
      const now = new Date();
      const mockTrees = [
        { id: "t1", next_monitoring_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString() }, // up to date
        { id: "t2", next_monitoring_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },  // due soon
        { id: "t3", next_monitoring_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },  // overdue
        { id: "t4", next_monitoring_date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString() }, // critical overdue
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
      });

      const stats = await monitoringEventService.getMonitoringComplianceStats();

      expect(stats.totalTrees).toBe(4);
      expect(stats.upToDateCount).toBe(1);
      expect(stats.dueSoonCount).toBe(1);
      expect(stats.overdueCount).toBe(1);
      expect(stats.criticalOverdueCount).toBe(1);
      expect(stats.complianceRatePct).toBe(50); // (1 + 1) / 4 = 50%
    });

    it("generates monitoring tasks for overdue trees", async () => {
      const now = new Date();
      const mockTrees = [
        {
          id: "tree-overdue-1",
          tree_code: "GE-2026-000099",
          species: "Teak",
          plantation_date: "2025-01-01",
          next_monitoring_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: "alive",
        },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
          };
        }
        if (table === "monitoring_tasks") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "task-new-1" }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await monitoringEventService.generateOverdueMonitoringTasks({
        defaultAssigneeId: "worker-123",
      });

      expect(result.generatedCount).toBe(1);
      expect(result.taskIds).toContain("task-new-1");
      expect(result.errors.length).toBe(0);
    });
  });
});
