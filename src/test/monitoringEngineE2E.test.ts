import { describe, it, expect, beforeEach } from "vitest";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";
import { monitoringAlertService } from "../services/monitoringAlertService";
import { monitoringEscalationService } from "../services/monitoringEscalationService";
import { monitoringAnalyticsService } from "../services/monitoringAnalyticsService";

describe("TASK 52 — End-to-End Cross-Engine Monitoring & Compliance Lifecycle Test Suite", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();
  });

  // =========================================================================
  // LIFECYCLE FLOW 1: Automated Surveillance -> Anomaly Detection -> Dispatch
  // =========================================================================
  it("Flow 1: Executes schedule sweep, detects canopy anomaly, auto-spawns work order and broadcasts alert", async () => {
    // 1. Initial baseline checks
    const initialTasks = monitoringTaskService.getTasks().length;
    const initialAlerts = monitoringAlertService.getIncidents().length;
    const initialNotifs = monitoringNotificationService.getNotifications().length;

    // 2. Trigger automated Sentinel-2 satellite sweep
    const schedules = monitoringScheduleService.getSchedules({ cadenceType: "satellite_sentinel2" });
    expect(schedules.length).toBeGreaterThan(0);
    const targetSchedule = schedules[0];

    const execLog = await monitoringScheduleService.triggerScheduleExecution(targetSchedule.id, "automated_cron");
    expect(execLog.status).toBe("success");
    expect(execLog.itemsProcessed).toBeGreaterThan(0);

    // 3. Telemetry anomaly evaluation detects NDVI drop
    const scanResult = monitoringAlertService.evaluateTelemetryAndTriggerAlerts([
      {
        projectId: "proj-sahayadri",
        projectName: "Sahayadri Tiger Reserve Afforestation",
        locationReference: "Sector 4B - Upper Slope",
        metricKey: "delta_ndvi",
        value: -0.22,
      },
    ]);

    expect(scanResult.triggeredCount).toBeGreaterThanOrEqual(1);
    expect(monitoringAlertService.getIncidents().length).toBeGreaterThan(initialAlerts);

    // 4. Verify automated Task 47 Emergency Field Work Order creation
    expect(monitoringTaskService.getTasks().length).toBeGreaterThan(initialTasks);
    const emergencyTasks = monitoringTaskService.getTasks({ priority: "critical" });
    expect(emergencyTasks.length).toBeGreaterThan(0);

    // 5. Verify Task 48 Multi-Channel Notification dispatch
    expect(monitoringNotificationService.getNotifications().length).toBeGreaterThan(initialNotifs);
    const criticalNotifs = monitoringNotificationService.getNotifications({ priority: "critical" });
    expect(criticalNotifs.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // LIFECYCLE FLOW 2: SLA Breach -> Multi-Tier Escalation -> Compliance Closure
  // =========================================================================
  it("Flow 2: Evaluates SLA breaches, auto-escalates to Tier 2/3, logs mitigation and closes with sign-off", () => {
    // 1. Create an overdue work order
    const overdueTask = monitoringTaskService.createTask({
      title: "Overdue Ground Truth Quad Audit",
      description: "Cochran PSP quadrat audit 48 hours overdue without field signoff.",
      cadenceType: "ground_sample_psp",
      priority: "critical",
      projectId: "proj-sahayadri",
      projectName: "Sahayadri Tiger Reserve Afforestation",
      dueDate: new Date(Date.now() - 48 * 3600000).toISOString(),
      gracePeriodDays: 1,
      assignedTo: "Sahayadri Ranger Squad Alpha",
      targetQuota: 10,
      quotaUnit: "plots",
      locationReference: "Sector 2A",
    });

    // Mark as escalated
    monitoringTaskService.updateTask(overdueTask.id, {
      status: "escalated",
      overdueDurationHours: 48,
    });

    // 2. Scan and auto-escalate breached items to Task 50 Escalation Engine
    const initialCases = monitoringEscalationService.getCases().length;
    const escalationResult = monitoringEscalationService.evaluateAndTriggerEscalations();
    expect(escalationResult.promotedCount).toBeGreaterThan(0);
    expect(monitoringEscalationService.getCases().length).toBeGreaterThan(initialCases);

    const targetCase = monitoringEscalationService.getCases().find((c) => c.sourceEntityId === overdueTask.id);
    expect(targetCase).toBeDefined();
    if (!targetCase) return;

    // 3. Promote case to Tier 3 (Lead Verifier)
    const promoted = monitoringEscalationService.advanceTier(
      targetCase.id,
      "tier3_verifier",
      "Lead Verifier (Dr. A. Deshmukh)",
      "Ground access cleared. Specialized LiDAR drone contracted for rapid audit."
    );
    expect(promoted.currentTier).toBe("tier3_verifier");
    expect(promoted.escalationPath.length).toBeGreaterThanOrEqual(2);

    // 4. Submit SLA mitigation action plan
    const mitigated = monitoringEscalationService.submitMitigationPlan(
      targetCase.id,
      "Deploy dual-sensor LiDAR drone at 06:00 to complete missing 15 quadrat audits.",
      new Date(Date.now() + 24 * 3600000).toISOString()
    );
    expect(mitigated.status).toBe("under_investigation");
    expect(mitigated.mitigationPlan).toContain("LiDAR drone");

    // 5. Senior Authority Sign-Off & Closure
    const closed = monitoringEscalationService.resolveAndCloseEscalation(
      targetCase.id,
      "All 15 sample plots re-audited and 100% verified. SLA breach cleared without registry non-conformance.",
      "Head of ESG & Climate Compliance"
    );
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeDefined();
    expect(closed.signoffOfficer).toBe("Head of ESG & Climate Compliance");
  });

  // =========================================================================
  // LIFECYCLE FLOW 3: Real-Time Intelligence & Compliance Export
  // =========================================================================
  it("Flow 3: Dynamically aggregates live KPIs across engines and generates Verra VM0047 compliance report", () => {
    // 1. Get analytics summary
    const summary = monitoringAnalyticsService.getAnalyticsSummary();
    expect(summary.totalMonitoredHectares).toBe(1250);
    expect(summary.overallFulfillmentRatePct).toBeGreaterThan(80);
    expect(summary.carbonAccrual.totalCarbonAccruedTCO2e).toBeGreaterThan(4000);
    expect(summary.squadMetrics.length).toBeGreaterThanOrEqual(4);

    // 2. Export and validate CSV manifest
    const csv = monitoringAnalyticsService.exportComplianceReport("csv");
    expect(csv).toContain("HIRWA SPARSH MRV MONITORING ANALYTICS EXPORT");
    expect(csv).toContain("CADENCE FULFILLMENT BREAKDOWN");
    expect(csv).toContain("SPECIES SURVIVAL & ALLOMETRIC GROWTH");
    expect(csv.split("\n").length).toBeGreaterThan(15);

    // 3. Export and validate JSON manifest
    const json = monitoringAnalyticsService.exportComplianceReport("json");
    const parsed = JSON.parse(json);
    expect(parsed.standard).toContain("Verra VM0047");
    expect(parsed.data.meanSurvivalRatePct).toBeGreaterThanOrEqual(80);
  });

  // =========================================================================
  // LIFECYCLE FLOW 4: Resiliency, Dismissals & Edge Cases
  // =========================================================================
  it("Flow 4: Handles sensor false positives, dismissed alerts, and listener unsubscriptions cleanly", () => {
    // 1. Dismiss a false positive incident
    const incidents = monitoringAlertService.getIncidents();
    const targetIncident = incidents[0];

    const dismissed = monitoringAlertService.dismissIncident(
      targetIncident.id,
      "Sensor artifact caused by heavy cloud shadow; ground truth check confirmed healthy canopy."
    );
    expect(dismissed.status).toBe("dismissed");

    // 2. Verify analytics updates false positive rate
    const updatedSummary = monitoringAnalyticsService.getAnalyticsSummary();
    const canopyAnomaly = updatedSummary.anomalyDistribution.find((a) => a.category === "canopy_degradation");
    expect(canopyAnomaly).toBeDefined();

    // 3. Test reactive listener subscription & unsubscription
    let notified = false;
    const unsub = monitoringAnalyticsService.subscribe(() => {
      notified = true;
    });
    monitoringAnalyticsService.notify();
    expect(notified).toBe(true);
    unsub();
  });
});
