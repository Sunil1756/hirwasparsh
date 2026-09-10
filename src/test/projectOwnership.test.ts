import { describe, it, expect } from "vitest";
import {
  isProjectOwner,
  canEditProject,
  getProjectAccessBadge,
  ProjectSubject,
  ProjectOwnershipContext,
} from "../lib/projectOwnership";

describe("Project Ownership & Privacy Access Control", () => {
  const sampleProject: ProjectSubject = {
    id: "proj_12345",
    user_id: "user_owner_abc",
    organization_name: "Sahyadri Bio-Reserve Trust",
    contact_email: "contact@sahyadri.org",
  };

  const otherProject: ProjectSubject = {
    id: "proj_67890",
    user_id: "user_other_xyz",
    organization_name: "Vidarbha Forest Forum",
    contact_email: "info@vidarbha.org",
  };

  describe("isProjectOwner", () => {
    it("recognizes owner by matching user.id with project.user_id", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "user_owner_abc", email: "contact@sahyadri.org" },
      };
      expect(isProjectOwner(sampleProject, context)).toBe(true);
    });

    it("recognizes owner by local project ID saved on device", () => {
      const context: ProjectOwnershipContext = {
        user: null,
        localProjectIds: ["proj_12345"],
      };
      expect(isProjectOwner(sampleProject, context)).toBe(true);
    });

    it("returns false for a different user", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "user_stranger_999", email: "stranger@gmail.com" },
      };
      expect(isProjectOwner(sampleProject, context)).toBe(false);
    });

    it("returns false for null project or unauthenticated context with no matching local ID", () => {
      expect(isProjectOwner(null, { user: null })).toBe(false);
      expect(isProjectOwner(sampleProject, { user: null })).toBe(false);
    });
  });

  describe("canEditProject", () => {
    it("allows editing if current user is project owner", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "user_owner_abc" },
        isAdmin: false,
      };
      expect(canEditProject(sampleProject, context)).toBe(true);
    });

    it("allows editing if user is platform administrator even if not project owner", () => {
      const adminContext: ProjectOwnershipContext = {
        user: { id: "admin_super_user" },
        isAdmin: true,
      };
      expect(canEditProject(sampleProject, adminContext)).toBe(true);
      expect(canEditProject(otherProject, adminContext)).toBe(true);
    });

    it("STRICTLY BLOCKS editing for other non-admin users (Private Project Protection)", () => {
      const strangerContext: ProjectOwnershipContext = {
        user: { id: "user_other_xyz" },
        isAdmin: false,
      };
      // user_other_xyz cannot edit sampleProject (owned by user_owner_abc)
      expect(canEditProject(sampleProject, strangerContext)).toBe(false);
      // but can edit their own project
      expect(canEditProject(otherProject, strangerContext)).toBe(true);
    });

    it("STRICTLY BLOCKS editing for unauthenticated public viewers", () => {
      const publicContext: ProjectOwnershipContext = {
        user: null,
        isAdmin: false,
      };
      expect(canEditProject(sampleProject, publicContext)).toBe(false);
      expect(canEditProject(otherProject, publicContext)).toBe(false);
    });
  });

  describe("getProjectAccessBadge", () => {
    it("returns verified owner badge when viewing own project", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "user_owner_abc" },
        isAdmin: false,
      };
      const badge = getProjectAccessBadge(sampleProject, context);
      expect(badge.isOwner).toBe(true);
      expect(badge.canEdit).toBe(true);
      expect(badge.label).toContain("Your Project");
      expect(badge.badgeVariant).toBe("default");
    });

    it("returns admin oversight badge when admin views project", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "admin_root" },
        isAdmin: true,
      };
      const badge = getProjectAccessBadge(sampleProject, context);
      expect(badge.isOwner).toBe(false);
      expect(badge.canEdit).toBe(true);
      expect(badge.label).toContain("Admin Access");
    });

    it("returns public read-only badge when viewing another user's project", () => {
      const context: ProjectOwnershipContext = {
        user: { id: "user_other_xyz" },
        isAdmin: false,
      };
      const badge = getProjectAccessBadge(sampleProject, context);
      expect(badge.isOwner).toBe(false);
      expect(badge.canEdit).toBe(false);
      expect(badge.label).toContain("Public Record");
      expect(badge.badgeVariant).toBe("outline");
    });
  });
});
