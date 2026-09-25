import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  extractPolygonCoordinates,
  calculateProjectBounds,
  getBoundaryStyle,
  getProjectMarkerHtml,
  getSyntheticProjectMapData,
  fetchProjectMapData,
  ProjectMapFeature,
} from "@/services/projectMapService";
import { ProjectMapViewer } from "@/components/gis/ProjectMapViewer";

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
      data-testid="mock-project-marker"
      data-lat={position?.[0]}
      data-lng={position?.[1]}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="mock-popup">{children}</div>,
  Polygon: ({ children, positions, pathOptions, eventHandlers }: any) => (
    <div
      data-testid="mock-project-polygon"
      data-color={pathOptions?.color}
      data-fill={pathOptions?.fillColor}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: any) => <div data-testid="mock-tooltip">{children}</div>,
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
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

describe("Phase 6 Task 28 — Project Maps & Boundary GIS Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Polygon Coordinate Extraction & Parsing", () => {
    it("extracts coordinate rings from GeoJSON Polygon structure", () => {
      const geoJsonPolygon = {
        type: "Polygon",
        coordinates: [
          [
            [73.432, 18.475],
            [73.438, 18.478],
            [73.442, 18.473],
            [73.432, 18.475],
          ],
        ],
      };

      const rings = extractPolygonCoordinates(geoJsonPolygon);
      expect(rings).toHaveLength(1);
      expect(rings[0]).toHaveLength(4);
      // Validates conversion from GeoJSON [lng, lat] to Leaflet [lat, lng]
      expect(rings[0][0]).toEqual([18.475, 73.432]);
      expect(rings[0][1]).toEqual([18.478, 73.438]);
    });

    it("extracts multi-polygon rings from GeoJSON MultiPolygon structure", () => {
      const geoJsonMultiPolygon = {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [73.43, 18.47],
              [73.44, 18.47],
              [73.44, 18.48],
              [73.43, 18.47],
            ],
          ],
          [
            [
              [73.45, 18.49],
              [73.46, 18.49],
              [73.46, 18.50],
              [73.45, 18.49],
            ],
          ],
        ],
      };

      const rings = extractPolygonCoordinates(geoJsonMultiPolygon);
      expect(rings).toHaveLength(2);
      expect(rings[0][0]).toEqual([18.47, 73.43]);
      expect(rings[1][0]).toEqual([18.49, 73.45]);
    });

    it("handles raw points array gracefully", () => {
      const rawPoints = [
        [18.47, 73.43],
        [18.48, 73.44],
        [18.47, 73.45],
      ];
      const rings = extractPolygonCoordinates(rawPoints);
      expect(rings).toHaveLength(1);
      expect(rings[0]).toEqual(rawPoints);
    });

    it("returns empty array for invalid or empty geometry", () => {
      expect(extractPolygonCoordinates(null)).toEqual([]);
      expect(extractPolygonCoordinates({})).toEqual([]);
      expect(extractPolygonCoordinates({ type: "Point", coordinates: [73.4, 18.4] })).toEqual([]);
    });
  });

  describe("2. Project Bounding Box & Centroid Calculations", () => {
    it("calculates tight bounding box covering centroid and all cadastral boundaries", () => {
      const centroid: [number, number] = [18.4725, 73.4358];
      const boundaries = [
        {
          id: "bnd-1",
          projectId: "p-1",
          boundaryName: "Planting Zone A",
          boundaryType: "planting_zone" as const,
          areaSqm: 10000,
          areaHectares: 1,
          areaAcres: 2.47,
          coordinates: [
            [
              [18.46, 73.42],
              [18.49, 73.45],
              [18.46, 73.45],
            ],
          ],
        },
      ];

      const bounds = calculateProjectBounds(centroid, boundaries);
      expect(bounds.minLat).toBe(18.46);
      expect(bounds.minLng).toBe(73.42);
      expect(bounds.maxLat).toBe(18.49);
      expect(bounds.maxLng).toBe(73.45);
    });
  });

  describe("3. Boundary Styling & Marker Markup", () => {
    it("returns correct color codes for all 4 cadastral boundary types", () => {
      const plantingStyle = getBoundaryStyle("planting_zone", false);
      expect(plantingStyle.color).toBe("#10b981"); // Emerald green
      expect(plantingStyle.fillColor).toBe("#10b981");

      const bufferStyle = getBoundaryStyle("buffer_zone", false);
      expect(bufferStyle.color).toBe("#f59e0b"); // Amber
      expect(bufferStyle.dashArray).toBe("6, 6");

      const exclusionStyle = getBoundaryStyle("exclusion_zone", false);
      expect(exclusionStyle.color).toBe("#ef4444"); // Red
      expect(exclusionStyle.dashArray).toBe("3, 3");

      const waterbodyStyle = getBoundaryStyle("waterbody", false);
      expect(waterbodyStyle.color).toBe("#06b6d4"); // Cyan

      // Selected state increases border weight and opacity
      const selectedPlanting = getBoundaryStyle("planting_zone", true);
      expect(selectedPlanting.weight).toBe(3.5);
      expect(selectedPlanting.fillOpacity).toBe(0.45);
    });

    it("generates project marker HTML containing project type icon and tree badge", () => {
      const syntheticProj = getSyntheticProjectMapData()[0];
      const html = getProjectMarkerHtml(syntheticProj, false);

      expect(html).toContain("project-map-marker");
      expect(html).toContain("38.4k"); // Planted trees badge
      expect(html).toContain("🌲"); // Forestry icon
    });
  });

  describe("4. Project Map Service & Multi-Attribute Filtering", () => {
    it("fetches comprehensive project map dataset with boundaries", async () => {
      const result = await fetchProjectMapData();

      expect(result.projects.length).toBeGreaterThanOrEqual(4);
      expect(result.totalProjects).toBeGreaterThanOrEqual(4);
      expect(result.totalHectares).toBeGreaterThan(100);
      expect(result.totalPlantedTrees).toBeGreaterThan(50000);
      expect(result.overallBoundingBox).toBeDefined();

      const sahyadri = result.projects.find((p) => p.id === "proj-pune-western-ghats");
      expect(sahyadri).toBeDefined();
      expect(sahyadri?.locationName).toContain("Tamhini");
      expect(sahyadri?.boundaries).toHaveLength(3);
    });

    it("filters projects by status, project type, and search query", async () => {
      // Filter by type: agroforestry
      const agroResult = await fetchProjectMapData({ projectType: "agroforestry" });
      expect(agroResult.projects.every((p) => p.projectType === "agroforestry")).toBe(true);

      // Filter by search query: "Mangrove"
      const mangroveResult = await fetchProjectMapData({ searchQuery: "Mangrove" });
      expect(mangroveResult.projects).toHaveLength(1);
      expect(mangroveResult.projects[0].name).toContain("Mangrove");

      // Filter by status: "under_review"
      const reviewResult = await fetchProjectMapData({ status: "under_review" });
      expect(reviewResult.projects.every((p) => p.status === "under_review")).toBe(true);
    });
  });

  describe("5. ProjectMapViewer UI Component", () => {
    it("renders ProjectMapViewer with navigation sidebar, map viewport, and markers", async () => {
      const onSelectMock = vi.fn();

      render(
        <BrowserRouter>
          <ProjectMapViewer onSelectProject={onSelectMock} height={600} />
        </BrowserRouter>
      );

      // Verify Header and Summary Badges
      expect(screen.getByText("Project GIS Explorer")).toBeDefined();
      expect(screen.getByPlaceholderText(/Search by project, location, NGO/i)).toBeDefined();

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getAllByText("Sahyadri Bio-Shield Reforestation").length).toBeGreaterThanOrEqual(1);
      });

      // Verify Cadastral Layer toggle buttons
      expect(screen.getByRole("button", { name: /Planting Zones/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Buffer Zones/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Exclusion/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Waterbodies/i })).toBeDefined();

      // Click on a project in the list
      const projectCard = screen.getAllByText("Sahyadri Bio-Shield Reforestation")[0];
      fireEvent.click(projectCard);

      expect(onSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "proj-pune-western-ghats" })
      );

      // Verify Bottom HUD Inspector appears
      await waitFor(() => {
        expect(screen.getAllByText(/Tamhini Ghat, Mulshi/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole("button", { name: /Open Project/i })).toBeDefined();
      });
    });
  });
});
