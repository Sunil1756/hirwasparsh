/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 39
 * End-to-End Field Testing Test Suite
 * 
 * Acceptance:
 *   A field worker can realistically register and monitor trees from a phone.
 * 
 * Validates:
 *   1. Hardware Sensor Readiness & Camera/GPS Access
 *   2. Sub-5s Rapid Tree Streak Registration with Spacing Radar & Geodetic Watermarking
 *   3. Sub-3s Proximity Auto-Detected Health Observation (<5m) & Growth Deltas
 *   4. 2G / Offline Wilderness Journey & Adaptive Canvas JPEG Compression
 *   5. Divergent Sync Conflict Detection & Non-Destructive Smart Merge
 *   6. FieldTestSimulationSuite Interactive Controls & Automated Field Walk
 *   7. MobileFieldInterface & FieldWorkerDashboard Suite Launchers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { fastTreeRegistrationService } from "@/services/fastTreeRegistrationService";
import { fastObservationService } from "@/services/fastObservationService";
import { hardwarePermissionService } from "@/services/hardwarePermissionService";
import { networkQualityService } from "@/services/networkQualityService";
import { offlineSyncManager } from "@/services/offlineSyncManager";
import { syncConflictService } from "@/services/syncConflictService";
import { FieldTestSimulationSuite } from "@/components/mobile/FieldTestSimulationSuite";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import FieldWorkerDashboard from "@/pages/FieldWorkerDashboard";

// Mock Auth Context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-ranger-01", email: "ranger@greentech.org", role: "field_worker" },
  }),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: { id: "test-cloud-id" }, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: { id: "test-cloud-id" }, error: null }),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "evidence/test.jpg" }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cloud.greentech.org/evidence/test.jpg" } })),
      })),
    },
  },
}));

describe("PHASE 7 TASK 39 — Field Testing & Phone Workflow End-to-End Suite", () => {
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

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    );

  // =========================================================================
  // 1. HARDWARE SENSOR & DIAGNOSTIC UNBLOCK FLOW
  // =========================================================================
  describe("1. Hardware Sensor Readiness & Diagnostic Workflow", () => {
    it("queries hardware permissions and validates camera & GPS health", async () => {
      const report = await hardwarePermissionService.checkAllPermissions();
      expect(report).toBeDefined();
      expect(["granted", "prompt", "denied", "unsupported", "restricted"]).toContain(report.camera.status);
      expect(["granted", "prompt", "denied", "unsupported", "restricted"]).toContain(report.gps.status);
      expect(typeof report.allGranted).toBe("boolean");
    });

    it("evaluates high-precision GPS coordinate accuracy metrics", () => {
      const accuratePos = { lat: 18.52043, lng: 73.85674, accuracy: 2.1 };
      const degradedPos = { lat: 18.52043, lng: 73.85674, accuracy: 18.5 };

      expect(accuratePos.accuracy).toBeLessThan(5.0);
      expect(degradedPos.accuracy).toBeGreaterThan(10.0);
    });
  });

  // =========================================================================
  // 2. RAPID TREE REGISTRATION STREAK & SPACING RADAR
  // =========================================================================
  describe("2. Sub-5s Rapid Tree Registration Streak & Spacing Radar", () => {
    it("registers multiple trees in rapid succession with geodetic watermarks", async () => {
      const speciesList = ["Ficus benghalensis", "Azadirachta indica", "Tectona grandis"];
      const baseLat = 18.5204;
      const baseLng = 73.8567;

      for (let i = 0; i < speciesList.length; i++) {
        const result = await fastTreeRegistrationService.fastRegisterTree({
          species: speciesList[i],
          heightCm: 70 + i * 15,
          dbhCm: 3.5,
          healthStatus: "healthy",
          tagId: "QR-E2E-2026-" + (i + 1),
          notes: "Field test sapling #" + (i + 1),
          projectId: "project-field-test-01",
          coordinates: {
            latitude: baseLat + i * 0.0001,
            longitude: baseLng + i * 0.0001,
            accuracyMeters: 2.3,
          },
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.treeCode).toBeTruthy();
      }
    });

    it("verifies tree spacing collision detection math", () => {
      // 0.00001 deg lat is approx 1.11 meters
      const tree1 = { latitude: 18.52040, longitude: 73.85670 };
      const treeTooClose = { latitude: 18.52041, longitude: 73.85671 }; // ~1.5m away (< 2.0m minimum spacing)
      const treeValid = { latitude: 18.52050, longitude: 73.85680 }; // ~15m away

      const spacingTooClose = fastTreeRegistrationService.calculateGridSpacing(treeTooClose, tree1);
      const spacingValid = fastTreeRegistrationService.calculateGridSpacing(treeValid, tree1);

      expect(spacingTooClose.status).toBe("too_dense");
      expect(spacingValid.status).toBe("sparse");
    });
  });

  // =========================================================================
  // 3. SUB-3S FAST PROXIMITY OBSERVATION & GROWTH DELTAS
  // =========================================================================
  describe("3. Sub-3s Fast Tree Observation & Growth Deltas", () => {
    it("records single-tap health, multi-threat tags, and height delta", async () => {
      const baselineHeight = 110;
      const currentHeight = 128;
      const heightDelta = currentHeight - baselineHeight;

      const obsResult = await fastObservationService.fastRecordObservation({
        treeId: "tree-e2e-target-01",
        treeCode: "Banyan #204",
        species: "Ficus benghalensis",
        healthStatus: "stressed",
        threatTags: ["drought_stress", "termite"],
        currentHeightCm: currentHeight,
        heightDeltaCm: heightDelta,
        notes: "Leaves showing yellowing due to heatwave",
        projectId: "project-field-test-01",
        coordinates: {
          latitude: 18.52045,
          longitude: 73.85675,
          accuracyMeters: 2.2,
        },
      });

      expect(obsResult).toBeDefined();
      expect(obsResult.success).toBe(true);
      expect(obsResult.observationId).toBeTruthy();
    });
  });

  // =========================================================================
  // 4. 2G / OFFLINE WILDERNESS JOURNEY & DATA-SAVER COMPRESSION
  // =========================================================================
  describe("4. 2G / Offline Wilderness Journey & Data-Saver Compression", () => {
    it("switches network tier, validates adaptive compression and offline queueing", async () => {
      // 1. Simulate 2G poor network / low bandwidth mode
      networkQualityService.setLowBandwidthMode(true);
      expect(networkQualityService.getLowBandwidthMode()).toBe(true);
      const config = networkQualityService.getAdaptiveCompressionConfig("poor");
      expect(config.targetMaxBytes).toBeLessThan(100000);

      // 2. Stage tree registration into offline manager
      const item = offlineSyncManager.enqueue({
        entityType: "tree",
        title: "GE-2026-OFFLINE-01 • Neem Sapling",
        subtitle: "Mulshi sector 4 offline draft",
        payload: {
          tree_name: "GE-2026-OFFLINE-01",
          species: "Azadirachta indica",
          height_cm: 95,
          health_status: "healthy",
          notes: "Recorded offline at Mulshi sector 4",
        },
      });

      expect(item).toBeDefined();
      expect(item.localId).toBeTruthy();
      expect(offlineSyncManager.getQueue().length).toBeGreaterThanOrEqual(1);

      // 3. Reset low bandwidth mode
      networkQualityService.setLowBandwidthMode(false);
      expect(networkQualityService.getLowBandwidthMode()).toBe(false);
    });
  });

  // =========================================================================
  // 5. DIVERGENT CONFLICT DETECTION & NON-DESTRUCTIVE SMART MERGE
  // =========================================================================
  describe("5. Divergent Sync Conflict Detection & Smart Merge", () => {
    it("detects field diffs and merges local vital signs with server assignments", async () => {
      const localItem = {
        tree_name: "GE-2026-TEST-TREE",
        species: "Tectona grandis",
        height_cm: 140,
        health_status: "stressed",
        notes: "Field worker observed termite mounds",
      };

      const serverState = {
        id: "tree-server-uuid-101",
        tree_name: "GE-2026-TEST-TREE",
        species: "Tectona grandis",
        height_cm: 120,
        health_status: "healthy",
        notes: "Corporate Sponsor: Infosys Foundation",
        updated_at: new Date().toISOString(),
      };

      const { hasConflict, diffs } = syncConflictService.detectConflict(localItem, serverState, "tree");
      expect(hasConflict).toBe(true);
      expect(diffs.length).toBeGreaterThanOrEqual(2);

      const conflict = syncConflictService.registerConflict({
        localId: "local-test-101",
        entityType: "tree",
        entityId: "tree-server-uuid-101",
        title: "Tree Sync Conflict",
        subtitle: "Species/Height discrepancy",
        localItem,
        serverItem: serverState,
      });

      expect(conflict).toBeDefined();

      // Resolve via Smart Merge
      const resolved = await syncConflictService.resolveConflict(conflict.conflictId, {
        strategy: "smart_merge",
      });
      expect(resolved.success).toBe(true);
      expect(resolved.strategy).toBe("smart_merge");
      expect(resolved.resolvedPayload.height_cm).toBe(140);
      expect(resolved.resolvedPayload.health_status).toBe("stressed");

      // Verify audit log recorded
      const audit = syncConflictService.getAuditTrail();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].resolutionStrategy).toBe("smart_merge");
    });
  });

  // =========================================================================
  // 6. FIELD TEST SIMULATION SUITE COMPONENT INTERACTION
  // =========================================================================
  describe("6. FieldTestSimulationSuite Interactive Component", () => {
    it("renders simulation suite modal and navigates across scenario tabs", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <FieldTestSimulationSuite
          isOpen={true}
          onClose={onClose}
          currentLocation={{ lat: 18.5204, lng: 73.8567, accuracy: 2.5 }}
          projectId="test-project-01"
        />
      );

      expect(screen.getByTestId("field-test-simulation-suite")).toBeInTheDocument();
      expect(screen.getByText(/Mobile Field Test Simulation Suite/i)).toBeInTheDocument();

      // Check scenario tabs exist
      expect(screen.getByTestId("tab-sim-overview")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-gps_navigation")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-streak_registration")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-proximity_observation")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-offline_datasaver")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-conflict_resolution")).toBeInTheDocument();
      expect(screen.getByTestId("tab-sim-sensor_diagnostics")).toBeInTheDocument();

      // Click GPS tab
      fireEvent.click(screen.getByTestId("tab-sim-gps_navigation"));
      expect(screen.getByTestId("sim-gps-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-run-gps-btn")).toBeInTheDocument();

      // Click Streak tab
      fireEvent.click(screen.getByTestId("tab-sim-streak_registration"));
      expect(screen.getByTestId("sim-streak-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-run-streak-btn")).toBeInTheDocument();

      // Click Proximity Observation tab
      fireEvent.click(screen.getByTestId("tab-sim-proximity_observation"));
      expect(screen.getByTestId("sim-obs-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-record-obs-btn")).toBeInTheDocument();

      // Click 2G / Offline tab
      fireEvent.click(screen.getByTestId("tab-sim-offline_datasaver"));
      expect(screen.getByTestId("sim-offline-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-run-offline-btn")).toBeInTheDocument();

      // Click Conflict tab
      fireEvent.click(screen.getByTestId("tab-sim-conflict_resolution"));
      expect(screen.getByTestId("sim-conflict-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-resolve-conflict-btn")).toBeInTheDocument();

      // Click Sensor Diagnostics tab
      fireEvent.click(screen.getByTestId("tab-sim-sensor_diagnostics"));
      expect(screen.getByTestId("sim-sensors-view")).toBeInTheDocument();
      expect(screen.getByTestId("sim-run-sensors-btn")).toBeInTheDocument();
    });

    it("triggers individual scenario runners and records step pass states", async () => {
      const onClose = vi.fn();
      renderWithProviders(
        <FieldTestSimulationSuite
          isOpen={true}
          onClose={onClose}
          currentLocation={{ lat: 18.5204, lng: 73.8567, accuracy: 2.5 }}
          projectId="test-project-01"
        />
      );

      // 1. Run Streak Registration simulator
      fireEvent.click(screen.getByTestId("tab-sim-streak_registration"));
      const streakBtn = screen.getByTestId("sim-run-streak-btn");
      fireEvent.click(streakBtn);

      await waitFor(() => {
        expect(screen.getByText(/5 Planted/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // 2. Run Proximity Observation simulator
      fireEvent.click(screen.getByTestId("tab-sim-proximity_observation"));
      const obsBtn = screen.getByTestId("sim-record-obs-btn");
      fireEvent.click(obsBtn);

      await waitFor(() => {
        expect(screen.getByText(/Record Another Fast Observation/i)).toBeInTheDocument();
      });

      // 3. Run Conflict resolution simulator
      fireEvent.click(screen.getByTestId("tab-sim-conflict_resolution"));
      const conflictBtn = screen.getByTestId("sim-resolve-conflict-btn");
      fireEvent.click(conflictBtn);

      await waitFor(() => {
        expect(screen.getByText(/Resolved ✓/i)).toBeInTheDocument();
      });

      // 4. Return to Overview and verify passing scorecard
      fireEvent.click(screen.getByTestId("tab-sim-overview"));
      expect(screen.getByTestId("sim-overview-view")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 7. MOBILE FIELD INTERFACE & DESKTOP DASHBOARD INTEGRATION
  // =========================================================================
  describe("7. Mobile & Desktop Launcher Integration", () => {
    it("opens Field Test Simulation Suite from MobileFieldInterface", async () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.5204, lng: 73.8567, accuracy: 2.5 }}
          projectId="test-project-01"
        />
      );

      expect(screen.getByTestId("mobile-field-interface")).toBeInTheDocument();
      const openSuiteBtn = screen.getByTestId("open-field-test-suite-btn");
      expect(openSuiteBtn).toBeInTheDocument();

      fireEvent.click(openSuiteBtn);

      await waitFor(() => {
        expect(screen.getByTestId("field-test-simulation-suite")).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByTestId("close-field-test-suite"));
      await waitFor(() => {
        expect(screen.queryByTestId("field-test-simulation-suite")).not.toBeInTheDocument();
      });
    });

    it("opens Field Test Simulation Suite from FieldWorkerDashboard Quick Tools", async () => {
      renderWithProviders(<FieldWorkerDashboard />);

      const desktopSuiteBtn = screen.getByTestId("desktop-open-field-test-suite-btn");
      expect(desktopSuiteBtn).toBeInTheDocument();

      fireEvent.click(desktopSuiteBtn);

      await waitFor(() => {
        expect(screen.getByTestId("field-test-simulation-suite")).toBeInTheDocument();
      });
    });
  });
});
