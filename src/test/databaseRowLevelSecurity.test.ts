import { describe, it, expect } from "vitest";
import { rlsPolicyService, SecurityContext } from "../lib/rlsPolicyService";
import {
  Organization,
  OrganizationMember,
  Project,
  Tree,
  Notification,
} from "../types/coreDatabase";

describe("Phase 2 — Database Row Level Security (RLS) Policy Engine (Task 9)", () => {
  const adminContext: SecurityContext = {
    user: { id: "usr-admin-1", role: "admin", email: "admin@hirwasparsh.internal" },
  };

  const userAliceContext: SecurityContext = {
    user: { id: "usr-alice-1", role: "ngo", email: "alice@sahyadri.org" },
    orgMemberships: [
      {
        id: "mem-1",
        organization_id: "org-sahyadri",
        user_id: "usr-alice-1",
        member_role: "admin",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const userBobContext: SecurityContext = {
    user: { id: "usr-bob-1", role: "field_worker", email: "bob@vidarbha.org" },
    orgMemberships: [
      {
        id: "mem-2",
        organization_id: "org-vidarbha",
        user_id: "usr-bob-1",
        member_role: "field_worker",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const unauthenticatedContext: SecurityContext = {
    user: null,
  };

  const sahyadriOrg: Organization = {
    id: "org-sahyadri",
    name: "Sahyadri Bio-Reserve Trust",
    type: "ngo",
    is_verified: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };

  const draftVidarbhaProject: Project = {
    id: "proj-vidarbha-draft",
    organization_id: "org-vidarbha",
    name: "Vidarbha Teak Plantation (Internal Draft)",
    project_type: "reforestation",
    status: "draft",
    target_trees: 1000,
    planted_trees: 0,
    created_by: "usr-bob-1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };

  const activeSahyadriProject: Project = {
    id: "proj-sahyadri-active",
    organization_id: "org-sahyadri",
    name: "Western Ghats Corridor Initiative",
    project_type: "reforestation",
    status: "active",
    target_trees: 5000,
    planted_trees: 1200,
    created_by: "usr-alice-1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };

  describe("1. Organization & Member Authorization", () => {
    it("allows verified organizations to be read publicly", () => {
      expect(rlsPolicyService.canReadOrganization(sahyadriOrg, unauthenticatedContext)).toBe(true);
      expect(rlsPolicyService.canReadOrganization(sahyadriOrg, userAliceContext)).toBe(true);
    });

    it("restricts unverified/private orgs to members and admins only", () => {
      const unverifiedOrg: Organization = {
        ...sahyadriOrg,
        id: "org-private",
        is_verified: false,
        created_by: "usr-alice-1",
      };

      expect(rlsPolicyService.canReadOrganization(unverifiedOrg, userBobContext)).toBe(false);
      expect(rlsPolicyService.canReadOrganization(unverifiedOrg, userAliceContext)).toBe(true);
      expect(rlsPolicyService.canReadOrganization(unverifiedOrg, adminContext)).toBe(true);
    });

    it("allows only org admins or platform superadmins to manage organization settings", () => {
      expect(rlsPolicyService.canManageOrganization(sahyadriOrg, userAliceContext)).toBe(true); // Alice is org admin
      expect(rlsPolicyService.canManageOrganization(sahyadriOrg, userBobContext)).toBe(false); // Bob belongs to Vidarbha
      expect(rlsPolicyService.canManageOrganization(sahyadriOrg, adminContext)).toBe(true); // Platform Admin
    });
  });

  describe("2. Cross-Organization Multi-Tenant Isolation", () => {
    it("prevents Alice from accessing Bob's draft project in another organization", () => {
      expect(rlsPolicyService.canReadProject(draftVidarbhaProject, userAliceContext)).toBe(false);
      expect(rlsPolicyService.canManageProject(draftVidarbhaProject, userAliceContext)).toBe(false);
    });

    it("allows Bob and platform admins to access Bob's draft project", () => {
      expect(rlsPolicyService.canReadProject(draftVidarbhaProject, userBobContext)).toBe(true);
      expect(rlsPolicyService.canReadProject(draftVidarbhaProject, adminContext)).toBe(true);
    });

    it("allows public access to active projects but restricts modification to org admins", () => {
      expect(rlsPolicyService.canReadProject(activeSahyadriProject, userBobContext)).toBe(true); // Public read
      expect(rlsPolicyService.canManageProject(activeSahyadriProject, userBobContext)).toBe(false); // No write access for Bob
      expect(rlsPolicyService.canManageProject(activeSahyadriProject, userAliceContext)).toBe(true); // Alice can manage
    });
  });

  describe("3. Tree & Biometrics Row-Level Access", () => {
    const pendingTree: Tree = {
      id: "tree-pending-1",
      project_id: "proj-vidarbha-draft",
      user_id: "usr-bob-1",
      tree_name: "Sapling #1",
      species: "Tectona grandis",
      plantation_date: "2026-09-01",
      height_cm: 45,
      location: "Vidarbha Zone",
      latitude: 21.1458,
      longitude: 79.0882,
      status: "alive",
      verification_status: "pending",
      admin_status: "pending",
      planting_type: "individual",
      points_awarded: 0,
      created_at: "2026-09-01",
      updated_at: "2026-09-01",
    };

    it("protects unverified trees from unauthorized non-members", () => {
      expect(rlsPolicyService.canReadTree(pendingTree, draftVidarbhaProject, userAliceContext)).toBe(false);
      expect(rlsPolicyService.canReadTree(pendingTree, draftVidarbhaProject, userBobContext)).toBe(true); // Owner/creator
      expect(rlsPolicyService.canReadTree(pendingTree, draftVidarbhaProject, adminContext)).toBe(true); // Admin
    });

    it("allows anyone to view approved/verified trees on the public map", () => {
      const approvedTree: Tree = {
        ...pendingTree,
        admin_status: "approved",
        verification_status: "verified",
      };
      expect(rlsPolicyService.canReadTree(approvedTree, null, unauthenticatedContext)).toBe(true);
      expect(rlsPolicyService.canReadTree(approvedTree, null, userAliceContext)).toBe(true);
    });
  });

  describe("4. Notifications & Personal Data Privacy", () => {
    const aliceNotif: Notification = {
      id: "notif-1",
      user_id: "usr-alice-1",
      title: "Project Approved",
      message: "Your project Western Ghats Corridor has been approved.",
      type: "system",
      is_read: false,
      created_at: "2026-09-01",
    };

    it("isolates notifications strictly to the recipient user", () => {
      expect(rlsPolicyService.canAccessNotification(aliceNotif, userAliceContext)).toBe(true);
      expect(rlsPolicyService.canAccessNotification(aliceNotif, userBobContext)).toBe(false); // Bob blocked
      expect(rlsPolicyService.canAccessNotification(aliceNotif, unauthenticatedContext)).toBe(false);
      expect(rlsPolicyService.canAccessNotification(aliceNotif, adminContext)).toBe(true); // Admin oversight
    });
  });

  describe("5. Audit Log Server-Side Control & Immutability", () => {
    it("restricts audit log viewing strictly to platform admins", () => {
      expect(rlsPolicyService.canReadAuditLogs(adminContext)).toBe(true);
      expect(rlsPolicyService.canReadAuditLogs(userAliceContext)).toBe(false);
      expect(rlsPolicyService.canReadAuditLogs(userBobContext)).toBe(false);
      expect(rlsPolicyService.canReadAuditLogs(unauthenticatedContext)).toBe(false);
    });

    it("strictly prohibits audit log modifications or deletions by any role (immutability)", () => {
      expect(rlsPolicyService.canMutateAuditLogs()).toBe(false);
    });
  });
});
