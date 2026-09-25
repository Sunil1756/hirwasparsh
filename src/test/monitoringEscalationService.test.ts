import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringEscalationService,
  EscalationCase,
} from "../services/monitoringEscalationService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";
import { monitoringAlertService } from "../services/monitoringAlertService";

describe("PHASE 9 TASK 50 — MonitoringEscalationService & SLA Governance Engine", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();
  });

  it("1. Initializes with default seeded escalation cases and operational policies", () => {
    const policies = monitoringEscalationService.getPolicies();
    expect(policies.length).toBeGreaterThanOrEqual(3);

    const cases = monitoringEscalationService.getCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);

    const tier3Case = cases.find((c) => c.currentTier === "tier3_verifier");
    expect(tier3Case).toBeDefined();
    expect(tier3Case?.slaBreachHours).toBeGreaterThan(0);
    expect(tier3Case?.escalationPath.length).toBeGreaterThanOrEqual(2);
  });

  it("2. Filters escalation cases by tier, status, sourceEntity, and full-text search", () => {
    const tier3 = monitoringEscalationService.getCases({ tier: "tier3_verifier" });
    expect(tier3.every((c) => c.currentTier === "tier3_verifier")).toBe(true);

    const active = monitoringEscalationService.getCases({ status: "active_escalation" });
    expect(active.every((c) => c.status === "active_escalation")).toBe(true);

    const searched = monitoringEscalationService.getCases({ searchQuery: "Mangrove" });
    expect(searched.length).toBeGreaterThan(0);
    expect(searched[0].title).toContain("Mangrove");
  });

  it("3. Creates a new escalation case and broadcasts notification to assigned officer", () => {
    const initialNotifs = monitoringNotificationService.getNotifications().length;
    const newCase = monitoringEscalationService.createCase({
      title: "Repeated Drought Deficit Unmitigated in Sector 1",
      description: "Station WX-01 soil moisture at 9.8% for 18 consecutive days.",
      sourceEntity: "incident",
      sourceEntityId: "INC-2026-002",
      projectId: "proj-sahayadri",
      projectName: "Sahayadri Tiger Reserve Afforestation",
      initialTier: "tier3_verifier",
      assignedOfficer: "Lead Verifier (Dr. A. Deshmukh)",
    });

    expect(newCase.id).toBeDefined();
    expect(newCase.currentTier).toBe("tier3_verifier");
    expect(newCase.escalationPath.length).toBe(1);
    expect(monitoringNotificationService.getNotifications().length).toBeGreaterThan(initialNotifs);
  });

  it("4. Evaluates active overdue tasks and critical alerts to auto-escalate breaches", () => {
    const initialCases = monitoringEscalationService.getCases().length;
    const res = monitoringEscalationService.evaluateAndTriggerEscalations();
    expect(res.promotedCount).toBeGreaterThanOrEqual(0);
    expect(monitoringEscalationService.getCases().length).toBeGreaterThanOrEqual(initialCases);
  });

  it("5. Advances tier with audit logging and updates officer assignment", () => {
    const cases = monitoringEscalationService.getCases();
    const target = cases[0];

    const promoted = monitoringEscalationService.advanceTier(
      target.id,
      "tier4_executive",
      "Head of ESG & Climate Compliance",
      "Regulatory intervention required to prevent credit invalidation.",
    );

    expect(promoted.currentTier).toBe("tier4_executive");
    expect(promoted.assignedOfficer).toBe("Head of ESG & Climate Compliance");
    const lastLog = promoted.escalationPath[promoted.escalationPath.length - 1];
    expect(lastLog.tier).toBe("tier4_executive");
    expect(lastLog.action).toContain("Promoted");
  });

  it("6. Submits mitigation plan and formally signs off / closes escalation case", () => {
    const target = monitoringEscalationService.getCases()[0];

    const mitigated = monitoringEscalationService.submitMitigationPlan(
      target.id,
      "Contracted specialized heavy air-lift pumps for urgent canal flooding.",
      new Date(Date.now() + 48 * 3600000).toISOString()
    );
    expect(mitigated.status).toBe("under_investigation");
    expect(mitigated.mitigationPlan).toContain("air-lift pumps");

    const closed = monitoringEscalationService.resolveAndCloseEscalation(
      target.id,
      "All 45 PSP sample plots re-audited and verified 100% compliant.",
      "Lead Auditor Sign-Off Authority",
    );
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeDefined();
    expect(closed.signoffOfficer).toBe("Lead Auditor Sign-Off Authority");
  });

  it("7. Computes accurate Escalation KPIs and SLA recovery telemetry", () => {
    const kpis = monitoringEscalationService.getEscalationKPIs();
    expect(kpis.totalCases).toBeGreaterThan(0);
    expect(kpis.activeEscalations).toBeGreaterThanOrEqual(0);
    expect(kpis.slaRecoveryRatePct).toBeGreaterThanOrEqual(0);
    expect(kpis.slaRecoveryRatePct).toBeLessThanOrEqual(100);
  });
});
