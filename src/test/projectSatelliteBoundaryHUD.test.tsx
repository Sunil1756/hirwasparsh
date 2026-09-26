import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectSatelliteBoundaryHUD } from "../components/gis/ProjectSatelliteBoundaryHUD";
import { ProjectMapFeature } from "../services/projectMapService";
import { projectGeometrySatelliteService } from "../services/projectGeometrySatelliteService";

const mockProjectFeature: ProjectMapFeature = {
  id: "proj-sahayadri",
  name: "Sahayadri Tiger Reserve Afforestation",
  description: "B2B Agroforestry and Corridor Reforestation Project",
  projectType: "agroforestry",
  status: "active",
  locationName: "Western Ghats, Maharashtra",
  centroid: [18.5204, 73.8567],
  targetTrees: 100000,
  plantedTrees: 45000,
  targetAreaHectares: 1420,
  actualAreaHectares: 1250,
  boundaries: [
    {
      id: "b-001",
      projectId: "proj-sahayadri",
      boundaryName: "Compartment A1 - Upper Canopy",
      boundaryType: "planting_zone",
      coordinates: [
        [
          [18.52, 73.85],
          [18.54, 73.85],
          [18.54, 73.87],
          [18.52, 73.87],
          [18.52, 73.85],
        ],
      ],
      areaSqm: 12500000,
      areaHectares: 1250,
      areaAcres: 3088,
    },
  ],
  bounds: {
    minLat: 18.52,
    minLng: 73.85,
    maxLat: 18.54,
    maxLng: 73.87,
  },
  survivalRatePct: 92,
  createdDate: "2024-01-15",
};

const switchTab = (tabElement: HTMLElement) => {
  fireEvent.pointerDown(tabElement, { button: 0 });
  fireEvent.mouseDown(tabElement, { button: 0 });
  fireEvent.click(tabElement);
  fireEvent.keyDown(tabElement, { key: "Enter", code: "Enter" });
};

describe("PHASE 10 TASK 54 — Project Satellite Boundary HUD Component Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Renders loading state initially, then displays project satellite boundary telemetry", async () => {
    render(<ProjectSatelliteBoundaryHUD project={mockProjectFeature} />);

    await waitFor(() => {
      expect(screen.getByTestId("project-satellite-boundary-hud")).toBeInTheDocument();
    });

    expect(screen.getByText("Sahayadri Tiger Reserve Afforestation")).toBeInTheDocument();
    expect(screen.getByText(/Live Sentinel-2 L2A Connection/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ha/i).length).toBeGreaterThan(0);
  });

  it("2. Displays multi-spectral indices (NDVI, NDRE, Biomass, Carbon Accrual)", async () => {
    render(<ProjectSatelliteBoundaryHUD project={mockProjectFeature} />);

    await waitFor(() => {
      expect(screen.getByText(/Mean Canopy NDVI/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Red Edge \(NDRE\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Standing Biomass/i)).toBeInTheDocument();
    expect(screen.getByText(/Carbon Accrual/i)).toBeInTheDocument();
  });

  it("3. Switches to Plots & Quadrats tab and renders stratified sampling plots", async () => {
    render(<ProjectSatelliteBoundaryHUD project={mockProjectFeature} />);

    await waitFor(() => {
      expect(screen.getByTestId("project-satellite-boundary-hud")).toBeInTheDocument();
    });

    const plotsTab = screen.getByRole("tab", { name: /Plots & Quadrats/i });
    switchTab(plotsTab);

    await waitFor(() => {
      expect(screen.getByText(/Stratified spatial sample plots inside project boundary polygon/i)).toBeInTheDocument();
      expect(screen.getAllByText(/PLOT-/i).length).toBeGreaterThan(0);
    });
  });

  it("4. Switches to Agro-Climatic Feed tab and renders soil moisture and VPD metrics", async () => {
    render(<ProjectSatelliteBoundaryHUD project={mockProjectFeature} />);

    await waitFor(() => {
      expect(screen.getByTestId("project-satellite-boundary-hud")).toBeInTheDocument();
    });

    const weatherTab = screen.getByRole("tab", { name: /Agro-Climatic Feed/i });
    switchTab(weatherTab);

    await waitFor(() => {
      expect(screen.getByText(/Topsoil Moisture \(0-7cm\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Rootzone Moisture \(7-28cm\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Vapor Pressure Deficit/i)).toBeInTheDocument();
      expect(screen.getByText(/Drought Stress Score/i)).toBeInTheDocument();
    });
  });

  it("5. Switches to STAC API Contract tab and displays verified GeoJSON payload", async () => {
    render(<ProjectSatelliteBoundaryHUD project={mockProjectFeature} />);

    await waitFor(() => {
      expect(screen.getByTestId("project-satellite-boundary-hud")).toBeInTheDocument();
    });

    const stacTab = screen.getByRole("tab", { name: /STAC API Contract/i });
    switchTab(stacTab);

    await waitFor(() => {
      expect(screen.getByText(/GeoJSON Boundary Payload sent to Earth Search STAC v1/i)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/earth-search\.aws\.element84\.com\/v1\/search/i)).toBeInTheDocument();
    });
  });
});
