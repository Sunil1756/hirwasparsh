import { supabase } from "@/integrations/supabase/client";
import {
  Organization,
  OrganizationMember,
  OrganizationType,
  OrganizationMemberRole,
  UserProfile,
} from "@/types/coreDatabase";

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  registration_number?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  logo_url?: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  invited_email: string;
  invited_phone?: string | null;
  member_role: OrganizationMemberRole;
  invited_by?: string | null;
  token: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string;
  created_at: string;
}

export interface MemberWithProfile extends OrganizationMember {
  profile?: UserProfile | null;
}

export const organizationService = {
  /**
   * Creates a new Organization, assigns caller as Owner, and syncs profile
   */
  async createOrganization(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<{ organization: Organization; member: OrganizationMember }> {
    // 1. Insert Organization row
    const { data: orgData, error: orgError } = await supabase
      .from("organizations" as any)
      .insert({
        name: input.name.trim(),
        type: input.type,
        registration_number: input.registration_number?.trim() || null,
        contact_email: input.contact_email?.trim() || null,
        contact_phone: input.contact_phone?.trim() || null,
        website: input.website?.trim() || null,
        logo_url: input.logo_url?.trim() || null,
        created_by: userId,
        is_verified: false,
      })
      .select("*")
      .single();

    if (orgError || !orgData) {
      throw new Error(`Failed to create organization: ${orgError?.message || "Unknown error"}`);
    }

    const org = orgData as unknown as Organization;

    // 2. Automatically assign creator as 'owner'
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members" as any)
      .insert({
        organization_id: org.id,
        user_id: userId,
        member_role: "owner",
        status: "active",
      })
      .select("*")
      .single();

    if (memberError || !memberData) {
      throw new Error(`Organization created, but failed to assign owner role: ${memberError?.message}`);
    }

    // 3. Update user profile's organization name
    await supabase
      .from("profiles" as any)
      .update({ organization_name: org.name, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return {
      organization: org,
      member: memberData as unknown as OrganizationMember,
    };
  },

  /**
   * Retrieves organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from("organizations" as any)
      .select("*")
      .eq("id", organizationId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as Organization;
  },

  /**
   * Retrieves all organizations a user belongs to
   */
  async getUserOrganizations(
    userId: string
  ): Promise<Array<{ organization: Organization; membership: OrganizationMember }>> {
    const { data: memberships, error } = await supabase
      .from("organization_members" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error || !memberships || memberships.length === 0) return [];

    const orgIds = memberships.map((m: any) => m.organization_id);
    const { data: orgs } = await supabase
      .from("organizations" as any)
      .select("*")
      .in("id", orgIds);

    if (!orgs) return [];

    return memberships.map((membership: any) => {
      const org = orgs.find((o: any) => o.id === membership.organization_id);
      return {
        organization: org as unknown as Organization,
        membership: membership as unknown as OrganizationMember,
      };
    }).filter((item) => Boolean(item.organization));
  },

  /**
   * Updates organization profile information (requires owner/admin/manager role)
   */
  async updateOrganizationProfile(
    organizationId: string,
    updates: Partial<CreateOrganizationInput>,
    callerUserId: string
  ): Promise<Organization> {
    // Verify caller has permissions
    const isAuthorized = await this.hasAdminRole(organizationId, callerUserId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Only organization owners, admins, or managers can update profile details.");
    }

    const { data, error } = await supabase
      .from("organizations" as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update organization profile: ${error?.message}`);
    }

    return data as unknown as Organization;
  },

  /**
   * Lists all members of an organization with linked user profile data
   */
  async getOrganizationMembers(organizationId: string): Promise<MemberWithProfile[]> {
    const { data: members, error } = await supabase
      .from("organization_members" as any)
      .select("*")
      .eq("organization_id", organizationId)
      .order("joined_at", { ascending: true });

    if (error || !members) return [];

    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles" as any)
      .select("*")
      .in("id", userIds);

    return members.map((member: any) => {
      const profile = profiles?.find((p: any) => p.id === member.user_id) || null;
      return {
        ...(member as unknown as OrganizationMember),
        profile: profile as unknown as UserProfile | null,
      };
    });
  },

  /**
   * Generates a secure time-limited invitation for a new member
   */
  async inviteMember(
    organizationId: string,
    callerUserId: string,
    input: { invited_email: string; invited_phone?: string; member_role: OrganizationMemberRole }
  ): Promise<OrganizationInvitation> {
    const isAuthorized = await this.hasAdminRole(organizationId, callerUserId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Only organization managers, admins, or owners can issue invitations.");
    }

    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("organization_invitations" as any)
      .insert({
        organization_id: organizationId,
        invited_email: input.invited_email.toLowerCase().trim(),
        invited_phone: input.invited_phone?.trim() || null,
        member_role: input.member_role,
        invited_by: callerUserId,
        token,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to issue invitation: ${error?.message}`);
    }

    return data as unknown as OrganizationInvitation;
  },

  /**
   * Accepts an invitation token and links the user to the organization
   */
  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    // 1. Fetch invitation
    const { data: invData, error: invError } = await supabase
      .from("organization_invitations" as any)
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (invError || !invData) {
      throw new Error("Invalid or expired invitation token.");
    }

    const invitation = invData as unknown as OrganizationInvitation;
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("organization_invitations" as any)
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired.");
    }

    // 2. Add or update member in organization_members
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members" as any)
      .upsert(
        {
          organization_id: invitation.organization_id,
          user_id: userId,
          member_role: invitation.member_role,
          status: "active",
        },
        { onConflict: "organization_id,user_id" }
      )
      .select("*")
      .single();

    if (memberError || !memberData) {
      throw new Error(`Failed to accept invitation: ${memberError?.message}`);
    }

    // 3. Mark invitation as accepted
    await supabase
      .from("organization_invitations" as any)
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return memberData as unknown as OrganizationMember;
  },

  /**
   * Updates an existing member's role
   */
  async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    newRole: OrganizationMemberRole,
    callerUserId: string
  ): Promise<OrganizationMember> {
    const isAuthorized = await this.hasAdminRole(organizationId, callerUserId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Only organization owners or admins can modify member roles.");
    }

    // Cannot demote owner without transferring ownership
    const { data: targetMember } = await supabase
      .from("organization_members" as any)
      .select("member_role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .single();

    if (targetMember?.member_role === "owner" && newRole !== "owner") {
      throw new Error("Cannot demote the organization owner. Use transferOwnership instead.");
    }

    const { data, error } = await supabase
      .from("organization_members" as any)
      .update({ member_role: newRole, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update member role: ${error?.message}`);
    }

    return data as unknown as OrganizationMember;
  },

  /**
   * Removes a member from the organization
   */
  async removeMember(
    organizationId: string,
    targetUserId: string,
    callerUserId: string
  ): Promise<boolean> {
    const isSelf = targetUserId === callerUserId;
    const isAuthorized = isSelf || (await this.hasAdminRole(organizationId, callerUserId));

    if (!isAuthorized) {
      throw new Error("Unauthorized: You do not have permission to remove this member.");
    }

    // Prevent removing the sole owner
    const { data: targetMember } = await supabase
      .from("organization_members" as any)
      .select("member_role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .single();

    if (targetMember?.member_role === "owner") {
      throw new Error("Cannot remove the organization owner. Transfer ownership prior to leaving.");
    }

    const { error } = await supabase
      .from("organization_members" as any)
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId);

    return !error;
  },

  /**
   * Transfers ownership of an organization to another member
   */
  async transferOwnership(
    organizationId: string,
    newOwnerUserId: string,
    callerUserId: string
  ): Promise<boolean> {
    // Verify caller is current owner or platform admin
    const { data: currentOwner } = await supabase
      .from("organization_members" as any)
      .select("member_role")
      .eq("organization_id", organizationId)
      .eq("user_id", callerUserId)
      .maybeSingle();

    if (currentOwner?.member_role !== "owner") {
      throw new Error("Unauthorized: Only the current organization owner can transfer ownership.");
    }

    // Promote new user to owner
    await supabase
      .from("organization_members" as any)
      .update({ member_role: "owner", updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", newOwnerUserId);

    // Demote previous owner to admin
    await supabase
      .from("organization_members" as any)
      .update({ member_role: "admin", updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", callerUserId);

    // Update organizations created_by
    await supabase
      .from("organizations" as any)
      .update({ created_by: newOwnerUserId, updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    return true;
  },

  /**
   * Helper to check if caller has manager/admin/owner permissions
   */
  async hasAdminRole(organizationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("organization_members" as any)
      .select("member_role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return false;
    return ["owner", "admin", "manager"].includes(data.member_role);
  },
};
