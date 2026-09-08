import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import TreeMap from "@/pages/TreeMap";
import { ModuleASatelliteEngine } from "@/components/ModuleASatelliteEngine";

// Mock leaflet since DOM testing lacks canvas/leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polygon: ({ children }: any) => <div data-testid="polygon">{children}</div>,
  Rectangle: ({ children }: any) => <div data-testid="rectangle">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  Circle: ({ children }: any) => <div data-testid="circle">{children}</div>,
  Polyline: ({ children }: any) => <div data-testid="polyline">{children}</div>,
  useMap: () => ({
    flyTo: vi.fn(),
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getPane: vi.fn(() => ({ style: {} })),
  }),
  useMapEvents: vi.fn(),
}));

describe("Module A & TreeMap Component Integrity", () => {
  it("renders ModuleASatelliteEngine without throwing errors", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <BrowserRouter>
            <ModuleASatelliteEngine trees={[]} />
          </BrowserRouter>
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(container).toBeDefined();
  });

  it("renders TreeMap page without throwing errors", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <TreeMap />
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(container).toBeDefined();
  });

  it("calculates 36-month survival assurance metrics and runs satellite scan", async () => {
    const {
      generateZoneTreeSurvivalRecords,
      calculateZoneSurvivalMetrics,
      runSatelliteSurvivalScan,
      simulateSurvivalIntervention,
    } = await import("@/lib/treeSurvivalEngine");
    const { AGROFORESTRY_PRESET_ZONES } = await import("@/lib/remoteSensing");

    const zone = AGROFORESTRY_PRESET_ZONES[0];
    const trees = generateZoneTreeSurvivalRecords(zone.id, zone.center[0], zone.center[1], zone.species, 12);
    expect(trees.length).toBe(12);

    const metrics = calculateZoneSurvivalMetrics(zone, trees);
    expect(metrics.satelliteAuditedSurvivalRate).toBeGreaterThan(80);
    expect(metrics.unmonitoredBaselineSurvivalRate).toBe(52);
    expect(metrics.survivalGainOverBaseline).toBeGreaterThan(20);
    expect(metrics.monthlyTrajectory.length).toBe(8);

    const scanResult = runSatelliteSurvivalScan(zone.id, trees);
    expect(scanResult.updatedTrees.length).toBe(12);
    expect(scanResult.scannedPixelsCount).toBeGreaterThan(0);

    const sim = simulateSurvivalIntervention(94.0, {
      wateringFrequencyPerWeek: 3,
      mulchCoveragePct: 80,
      satelliteScanIntervalDays: 3,
      bioFertilizerBoost: true,
    });
    expect(sim.projectedSurvivalRate).toBeGreaterThan(94.0);
  });

  it("converts real Supabase database trees into space-borne multi-spectral records accurately", async () => {
    const { convertDatabaseTreesToSurvivalRecords, calculateZoneSurvivalMetrics } = await import(
      "@/lib/treeSurvivalEngine"
    );

    const mockDbTrees = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        tree_name: "Mahogany #101",
        species: "Mahogany",
        latitude: 19.8762,
        longitude: 75.3433,
        verification_status: "verified",
        height_cm: 140,
        photo_url: "https://example.com/tree1.jpg",
        created_at: "2024-03-01T00:00:00Z",
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        tree_name: "Neem #202",
        species: "Neem",
        latitude: 19.877,
        longitude: 75.344,
        verification_status: "pending",
        height_cm: 70,
        photo_url: "https://example.com/tree2.jpg",
        created_at: "2025-01-10T00:00:00Z",
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        tree_name: "Teak #303",
        species: "Teak",
        latitude: 19.878,
        longitude: 75.345,
        verification_status: "rejected",
        height_cm: 45,
        created_at: "2025-02-01T00:00:00Z",
      },
    ];

    const records = convertDatabaseTreesToSurvivalRecords(mockDbTrees, [19.87, 75.34], "Aurangabad Agro-Plot");
    expect(records.length).toBe(3);

    // Verified tree should have thriving status & high survival
    expect(records[0].treeName).toBe("Mahogany #101");
    expect(records[0].healthStatus).toBe("Thriving Canopy");
    expect(records[0].survivalProbability).toBeGreaterThanOrEqual(90);
    expect(records[0].currentNdvi).toBeGreaterThanOrEqual(0.74);
    expect(records[0].photoUrl).toBe("https://example.com/tree1.jpg");

    // Pending tree should have moderate growth
    expect(records[1].healthStatus).toBe("Moderate Growth");
    expect(records[1].survivalProbability).toBeGreaterThanOrEqual(75);

    // Rejected tree should have critical mortality risk
    expect(records[2].healthStatus).toBe("Critical Mortality Risk");
    expect(records[2].survivalProbability).toBeLessThanOrEqual(65);

    // Calculate zone metrics directly from database converted trees
    const zoneMock = {
      id: "proj-aurangabad",
      name: "Aurangabad CSR Project",
      district: "Chhatrapati Sambhajinagar",
      targetTrees: 3,
      center: [19.87, 75.34] as [number, number],
      species: ["Mahogany", "Neem", "Teak"],
      meanNdvi: 0.76,
      meanNdwi: 0.25,
    };

    const zoneAnalytics = calculateZoneSurvivalMetrics(zoneMock, records);
    expect(zoneAnalytics.totalMonitoredTrees).toBe(3);
    expect(zoneAnalytics.thrivingTreesCount).toBe(1);
    expect(zoneAnalytics.moderateGrowthCount).toBe(1);
    expect(zoneAnalytics.criticalRiskCount).toBe(1);
    expect(zoneAnalytics.satelliteAuditedSurvivalRate).toBeGreaterThan(60);
  });

  it("handles fetchDataSourceAuditList with demo mode and null values safely", async () => {
    const { fetchDataSourceAuditList } = await import("@/lib/databaseAuditService");
    const demoItems = await fetchDataSourceAuditList(true);
    expect(demoItems.length).toBeGreaterThan(0);
    const demoPreset = demoItems.find((i) => i.sourceType === "demo_preset");
    expect(demoPreset).toBeDefined();
    expect(demoPreset?.name).toContain("[DEMO]");
    expect(demoPreset?.creatorInfo).toContain("Synthetic Demo Simulator");
  }, 10000);

  it("toggles Demo Mode in ModuleASatelliteEngine and renders demo banner without crashing", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { getByLabelText, getByText } = render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <BrowserRouter>
            <ModuleASatelliteEngine trees={[]} />
          </BrowserRouter>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const toggle = getByLabelText(/Demo Mode/i);
    expect(toggle).toBeDefined();

    // Click demo mode toggle
    fireEvent.click(toggle);

    // Verify demo banner is rendered
    expect(getByText(/Demo Simulation Mode Active/i)).toBeDefined();
    expect(getByText(/Exit Demo Mode/i)).toBeDefined();
  });
});
