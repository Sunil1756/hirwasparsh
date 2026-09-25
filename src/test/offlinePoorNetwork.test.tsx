import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  networkQualityService,
  NetworkQualityTier,
} from "@/services/networkQualityService";
import {
  offlineSyncManager,
  SyncEntityType,
} from "@/services/offlineSyncManager";
import { NetworkQualitySentinel } from "@/components/mobile/NetworkQualitySentinel";
import { OfflineNetworkDrawer } from "@/components/mobile/OfflineNetworkDrawer";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import { FastTreeRegistrationConsole } from "@/components/mobile/FastTreeRegistrationConsole";
import { FastObservationConsole } from "@/components/mobile/FastObservationConsole";

describe("PHASE 7 TASK 37 — Offline & Poor-Network Strategy Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    networkQualityService.setLowBandwidthMode(false);
    offlineSyncManager.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. NETWORK QUALITY SERVICE TESTS
  // ==========================================
  describe("1. Network Quality Service & Adaptive Payload Compression", () => {
    it("correctly classifies network quality tiers based on telemetry", () => {
      // Fast 4G / WiFi
      expect(networkQualityService.classifyQualityTier(true, "4g", 80, 15.0)).toBe("fast");

      // Moderate 3G
      expect(networkQualityService.classifyQualityTier(true, "3g", 450, 1.2)).toBe("moderate");

      // Poor 2G / Slow connection
      expect(networkQualityService.classifyQualityTier(true, "2g", 950, 0.2)).toBe("poor");
      expect(networkQualityService.classifyQualityTier(true, "4g", 1200, 10.0)).toBe("poor"); // High RTT
      expect(networkQualityService.classifyQualityTier(true, "4g", 50, 15.0, true)).toBe("poor"); // Data saver override

      // Offline
      expect(networkQualityService.classifyQualityTier(false, "offline", 0, 0)).toBe("offline");
    });

    it("returns adaptive compression parameters tailored to network conditions", () => {
      const fastConfig = networkQualityService.getAdaptiveCompressionConfig("fast");
      expect(fastConfig.maxDimensionPx).toBe(1440);
      expect(fastConfig.qualityFactor).toBe(0.85);
      expect(fastConfig.allowPhotoUploadNow).toBe(true);

      const poorConfig = networkQualityService.getAdaptiveCompressionConfig("poor");
      expect(poorConfig.maxDimensionPx).toBe(640);
      expect(poorConfig.qualityFactor).toBe(0.55);
      expect(poorConfig.allowPhotoUploadNow).toBe(false); // Defer photo upload to Wi-Fi

      const offlineConfig = networkQualityService.getAdaptiveCompressionConfig("offline");
      expect(offlineConfig.description).toContain("Offline");
    });

    it("detects rapid connection flapping", () => {
      expect(networkQualityService.checkIsFlapping()).toBe(false);

      // Simulate rapid flapping transitions
      networkQualityService.recordTransition();
      networkQualityService.recordTransition();
      networkQualityService.recordTransition();
      networkQualityService.recordTransition();

      expect(networkQualityService.checkIsFlapping()).toBe(true);
    });

    it("manages user Low Bandwidth / Data Saver preference", () => {
      networkQualityService.setLowBandwidthMode(true);
      expect(networkQualityService.getLowBandwidthMode()).toBe(true);

      networkQualityService.setLowBandwidthMode(false);
      expect(networkQualityService.getLowBandwidthMode()).toBe(false);
    });
  });

  // ==========================================
  // 2. UNIFIED OFFLINE SYNC MANAGER TESTS
  // ==========================================
  describe("2. Unified Multi-Entity Offline Sync Manager", () => {
    it("enqueues trees, observations, and field reports with priority sorting", () => {
      const treeItem = offlineSyncManager.enqueue({
        entityType: "tree",
        title: "Sahyadri Banyan #01",
        subtitle: "Banyan • 120cm",
        payload: { species: "Banyan", height_cm: 120, latitude: 18.4735, longitude: 73.4361 },
      });

      const obsItem = offlineSyncManager.enqueue({
        entityType: "observation",
        title: "Audit: GE-2026-000101",
        subtitle: "Status: healthy",
        payload: { tree_id: "tree-1", health_status: "healthy", latitude: 18.4735, longitude: 73.4361 },
      });

      expect(treeItem.localId).toContain("offline-tree");
      expect(treeItem.idempotencyKey).toBeDefined();
      expect(treeItem.priority).toBe(1); // Trees have highest priority

      expect(obsItem.localId).toContain("offline-observation");
      expect(obsItem.priority).toBe(2);

      const queue = offlineSyncManager.getQueue();
      expect(queue.length).toBe(2);
      expect(queue[0].entityType).toBe("tree"); // Priority order
    });

    it("filters queue by entity type and status", () => {
      offlineSyncManager.enqueue({
        entityType: "tree",
        title: "Neem Sapling",
        subtitle: "Neem",
        payload: { species: "Neem" },
      });
      offlineSyncManager.enqueue({
        entityType: "observation",
        title: "Observation 1",
        subtitle: "Stressed",
        payload: { health_status: "stressed" },
      });

      const trees = offlineSyncManager.getQueue({ entityType: "tree" });
      expect(trees.length).toBe(1);
      expect(trees[0].title).toBe("Neem Sapling");

      const observations = offlineSyncManager.getQueue({ entityType: "observation" });
      expect(observations.length).toBe(1);
    });

    it("removes items and clears the offline queue safely", () => {
      const item = offlineSyncManager.enqueue({
        entityType: "tree",
        title: "Teak Tree",
        subtitle: "Teak",
        payload: { species: "Teak" },
      });

      expect(offlineSyncManager.getQueue().length).toBe(1);
      offlineSyncManager.removeItem(item.localId);
      expect(offlineSyncManager.getQueue().length).toBe(0);

      offlineSyncManager.enqueue({ entityType: "observation", title: "Obs", subtitle: "h", payload: {} });
      offlineSyncManager.clear();
      expect(offlineSyncManager.getQueue().length).toBe(0);
    });

    it("inspects storage quota report", async () => {
      const quota = await offlineSyncManager.getStorageQuotaReport();
      expect(quota).toBeDefined();
      expect(typeof quota.usageFormatted).toBe("string");
      expect(typeof quota.quotaFormatted).toBe("string");
    });
  });

  // ==========================================
  // 3. NETWORK QUALITY SENTINEL UI TESTS
  // ==========================================
  describe("3. NetworkQualitySentinel Component UI", () => {
    it("renders network sentinel pill and handles click event", async () => {
      const handleOpen = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <NetworkQualitySentinel onOpenDrawer={handleOpen} />
        </QueryClientProvider>
      );

      const sentinelBtn = screen.getByRole("button");
      expect(sentinelBtn).toBeInTheDocument();

      fireEvent.click(sentinelBtn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 4. OFFLINE NETWORK DRAWER TESTS
  // ==========================================
  describe("4. OfflineNetworkDrawer Diagnostics & Queue Manager", () => {
    it("renders Queue Tab with filter chips and queued items", () => {
      offlineSyncManager.enqueue({
        entityType: "tree",
        title: "Banyan Sapling Sector 4B",
        subtitle: "Banyan • 90cm",
        payload: { species: "Banyan" },
      });

      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <OfflineNetworkDrawer isOpen={true} onClose={handleClose} defaultTab="queue" />
        </QueryClientProvider>
      );

      expect(screen.getByText("Offline & Rural Sync Manager")).toBeInTheDocument();
      expect(screen.getByText(/Banyan Sapling Sector 4B/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sync All Records/i })).toBeInTheDocument();
    });

    it("switches to Network tab, displays telemetry, and toggles Data Saver", () => {
      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <OfflineNetworkDrawer isOpen={true} onClose={handleClose} defaultTab="network" />
        </QueryClientProvider>
      );

      expect(screen.getByTestId("network-tab-view")).toBeInTheDocument();
      expect(screen.getByText("Low Bandwidth / Data Saver Mode")).toBeInTheDocument();

      const toggle = screen.getByTestId("low-bandwidth-toggle");
      fireEvent.click(toggle);

      expect(networkQualityService.getLowBandwidthMode()).toBe(true);
    });

    it("switches to Storage & Cache tab and inspects IndexedDB quota", () => {
      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <OfflineNetworkDrawer isOpen={true} onClose={handleClose} defaultTab="storage" />
        </QueryClientProvider>
      );

      expect(screen.getByTestId("storage-tab-view")).toBeInTheDocument();
      expect(screen.getByText("IndexedDB Offline Storage")).toBeInTheDocument();
    });
  });

  // ==========================================
  // 5. MOBILE WORKFLOW INTEGRATIONS
  // ==========================================
  describe("5. Mobile Workflow Offline Integrations", () => {
    it("opens OfflineNetworkDrawer from MobileFieldInterface header sentinel", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MobileFieldInterface currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 3.2 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      const sentinelBtn = screen.getByTestId("network-sentinel-online");
      fireEvent.click(sentinelBtn);

      await waitFor(() => {
        expect(screen.getByTestId("offline-network-drawer")).toBeInTheDocument();
      });
    });

    it("opens OfflineNetworkDrawer from FastTreeRegistrationConsole header", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <FastTreeRegistrationConsole currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.8 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      const sentinelBtn = screen.getByTestId("network-sentinel-online");
      fireEvent.click(sentinelBtn);

      await waitFor(() => {
        expect(screen.getByTestId("offline-network-drawer")).toBeInTheDocument();
      });
    });

    it("opens OfflineNetworkDrawer from FastObservationConsole header", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <FastObservationConsole currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.8 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      const sentinelBtn = screen.getByTestId("network-sentinel-online");
      fireEvent.click(sentinelBtn);

      await waitFor(() => {
        expect(screen.getByTestId("offline-network-drawer")).toBeInTheDocument();
      });
    });
  });
});
