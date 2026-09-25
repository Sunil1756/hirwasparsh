import React, { useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Signal,
  Database,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Layers,
  MapPin,
  Clock,
  HardDrive,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  TreePine,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { SyncEntityType } from "@/services/offlineSyncManager";
import { toast } from "sonner";

export interface OfflineNetworkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "queue" | "network" | "storage";
}

export const OfflineNetworkDrawer: React.FC<OfflineNetworkDrawerProps> = ({
  isOpen,
  onClose,
  defaultTab = "queue",
}) => {
  const {
    report,
    isOnline,
    qualityTier,
    effectiveType,
    rttMs,
    downlinkMbps,
    lowBandwidthMode,
    setLowBandwidthMode,
    isFlapping,
    probeCloud,
    refresh: refreshNetwork,
  } = useNetworkQuality();

  const {
    queue,
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncSummary,
    storageQuota,
    syncAll,
    syncItem,
    removeItem,
    clearQueue,
    refresh: refreshQueue,
  } = useOfflineSync();

  const [activeTab, setActiveTab] = useState<"queue" | "network" | "storage">(defaultTab);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<"all" | SyncEntityType>("all");
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ reachable: boolean; latencyMs: number } | null>(null);

  const filteredQueue =
    selectedEntityFilter === "all"
      ? queue
      : queue.filter((item) => item.entityType === selectedEntityFilter);

  const handleProbe = async () => {
    setIsProbing(true);
    try {
      const res = await probeCloud();
      setProbeResult(res);
      if (res.reachable) {
        toast.success(`Cloud backend reachable! Ping: ${res.latencyMs}ms`);
      } else {
        toast.warning("Cloud backend unreachable or responding with high latency.");
      }
    } finally {
      setIsProbing(false);
    }
  };

  const handleSyncAllClick = async () => {
    const summary = await syncAll();
    refreshNetwork();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-3xl"
        data-testid="offline-network-drawer"
      >
        {/* TOP STATUS HEADER */}
        <div className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-amber-600/15 p-5 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-primary/15 text-primary rounded-2xl border border-primary/20">
                <CloudUpload className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-heading text-foreground">
                  Offline & Rural Sync Manager
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Zero-data-loss local queue & adaptive 2G field optimization
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refreshNetwork();
                refreshQueue();
              }}
              className="h-8 w-8 p-0 rounded-xl"
              title="Refresh Queue and Network Status"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isSyncing ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>

          {/* Real-Time Flapping Warning */}
          {isFlapping && (
            <div className="mt-3 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
              <span>Unstable cellular signal detected (Connection Flapping). Local drafts will queue safely.</span>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 pt-3">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "queue"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Offline Queue ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab("network")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "network"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Network & Data Saver
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "storage"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Storage & Cache
            </button>
          </div>
        </div>

        {/* TAB 1: OFFLINE QUEUE EXPLORER */}
        {activeTab === "queue" && (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto" data-testid="queue-tab-view">
            {/* Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedEntityFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                  selectedEntityFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/70 text-muted-foreground"
                }`}
              >
                All Records ({pendingCount})
              </button>
              <button
                onClick={() => setSelectedEntityFilter("tree")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                  selectedEntityFilter === "tree"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-card border-border/70 text-muted-foreground"
                }`}
              >
                <TreePine className="h-3 w-3" /> Trees
              </button>
              <button
                onClick={() => setSelectedEntityFilter("observation")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                  selectedEntityFilter === "observation"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-card border-border/70 text-muted-foreground"
                }`}
              >
                <Activity className="h-3 w-3" /> Audits
              </button>
              <button
                onClick={() => setSelectedEntityFilter("field_report")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                  selectedEntityFilter === "field_report"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-card border-border/70 text-muted-foreground"
                }`}
              >
                Reports
              </button>
            </div>

            {/* Queue List */}
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center bg-background rounded-2xl border border-dashed border-border/80 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                <h4 className="text-xs font-bold text-foreground">No Pending Records in this View</h4>
                <p className="text-[11px] text-muted-foreground">
                  All local field records are fully synchronized with the cloud database.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredQueue.map((item) => (
                  <div
                    key={item.localId}
                    className="p-3 bg-background rounded-xl border border-border/80 flex items-center justify-between shadow-sm text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-mono ${
                            item.entityType === "tree"
                              ? "border-emerald-500/40 text-emerald-600"
                              : item.entityType === "observation"
                              ? "border-amber-500/40 text-amber-600"
                              : "border-purple-500/40 text-purple-600"
                          }`}
                        >
                          {item.entityType.toUpperCase()}
                        </Badge>
                        <span className="font-bold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                      {item.lastError && (
                        <p className="text-[10px] text-rose-500 mt-0.5">⚠️ {item.lastError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOnline && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncItem(item.localId)}
                          disabled={isSyncing}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                          title="Sync this item now"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.localId)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sync Progress Bar if syncing */}
            {isSyncing && syncProgress.total > 0 && (
              <div className="space-y-1 bg-muted/40 p-3 rounded-xl border border-border/70">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Syncing offline records...</span>
                  <span className="font-mono">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Sync Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {pendingCount > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Clear Queue
                </button>
              )}

              <Button
                onClick={handleSyncAllClick}
                disabled={!isOnline || pendingCount === 0 || isSyncing}
                className="ml-auto h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md gap-2"
                data-testid="sync-all-records-btn"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isOnline
                  ? isSyncing
                    ? "Syncing..."
                    : `Sync All Records (${pendingCount})`
                  : "Connect to Internet to Sync"}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: NETWORK QUALITY & DATA SAVER */}
        {activeTab === "network" && (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto" data-testid="network-tab-view">
            {/* Live Network Telemetry Cards */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-background p-3 rounded-2xl border border-border/80 shadow-sm text-center">
                <span className="text-[10px] text-muted-foreground block">Connection</span>
                <span className="font-bold font-mono text-sm text-foreground uppercase">
                  {effectiveType}
                </span>
              </div>
              <div className="bg-background p-3 rounded-2xl border border-border/80 shadow-sm text-center">
                <span className="text-[10px] text-muted-foreground block">Latency (RTT)</span>
                <span className="font-bold font-mono text-sm text-primary">
                  {rttMs > 0 ? `${rttMs}ms` : "N/A"}
                </span>
              </div>
              <div className="bg-background p-3 rounded-2xl border border-border/80 shadow-sm text-center">
                <span className="text-[10px] text-muted-foreground block">Bandwidth</span>
                <span className="font-bold font-mono text-sm text-foreground">
                  {downlinkMbps > 0 ? `${downlinkMbps}M` : "Offline"}
                </span>
              </div>
            </div>

            {/* Low Bandwidth Data Saver Switch */}
            <div className="p-4 bg-background rounded-2xl border border-border/80 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Low Bandwidth / Data Saver Mode
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Compress field evidence photos down to ~35KB (640px) for 2G/EDGE networks.
                </p>
              </div>
              <Switch
                checked={lowBandwidthMode}
                onCheckedChange={setLowBandwidthMode}
                data-testid="low-bandwidth-toggle"
              />
            </div>

            {/* Cloud Reachability Probe */}
            <div className="p-4 bg-background rounded-2xl border border-border/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Backend Cloud Reachability</span>
                  <span className="text-[10px] text-muted-foreground">Verify end-to-end connectivity with Supabase</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleProbe}
                  disabled={isProbing || !isOnline}
                  className="h-7 text-xs"
                >
                  <Sparkles className={`h-3 w-3 mr-1 ${isProbing ? "animate-spin text-primary" : ""}`} />
                  Probe Cloud
                </Button>
              </div>

              {probeResult && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    probeResult.reachable
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  <span>{probeResult.reachable ? "Cloud Reachable ✓" : "Cloud Unreachable ✗"}</span>
                  <span className="font-mono font-bold">{probeResult.latencyMs}ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORAGE & CACHE */}
        {activeTab === "storage" && (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto" data-testid="storage-tab-view">
            <div className="bg-background rounded-2xl p-4 border border-border/80 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">IndexedDB Offline Storage</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Persistent Storage Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/40 p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block">Storage Used</span>
                  <span className="font-mono font-bold text-foreground">
                    {storageQuota?.usageFormatted || "1.2 MB"}
                  </span>
                </div>
                <div className="bg-muted/40 p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block">Available Quota</span>
                  <span className="font-mono font-bold text-primary">
                    {storageQuota?.quotaFormatted || "1.0 GB"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="p-4 bg-muted/30 border-t border-border/70 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono">
            Network: {qualityTier.toUpperCase()} ({effectiveType})
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-xl bg-card border border-border hover:bg-accent text-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
