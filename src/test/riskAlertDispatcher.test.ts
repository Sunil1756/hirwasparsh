import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatAdopterHealthAdvisory,
  formatFieldWorkerDispatchAlert,
  triggerAiRiskAlertPipeline,
  RiskAlertDispatchParams,
} from "@/lib/riskAlertNotificationService";

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
        3
      );
      expect(advisory.title).toContain("Hydration Advisory");
      expect(advisory.title).toContain("Sacred Banyan #42");
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

      expect(briefing.title).toContain("[DISPATCH] DROUGHT SHOCK at Pune Hills Sector 4B");
      expect(briefing.body).toContain("18.5204° N, 73.8567° E");
      expect(briefing.body).toContain("Breach estimated in 3 days");
      expect(briefing.body).toContain("5% Cochran spot audit");
    });
  });

  describe("3. End-to-End Multi-Channel Alert Pipeline (triggerAiRiskAlertPipeline)", () => {
    it("dispatches alert payload successfully with multi-channel recipient logging", async () => {
      const payload: RiskAlertDispatchParams = {
        projectId: "demo-project-dev-001",
        projectName: "Western Ghats Ecological Corridor",
        treeId: "tree-test-999",
        treeName: "Ancient Mahua Tree",
        threatType: "DROUGHT_SHOCK",
        threatTitle: "🚨 CRITICAL: Root-Zone Moisture Shock",
        severity: "CRITICAL",
        riskProbabilityPct: 88,
        daysUntilCriticalBreach: 3,
        primaryDriver: "NDWI dropped below -0.15 with 6 consecutive dry days",
        recommendedAction: "Dispatch emergency water tanker and apply organic mulch",
        latitude: 17.9237,
        longitude: 73.6586,
        currentNdvi: 0.52,
        ndviDelta: -0.14,
        foliarNdwi: -0.16,
      };

      const result = await triggerAiRiskAlertPipeline(payload);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.threatType).toBe("DROUGHT_SHOCK");
      expect(result.severity).toBe("CRITICAL");
      expect(result.fieldWorkersNotified).toBeGreaterThanOrEqual(1);
      expect(result.adoptersNotified).toBeGreaterThanOrEqual(1);
      expect(result.deliveryChannels).toContain("in_app_realtime");
    });
  });
});
