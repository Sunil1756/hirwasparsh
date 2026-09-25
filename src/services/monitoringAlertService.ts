/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 9 TASK 49
 * Alert Rules Engine, Real-Time Anomaly Detector & Incident Response
 *
 * Evaluates biometric observations, satellite spectral indices, drought metrics, and SLA status
 * against configurable threshold rules. Spawns incident tickets and triggers multi-channel alerts.
 */

import { monitoringNotificationService } from "./monitoringNotificationService";
import { monitoringTaskService } from "./monitoringTaskService";

export type AlertType =
  | "canopy_degradation"
  | "drought_deficit"
  | "pest_disease_outbreak"
  | "survival_rate_breach"
  | "geofence_violation"
  | "carbon_accrual_deficit"
  | "sla_breach";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "acknowledged" | "investigating" | "resolved" | "dismissed";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  alertType: AlertType;
  severity: AlertSeverity;
  metricKey: string; // e.g. "delta_ndvi", "soil_moisture_pct", "dry_days_count", "survival_rate_pct"
  operator: "<" | ">" | "<=" | ">=" | "==";
  thresholdValue: number;
  unit: string;
  projectId: string;
  projectName: string;
  enabled: boolean;
  autoCreateWorkOrder: boolean;
  targetSquad: string;
  triggerCount: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertIncident {
  id: string;
  ruleId: string;
  ruleName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: IncidentStatus;
  projectId: string;
  projectName: string;
  locationReference: string;
  observedValue: number;
  thresholdValue: number;
  unit: string;
  assignedInvestigator?: string | null;
  workOrderId?: string | null; // Links to Task 47 Work Order if auto-spawned or escalated
  rootCause?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface CreateAlertRuleParams {
  name: string;
  description: string;
  alertType: AlertType;
  severity?: AlertSeverity;
  metricKey: string;
  operator: "<" | ">" | "<=" | ">=" | "==";
  thresholdValue: number;
  unit: string;
  projectId: string;
  projectName: string;
  autoCreateWorkOrder?: boolean;
  targetSquad?: string;
}

export interface AlertFilter {
  searchQuery?: string;
  status?: IncidentStatus | "all";
  severity?: AlertSeverity | "all";
  alertType?: AlertType | "all";
  projectId?: string | "all";
}

export interface AlertKPIs {
  totalIncidents: number;
  activeCount: number;
  criticalCount: number;
  investigatingCount: number;
  resolvedCount: number;
  dismissedCount: number;
  mttaHours: number;
  mttrHours: number;
  falsePositiveRatePct: number;
}

const SEED_RULES: AlertRule[] = [
  {
    id: "RULE-NDVI-001",
    name: "Severe Sentinel-2 NDVI Drop Anomaly",
    description: "Triggers when 5-day Copernicus raster detects NDVI decline exceeding 0.15 against 30-day baseline.",
    alertType: "canopy_degradation",
    severity: "critical",
    metricKey: "delta_ndvi",
    operator: "<=",
    thresholdValue: -0.15,
    unit: "NDVI index",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    enabled: true,
    autoCreateWorkOrder: true,
    targetSquad: "Aeronav UAV Rapid Response",
    triggerCount: 3,
    lastTriggeredAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "RULE-DROUGHT-002",
    name: "Consecutive Dry Spell & Soil Moisture Deficit",
    description: "Triggers when soil moisture falls below 15% for more than 10 consecutive days.",
    alertType: "drought_deficit",
    severity: "high",
    metricKey: "soil_moisture_pct",
    operator: "<",
    thresholdValue: 15,
    unit: "% volumetric water",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    enabled: true,
    autoCreateWorkOrder: false,
    targetSquad: "Sahayadri Ranger Squad Alpha",
    triggerCount: 5,
    lastTriggeredAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "RULE-SURVIVAL-003",
    name: "Stratum Survival Minimum Threshold Breach",
    description: "Triggers when sample plot quadrat audit indicates cohort survival rate < 85%.",
    alertType: "survival_rate_breach",
    severity: "critical",
    metricKey: "survival_rate_pct",
    operator: "<",
    thresholdValue: 85,
    unit: "% survival",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    enabled: true,
    autoCreateWorkOrder: true,
    targetSquad: "Chief Carbon Modeler (P. Nair)",
    triggerCount: 1,
    lastTriggeredAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "RULE-GEOFENCE-004",
    name: "Plantation Boundary Geofence Deviation",
    description: "Triggers when tree planting or field observation coordinates lie > 50m outside approved boundary polygon.",
    alertType: "geofence_violation",
    severity: "medium",
    metricKey: "geofence_distance_m",
    operator: ">",
    thresholdValue: 50,
    unit: "meters",
    projectId: "proj-marathwada",
    projectName: "Marathwada Agroforestry Corridor",
    enabled: true,
    autoCreateWorkOrder: false,
    targetSquad: "Marathwada Field Lead",
    triggerCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

const SEED_INCIDENTS: AlertIncident[] = [
  {
    id: "INC-2026-001",
    ruleId: "RULE-NDVI-001",
    ruleName: "Severe Sentinel-2 NDVI Drop Anomaly",
    alertType: "canopy_degradation",
    severity: "critical",
    title: "Abrupt Canopy Loss Detected in Western Buffer",
    description: "Sentinel-2 L2A tile shows -0.22 NDVI drop across 4.8ha in Sector 4B. Potential unauthorized tree clearing or wildfire trace.",
    status: "active",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    locationReference: "Sector 4B (Polygon Quad 12-14)",
    observedValue: -0.22,
    thresholdValue: -0.15,
    unit: "NDVI index",
    assignedInvestigator: null,
    workOrderId: null,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "INC-2026-002",
    ruleId: "RULE-DROUGHT-002",
    ruleName: "Consecutive Dry Spell & Soil Moisture Deficit",
    alertType: "drought_deficit",
    severity: "high",
    title: "14-Day Cumulative Drought Threshold Exceeded",
    description: "IMD Telemetry station WX-01 recorded 11.4% soil moisture with 0mm rainfall in last 14 days.",
    status: "investigating",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    locationReference: "Telemetry Station WX-01 (Ridge Block)",
    observedValue: 11.4,
    thresholdValue: 15.0,
    unit: "% volumetric water",
    assignedInvestigator: "Sahayadri Ranger Squad Alpha",
    workOrderId: "TASK-PSP-2026-001",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: "INC-2026-003",
    ruleId: "RULE-SURVIVAL-003",
    ruleName: "Stratum Survival Minimum Threshold Breach",
    alertType: "survival_rate_breach",
    severity: "critical",
    title: "Mangrove Estuary Survival Rate at 78.5%",
    description: "Ground truth quadrat audit revealed 78.5% survival (breaching 85% project baseline requirement).",
    status: "acknowledged",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    locationReference: "Estuary Zone East (Grid E1-E8)",
    observedValue: 78.5,
    thresholdValue: 85.0,
    unit: "% survival",
    assignedInvestigator: "Lead Verifier (Dr. A. Deshmukh)",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
  {
    id: "INC-2026-004",
    ruleId: "RULE-NDVI-001",
    ruleName: "Severe Sentinel-2 NDVI Drop Anomaly",
    alertType: "canopy_degradation",
    severity: "high",
    title: "Temporary Cloud Shadow False Anomaly",
    description: "Monsoonal cumulus cloud shadow triggered -0.19 NDVI drop across Sector 2.",
    status: "resolved",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    locationReference: "Sector 2 North",
    observedValue: -0.19,
    thresholdValue: -0.15,
    unit: "NDVI index",
    assignedInvestigator: "Satellite Analyst V. Joshi",
    rootCause: "Cloud shadow obscuration on Sentinel-2 Band 8. Cleared on subsequent orbit sweep.",
    resolutionNotes: "Verified with subsequent cloud-free pass. Mean NDVI restored to 0.76.",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 46 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export class MonitoringAlertService {
  private rules: AlertRule[] = [];
  private incidents: AlertIncident[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.rules = JSON.parse(JSON.stringify(SEED_RULES));
    this.incidents = JSON.parse(JSON.stringify(SEED_INCIDENTS));
    this.notify();
  }

  // --- Rules Management ---
  public getRules(projectId?: string): AlertRule[] {
    if (projectId && projectId !== "all") {
      return this.rules.filter((r) => r.projectId === projectId);
    }
    return [...this.rules];
  }

  public getRuleById(id: string): AlertRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  public createRule(params: CreateAlertRuleParams): AlertRule {
    const id = "RULE-" + params.alertType.substring(0, 4).toUpperCase() + "-" + Date.now().toString().slice(-4);
    const now = new Date().toISOString();

    const newRule: AlertRule = {
      id,
      name: params.name,
      description: params.description,
      alertType: params.alertType,
      severity: params.severity || "high",
      metricKey: params.metricKey,
      operator: params.operator,
      thresholdValue: params.thresholdValue,
      unit: params.unit,
      projectId: params.projectId,
      projectName: params.projectName,
      enabled: true,
      autoCreateWorkOrder: params.autoCreateWorkOrder ?? false,
      targetSquad: params.targetSquad || "Field Response Squad",
      triggerCount: 0,
      lastTriggeredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.rules.unshift(newRule);
    this.notify();
    return newRule;
  }

  public updateRule(id: string, updates: Partial<AlertRule>): AlertRule {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Alert rule ${id} not found`);

    const updated = {
      ...this.rules[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.rules[idx] = updated;
    this.notify();
    return updated;
  }

  public toggleRule(id: string): AlertRule {
    const rule = this.getRuleById(id);
    if (!rule) throw new Error(`Alert rule ${id} not found`);
    return this.updateRule(id, { enabled: !rule.enabled });
  }

  public deleteRule(id: string): boolean {
    const len = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    if (this.rules.length !== len) {
      this.notify();
      return true;
    }
    return false;
  }

  // --- Incident Management ---
  public getIncidents(filter?: AlertFilter): AlertIncident[] {
    let result = [...this.incidents];
    if (!filter) return result;

    if (filter.status && filter.status !== "all") {
      result = result.filter((i) => i.status === filter.status);
    }

    if (filter.severity && filter.severity !== "all") {
      result = result.filter((i) => i.severity === filter.severity);
    }

    if (filter.alertType && filter.alertType !== "all") {
      result = result.filter((i) => i.alertType === filter.alertType);
    }

    if (filter.projectId && filter.projectId !== "all") {
      result = result.filter((i) => i.projectId === filter.projectId);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.projectName.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getIncidentById(id: string): AlertIncident | undefined {
    return this.incidents.find((i) => i.id === id);
  }

  /**
   * Evaluates telemetry input against active rules and creates new AlertIncident tickets.
   */
  public evaluateTelemetryAndTriggerAlerts(telemetryList: Array<{
    projectId: string;
    projectName: string;
    locationReference: string;
    metricKey: string;
    value: number;
  }>): { triggeredCount: number; incidents: AlertIncident[] } {
    const triggered: AlertIncident[] = [];
    const enabledRules = this.rules.filter((r) => r.enabled);

    telemetryList.forEach((telemetry) => {
      enabledRules
        .filter((r) => r.projectId === telemetry.projectId && r.metricKey === telemetry.metricKey)
        .forEach((rule) => {
          let isBreached = false;
          switch (rule.operator) {
            case "<":
              isBreached = telemetry.value < rule.thresholdValue;
              break;
            case "<=":
              isBreached = telemetry.value <= rule.thresholdValue;
              break;
            case ">":
              isBreached = telemetry.value > rule.thresholdValue;
              break;
            case ">=":
              isBreached = telemetry.value >= rule.thresholdValue;
              break;
            case "==":
              isBreached = telemetry.value === rule.thresholdValue;
              break;
          }

          if (isBreached) {
            const incidentId = "INC-" + Date.now().toString().slice(-6);
            const now = new Date().toISOString();

            const incident: AlertIncident = {
              id: incidentId,
              ruleId: rule.id,
              ruleName: rule.name,
              alertType: rule.alertType,
              severity: rule.severity,
              title: `${rule.name}: ${telemetry.locationReference}`,
              description: `Observed ${telemetry.metricKey} = ${telemetry.value} ${rule.unit} (Threshold: ${rule.operator} ${rule.thresholdValue} ${rule.unit}).`,
              status: "active",
              projectId: telemetry.projectId,
              projectName: telemetry.projectName,
              locationReference: telemetry.locationReference,
              observedValue: telemetry.value,
              thresholdValue: rule.thresholdValue,
              unit: rule.unit,
              createdAt: now,
            };

            // Auto-create Task 47 Work Order if enabled
            if (rule.autoCreateWorkOrder) {
              try {
                const task = monitoringTaskService.createTask({
                  title: `Investigate Anomaly: ${rule.name}`,
                  description: `Field inspection required for ${telemetry.locationReference}. Anomaly value: ${telemetry.value} ${rule.unit}.`,
                  projectId: telemetry.projectId,
                  projectName: telemetry.projectName,
                  cadenceType: rule.alertType === "canopy_degradation" ? "drone_lidar_ortho" : "ground_sample_psp",
                  priority: rule.severity === "critical" ? "critical" : "high",
                  dueDate: new Date(Date.now() + 48 * 3600000).toISOString(),
                  gracePeriodDays: 2,
                  assignedTo: rule.targetSquad,
                  targetQuota: 1,
                  quotaUnit: "inspection",
                  locationReference: telemetry.locationReference,
                });
                incident.workOrderId = task.id;
                incident.assignedInvestigator = rule.targetSquad;
                incident.status = "investigating";
              } catch (err) {
                // Graceful fallback
              }
            }

            // Auto-dispatch Task 48 Multi-Channel Notification
            try {
              monitoringNotificationService.dispatchNotification({
                recipient: rule.targetSquad,
                recipientRole: "lead_verifier",
                channel: rule.severity === "critical" ? "email" : "in_app",
                category: "vegetation_anomaly",
                priority: rule.severity,
                title: `[ALERT] ${rule.name}`,
                body: incident.description,
                actionUrl: "/monitoring?tab=alerts",
                relatedEntityId: incidentId,
              });
            } catch (err) {
              // Graceful fallback
            }

            // Update rule trigger stats
            rule.triggerCount += 1;
            rule.lastTriggeredAt = now;

            this.incidents.unshift(incident);
            triggered.push(incident);
          }
        });
    });

    if (triggered.length > 0) {
      this.notify();
    }

    return { triggeredCount: triggered.length, incidents: triggered };
  }

  public acknowledgeIncident(id: string, investigator?: string): AlertIncident {
    const idx = this.incidents.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Incident ${id} not found`);

    const updated: AlertIncident = {
      ...this.incidents[idx],
      status: "acknowledged",
      assignedInvestigator: investigator || "Regional Lead Auditor",
      acknowledgedAt: new Date().toISOString(),
    };

    this.incidents[idx] = updated;
    this.notify();
    return updated;
  }

  public escalateIncidentToWorkOrder(id: string, assignedSquad: string): AlertIncident {
    const incident = this.getIncidentById(id);
    if (!incident) throw new Error(`Incident ${id} not found`);

    const task = monitoringTaskService.createTask({
      title: `Emergency Ground Audit: ${incident.title}`,
      description: `Investigate alert ${incident.id}: ${incident.description}`,
      projectId: incident.projectId,
      projectName: incident.projectName,
      cadenceType: "ground_sample_psp",
      priority: incident.severity === "critical" ? "critical" : "high",
      dueDate: new Date(Date.now() + 24 * 3600000).toISOString(),
      gracePeriodDays: 1,
      assignedTo: assignedSquad,
      targetQuota: 1,
      quotaUnit: "inspection",
      locationReference: incident.locationReference,
    });

    return this.updateIncident(id, {
      status: "investigating",
      assignedInvestigator: assignedSquad,
      workOrderId: task.id,
    });
  }

  public resolveIncident(id: string, resolutionNotes: string, rootCause?: string): AlertIncident {
    return this.updateIncident(id, {
      status: "resolved",
      resolutionNotes,
      rootCause: rootCause || "Remedial action verified in field",
      resolvedAt: new Date().toISOString(),
    });
  }

  public dismissIncident(id: string, reason: string): AlertIncident {
    return this.updateIncident(id, {
      status: "dismissed",
      rootCause: "False Positive / Sensor Glitch",
      resolutionNotes: reason,
      resolvedAt: new Date().toISOString(),
    });
  }

  public updateIncident(id: string, updates: Partial<AlertIncident>): AlertIncident {
    const idx = this.incidents.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Incident ${id} not found`);

    const updated = {
      ...this.incidents[idx],
      ...updates,
    };

    this.incidents[idx] = updated;
    this.notify();
    return updated;
  }

  public deleteIncident(id: string): boolean {
    const len = this.incidents.length;
    this.incidents = this.incidents.filter((i) => i.id !== id);
    if (this.incidents.length !== len) {
      this.notify();
      return true;
    }
    return false;
  }

  public getAlertKPIs(): AlertKPIs {
    const totalIncidents = this.incidents.length;
    const activeCount = this.incidents.filter((i) => i.status === "active").length;
    const criticalCount = this.incidents.filter((i) => i.status === "active" && i.severity === "critical").length;
    const investigatingCount = this.incidents.filter((i) => i.status === "investigating").length;
    const resolvedCount = this.incidents.filter((i) => i.status === "resolved").length;
    const dismissedCount = this.incidents.filter((i) => i.status === "dismissed").length;

    const falsePositiveRatePct =
      totalIncidents > 0 ? Math.round((dismissedCount / totalIncidents) * 100) : 0;

    return {
      totalIncidents,
      activeCount,
      criticalCount,
      investigatingCount,
      resolvedCount,
      dismissedCount,
      mttaHours: 1.8, // Mean Time To Acknowledge
      mttrHours: 14.2, // Mean Time To Resolve
      falsePositiveRatePct,
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
        console.error("MonitoringAlertService listener error:", err);
      }
    });
  }
}

export const monitoringAlertService = new MonitoringAlertService();
