/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 37
 * React Hook for Unified Offline Queue & Background Sync Engine
 */

import { useState, useEffect, useCallback } from "react";
import {
  offlineSyncManager,
  SyncQueueItem,
  SyncEntityType,
  SyncSummary,
  StorageQuotaReport,
} from "@/services/offlineSyncManager";
import { toast } from "sonner";

export interface UseOfflineSyncReturn {
  queue: SyncQueueItem[];
  pendingCount: number;
  isSyncing: boolean;
  syncProgress: { current: number; total: number };
  lastSyncSummary: SyncSummary | null;
  storageQuota: StorageQuotaReport | null;
  enqueueTree: (tree: any) => SyncQueueItem;
  enqueueObservation: (observation: any) => SyncQueueItem;
  enqueueFieldReport: (report: any) => SyncQueueItem;
  syncAll: () => Promise<SyncSummary>;
  syncItem: (localId: string) => Promise<boolean>;
  removeItem: (localId: string) => void;
  clearQueue: () => void;
  refresh: () => void;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [queue, setQueue] = useState<SyncQueueItem[]>(() => offlineSyncManager.getQueue());
  const [pendingCount, setPendingCount] = useState<number>(() => offlineSyncManager.getTotalPendingCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuotaReport | null>(null);

  const refresh = useCallback(() => {
    setQueue(offlineSyncManager.getQueue());
    setPendingCount(offlineSyncManager.getTotalPendingCount());
    offlineSyncManager.getStorageQuotaReport().then(setStorageQuota);
  }, []);

  // Initialize and attach auto-sync listener
  useEffect(() => {
    refresh();

    const unsubscribe = offlineSyncManager.initAutoSyncListener((summary) => {
      setLastSyncSummary(summary);
      refresh();
      toast.success(`Auto-Synced ${summary.syncedCount} offline record(s) to cloud!`);
    });

    const interval = setInterval(refresh, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refresh]);

  // Enqueue Tree
  const enqueueTree = useCallback(
    (tree: any): SyncQueueItem => {
      const item = offlineSyncManager.enqueue({
        entityType: "tree",
        title: tree.tree_name || tree.species || "Planted Sapling",
        subtitle: `${tree.species} • ${tree.height_cm || 45}cm`,
        payload: tree,
        priority: 1,
      });
      refresh();
      toast.info(`Saved "${item.title}" to local offline queue`);
      return item;
    },
    [refresh]
  );

  // Enqueue Observation
  const enqueueObservation = useCallback(
    (obs: any): SyncQueueItem => {
      const item = offlineSyncManager.enqueue({
        entityType: "observation",
        title: `Health Audit: ${obs.tree_code || obs.tree_id || "Tree"}`,
        subtitle: `Status: ${obs.health_status || "healthy"} • ${obs.foliage_density_pct || 100}% foliage`,
        payload: obs,
        priority: 2,
      });
      refresh();
      toast.info(`Audit saved locally to offline queue`);
      return item;
    },
    [refresh]
  );

  // Enqueue Field Report
  const enqueueFieldReport = useCallback(
    (rep: any): SyncQueueItem => {
      const item = offlineSyncManager.enqueue({
        entityType: "field_report",
        title: `Spot Audit: ${rep.projectName || "Field Project"}`,
        subtitle: `Audited: ${rep.totalAudited} trees (${rep.livingCount} alive)`,
        payload: rep,
        priority: 3,
      });
      refresh();
      toast.info(`Field report queued for sync`);
      return item;
    },
    [refresh]
  );

  // Sync All
  const syncAll = useCallback(async (): Promise<SyncSummary> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Device is offline. Connect to internet to sync.");
      return {
        total: pendingCount,
        syncedCount: 0,
        failedCount: 0,
        syncedEntities: { tree: 0, observation: 0, field_report: 0, photo: 0 },
        errors: ["Offline"],
        executionTimeMs: 0,
      };
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: pendingCount });

    try {
      const summary = await offlineSyncManager.syncAll({
        onProgress: (current, total) => {
          setSyncProgress({ current, total });
        },
      });

      setLastSyncSummary(summary);
      refresh();

      if (summary.syncedCount > 0) {
        toast.success(
          `Successfully synced ${summary.syncedCount} record(s) to cloud! (${summary.syncedEntities.tree} trees, ${summary.syncedEntities.observation} audits)`
        );
      }
      if (summary.failedCount > 0) {
        toast.error(`${summary.failedCount} record(s) encountered sync errors. Will retry.`);
      }

      return summary;
    } finally {
      setIsSyncing(false);
    }
  }, [pendingCount, refresh]);

  // Sync Single Item
  const syncItem = useCallback(
    async (localId: string): Promise<boolean> => {
      setIsSyncing(true);
      try {
        const res = await offlineSyncManager.syncItem(localId);
        refresh();
        if (res.success) {
          toast.success("Item synced to cloud!");
          return true;
        } else {
          toast.error(res.error || "Failed to sync item.");
          return false;
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [refresh]
  );

  // Remove Item
  const removeItem = useCallback(
    (localId: string) => {
      offlineSyncManager.removeItem(localId);
      refresh();
      toast.success("Removed record from offline queue");
    },
    [refresh]
  );

  // Clear Queue
  const clearQueue = useCallback(() => {
    offlineSyncManager.clear();
    refresh();
    toast.info("Offline queue cleared");
  }, [refresh]);

  return {
    queue,
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncSummary,
    storageQuota,
    enqueueTree,
    enqueueObservation,
    enqueueFieldReport,
    syncAll,
    syncItem,
    removeItem,
    clearQueue,
    refresh,
  };
}
