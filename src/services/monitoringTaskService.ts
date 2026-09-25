/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 9 TASK 47
 * Due / Overdue Monitoring Task Generation & Work Order SLA Engine
 *
 * Automatically generates, tracks, escalates, and resolves concrete work orders
 * derived from recurring MRV monitoring schedules (Task 46) and field inspection quotas.
 */

import {
  monitoringScheduleService,
  MonitoringSchedule,
  CadenceType,
} from "./monitoringScheduleService";

export type TaskStatus =
  | "due"
  | "in_progress"
  | "overdue"
  | "escalated"
  | "completed"
  | "cancelled";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface MonitoringTask {
  id: string;
  scheduleId?: string; // Links back to parent MonitoringSchedule if recurring
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  cadenceType: CadenceType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  gracePeriodDays: number;
  assignedTo: string; // e.g. "Sahayadri Ranger Squad Alpha" or "Aeronav UAV Team"
  targetQuota: number; // e.g. 45 PSP sample quadrats or 80ha
  quotaUnit: string; // e.g. "quadrats", "hectares", "stations", "trees"
  completedAt?: string | null;
  completedBy?: string | null;
  completionSummary?: string;
  slaBreached: boolean;
  overdueDurationHours: number;
  escalatedTo?: string | null;
  escalationReason?: string | null;
  locationReference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskParams {
  scheduleId?: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  cadenceType: CadenceType;
  priority?: TaskPriority;
  dueDate: string;
  gracePeriodDays?: number;
  assignedTo: string;
  targetQuota: number;
  quotaUnit?: string;
  locationReference?: string;
  metadata?: Record<string, any>;
}

export interface CompleteTaskParams {
  completedBy: string;
  completionSummary: string;
  itemsProcessed?: number;
  evidenceArtifacts?: Record<string, any>;
}

export interface TaskFilter {
  searchQuery?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  cadenceType?: CadenceType | "all";
  projectId?: string | "all";
}

export interface TaskKPIs {
  totalTasks: number;
  dueCount: number;
  overdueCount: number;
  escalatedCount: number;
  inProgressCount: number;
  completedCount: number;
  slaComplianceRate: number;
  criticalOverdueCount: number;
}

const SEED_TASKS: MonitoringTask[] = [
  {
    id: "TASK-PSP-2026-001",
    scheduleId: "SCHED-PSP-002",
    title: "Ground Truth PSP Audit — Stratified Quadrat Batch #09",
    description: "Conduct field biometrics (DBH, height, crown vigor) for 45 Cochran sample quadrats in Western Buffer.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "ground_sample_psp",
    status: "due",
    priority: "high",
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    gracePeriodDays: 7,
    assignedTo: "Sahayadri Ranger Squad Alpha",
    targetQuota: 45,
    quotaUnit: "quadrats",
    completedAt: null,
    completedBy: null,
    slaBreached: false,
    overdueDurationHours: 0,
    locationReference: "Sector 4B (Plots Q12-Q56)",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "TASK-SAT-2026-002",
    scheduleId: "SCHED-SAT-001",
    title: "Copernicus Sentinel-2 5-Day Orbital Pass Ingestion",
    description: "Automated verification of 10m L2A NDVI/NDRE spectral raster over 1,420ha plantation area.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "satellite_sentinel2",
    status: "due",
    priority: "medium",
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    gracePeriodDays: 2,
    assignedTo: "Automated Satellite Ingestion Daemon",
    targetQuota: 1420,
    quotaUnit: "hectares",
    completedAt: null,
    completedBy: null,
    slaBreached: false,
    overdueDurationHours: 0,
    locationReference: "Full Project Boundary Polygon",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "TASK-DRONE-2026-003",
    scheduleId: "SCHED-DRONE-003",
    title: "Konkan Mangrove Aerial LiDAR & Orthomosaic Sweep",
    description: "UAV drone survey measuring volumetric crown expansion and tidal siltation across 80ha mangrove zone.",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    cadenceType: "drone_lidar_ortho",
    status: "overdue",
    priority: "critical",
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    gracePeriodDays: 3,
    assignedTo: "Aeronav UAV Survey Unit",
    targetQuota: 80,
    quotaUnit: "hectares",
    completedAt: null,
    completedBy: null,
    slaBreached: true,
    overdueDurationHours: 48,
    escalatedTo: "Lead Verifier (Dr. A. Deshmukh)",
    escalationReason: "Flight window delayed due to coastal monsoonal gust front. 48h SLA breach.",
    locationReference: "Estuary Zone East (Grid E1-E8)",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "TASK-WX-2026-004",
    scheduleId: "SCHED-WX-004",
    title: "Daily Microclimate & Rainfall Deficit Ingestion",
    description: "Pull daily ERA5 / IMD weather station telemetry and compute 7-day cumulative drought index.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "weather_deficit_telemetry",
    status: "completed",
    priority: "low",
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    gracePeriodDays: 1,
    assignedTo: "Automated Weather Telemetry Engine",
    targetQuota: 1,
    quotaUnit: "stations",
    completedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    completedBy: "Automated Telemetry Daemon",
    completionSummary: "Ingested 14.2mm precipitation telemetry. Soil moisture: 28.4% (Optimal foliar hydration).",
    slaBreached: false,
    overdueDurationHours: 0,
    locationReference: "Station WX-Sahayadri-01",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "TASK-CARB-2026-005",
    scheduleId: "SCHED-CARB-005",
    title: "IPCC Tier-2 Allometric Reconciliation & Biomass Validation",
    description: "Reconcile Chave pantropical allometry model against 2025 cohort biometric measurements.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "carbon_biomass_allometry",
    status: "in_progress",
    priority: "high",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    gracePeriodDays: 30,
    assignedTo: "Chief Carbon Modeler (P. Nair)",
    targetQuota: 12500,
    quotaUnit: "trees",
    completedAt: null,
    completedBy: null,
    slaBreached: false,
    overdueDurationHours: 0,
    locationReference: "Stratum A & B Plantation Plots",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export class MonitoringTaskService {
  private tasks: MonitoringTask[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.tasks = JSON.parse(JSON.stringify(SEED_TASKS));
    this.notify();
  }

  public getTasks(filter?: TaskFilter): MonitoringTask[] {
    let result = [...this.tasks];
    if (!filter) return result;

    if (filter.status && filter.status !== "all") {
      result = result.filter((t) => t.status === filter.status);
    }

    if (filter.priority && filter.priority !== "all") {
      result = result.filter((t) => t.priority === filter.priority);
    }

    if (filter.cadenceType && filter.cadenceType !== "all") {
      result = result.filter((t) => t.cadenceType === filter.cadenceType);
    }

    if (filter.projectId && filter.projectId !== "all") {
      result = result.filter((t) => t.projectId === filter.projectId);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q) ||
          t.assignedTo.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getTaskById(id: string): MonitoringTask | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  /**
   * Evaluates active schedules in MonitoringScheduleService and generates due tasks
   * if the schedule's next run date is due (within 48h or past due) and no uncompleted task exists.
   */
  public evaluateAndGenerateDueTasks(): { generatedCount: number; tasks: MonitoringTask[] } {
    const schedules = monitoringScheduleService.getSchedules({ status: "active" });
    const now = Date.now();
    const horizonMs = now + 48 * 3600000; // 48 hours lookahead window

    const newlyGenerated: MonitoringTask[] = [];

    schedules.forEach((sched) => {
      const nextRunMs = new Date(sched.nextScheduledRunAt).getTime();
      
      // Check if scheduled run date falls within due window
      if (nextRunMs <= horizonMs) {
        // Check if there is already an active (uncompleted) task for this schedule
        const existingActive = this.tasks.find(
          (t) => t.scheduleId === sched.id && (t.status === "due" || t.status === "in_progress" || t.status === "overdue" || t.status === "escalated")
        );

        if (!existingActive) {
          const isPastDue = nextRunMs < now;
          const status: TaskStatus = isPastDue ? "overdue" : "due";
          const priority: TaskPriority = sched.cadenceType === "ground_sample_psp" ? "high" : sched.cadenceType === "drone_lidar_ortho" ? "critical" : "medium";

          let unit = "units";
          if (sched.cadenceType === "ground_sample_psp") unit = "quadrats";
          else if (sched.cadenceType === "satellite_sentinel2" || sched.cadenceType === "drone_lidar_ortho") unit = "hectares";
          else if (sched.cadenceType === "weather_deficit_telemetry") unit = "stations";
          else if (sched.cadenceType === "carbon_biomass_allometry") unit = "trees";

          const created = this.createTask({
            scheduleId: sched.id,
            title: `Recurring ${sched.name}`,
            description: sched.description,
            projectId: sched.projectId,
            projectName: sched.projectName,
            cadenceType: sched.cadenceType,
            priority,
            dueDate: sched.nextScheduledRunAt,
            gracePeriodDays: sched.gracePeriodDays,
            assignedTo: sched.assignedTeam || "Field Operations Squad",
            targetQuota: sched.targetQuota || 1,
            quotaUnit: unit,
            locationReference: `${sched.projectName} Area`,
          });

          newlyGenerated.push(created);
        }
      }
    });

    this.checkAndEscalateOverdueTasks();
    return { generatedCount: newlyGenerated.length, tasks: newlyGenerated };
  }

  /**
   * Checks all open tasks and marks overdue or escalates if past grace period.
   */
  public checkAndEscalateOverdueTasks(): { overdueCount: number; escalatedCount: number } {
    const now = Date.now();
    let overdueCount = 0;
    let escalatedCount = 0;

    this.tasks = this.tasks.map((task) => {
      if (task.status === "completed" || task.status === "cancelled") return task;

      const dueMs = new Date(task.dueDate).getTime();
      const graceMs = (task.gracePeriodDays || 0) * 86400000;
      const breachThresholdMs = dueMs + graceMs;

      if (now > dueMs) {
        const overdueHours = Math.max(0, Math.floor((now - dueMs) / 3600000));
        let newStatus: TaskStatus = task.status;
        let slaBreached = task.slaBreached;
        let escalatedTo = task.escalatedTo;
        let escalationReason = task.escalationReason;

        if (now > breachThresholdMs) {
          // Grace period exceeded -> SLA Breached & Escalated
          slaBreached = true;
          if (task.status !== "escalated") {
            newStatus = "escalated";
            escalatedTo = "Senior MRV Operations Lead";
            escalationReason = `Overdue by ${overdueHours} hours (exceeded ${task.gracePeriodDays} days grace period).`;
            escalatedCount++;
          }
        } else {
          // Within grace period but past due date -> Overdue
          if (task.status === "due") {
            newStatus = "overdue";
            overdueCount++;
          }
        }

        return {
          ...task,
          status: newStatus,
          slaBreached,
          overdueDurationHours: overdueHours,
          escalatedTo,
          escalationReason,
          updatedAt: new Date().toISOString(),
        };
      }

      return task;
    });

    this.notify();
    return { overdueCount, escalatedCount };
  }

  public createTask(params: CreateTaskParams): MonitoringTask {
    const id = "TASK-" + params.cadenceType.substring(0, 3).toUpperCase() + "-" + Date.now().toString().slice(-6);
    const now = new Date().toISOString();

    const dueMs = new Date(params.dueDate).getTime();
    const isPastDue = dueMs < Date.now();

    const newTask: MonitoringTask = {
      id,
      scheduleId: params.scheduleId,
      title: params.title,
      description: params.description,
      projectId: params.projectId,
      projectName: params.projectName,
      cadenceType: params.cadenceType,
      status: isPastDue ? "overdue" : "due",
      priority: params.priority || "medium",
      dueDate: params.dueDate,
      gracePeriodDays: params.gracePeriodDays ?? 3,
      assignedTo: params.assignedTo,
      targetQuota: params.targetQuota,
      quotaUnit: params.quotaUnit || "units",
      completedAt: null,
      completedBy: null,
      slaBreached: false,
      overdueDurationHours: isPastDue ? Math.floor((Date.now() - dueMs) / 3600000) : 0,
      locationReference: params.locationReference || "Project Sector Baseline",
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.unshift(newTask);
    this.notify();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<MonitoringTask>): MonitoringTask {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);

    const updated = {
      ...this.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.tasks[idx] = updated;
    this.notify();
    return updated;
  }

  public assignTask(id: string, assignee: string, priority?: TaskPriority): MonitoringTask {
    return this.updateTask(id, {
      assignedTo: assignee,
      priority: priority || undefined,
    });
  }

  public startTask(id: string): MonitoringTask {
    const task = this.getTaskById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    return this.updateTask(id, { status: "in_progress" });
  }

  public completeTask(id: string, params: CompleteTaskParams): MonitoringTask {
    const task = this.getTaskById(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const completedAt = new Date().toISOString();
    const updated = this.updateTask(id, {
      status: "completed",
      completedAt,
      completedBy: params.completedBy,
      completionSummary: params.completionSummary,
      metadata: {
        ...task.metadata,
        itemsProcessed: params.itemsProcessed ?? task.targetQuota,
        evidenceArtifacts: params.evidenceArtifacts,
      },
    });

    // If linked to a parent schedule, trigger recurrence advance in monitoringScheduleService
    if (task.scheduleId) {
      const schedule = monitoringScheduleService.getScheduleById(task.scheduleId);
      if (schedule) {
        const nextRun = monitoringScheduleService.computeNextRunDate(schedule.recurrence);
        monitoringScheduleService.updateSchedule(task.scheduleId, {
          lastRunAt: completedAt,
          nextScheduledRunAt: nextRun,
          totalRunsExecuted: schedule.totalRunsExecuted + 1,
          successfulRunsCount: schedule.successfulRunsCount + 1,
          lastExecutionSummary: params.completionSummary,
        });
      }
    }

    return updated;
  }

  public escalateTask(id: string, escalatedTo: string, escalationReason: string): MonitoringTask {
    return this.updateTask(id, {
      status: "escalated",
      slaBreached: true,
      escalatedTo,
      escalationReason,
    });
  }

  public cancelTask(id: string, reason?: string): MonitoringTask {
    return this.updateTask(id, {
      status: "cancelled",
      completionSummary: reason ? `Cancelled: ${reason}` : "Cancelled by operator",
    });
  }

  public deleteTask(id: string): boolean {
    const len = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length !== len) {
      this.notify();
      return true;
    }
    return false;
  }

  public getTaskKPIs(): TaskKPIs {
    const totalTasks = this.tasks.length;
    const dueCount = this.tasks.filter((t) => t.status === "due").length;
    const overdueCount = this.tasks.filter((t) => t.status === "overdue").length;
    const escalatedCount = this.tasks.filter((t) => t.status === "escalated").length;
    const inProgressCount = this.tasks.filter((t) => t.status === "in_progress").length;
    const completedCount = this.tasks.filter((t) => t.status === "completed").length;
    const criticalOverdueCount = this.tasks.filter(
      (t) => (t.status === "overdue" || t.status === "escalated") && t.priority === "critical"
    ).length;

    const resolved = completedCount + overdueCount + escalatedCount;
    const compliant = completedCount;
    const slaComplianceRate = resolved > 0 ? Math.round((compliant / resolved) * 100) : 100;

    return {
      totalTasks,
      dueCount,
      overdueCount,
      escalatedCount,
      inProgressCount,
      completedCount,
      slaComplianceRate,
      criticalOverdueCount,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("MonitoringTaskService listener error:", err);
      }
    });
  }
}

export const monitoringTaskService = new MonitoringTaskService();
