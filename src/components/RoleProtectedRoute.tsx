import { ReactNode } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, RbacPermission, APP_ROLES } from "@/lib/rbacService";
import { Loader2, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
  requiredPermission?: RbacPermission;
  fallbackUrl?: string;
}

export const RoleProtectedRoute = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackUrl = "/login",
}: RoleProtectedRouteProps) => {
  const { user, loading, activeRole, can, switchSimulatedRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Verifying RBAC security session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const fullCurrentPath = `${location.pathname}${location.search}`;
    const redirectParam = encodeURIComponent(fullCurrentPath);
    return <Navigate to={`${fallbackUrl}?redirect=${redirectParam}`} replace />;
  }

  // Check role requirement if specified
  let hasRoleAccess = true;
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    hasRoleAccess = requiredRoles.includes(activeRole) || activeRole === "admin";
  }

  // Check permission requirement if specified
  let hasPermissionAccess = true;
  if (requiredPermission) {
    hasPermissionAccess = can(requiredPermission);
  }

  const isAuthorized = hasRoleAccess && hasPermissionAccess;

  if (!isAuthorized) {
    const activeRoleDef = APP_ROLES[activeRole];
    const targetRole = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;

    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center space-y-5 border border-destructive/30 shadow-2xl">
          <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-heading text-2xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-xs text-muted-foreground">
              Your active role does not possess the permissions required to view this dashboard.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/50 border text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Active Role:</span>
              <Badge className={activeRoleDef?.colorClass || ""}>
                {activeRoleDef?.displayName || activeRole}
              </Badge>
            </div>
            {requiredPermission && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Required Permission:</span>
                <code className="text-[10px] bg-background px-1.5 py-0.5 rounded border">
                  {requiredPermission}
                </code>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Link to={activeRoleDef?.dashboardRoute || "/dashboard"} className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to My Dashboard
              </Button>
            </Link>

            {targetRole && (
              <Button
                variant="default"
                size="sm"
                onClick={() => switchSimulatedRole(targetRole)}
                className="flex-1 rounded-xl text-xs gap-1.5 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Switch to {targetRole}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
