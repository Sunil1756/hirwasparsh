/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 9 TASK 46
 * Automated Monitoring Schedules & Recurrence Engine Service
 *
 * Orchestrates multi-cadence recurring monitoring for B2B institutional afforestation & carbon registries:
 * 1. Sentinel-2 Satellite Multi-Spectral Overpass Sweep (Copernicus 5-day cycle)
 * 2. Ground Truth Sample Plot (PSP) Stratified Audit (Monthly/Quarterly Cochran's random sampling)
 * 3. UAV Drone LiDAR & Orthomosaic Canopy Survey (Seasonal/Bi-Annual)
 * 4. Weather & Climate Deficit Telemetry Ingestion (Daily microclimate tracking)
 * 5. Carbon Accrual & IPCC Tier-2 Allometry Reconciliation (Annual/Semi-annual)
 */

export type CadenceType =
  | "satellite_sentinel2"
  | "ground_sample_psp"
  | "drone_lidar_ortho"
  | "weather_deficit_telemetry"
  | "carbon_biomass_allometry"
  | "soil_moisture_ground";

export type ScheduleStatus =
  | "active"
  | "paused"
  | "running"
  | "overdue"
  | "completed";

export interface RecurrenceRule {
  intervalDays?: number;
  cronExpression?: string;
  adaptiveTriggerEvent?: string;
}

export interface MonitoringSchedule {
  id: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  cadenceType: CadenceType;
  status: ScheduleStatus;
  recurrence: RecurrenceRule;
  targetQuota?: number; // e.g. 35 PSP sample quadrats
  assignedTeam?: string; // e.g. "Sahayadri Rangers Unit 4"
  notificationChannels: string[]; // e.g. ["email", "in_app", "webhook"]
  lastRunAt?: string | null;
  nextScheduledRunAt: string;
  gracePeriodDays: number;
  totalRunsExecuted: number;
  successfulRunsCount: number;
  failedRunsCount: number;
  lastExecutionDurationMs?: number;
  lastExecutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleParams {
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  cadenceType: CadenceType;
  recurrence: RecurrenceRule;
  targetQuota?: number;
  assignedTeam?: string;
  notificationChannels?: string[];
  gracePeriodDays?: number;
  initialNextRun?: string;
}

export interface ScheduleExecutionLog {
  executionId: string;
  scheduleId: string;
  scheduleName: string;
  cadenceType: CadenceType;
  projectId: string;
  triggeredAt: string;
  completedAt: string;
  durationMs: number;
  status: "success" | "warning" | "failure";
  triggerType: "scheduled_cron" | "manual_dispatch" | "adaptive_catchup";
  itemsProcessed: number;
  anomaliesDetected: number;
  executionDetails: string;
  outputArtifacts?: Record<string, any>;
}

export interface ScheduleKPIs {
  totalSchedules: number;
  activeSchedules: number;
  pausedSchedules: number;
  runsNext24h: number;
  overdueSchedules: number;
  overallSuccessRate: number;
  totalExecutionsAllTime: number;
}

export interface ScheduleFilter {
  searchQuery?: string;
  cadenceType?: CadenceType | "all";
  status?: ScheduleStatus | "all";
  projectId?: string | "all";
}

const SEED_SCHEDULES: MonitoringSchedule[] = [
  {
    id: "SCHED-SAT-001",
    name: "Sentinel-2 Multi-Spectral Orbital Sweep",
    description: "Automated Copernicus 5-day cycle pulling 10m L2A NDVI, NDRE, and NDWI foliar moisture tiles.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "satellite_sentinel2",
    status: "active",
    recurrence: {
      intervalDays: 5,
      cronExpression: "0 6 */5 * *",
    },
    targetQuota: 1420, // hectares
    assignedTeam: "Automated Satellite Ingestion Daemon",
    notificationChannels: ["in_app", "webhook"],
    lastRunAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    nextScheduledRunAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    gracePeriodDays: 2,
    totalRunsExecuted: 28,
    successfulRunsCount: 28,
    failedRunsCount: 0,
    lastExecutionDurationMs: 3420,
    lastExecutionSummary: "Overpass tile ingested. Cloud cover: 4.2%. Mean NDVI: 0.74 (+0.03 growth delta).",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-09-22T06:00:00.000Z",
  },
  {
    id: "SCHED-PSP-002",
    name: "Stratified Sample Quadrat (PSP) Ground Audit",
    description: "Cochran's Stratified Random Sampling quota dispatch for field rangers to audit representative plot quadrats.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "ground_sample_psp",
    status: "active",
    recurrence: {
      intervalDays: 30,
      cronExpression: "0 0 1 * *",
    },
    targetQuota: 45, // sample trees
    assignedTeam: "Sahayadri Ranger Squad Alpha",
    notificationChannels: ["email", "in_app", "sms"],
    lastRunAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    nextScheduledRunAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    gracePeriodDays: 7,
    totalRunsExecuted: 8,
    successfulRunsCount: 8,
    failedRunsCount: 0,
    lastExecutionDurationMs: 18500,
    lastExecutionSummary: "45 of 45 quadrat sample trees audited. 97.8% ground-truth survival confirmed.",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  },
  {
    id: "SCHED-DRONE-003",
    name: "UAV Drone LiDAR & Canopy Orthomosaic Survey",
    description: "High-resolution 2cm/pixel aerial photogrammetry sweep measuring volumetric crown expansion.",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    cadenceType: "drone_lidar_ortho",
    status: "active",
    recurrence: {
      intervalDays: 90,
      cronExpression: "0 0 1 */3 *",
    },
    targetQuota: 80, // hectares
    assignedTeam: "Aeronav UAV Survey Unit",
    notificationChannels: ["email", "in_app"],
    lastRunAt: new Date(Date.now() - 82 * 86400000).toISOString(),
    nextScheduledRunAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    gracePeriodDays: 14,
    totalRunsExecuted: 3,
    successfulRunsCount: 3,
    failedRunsCount: 0,
    lastExecutionDurationMs: 45000,
    lastExecutionSummary: "Drone flight completed across 80ha. Mean canopy height +14.2cm.",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
  },
  {
    id: "SCHED-WX-004",
    name: "Microclimate & Precipitation Deficit Ingestion",
    description: "Daily ERA5 / IMD weather grid aggregation tracking cumulative dry spell indices and irrigation demand.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "weather_deficit_telemetry",
    status: "active",
    recurrence: {
      intervalDays: 1,
      cronExpression: "0 4 * * *",
    },
    targetQuota: 1,
    assignedTeam: "Automated Weather Telemetry Engine",
    notificationChannels: ["in_app"],
    lastRunAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    nextScheduledRunAt: new Date(Date.now() + 6 * 3600000).toISOString(),
    gracePeriodDays: 1,
    totalRunsExecuted: 114,
    successfulRunsCount: 114,
    failedRunsCount: 0,
    lastExecutionDurationMs: 1200,
    lastExecutionSummary: "Daily rainfall: 14.2mm. Soil moisture: 28.4% (Optimal foliar hydration).",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-09-24T04:00:00.000Z",
  },
  {
    id: "SCHED-CARB-005",
    name: "IPCC Tier-2 Carbon Accrual & Allometry Reconciliation",
    description: "Annual Chave pantropical allometric carbon accrual estimation & baseline density reconciliation.",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    cadenceType: "carbon_biomass_allometry",
    status: "paused",
    recurrence: {
      intervalDays: 365,
      cronExpression: "0 0 1 1 *",
    },
    targetQuota: 12500, // tree cohort
    assignedTeam: "Chief Carbon Modeler",
    notificationChannels: ["email", "in_app"],
    lastRunAt: "2026-01-01T00:00:00.000Z",
    nextScheduledRunAt: "2027-01-01T00:00:00.000Z",
    gracePeriodDays: 30,
    totalRunsExecuted: 1,
    successfulRunsCount: 1,
    failedRunsCount: 0,
    lastExecutionDurationMs: 28000,
    lastExecutionSummary: "Carbon accrual reconciled: 428.5 MT CO2e sequestered in 2025 cohort.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const SEED_EXECUTION_LOGS: ScheduleExecutionLog[] = [
  {
    executionId: "EXEC-2026-0922-01",
    scheduleId: "SCHED-SAT-001",
    scheduleName: "Sentinel-2 Multi-Spectral Orbital Sweep",
    cadenceType: "satellite_sentinel2",
    projectId: "proj-sahayadri",
    triggeredAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 86400000 + 3420).toISOString(),
    durationMs: 3420,
    status: "success",
    triggerType: "scheduled_cron",
    itemsProcessed: 1420,
    anomaliesDetected: 0,
    executionDetails: "Successfully fetched Copernicus Sentinel-2 L2A tile. Cloud cover 4.2%. Mean NDVI: 0.74 (+0.03 delta).",
    outputArtifacts: { meanNdvi: 0.74, cloudCoverPercent: 4.2, resolutionMeters: 10 },
  },
  {
    executionId: "EXEC-2026-0924-02",
    scheduleId: "SCHED-WX-004",
    scheduleName: "Microclimate & Precipitation Deficit Ingestion",
    cadenceType: "weather_deficit_telemetry",
    projectId: "proj-sahayadri",
    triggeredAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 18 * 3600000 + 1200).toISOString(),
    durationMs: 1200,
    status: "success",
    triggerType: "scheduled_cron",
    itemsProcessed: 1,
    anomaliesDetected: 0,
    executionDetails: "IMD Weather grid synced. 14.2mm precipitation recorded. Soil moisture 28.4%.",
    outputArtifacts: { rainfallMm: 14.2, soilMoisturePercent: 28.4, temperatureC: 27.5 },
  },
];

export class MonitoringScheduleService {
  private schedules: MonitoringSchedule[] = [];
  private executionLogs: ScheduleExecutionLog[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.schedules = JSON.parse(JSON.stringify(SEED_SCHEDULES));
    this.executionLogs = JSON.parse(JSON.stringify(SEED_EXECUTION_LOGS));
    this.notify();
  }

  public getSchedules(filter?: ScheduleFilter): MonitoringSchedule[] {
    let result = [...this.schedules];

    if (!filter) return result;

    if (filter.cadenceType && filter.cadenceType !== "all") {
      result = result.filter((s) => s.cadenceType === filter.cadenceType);
    }

    if (filter.status && filter.status !== "all") {
      result = result.filter((s) => s.status === filter.status);
    }

    if (filter.projectId && filter.projectId !== "all") {
      result = result.filter((s) => s.projectId === filter.projectId);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.projectName.toLowerCase().includes(q) ||
          s.cadenceType.toLowerCase().includes(q) ||
          (s.assignedTeam && s.assignedTeam.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getScheduleById(id: string): MonitoringSchedule | undefined {
    return this.schedules.find((s) => s.id === id);
  }

  public createSchedule(params: CreateScheduleParams): MonitoringSchedule {
    const id = "SCHED-" + params.cadenceType.substring(0, 3).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();

    const nextRun = params.initialNextRun || this.computeNextRunDate(params.recurrence);

    const newSchedule: MonitoringSchedule = {
      id,
      name: params.name,
      description: params.description,
      projectId: params.projectId,
      projectName: params.projectName,
      cadenceType: params.cadenceType,
      status: "active",
      recurrence: params.recurrence,
      targetQuota: params.targetQuota || 30,
      assignedTeam: params.assignedTeam || "Field Operations Team",
      notificationChannels: params.notificationChannels || ["in_app"],
      lastRunAt: null,
      nextScheduledRunAt: nextRun,
      gracePeriodDays: params.gracePeriodDays ?? 3,
      totalRunsExecuted: 0,
      successfulRunsCount: 0,
      failedRunsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.unshift(newSchedule);
    this.notify();
    return newSchedule;
  }

  public updateSchedule(id: string, updates: Partial<MonitoringSchedule>): MonitoringSchedule {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Schedule ${id} not found`);

    const existing = this.schedules[index];
    const updated: MonitoringSchedule = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.schedules[index] = updated;
    this.notify();
    return updated;
  }

  public toggleScheduleStatus(id: string, explicitStatus?: ScheduleStatus): MonitoringSchedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error(`Schedule ${id} not found`);

    let newStatus: ScheduleStatus = explicitStatus || (schedule.status === "active" ? "paused" : "active");
    return this.updateSchedule(id, { status: newStatus });
  }

  public deleteSchedule(id: string): boolean {
    const initialLength = this.schedules.length;
    this.schedules = this.schedules.filter((s) => s.id !== id);
    if (this.schedules.length !== initialLength) {
      this.notify();
      return true;
    }
    return false;
  }

  public async triggerScheduleExecution(
    id: string,
    triggerType: "manual_dispatch" | "scheduled_cron" | "adaptive_catchup" = "manual_dispatch"
  ): Promise<ScheduleExecutionLog> {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error(`Schedule ${id} not found for execution`);

    const startTime = Date.now();
    const triggeredAt = new Date(startTime).toISOString();

    // Simulate realistic asynchronous work execution (100-300ms)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const durationMs = Date.now() - startTime + Math.floor(Math.random() * 800 + 400);
    const completedAt = new Date().toISOString();

    let itemsProcessed = schedule.targetQuota || 1;
    let anomaliesDetected = 0;
    let summaryText = "";

    switch (schedule.cadenceType) {
      case "satellite_sentinel2":
        itemsProcessed = schedule.targetQuota || 1420;
        summaryText = `Copernicus Sentinel-2 pass ingested across ${itemsProcessed} hectares. Average NDVI vigor: 0.76 (Cloud cover: 2.1%).`;
        break;
      case "ground_sample_psp":
        itemsProcessed = schedule.targetQuota || 35;
        summaryText = `Ground survey dispatched for ${itemsProcessed} Cochran PSP sample quadrats. Ranger batch manifest activated.`;
        break;
      case "drone_lidar_ortho":
        itemsProcessed = schedule.targetQuota || 50;
        summaryText = `Aerial drone photogrammetry mission completed. 2cm orthomosaic processed across ${itemsProcessed} ha.`;
        break;
      case "weather_deficit_telemetry":
        itemsProcessed = 1;
        summaryText = "Microclimate grid synchronized. Soil moisture index 29.1%, 0 drought flags detected.";
        break;
      case "carbon_biomass_allometry":
        itemsProcessed = schedule.targetQuota || 5000;
        summaryText = `Chave allometric equation recalculated for cohort of ${itemsProcessed} trees. Carbon accrual updated.`;
        break;
      default:
        itemsProcessed = 1;
        summaryText = `Automated recurrence job executed successfully for ${schedule.name}.`;
    }

    const log: ScheduleExecutionLog = {
      executionId: "EXEC-" + Date.now().toString(36).toUpperCase(),
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      cadenceType: schedule.cadenceType,
      projectId: schedule.projectId,
      triggeredAt,
      completedAt,
      durationMs,
      status: "success",
      triggerType,
      itemsProcessed,
      anomaliesDetected,
      executionDetails: summaryText,
      outputArtifacts: {
        timestamp: completedAt,
        processedQuota: itemsProcessed,
      },
    };

    this.executionLogs.unshift(log);

    // Update schedule metadata
    const nextRun = this.computeNextRunDate(schedule.recurrence);
    this.updateSchedule(schedule.id, {
      lastRunAt: completedAt,
      nextScheduledRunAt: nextRun,
      totalRunsExecuted: schedule.totalRunsExecuted + 1,
      successfulRunsCount: schedule.successfulRunsCount + 1,
      lastExecutionDurationMs: durationMs,
      lastExecutionSummary: summaryText,
    });

    return log;
  }

  public getExecutionLogs(scheduleId?: string): ScheduleExecutionLog[] {
    if (!scheduleId) return [...this.executionLogs];
    return this.executionLogs.filter((log) => log.scheduleId === scheduleId);
  }

  public getScheduleKPIs(): ScheduleKPIs {
    const totalSchedules = this.schedules.length;
    const activeSchedules = this.schedules.filter((s) => s.status === "active").length;
    const pausedSchedules = this.schedules.filter((s) => s.status === "paused").length;

    const now = Date.now();
    const in24h = now + 86400000;

    const runsNext24h = this.schedules.filter((s) => {
      if (s.status !== "active") return false;
      const nextMs = new Date(s.nextScheduledRunAt).getTime();
      return nextMs >= now && nextMs <= in24h;
    }).length;

    const overdueSchedules = this.schedules.filter((s) => {
      if (s.status !== "active") return false;
      const nextMs = new Date(s.nextScheduledRunAt).getTime();
      return nextMs < now;
    }).length;

    let totalRuns = 0;
    let successRuns = 0;
    this.schedules.forEach((s) => {
      totalRuns += s.totalRunsExecuted;
      successRuns += s.successfulRunsCount;
    });

    const overallSuccessRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;

    return {
      totalSchedules,
      activeSchedules,
      pausedSchedules,
      runsNext24h,
      overdueSchedules,
      overallSuccessRate,
      totalExecutionsAllTime: totalRuns,
    };
  }

  public computeNextRunDate(recurrence: RecurrenceRule, fromDate: Date = new Date()): string {
    const days = recurrence.intervalDays || 5;
    const nextMs = fromDate.getTime() + days * 86400000;
    return new Date(nextMs).toISOString();
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
        console.error("MonitoringScheduleService listener error:", err);
      }
    });
  }
}

export const monitoringScheduleService = new MonitoringScheduleService();
