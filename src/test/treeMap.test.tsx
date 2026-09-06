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
  Circle: ({ children }: any) => <div data-testid="circle">{children}</div>,
  Polyline: ({ children }: any) => <div data-testid="polyline">{children}</div>,
  useMap: () => ({
    flyTo: vi.fn(),
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
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
});
