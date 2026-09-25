/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 38
 * React Hook for Sync Conflict Telemetry & Interactive Resolution
 */

import { useState, useEffect, useCallback } from "react";
import {
  syncConflictService,
  SyncConflict,
  ConflictAuditLogEntry,
  ConflictResolutionPlan,
  ConflictResolutionStrategy,
  SyncResolutionResult,
} from "@/services/syncConflictService";

export function useSyncConflicts() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>(() =>
    syncConflictService.getConflicts()
  );
  const [auditTrail, setAuditTrail] = useState<ConflictAuditLogEntry[]>(() =>
    syncConflictService.getAuditTrail()
  );
  const [isResolving, setIsResolving] = useState(false);

  const refresh = useCallback(() => {
    setConflicts(syncConflictService.getConflicts());
    setAuditTrail(syncConflictService.getAuditTrail());
  }, []);

  useEffect(() => {
    const unsubscribe = syncConflictService.subscribe(() => {
      refresh();
    });
    refresh();
    return () => unsubscribe();
  }, [refresh]);

  const pendingConflicts = conflicts.filter((c) => c.status === "pending");
  const resolvedConflicts = conflicts.filter((c) => c.status === "resolved");
  const pendingConflictCount = pendingConflicts.length;

  const resolveConflict = useCallback(
    async (
      conflictId: string,
      plan: ConflictResolutionPlan
    ): Promise<SyncResolutionResult> => {
      setIsResolving(true);
      try {
        const result = await syncConflictService.resolveConflict(conflictId, plan);
        refresh();
        return result;
      } finally {
        setIsResolving(false);
      }
    },
    [refresh]
  );

  const batchResolve = useCallback(
    async (
      conflictIds: string[],
      strategy: ConflictResolutionStrategy,
      resolvedBy?: string
    ): Promise<SyncResolutionResult[]> => {
      setIsResolving(true);
      try {
        const results = await syncConflictService.batchResolve(
          conflictIds,
          strategy,
          resolvedBy
        );
        refresh();
        return results;
      } finally {
        setIsResolving(false);
      }
    },
    [refresh]
  );

  const removeConflict = useCallback(
    (conflictId: string) => {
      syncConflictService.removeConflict(conflictId);
      refresh();
    },
    [refresh]
  );

  const clearConflicts = useCallback(() => {
    syncConflictService.clearConflicts();
    refresh();
  }, [refresh]);

  const clearAuditTrail = useCallback(() => {
    syncConflictService.clearAuditTrail();
    refresh();
  }, [refresh]);

  return {
    conflicts,
    pendingConflicts,
    resolvedConflicts,
    pendingConflictCount,
    auditTrail,
    isResolving,
    resolveConflict,
    batchResolve,
    removeConflict,
    clearConflicts,
    clearAuditTrail,
    refresh,
  };
}
