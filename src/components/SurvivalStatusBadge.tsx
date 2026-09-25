/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 23
 * Survival Status Badge Component
 * 
 * Displays clear visual badges for the 6 defined survival statuses:
 * - ALIVE (Emerald)
 * - STRESSED (Amber)
 * - DAMAGED (Orange)
 * - DEAD (Rose)
 * - UNKNOWN (Slate)
 * - NEEDS_REVIEW (Purple/Indigo with alert pulse)
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Droplets,
  AlertTriangle,
  Skull,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { SurvivalStatus, SurvivalVerificationSource } from "@/types/coreDatabase";
import { survivalStatusService } from "@/services/survivalStatusService";

export interface SurvivalStatusBadgeProps {
  status?: SurvivalStatus | string | null;
  verificationSource?: SurvivalVerificationSource | string | null;
  showSource?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SurvivalStatusBadge: React.FC<SurvivalStatusBadgeProps> = ({
  status,
  verificationSource,
  showSource = false,
  size = "md",
  className = "",
}) => {
  const normStatus = survivalStatusService.normalizeSurvivalStatus(status);

  const getSourceLabel = (src?: string | null) => {
    switch (src) {
      case "forester_audit":
        return "Forester Audited";
      case "field_observation":
        return "Field Verified";
      case "admin_override":
        return "Admin Verified";
      case "initial_planting":
        return "Registered at Planting";
      default:
        return "Verified";
    }
  };

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-semibold",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  switch (normStatus) {
    case "ALIVE":
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            className={`bg-emerald-600/20 text-emerald-400 border-emerald-500/30 font-semibold shadow-sm ${sizeClasses[size]} ${className}`}
          >
            <Heart className={iconSizes[size]} />
            <span>ALIVE</span>
          </Badge>
          {showSource && verificationSource && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              {getSourceLabel(verificationSource)}
            </span>
          )}
        </div>
      );

    case "STRESSED":
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            className={`bg-amber-600/20 text-amber-400 border-amber-500/30 font-semibold shadow-sm ${sizeClasses[size]} ${className}`}
          >
            <Droplets className={iconSizes[size]} />
            <span>STRESSED</span>
          </Badge>
          {showSource && verificationSource && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-amber-400" />
              {getSourceLabel(verificationSource)}
            </span>
          )}
        </div>
      );

    case "DAMAGED":
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            className={`bg-orange-600/20 text-orange-400 border-orange-500/30 font-semibold shadow-sm ${sizeClasses[size]} ${className}`}
          >
            <AlertTriangle className={iconSizes[size]} />
            <span>DAMAGED</span>
          </Badge>
          {showSource && verificationSource && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-orange-400" />
              {getSourceLabel(verificationSource)}
            </span>
          )}
        </div>
      );

    case "DEAD":
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            className={`bg-rose-600/20 text-rose-400 border-rose-500/30 font-semibold shadow-sm ${sizeClasses[size]} ${className}`}
          >
            <Skull className={iconSizes[size]} />
            <span>DEAD</span>
          </Badge>
          {showSource && verificationSource && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-rose-400" />
              {getSourceLabel(verificationSource)}
            </span>
          )}
        </div>
      );

    case "NEEDS_REVIEW":
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            className={`bg-purple-600/25 text-purple-300 border-purple-500/40 font-semibold shadow-sm ring-1 ring-purple-500/30 animate-pulse ${sizeClasses[size]} ${className}`}
          >
            <ShieldAlert className={iconSizes[size]} />
            <span>NEEDS REVIEW</span>
          </Badge>
          {showSource && (
            <span className="text-[10px] text-purple-300 font-mono">
              Pending Human Sign-off
            </span>
          )}
        </div>
      );

    case "UNKNOWN":
    default:
      return (
        <div className="inline-flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-muted-foreground border-border/80 font-medium ${sizeClasses[size]} ${className}`}
          >
            <HelpCircle className={iconSizes[size]} />
            <span>UNKNOWN</span>
          </Badge>
          {showSource && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Unsurveyed
            </span>
          )}
        </div>
      );
  }
};
