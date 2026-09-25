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
  ArrowRightLeft,
  Smartphone,
  Server,
  History,
  GitFork,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useSyncConflicts } from "@/hooks/useSyncConflicts";
import { SyncEntityType } from "@/services/offlineSyncManager";
import { SyncConflict, ConflictResolutionPlan } from "@/services/syncConflictService";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { ConflictAuditHistoryModal } from "./ConflictAuditHistoryModal";
import { toast } from "sonner";

export interface OfflineNetworkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "queue" | "conflicts" | "network" | "storage";
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

  const {
    pendingConflicts,
    pendingConflictCount,
    resolvedConflicts,
    resolveConflict,
    batchResolve,
    refresh: refreshConflicts,
  } = useSyncConflicts();

  const [activeTab, setActiveTab] = useState<"queue" | "conflicts" | "network" | "storage">(defaultTab);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<"all" | SyncEntityType>("all");
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ reachable: boolean; latencyMs: number } | null>(null);
  const [selectedConflictForModal, setSelectedConflictForModal] = useState<SyncConflict | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

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
    refreshConflicts();
    if (summary.conflictCount > 0) {
      toast.warning(`${summary.conflictCount} sync conflict(s) detected and staged for inspection.`);
      setActiveTab("conflicts");
    }
  };

  const handleBatchResolveAll = async (strategy: "smart_merge" | "local_wins" | "server_wins") => {
    const ids = pendingConflicts.map((c) => c.conflictId);
    if (ids.length === 0) return;
    await batchResolve(ids, strategy);
    toast.success(`Resolved ${ids.length} conflict(s) using ${strategy.replace(/_/g, " ")}`);
    refreshQueue();
  };

  return (
    <>
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
                    Zero-data-loss local queue & conflict-free resolution
                  </DialogDescription>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refreshNetwork();
                  refreshQueue();
                  refreshConflicts();
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
            <div className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={`py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 text-center ${
                  activeTab === "queue"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Queue</span>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 min-w-4 bg-primary/20 text-primary">
                    {pendingCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("conflicts")}
                className={`py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 text-center ${
                  activeTab === "conflicts"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Conflicts</span>
                {pendingConflictCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 min-w-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                    {pendingConflictCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("network")}
                className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                  activeTab === "network"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Network
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("storage")}
                className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                  activeTab === "storage"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Storage
              </button>
            </div>
          </div>

          {/* DRAWER BODY */}
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
            {/* 1. QUEUE TAB */}
            {activeTab === "queue" && (
              <div className="space-y-4">
                {/* FILTER CHIPS */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {(["all", "tree", "observation", "field_report"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSelectedEntityFilter(filter)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium capitalize whitespace-nowrap transition-all ${
                        selectedEntityFilter === filter
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
                      }`}
                    >
                      {filter === "all" ? "All Records" : filter.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* PROGRESS BAR */}
                {isSyncing && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-primary">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Syncing field data to cloud...
                      </span>
                      <span>{typeof syncProgress === "object" ? syncProgress.current : syncProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${typeof syncProgress === "object" ? (syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0) : syncProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* QUEUE LIST */}
                {filteredQueue.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <CheckCircle2 className="h-10 w-10 mx-auto opacity-30 text-emerald-500" />
                    <div className="text-sm font-semibold">Offline Queue Clean</div>
                    <p className="text-xs max-w-xs mx-auto">
                      All field records and observations are fully synchronized with the cloud backend.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredQueue.map((item) => (
                      <div
                        key={item.localId}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          item.syncStatus === "conflict"
                            ? "bg-amber-500/10 border-amber-500/30"
                            : item.syncStatus === "failed"
                            ? "bg-destructive/10 border-destructive/30"
                            : "bg-muted/30 border-border/70"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0">
                              {item.entityType}
                            </Badge>
                            {item.syncStatus === "conflict" && (
                              <Badge className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0">
                                Conflict
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.syncStatus === "conflict" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const c = pendingConflicts.find((x) => x.localId === item.localId);
                                if (c) setSelectedConflictForModal(c);
                                else setActiveTab("conflicts");
                              }}
                              className="h-7 text-[11px] px-2.5 rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300"
                            >
                              Resolve
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSyncing}
                              onClick={() => syncItem(item.localId)}
                              className="h-7 text-[11px] px-2 rounded-lg"
                            >
                              Sync
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.localId)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. CONFLICTS TAB */}
            {activeTab === "conflicts" && (
              <div className="space-y-4">
                {/* BULK RESOLUTION HEADER */}
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold font-heading text-foreground">
                    Pending Conflicts ({pendingConflictCount})
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAuditModalOpen(true)}
                    className="text-xs text-primary hover:text-primary/80 h-7 px-2 flex items-center gap-1"
                  >
                    <History className="h-3.5 w-3.5" />
                    Audit Trail
                  </Button>
                </div>

                {pendingConflicts.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                      Batch Resolve All Conflicts:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchResolveAll("smart_merge")}
                        className="h-7 text-[10px] rounded-lg bg-background/80 hover:bg-muted"
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-primary" />
                        Smart Merge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchResolveAll("local_wins")}
                        className="h-7 text-[10px] rounded-lg bg-background/80 hover:bg-muted text-amber-600"
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Keep Local
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchResolveAll("server_wins")}
                        className="h-7 text-[10px] rounded-lg bg-background/80 hover:bg-muted text-emerald-600"
                      >
                        <Server className="h-3 w-3 mr-1" />
                        Keep Server
                      </Button>
                    </div>
                  </div>
                )}

                {/* CONFLICTS LIST */}
                {pendingConflicts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <ShieldCheck className="h-10 w-10 mx-auto opacity-30 text-emerald-500" />
                    <div className="text-sm font-semibold">No Pending Conflicts</div>
                    <p className="text-xs max-w-xs mx-auto">
                      All local field submissions match cloud records or have been cleanly merged.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingConflicts.map((conflict) => (
                      <div
                        key={conflict.conflictId}
                        className="p-3.5 bg-card border border-amber-500/30 rounded-2xl space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground font-heading">
                              {conflict.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 border-amber-500/20">
                              {conflict.entityType}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="text-[10px] bg-red-500/15 text-red-600">
                            {conflict.diffs.length} diff(s)
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground">{conflict.subtitle}</div>

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(conflict.detectedAt).toLocaleTimeString()}
                          </span>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setSelectedConflictForModal(conflict)}
                            className="h-7 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span>Inspect & Resolve</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. NETWORK TAB */}
            {activeTab === "network" && (
              <div className="space-y-4" data-testid="network-tab-view">
                <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Cloud Connectivity</span>
                    <Badge
                      variant="outline"
                      className={
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-background rounded-xl border border-border/60">
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Network Tier</div>
                      <div className="font-semibold text-foreground capitalize mt-0.5">
                        {qualityTier.replace(/_/g, " ")}
                      </div>
                    </div>

                    <div className="p-2.5 bg-background rounded-xl border border-border/60">
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Roundtrip Latency</div>
                      <div className="font-semibold text-foreground mt-0.5">{rttMs} ms</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Low Bandwidth / Data Saver Mode</div>
                      <div className="text-[10px] text-muted-foreground">Aggressive compression for 2G/EDGE</div>
                    </div>
                    <Switch
                      data-testid="low-bandwidth-toggle"
                      checked={lowBandwidthMode}
                      onCheckedChange={(val) => setLowBandwidthMode(val)}
                    />
                  </div>
                </div>

                {/* PROBE BUTTON */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProbing}
                  onClick={handleProbe}
                  className="w-full rounded-2xl h-10 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Activity className={`h-4 w-4 ${isProbing ? "animate-spin text-primary" : ""}`} />
                  <span>{isProbing ? "Probing Cloud Endpoint..." : "Test Cloud Reachability Ping"}</span>
                </Button>
              </div>
            )}

            {/* 4. STORAGE TAB */}
            {activeTab === "storage" && (
              <div className="space-y-4" data-testid="storage-tab-view">
                <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">IndexedDB Offline Storage</span>
                    <Badge variant="outline" className="text-[10px]">
                      {storageQuota?.isPersisted ? "Persistent" : "Standard"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Used: {storageQuota?.usageFormatted || "0 B"}</span>
                      <span>Quota: {storageQuota?.quotaFormatted || "Unlimited"}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.max(storageQuota?.percentUsed || 0, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    clearQueue();
                    toast.info("Offline queue cleared.");
                  }}
                  className="w-full rounded-2xl h-10 text-xs font-semibold"
                >
                  Clear Local Offline Queue
                </Button>
              </div>
            )}
          </div>

          {/* BOTTOM SYNC ACTION BAR */}
          <div className="p-4 bg-muted/40 border-t border-border/70 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{pendingCount}</span> uncommitted items &bull;{" "}
              <span className="font-semibold text-foreground">{pendingConflictCount}</span> conflicts
            </div>

            <Button
              type="button"
              disabled={isSyncing || pendingCount === 0}
              onClick={handleSyncAllClick}
              className="rounded-2xl h-10 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2"
            >
              <CloudUpload className={`h-4 w-4 ${isSyncing ? "animate-bounce" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync All Records"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SIDE-BY-SIDE CONFLICT RESOLUTION MODAL */}
      <ConflictResolutionModal
        isOpen={Boolean(selectedConflictForModal)}
        conflict={selectedConflictForModal}
        onClose={() => setSelectedConflictForModal(null)}
        onResolve={async (cid, plan) => {
          await resolveConflict(cid, plan);
          refreshQueue();
        }}
      />

      {/* AUDIT TRAIL MODAL */}
      <ConflictAuditHistoryModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </>
  );
};
