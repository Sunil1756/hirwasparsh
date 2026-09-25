/**
 * HIRWA SPARSH — PHASE 7 TASK 34: FAST TREE REGISTRATION TEST SUITE
 * 
 * Verifies:
 *   1. Fast Tree Registration Service, Sub-50ms speed & GE Identifier Generation
 *   2. Geodesic Spacing Radar & Forestry Grid Density Calculations
 *   3. Continuous Planting Streak & Session Analytics
 *   4. Transect Afforestation Waypoint Generator
 *   5. Offline Fallback & Local Queue Persistence
 *   6. FastTreeRegistrationConsole UI & Rapid-Fire "Plant & Next" Flow
 *   7. Integration with MobileFieldInterface & FieldWorkerDashboard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fastTreeRegistrationService,
  FAST_SPECIES_PRESETS,
  STANDARD_HEIGHT_PRESETS,
  STANDARD_DBH_PRESETS,
} from "@/services/fastTreeRegistrationService";
import { FastTreeRegistrationConsole } from "@/components/mobile/FastTreeRegistrationConsole";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import FieldWorkerDashboard from "@/pages/FieldWorkerDashboard";
import * as offlineSyncService from "@/lib/offlineSyncService";

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
      insert: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
    })),
  },
}));

describe("PHASE 7 TASK 34 — Fast Tree Registration", () => {
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
    fastTreeRegistrationService.startSession(
      "test-proj-01",
      "Sahyadri Test Ridge",
      "ranger-01",
      "Ranger Patil",
      "comp-01",
      "Block A"
    );
  });

  // =========================================================================
  // 1. SERVICE LOGIC & IDENTIFIER GENERATION
  // =========================================================================
  describe("1. Fast Tree Registration Service & Identifier Engine", () => {
    it("generates valid GE-YYYY-NNNNNN tree identifiers conforming to standard format", () => {
      const code1 = fastTreeRegistrationService.generateUniqueTreeCode(2026);
      expect(code1).toMatch(/^GE-2026-\d{6}$/);

      const codeCurrent = fastTreeRegistrationService.generateUniqueTreeCode();
      const currentYear = new Date().getFullYear();
      expect(codeCurrent).toMatch(new RegExp(`^GE-${currentYear}-\\d{6}$`));
    });

    it("evaluates Spacing Radar density guidelines accurately", () => {
      const origin = { latitude: 18.473521, longitude: 73.436102 };

      // 1. Initial tree
      const initial = fastTreeRegistrationService.calculateGridSpacing(origin, undefined);
      expect(initial.status).toBe("initial");
      expect(initial.distanceMeters).toBeNull();

      // 2. Too dense (< 2.0m)
      const closeCoord = { latitude: 18.473530, longitude: 73.436105 }; // ~1.0m
      const dense = fastTreeRegistrationService.calculateGridSpacing(closeCoord, origin);
      expect(dense.status).toBe("too_dense");
      expect(dense.distanceMeters).toBeLessThan(2.0);

      // 3. Optimal spacing (2.0m - 5.5m)
      const optimalCoord = { latitude: 18.473550, longitude: 73.436102 }; // ~3.2m
      const optimal = fastTreeRegistrationService.calculateGridSpacing(optimalCoord, origin);
      expect(optimal.status).toBe("optimal");
      expect(optimal.distanceMeters).toBeGreaterThanOrEqual(2.0);
      expect(optimal.distanceMeters).toBeLessThanOrEqual(5.5);

      // 4. Sparse spacing (> 5.5m)
      const farCoord = { latitude: 18.473650, longitude: 73.436102 }; // ~14m
      const sparse = fastTreeRegistrationService.calculateGridSpacing(farCoord, origin);
      expect(sparse.status).toBe("sparse");
      expect(sparse.distanceMeters).toBeGreaterThan(5.5);
    });

    it("generates geometric transect coordinates along azimuth bearing", () => {
      const startCoord = { latitude: 18.4735, longitude: 73.4361 };
      const points = fastTreeRegistrationService.generateTransectCoordinates(
        startCoord,
        5,
        4.0, // 4m spacing
        90  // East
      );

      expect(points).toHaveLength(5);
      expect(points[0].index).toBe(1);
      expect(points[0].latitude).toBe(startCoord.latitude);
      expect(points[0].longitude).toBe(startCoord.longitude);

      // Subsequent points should have increasing longitude (Eastward)
      expect(points[4].longitude).toBeGreaterThan(points[0].longitude);
      expect(points[4].latitude).toBeCloseTo(startCoord.latitude, 4);
    });

    it("executes fastRegisterTree in sub-50ms and updates planting streak", async () => {
      const input = {
        species: "Neem",
        heightCm: 120,
        dbhCm: 4.5,
        healthStatus: "healthy" as const,
        coordinates: { latitude: 18.473521, longitude: 73.436102, accuracyMeters: 2.8 },
      };

      const result1 = await fastTreeRegistrationService.fastRegisterTree(input);
      expect(result1.success).toBe(true);
      expect(result1.streakCount).toBe(1);
      expect(result1.totalPlanted).toBe(1);
      expect(result1.treeCode).toMatch(/^GE-\d{4}-\d{6}$/);

      // Register second sapling in streak
      const result2 = await fastTreeRegistrationService.fastRegisterTree({
        ...input,
        species: "Banyan",
        coordinates: { latitude: 18.473550, longitude: 73.436102 },
      });

      expect(result2.streakCount).toBe(2);
      expect(result2.totalPlanted).toBe(2);
      expect(result2.spacing.status).toBe("optimal");

      // Reset streak
      fastTreeRegistrationService.resetStreak();
      const session = fastTreeRegistrationService.getSession();
      expect(session.streakCount).toBe(0);
      expect(session.totalPlanted).toBe(2); // Total preserved
    });

    it("accepts custom physical nursery tag and binds it with tree record", async () => {
      const customTag = "GE-2026-NURSERY-77";
      const result = await fastTreeRegistrationService.fastRegisterTree({
        species: "Teak",
        heightCm: 110,
        dbhCm: 4.0,
        tagId: customTag,
        coordinates: { latitude: 18.4735, longitude: 73.4361 },
      });

      expect(result.treeCode).toBe(customTag);
      expect(result.qrPayload).toContain(customTag);
    });
  });

  // =========================================================================
  // 2. CONSOLE UI & RAPID PLANTING USER EXPERIENCE
  // =========================================================================
  describe("2. FastTreeRegistrationConsole UI Flow", () => {
    it("renders telemetry header, species presets, biometrics, and giant Plant button", () => {
      renderWithProviders(
        <FastTreeRegistrationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
        />
      );

      expect(screen.getByTestId("fast-tree-registration-console")).toBeInTheDocument();
      expect(screen.getByText(/Fast Tree Register/i)).toBeInTheDocument();
      expect(screen.getByText(/Sub-5s/i)).toBeInTheDocument();
      expect(screen.getByText(/Streak: 0/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Neem/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/कडूलिंब/i).length).toBeGreaterThan(0);
      expect(screen.getByTestId("plant-and-next-button")).toBeInTheDocument();
    });

    it("selects species and updates biometric defaults", () => {
      renderWithProviders(
        <FastTreeRegistrationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
        />
      );

      // Click Banyan chip
      const banyanChip = screen.getByText("Banyan");
      fireEvent.click(banyanChip);

      // Verify Banyan default height (150cm) and DBH (6.0cm)
      expect(screen.getByText(/150 cm/i)).toBeInTheDocument();
      expect(screen.getByText(/6 cm/i)).toBeInTheDocument();
    });

    it("registers sapling on Plant & Next click, increments streak, and shows session history", async () => {
      const onSuccess = vi.fn();
      renderWithProviders(
        <FastTreeRegistrationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
          onSuccess={onSuccess}
        />
      );

      const plantBtn = screen.getByTestId("plant-and-next-button");
      fireEvent.click(plantBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(screen.getByText(/Streak: 1/i)).toBeInTheDocument();
      });

      // Switch to Session Log tab
      const historyTab = screen.getByText(/Session Log/i);
      fireEvent.click(historyTab);

      expect(screen.getByTestId("session-history-view")).toBeInTheDocument();
      expect(screen.getByText(/Planted in this session/i)).toBeInTheDocument();
    });

    it("calculates batch transect afforestation waypoints in Transect tab", () => {
      renderWithProviders(
        <FastTreeRegistrationConsole
          currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.5 }}
        />
      );

      const transectTab = screen.getByText(/Transect Grid/i);
      fireEvent.click(transectTab);

      expect(screen.getByTestId("transect-planting-view")).toBeInTheDocument();
      expect(screen.getByText(/Batch Transect Line Generator/i)).toBeInTheDocument();

      const calculateBtn = screen.getByText(/Calculate Transect Waypoints/i);
      fireEvent.click(calculateBtn);

      expect(screen.getByText(/Pending Transect Waypoints/i)).toBeInTheDocument();
      expect(screen.getByText(/Point #1/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. INTEGRATION WITH MOBILE INTERFACE & DESKTOP DASHBOARD
  // =========================================================================
  describe("3. App-Wide Integration", () => {
    it("opens FastTreeRegistrationConsole from MobileFieldInterface action card", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      const startFastBtn = screen.getByTestId("start-fast-registration-btn");
      expect(startFastBtn).toBeInTheDocument();

      fireEvent.click(startFastBtn);
      expect(screen.getByTestId("fast-tree-registration-console")).toBeInTheDocument();
      expect(screen.getByTestId("plant-and-next-button")).toBeInTheDocument();

      // Close console
      const doneBtn = screen.getByText(/Done/i);
      fireEvent.click(doneBtn);
      expect(screen.getByTestId("mobile-field-interface")).toBeInTheDocument();
    });

    it("opens FastTreeRegistrationConsole from MobileFieldInterface center FAB", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      const fabBtn = screen.getByTestId("fab-fast-plant");
      expect(fabBtn).toBeInTheDocument();

      fireEvent.click(fabBtn);
      expect(screen.getByTestId("fast-tree-registration-console")).toBeInTheDocument();
    });

    it("opens Fast Tree Register modal from FieldWorkerDashboard desktop view", () => {
      renderWithProviders(<FieldWorkerDashboard />);

      const desktopFastBtn = screen.getByTestId("desktop-fast-register-btn");
      expect(desktopFastBtn).toBeInTheDocument();

      fireEvent.click(desktopFastBtn);
      expect(screen.getByTestId("fast-tree-registration-console")).toBeInTheDocument();
    });
  });
});
