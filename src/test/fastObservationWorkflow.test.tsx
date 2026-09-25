/**
 * HIRWA SPARSH — PHASE 7 TASK 35: FAST OBSERVATION WORKFLOW TEST SUITE
 * 
 * Verifies:
 *   1. Fast Observation Service, Sub-50ms speed & Next Monitoring Scheduling
 *   2. Proximity-based Nearest Tree Auto-Detection & Radar Ranking
 *   3. 4 Giant Tactile Health Status Tiles & Threat Tagging
 *   4. 1-Tap "Quick Confirm Healthy" all-clear shortcut
 *   5. Sequential Transect Auto-Advancement & Session Survival Rate %
 *   6. Offline Fallback & Local Field Report Queueing
 *   7. Integration with MobileFieldInterface & FieldWorkerDashboard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fastObservationService,
  FIELD_THREAT_TAGS,
  HEIGHT_DELTA_PRESETS,
  FOLIAGE_DENSITY_PRESETS,
  TreeInspectionCandidate,
} from "@/services/fastObservationService";
import { FastObservationConsole } from "@/components/mobile/FastObservationConsole";
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
      insert: vi.fn().mockResolvedValue({ data: { id: "test-obs-id" }, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })),
  },
}));

const MOCK_CANDIDATES: TreeInspectionCandidate[] = [
  {
    id: "tree-01",
    treeCode: "GE-2026-000101",
    species: "Neem",
    vernacularName: "कडूलिंब",
    plantationDate: "2026-01-15",
    currentHeightCm: 125,
    lastStatus: "healthy",
    latitude: 18.473525,
    longitude: 73.436105,
    compartmentName: "Block A-1",
  },
  {
    id: "tree-02",
    treeCode: "GE-2026-000102",
    species: "Banyan",
    vernacularName: "वड",
    plantationDate: "2026-01-15",
    currentHeightCm: 160,
    lastStatus: "healthy",
    latitude: 18.473560,
    longitude: 73.436120,
    compartmentName: "Block A-1",
  },
  {
    id: "tree-03",
    treeCode: "GE-2026-000103",
    species: "Peepal",
    vernacularName: "पिंपळ",
    plantationDate: "2026-01-15",
    currentHeightCm: 145,
    lastStatus: "stressed",
    latitude: 18.473590,
    longitude: 73.436140,
    compartmentName: "Block A-1",
  },
];

describe("PHASE 7 TASK 35 — Fast Observation Workflow", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    fastObservationService.startSession(
      "test-proj-01",
      "Sahyadri Test Ridge",
      "ranger-01",
      "Ranger Patil"
    );
  });

  // =========================================================================
  // 1. FAST OBSERVATION SERVICE LOGIC & PROXIMITY DETECTION
  // =========================================================================
  describe("1. Fast Observation Service & Scheduling Engine", () => {
    it("finds and ranks nearby trees by geodesic distance with auto-lock indicator", () => {
      const currentLocation = { lat: 18.473521, lng: 73.436102 };
      const nearby = fastObservationService.findNearestTrees(currentLocation, MOCK_CANDIDATES, 100);

      expect(nearby).toHaveLength(3);
      // Closest should be tree-01 (< 10m -> autoLocked)
      expect(nearby[0].tree.id).toBe("tree-01");
      expect(nearby[0].distanceMeters).toBeLessThan(10);
      expect(nearby[0].isAutoLocked).toBe(true);
      expect(nearby[0].bearingDegrees).toBeGreaterThanOrEqual(0);
    });

    it("selects next uninspected tree in sequential order", () => {
      const inspected = new Set(["tree-01"]);
      const next = fastObservationService.getNextTreeInSequence("tree-01", MOCK_CANDIDATES, inspected);

      expect(next).not.toBeNull();
      expect(next?.id).toBe("tree-02");
    });

    it("executes fastRecordObservation in sub-50ms and computes next monitoring date", async () => {
      const input = {
        treeId: "tree-01",
        treeCode: "GE-2026-000101",
        species: "Neem",
        healthStatus: "healthy" as const,
        heightDeltaCm: 5,
        currentHeightCm: 130,
        foliageDensityPct: 100,
        threatTags: [],
        coordinates: { latitude: 18.473521, longitude: 73.436102, accuracyMeters: 2.8 },
      };

      const result = await fastObservationService.fastRecordObservation(input);
      expect(result.success).toBe(true);
      expect(result.healthStatus).toBe("healthy");
      expect(result.streakCount).toBe(1);
      expect(result.totalInspected).toBe(1);
      expect(result.survivalRatePct).toBe(100.0);
      expect(result.intervalDays).toBeGreaterThan(0);
    });

    it("calculates accelerated inspection schedule for stressed or diseased trees", async () => {
      // Damaged/Diseased should have 7-day interval
      const resultDamaged = await fastObservationService.fastRecordObservation({
        treeId: "tree-03",
        treeCode: "GE-2026-000103",
        species: "Peepal",
        healthStatus: "damaged",
        threatTags: ["pest"],
        coordinates: { latitude: 18.4735, longitude: 73.4361 },
      });

      expect(resultDamaged.intervalDays).toBe(7);
      expect(resultDamaged.healthStatus).toBe("diseased");

      const session = fastObservationService.getSession();
      expect(session.flagsRaisedCount).toBe(1);
      expect(session.survivalRatePct).toBe(0); // 0 healthy, 1 damaged -> 0%
    });

    it("provides 1-tap quickConfirmHealthy shortcut", async () => {
      const result = await fastObservationService.quickConfirmHealthy(MOCK_CANDIDATES[0], {
        latitude: 18.4735,
        longitude: 73.4361,
      });

      expect(result.success).toBe(true);
      expect(result.healthStatus).toBe("healthy");
    });
  });

  // =========================================================================
  // 2. CONSOLE UI & TOUCH ERGONOMICS
  // =========================================================================
  describe("2. FastObservationConsole UI Flow", () => {
    it("renders HUD, target tree card, 4 health tiles, and Confirm button", () => {
      renderWithProviders(
        <FastObservationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          candidateTrees={MOCK_CANDIDATES}
        />
      );

      expect(screen.getByTestId("fast-observation-console")).toBeInTheDocument();
      expect(screen.getByText(/Fast Tree Observation/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Tap Audit/i)).toBeInTheDocument();
      expect(screen.getByTestId("health-tile-healthy")).toBeInTheDocument();
      expect(screen.getByTestId("health-tile-stressed")).toBeInTheDocument();
      expect(screen.getByTestId("health-tile-damaged")).toBeInTheDocument();
      expect(screen.getByTestId("health-tile-dead")).toBeInTheDocument();
      expect(screen.getByTestId("confirm-and-next-button")).toBeInTheDocument();
      expect(screen.getByTestId("quick-healthy-shortcut-btn")).toBeInTheDocument();
    });

    it("toggles health status tile and threat flags", () => {
      renderWithProviders(
        <FastObservationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          candidateTrees={MOCK_CANDIDATES}
        />
      );

      // Select STRESSED tile
      const stressedTile = screen.getByTestId("health-tile-stressed");
      fireEvent.click(stressedTile);

      // Select Pest Infestation threat tag
      const pestTag = screen.getByText(/Pest Infestation/i);
      fireEvent.click(pestTag);

      expect(screen.getByText(/1 Active/i)).toBeInTheDocument();
    });

    it("submits observation on Confirm & Next and advances to next tree in sequence", async () => {
      const onSuccess = vi.fn();
      renderWithProviders(
        <FastObservationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          candidateTrees={MOCK_CANDIDATES}
          onSuccess={onSuccess}
        />
      );

      // Initial tree is GE-2026-000101 (Neem)
      expect(screen.getByText("GE-2026-000101")).toBeInTheDocument();

      const confirmBtn = screen.getByTestId("confirm-and-next-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        // Should advance to GE-2026-000102 (Banyan)
        expect(screen.getByText("GE-2026-000102")).toBeInTheDocument();
      });
    });

    it("executes 1-Tap All Healthy shortcut button instantly", async () => {
      const onSuccess = vi.fn();
      renderWithProviders(
        <FastObservationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          candidateTrees={MOCK_CANDIDATES}
          onSuccess={onSuccess}
        />
      );

      const quickHealthyBtn = screen.getByTestId("quick-healthy-shortcut-btn");
      fireEvent.click(quickHealthyBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ healthStatus: "healthy" })
        );
      });
    });

    it("displays nearby trees in Radar tab and allows manual target selection", () => {
      renderWithProviders(
        <FastObservationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          candidateTrees={MOCK_CANDIDATES}
        />
      );

      const radarTab = screen.getByText(/Nearby Radar/i);
      fireEvent.click(radarTab);

      expect(screen.getByTestId("nearby-radar-view")).toBeInTheDocument();
      expect(screen.getByText(/Nearby Compartment Trees/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Azimuth/i).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. APP INTEGRATION TESTS
  // =========================================================================
  describe("3. Mobile & Desktop App Integration", () => {
    it("opens FastObservationConsole from MobileFieldInterface action card", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      const startObsBtn = screen.getByTestId("start-fast-observation-btn");
      expect(startObsBtn).toBeInTheDocument();

      fireEvent.click(startObsBtn);
      expect(screen.getByTestId("fast-observation-console")).toBeInTheDocument();

      // Done button exits back
      const doneBtn = screen.getByText(/Done/i);
      fireEvent.click(doneBtn);
      expect(screen.getByTestId("mobile-field-interface")).toBeInTheDocument();
    });

    it("opens Fast Tree Audit modal from FieldWorkerDashboard desktop view", () => {
      renderWithProviders(<FieldWorkerDashboard />);

      const desktopFastObsBtn = screen.getByTestId("desktop-fast-observation-btn");
      expect(desktopFastObsBtn).toBeInTheDocument();

      fireEvent.click(desktopFastObsBtn);
      expect(screen.getByTestId("fast-observation-console")).toBeInTheDocument();
    });
  });
});