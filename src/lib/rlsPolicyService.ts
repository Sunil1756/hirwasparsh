import {
  UserProfile,
  Organization,
  OrganizationMember,
  Project,
  Tree,
  Notification,
  AuditLog,
} from "@/types/coreDatabase";

export interface SecurityContext {
  user: {
    id: string;
    role?: string;
    email?: string;
  } | null;
  orgMemberships?: OrganizationMember[];
}

export const rlsPolicyService = {
  /**
   * Evaluates if context user has administrative superuser privileges
   */
  isAdmin(context: SecurityContext): boolean {
    return context.user?.role === "admin";
  },

  /**
   * Evaluates if context user has active membership in target organization
   */
  isOrgMember(orgId: string, context: SecurityContext): boolean {
    if (!context.user || !orgId) return false;
    if (this.isAdmin(context)) return true;
    return (
      context.orgMemberships?.some(
        (m) => m.organization_id === orgId && m.user_id === context.user?.id && m.status === "active"
      ) || false
    );
  },

  /**
   * Evaluates if context user is an admin or manager of the organization
   */
  isOrgAdmin(orgId: string, context: SecurityContext): boolean {
    if (!context.user || !orgId) return false;
    if (this.isAdmin(context)) return true;
    return (
      context.orgMemberships?.some(
        (m) =>
          m.organization_id === orgId &&
          m.user_id === context.user?.id &&
          ["owner", "admin", "manager"].includes(m.member_role) &&
          m.status === "active"
      ) || false
    );
  },

  /**
   * Evaluates read permission for an organization
   */
  canReadOrganization(org: Organization, context: SecurityContext): boolean {
    if (org.is_verified) return true;
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    if (org.created_by === context.user.id) return true;
    return this.isOrgMember(org.id, context);
  },

  /**
   * Evaluates update/management permission for an organization
   */
  canManageOrganization(org: Organization, context: SecurityContext): boolean {
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    return this.isOrgAdmin(org.id, context);
  },

  /**
   * Evaluates read permission for a project
   */
  canReadProject(project: Project, context: SecurityContext): boolean {
    if (project.status === "active") return true;
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    if (project.created_by === context.user.id) return true;
    if (project.organization_id && this.isOrgMember(project.organization_id, context)) return true;
    return false;
  },

  /**
   * Evaluates create/update permission for a project
   */
  canManageProject(project: Project, context: SecurityContext): boolean {
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    if (project.created_by === context.user.id) return true;
    if (project.organization_id && this.isOrgAdmin(project.organization_id, context)) return true;
    return false;
  },

  /**
   * Evaluates read permission for an individual tree
   */
  canReadTree(tree: Tree, project: Project | null, context: SecurityContext): boolean {
    if (tree.admin_status === "approved" || tree.verification_status === "verified") return true;
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    if (tree.user_id === context.user.id) return true;
    if (project && this.canReadProject(project, context)) return true;
    return false;
  },

  /**
   * Evaluates read/write permission for personal user notifications
   */
  canAccessNotification(notification: Notification, context: SecurityContext): boolean {
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    return notification.user_id === context.user.id;
  },

  /**
   * Evaluates permission to manage project boundaries
   */
  canManageBoundary(project: Project, context: SecurityContext): boolean {
    return this.canManageProject(project, context);
  },

  /**
   * Evaluates access to multi-tenant storage files
   * e.g., organizations/{orgId}/..., projects/{projectId}/..., users/{userId}/...
   */
  canAccessStoragePath(
    bucketName: string,
    storagePath: string,
    context: SecurityContext,
    resourceMetadata?: {
      organization_id?: string | null;
      project_id?: string | null;
      user_id?: string | null;
      is_public?: boolean;
    }
  ): boolean {
    if (resourceMetadata?.is_public) return true;
    if (!context.user) return false;
    if (this.isAdmin(context)) return true;
    if (resourceMetadata?.user_id && resourceMetadata.user_id === context.user.id) return true;
    if (resourceMetadata?.organization_id && this.isOrgMember(resourceMetadata.organization_id, context)) return true;

    // Path-based tenant isolation checks
    if (storagePath.startsWith("organizations/")) {
      const parts = storagePath.split("/");
      const targetOrgId = parts[1];
      return Boolean(targetOrgId && this.isOrgMember(targetOrgId, context));
    }

    if (storagePath.startsWith("users/")) {
      const parts = storagePath.split("/");
      const targetUserId = parts[1];
      return targetUserId === context.user.id;
    }

    return false;
  },

  /**
   * Evaluates access to immutable platform audit logs
   */
  canReadAuditLogs(context: SecurityContext): boolean {
    return this.isAdmin(context);
  },

  /**
   * Audit logs are strictly immutable and cannot be updated or deleted by any actor
   */
  canMutateAuditLogs(): boolean {
    return false;
  },
};

