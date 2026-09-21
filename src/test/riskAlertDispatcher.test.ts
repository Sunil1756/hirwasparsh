import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatAdopterHealthAdvisory,
  formatFieldWorkerDispatchAlert,
  triggerAiRiskAlertPipeline,
  RiskAlertDispatchParams,
} from "@/lib/riskAlertNotificationService";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: {
            success: true,
            message: "Risk alert dispatched via Edge Function.",
            taskId: "task-mock-edge-123",
            fieldWorkersNotified: 2,
            adoptersNotified: 1,
            deliveryChannels: ["in_app_realtime", "field_task_queue", "adopter_portal"],
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "task-mock-123" }, error: null }),
            single: vi.fn().mockResolvedValue({ data: { id: "task-mock-123" }, error: null }),
          }),
        }),
      }),
    },
  };
});

describe("AI Risk Alerts Notification & Communication Dispatcher Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Tree Adopter Health Advisory Generator (formatAdopterHealthAdvisory)", () => {
    it("generates reassuring hydration advisory for DROUGHT_SHOCK", () => {
      const advisory = formatAdopterHealthAdvisory(
        "DROUGHT_SHOCK",
        "Sacred Banyan #42",
        "NDWI deficit (-0.18)",
        3,
        "Ficus benghalensis"
      );
      expect(advisory.title).toContain("Hydration Advisory");
      expect(advisory.title).toContain("Sacred Banyan #42");
      expect(advisory.title).toContain("Ficus benghalensis");
      expect(advisory.body).toContain("moisture stress");
      expect(advisory.careTip).toContain("local rangers");
    });

    it("generates organic protection advisory for PEST_DEFOLIATION", () => {
      const advisory = formatAdopterHealthAdvisory(
        "PEST_DEFOLIATION",
        "Mango Orchard Specimen",
        "NDRE chlorophyll drop",
        5
      );
      expect(advisory.title).toContain("Canopy Health Check-In");
      expect(advisory.body).toContain("5% spot audit");
      expect(advisory.careTip).toContain("recovery curve");
    });

    it("generates security advisory for ENCROACHMENT_CLEARING", () => {
      const advisory = formatAdopterHealthAdvisory(
        "ENCROACHMENT_CLEARING",
        "Neem Shield Tree",
        "Vegetation boundary loss",
        2
      );
      expect(advisory.title).toContain("Security Alert");
      expect(advisory.body).toContain("bio-corridor");
      expect(advisory.careTip).toContain("geo-fenced");
    });

    it("generates thermal advisory for WILDFIRE_SUSCEPTIBILITY", () => {
      const advisory = formatAdopterHealthAdvisory(
        "WILDFIRE_SUSCEPTIBILITY",
        "Teak Forest Plot",
        "Surface thermal spike +5.2°C",
        1
      );
      expect(advisory.title).toContain("Thermal Alert");
      expect(advisory.body).toContain("firebreaks");
    });

    it("generates vitality advisory for SURVIVAL_RATE_DROP", () => {
      const advisory = formatAdopterHealthAdvisory(
        "SURVIVAL_RATE_DROP",
        "Vidarbha Afforestation Stand",
        "Plot survival rate 78%",
        4
      );
      expect(advisory.title).toContain("Plantation Vitality Safeguard Active");
      expect(advisory.body).toContain("bio-fertilizer and micro-irrigation");
    });
  });

  describe("2. Field Worker Dispatch Briefing (formatFieldWorkerDispatchAlert)", () => {
    it("formats tactical GPS waypoint briefing with urgency instructions", () => {
      const briefing = formatFieldWorkerDispatchAlert(
        "DROUGHT_SHOCK",
        "Pune Hills Sector 4B",
        18.5204,
        73.8567,
        3,
        "Verify root zone moisture and initiate drip irrigation"
      );

      expect(briefing.title).toContain("DROUGHT SHOCK");
      expect(briefing.title).toContain("Pune Hills Sector 4B");
      expect(briefing.body).toContain("18.5204° N, 73.8567° E");
      expect(briefing.body).toContain("3 days");
      expect(briefing.body).toContain("5% Cochran spot audit");
    });
  });

  describe("3. Supabase Edge Function Alert Dispatch Pipeline", () => {
    it("successfully dispatches alert through Supabase Edge Function", async () => {
      const params: RiskAlertDispatchParams = {
        treeId: "tree-test-101",
        treeName: "Neem Legacy",
        species: "Azadirachta indica",
        threatType: "DROUGHT_SHOCK",
        threatTitle: "Hydration Deficit",
        severity: "CRITICAL",
        riskProbabilityPct: 88,
        daysUntilCriticalBreach: 3,
        primaryDriver: "NDWI deficit (-0.22)",
        recommendedAction: "Irrigate 15L/day",
        latitude: 18.5204,
        longitude: 73.8567,
      };

      const result = await triggerAiRiskAlertPipeline(params);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe("task-mock-edge-123");
      expect(result.fieldWorkersNotified).toBeGreaterThan(0);
      expect(result.adoptersNotified).toBeGreaterThan(0);
      expect(result.deliveryChannels).toContain("field_task_queue");
    });
  });
});
