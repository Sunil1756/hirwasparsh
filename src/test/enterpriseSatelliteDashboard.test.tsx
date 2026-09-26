import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnterpriseSatelliteDashboard } from "../components/gis/EnterpriseSatelliteDashboard";
import { satelliteDashboardMetadataService } from "../services/satelliteDashboardMetadataService";
import { satelliteVegetationIndicatorsService } from "../services/satelliteVegetationIndicatorsService";

const mockMetadata = satelliteDashboardMetadataService.getDashboardMetadata(
  "proj_deodhar_01",
  "2026-09-25T05:40:00.000Z",
  "43QDE"
);

const mockVegetation = {
  projectId: "proj_deodhar_01",
  projectName: "Project Deodhar",
  timestamp: "2026-09-25T05:40:00.000Z",
  sensorConstellation: "Sentinel-2A/B",
  totalBoundaryAreaHa: 14.5,
  indices: {
    ndvi: 0.742,
    evi: 0.589,
    savi: 0.621,
    ndre: 0.534,
    msavi2: 0.645,
    ndwiWater: -0.31,
    ndmiMoisture: 0.495,
  },
  vegetationChange: {} as any,
  canopyCover: {
    fractionalVegetationCoverPct: 86.5,
    leafAreaIndex: 3.4,
    aboveGroundBiomassDensityTonsHa: 98.2,
    canopyDensityClass: "dense_forest",
    canopyDensityLabel: "Dense Forest",
    crownClosurePct: 90.8,
    vegetatedAreaHa: 12.54,
    nonVegetatedAreaHa: 1.96,
    canopyChlorophyllRating: "optimal",
  },
  seasonalTrends: {} as any,
  pixelLevelDistribution: {} as any,
  mrvComplianceDigest: "VERRA-VM0047-DIGEST",
};

describe("PHASE 10 TASK 59 — Enterprise Satellite Dashboard UI Suite", () => {
  beforeEach(() => {
    vi.spyOn(satelliteDashboardMetadataService, "getDashboardMetadata").mockReturnValue(mockMetadata);
    vi.spyOn(satelliteVegetationIndicatorsService, "generateProjectVegetationIndicators").mockResolvedValue(
      mockVegetation as any
    );
  });

  it("1. Renders Master Satellite Dashboard with header, Task 59 badge, and 4 audit KPI strips", async () => {
    render(<EnterpriseSatelliteDashboard projectId="proj_deodhar_01" />);

    expect(screen.getByTestId("enterprise-satellite-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Enterprise Satellite Remote Sensing Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 59 Verified/i)).toBeInTheDocument();

    await waitFor(() => {
      // Dimension 1: Source
      expect(screen.getByTestId("kpi-source")).toHaveTextContent(/1. Data Source/i);
      expect(screen.getByTestId("kpi-source")).toHaveTextContent(/Sentinel-2A\/B/i);

      // Dimension 2: Acquisition Date
      expect(screen.getByTestId("kpi-date")).toHaveTextContent(/2. Acquisition Date/i);
      expect(screen.getByTestId("kpi-date")).toHaveTextContent(/43QDE/i);

      // Dimension 3: Resolution
      expect(screen.getByTestId("kpi-resolution")).toHaveTextContent(/3. Spatial & Revisit/i);
      expect(screen.getByTestId("kpi-resolution")).toHaveTextContent(/10m GSD/i);

      // Dimension 4: Limitations
      expect(screen.getByTestId("kpi-limitations")).toHaveTextContent(/4. Known Limitations/i);
      expect(screen.getByTestId("kpi-limitations")).toHaveTextContent(/5 Scientific Caveats/i);
    });
  });

  it("2. Displays actual telemetry values (NDVI, EVI, FVC, AGBD)", async () => {
    render(<EnterpriseSatelliteDashboard projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("dash-ndvi")).toHaveTextContent("0.742");
      expect(screen.getByTestId("dash-evi")).toHaveTextContent("0.589");
      expect(screen.getByTestId("dash-fvc")).toHaveTextContent("86.5%");
      expect(screen.getByTestId("dash-agbd")).toHaveTextContent("98.2");
    });
  });

  it("3. Switches to Data Source tab and inspects sensor lineage", async () => {
    render(<EnterpriseSatelliteDashboard projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-source")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-source"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-source")).toBeInTheDocument();
      expect(screen.getByText(/Copernicus Sentinel-2A \/ Sentinel-2B/i)).toBeInTheDocument();
      expect(screen.getByText(/Level-2A Bottom-of-Atmosphere/i)).toBeInTheDocument();
      expect(screen.getByText(/WGS 84 \/ UTM Zone 43N/i)).toBeInTheDocument();
    });
  });

  it("4. Switches to Resolution tab and displays 13-band multi-spectral table", async () => {
    render(<EnterpriseSatelliteDashboard projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-resolution")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-resolution"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-resolution")).toBeInTheDocument();
      expect(screen.getByText("10m / 20m / 60m")).toBeInTheDocument();
      expect(screen.getByText("5 Days Revisit")).toBeInTheDocument();
      expect(screen.getByText("B04")).toBeInTheDocument();
      expect(screen.getByText("B08")).toBeInTheDocument();
    });
  });

  it("5. Switches to Scientific Limitations tab and inspects caveat disclosures", async () => {
    render(<EnterpriseSatelliteDashboard projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-limitations")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-limitations"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-limitations")).toBeInTheDocument();
      expect(screen.getByText(/10-Meter Pixel Mixed Ground Footprint/i)).toBeInTheDocument();
      expect(screen.getByText(/Monsoon Persistent Cloud Cover/i)).toBeInTheDocument();
      expect(screen.getByText(/NDVI Asymptotic Saturation/i)).toBeInTheDocument();
    });
  });

  it("6. Triggers Audit Report export callback", async () => {
    const mockExport = vi.fn();
    render(
      <EnterpriseSatelliteDashboard
        projectId="proj_deodhar_01"
        onExportAuditReport={mockExport}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("export-audit-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("export-audit-btn"));
    expect(mockExport).toHaveBeenCalledWith(mockMetadata);
  });
});
