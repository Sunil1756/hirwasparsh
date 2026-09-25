import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringAlertService,
  AlertIncident,
  AlertRule,
} from "../services/monitoringAlertService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";

describe("PHASE 9 TASK 49 — MonitoringAlertService & Anomaly Detection Engine", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
  });

  it("1. Initializes with default seeded alert rules and active incidents", () => {
    const rules = monitoringAlertService.getRules();
    expect(rules.length).toBeGreaterThanOrEqual(4);

    const ndviRule = rules.find((r) => r.metricKey === "delta_ndvi");
    expect(ndviRule).toBeDefined();
    expect(ndviRule?.severity).toBe("critical");
    expect(ndviRule?.autoCreateWorkOrder).toBe(true);

    const incidents = monitoringAlertService.getIncidents();
    expect(incidents.length).toBeGreaterThanOrEqual(4);

    const active = incidents.filter((i) => i.status === "active");
    expect(active.length).toBeGreaterThan(0);
  });

  it("2. Creates, updates, toggles, and deletes threshold alert rules", () => {
    const newRule = monitoringAlertService.createRule({
      name: "Fungal Dieback Outbreak Threshold",
      description: "Triggers when quadrat reports > 3 trees with active fungal dieback",
      alertType: "pest_disease_outbreak",
      severity: "high",
      metricKey: "infected_trees_count",
      operator: ">=",
      thresholdValue: 3,
      unit: "trees",
      projectId: "proj-sahayadri",
      projectName: "Sahayadri Tiger Reserve Afforestation",
      autoCreateWorkOrder: true,
      targetSquad: "Botanical Pathology Squad",
    });

    expect(newRule.id).toBeDefined();
    expect(newRule.enabled).toBe(true);

    const toggled = monitoringAlertService.toggleRule(newRule.id);
    expect(toggled.enabled).toBe(false);

    const updated = monitoringAlertService.updateRule(newRule.id, { thresholdValue: 5 });
    expect(updated.thresholdValue).toBe(5);

    const deleted = monitoringAlertService.deleteRule(newRule.id);
    expect(deleted).toBe(true);
  });

  it("3. Evaluates incoming telemetry against enabled rules and spawns incidents with Task 47 work orders and Task 48 notifications", () => {
    const initialIncidentsCount = monitoringAlertService.getIncidents().length;
    const initialTasksCount = monitoringTaskService.getTasks().length;
    const initialNotifsCount = monitoringNotificationService.getNotifications().length;

    const telemetryBatch = [
      {
        projectId: "proj-sahayadri",
        projectName: "Sahayadri Tiger Reserve Afforestation",
        locationReference: "Sector 4B (Plots Q12-Q18)",
        metricKey: "delta_ndvi",
        value: -0.25, // Breaches <= -0.15 threshold
      },
    ];

    const result = monitoringAlertService.evaluateTelemetryAndTriggerAlerts(telemetryBatch);
    expect(result.triggeredCount).toBe(1);

    const newIncident = result.incidents[0];
    expect(newIncident.severity).toBe("critical");
    expect(newIncident.observedValue).toBe(-0.25);
    expect(newIncident.status).toBe("investigating"); // Auto-spawned work order sets status to investigating
    expect(newIncident.workOrderId).toBeDefined();

    // Verify Task 47 work order was created
    expect(monitoringTaskService.getTasks().length).toBeGreaterThan(initialTasksCount);

    // Verify Task 48 notification was dispatched
    expect(monitoringNotificationService.getNotifications().length).toBeGreaterThan(initialNotifsCount);
  });

  it("4. Acknowledges and manually escalates an incident to a Task 47 ground work order", () => {
    const activeIncidents = monitoringAlertService.getIncidents({ status: "active" });
    expect(activeIncidents.length).toBeGreaterThan(0);
    const target = activeIncidents[0];

    const acked = monitoringAlertService.acknowledgeIncident(target.id, "Dr. A. Deshmukh");
    expect(acked.status).toBe("acknowledged");
    expect(acked.assignedInvestigator).toBe("Dr. A. Deshmukh");
    expect(acked.acknowledgedAt).toBeDefined();

    const escalated = monitoringAlertService.escalateIncidentToWorkOrder(target.id, "Field Emergency Squad 1");
    expect(escalated.status).toBe("investigating");
    expect(escalated.workOrderId).toBeDefined();
  });

  it("5. Resolves incident with root cause analysis and dismisses false positive", () => {
    const incident = monitoringAlertService.getIncidents()[0];

    const resolved = monitoringAlertService.resolveIncident(
      incident.id,
      "Canopy damage repaired and replanted with 120 saplings.",
      "Localized cattle encroachment grazing"
    );
    expect(resolved.status).toBe("resolved");
    expect(resolved.rootCause).toContain("grazing");
    expect(resolved.resolvedAt).toBeDefined();

    const incident2 = monitoringAlertService.getIncidents()[1];
    const dismissed = monitoringAlertService.dismissIncident(
      incident2.id,
      "Cloud shadow on optical sensor verified against Radar SAR pass."
    );
    expect(dismissed.status).toBe("dismissed");
    expect(dismissed.rootCause).toContain("False Positive");
  });

  it("6. Computes accurate Alert KPIs and incident resolution metrics", () => {
    const kpis = monitoringAlertService.getAlertKPIs();
    expect(kpis.totalIncidents).toBeGreaterThan(0);
    expect(kpis.activeCount).toBeGreaterThanOrEqual(0);
    expect(kpis.criticalCount).toBeGreaterThanOrEqual(0);
    expect(kpis.mttrHours).toBeGreaterThan(0);
    expect(kpis.falsePositiveRatePct).toBeGreaterThanOrEqual(0);
  });
});
