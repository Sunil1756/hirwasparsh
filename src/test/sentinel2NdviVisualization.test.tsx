import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
  computeSpectralIndicesFromBands,
  fetchRealSentinel2Telemetry,
  fetchTreeCoordinateNdvi,
} from "@/lib/sentinel2RealService";
import { TreeNdviSatelliteViewer } from "@/components/TreeNdviSatelliteViewer";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user" } } })),
      },
    },
  };
});

// Mock Recharts ResponsiveContainer for happy testing
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 200 }}>{children}</div>,
  };
});

describe("Sentinel-2 API Integration & NDVI Vegetation Index Telemetry Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Multi-Spectral Mathematical Formula Verification", () => {
    it("computes exact NDVI from Red (B04) and NIR (B08) reflectance bands", () => {
      // Healthy dense canopy: B08 NIR = 0.50, B04 Red = 0.05
      // NDVI = (0.50 - 0.05) / (0.50 + 0.05) = 0.45 / 0.55 = 0.818 -> 0.82
      const result = computeSpectralIndicesFromBands({
        b02Blue: 0.035,
        b03Green: 0.09,
        b04Red: 0.05,
        b05RedEdge: 0.20,
        b08Nir: 0.50,
        b11Swir: 0.12,
      });

      expect(result.ndvi).toBeCloseTo(0.82, 2);
      expect(result.canopyCoveragePct).toBeGreaterThanOrEqual(80);
      expect(result.classification).toContain("Dense Healthy Canopy");
    });

    it("computes NDRE, NDWI, EVI, and SAVI correctly", () => {
      const result = computeSpectralIndicesFromBands({
        b02Blue: 0.04,
        b03Green: 0.08,
        b04Red: 0.06,
        b05RedEdge: 0.18,
        b08Nir: 0.44,
        b11Swir: 0.15,
      });

      // NDRE = (0.44 - 0.18) / (0.44 + 0.18) = 0.26 / 0.62 = 0.419 -> 0.42
      expect(result.ndre).toBeCloseTo(0.42, 2);

      // NDWI = (0.08 - 0.44) / (0.08 + 0.44) = -0.36 / 0.52 = -0.69
      expect(result.ndwi).toBeLessThan(0);

      // EVI > 0
      expect(result.evi).toBeGreaterThan(0);

      // SAVI > 0
      expect(result.savi).toBeGreaterThan(0);
    });

    it("correctly flags barren/non-vegetated terrain when NDVI is low", () => {
      // Barren soil: B08 NIR = 0.15, B04 Red = 0.14 -> NDVI ~ 0.03
      const result = computeSpectralIndicesFromBands({
        b02Blue: 0.08,
        b03Green: 0.10,
        b04Red: 0.14,
        b05RedEdge: 0.14,
        b08Nir: 0.15,
        b11Swir: 0.25,
      });

      expect(result.ndvi).toBeLessThan(0.28);
      expect(result.classification).toContain("Barren / Non-Vegetated");
    });
  });

  describe("2. Tree Coordinate NDVI Telemetry & Time Series Generation", () => {
    it("fetches Sentinel-2 telemetry and produces 6-month historical NDVI points for tree GPS", async () => {
      const telemetry = await fetchTreeCoordinateNdvi({
        treeId: "tree-sample-999",
        latitude: 18.5204,
        longitude: 73.8567,
        treeName: "Sacred Neem Tree",
        species: "Azadirachta indica",
      });

      expect(telemetry.latitude).toBe(18.5204);
      expect(telemetry.longitude).toBe(73.8567);
      expect(telemetry.tileId).toBeDefined();
      expect(telemetry.ndvi).toBeGreaterThan(0);
      expect(telemetry.vegetationVigorStatus).toBeDefined();

      // Verify 6-month historical points
      expect(telemetry.historicalTimeSeries).toHaveLength(6);
      expect(telemetry.historicalTimeSeries[5].ndvi).toBe(telemetry.ndvi);
      expect(telemetry.historicalTimeSeries[0].month).toBeDefined();
      expect(telemetry.historicalTimeSeries[0].phenologyStage).toBeDefined();
    });
  });

  describe("3. TreeNdviSatelliteViewer Component Rendering", () => {
    it("renders Sentinel-2 NDVI gauge, spectral breakdown, and trajectory chart", async () => {
      render(
        <TreeNdviSatelliteViewer
          treeId="tree-demo-1"
          latitude={18.5204}
          longitude={73.8567}
          treeName="Western Ghats Banyan"
          species="Ficus benghalensis"
        />
      );

      // Wait for telemetry to load
      await waitFor(() => {
        expect(screen.getByText(/Copernicus Sentinel-2 L2A Telemetry/i)).toBeInTheDocument();
      });

      // Verify NDVI gauge & 10m GSD Optical badge
      expect(screen.getByText(/10m GSD Optical/i)).toBeInTheDocument();
      expect(screen.getByText(/Mean NDVI/i)).toBeInTheDocument();
      expect(screen.getByText(/6-Month Vegetation Accretion Trajectory/i)).toBeInTheDocument();

      // Test multi-spectral switcher button
      const ndreBtn = screen.getByRole("button", { name: "NDRE" });
      fireEvent.click(ndreBtn);

      expect(screen.getByText(/NDRE Chlorophyll/i)).toBeInTheDocument();
    });
  });
});
