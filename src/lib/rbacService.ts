/**
 * Role-Based Access Control (RBAC) Service & Permissions Matrix
 * Securely governs access for:
 * 1. Admins: System configuration, AI approval, user role management, ESG certification
 * 2. Field Workers: Ground truth audits, 5% sampling, task dispatch, offline sync
 * 3. Tree Adopters: Tree adoption, digital passports, growth check-ins, personal eco-impact
 */

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "field_worker"
  | "tree_adopter"
  | "moderator"
  | "government"
  | "user";

export type RbacPermission =
  | "manage_system_settings"
  | "manage_user_roles"
  | "batch_approve_trees"
  | "reject_flagged_trees"
  | "mint_carbon_credits"
  | "export_brsr_esg_reports"
  | "view_admin_audit_logs"
  | "submit_field_spot_audit"
  | "execute_field_tasks"
  | "access_offline_queue"
  | "log_tree_vitality_counts"
  | "adopt_trees"
  | "upload_growth_checkins"
  | "download_tree_passport"
  | "view_personal_eco_impact"
  | "view_gis_satellite_map"
  | "view_public_intelligence";

export interface RoleDefinition {
  id: AppRole;
  displayName: string;
  badgeLabel: string;
  colorClass: string;
  description: string;
  dashboardRoute: string;
  permissions: RbacPermission[];
}

export const APP_ROLES: Record<AppRole, RoleDefinition> = {
  admin: {
    id: "admin",
    displayName: "System Administrator",
    badgeLabel: "Admin / SuperUser",
    colorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    description: "Full governance, AI verification batch approval, user role assignments, carbon credit issuance, and macro GIS telemetry.",
    dashboardRoute: "/admin",
    permissions: [
      "manage_system_settings",
      "manage_user_roles",
      "batch_approve_trees",
      "reject_flagged_trees",
      "mint_carbon_credits",
      "export_brsr_esg_reports",
      "view_admin_audit_logs",
      "submit_field_spot_audit",
      "execute_field_tasks",
      "access_offline_queue",
      "log_tree_vitality_counts",
      "adopt_trees",
      "upload_growth_checkins",
      "download_tree_passport",
      "view_personal_eco_impact",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
  field_worker: {
    id: "field_worker",
    displayName: "Field Ranger / Scout",
    badgeLabel: "Field Operations",
    colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "Ground truth field surveyor. Performs 5% spot audits, GPS waypoint inspections, moisture stress remediation, and offline sync.",
    dashboardRoute: "/field-worker",
    permissions: [
      "submit_field_spot_audit",
      "execute_field_tasks",
      "access_offline_queue",
      "log_tree_vitality_counts",
      "upload_growth_checkins",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
  tree_adopter: {
    id: "tree_adopter",
    displayName: "Tree Adopter / Citizen Steward",
    badgeLabel: "Citizen Adopter",
    colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "Tree steward & adopter. Tracks adopted trees, downloads digital passports with QR codes, logs growth updates, and earns eco-points.",
    dashboardRoute: "/adopter",
    permissions: [
      "adopt_trees",
      "upload_growth_checkins",
      "download_tree_passport",
      "view_personal_eco_impact",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
  moderator: {
    id: "moderator",
    displayName: "Community Moderator",
    badgeLabel: "Moderator",
    colorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    description: "Reviews community submissions, flags suspicious photos, and assists field workers.",
    dashboardRoute: "/admin",
    permissions: [
      "batch_approve_trees",
      "reject_flagged_trees",
      "submit_field_spot_audit",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
  government: {
    id: "government",
    displayName: "State Forest Officer",
    badgeLabel: "Government Institutional",
    colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "Institutional state monitor with access to district-wide survival metrics and BRSR compliance reports.",
    dashboardRoute: "/government",
    permissions: [
      "export_brsr_esg_reports",
      "view_admin_audit_logs",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
  user: {
    id: "user",
    displayName: "Individual Member",
    badgeLabel: "Member",
    colorClass: "bg-primary/10 text-primary border-primary/20",
    description: "Standard registered member with tree plantation and adoption capabilities.",
    dashboardRoute: "/adopter",
    permissions: [
      "adopt_trees",
      "upload_growth_checkins",
      "download_tree_passport",
      "view_personal_eco_impact",
      "view_gis_satellite_map",
      "view_public_intelligence",
    ],
  },
};

/**
 * Determines primary application role from raw roles list and profile metadata
 */
export function resolvePrimaryRole(
  roles: string[] = [],
  profileRole?: string | null
): AppRole {
  if (roles.includes("admin") || profileRole === "admin") return "admin";
  if (roles.includes("field_worker") || roles.includes("moderator") || profileRole === "field_worker" || profileRole === "moderator" || profileRole === "ngo") return "field_worker";
  if (roles.includes("government") || profileRole === "government") return "government";
  if (roles.includes("tree_adopter") || profileRole === "tree_adopter" || profileRole === "individual" || profileRole === "csr") return "tree_adopter";
  if (roles.includes("user")) return "tree_adopter";
  return "tree_adopter";
}

/**
 * Checks if a given role has a specific RBAC permission
 */
export function hasRbacPermission(role: AppRole, permission: RbacPermission): boolean {
  const def = APP_ROLES[role];
  if (!def) return false;
  return def.permissions.includes(permission);
}

/**
 * Assigns or updates a user's role in Supabase
 */
export async function assignUserRbacRole(
  userId: string,
  newRole: AppRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update profiles table
    await supabase
      .from("profiles")
      .update({ role: newRole } as any)
      .eq("id", userId);

    // 2. Upsert user_roles table if accessible
    try {
      await supabase
        .from("user_roles" as any)
        .upsert({ user_id: userId, role: newRole } as any, { onConflict: "user_id,role" });
    } catch {
      // ignore if user_roles has strict enum
    }

    return { success: true };
  } catch (err: any) {
    console.warn("assignUserRbacRole error:", err);
    return { success: false, error: err?.message || "Failed to update user role" };
  }
}
