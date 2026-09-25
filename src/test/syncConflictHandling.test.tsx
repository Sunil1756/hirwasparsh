/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 38
 * Automated Test Suite: Sync & Conflict Handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import {
  syncConflictService,
  SyncConflict,
  ConflictFieldDiff,
} from "@/services/syncConflictService";
import { offlineSyncManager } from "@/services/offlineSyncManager";
import { useSyncConflicts } from "@/hooks/useSyncConflicts";
import { ConflictResolutionModal } from "@/components/mobile/ConflictResolutionModal";
import { ConflictAuditHistoryModal } from "@/components/mobile/ConflictAuditHistoryModal";
import { OfflineNetworkDrawer } from "@/components/mobile/OfflineNetworkDrawer";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";

describe("PHASE 7 TASK 38 — Sync & Conflict Handling Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    syncConflictService.clearConflicts();
    syncConflictService.clearAuditTrail();
    offlineSyncManager.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. CONFLICT DETECTION & DIFF ENGINE
  // ==========================================
  describe("1. Conflict Detection & Diff Engine", () => {
    it("detects divergent attributes between local item and server state", () => {
      const local = {
        tree_name: "GE-2026-000101",
        species: "Ficus benghalensis",
        height_cm: 72,
        health_status: "stressed",
        notes: "Severe dry spell",
      };

      const server = {
        id: "tree-master-101",
        tree_name: "GE-2026-000101",
        species: "Ficus religiosa",
        height_cm: 65,
        health_status: "healthy",
        admin_status: "approved",
      };

      const result = syncConflictService.detectConflict(local, server, "tree");
      expect(result.hasConflict).toBe(true);
      expect(result.diffs.length).toBeGreaterThan(0);

      const speciesDiff = result.diffs.find((d) => d.field === "species");
      expect(speciesDiff).toBeDefined();
      expect(speciesDiff?.localValue).toBe("Ficus benghalensis");
      expect(speciesDiff?.serverValue).toBe("Ficus religiosa");
      expect(speciesDiff?.isConflicting).toBe(true);

      const adminDiff = result.diffs.find((d) => d.field === "admin_status");
      expect(adminDiff).toBeDefined();
      expect(adminDiff?.isConflicting).toBe(false);
    });

    it("registers and retrieves conflicts with persistence", () => {
      expect(syncConflictService.getPendingCount()).toBe(0);

      const registered = syncConflictService.registerConflict({
        localId: "local-tree-001",
        entityType: "tree",
        entityId: "tree-101",
        title: "Tree #101 Conflict",
        subtitle: "Species mismatch",
        localItem: { species: "Banyan" },
        serverItem: { species: "Peepal" },
      });

      expect(registered.conflictId).toContain("conf-tree");
      expect(syncConflictService.getPendingCount()).toBe(1);

      const retrieved = syncConflictService.getConflicts({ status: "pending" });
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].title).toBe("Tree #101 Conflict");
    });
  });

  // ==========================================
  // 2. CONFLICT RESOLUTION STRATEGIES
  // ==========================================
  describe("2. Conflict Resolution Strategies", () => {
    it("executes smart field-level auto-merging preserving non-overlapping attributes", () => {
      const conflict = syncConflictService.registerConflict({
        localId: "local-tree-smart",
        entityType: "tree",
        entityId: "tree-101",
        title: "Smart Merge Tree",
        subtitle: "Non-overlapping diffs",
        localItem: {
          height_cm: 80,
          notes: "Monsoon growth spurt",
          photo_url: "https://photos.test/tree1.jpg",
          threat_tags: ["locust_swarms"],
        },
        serverItem: {
          id: "tree-101",
          admin_status: "approved",
          verification_status: "verified",
          threat_tags: ["drought_warning"],
        },
      });

      const { resolvedPayload } = syncConflictService.autoResolveSmartMerge(conflict);

      expect(resolvedPayload.height_cm).toBe(80);
      expect(resolvedPayload.photo_url).toBe("https://photos.test/tree1.jpg");
      expect(resolvedPayload.admin_status).toBe("approved");
      expect(resolvedPayload.verification_status).toBe("verified");
      expect(resolvedPayload.threat_tags).toContain("locust_swarms");
      expect(resolvedPayload.threat_tags).toContain("drought_warning");
    });

    it("resolves conflict with local_wins strategy and generates audit trail", async () => {
      const conflict = syncConflictService.registerConflict({
        localId: "local-tree-lw",
        entityType: "tree",
        entityId: "tree-102",
        title: "Local Wins Test",
        subtitle: "Height conflict",
        localItem: { height_cm: 90, health_status: "healthy" },
        serverItem: { height_cm: 70, health_status: "dead" },
      });

      const res = await syncConflictService.resolveConflict(conflict.conflictId, {
        strategy: "local_wins",
        resolvedBy: "Ranger Amit",
        rationale: "Ground inspection confirmed sapling is thriving.",
      });

      expect(res.success).toBe(true);
      expect(res.resolvedPayload.height_cm).toBe(90);
      expect(res.resolvedPayload.health_status).toBe("healthy");

      const auditTrail = syncConflictService.getAuditTrail();
      expect(auditTrail.length).toBe(1);
      expect(auditTrail[0].resolvedBy).toBe("Ranger Amit");
      expect(auditTrail[0].resolutionStrategy).toBe("local_wins");
      expect(auditTrail[0].rationale).toContain("Ground inspection confirmed");
    });

    it("resolves conflict with server_wins strategy", async () => {
      const conflict = syncConflictService.registerConflict({
        localId: "local-tree-sw",
        entityType: "tree",
        entityId: "tree-103",
        title: "Server Wins Test",
        subtitle: "Condition divergence",
        localItem: { health_status: "stressed" },
        serverItem: { health_status: "healthy", admin_status: "approved" },
      });

      const res = await syncConflictService.resolveConflict(conflict.conflictId, {
        strategy: "server_wins",
        resolvedBy: "Supervisor HQ",
      });

      expect(res.success).toBe(true);
      expect(res.resolvedPayload.health_status).toBe("healthy");
      expect(res.resolvedPayload.admin_status).toBe("approved");
    });

    it("forks duplicate entity with unique suffix identifier (fork_new)", async () => {
      const conflict = syncConflictService.registerConflict({
        localId: "local-tree-fork",
        entityType: "tree",
        entityId: "GE-2026-000104",
        title: "Tag Collision",
        subtitle: "Same tag on two saplings",
        localItem: { tree_name: "GE-2026-000104", species: "Azadirachta indica" },
        serverItem: { tree_name: "GE-2026-000104", species: "Tectona grandis" },
      });

      const res = await syncConflictService.resolveConflict(conflict.conflictId, {
        strategy: "fork_new",
        resolvedBy: "Planter Rohan",
      });

      expect(res.success).toBe(true);
      expect(res.resolvedPayload.tree_name).toMatch(/GE-2026-000104-FORK/);
      expect(res.resolvedPayload.species).toBe("Azadirachta indica");
    });

    it("resolves conflict with custom_merge strategy", async () => {
      const conflict = syncConflictService.registerConflict({
        localId: "local-tree-custom",
        entityType: "tree",
        entityId: "tree-105",
        title: "Custom Selection Test",
        subtitle: "Multi-field selection",
        localItem: { height_cm: 110, species: "Mangifera indica" },
        serverItem: { height_cm: 100, species: "Azadirachta indica" },
      });

      const customDiffs: ConflictFieldDiff[] = [
        {
          field: "height_cm",
          label: "Height",
          localValue: 110,
          serverValue: 100,
          isConflicting: true,
          chosenValue: 110,
          chosenSource: "local",
        },
        {
          field: "species",
          label: "Species",
          localValue: "Mangifera indica",
          serverValue: "Azadirachta indica",
          isConflicting: true,
          chosenValue: "Azadirachta indica",
          chosenSource: "server",
        },
      ];

      const res = await syncConflictService.resolveConflict(conflict.conflictId, {
        strategy: "custom_merge",
        customDiffs,
      });

      expect(res.success).toBe(true);
      expect(res.resolvedPayload.height_cm).toBe(110);
      expect(res.resolvedPayload.species).toBe("Azadirachta indica");
    });

    it("batch resolves multiple conflicts in a single pass", async () => {
      const c1 = syncConflictService.registerConflict({
        localId: "batch-1",
        entityType: "tree",
        title: "C1",
        subtitle: "Sub 1",
        localItem: { height: 50 },
        serverItem: { height: 40 },
      });

      const c2 = syncConflictService.registerConflict({
        localId: "batch-2",
        entityType: "observation",
        title: "C2",
        subtitle: "Sub 2",
        localItem: { health: "dead" },
        serverItem: { health: "alive" },
      });

      expect(syncConflictService.getPendingCount()).toBe(2);

      const results = await syncConflictService.batchResolve(
        [c1.conflictId, c2.conflictId],
        "smart_merge",
        "Batch Supervisor"
      );

      expect(results.length).toBe(2);
      expect(syncConflictService.getPendingCount()).toBe(0);
    });

    it("offlineSyncManager integrates conflict resolution in queue items", async () => {
      const queueItem = offlineSyncManager.enqueue({
        entityType: "tree",
        title: "Test Conflict Sapling",
        subtitle: "Sector 1",
        payload: { tree_name: "GE-2026-000999", height_cm: 50 },
      });

      // Register conflict for this item
      const conflict = syncConflictService.registerConflict({
        localId: queueItem.localId,
        entityType: "tree",
        entityId: "GE-2026-000999",
        title: queueItem.title,
        subtitle: queueItem.subtitle,
        localItem: { tree_name: "GE-2026-000999", height_cm: 50 },
        serverItem: { tree_name: "GE-2026-000999", height_cm: 40 },
      });

      const queue = offlineSyncManager.getQueue();
      const target = queue.find((i) => i.localId === queueItem.localId);
      if (target) {
        target.syncStatus = "conflict";
        target.conflictId = conflict.conflictId;
        offlineSyncManager.persistQueue(queue);
      }

      expect(offlineSyncManager.getQueue({ status: "conflict" }).length).toBe(1);

      // Mock syncItem on offlineSyncManager to simulate successful sync upon resolution
      vi.spyOn(offlineSyncManager, "syncItem").mockImplementation(async (localId: string) => {
        offlineSyncManager.removeItem(localId);
        return { success: true };
      });

      // Resolve and sync item
      const resolveRes = await offlineSyncManager.resolveAndSyncItem(queueItem.localId, {
        strategy: "smart_merge",
      });

      expect(resolveRes.success).toBe(true);
      expect(offlineSyncManager.getQueue().length).toBe(0);
      expect(syncConflictService.getPendingCount()).toBe(0);
    });
  });

  // ==========================================
  // 3. REACT HOOK: useSyncConflicts
  // ==========================================
  describe("3. useSyncConflicts Hook", () => {
    it("tracks pending conflicts and updates reactively upon resolution", async () => {
      const { result } = renderHook(() => useSyncConflicts());

      expect(result.current.pendingConflictCount).toBe(0);

      act(() => {
        syncConflictService.registerConflict({
          localId: "hook-tree-1",
          entityType: "tree",
          title: "Hook Tree",
          subtitle: "Hook sub",
          localItem: { val: 10 },
          serverItem: { val: 20 },
        });
      });

      expect(result.current.pendingConflictCount).toBe(1);
      expect(result.current.pendingConflicts[0].title).toBe("Hook Tree");

      await act(async () => {
        await result.current.resolveConflict(result.current.pendingConflicts[0].conflictId, {
          strategy: "local_wins",
        });
      });

      expect(result.current.pendingConflictCount).toBe(0);
      expect(result.current.auditTrail.length).toBe(1);
    });
  });

  // ==========================================
  // 4. UI COMPONENTS: ConflictResolutionModal & AuditModal
  // ==========================================
  describe("4. Conflict UI Components", () => {
    it("renders ConflictResolutionModal and executes resolution callback", async () => {
      const conflict: SyncConflict = {
        conflictId: "c-modal-test",
        localId: "loc-test-1",
        entityType: "tree",
        title: "Mahogany #204",
        subtitle: "Height & Health",
        detectedAt: new Date().toISOString(),
        status: "pending",
        localItem: { height_cm: 95 },
        serverItem: { height_cm: 80 },
        diffs: [
          {
            field: "height_cm",
            label: "Height (cm)",
            localValue: 95,
            serverValue: 80,
            isConflicting: true,
            chosenValue: 95,
            chosenSource: "local",
          },
        ],
      };

      const handleResolve = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={handleClose}
          conflict={conflict}
          onResolve={handleResolve}
        />
      );

      expect(screen.getByTestId("conflict-resolution-modal")).toBeInTheDocument();
      expect(screen.getByText("Conflict Resolution Inspector")).toBeInTheDocument();
      expect(screen.getByText(/Mahogany #204/)).toBeInTheDocument();

      const smartMergeBtn = screen.getByRole("button", { name: /smart merge/i });
      fireEvent.click(smartMergeBtn);

      await waitFor(() => {
        expect(handleResolve).toHaveBeenCalledWith(
          "c-modal-test",
          expect.objectContaining({ strategy: "smart_merge" })
        );
      });
    });

    it("renders ConflictAuditHistoryModal with historical logs", () => {
      syncConflictService.persistAuditTrail([
        {
          id: "audit-entry-1",
          conflictId: "c-hist-1",
          entityType: "tree",
          entityId: "GE-2026-000888",
          resolutionStrategy: "smart_merge",
          resolvedBy: "Ranger Vikram",
          resolvedAt: new Date().toISOString(),
          diffSummary: {
            height_cm: { fromLocal: 100, fromServer: 80, chosen: 100, source: "local" },
          },
          rationale: "Ground laser hypsometer measurement confirmed.",
        },
      ]);

      render(<ConflictAuditHistoryModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByTestId("conflict-audit-history-modal")).toBeInTheDocument();
      expect(screen.getByText("GE-2026-000888")).toBeInTheDocument();
      expect(screen.getByText("Ranger Vikram")).toBeInTheDocument();
      expect(screen.getByText(/Ground laser hypsometer/)).toBeInTheDocument();
    });

    it("renders Conflicts tab in OfflineNetworkDrawer with badge and inspect action", () => {
      syncConflictService.registerConflict({
        localId: "drawer-test-1",
        entityType: "tree",
        title: "Neem Sapling #77",
        subtitle: "Height divergence",
        localItem: { height_cm: 60 },
        serverItem: { height_cm: 45 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <OfflineNetworkDrawer isOpen={true} onClose={() => {}} defaultTab="conflicts" />
        </QueryClientProvider>
      );

      expect(screen.getByTestId("offline-network-drawer")).toBeInTheDocument();
      expect(screen.getByText("Neem Sapling #77")).toBeInTheDocument();
      expect(screen.getByText(/Height divergence/)).toBeInTheDocument();

      const inspectBtn = screen.getByRole("button", { name: /inspect & resolve/i });
      expect(inspectBtn).toBeInTheDocument();
    });

    it("renders sync conflict banner in MobileFieldInterface when conflicts exist", () => {
      syncConflictService.registerConflict({
        localId: "banner-test-1",
        entityType: "tree",
        title: "Banner Test Tree",
        subtitle: "Sub",
        localItem: { height_cm: 50 },
        serverItem: { height_cm: 40 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MobileFieldInterface
              currentLocation={{ latitude: 18.5204, longitude: 73.8567, accuracy: 4 }}
            />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("sync-conflict-banner")).toBeInTheDocument();
      expect(screen.getByText(/1 Sync Conflict Staged/i)).toBeInTheDocument();
    });
  });
});
