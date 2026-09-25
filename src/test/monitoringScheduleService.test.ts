import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringScheduleService,
  MonitoringSchedule,
  CadenceType,
} from "../services/monitoringScheduleService";

describe("PHASE 9 TASK 46 — Automated Monitoring Schedules & Recurrence Engine Service", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
  });

  it("1. Initializes baseline schedules with multi-cadence recurring policies", () => {
    const schedules = monitoringScheduleService.getSchedules();

    expect(schedules.length).toBeGreaterThanOrEqual(5);

    const cadences = schedules.map((s) => s.cadenceType);
    expect(cadences).toContain("satellite_sentinel2");
    expect(cadences).toContain("ground_sample_psp");
    expect(cadences).toContain("drone_lidar_ortho");
    expect(cadences).toContain("weather_deficit_telemetry");
    expect(cadences).toContain("carbon_biomass_allometry");
  });

  it("2. Computes next scheduled run date accurately", () => {
    const from = new Date("2026-09-25T00:00:00.000Z");
    const next5Days = monitoringScheduleService.computeNextRunDate({ intervalDays: 5 }, from);
    expect(new Date(next5Days).toISOString()).toBe("2026-09-30T00:00:00.000Z");

    const next30Days = monitoringScheduleService.computeNextRunDate({ intervalDays: 30 }, from);
    expect(new Date(next30Days).toISOString()).toBe("2026-10-25T00:00:00.000Z");
  });

  it("3. Creates, updates, and deletes recurring monitoring schedules", () => {
    const initialCount = monitoringScheduleService.getSchedules().length;

    // Create
    const created = monitoringScheduleService.createSchedule({
      name: "Soil Moisture Probe Telemetry Sync",
      description: "Weekly telemetry pull from 12 LoRaWAN soil moisture probes.",
      projectId: "proj-sahayadri",
      projectName: "Sahayadri Tiger Reserve Afforestation",
      cadenceType: "soil_moisture_ground",
      recurrence: { intervalDays: 7, cronExpression: "0 0 * * 1" },
      targetQuota: 12,
      assignedTeam: "IoT Telemetry Unit",
      notificationChannels: ["in_app", "webhook"],
    });

    expect(created.id).toContain("SCHED-SOI-");
    expect(created.status).toBe("active");
    expect(monitoringScheduleService.getSchedules().length).toBe(initialCount + 1);

    // Update
    const updated = monitoringScheduleService.updateSchedule(created.id, {
      targetQuota: 24,
      assignedTeam: "IoT Telemetry Unit Plus",
    });
    expect(updated.targetQuota).toBe(24);
    expect(updated.assignedTeam).toBe("IoT Telemetry Unit Plus");

    // Delete
    const deleted = monitoringScheduleService.deleteSchedule(created.id);
    expect(deleted).toBe(true);
    expect(monitoringScheduleService.getSchedules().length).toBe(initialCount);
  });

  it("4. Toggles schedule status between active and paused", () => {
    const schedules = monitoringScheduleService.getSchedules();
    const target = schedules[0];
    const initialStatus = target.status;

    const toggled = monitoringScheduleService.toggleScheduleStatus(target.id);
    expect(toggled.status).toBe(initialStatus === "active" ? "paused" : "active");

    const reverted = monitoringScheduleService.toggleScheduleStatus(target.id);
    expect(reverted.status).toBe(initialStatus);
  });

  it("5. Triggers automated schedule execution, simulates run, and records execution log", async () => {
    const schedules = monitoringScheduleService.getSchedules();
    const target = schedules.find((s) => s.cadenceType === "satellite_sentinel2")!;
    const initialRuns = target.totalRunsExecuted;

    const log = await monitoringScheduleService.triggerScheduleExecution(target.id, "manual_dispatch");

    expect(log.executionId).toContain("EXEC-");
    expect(log.scheduleId).toBe(target.id);
    expect(log.status).toBe("success");
    expect(log.itemsProcessed).toBeGreaterThan(0);
    expect(log.executionDetails).toContain("Sentinel-2");

    const updated = monitoringScheduleService.getScheduleById(target.id)!;
    expect(updated.totalRunsExecuted).toBe(initialRuns + 1);
    expect(updated.successfulRunsCount).toBeGreaterThan(0);
    expect(updated.lastRunAt).toBeDefined();

    // Verify execution log stream
    const logs = monitoringScheduleService.getExecutionLogs(target.id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].executionId).toBe(log.executionId);
  });

  it("6. Aggregates schedule KPIs accurately", () => {
    const kpis = monitoringScheduleService.getScheduleKPIs();

    expect(kpis.totalSchedules).toBeGreaterThanOrEqual(5);
    expect(kpis.activeSchedules).toBeGreaterThanOrEqual(4);
    expect(kpis.overallSuccessRate).toBe(100);
    expect(kpis.totalExecutionsAllTime).toBeGreaterThan(0);
  });

  it("7. Filters schedules by cadence, status, and search query", () => {
    const satSchedules = monitoringScheduleService.getSchedules({ cadenceType: "satellite_sentinel2" });
    expect(satSchedules.every((s) => s.cadenceType === "satellite_sentinel2")).toBe(true);

    const activeSchedules = monitoringScheduleService.getSchedules({ status: "active" });
    expect(activeSchedules.every((s) => s.status === "active")).toBe(true);

    const searchResults = monitoringScheduleService.getSchedules({ searchQuery: "mangrove" });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults[0].projectName.toLowerCase()).toContain("mangrove");
  });
});
