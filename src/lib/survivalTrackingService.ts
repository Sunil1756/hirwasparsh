/**
 * Ground Truth Survival Tracking Service
 * Handles:
 * 1. `check_ins` record management (alive / dead / unverified)
 * 2. 60-Day Inactivity scheduled scanner & planter notifications
 * 3. Per-Plot Survival Rate computation (excluding unverified from denominator)
 * 4. Bulk plot satellite NDVI Quarter-over-Quarter (QoQ) drop (>15%) anomaly detection & task generation
 */

import { supabase } from "@/integrations/supabase/client";

export interface CheckInRecord {
  id: string;
  tree_id: string;
  photo_url: string | null;
  status: "alive" | "dead" | "unverified" | "healthy" | "stressed";
  checked_by: string;
  checked_at: string;
  notes: string | null;
  ai_confidence: number | null;
  created_at: string;
}

export interface PlotSurvivalRateRecord {
  plot_id: string;
  plot_name: string;
  location: string | null;
  total_trees: number;
  alive_count: number;
  dead_count: number;
  unverified_count: number;
  verified_survival_rate_pct: number; // alive / (alive + dead)
  effective_survival_rate_pct: number; // alive / total_trees
  latest_audit_at: string | null;
}

export interface FieldTaskRecord {
  id: string;
  plot_id: string;
  tree_id: string | null;
  title: string;
  description: string | null;
  task_type: "verification_needed" | "drip_rescue" | "sample_audit" | "replanting";
  status: "pending" | "assigned" | "in_progress" | "completed" | "dismissed";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  due_date: string | null;
  metadata?: any;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string | null;
  tree_id: string | null;
  plot_id: string | null;
  title: string;
  message: string;
  type: "checkin_reminder" | "ndvi_anomaly_alert" | "task_assigned" | "system";
  is_read: boolean;
  created_at: string;
}

export interface QoQNdviEvaluationResult {
  plotId: string;
  plotName: string;
  currentQuarterAvgNdvi: number;
  previousQuarterAvgNdvi: number;
  deltaNdvi: number;
  percentageChange: number; // e.g. -18.2%
  hasSignificantDrop: boolean; // true if drop > 15%
  recommendedAction: "none" | "routine_quarterly_sample" | "dispatch_urgent_verification_task";
  existingTaskId?: string | null;
}

// ---------------------------------------------------------------------------
// PURE CALCULATION ENGINES (FOR TESTS & REAL-TIME CLIENT PROCESSING)
// ---------------------------------------------------------------------------

/**
 * Calculates per-plot survival metrics from trees and check-ins:
 * Verified Survival Rate = (alive check-ins) / (alive + dead check-ins) * 100
 * Strictly excludes "unverified" from the denominator so percentage is not inflated or distorted.
 */
export function calculatePlotSurvivalStats(
  plotId: string,
  plotName: string,
  trees: Array<{
    id: string;
    plot_id?: string | null;
    status?: string | null;
    needs_verification?: boolean | null;
    created_at?: string | null;
    plantation_date?: string | null;
  }>,
  checkIns: Array<{
    tree_id: string;
    status: string;
    checked_at: string;
  }>,
  location: string = "Maharashtra, India"
): PlotSurvivalRateRecord {
  const plotTrees = trees.filter((t) => t.plot_id === plotId);
  const now = new Date();
  const sixtyDaysMs = 60 * 86400000;

  // Map latest check-in per tree
  const latestCheckInMap = new Map<string, { status: string; checked_at: Date }>();
  checkIns.forEach((c) => {
    const checkDate = new Date(c.checked_at);
    const existing = latestCheckInMap.get(c.tree_id);
    if (!existing || checkDate.getTime() > existing.checked_at.getTime()) {
      latestCheckInMap.set(c.tree_id, { status: c.status.toLowerCase(), checked_at: checkDate });
    }
  });

  let aliveCount = 0;
  let deadCount = 0;
  let unverifiedCount = 0;
  let latestAuditDate: string | null = null;

  plotTrees.forEach((t) => {
    const checkin = latestCheckInMap.get(t.id);
    const planted = new Date(t.plantation_date || t.created_at || now);
    const daysSincePlanted = (now.getTime() - planted.getTime()) / 86400000;

    let isAlive = false;
    let isDead = false;
    let isUnverified = false;

    if (checkin) {
      if (!latestAuditDate || checkin.checked_at.toISOString() > latestAuditDate) {
        latestAuditDate = checkin.checked_at.toISOString();
      }

      const daysSinceCheckin = (now.getTime() - checkin.checked_at.getTime()) / 86400000;
      if (checkin.status === "dead") {
        isDead = true;
      } else if (checkin.status === "unverified" || daysSinceCheckin > 60 || t.needs_verification) {
        isUnverified = true;
      } else if (checkin.status === "alive" || checkin.status === "healthy" || checkin.status === "stressed") {
        isAlive = true;
      }
    } else {
      // No check-in recorded yet
      const fallbackStatus = (t.status || "alive").toLowerCase();
      if (fallbackStatus === "dead") {
        isDead = true;
      } else if (daysSincePlanted > 60 || t.needs_verification) {
        isUnverified = true;
      } else {
        isAlive = true;
      }
    }

    if (isAlive) aliveCount++;
    if (isDead) deadCount++;
    if (isUnverified) unverifiedCount++;
  });

  const verifiedDenominator = aliveCount + deadCount;
  const verifiedSurvivalRate =
    verifiedDenominator > 0 ? Math.round((aliveCount / verifiedDenominator) * 1000) / 10 : 0.0;

  const totalTrees = plotTrees.length;
  const effectiveSurvivalRate =
    totalTrees > 0 ? Math.round((aliveCount / totalTrees) * 1000) / 10 : 0.0;

  return {
    plot_id: plotId,
    plot_name: plotName,
    location,
    total_trees: totalTrees,
    alive_count: aliveCount,
    dead_count: deadCount,
    unverified_count: unverifiedCount,
    verified_survival_rate_pct: verifiedSurvivalRate,
    effective_survival_rate_pct: effectiveSurvivalRate,
    latest_audit_at: latestAuditDate,
  };
}

/**
 * Evaluates Quarter-over-Quarter (QoQ) NDVI drop for bulk plots:
 * Compares current quarter (last 90 days) average NDVI vs previous quarter (90-180 days ago).
 * An alert is triggered if relative drop > 15%.
 */
export function evaluateQoQNdviDrop(
  plotId: string,
  plotName: string,
  readings: Array<{
    reading_date: string;
    ndvi: number;
  }>,
  thresholdPct: number = 15.0
): QoQNdviEvaluationResult {
  const now = new Date();
  const q1Cutoff = new Date(now.getTime() - 90 * 86400000);
  const q2Cutoff = new Date(now.getTime() - 180 * 86400000);

  const currentQReadings = readings.filter((r) => {
    const d = new Date(r.reading_date);
    return d >= q1Cutoff;
  });

  const prevQReadings = readings.filter((r) => {
    const d = new Date(r.reading_date);
    return d >= q2Cutoff && d < q1Cutoff;
  });

  let currentAvg = 0.72;
  let prevAvg = 0.74;

  if (currentQReadings.length > 0) {
    currentAvg = currentQReadings.reduce((sum, r) => sum + r.ndvi, 0) / currentQReadings.length;
  } else if (readings.length > 0) {
    currentAvg = readings[readings.length - 1].ndvi;
  }

  if (prevQReadings.length > 0) {
    prevAvg = prevQReadings.reduce((sum, r) => sum + r.ndvi, 0) / prevQReadings.length;
  } else if (readings.length > 1) {
    prevAvg = readings[0].ndvi;
  }

  currentAvg = Math.round(currentAvg * 1000) / 1000;
  prevAvg = Math.round(prevAvg * 1000) / 1000;

  const deltaNdvi = Math.round((currentAvg - prevAvg) * 1000) / 1000;
  const percentageChange =
    prevAvg > 0 ? Math.round(((currentAvg - prevAvg) / prevAvg) * 1000) / 10 : 0.0;

  const hasSignificantDrop = percentageChange < -thresholdPct;

  return {
    plotId,
    plotName,
    currentQuarterAvgNdvi: currentAvg,
    previousQuarterAvgNdvi: prevAvg,
    deltaNdvi,
    percentageChange,
    hasSignificantDrop,
    recommendedAction: hasSignificantDrop
      ? "dispatch_urgent_verification_task"
      : deltaNdvi >= 0.05
      ? "none"
      : "routine_quarterly_sample",
  };
}

// ---------------------------------------------------------------------------
// SUPABASE DATABASE OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Records a ground truth photo check-in in Supabase
 */
export async function recordTreeCheckIn(params: {
  treeId: string;
  status: "alive" | "dead" | "unverified";
  photoUrl?: string | null;
  checkedBy?: string;
  notes?: string | null;
  aiConfidence?: number;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { treeId, status, photoUrl, checkedBy = "Community Planter", notes, aiConfidence = 92.0 } = params;

    // 1. Insert into check_ins table
    const { data: checkInData, error: insertErr } = await supabase.from("check_ins").insert({
      tree_id: treeId,
      status,
      photo_url: photoUrl || null,
      checked_by: checkedBy,
      notes: notes || null,
      ai_confidence: aiConfidence,
      checked_at: new Date().toISOString(),
    }).select().single();

    if (insertErr) {
      console.warn("Could not insert to check_ins table:", insertErr.message);
    }

    // 2. Update tree record
    await supabase.from("trees").update({
      status: status === "alive" ? "alive" : status === "dead" ? "dead" : "unverified",
      needs_verification: false,
      last_checkin_at: new Date().toISOString(),
    }).eq("id", treeId);

    // 3. Log to admin audit log
    await supabase.from("admin_audit_log").insert({
      action: `GROUND_CHECKIN_${status.toUpperCase()}`,
      new_status: status,
      previous_status: "pending_verification",
      tree_id: treeId,
    });

    return { success: true, data: checkInData };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record check-in" };
  }
}

/**
 * Fetches check-in history for a specific tree
 */
export async function fetchTreeCheckIns(treeId: string): Promise<CheckInRecord[]> {
  try {
    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .eq("tree_id", treeId)
      .order("checked_at", { ascending: false });

    if (error) {
      console.warn("fetchTreeCheckIns error:", error.message);
      return [];
    }
    return (data as CheckInRecord[]) || [];
  } catch {
    return [];
  }
}

/**
 * Fetches per-plot survival rate statistics from view or calculates dynamically
 */
export async function fetchPlotSurvivalRates(): Promise<PlotSurvivalRateRecord[]> {
  try {
    // 1. Attempt to query PostgreSQL view
    const { data: viewData, error: viewErr } = await supabase
      .from("plot_survival_rates" as any)
      .select("*");

    if (!viewErr && viewData && viewData.length > 0) {
      return viewData as PlotSurvivalRateRecord[];
    }
  } catch {
    // Fall back to client calculation
  }

  // Fallback: Query plots, trees, and check_ins and compute directly
  try {
    const [{ data: plots }, { data: trees }, { data: checkIns }] = await Promise.all([
      supabase.from("plots").select("id, name, location"),
      supabase.from("trees").select("id, plot_id, status, needs_verification, created_at, plantation_date"),
      supabase.from("check_ins").select("tree_id, status, checked_at"),
    ]);

    if (!plots || plots.length === 0) return [];

    return plots.map((p) => {
      return calculatePlotSurvivalStats(
        p.id,
        p.name,
        trees || [],
        checkIns || [],
        p.location || "Maharashtra, India"
      );
    });
  } catch (err) {
    console.warn("Could not fetch plot survival rates:", err);
    return [];
  }
}

/**
 * Scheduled job execution (Supabase cron / Vercel cron simulation):
 * Scans trees with no check-in in >60 days, marks them needs_verification, and creates planter notifications.
 */
export async function runScheduled60DayInactivityCheck(): Promise<{
  success: boolean;
  flaggedCount: number;
  notificationsSent: number;
  flaggedTrees: any[];
}> {
  try {
    // Try calling stored PostgreSQL procedure first
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "check_inactive_trees_and_notify" as any
    );

    if (!rpcErr && rpcData) {
      return {
        success: true,
        flaggedCount: rpcData[0]?.flagged_count ?? 0,
        notificationsSent: rpcData[0]?.notifications_sent ?? 0,
        flaggedTrees: [],
      };
    }
  } catch {
    // Fall back to client execution
  }

  // Client-side fallback implementation
  try {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();

    // 1. Fetch trees and check-ins
    const [{ data: trees }, { data: checkIns }] = await Promise.all([
      supabase.from("trees").select("id, species, plot_id, created_at, plantation_date"),
      supabase.from("check_ins").select("tree_id, checked_at"),
    ]);

    if (!trees || trees.length === 0) {
      return { success: true, flaggedCount: 0, notificationsSent: 0, flaggedTrees: [] };
    }

    const latestCheckinMap = new Map<string, string>();
    (checkIns || []).forEach((c) => {
      const existing = latestCheckinMap.get(c.tree_id);
      if (!existing || c.checked_at > existing) {
        latestCheckinMap.set(c.tree_id, c.checked_at);
      }
    });

    const overdueTrees: any[] = [];

    for (const tree of trees) {
      const lastActivity = latestCheckinMap.get(tree.id) || tree.plantation_date || tree.created_at;
      if (lastActivity && lastActivity < sixtyDaysAgo) {
        overdueTrees.push(tree);

        // Flag tree
        await supabase.from("trees").update({
          needs_verification: true,
        }).eq("id", tree.id);

        // Insert notification
        await supabase.from("notifications").insert({
          tree_id: tree.id,
          plot_id: tree.plot_id,
          title: "📷 60-Day Survival Check-In Overdue",
          message: `Sapling ${tree.species} has had no ground photo check-in in >60 days. Please submit a fresh geotagged photo.`,
          type: "checkin_reminder",
        });
      }
    }

    return {
      success: true,
      flaggedCount: overdueTrees.length,
      notificationsSent: overdueTrees.length,
      flaggedTrees: overdueTrees,
    };
  } catch (err: any) {
    console.warn("Scheduled check-in scan error:", err);
    return { success: false, flaggedCount: 0, notificationsSent: 0, flaggedTrees: [] };
  }
}

/**
 * Creates a "Verification Needed" field task for a plot (e.g. when NDVI drops > 15%)
 */
export async function createPlotVerificationTask(params: {
  plotId: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
  metadata?: any;
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const { plotId, title, description, priority = "high", metadata = {} } = params;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: taskData, error: taskErr } = await supabase.from("field_tasks").insert({
      plot_id: plotId,
      title,
      description,
      task_type: "verification_needed",
      priority,
      status: "pending",
      due_date: dueDate.toISOString().split("T")[0],
      metadata,
    }).select().single();

    if (taskErr) {
      console.warn("createPlotVerificationTask error:", taskErr.message);
    }

    // Insert alert notification
    await supabase.from("notifications").insert({
      plot_id: plotId,
      title,
      message: description,
      type: "ndvi_anomaly_alert",
    });

    return { success: true, taskId: taskData?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create verification task" };
  }
}

/**
 * Fetches open field tasks for a plot
 */
export async function fetchPlotFieldTasks(plotId: string): Promise<FieldTaskRecord[]> {
  try {
    const { data, error } = await supabase
      .from("field_tasks")
      .select("*")
      .eq("plot_id", plotId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchPlotFieldTasks error:", error.message);
      return [];
    }
    return (data as FieldTaskRecord[]) || [];
  } catch {
    return [];
  }
}
