import { describe, it, expect, vi } from "vitest";
import {
  AppRole,
  RbacPermission,
  APP_ROLES,
  resolvePrimaryRole,
  hasRbacPermission,
  assignUserRbacRole,
} from "@/lib/rbacService";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
});

describe("Role-Based Access Control (RBAC) & Dashboard Architecture Suite", () => {
  describe("1. Role Resolution Logic (resolvePrimaryRole)", () => {
    it("resolves admin role when admin is in roles or profileRole", () => {
      expect(resolvePrimaryRole(["admin"], "user")).toBe("admin");
      expect(resolvePrimaryRole([], "admin")).toBe("admin");
      expect(resolvePrimaryRole(["admin", "field_worker"], "individual")).toBe("admin");
    });

    it("resolves field_worker role when field_worker, moderator or ngo is present", () => {
      expect(resolvePrimaryRole(["field_worker"], "user")).toBe("field_worker");
      expect(resolvePrimaryRole(["moderator"], "user")).toBe("field_worker");
      expect(resolvePrimaryRole([], "field_worker")).toBe("field_worker");
      expect(resolvePrimaryRole([], "ngo")).toBe("field_worker");
    });

    it("resolves government role when government is in roles or profileRole", () => {
      expect(resolvePrimaryRole(["government"], "user")).toBe("government");
      expect(resolvePrimaryRole([], "government")).toBe("government");
    });

    it("resolves tree_adopter role for individual, csr, or tree_adopter", () => {
      expect(resolvePrimaryRole(["tree_adopter"], "user")).toBe("tree_adopter");
      expect(resolvePrimaryRole([], "individual")).toBe("tree_adopter");
      expect(resolvePrimaryRole([], "csr")).toBe("tree_adopter");
      expect(resolvePrimaryRole(["user"], null)).toBe("tree_adopter");
      expect(resolvePrimaryRole([], null)).toBe("tree_adopter");
    });
  });

  describe("2. Permission Matrix (hasRbacPermission)", () => {
    it("grants admin full system governance permissions", () => {
      expect(hasRbacPermission("admin", "manage_system_settings")).toBe(true);
      expect(hasRbacPermission("admin", "manage_user_roles")).toBe(true);
      expect(hasRbacPermission("admin", "batch_approve_trees")).toBe(true);
      expect(hasRbacPermission("admin", "mint_carbon_credits")).toBe(true);
      expect(hasRbacPermission("admin", "export_brsr_esg_reports")).toBe(true);
      expect(hasRbacPermission("admin", "submit_field_spot_audit")).toBe(true);
      expect(hasRbacPermission("admin", "download_tree_passport")).toBe(true);
    });

    it("grants field_worker operational and ground truth permissions", () => {
      expect(hasRbacPermission("field_worker", "submit_field_spot_audit")).toBe(true);
      expect(hasRbacPermission("field_worker", "execute_field_tasks")).toBe(true);
      expect(hasRbacPermission("field_worker", "access_offline_queue")).toBe(true);
      expect(hasRbacPermission("field_worker", "log_tree_vitality_counts")).toBe(true);

      // Should NOT have administrative system rights
      expect(hasRbacPermission("field_worker", "manage_system_settings")).toBe(false);
      expect(hasRbacPermission("field_worker", "manage_user_roles")).toBe(false);
      expect(hasRbacPermission("field_worker", "mint_carbon_credits")).toBe(false);
    });

    it("grants tree_adopter personal stewardship and adoption permissions", () => {
      expect(hasRbacPermission("tree_adopter", "adopt_trees")).toBe(true);
      expect(hasRbacPermission("tree_adopter", "upload_growth_checkins")).toBe(true);
      expect(hasRbacPermission("tree_adopter", "download_tree_passport")).toBe(true);
      expect(hasRbacPermission("tree_adopter", "view_personal_eco_impact")).toBe(true);

      // Should NOT have field worker or admin rights
      expect(hasRbacPermission("tree_adopter", "manage_user_roles")).toBe(false);
      expect(hasRbacPermission("tree_adopter", "batch_approve_trees")).toBe(false);
      expect(hasRbacPermission("tree_adopter", "execute_field_tasks")).toBe(false);
    });

    it("grants government official oversight and BRSR export permissions", () => {
      expect(hasRbacPermission("government", "export_brsr_esg_reports")).toBe(true);
      expect(hasRbacPermission("government", "view_admin_audit_logs")).toBe(true);
      expect(hasRbacPermission("government", "view_gis_satellite_map")).toBe(true);
      expect(hasRbacPermission("government", "manage_system_settings")).toBe(false);
    });
  });

  describe("3. App Role Definitions Integrity (APP_ROLES)", () => {
    it("defines valid dashboard routes for all canonical personas", () => {
      expect(APP_ROLES.admin.dashboardRoute).toBe("/admin");
      expect(APP_ROLES.field_worker.dashboardRoute).toBe("/field-worker");
      expect(APP_ROLES.tree_adopter.dashboardRoute).toBe("/adopter");
      expect(APP_ROLES.government.dashboardRoute).toBe("/government");
    });

    it("includes proper badge colors and human-readable titles", () => {
      expect(APP_ROLES.admin.displayName).toBe("System Administrator");
      expect(APP_ROLES.field_worker.displayName).toBe("Field Ranger / Scout");
      expect(APP_ROLES.tree_adopter.displayName).toBe("Tree Adopter / Citizen Steward");
      expect(APP_ROLES.admin.colorClass).toContain("rose");
      expect(APP_ROLES.field_worker.colorClass).toContain("amber");
      expect(APP_ROLES.tree_adopter.colorClass).toContain("emerald");
    });
  });

  describe("4. Role Assignment Workflow (assignUserRbacRole)", () => {
    it("handles role assignment with graceful fallback for simulated environments", async () => {
      const res = await assignUserRbacRole("mock-user-123", "field_worker");
      expect(res).toBeDefined();
      expect(typeof res.success).toBe("boolean");
    });
  });
});
