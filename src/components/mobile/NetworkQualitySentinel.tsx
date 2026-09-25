import React from "react";
import { Wifi, WifiOff, RefreshCw, Signal, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export interface NetworkQualitySentinelProps {
  onOpenDrawer: () => void;
  compact?: boolean;
  className?: string;
}

export const NetworkQualitySentinel: React.FC<NetworkQualitySentinelProps> = ({
  onOpenDrawer,
  compact = false,
  className = "",
}) => {
  const { qualityTier, effectiveType, rttMs, isPoorNetwork, lowBandwidthMode } = useNetworkQuality();
  const { pendingCount, isSyncing } = useOfflineSync();

  // 1. OFFLINE
  if (qualityTier === "offline") {
    return (
      <button
        onClick={onOpenDrawer}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer animate-pulse ${className}`}
        title="Device is Offline: Local changes saved to IndexedDB queue"
        data-testid="network-sentinel-offline"
      >
        <WifiOff className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        <span>Offline {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
      </button>
    );
  }

  // 2. POOR NETWORK / 2G / DATA SAVER
  if (isPoorNetwork || qualityTier === "poor") {
    return (
      <button
        onClick={onOpenDrawer}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer ${className}`}
        title={`Poor Cellular Network (${effectiveType.toUpperCase()} • ${rttMs}ms RTT): Data Saver active`}
        data-testid="network-sentinel-poor"
      >
        <Signal className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        {compact ? (
          <span>2G Saver</span>
        ) : (
          <span>2G/EDGE {lowBandwidthMode ? "Saver" : `(${rttMs}ms)`}</span>
        )}
        {pendingCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        )}
      </button>
    );
  }

  // 3. MODERATE 3G
  if (qualityTier === "moderate") {
    return (
      <button
        onClick={onOpenDrawer}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors cursor-pointer ${className}`}
        title="Moderate 3G Network Quality"
        data-testid="network-sentinel-moderate"
      >
        <Wifi className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        <span>3G Online {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
      </button>
    );
  }

  // 4. FAST 4G / WIFI (ONLINE)
  return (
    <button
      onClick={onOpenDrawer}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer ${className}`}
      title="High-Speed Online Connection (4G/WiFi)"
      data-testid="network-sentinel-online"
    >
      <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      {compact ? (
        <span>Online</span>
      ) : (
        <span>Online {pendingCount > 0 ? `(${pendingCount} queued)` : ""}</span>
      )}
      {isSyncing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600" />}
    </button>
  );
};
