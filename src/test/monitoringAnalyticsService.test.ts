import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringAnalyticsService,
  MonitoringAnalyticsSummary,
} from "../services/monitoringAnalyticsService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringAlertService } from "../services/monitoringAlertService";
import { monitoringEscalationService } from "../services/monitoringEscalationService";

describe("TASK 51 — MonitoringAnalyticsService & MRV Reporting Engine", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();
  });

  it("1. Generates comprehensive Monitoring Analytics Summary snapshot", () => {
    const summary = monitoringAnalyticsService.getAnalyticsSummary();
    expect(summary.totalMonitoredHectares).toBeGreaterThan(0);
    expect(summary.overallFulfillmentRatePct).toBeGreaterThan(0);
    expect(summary.meanNdviIndex).toBeGreaterThan(0);
    expect(summary.meanSurvivalRatePct).toBeGreaterThan(0);
    expect(summary.carbonAccrual.totalCarbonAccruedTCO2e).toBeGreaterThan(0);
    expect(summary.operationalSlaCompliancePct).toBeGreaterThan(0);
    expect(summary.cadenceMetrics.length).toBeGreaterThanOrEqual(4);
    expect(summary.trajectoryData.length).toBeGreaterThanOrEqual(5);
    expect(summary.speciesMetrics.length).toBeGreaterThanOrEqual(3);
    expect(summary.squadMetrics.length).toBeGreaterThanOrEqual(3);
    expect(summary.anomalyDistribution.length).toBeGreaterThanOrEqual(4);
  });

  it("2. Validates multi-cadence fulfillment rates and quota metrics", () => {
    const summary = monitoringAnalyticsService.getAnalyticsSummary();
    const s2 = summary.cadenceMetrics.find((c) => c.cadenceType === "satellite_sentinel2");
    expect(s2).toBeDefined();
    expect(s2?.fulfillmentRatePct).toBeGreaterThan(80);
    expect(s2?.quotaAchieved).toBeGreaterThan(0);

    const psp = summary.cadenceMetrics.find((c) => c.cadenceType === "ground_sample_psp");
    expect(psp).toBeDefined();
    expect(psp?.quotaTarget).toBeGreaterThan(0);
  });

  it("3. Validates species survival benchmarks and allometric DBH/height measurements", () => {
    const summary = monitoringAnalyticsService.getAnalyticsSummary();
    const teak = summary.speciesMetrics.find((s) => s.speciesName === "Teak");
    expect(teak).toBeDefined();
    expect(teak?.survivalRatePct).toBeGreaterThanOrEqual(80);
    expect(teak?.avgHeightMeters).toBeGreaterThan(0);
    expect(teak?.growthRateCmPerMonth).toBeGreaterThan(0);
  });

  it("4. Validates squad operational performance and SLA resolution hours", () => {
    const summary = monitoringAnalyticsService.getAnalyticsSummary();
    const alphaSquad = summary.squadMetrics[0];
    expect(alphaSquad.squadName).toBeDefined();
    expect(alphaSquad.onTimeRatePct).toBeGreaterThan(80);
    expect(alphaSquad.avgResolutionHours).toBeGreaterThan(0);
  });

  it("5. Exports verifiable compliance report in CSV and JSON formats", () => {
    const csvExport = monitoringAnalyticsService.exportComplianceReport("csv");
    expect(csvExport).toContain("HIRWA SPARSH MRV MONITORING ANALYTICS EXPORT");
    expect(csvExport).toContain("CADENCE FULFILLMENT BREAKDOWN");
    expect(csvExport).toContain("SPECIES SURVIVAL & ALLOMETRIC GROWTH");

    const jsonExport = monitoringAnalyticsService.exportComplianceReport("json");
    const parsed = JSON.parse(jsonExport);
    expect(parsed.standard).toContain("Verra VM0047");
    expect(parsed.data.totalMonitoredHectares).toBeGreaterThan(0);
  });
});
