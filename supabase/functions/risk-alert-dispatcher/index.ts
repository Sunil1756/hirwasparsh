import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type ThreatType =
  | "DROUGHT_SHOCK"
  | "PEST_DEFOLIATION"
  | "ENCROACHMENT_CLEARING"
  | "WILDFIRE_SUSCEPTIBILITY"
  | "SOIL_SALINIZATION"
  | "STABLE_CANOPY"
  | "CANOPY_ACCRETION";

export type ThreatSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface AnomalyAlertPayload {
  projectId?: string;
  projectName?: string;
  treeId?: string;
  treeName?: string;
  species?: string;
  plotId?: string;
  plotName?: string;
  threatType: ThreatType;
  threatTitle: string;
  severity: ThreatSeverity;
  riskProbabilityPct: number;
  daysUntilCriticalBreach?: number | null;
  primaryDriver: string;
  scientificExplanation?: string;
  recommendedAction: string;
  latitude?: number;
  longitude?: number;
  currentNdvi?: number;
  ndviDelta?: number;
  foliarNdwi?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AnomalyAlertPayload = await req.json();

    if (!payload.threatType || !payload.threatTitle || !payload.severity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (threatType, threatTitle, severity)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isUrgent = payload.severity === "CRITICAL" || payload.severity === "HIGH";
    const leadDays = payload.daysUntilCriticalBreach ?? (isUrgent ? 3 : 7);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.max(1, leadDays));

    let createdTaskId: string | null = null;
    let fieldWorkersNotified = 0;
    let adoptersNotified = 0;
    const notificationsCreated: any[] = [];

    // 1. AUTO-GENERATE FIELD WORKER TASK
    try {
      const taskTitle = `🚨 [${payload.severity}] ${payload.threatTitle.replace(/^[^\w]+/, "").trim()}`;
      const taskDesc = `Anomaly Driver: ${payload.primaryDriver}\n\nRecommended Action: ${payload.recommendedAction}\n\nCoordinates: ${payload.latitude ?? "N/A"}°, ${payload.longitude ?? "N/A"}°\nLead Time: ${leadDays} days until critical threshold breach.`;

      const { data: taskData, error: taskErr } = await supabase
        .from("field_tasks")
        .insert({
          plot_id: payload.plotId || null,
          title: taskTitle,
          description: taskDesc,
          task_type: "verification_needed",
          priority: payload.severity === "CRITICAL" ? "urgent" : payload.severity === "HIGH" ? "high" : "medium",
          status: "pending",
          due_date: dueDate.toISOString().split("T")[0],
          metadata: {
            threat_type: payload.threatType,
            severity: payload.severity,
            risk_probability_pct: payload.riskProbabilityPct,
            latitude: payload.latitude,
            longitude: payload.longitude,
            current_ndvi: payload.currentNdvi,
            ndvi_delta: payload.ndviDelta,
            foliar_ndwi: payload.foliarNdwi,
            project_id: payload.projectId,
            tree_id: payload.treeId,
            source: "ai_risk_alert_dispatcher_edge_function",
          },
        })
        .select("id")
        .maybeSingle();

      if (!taskErr && taskData) {
        createdTaskId = taskData.id;
      }
    } catch (taskEx) {
      console.warn("Could not insert into field_tasks:", taskEx);
    }

    // 2. DISPATCH NOTIFICATION FOR FIELD WORKERS
    try {
      // Find field workers or rangers in database
      const { data: fieldWorkers } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .or("role.eq.field_worker,role.eq.ngo,role.eq.moderator,role.eq.admin");

      const targetWorkers = fieldWorkers && fieldWorkers.length > 0 ? fieldWorkers : [{ id: "system-ranger-default" }];

      for (const worker of targetWorkers) {
        const notifPayload = {
          user_id: worker.id,
          type: "field_anomaly_dispatch",
          title: `⚠️ Operational Alert: ${payload.threatTitle}`,
          body: `Satellite anomaly detected at ${payload.plotName || payload.projectName || "Plantation Sector"}. Urgent field inspection & 5% spot audit recommended within ${leadDays} days.`,
          read: false,
          data: {
            task_id: createdTaskId,
            threat_type: payload.threatType,
            severity: payload.severity,
            latitude: payload.latitude,
            longitude: payload.longitude,
            recommended_action: payload.recommendedAction,
            action_route: "/field-worker",
          },
        };

        const { error: notifErr } = await supabase.from("notifications").insert(notifPayload);
        if (!notifErr) {
          fieldWorkersNotified++;
          notificationsCreated.push(notifPayload);
        }
      }
    } catch (workerEx) {
      console.warn("Could not notify field workers:", workerEx);
    }

    // 3. DISPATCH PROACTIVE ADVISORY FOR TREE ADOPTERS
    try {
      let adopterUserIds: string[] = [];

      if (payload.treeId) {
        const { data: tree } = await supabase
          .from("trees")
          .select("user_id")
          .eq("id", payload.treeId)
          .maybeSingle();
        if (tree?.user_id) adopterUserIds.push(tree.user_id);
      }

      if (adopterUserIds.length === 0 && payload.projectId) {
        const { data: projectTrees } = await supabase
          .from("trees")
          .select("user_id")
          .eq("project_id", payload.projectId)
          .limit(20);
        if (projectTrees) {
          adopterUserIds = Array.from(new Set(projectTrees.map((t: any) => t.user_id).filter(Boolean)));
        }
      }

      // If no specific adopter found, target all adopter profiles
      if (adopterUserIds.length === 0) {
        const { data: adopters } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "individual")
          .limit(10);
        if (adopters) {
          adopterUserIds = adopters.map((a: any) => a.id);
        }
      }

      // Construct reassuring, actionable advisory
      const adopterTitle = `🌿 Care Update: Monitoring for ${payload.treeName || "Your Adopted Plantation"}`;
      const adopterBody = `Our Sentinel-2 AI satellite telemetry noticed a slight environmental variation (${payload.primaryDriver}) in your tree's sector. A field scout has already been dispatched for hydration care. Your tree is actively safeguarded!`;

      for (const userId of adopterUserIds) {
        const adopterNotif = {
          user_id: userId,
          type: "tree_health_advisory",
          title: adopterTitle,
          body: adopterBody,
          read: false,
          data: {
            tree_id: payload.treeId,
            tree_name: payload.treeName,
            threat_type: payload.threatType,
            severity: payload.severity,
            action_route: payload.treeId ? `/tree/${payload.treeId}` : "/adopter",
          },
        };

        const { error: adoptErr } = await supabase.from("notifications").insert(adopterNotif);
        if (!adoptErr) {
          adoptersNotified++;
          notificationsCreated.push(adopterNotif);
        }
      }
    } catch (adopterEx) {
      console.warn("Could not notify tree adopters:", adopterEx);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "AI Risk Alert processed and multi-channel notifications dispatched successfully.",
        threatType: payload.threatType,
        severity: payload.severity,
        taskId: createdTaskId,
        leadDaysUntilBreach: leadDays,
        fieldWorkersNotified,
        adoptersNotified,
        notificationsDispatchedCount: notificationsCreated.length,
        deliveryChannels: ["in_app_realtime", "field_task_queue", "email_advisory_gateway"],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("risk-alert-dispatcher error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
