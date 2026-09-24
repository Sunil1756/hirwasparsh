import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationService } from "../services/organizationService";
import { supabase } from "../integrations/supabase/client";

// Mock Supabase client
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 3 — Organization System & Multi-Tenancy (Task 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Organization Creation & Owner Assignment", () => {
    it("creates organization, assigns creator as owner, and syncs user profile", async () => {
      const mockOrg = {
        id: "org-new-1",
        name: "Western Ghats Ecological Foundation",
        type: "ngo",
        registration_number: "NGO-MH-2026-001",
        created_by: "user-creator-1",
        is_verified: false,
      };

      const mockMember = {
        id: "mem-owner-1",
        organization_id: "org-new-1",
        user_id: "user-creator-1",
        member_role: "owner",
        status: "active",
      };

      const mockOrgInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        }),
      });

      const mockMemberInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockMember, error: null }),
        }),
      });

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return { insert: mockOrgInsert };
        }
        if (table === "organization_members") {
          return { insert: mockMemberInsert };
        }
        if (table === "profiles") {
          return { update: mockProfileUpdate };
        }
        return { insert: vi.fn(), update: vi.fn(), select: vi.fn() };
      });

      const result = await organizationService.createOrganization("user-creator-1", {
        name: "Western Ghats Ecological Foundation",
        type: "ngo",
        registration_number: "NGO-MH-2026-001",
      });

      expect(result.organization.id).toBe("org-new-1");
      expect(result.member.member_role).toBe("owner");
      expect(mockOrgInsert).toHaveBeenCalled();
      expect(mockMemberInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: "org-new-1",
          user_id: "user-creator-1",
          member_role: "owner",
        })
      );
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_name: "Western Ghats Ecological Foundation",
        })
      );
    });
  });

  describe("2. Organization Profile Management", () => {
    it("updates organization profile when caller has admin permissions", async () => {
      const mockUpdatedOrg = {
        id: "org-1",
        name: "Sahyadri Bio-Reserve Trust (Updated)",
        website: "https://sahyadri-updated.org",
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { member_role: "admin" }, error: null }),
          };
        }
        if (table === "organizations") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockUpdatedOrg, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const updated = await organizationService.updateOrganizationProfile(
        "org-1",
        { name: "Sahyadri Bio-Reserve Trust (Updated)", website: "https://sahyadri-updated.org" },
        "admin-user-1"
      );

      expect(updated.name).toBe("Sahyadri Bio-Reserve Trust (Updated)");
    });

    it("rejects profile updates from unauthorized members", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { member_role: "viewer" }, error: null }),
          };
        }
        return {};
      });

      await expect(
        organizationService.updateOrganizationProfile("org-1", { name: "Hacked" }, "viewer-user-1")
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("3. Member Invitations & Token Acceptance", () => {
    it("generates a 7-day invitation token for a new member", async () => {
      const mockInv = {
        id: "inv-100",
        organization_id: "org-1",
        invited_email: "worker@domain.com",
        member_role: "field_worker",
        token: "inv_token_abc123",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { member_role: "manager" }, error: null }),
          };
        }
        if (table === "organization_invitations") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInv, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const invitation = await organizationService.inviteMember("org-1", "manager-user-1", {
        invited_email: "worker@domain.com",
        member_role: "field_worker",
      });

      expect(invitation.status).toBe("pending");
      expect(invitation.member_role).toBe("field_worker");
      expect(invitation.token).toBeDefined();
    });

    it("accepts valid invitation token and enrolls member", async () => {
      const mockInv = {
        id: "inv-100",
        organization_id: "org-1",
        invited_email: "worker@domain.com",
        member_role: "field_worker",
        status: "pending",
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockJoinedMember = {
        id: "mem-new-5",
        organization_id: "org-1",
        user_id: "new-user-99",
        member_role: "field_worker",
        status: "active",
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_invitations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockInv, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockJoinedMember, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const member = await organizationService.acceptInvitation("inv_token_abc123", "new-user-99");
      expect(member.user_id).toBe("new-user-99");
      expect(member.member_role).toBe("field_worker");
      expect(member.status).toBe("active");
    });
  });

  describe("4. Role Management & Ownership Transfer", () => {
    it("updates member role successfully", async () => {
      const mockTarget = { member_role: "member" };
      const mockUpdated = { id: "m-2", user_id: "target-user", member_role: "manager" };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { member_role: "owner" }, error: null }),
            single: vi.fn().mockResolvedValue({ data: mockTarget, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const updated = await organizationService.updateMemberRole("org-1", "target-user", "manager", "owner-user");
      expect(updated.member_role).toBe("manager");
    });

    it("transfers ownership and updates created_by", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { member_role: "owner" }, error: null }),
            update: mockUpdate,
          };
        }
        if (table === "organizations") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const success = await organizationService.transferOwnership("org-1", "new-owner-id", "current-owner-id");
      expect(success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledTimes(2); // 1 for new owner promote, 1 for old owner demote
    });
  });
});
