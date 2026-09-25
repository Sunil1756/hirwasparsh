import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Camera, MapPin, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHardwarePermissions } from "@/hooks/useHardwarePermissions";

export interface HardwarePermissionSentinelProps {
  onOpenModal: () => void;
  compact?: boolean;
  className?: string;
}

export const HardwarePermissionSentinel: React.FC<HardwarePermissionSentinelProps> = ({
  onOpenModal,
  compact = false,
  className = "",
}) => {
  const { gpsStatus, cameraStatus, allGranted, anyDenied, isChecking } = useHardwarePermissions();

  if (isChecking) {
    return (
      <Badge
        variant="outline"
        className={`text-[10px] px-2 py-0.5 border-border bg-muted/40 text-muted-foreground flex items-center gap-1 font-mono ${className}`}
      >
        <Sparkles className="w-3 h-3 animate-spin text-primary" />
        Checking...
      </Badge>
    );
  }

  // 1. ALL GRANTED (EMERALD)
  if (allGranted) {
    return (
      <button
        onClick={onOpenModal}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer ${className}`}
        title="Hardware Sensors Ready: GPS & Camera active"
        data-testid="hardware-sentinel-granted"
      >
        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        {compact ? (
          <span>Sensors OK</span>
        ) : (
          <span className="flex items-center gap-1 font-mono">
            <span>GPS ✓</span>
            <span className="opacity-40">•</span>
            <span>Cam ✓</span>
          </span>
        )}
      </button>
    );
  }

  // 2. ANY DENIED (ROSE WARNING)
  if (anyDenied) {
    return (
      <button
        onClick={onOpenModal}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors animate-pulse cursor-pointer ${className}`}
        title="Sensors Blocked: Tap to view unblock instructions"
        data-testid="hardware-sentinel-denied"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>Sensors Blocked (Fix)</span>
      </button>
    );
  }

  // 3. PROMPT REQUIRED (AMBER NOTICE)
  return (
    <button
      onClick={onOpenModal}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 transition-colors cursor-pointer ${className}`}
      title="Permissions Required: Tap to grant GPS & Camera access"
      data-testid="hardware-sentinel-prompt"
    >
      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
      <span>Grant Sensors</span>
    </button>
  );
};
