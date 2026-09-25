import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  fetchRealTreeMapData,
  getSyntheticRealTrees,
  validateTreeCoordinate,
  formatTreeCoordinates,
  getTreeMarkerGlowColor,
  TreeMapFilterParams,
} from "@/services/treeMapService";
import { TreeMapViewer } from "@/components/gis/TreeMapViewer";

// Stable Leaflet & React-Leaflet Mock
const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  getZoom: vi.fn(() => 14),
  getBounds: vi.fn(() => ({
    getSouth: () => 18.0,
    getWest: () => 73.0,
    getNorth: () => 21.5,
    getEast: () => 79.5,
  })),
};

vi.mock("leaflet", () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn((opts) => opts),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="mock-map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  ZoomControl: () => <div data-testid="mock-zoom-control" />,
  ScaleControl: () => <div data-testid="mock-scale-control" />,
  Marker: ({ children, position, eventHandlers }: any) => (
    <div
      data-testid="mock-tree-marker"
      data-lat={position?.[0]}
      data-lng={position?.[1]}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Circle: ({ center, radius }: any) => (
    <div data-testid="mock-accuracy-circle" data-center={center} data-radius={radius} />
  ),
  Popup: ({ children }: any) => <div data-testid="mock-popup">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="mock-tooltip">{children}</div>,
  useMap: () => mockMap,
  useMapEvents: vi.fn((handlers) => handlers),
}));

describe("PHASE 6: Multi-Dimensional Map Filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Individual Filter Dimensions (Service Layer)", () => {
    it("filters trees by Organization correctly", async () => {
      const res = await fetchRealTreeMapData({ organizationId: "org-sah-01" });
      expect(res.trees.length).toBeGreaterThan(0);
      expect(res.trees.every((t) => t.organizationId === "org-sah-01")).toBe(true);
      expect(res.trees.some((t) => t.organizationName === "Sahyadri Bio-Shield Foundation")).toBe(true);
    });

    it("filters trees by Project correctly", async () => {
      const res = await fetchRealTreeMapData({ projectId: "proj-marathwada-agroforestry" });
      expect(res.trees.length).toBeGreaterThan(0);
      expect(res.trees.every((t) => t.projectId === "proj-marathwada-agroforestry")).toBe(true);
      expect(res.trees.some((t) => t.species.includes("Neem") || t.species.includes("Amla"))).toBe(true);
    });

    it("filters trees by Species correctly", async () => {
      const res = await fetchRealTreeMapData({ species: "Banyan (Ficus benghalensis)" });
      expect(res.trees.length).toBeGreaterThan(0);
      expect(res.trees.every((t) => t.species === "Banyan (Ficus benghalensis)")).toBe(true);
    });

    it("filters trees by Tree Status / Survival Status correctly", async () => {
      const stressedRes = await fetchRealTreeMapData({ survivalStatus: "STRESSED" });
      expect(stressedRes.trees.length).toBeGreaterThan(0);
      expect(stressedRes.trees.every((t) => t.survivalStatus === "STRESSED")).toBe(true);

      const deadRes = await fetchRealTreeMapData({ survivalStatus: "DEAD" });
      expect(deadRes.trees.length).toBeGreaterThan(0);
      expect(deadRes.trees.every((t) => t.survivalStatus === "DEAD")).toBe(true);
    });

    it("filters trees by Monitoring Status correctly", async () => {
      const overdueRes = await fetchRealTreeMapData({ monitoringStatus: "overdue" });
      expect(overdueRes.trees.length).toBeGreaterThan(0);
      expect(overdueRes.trees.every((t) => t.monitoringStatus === "overdue")).toBe(true);

      const upToDateRes = await fetchRealTreeMapData({ monitoringStatus: "up_to_date" });
      expect(upToDateRes.trees.length).toBeGreaterThan(0);
      expect(upToDateRes.trees.every((t) => t.monitoringStatus === "up_to_date")).toBe(true);
    });

    it("filters trees by Date window and custom range correctly", async () => {
      const res1y = await fetchRealTreeMapData({ dateWindow: "1y" });
      expect(res1y.trees.length).toBeGreaterThan(0);

      const resCustom = await fetchRealTreeMapData({
        dateWindow: "custom",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      });
      expect(resCustom.trees.length).toBeGreaterThan(0);
      expect(
        resCustom.trees.every((t) => {
          const d = new Date(t.plantedDate).getTime();
          return d >= new Date("2025-06-01").getTime() && d <= new Date("2025-07-01").getTime();
        })
      ).toBe(true);
    });
  });

  describe("2. Combined Multi-Dimensional Filter Intersection", () => {
    it("applies multiple filters simultaneously (Org + Status + Species)", async () => {
      const res = await fetchRealTreeMapData({
        organizationId: "org-sah-01",
        survivalStatus: "ALIVE",
        species: "Peepal (Ficus religiosa)",
      });

      expect(res.trees.length).toBe(1);
      expect(res.trees[0].treeName).toContain("Peepal");
      expect(res.trees[0].organizationId).toBe("org-sah-01");
      expect(res.trees[0].survivalStatus).toBe("ALIVE");
      expect(res.activeFilterCount).toBe(3);
    });

    it("returns zero results gracefully when filter combinations yield no matches", async () => {
      const res = await fetchRealTreeMapData({
        organizationId: "org-sah-01",
        species: "Red Mangrove (Rhizophora mucronata)", // Mangroves are in Roha (Tata CSR), not Mulshi
      });

      expect(res.trees).toHaveLength(0);
      expect(res.totalTrees).toBe(0);
      expect(res.aliveCount).toBe(0);
    });
  });

  describe("3. Dynamic Dropdown Metadata Options", () => {
    it("provides populated organizations and projects lists for UI selects", async () => {
      const res = await fetchRealTreeMapData();

      expect(res.organizationsList.length).toBeGreaterThan(0);
      expect(res.organizationsList.some((o) => o.name === "Sahyadri Bio-Shield Foundation")).toBe(true);

      expect(res.projectsList.length).toBeGreaterThan(0);
      expect(res.projectsList.some((p) => p.name === "Sahyadri Bio-Shield Reforestation")).toBe(true);

      expect(res.speciesList.length).toBeGreaterThan(0);
    });
  });

  describe("4. TreeMapViewer UI Component with 6 Filter Controls", () => {
    it("renders all 6 filter controls (Organization, Project, Species, Status, Cadence, Date)", async () => {
      render(
        <BrowserRouter>
          <TreeMapViewer />
        </BrowserRouter>
      );

      // Wait for UI to load
      const headerTitle = await screen.findByText(/Tree Registry GIS/i, {}, { timeout: 3000 });
      expect(headerTitle).toBeInTheDocument();

      // Check all 6 filter labels
      expect(screen.getAllByText(/Organization/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Project/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Species/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tree Status/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Monitoring Status/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Date Window/i).length).toBeGreaterThan(0);
    });

    it("renders search input and allows typing coordinates or species", async () => {
      render(
        <BrowserRouter>
          <TreeMapViewer />
        </BrowserRouter>
      );

      await screen.findByText(/Tree Registry GIS/i, {}, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/Search by code, species, or lat, lng/i);
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "Mangrove" } });

      await waitFor(() => {
        expect(screen.getAllByText(/Red Mangrove/i).length).toBeGreaterThan(0);
      });
    });
  });
});
