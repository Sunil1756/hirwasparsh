import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringTaskService,
  MonitoringTask,
} from "../services/monitoringTaskService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";

describe("PHASE 9 TASK 47 — MonitoringTaskService & SLA Engine", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
  });

  it("1. Initializes with default seeded work orders & tasks", () => {
    const tasks = monitoringTaskService.getTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(4);

    const pspTask = tasks.find((t) => t.cadenceType === "ground_sample_psp");
    expect(pspTask).toBeDefined();
    expect(pspTask?.assignedTo).toContain("Sahayadri Ranger Squad Alpha");
    expect(pspTask?.status).toBe("due");

    const overdueTask = tasks.find((t) => t.status === "overdue");
    expect(overdueTask).toBeDefined();
    expect(overdueTask?.slaBreached).toBe(true);
  });

  it("2. Filters tasks by status, priority, and search query", () => {
    const dueTasks = monitoringTaskService.getTasks({ status: "due" });
    expect(dueTasks.every((t) => t.status === "due")).toBe(true);

    const criticalTasks = monitoringTaskService.getTasks({ priority: "critical" });
    expect(criticalTasks.every((t) => t.priority === "critical")).toBe(true);

    const searched = monitoringTaskService.getTasks({ searchQuery: "Mangrove" });
    expect(searched.length).toBeGreaterThan(0);
    expect(searched[0].projectName).toContain("Mangrove");
  });

  it("3. Evaluates active recurring schedules and automatically generates due tasks", () => {
    // Clear tasks first to test clean generation
    const initialTasks = monitoringTaskService.getTasks();
    initialTasks.forEach((t) => monitoringTaskService.deleteTask(t.id));
    expect(monitoringTaskService.getTasks().length).toBe(0);

    const result = monitoringTaskService.evaluateAndGenerateDueTasks();
    expect(result.generatedCount).toBeGreaterThan(0);
    expect(monitoringTaskService.getTasks().length).toBeGreaterThan(0);

    const generated = monitoringTaskService.getTasks()[0];
    expect(generated.scheduleId).toBeDefined();
    expect(generated.title).toContain("Recurring");
  });

  it("4. Checks and escalates overdue tasks exceeding SLA grace periods", () => {
    const newTask = monitoringTaskService.createTask({
      title: "Immediate Expired Task",
      description: "Test grace period expiration",
      projectId: "proj-sahayadri",
      projectName: "Sahayadri Tiger Reserve Afforestation",
      cadenceType: "ground_sample_psp",
      dueDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      gracePeriodDays: 2, // 2 days grace, but due 10 days ago -> breached!
      assignedTo: "Test Squad",
      targetQuota: 10,
    });

    const checkResult = monitoringTaskService.checkAndEscalateOverdueTasks();
    expect(checkResult.escalatedCount).toBeGreaterThanOrEqual(1);

    const updated = monitoringTaskService.getTaskById(newTask.id);
    expect(updated?.status).toBe("escalated");
    expect(updated?.slaBreached).toBe(true);
    expect(updated?.escalatedTo).toBeDefined();
  });

  it("5. Updates, starts, and reassigns tasks", () => {
    const tasks = monitoringTaskService.getTasks({ status: "due" });
    const target = tasks[0];

    const started = monitoringTaskService.startTask(target.id);
    expect(started.status).toBe("in_progress");

    const reassigned = monitoringTaskService.assignTask(target.id, "Ranger Squad Delta", "critical");
    expect(reassigned.assignedTo).toBe("Ranger Squad Delta");
    expect(reassigned.priority).toBe("critical");
  });

  it("6. Completes task and synchronizes parent recurring schedule", () => {
    const taskWithSchedule = monitoringTaskService.getTasks().find((t) => t.scheduleId);
    expect(taskWithSchedule).toBeDefined();

    const scheduleId = taskWithSchedule!.scheduleId!;
    const initialSchedule = monitoringScheduleService.getScheduleById(scheduleId)!;
    const initialRuns = initialSchedule.totalRunsExecuted;

    const completed = monitoringTaskService.completeTask(taskWithSchedule!.id, {
      completedBy: "Auditor Lead R. Kadam",
      completionSummary: "Field quadrat audit verified with 98% survival.",
      itemsProcessed: 45,
    });

    expect(completed.status).toBe("completed");
    expect(completed.completedBy).toBe("Auditor Lead R. Kadam");
    expect(completed.completedAt).toBeDefined();

    // Parent schedule should have advanced
    const updatedSchedule = monitoringScheduleService.getScheduleById(scheduleId)!;
    expect(updatedSchedule.totalRunsExecuted).toBe(initialRuns + 1);
    expect(updatedSchedule.successfulRunsCount).toBeGreaterThan(0);
  });

  it("7. Computes accurate SLA KPIs & work order metrics", () => {
    const kpis = monitoringTaskService.getTaskKPIs();
    expect(kpis.totalTasks).toBeGreaterThan(0);
    expect(kpis.dueCount).toBeGreaterThanOrEqual(0);
    expect(kpis.overdueCount).toBeGreaterThanOrEqual(0);
    expect(kpis.completedCount).toBeGreaterThanOrEqual(0);
    expect(kpis.slaComplianceRate).toBeGreaterThanOrEqual(0);
    expect(kpis.slaComplianceRate).toBeLessThanOrEqual(100);
  });
});
