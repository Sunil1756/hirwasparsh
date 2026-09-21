import { describe, it, expect, vi, beforeEach } from "vitest";
import { maskRecipient, sendOtpCode, verifyOtpCode } from "@/services/otpService";
import {
  APP_ROLES,
  resolvePrimaryRole,
  hasRbacPermission,
  assignUserRbacRole,
} from "@/lib/rbacService";

const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockInvoke = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  upsert: mockUpsert.mockResolvedValue({ error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: any[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
    },
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    from: (table: string) => mockFrom(table),
  },
}));

describe("Authentication & Authorization Backend Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. OTP Service & Privacy Masking", () => {
    it("masks email addresses properly for user privacy", () => {
      expect(maskRecipient("rohit.patil@example.com", "email")).toBe("ro*********@example.com");
      expect(maskRecipient("admin@greenenlightenment.org", "email")).toBe("ad***@greenenlightenment.org");
      expect(maskRecipient("a@b.com", "email")).toBe("a*@b.com");
    });

    it("masks Indian and international phone numbers securely", () => {
      expect(maskRecipient("+919820123456", "sms")).toBe("+91 98******56");
      expect(maskRecipient("9876543210", "sms")).toBe("+91 98******10");
    });

    it("dispatches email OTP via Supabase Auth successfully", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: null });

      const res = await sendOtpCode({
        recipient: "adopter@example.com",
        channel: "email",
        purpose: "login",
        metadata: { full_name: "Adopter Rohit", account_type: "individual" },
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain("6-digit verification code sent");
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "adopter@example.com",
        options: {
          shouldCreateUser: true,
          data: { full_name: "Adopter Rohit", account_type: "individual" },
        },
      });
    });

    it("falls back to edge function when native email OTP returns error", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: { message: "SMTP rate limit exceeded" } });
      mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

      const res = await sendOtpCode({
        recipient: "fallback@example.com",
        channel: "email",
        purpose: "signup",
      });

      expect(res.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("send-otp", {
        body: expect.objectContaining({
          action: "send",
          recipient: "fallback@example.com",
          channel: "email",
        }),
      });
    });

    it("dispatches SMS OTP and normalizes Indian mobile format", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: null });

      const res = await sendOtpCode({
        recipient: "9820123456",
        channel: "sms",
        purpose: "login",
      });

      expect(res.success).toBe(true);
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: "+919820123456",
        options: {
          channel: "sms",
          data: {},
        },
      });
    });

    it("validates 6-digit code format and rejects invalid lengths", async () => {
      const res = await verifyOtpCode({
        recipient: "user@example.com",
        code: "123",
        channel: "email",
        purpose: "login",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("valid 6-digit");
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("verifies email OTP and synchronizes profile in database", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: { id: "user-uuid-99", user_metadata: { full_name: "Rohit" } } },
        error: null,
      });

      const res = await verifyOtpCode({
        recipient: "rohit@example.com",
        code: "654321",
        channel: "email",
        purpose: "signup",
        metadata: { full_name: "Rohit Patil", organization_name: "Green Trust", account_type: "ngo" },
      });

      expect(res.success).toBe(true);
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "rohit@example.com",
        token: "654321",
        type: "email",
      });
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-uuid-99",
          full_name: "Rohit Patil",
          organization_name: "Green Trust",
          role: "ngo",
        })
      );
    });
  });

  describe("2. RBAC Roles, Permissions Matrix & Hierarchy", () => {
    it("defines complete permission matrices for all standard application roles", () => {
      expect(APP_ROLES.admin.permissions).toContain("manage_system_settings");
      expect(APP_ROLES.admin.permissions).toContain("mint_carbon_credits");
      expect(APP_ROLES.field_worker.permissions).toContain("submit_field_spot_audit");
      expect(APP_ROLES.field_worker.permissions).toContain("access_offline_queue");
      expect(APP_ROLES.tree_adopter.permissions).toContain("adopt_trees");
      expect(APP_ROLES.government.permissions).toContain("export_brsr_esg_reports");
    });

    it("correctly resolves primary role priority hierarchy", () => {
      expect(resolvePrimaryRole(["admin", "tree_adopter"], null)).toBe("admin");
      expect(resolvePrimaryRole([], "admin")).toBe("admin");
      expect(resolvePrimaryRole(["field_worker"], "individual")).toBe("field_worker");
      expect(resolvePrimaryRole([], "ngo")).toBe("field_worker");
      expect(resolvePrimaryRole(["government"], null)).toBe("government");
      expect(resolvePrimaryRole([], "individual")).toBe("tree_adopter");
      expect(resolvePrimaryRole([], "csr")).toBe("tree_adopter");
      expect(resolvePrimaryRole([], null)).toBe("tree_adopter");
    });

    it("verifies fine-grained permission enforcement via hasRbacPermission", () => {
      expect(hasRbacPermission("admin", "manage_system_settings")).toBe(true);
      expect(hasRbacPermission("admin", "mint_carbon_credits")).toBe(true);
      expect(hasRbacPermission("field_worker", "submit_field_spot_audit")).toBe(true);
      expect(hasRbacPermission("field_worker", "manage_system_settings")).toBe(false);
      expect(hasRbacPermission("tree_adopter", "adopt_trees")).toBe(true);
      expect(hasRbacPermission("tree_adopter", "mint_carbon_credits")).toBe(false);
      expect(hasRbacPermission("government", "export_brsr_esg_reports")).toBe(true);
    });

    it("executes assignUserRbacRole and updates profiles and user_roles tables", async () => {
      const res = await assignUserRbacRole("user-abc-123", "field_worker");
      expect(res.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockFrom).toHaveBeenCalledWith("user_roles");
    });
  });
});
