import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  validateTreeCoordinate,
  formatTreeCoordinates,
  getTreeMarkerGlowColor,
  getTreeDivIconHtml,
  getSyntheticRealTrees,
  fetchRealTreeMapData,
  RealTreeFeature,
} from "@/services/treeMapService";
import { TreeMapViewer } from "@/components/gis/TreeMapViewer";

// Mock stable leaflet & react-leaflet
const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  getZoom: vi.fn(() => 13),
  getBounds: vi.fn(() => ({
    getSouth: () => 18.4,
    getWest: () => 73.0,
    getNorth: () => 21.2,
    getEast: () => 79.1,
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
  Circle: ({ children, center, radius, pathOptions }: any) => (
    <div
      data-testid="mock-accuracy-circle"
      data-lat={center?.[0]}
      data-lng={center?.[1]}
      data-radius={radius}
      data-color={pathOptions?.color}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="mock-popup">{children}</div>,
  useMap: () => mockMap,
  useMapEvents: vi.fn((handlers) => ({
    mousemove: handlers?.mousemove,
    mouseout: handlers?.mouseout,
    zoomend: handlers?.zoomend,
    moveend: handlers?.moveend,
  })),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

describe("Phase 6 Task 29 — Tree Maps & Real Coordinate GIS Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Real Geodetic Coordinate Validation", () => {
    it("validates legitimate coordinates within Indian territorial bounds", () => {
      expect(validateTreeCoordinate(18.473521, 73.436102)).toBe(true); // Tamhini, Pune
      expect(validateTreeCoordinate(19.481234, 75.386128)).toBe(true); // Paithan, Sambhajinagar
      expect(validateTreeCoordinate(21.127891, 79.042104)).toBe(true); // Nagpur
      expect(validateTreeCoordinate(18.439812, 73.016421)).toBe(true); // Raigad Mangroves

      // Invalid coordinates outside India or invalid values
      expect(validateTreeCoordinate(51.5074, -0.1278)).toBe(false); // London, UK
      expect(validateTreeCoordinate(95.0, 73.0)).toBe(false); // Lat > 90
      expect(validateTreeCoordinate(null, 73.0)).toBe(false);
      expect(validateTreeCoordinate(18.0, NaN)).toBe(false);
    });

    it("formats coordinates in Decimal Degrees, DMS, and Google Maps URL", () => {
      const formatted = formatTreeCoordinates(18.473521, 73.436102);

      expect(formatted.decimal).toContain("18.473521°N, 73.436102°E");
      expect(formatted.dms).toContain('18°28\'24.68"N');
      expect(formatted.dms).toContain('73°26\'9.97"E');
      expect(formatted.googleMapsUrl).toBe(
        "https://www.google.com/maps/search/?api=1&query=18.473521,73.436102"
      );
    });
  });

  describe("2. 6-Tier Survival Status Color Token Mapping", () => {
    it("maps survival statuses to semantic color tokens", () => {
      expect(getTreeMarkerGlowColor("ALIVE")).toBe("#22c55e");
      expect(getTreeMarkerGlowColor("STRESSED")).toBe("#f59e0b");
      expect(getTreeMarkerGlowColor("DAMAGED")).toBe("#f97316");
      expect(getTreeMarkerGlowColor("DEAD")).toBe("#ef4444");
      expect(getTreeMarkerGlowColor("NEEDS_REVIEW")).toBe("#a855f7");
      expect(getTreeMarkerGlowColor("UNKNOWN", "verified")).toBe("#22c55e");
      expect(getTreeMarkerGlowColor("UNKNOWN", "rejected")).toBe("#ef4444");
    });

    it("generates glowing HTML marker markup for Leaflet DivIcon", () => {
      const tree = getSyntheticRealTrees()[0];
      const html = getTreeDivIconHtml(tree, false);

      expect(html).toContain("real-tree-marker");
      expect(html).toContain("tgm-pulse");
      expect(html).toContain("#22c55e"); // Alive color

      const selectedHtml = getTreeDivIconHtml(tree, true);
      expect(selectedHtml).toContain("is-selected");
    });
  });

  describe("3. Real Tree Map Service & Filtering", () => {
    it("fetches comprehensive tree map data with bounding box and status breakdown", async () => {
      const result = await fetchRealTreeMapData();

      expect(result.trees.length).toBeGreaterThanOrEqual(6);
      expect(result.totalTrees).toBeGreaterThanOrEqual(6);
      expect(result.aliveCount).toBeGreaterThanOrEqual(3);
      expect(result.stressedCount).toBeGreaterThanOrEqual(1);
      expect(result.needsReviewCount).toBeGreaterThanOrEqual(1);
      expect(result.overallBoundingBox).toBeDefined();
      expect(result.centroid).toBeDefined();
      expect(result.speciesList.length).toBeGreaterThanOrEqual(4);
    });

    it("filters trees by scope, survival status, and search query", async () => {
      // Filter by survival status: STRESSED
      const stressedResult = await fetchRealTreeMapData({ survivalStatus: "STRESSED" });
      expect(stressedResult.trees.every((t) => t.survivalStatus === "STRESSED")).toBe(true);

      // Filter by species: Banyan
      const banyanResult = await fetchRealTreeMapData({ species: "Banyan (Ficus benghalensis)" });
      expect(banyanResult.trees).toHaveLength(1);
      expect(banyanResult.trees[0].species).toContain("Banyan");

      // Search by tree code: TRE-2025-001
      const codeResult = await fetchRealTreeMapData({ searchQuery: "TRE-2025-001" });
      expect(codeResult.trees).toHaveLength(1);
      expect(codeResult.trees[0].treeCode).toBe("TRE-2025-001");

      // Search by exact coordinates: 18.4735
      const coordResult = await fetchRealTreeMapData({ searchQuery: "18.4735" });
      expect(coordResult.trees.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. TreeMapViewer UI Component", () => {
    it("renders TreeMapViewer with real coordinates, accuracy rings, and sidebar list", async () => {
      const onSelectMock = vi.fn();

      render(
        <BrowserRouter>
          <TreeMapViewer onSelectTree={onSelectMock} height={600} />
        </BrowserRouter>
      );

      // Verify Header and Search Box
      expect(screen.getByText("Tree Registry GIS")).toBeDefined();
      expect(screen.getByPlaceholderText(/Search by code, species, or lat, lng/i)).toBeDefined();

      // Wait for trees to render in the sidebar
      await waitFor(() => {
        expect(screen.getAllByText("Ancient Banyan Heritage #01").length).toBeGreaterThanOrEqual(1);
      });

      // Verify GPS Accuracy Buffers switch
      expect(screen.getByLabelText(/GPS Accuracy Buffers/i)).toBeDefined();

      // Click on a tree item in the list
      const treeCard = screen.getAllByText("Ancient Banyan Heritage #01")[0];
      fireEvent.click(treeCard);

      expect(onSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "tree-geo-001" })
      );

      // Verify Bottom HUD Inspector appears with exact coordinates
      await waitFor(() => {
        expect(screen.getAllByText(/18.473521°, 73.436102°/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole("button", { name: /View Passport/i })).toBeDefined();
      });
    });
  });
});
