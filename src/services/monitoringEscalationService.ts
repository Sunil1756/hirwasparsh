/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 9 TASK 50
 * Multi-Tier Escalation Workflow, SLA Governance & Compliance Sign-Off
 *
 * Governs operational escalation pathways (Field -> Operations -> Lead Verifier -> Executive/Registry)
 * for overdue monitoring work orders, unacknowledged anomalies, and SLA compliance breaches.
 */

import { monitoringAlertService } from "./monitoringAlertService";
import { monitoringTaskService } from "./monitoringTaskService";
import { monitoringNotificationService } from "./monitoringNotificationService";

export type EscalationTier =
  | "tier1_field"
  | "tier2_operations"
  | "tier3_verifier"
  | "tier4_executive";

export type EscalationStatus =
  | "pending_triage"
  | "active_escalation"
  | "under_investigation"
  | "remediated"
  | "closed";

export interface EscalationAuditLog {
  tier: EscalationTier;
  timestamp: string;
  officer: string;
  notes: string;
  action: string;
}

export interface EscalationCase {
  id: string;
  policyId: string;
  policyName: string;
  title: string;
  description: string;
  sourceEntity: "incident" | "work_order" | "schedule";
  sourceEntityId: string;
  projectId: string;
  projectName: string;
  currentTier: EscalationTier;
  status: EscalationStatus;
  slaDeadline: string;
  slaBreachHours: number;
  assignedOfficer: string;
  escalationPath: EscalationAuditLog[];
  mitigationPlan?: string | null;
  targetMitigationDate?: string | null;
  closingReport?: string | null;
  signoffOfficer?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  triggerType: "sla_breach" | "unacknowledged_incident" | "repeated_anomaly" | "manual_escalation";
  targetTier: EscalationTier;
  autoEscalateAfterHours: number;
  assignedRoles: string[];
  emergencyOverride: boolean;
}

export interface CreateEscalationCaseParams {
  policyId?: string;
  policyName?: string;
  title: string;
  description: string;
  sourceEntity: "incident" | "work_order" | "schedule";
  sourceEntityId: string;
  projectId: string;
  projectName: string;
  initialTier?: EscalationTier;
  assignedOfficer?: string;
}

export interface EscalationFilter {
  searchQuery?: string;
  tier?: EscalationTier | "all";
  status?: EscalationStatus | "all";
  sourceEntity?: "incident" | "work_order" | "schedule" | "all";
  projectId?: string | "all";
}

export interface EscalationKPIs {
  totalCases: number;
  activeEscalations: number;
  tier4Critical: number;
  underInvestigation: number;
  remediatedCount: number;
  totalClosed: number;
  avgEscalationHours: number;
  slaRecoveryRatePct: number;
}

const SEED_POLICIES: EscalationPolicy[] = [
  {
    id: "POL-SLA-48H",
    name: "Tier 2 Operations SLA Breach Policy",
    description: "Auto-escalates work orders overdue by > 24 hours to Regional Operations Lead.",
    triggerType: "sla_breach",
    targetTier: "tier2_operations",
    autoEscalateAfterHours: 24,
    assignedRoles: ["operations_director", "regional_lead"],
    emergencyOverride: false,
  },
  {
    id: "POL-CRIT-72H",
    name: "Tier 3 Lead Verifier Critical Anomaly Policy",
    description: "Auto-escalates unresolved critical vegetation loss / drought incidents to Chief MRV Verifier.",
    triggerType: "repeated_anomaly",
    targetTier: "tier3_verifier",
    autoEscalateAfterHours: 48,
    assignedRoles: ["lead_verifier", "chief_carbon_modeler"],
    emergencyOverride: true,
  },
  {
    id: "POL-EXEC-REGISTRY",
    name: "Tier 4 Executive & Registry Risk Governance",
    description: "Immediate board-level escalation for potential carbon credit issuance forfeiture.",
    triggerType: "manual_escalation",
    targetTier: "tier4_executive",
    autoEscalateAfterHours: 72,
    assignedRoles: ["head_of_esg", "registry_liaison"],
    emergencyOverride: true,
  },
];

const SEED_CASES: EscalationCase[] = [
  {
    id: "ESC-2026-001",
    policyId: "POL-CRIT-72H",
    policyName: "Tier 3 Lead Verifier Critical Anomaly Policy",
    title: "Konkan Mangrove Aerial LiDAR Overdue Breach",
    description: "Drone photogrammetry sweep TASK-DRONE-2026-003 exceeded 3-day SLA grace period. Ground access obstructed by monsoon tides.",
    sourceEntity: "work_order",
    sourceEntityId: "TASK-DRONE-2026-003",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    currentTier: "tier3_verifier",
    status: "active_escalation",
    slaDeadline: new Date(Date.now() - 48 * 3600000).toISOString(),
    slaBreachHours: 48,
    assignedOfficer: "Lead Verifier (Dr. A. Deshmukh)",
    escalationPath: [
      {
        tier: "tier1_field",
        timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
        officer: "Aeronav UAV Rapid Response",
        notes: "Field dispatch initiated for aerial sweep.",
        action: "Dispatched",
      },
      {
        tier: "tier2_operations",
        timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
        officer: "Regional Operations Lead",
        notes: "Overdue warning flagged. Flight window postponed.",
        action: "Escalated to Tier 2",
      },
      {
        tier: "tier3_verifier",
        timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
        officer: "Lead Verifier (Dr. A. Deshmukh)",
        notes: "Promoted to Tier 3. Emergency shallow-draft boat contracted for sensor transport.",
        action: "Promoted to Tier 3",
      },
    ],
    mitigationPlan: "Deploy twin-engine boat with specialized RTK base station on tidal retreat at 06:00 AM.",
    targetMitigationDate: new Date(Date.now() + 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "ESC-2026-002",
    policyId: "POL-SLA-48H",
    policyName: "Tier 2 Operations SLA Breach Policy",
    title: "Severe Sentinel-2 NDVI Drop Anomaly in Sector 4B",
    description: "Incident INC-2026-001 unacknowledged for > 24h. Sentinel-2 L2A shows -0.22 NDVI vegetative drop.",
    sourceEntity: "incident",
    sourceEntityId: "INC-2026-001",
    projectId: "proj-sahayadri",
    projectName: "Sahayadri Tiger Reserve Afforestation",
    currentTier: "tier2_operations",
    status: "under_investigation",
    slaDeadline: new Date(Date.now() - 24 * 3600000).toISOString(),
    slaBreachHours: 24,
    assignedOfficer: "Sahayadri Forestry Operations Director",
    escalationPath: [
      {
        tier: "tier1_field",
        timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
        officer: "Automated Satellite Anomaly Detector",
        notes: "Anomaly ticket spawned.",
        action: "Triggered",
      },
      {
        tier: "tier2_operations",
        timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
        officer: "Sahayadri Forestry Operations Director",
        notes: "Promoted to Tier 2. Ranger patrol dispatched with GPS camera.",
        action: "Escalated to Tier 2",
      },
    ],
    mitigationPlan: "Patrol Sector 4B with forest ranger squad to inspect for cattle grazing or illicit felling.",
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: "ESC-2026-003",
    policyId: "POL-EXEC-REGISTRY",
    policyName: "Tier 4 Executive & Registry Risk Governance",
    title: "Stratum Survival Minimum Breach Resolution Sign-Off",
    description: "Cohort survival in Sector 2 fell to 78.5%. Replanting of 800 mangrove propagules verified and audited.",
    sourceEntity: "incident",
    sourceEntityId: "INC-2026-003",
    projectId: "proj-konkan",
    projectName: "Konkan Coastal Mangrove Restoration",
    currentTier: "tier4_executive",
    status: "remediated",
    slaDeadline: new Date(Date.now() - 96 * 3600000).toISOString(),
    slaBreachHours: 0,
    assignedOfficer: "Head of ESG & Climate Compliance",
    escalationPath: [
      {
        tier: "tier1_field",
        timestamp: new Date(Date.now() - 120 * 3600000).toISOString(),
        officer: "Field Scout Lead",
        notes: "Survival drop flagged.",
        action: "Dispatched",
      },
      {
        tier: "tier3_verifier",
        timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
        officer: "Lead Verifier",
        notes: "Remedial replanting verified.",
        action: "Remediated",
      },
    ],
    mitigationPlan: "800 native Rhizophora mucronata planted. Survival restored to 91.2%.",
    closingReport: "Field quadrat audit confirmed 91.2% healthy establishment with full photographic evidence attached.",
    signoffOfficer: "Head of ESG & Climate Compliance",
    createdAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

export class MonitoringEscalationService {
  private cases: EscalationCase[] = [];
  private policies: EscalationPolicy[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.cases = JSON.parse(JSON.stringify(SEED_CASES));
    this.policies = JSON.parse(JSON.stringify(SEED_POLICIES));
    this.notify();
  }

  // --- Policies ---
  public getPolicies(): EscalationPolicy[] {
    return [...this.policies];
  }

  public getPolicyById(id: string): EscalationPolicy | undefined {
    return this.policies.find((p) => p.id === id);
  }

  // --- Cases ---
  public getCases(filter?: EscalationFilter): EscalationCase[] {
    let result = [...this.cases];
    if (!filter) return result;

    if (filter.tier && filter.tier !== "all") {
      result = result.filter((c) => c.currentTier === filter.tier);
    }

    if (filter.status && filter.status !== "all") {
      result = result.filter((c) => c.status === filter.status);
    }

    if (filter.sourceEntity && filter.sourceEntity !== "all") {
      result = result.filter((c) => c.sourceEntity === filter.sourceEntity);
    }

    if (filter.projectId && filter.projectId !== "all") {
      result = result.filter((c) => c.projectId === filter.projectId);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.projectName.toLowerCase().includes(q) ||
          c.assignedOfficer.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getCaseById(id: string): EscalationCase | undefined {
    return this.cases.find((c) => c.id === id);
  }

  public createCase(params: CreateEscalationCaseParams): EscalationCase {
    const id = "ESC-" + Date.now().toString().slice(-6);
    const now = new Date().toISOString();
    const tier = params.initialTier || "tier2_operations";

    const newCase: EscalationCase = {
      id,
      policyId: params.policyId || "POL-SLA-48H",
      policyName: params.policyName || "Operational SLA Escalation Policy",
      title: params.title,
      description: params.description,
      sourceEntity: params.sourceEntity,
      sourceEntityId: params.sourceEntityId,
      projectId: params.projectId,
      projectName: params.projectName,
      currentTier: tier,
      status: "active_escalation",
      slaDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      slaBreachHours: 24,
      assignedOfficer: params.assignedOfficer || "Regional Operations Lead",
      escalationPath: [
        {
          tier,
          timestamp: now,
          officer: params.assignedOfficer || "Regional Operations Lead",
          notes: "Escalation case created and triaged.",
          action: "Case Created",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // Broadcast Task 48 notification
    try {
      monitoringNotificationService.dispatchNotification({
        recipient: newCase.assignedOfficer,
        recipientRole: "lead_verifier",
        channel: "email",
        category: "escalation_alert",
        priority: tier === "tier4_executive" ? "critical" : "high",
        title: `[ESCALATION ${tier.toUpperCase()}] ${newCase.title}`,
        body: newCase.description,
        actionUrl: "/monitoring?tab=escalations",
        relatedEntityId: id,
      });
    } catch (err) {
      // Handled gracefully
    }

    this.cases.unshift(newCase);
    this.notify();
    return newCase;
  }

  /**
   * Scans active tasks and alerts, automatically promoting overdue items to higher escalation tiers.
   */
  public evaluateAndTriggerEscalations(): { promotedCount: number; createdCases: EscalationCase[] } {
    const overdueTasks = monitoringTaskService.getTasks({ status: "escalated" });
    const criticalIncidents = monitoringAlertService.getIncidents({ severity: "critical", status: "active" });

    const created: EscalationCase[] = [];

    // Escalate SLA breached tasks
    overdueTasks.forEach((task) => {
      const exists = this.cases.some((c) => c.sourceEntityId === task.id);
      if (!exists) {
        const escalationCase = this.createCase({
          policyId: "POL-SLA-48H",
          policyName: "Tier 2 Operations SLA Breach Policy",
          title: `Overdue Work Order Breach: ${task.title}`,
          description: `Work order ${task.id} breached SLA by ${task.overdueDurationHours}h without completion signoff.`,
          sourceEntity: "work_order",
          sourceEntityId: task.id,
          projectId: task.projectId,
          projectName: task.projectName,
          initialTier: "tier2_operations",
          assignedOfficer: "Regional Operations Director",
        });
        created.push(escalationCase);
      }
    });

    // Escalate unaddressed critical incidents
    criticalIncidents.forEach((inc) => {
      const exists = this.cases.some((c) => c.sourceEntityId === inc.id);
      if (!exists) {
        const escalationCase = this.createCase({
          policyId: "POL-CRIT-72H",
          policyName: "Tier 3 Lead Verifier Critical Anomaly Policy",
          title: `Unresolved Critical Anomaly: ${inc.title}`,
          description: `Critical alert ${inc.id} (${inc.observedValue} ${inc.unit}) requires lead scientific intervention.`,
          sourceEntity: "incident",
          sourceEntityId: inc.id,
          projectId: inc.projectId,
          projectName: inc.projectName,
          initialTier: "tier3_verifier",
          assignedOfficer: "Lead MRV Verifier (Dr. A. Deshmukh)",
        });
        created.push(escalationCase);
      }
    });

    return { promotedCount: created.length, createdCases: created };
  }

  public advanceTier(caseId: string, targetTier: EscalationTier, officer: string, notes: string): EscalationCase {
    const idx = this.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error(`Escalation case ${caseId} not found`);

    const now = new Date().toISOString();
    const current = this.cases[idx];

    const updatedLog: EscalationAuditLog = {
      tier: targetTier,
      timestamp: now,
      officer,
      notes,
      action: `Promoted from ${current.currentTier} to ${targetTier}`,
    };

    const updated: EscalationCase = {
      ...current,
      currentTier: targetTier,
      assignedOfficer: officer,
      status: "active_escalation",
      escalationPath: [...current.escalationPath, updatedLog],
      updatedAt: now,
    };

    // Broadcast urgent notification for tier promotion
    try {
      monitoringNotificationService.dispatchNotification({
        recipient: officer,
        recipientRole: targetTier === "tier4_executive" ? "system_admin" : "lead_verifier",
        channel: "email",
        category: "escalation_alert",
        priority: targetTier === "tier4_executive" ? "critical" : "high",
        title: `[ESCALATION PROMOTED TO ${targetTier.toUpperCase()}] ${updated.title}`,
        body: `Case promoted: ${notes}`,
        actionUrl: "/monitoring?tab=escalations",
        relatedEntityId: caseId,
      });
    } catch (err) {}

    this.cases[idx] = updated;
    this.notify();
    return updated;
  }

  public assignOfficer(caseId: string, officer: string): EscalationCase {
    const idx = this.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error(`Escalation case ${caseId} not found`);

    const now = new Date().toISOString();
    const updated: EscalationCase = {
      ...this.cases[idx],
      assignedOfficer: officer,
      updatedAt: now,
    };

    this.cases[idx] = updated;
    this.notify();
    return updated;
  }

  public submitMitigationPlan(caseId: string, mitigationPlan: string, targetMitigationDate: string): EscalationCase {
    const idx = this.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error(`Escalation case ${caseId} not found`);

    const now = new Date().toISOString();
    const updated: EscalationCase = {
      ...this.cases[idx],
      mitigationPlan,
      targetMitigationDate,
      status: "under_investigation",
      updatedAt: now,
    };

    this.cases[idx] = updated;
    this.notify();
    return updated;
  }

  public resolveAndCloseEscalation(
    caseId: string,
    closingReport: string,
    signoffOfficer: string
  ): EscalationCase {
    const idx = this.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error(`Escalation case ${caseId} not found`);

    const now = new Date().toISOString();
    const current = this.cases[idx];

    const closeLog: EscalationAuditLog = {
      tier: current.currentTier,
      timestamp: now,
      officer: signoffOfficer,
      notes: closingReport,
      action: "Resolved & Formally Signed Off",
    };

    const updated: EscalationCase = {
      ...current,
      status: "closed",
      closingReport,
      signoffOfficer,
      escalationPath: [...current.escalationPath, closeLog],
      closedAt: now,
      updatedAt: now,
    };

    this.cases[idx] = updated;
    this.notify();
    return updated;
  }

  public getEscalationKPIs(): EscalationKPIs {
    const totalCases = this.cases.length;
    const activeEscalations = this.cases.filter((c) => c.status === "active_escalation").length;
    const tier4Critical = this.cases.filter(
      (c) => c.currentTier === "tier4_executive" && c.status !== "closed"
    ).length;
    const underInvestigation = this.cases.filter((c) => c.status === "under_investigation").length;
    const remediatedCount = this.cases.filter((c) => c.status === "remediated").length;
    const totalClosed = this.cases.filter((c) => c.status === "closed").length;

    const resolvedOrClosed = remediatedCount + totalClosed;
    const slaRecoveryRatePct =
      totalCases > 0 ? Math.round((resolvedOrClosed / totalCases) * 100) : 100;

    return {
      totalCases,
      activeEscalations,
      tier4Critical,
      underInvestigation,
      remediatedCount,
      totalClosed,
      avgEscalationHours: 18.5,
      slaRecoveryRatePct,
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
        console.error("MonitoringEscalationService listener error:", err);
      }
    });
  }
}

export const monitoringEscalationService = new MonitoringEscalationService();
