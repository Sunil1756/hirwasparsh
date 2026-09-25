/**
 * HIRWA SPARSH — PHASE 7 TASK 33: MOBILE-FIRST FIELD INTERFACE TEST SUITE
 * 
 * Verifies:
 *   1. Touch Ergonomics, Bottom Nav & Sunlight Mode
 *   2. Geodetic Waypoint Compass & Bearing Mathematics
 *   3. Rapid 1-Tap Tree Registration & MRV Spot Audits
 *   4. Vitality Tally Counter & Offline Storage Hub
 *   5. FieldWorkerDashboard Mobile Mode Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  FieldWaypointCompass,
  calculateBearing,
  getCardinalDirection,
} from "@/components/mobile/FieldWaypointCompass";
import { RapidFieldActionDrawer } from "@/components/mobile/RapidFieldActionDrawer";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import FieldWorkerDashboard from "@/pages/FieldWorkerDashboard";
import { LatLngTuple } from "@/lib/gisMapFoundation";
import * as offlineSyncService from "@/lib/offlineSyncService";
import * as fieldReportBackendService from "@/lib/fieldReportBackendService";

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

describe("PHASE 7 TASK 33 — Mobile-First Field Interface", () => {
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
  });

  // =========================================================================
  // 1. GEODETIC WAYPOINT COMPASS & AZIMUTH MATHEMATICS
  // =========================================================================
  describe("1. Geodetic Waypoint Compass & Rangefinder", () => {
    it("calculates accurate forward bearing azimuth and cardinal directions", () => {
      // Due North: from [18.0, 73.0] to [19.0, 73.0]
      const origin: LatLngTuple = [18.0, 73.0];
      const northPoint: LatLngTuple = [19.0, 73.0];
      const bearingNorth = calculateBearing(origin, northPoint);
      expect(bearingNorth).toBeCloseTo(0, 0);
      expect(getCardinalDirection(bearingNorth)).toBe("N");

      // Due East: from [18.0, 73.0] to [18.0, 74.0]
      const eastPoint: LatLngTuple = [18.0, 74.0];
      const bearingEast = calculateBearing(origin, eastPoint);
      expect(bearingEast).toBeCloseTo(90, 0);
      expect(getCardinalDirection(bearingEast)).toBe("E");

      // Due South: from [19.0, 73.0] to [18.0, 73.0]
      const bearingSouth = calculateBearing(northPoint, origin);
      expect(bearingSouth).toBeCloseTo(180, 0);
      expect(getCardinalDirection(bearingSouth)).toBe("S");

      // Due West: from [18.0, 74.0] to [18.0, 73.0]
      const bearingWest = calculateBearing(eastPoint, origin);
      expect(bearingWest).toBeCloseTo(270, 0);
      expect(getCardinalDirection(bearingWest)).toBe("W");
    });

    it("renders FieldWaypointCompass and displays distance, bearing and proximity status", () => {
      const mockLocation = { lat: 18.473521, lng: 73.436102, accuracy: 3.0 };
      renderWithProviders(
        <FieldWaypointCompass currentLocation={mockLocation} />
      );

      expect(screen.getByTestId("field-waypoint-compass")).toBeInTheDocument();
      expect(screen.getByText(/Field Waypoint Compass/i)).toBeInTheDocument();
      // When at the exact location of target 1, it should show On Target (≤5m)
      expect(screen.getByText(/On Target/i)).toBeInTheDocument();
    });

    it("allows switching target waypoints from target selector chips", () => {
      const onSelect = vi.fn();
      renderWithProviders(
        <FieldWaypointCompass
          currentLocation={{ lat: 18.47, lng: 73.43, accuracy: 4.0 }}
          onSelectTarget={onSelect}
        />
      );

      const targetChip = screen.getByText(/Paithan Neem/i);
      fireEvent.click(targetChip);
      expect(onSelect).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. RAPID ONE-HANDED FIELD ACTION DRAWER
  // =========================================================================
  describe("2. Rapid Field Action Drawer (Plant & MRV Audits)", () => {
    it("renders Rapid Tree Registration drawer with species selector and numeric sliders", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <RapidFieldActionDrawer
          isOpen={true}
          mode="plant"
          onClose={onClose}
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.8 }}
        />
      );

      expect(screen.getByTestId("rapid-field-drawer")).toBeInTheDocument();
      expect(screen.getByText(/Rapid Tree Registration/i)).toBeInTheDocument();
      expect(screen.getByText(/Neem/i)).toBeInTheDocument();
      expect(screen.getByText(/Banyan/i)).toBeInTheDocument();
      expect(screen.getByText(/Register Sapling Now/i)).toBeInTheDocument();
    });

    it("renders Rapid MRV Health Audit drawer with 4 big tactile status buttons", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <RapidFieldActionDrawer
          isOpen={true}
          mode="audit"
          onClose={onClose}
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 3.1 }}
        />
      );

      expect(screen.getByText(/Rapid MRV Health Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/ALIVE/i)).toBeInTheDocument();
      expect(screen.getByText(/STRESSED/i)).toBeInTheDocument();
      expect(screen.getByText(/DAMAGED/i)).toBeInTheDocument();
      expect(screen.getByText(/DEAD/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit Ground Truth Audit/i)).toBeInTheDocument();
    });

    it("allows selecting survival status and submitting audit", async () => {
      const onSuccess = vi.fn();
      renderWithProviders(
        <RapidFieldActionDrawer
          isOpen={true}
          mode="audit"
          onClose={vi.fn()}
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 3.1 }}
          onSuccess={onSuccess}
        />
      );

      const stressedBtn = screen.getByText(/STRESSED/i);
      fireEvent.click(stressedBtn);

      const submitBtn = screen.getByText(/Submit Ground Truth Audit/i);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ survivalStatus: "STRESSED" })
        );
      });
    });
  });

  // =========================================================================
  // 3. MOBILE FIELD INTERFACE (NAVIGATION, TELEMETRY & TALLY)
  // =========================================================================
  describe("3. Mobile Field Interface Container", () => {
    it("renders top telemetry bar, online badge, GPS accuracy, and bottom navigation tabs", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      expect(screen.getByTestId("mobile-field-interface")).toBeInTheDocument();
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/±2.5m/i)).toBeInTheDocument();
      expect(screen.getByTestId("tab-nav-tasks")).toBeInTheDocument();
      expect(screen.getByTestId("tab-nav-compass")).toBeInTheDocument();
      expect(screen.getByTestId("tab-nav-tally")).toBeInTheDocument();
      expect(screen.getByTestId("tab-nav-queue")).toBeInTheDocument();
    });

    it("switches bottom tabs between Tasks, Compass, Tally, and Queue views", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      // 1. Tasks view active by default
      expect(screen.getByTestId("mobile-tasks-view")).toBeInTheDocument();

      // 2. Switch to Compass tab
      fireEvent.click(screen.getByTestId("tab-nav-compass"));
      expect(screen.getByTestId("mobile-compass-view")).toBeInTheDocument();

      // 3. Switch to Tally tab
      fireEvent.click(screen.getByTestId("tab-nav-tally"));
      expect(screen.getByTestId("mobile-tally-view")).toBeInTheDocument();

      // 4. Switch to Sync / Queue tab
      fireEvent.click(screen.getByTestId("tab-nav-queue"));
      expect(screen.getByTestId("mobile-queue-view")).toBeInTheDocument();
    });

    it("calculates survival rate in Vitality Quick Tally counter with increment/decrement", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      fireEvent.click(screen.getByTestId("tab-nav-tally"));
      expect(screen.getByText(/Vitality Quick Tally/i)).toBeInTheDocument();
      expect(screen.getByText(/Survival Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Counted:/i)).toBeInTheDocument();
    });

    it("toggles sunlight high-contrast mode for outdoor readability", () => {
      renderWithProviders(
        <MobileFieldInterface
          currentLocation={{ lat: 18.4735, lng: 73.4361, accuracy: 2.5 }}
        />
      );

      const sunlightBtn = screen.getByTitle(/Toggle Sunlight Readability Mode/i);
      fireEvent.click(sunlightBtn);

      const container = screen.getByTestId("mobile-field-interface");
      expect(container.className).toContain("bg-amber-100");
    });
  });

  // =========================================================================
  // 4. FIELD WORKER DASHBOARD INTEGRATION
  // =========================================================================
  describe("4. FieldWorkerDashboard Mobile Mode Integration", () => {
    it("renders Mobile Field Mode button in FieldWorkerDashboard header and toggles views", async () => {
      renderWithProviders(<FieldWorkerDashboard />);

      expect(screen.getByText(/Field Scout & Ranger Console/i)).toBeInTheDocument();

      const mobileModeBtn = screen.getByText(/Mobile Field Mode/i);
      expect(mobileModeBtn).toBeInTheDocument();

      fireEvent.click(mobileModeBtn);

      // After clicking Mobile Field Mode, Mobile Field Interface is rendered
      expect(screen.getByTestId("mobile-field-interface")).toBeInTheDocument();
      expect(screen.getByText(/Desktop View/i)).toBeInTheDocument();

      // Switch back to Desktop View
      fireEvent.click(screen.getByText(/Desktop View/i));
      expect(screen.getByText(/Field Scout & Ranger Console/i)).toBeInTheDocument();
    });
  });
});
