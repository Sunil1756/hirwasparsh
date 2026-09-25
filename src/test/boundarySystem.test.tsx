import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  validateDataSeparation,
  calculateAdditionalityMetrics,
  getSyntheticBoundarySystemData,
  fetchBoundarySystemData,
  BOUNDARY_LAYER_STYLES,
  ProjectCadastralArea,
  ExistingVegetationBaseline,
  PlantedTreesAdditionality,
} from "@/services/boundarySystemService";
import { BoundarySystemMapViewer } from "@/components/gis/BoundarySystemMapViewer";

// Stable Leaflet & React-Leaflet Mock
const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  getZoom: vi.fn(() => 15),
  getBounds: vi.fn(() => ({
    getSouth: () => 18.4,
    getWest: () => 73.4,
    getNorth: () => 18.5,
    getEast: () => 73.5,
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
  Polygon: ({ children, positions, pathOptions, eventHandlers }: any) => (
    <div
      data-testid="mock-polygon"
      data-color={pathOptions?.color}
      data-fill-color={pathOptions?.fillColor}
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

describe("PHASE 6 TASK 30: Boundary System & 3-Way Data Separation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Strict Data Separation Invariants", () => {
    it("validates synthetic dataset maintains perfect 3-way isolation", () => {
      const data = getSyntheticBoundarySystemData();
      const validation = validateDataSeparation(
        data.projectArea,
        data.existingVegetation,
        data.plantedTrees
      );

      expect(validation.isSeparated).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it("detects ID collision between Project Area and Existing Vegetation", () => {
      const data = getSyntheticBoundarySystemData();
      const invalidProjectArea = { ...data.projectArea, id: data.existingVegetation.id };

      const validation = validateDataSeparation(
        invalidProjectArea,
        data.existingVegetation,
        data.plantedTrees
      );

      expect(validation.isSeparated).toBe(false);
      expect(validation.violations.some((v) => v.includes("collides"))).toBe(true);
    });

    it("detects cross-contamination when baseline polygons appear in planted trees registry", () => {
      const data = getSyntheticBoundarySystemData();
      const contaminatedPlantedTrees: PlantedTreesAdditionality = {
        ...data.plantedTrees,
        trees: [
          ...data.plantedTrees.trees,
          {
            id: data.existingVegetation.canopyPolygons[0].id, // Contaminated with baseline polygon ID!
            treeName: "Contaminated Fake Tree",
            species: "Ficus religiosa",
            vernacularName: "Peepal",
            family: "Moraceae",
            projectId: data.projectArea.projectId,
            projectName: data.projectArea.projectName,
            latitude: 18.473,
            longitude: 73.435,
            survivalStatus: "ALIVE",
            heightCm: 180,
            plantedAt: "2025-06-01",
            lastMonitoredAt: "2026-03-01",
            healthScore: 90,
            photoUrl: "",
            estimatedBiomassKgCo2e: 45,
            gpsAccuracyMeters: 2.1,
            qrToken: "QR-CONTAM",
          },
        ],
      };

      const validation = validateDataSeparation(
        data.projectArea,
        data.existingVegetation,
        contaminatedPlantedTrees
      );

      expect(validation.isSeparated).toBe(false);
      expect(
        validation.violations.some((v) => v.includes("detected inside the Planted Trees registry"))
      ).toBe(true);
    });

    it("detects land budget over-allocation violations", () => {
      const data = getSyntheticBoundarySystemData();
      const oversizedPlantedTrees = {
        ...data.plantedTrees,
        plantedAreaHectares: 50.0, // Exceeds gross land budget
      };

      const validation = validateDataSeparation(
        data.projectArea,
        data.existingVegetation,
        oversizedPlantedTrees
      );

      expect(validation.isSeparated).toBe(false);
      expect(validation.violations.some((v) => v.includes("exceeds gross project boundary"))).toBe(
        true
      );
    });
  });

  describe("2. Additionality Metrics & Baseline Biomass Deduction", () => {
    it("calculates additionality metrics with isolated baseline biomass deduction", () => {
      const data = getSyntheticBoundarySystemData();
      const metrics = calculateAdditionalityMetrics(
        data.projectArea,
        data.existingVegetation,
        data.plantedTrees
      );

      expect(metrics.grossLandHectares).toBe(45.0);
      expect(metrics.baselineCanopyHectares).toBe(10.1);
      expect(metrics.newPlantedHectares).toBe(25.0);
      expect(metrics.availablePlantableHectares).toBe(9.9); // 45 - 10.1 - 25

      // Isolated biomass checks
      expect(metrics.baselineStandingBiomassTCo2e).toBe(454.5);
      expect(metrics.netAdditionalityBiomassTCo2e).toBe(844.8);
      expect(metrics.totalEcosystemBiomassTCo2e).toBe(1299.3); // 454.5 + 844.8
      expect(metrics.dataSeparationCertified).toBe(true);
    });
  });

  describe("3. Layer Visual Styling Standards", () => {
    it("enforces distinct styling across the three separate layers", () => {
      // Project Cadastral Area: Indigo
      expect(BOUNDARY_LAYER_STYLES.projectArea.color).toBe("#6366f1");

      // Baseline Vegetation: Olive Green with dashed border
      expect(BOUNDARY_LAYER_STYLES.existingVegetation.dense_canopy.color).toBe("#166534");
      expect(BOUNDARY_LAYER_STYLES.existingVegetation.dense_canopy.dashArray).toBe("4, 4");

      // Planted Trees: Neon Emerald
      expect(BOUNDARY_LAYER_STYLES.plantedTrees.color).toBe("#10b981");
      expect(BOUNDARY_LAYER_STYLES.plantedTrees.markerGlow).toBe("#22c55e");
    });
  });

  describe("4. Asynchronous Boundary Service Fetch", () => {
    it("fetches boundary system data without errors", async () => {
      const data = await fetchBoundarySystemData("proj-pune-western-ghats");
      expect(data).toBeDefined();
      expect(data.projectArea.cadastralParcelId).toBe("MAH-PUN-MUL-482/2");
      expect(data.existingVegetation.canopyPolygons.length).toBeGreaterThan(0);
      expect(data.plantedTrees.trees.length).toBeGreaterThan(0);
    });
  });

  describe("5. BoundarySystemMapViewer Component Rendering", () => {
    it("renders boundary system controls, layer toggles, and invariant banner", async () => {
      render(
        <BrowserRouter>
          <BoundarySystemMapViewer projectId="proj-pune-western-ghats" />
        </BrowserRouter>
      );

      // Wait for loading to finish
      const headerSubtitle = await screen.findByText(/Strict 3-Way MRV Dataset Segregation/i, {}, { timeout: 3000 });
      expect(headerSubtitle).toBeInTheDocument();

      // Check Golden Rule banner
      expect(screen.getByText(/Golden Rule Invariant:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/454.5 tCO₂e/i).length).toBeGreaterThan(0);

      // Check 3 Layer Toggles
      expect(screen.getByText(/1. Project Cadastral Area/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Existing Baseline Vegetation/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Planted Trees/i)).toBeInTheDocument();

      // Check Additionality Ledger summary
      expect(screen.getByText(/Additionality Ledger/i)).toBeInTheDocument();
      expect(screen.getAllByText(/844.8 tCO₂e/i).length).toBeGreaterThan(0);
    });

    it("allows clicking a project cadastral zone or baseline canopy to inspect details", async () => {
      render(
        <BrowserRouter>
          <BoundarySystemMapViewer projectId="proj-pune-western-ghats" />
        </BrowserRouter>
      );

      await screen.findByText(/Strict 3-Way MRV Dataset Segregation/i, {}, { timeout: 3000 });

      // Click Project Cadastral Area card to inspect
      const projectCard = screen.getByText(/1. Project Cadastral Area/i).closest("div");
      if (projectCard) {
        fireEvent.click(projectCard);
      }

      // Floating inspector should show Cadastral ID
      await waitFor(() => {
        expect(screen.getByText(/Cadastral ID:/i)).toBeInTheDocument();
        expect(screen.getByText("MAH-PUN-MUL-482/2")).toBeInTheDocument();
      });
    });
  });
});
