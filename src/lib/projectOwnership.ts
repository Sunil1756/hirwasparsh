/**
 * Project Ownership & Access Control Module
 * Enforces strict project editing privacy:
 * - Public & authenticated users can VIEW project status, Sentinel-2 telemetry, and verification details.
 * - ONLY the project owner or a platform administrator can EDIT, update, delete, or upload ground evidence.
 */

export interface ProjectOwnershipContext {
  user: { id: string; email?: string | null } | null;
  isAdmin?: boolean;
  localProjectIds?: string[];
}

export interface ProjectSubject {
  id: string;
  user_id?: string | null;
  creator_id?: string | null;
  organization_name?: string | null;
  contact_email?: string | null;
}

/**
 * Checks if the current user is the owner of a project.
 * Supports:
 * 1. user.id === project.user_id
 * 2. localProjectIds.includes(project.id) (for guest/device-created projects before auth session sync)
 * 3. email match if available
 */
export function isProjectOwner(
  project: ProjectSubject | null | undefined,
  context: ProjectOwnershipContext
): boolean {
  if (!project) return false;
  if (context.user?.id && project.user_id && project.user_id === context.user.id) {
    return true;
  }
  if (context.user?.id && project.creator_id && project.creator_id === context.user.id) {
    return true;
  }
  if (context.localProjectIds && context.localProjectIds.includes(project.id)) {
    return true;
  }
  return false;
}

/**
 * Determines whether the current user has permission to edit, update, delete, or upload evidence to a project.
 * Only the project owner OR a platform administrator can edit.
 */
export function canEditProject(
  project: ProjectSubject | null | undefined,
  context: ProjectOwnershipContext
): boolean {
  if (!project) return false;
  if (context.isAdmin) return true;
  return isProjectOwner(project, context);
}

/**
 * Get display label and status for project access badge
 */
export function getProjectAccessBadge(
  project: ProjectSubject | null | undefined,
  context: ProjectOwnershipContext
): {
  isOwner: boolean;
  canEdit: boolean;
  label: string;
  badgeVariant: "default" | "secondary" | "outline";
  description: string;
} {
  const isOwner = isProjectOwner(project, context);
  const canEdit = canEditProject(project, context);

  if (isOwner) {
    return {
      isOwner: true,
      canEdit: true,
      label: "Your Project 🌿",
      badgeVariant: "default",
      description: "You are the verified owner with full management and editing rights.",
    };
  }

  if (context.isAdmin) {
    return {
      isOwner: false,
      canEdit: true,
      label: "Admin Access 🛡️",
      badgeVariant: "secondary",
      description: "Platform administrator with privileged oversight and moderation rights.",
    };
  }

  return {
    isOwner: false,
    canEdit: false,
    label: `Public Record (${project?.organization_name || "Community"})`,
    badgeVariant: "outline",
    description: "Public project monitoring and telemetry view (Read-Only).",
  };
}
