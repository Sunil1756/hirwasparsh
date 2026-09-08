import React from "react";
import { ShieldCheck, Lock, AlertTriangle, ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  B2BRole,
  B2BPermission,
  hasPermission,
  ROLE_DEFINITIONS,
  isAuditExportEligible,
} from "@/lib/b2bAccessControl";

interface B2BRoleGateProps {
  currentRole?: B2BRole;
  requiredPermission?: B2BPermission;
  confidenceScore?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAuditLockNotice?: boolean;
}

export const B2BRoleGate: React.FC<B2BRoleGateProps> = ({
  currentRole = "ngo_admin",
  requiredPermission,
  confidenceScore = 75,
  children,
  fallback,
  showAuditLockNotice = false,
}) => {
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.ngo_admin;

  // Check permission
  if (requiredPermission && !hasPermission(currentRole, requiredPermission)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="rounded-xl border border-border/40 bg-card/60 p-5 text-center backdrop-blur-md">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <Lock className="h-6 w-6" />
        </div>
        <h4 className="text-base font-semibold text-foreground">Restricted Institutional Access</h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          This operation requires higher organizational credentials than your current role (
          <span className="font-semibold text-foreground">{roleDef.name}</span>).
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[11px]">
            Role: {roleDef.name}
          </Badge>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            Upgrade Tier <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Check audit eligibility if needed
  if (showAuditLockNotice && confidenceScore < 70) {
    const check = isAuditExportEligible(currentRole, confidenceScore);
    if (!check.eligible) {
      if (fallback) return <>{fallback}</>;

      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>MRV Verification Audit Gate Active</span>
          </div>
          <p className="mt-1.5 text-muted-foreground leading-relaxed">
            {check.reason}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
              Current: {confidenceScore}% (Unverified)
            </Badge>
            <span className="text-[11px] text-muted-foreground">Required: &ge;70%</span>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export const RoleBadge: React.FC<{ role: B2BRole }> = ({ role }) => {
  const def = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.ngo_admin;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${def.color}`}
    >
      <ShieldCheck className="h-3 w-3" />
      {def.name}
    </span>
  );
};
