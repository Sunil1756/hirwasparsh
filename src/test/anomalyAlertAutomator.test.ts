import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateTreeHealthAnomaly,
  evaluateSurvivalRateAnomaly,
  scanAndDispatchProjectAnomalies,
} from "@/lib/anomalyAlertAutomator";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          success: true,
          message: "Alert dispatched via Edge Function.",
          taskId: "task-edge-auto-999",
          fieldWorkersNotified: 2,
          adoptersNotified: 3,
          deliveryChannels: ["in_app_realtime", "field_task_queue"],
        },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "plantation_projects") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: "proj-1",
                project_name: "Satara Green Stand",
                location: "Satara, Maharashtra",
                target_trees: 1000,
                verified_trees: 950, // 95% -> healthy
                latitude: 17.68,
                longitude: 74.01,
              },
              {
                id: "proj-2",
                project_name: "Vidarbha Drought Zone",
                location: "Nagpur, Maharashtra",
                target_trees: 2000,
                verified_trees: 1400, // 70% -> anomalous drop
                latitude: 21.14,
                longitude: 79.08,
              },
            ],
            error: null,
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "task-auto-123" }, error: null }),
          }),
        }),
      };
    }),
  },
}));

describe("Automated Anomaly Evaluator & Multi-Channel Alert Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Individual Tree Health Anomaly Evaluator", () => {
    it("returns null when tree telemetry is healthy and thriving", async () => {
      const result = await evaluateTreeHealthAnomaly({
        treeId: "tree-001",
        treeName: "Healthy Banyan",
        currentNdvi: 0.72,
        healthStatus: "healthy",
      });

      expect(result).toBeNull();
    });

    it("triggers automated alert when tree health is stressed or NDVI drops below threshold", async () => {
      const result = await evaluateTreeHealthAnomaly({
        treeId: "tree-002",
        treeName: "Drought Stressed Neem",
        species: "Azadirachta indica",
        currentNdvi: 0.38,
        foliarNdwi: 0.02,
        healthStatus: "stressed",
      });

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.threatType).toBe("DROUGHT_SHOCK");
      expect(result?.severity).toBe("HIGH");
      expect(result?.fieldWorkersNotified).toBeGreaterThanOrEqual(1);
    });

    it("escalates to CRITICAL when tree health is unhealthy or dead", async () => {
      const result = await evaluateTreeHealthAnomaly({
        treeId: "tree-003",
        treeName: "Defoliated Mango",
        species: "Mangifera indica",
        currentNdvi: 0.28,
        ndviDelta: -0.22,
        healthStatus: "unhealthy",
      });

      expect(result).not.toBeNull();
      expect(result?.severity).toBe("CRITICAL");
      expect(result?.threatType).toBe("PEST_DEFOLIATION");
    });
  });

  describe("2. Plot & Project Survival Rate Anomaly Evaluator", () => {
    it("returns null when survival rate is >= 85% with no sudden drop", async () => {
      const result = await evaluateSurvivalRateAnomaly({
        projectId: "proj-healthy",
        projectName: "Sahyadri Bio-Reserve",
        targetTrees: 1000,
        verifiedTrees: 920, // 92%
        previousSurvivalRatePct: 94,
      });

      expect(result).toBeNull();
    });

    it("triggers automated alert when plot survival rate drops below 85%", async () => {
      const result = await evaluateSurvivalRateAnomaly({
        projectId: "proj-deficit",
        projectName: "Nagpur Agroforestry Stand",
        targetTrees: 1000,
        verifiedTrees: 780, // 78% -> moderate deficit
        previousSurvivalRatePct: 90,
      });

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.threatType).toBe("SURVIVAL_RATE_DROP");
      expect(result?.severity).toBe("HIGH");
    });

    it("escalates to CRITICAL when survival rate drops below 75% or drops >= 15%", async () => {
      const result = await evaluateSurvivalRateAnomaly({
        projectId: "proj-critical",
        projectName: "Western Ghats Corridor 2",
        targetTrees: 2000,
        verifiedTrees: 1300, // 65% -> severe deficit
        previousSurvivalRatePct: 95,
      });

      expect(result).not.toBeNull();
      expect(result?.severity).toBe("CRITICAL");
      expect(result?.threatType).toBe("SURVIVAL_RATE_DROP");
    });
  });

  describe("3. Database Scanner (scanAndDispatchProjectAnomalies)", () => {
    it("scans active projects and dispatches alerts for sub-85% survival parcels", async () => {
      const scanResult = await scanAndDispatchProjectAnomalies();

      expect(scanResult.scanned).toBe(2);
      expect(scanResult.alertsDispatched).toBe(1); // Only proj-2 (70%) flagged
      expect(scanResult.results).toHaveLength(1);
    });
  });
});
