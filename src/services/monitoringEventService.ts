/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 22
 * Monitoring Events & Survival Scheduling Service
 * 
 * Manages:
 * 1. Observation Creation (Biometric inspections & event syncing)
 * 2. Observation History (Chronological logs & audits)
 * 3. Next Monitoring Date Calculation (Dynamic age & health interval matrix)
 * 4. Monitoring Status Evaluation ('up_to_date' | 'due_soon' | 'overdue' | 'critical_overdue')
 * 5. Overdue Monitoring Tracking & Automated Task Dispatch
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Tree,
  TreeObservation,
  CreateObservationInput,
  MonitoringStatus,
  MonitoringSchedule,
  OverdueTreeRecord,
  MonitoringComplianceStats,
  TreeHealthStatus,
  TreeStatus,
} from "@/types/coreDatabase";
import { observationService } from "./observationService";

export interface NextMonitoringCalculationResult {
  nextMonitoringDate: string; // ISO 8601
  intervalDays: number;
  stageLabel: string;
  rationale: string;
}

export interface MonitoringStatusEvaluationResult {
  status: MonitoringStatus;
  daysRemaining: number;
  daysOverdue: number;
  isOverdue: boolean;
  isCritical: boolean;
  message: string;
}

export const monitoringEventService = {
  /**
   * 1. CALCULATE NEXT MONITORING DATE
   * Dynamic algorithm based on:
   * - Tree age (Sapling <6m: 30d, Young tree 6-24m: 60d, Established >24m: 120d)
   * - Tree health condition (Diseased/Critical: 7d, Stressed/Moderate: 14d)
   */
  calculateNextMonitoringDate(
    plantationDate: string | Date,
    healthStatus?: string | null,
    lastMonitoredAt?: string | Date | null
  ): NextMonitoringCalculationResult {
    const baseDate = lastMonitoredAt ? new Date(lastMonitoredAt) : new Date();
    const pDate = new Date(plantationDate || new Date());
    
    // Calculate tree age in months
    const ageMonths = Math.max(
      0,
      Math.round((baseDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
    );

    const normHealth = (healthStatus || "healthy").toLowerCase();

    let intervalDays = 30;
    let stageLabel = "Routine Monitoring";
    let rationale = "";

    // Priority 1: High-Risk / Diseased Condition
    if (["diseased", "critical", "dead"].includes(normHealth)) {
      intervalDays = 7;
      stageLabel = "Critical Care & Pathology Protocol";
      rationale = "Accelerated 7-day inspection required due to acute disease or critical health condition.";
    }
    // Priority 2: Stressed / Moderate Condition
    else if (["stressed", "moderate", "needs water"].includes(normHealth)) {
      intervalDays = 14;
      stageLabel = "Stress Recovery Protocol";
      rationale = "Fortnightly 14-day check-in required to assess hydration and stress recovery.";
    }
    // Priority 3: Age-Based Routine Matrix for Healthy Trees
    else if (ageMonths < 6) {
      intervalDays = 30;
      stageLabel = "Sapling Establishment Phase (< 6 mo)";
      rationale = "Monthly 30-day monitoring to verify root establishment and seedling vigor.";
    } else if (ageMonths < 24) {
      intervalDays = 60;
      stageLabel = "Young Tree Maturation Phase (6–24 mo)";
      rationale = "Bi-monthly 60-day monitoring to track branching architecture and DBH growth.";
    } else {
      intervalDays = 120;
      stageLabel = "Established Canopy Phase (> 2 yr)";
      rationale = "Tri-annual 120-day audits for long-term MRV carbon sequestration and canopy growth.";
    }

    const nextDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      nextMonitoringDate: nextDate.toISOString(),
      intervalDays,
      stageLabel,
      rationale,
    };
  },

  /**
   * 2. EVALUATE MONITORING STATUS
   * Determines status relative to the current timestamp:
   * - 'up_to_date': > 7 days remaining
   * - 'due_soon': 0 to 7 days remaining
   * - 'overdue': 1 to 30 days overdue (negative daysRemaining)
   * - 'critical_overdue': > 30 days overdue
   */
  evaluateMonitoringStatus(
    nextMonitoringDate: string | Date,
    currentDate: string | Date = new Date()
  ): MonitoringStatusEvaluationResult {
    const nextDate = new Date(nextMonitoringDate);
    const curDate = new Date(currentDate);

    // Difference in milliseconds
    const diffMs = nextDate.getTime() - curDate.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining > 7) {
      return {
        status: "up_to_date",
        daysRemaining,
        daysOverdue: 0,
        isOverdue: false,
        isCritical: false,
        message: `Next inspection due in ${daysRemaining} days.`,
      };
    } else if (daysRemaining >= 0) {
      return {
        status: "due_soon",
        daysRemaining,
        daysOverdue: 0,
        isOverdue: false,
        isCritical: false,
        message: daysRemaining === 0 ? "Inspection due today." : `Inspection due soon in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
      };
    } else {
      const daysOverdue = Math.abs(daysRemaining);
      const isCritical = daysOverdue > 30;
      const status: MonitoringStatus = isCritical ? "critical_overdue" : "overdue";

      return {
        status,
        daysRemaining,
        daysOverdue,
        isOverdue: true,
        isCritical,
        message: isCritical
          ? `Critical alert: Monitoring is ${daysOverdue} days overdue. Immediate field audit required.`
          : `Warning: Monitoring is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue.`,
      };
    }
  },

  /**
   * 3. GET COMPLETE TREE MONITORING SCHEDULE
   */
  getTreeMonitoringSchedule(tree: Partial<Tree>): MonitoringSchedule {
    const plantationDate = tree.plantation_date || new Date().toISOString();
    const lastMonitoredAt = tree.last_monitored_at || null;
    const healthStatus = (tree.status || "alive") as string;

    // Use persisted next_monitoring_date if present, or compute
    const calc = this.calculateNextMonitoringDate(plantationDate, healthStatus, lastMonitoredAt || plantationDate);
    const targetNextDate = tree.next_monitoring_date || calc.nextMonitoringDate;

    const evaluation = this.evaluateMonitoringStatus(targetNextDate);

    return {
      treeId: tree.id || "",
      treeCode: tree.tree_code || null,
      species: tree.species || "Unknown Species",
      plantationDate,
      lastMonitoredAt,
      nextMonitoringDate: targetNextDate,
      daysRemaining: evaluation.daysRemaining,
      daysOverdue: evaluation.daysOverdue,
      monitoringStatus: evaluation.status,
      intervalDays: calc.intervalDays,
      stageLabel: calc.stageLabel,
      rationale: calc.rationale,
      isOverdue: evaluation.isOverdue,
      isCritical: evaluation.isCritical,
    };
  },

  /**
   * 4. CREATE MONITORING EVENT & RECORD OBSERVATION
   * Validates input, creates observation, updates parent tree biometrics,
   * calculates next monitoring schedule, and completes any pending overdue tasks.
   */
  async createMonitoringEvent(
    input: CreateObservationInput,
    autoSyncTree: boolean = true
  ): Promise<{
    success: boolean;
    observation?: TreeObservation;
    schedule?: MonitoringSchedule;
    error?: string;
  }> {
    // 1. Validate Input
    const validation = observationService.validateObservationInput(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join("; ")}`,
      };
    }

    try {
      // 2. Fetch Tree Data for schedule calculation
      let plantationDate = new Date().toISOString().split("T")[0];
      let treeCode: string | null = null;
      let existingStatus: TreeStatus = "alive";

      const { data: treeData } = await supabase
        .from("trees")
        .select("id, tree_code, plantation_date, status, height_cm, dbh_cm, canopy_radius_cm")
        .eq("id", input.tree_id)
        .maybeSingle();

      if (treeData) {
        plantationDate = treeData.plantation_date;
        treeCode = treeData.tree_code;
        existingStatus = treeData.status as TreeStatus;
      }

      // 3. Calculate next monitoring date & schedule
      const obsDate = input.observation_date || new Date().toISOString();
      const obsHealth = input.health_status || "healthy";
      const scheduleCalc = this.calculateNextMonitoringDate(plantationDate, obsHealth, obsDate);

      // 4. Insert Tree Observation
      const insertPayload: any = {
        tree_id: input.tree_id,
        observer_id: input.observer_id || null,
        observer_name: input.observer_name || null,
        observer_role: input.observer_role || "field_worker",
        observation_date: obsDate,
        observed_at: obsDate,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        elevation_m: input.elevation_m || null,
        gps_accuracy_meters: input.gps_accuracy_meters || null,
        location_name: input.location_name || null,
        health_status: obsHealth,
        condition: obsHealth,
        height_cm: input.height_cm || null,
        canopy_width_cm: input.canopy_width_cm || null,
        dbh_cm: input.dbh_cm || null,
        foliage_density_pct: input.foliage_density_pct || null,
        pest_disease_detected: input.pest_disease_detected || false,
        pest_types: input.pest_types || null,
        disease_description: input.disease_description || null,
        treatment_applied: input.treatment_applied || null,
        condition_notes: input.condition_notes || input.notes || null,
        notes: input.condition_notes || input.notes || null,
        care_recommendations: input.care_recommendations || null,
        photo_url: input.photo_url || null,
        evidence_type: input.evidence_type || (input.photo_url ? "growth_photo" : null),
        sha256_hash: input.sha256_hash || null,
        verification_status: input.verification_status || "verified",
        status: input.verification_status || "verified",
        ai_health_score: input.ai_health_score || (obsHealth === "healthy" || obsHealth === "thriving" ? 95 : 65),
      };

      const { data: insertedObs, error: insertErr } = await supabase
        .from("tree_observations")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertErr) {
        console.error("Error inserting tree observation:", insertErr);
        return { success: false, error: insertErr.message };
      }

      // 5. Update Parent Tree
      if (autoSyncTree) {
        const treeUpdatePayload: any = {
          last_monitored_at: obsDate,
          next_monitoring_date: scheduleCalc.nextMonitoringDate,
          monitoring_status: "up_to_date",
          updated_at: new Date().toISOString(),
        };

        if (input.height_cm) treeUpdatePayload.height_cm = input.height_cm;
        if (input.dbh_cm) treeUpdatePayload.dbh_cm = input.dbh_cm;
        if (input.canopy_width_cm) treeUpdatePayload.canopy_radius_cm = Math.round(input.canopy_width_cm / 2);

        // Map health status to tree status
        if (["thriving", "alive", "healthy"].includes(obsHealth)) {
          treeUpdatePayload.status = "thriving";
        } else if (["stressed", "moderate", "needs water"].includes(obsHealth)) {
          treeUpdatePayload.status = "stressed";
        } else if (["diseased", "critical"].includes(obsHealth)) {
          treeUpdatePayload.status = "diseased";
        } else if (obsHealth === "dead") {
          treeUpdatePayload.status = "dead";
        } else if (obsHealth === "replaced") {
          treeUpdatePayload.status = "replaced";
        }

        if (input.ai_health_score) {
          treeUpdatePayload.health_score = input.ai_health_score;
        }

        await supabase.from("trees").update(treeUpdatePayload).eq("id", input.tree_id);

        // Auto-complete any pending monitoring tasks for this tree
        try {
          await supabase
            .from("monitoring_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              completion_notes: `Auto-completed via recorded observation #${insertedObs.id}`,
              updated_at: new Date().toISOString(),
            })
            .eq("tree_id", input.tree_id)
            .eq("status", "pending");
        } catch (taskErr) {
          console.warn("Could not auto-complete monitoring tasks:", taskErr);
        }
      }

      const schedule: MonitoringSchedule = {
        treeId: input.tree_id,
        treeCode,
        species: treeData?.species || "Tree",
        plantationDate,
        lastMonitoredAt: obsDate,
        nextMonitoringDate: scheduleCalc.nextMonitoringDate,
        daysRemaining: scheduleCalc.intervalDays,
        monitoringStatus: "up_to_date",
        intervalDays: scheduleCalc.intervalDays,
        stageLabel: scheduleCalc.stageLabel,
        rationale: scheduleCalc.rationale,
        isOverdue: false,
        isCritical: false,
      };

      return {
        success: true,
        observation: insertedObs as TreeObservation,
        schedule,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Unknown error creating monitoring event" };
    }
  },

  /**
   * 5. GET OBSERVATION HISTORY
   * Returns all biometric inspections and field audits for a tree, ordered descending.
   */
  async getObservationHistory(treeId: string): Promise<TreeObservation[]> {
    if (!treeId) return [];
    try {
      const { data, error } = await supabase
        .from("tree_observations")
        .select("*")
        .eq("tree_id", treeId)
        .order("observation_date", { ascending: false });

      if (error) {
        console.warn("Error fetching observation history:", error.message);
        return [];
      }
      return (data as TreeObservation[]) || [];
    } catch (err) {
      console.warn("Failed to query observation history:", err);
      return [];
    }
  },

  /**
   * 6. GET OVERDUE TREES
   * Queries and categorizes trees that are overdue or critically overdue for monitoring.
   */
  async getOverdueTrees(options?: {
    projectId?: string;
    organizationId?: string;
    severity?: "all" | "overdue" | "critical_overdue";
    limit?: number;
  }): Promise<OverdueTreeRecord[]> {
    try {
      let query = supabase
        .from("trees")
        .select("id, tree_code, species, location, project_id, plantation_date, last_monitored_at, next_monitoring_date, monitoring_status, status, height_cm, photo_url");

      if (options?.projectId && typeof (query as any).eq === "function") {
        query = query.eq("project_id", options.projectId);
      }
      if (options?.organizationId && typeof (query as any).eq === "function") {
        query = query.eq("organization_id", options.organizationId);
      }
      if (options?.limit && typeof (query as any).limit === "function") {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      const now = new Date();
      const overdueList: OverdueTreeRecord[] = [];

      for (const t of data) {
        const nextDate = t.next_monitoring_date
          ? new Date(t.next_monitoring_date)
          : new Date(new Date(t.plantation_date || now).getTime() + 30 * 24 * 60 * 60 * 1000);

        const evaluation = this.evaluateMonitoringStatus(nextDate, now);

        if (evaluation.isOverdue) {
          if (options?.severity === "critical_overdue" && !evaluation.isCritical) {
            continue;
          }
          if (options?.severity === "overdue" && evaluation.isCritical) {
            continue;
          }

          overdueList.push({
            id: t.id,
            tree_code: t.tree_code,
            species: t.species,
            location: t.location,
            project_id: t.project_id,
            plantation_date: t.plantation_date,
            last_monitored_at: t.last_monitored_at,
            next_monitoring_date: nextDate.toISOString(),
            monitoring_status: evaluation.status,
            days_overdue: evaluation.daysOverdue,
            health_status: (t.status || "alive") as TreeHealthStatus,
            height_cm: t.height_cm,
            photo_url: t.photo_url,
          });
        }
      }

      // Sort by most critically overdue first (highest days_overdue)
      return overdueList.sort((a, b) => b.days_overdue - a.days_overdue);
    } catch (err) {
      console.warn("Error fetching overdue trees:", err);
      return [];
    }
  },

  /**
   * 7. GET MONITORING COMPLIANCE STATS
   * Aggregates compliance percentages and overdue totals across a project or entire system.
   */
  async getMonitoringComplianceStats(options?: {
    projectId?: string;
    organizationId?: string;
  }): Promise<MonitoringComplianceStats> {
    try {
      let query = supabase.from("trees").select("id, next_monitoring_date, plantation_date");
      if (options?.projectId && typeof (query as any).eq === "function") query = query.eq("project_id", options.projectId);
      if (options?.organizationId && typeof (query as any).eq === "function") query = query.eq("organization_id", options.organizationId);

      const { data, error } = await query;
      if (error) throw error;

      const totalTrees = data?.length || 0;
      if (totalTrees === 0) {
        return {
          totalTrees: 0,
          upToDateCount: 0,
          dueSoonCount: 0,
          overdueCount: 0,
          criticalOverdueCount: 0,
          complianceRatePct: 100,
        };
      }

      const now = new Date();
      let upToDate = 0;
      let dueSoon = 0;
      let overdue = 0;
      let criticalOverdue = 0;

      for (const t of data!) {
        const nextDate = t.next_monitoring_date
          ? new Date(t.next_monitoring_date)
          : new Date(new Date(t.plantation_date || now).getTime() + 30 * 24 * 60 * 60 * 1000);

        const evaluation = this.evaluateMonitoringStatus(nextDate, now);
        if (evaluation.status === "up_to_date") upToDate++;
        else if (evaluation.status === "due_soon") dueSoon++;
        else if (evaluation.status === "overdue") overdue++;
        else if (evaluation.status === "critical_overdue") criticalOverdue++;
      }

      const compliant = upToDate + dueSoon;
      const complianceRatePct = Math.round((compliant / totalTrees) * 100);

      return {
        totalTrees,
        upToDateCount: upToDate,
        dueSoonCount: dueSoon,
        overdueCount: overdue,
        criticalOverdueCount: criticalOverdue,
        complianceRatePct,
      };
    } catch (err) {
      console.warn("Error computing monitoring compliance stats:", err);
      return {
        totalTrees: 0,
        upToDateCount: 0,
        dueSoonCount: 0,
        overdueCount: 0,
        criticalOverdueCount: 0,
        complianceRatePct: 100,
      };
    }
  },

  /**
   * 8. GENERATE OVERDUE MONITORING TASKS
   * Automatically dispatches field tasks for trees requiring immediate observation.
   */
  async generateOverdueMonitoringTasks(options?: {
    projectId?: string;
    defaultAssigneeId?: string;
    maxTasks?: number;
  }): Promise<{ generatedCount: number; taskIds: string[]; errors: string[] }> {
    const overdueTrees = await this.getOverdueTrees({
      projectId: options?.projectId,
      limit: options?.maxTasks || 50,
    });

    const taskIds: string[] = [];
    const errors: string[] = [];

    for (const tree of overdueTrees) {
      try {
        // Check if pending task already exists
        const { data: existingTask } = await supabase
          .from("monitoring_tasks")
          .select("id")
          .eq("tree_id", tree.id)
          .eq("status", "pending")
          .maybeSingle();

        if (existingTask) {
          continue; // Task already assigned and active
        }

        const isCritical = tree.monitoring_status === "critical_overdue";
        const taskPayload = {
          project_id: tree.project_id || "default-project",
          tree_id: tree.id,
          assigned_to: options?.defaultAssigneeId || null,
          task_type: "health_check",
          priority: isCritical ? "urgent" : "high",
          status: "pending",
          title: `${isCritical ? "CRITICAL" : "Overdue"} Monitoring: ${tree.species} (${tree.tree_code || tree.id.slice(0, 8)})`,
          description: `Tree is ${tree.days_overdue} days overdue for biometric inspection and health audit. Location: ${tree.location || "Plot site"}.`,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdTask, error } = await supabase
          .from("monitoring_tasks")
          .insert(taskPayload)
          .select("id")
          .single();

        if (error) {
          errors.push(`Failed to create task for tree ${tree.id}: ${error.message}`);
        } else if (createdTask) {
          taskIds.push(createdTask.id);
        }
      } catch (err: any) {
        errors.push(`Task creation exception for tree ${tree.id}: ${err.message}`);
      }
    }

    return {
      generatedCount: taskIds.length,
      taskIds,
      errors,
    };
  },
};
