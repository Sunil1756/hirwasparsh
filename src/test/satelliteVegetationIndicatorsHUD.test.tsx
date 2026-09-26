import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SatelliteVegetationIndicatorsHUD } from "../components/gis/SatelliteVegetationIndicatorsHUD";
import {
  satelliteVegetationIndicatorsService,
  ProjectVegetationIndicatorsPackage,
} from "../services/satelliteVegetationIndicatorsService";

const mockIndicatorsData: ProjectVegetationIndicatorsPackage = {
  projectId: "proj_deodhar_01",
  projectName: "Project Deodhar",
  timestamp: "2026-09-26T12:00:00Z",
  sensorConstellation: "Copernicus Sentinel-2A/B MSI + Landsat-8/9 OLI-2",
  totalBoundaryAreaHa: 14.5,
  indices: {
    ndvi: 0.725,
    evi: 0.582,
    savi: 0.612,
    ndre: 0.541,
    msavi2: 0.638,
    ndwiWater: -0.32,
    ndmiMoisture: 0.485,
  },
  vegetationChange: {
    baselineNdvi: 0.42,
    currentNdvi: 0.725,
    deltaNdvi: 0.305,
    relativeChangePct: 72.6,
    vegetationConditionIndex: 88.5,
    changeClassification: "high_regrowth",
    changeDescription: "High biomass expansion and vigorous sapling canopy recruitment",
    isPositiveGrowth: true,
    isDegradationAlert: false,
    biomassDeltaTonsPerHa: 106.8,
  },
  canopyCover: {
    fractionalVegetationCoverPct: 84.4,
    leafAreaIndex: 3.25,
    aboveGroundBiomassDensityTonsHa: 96.2,
    canopyDensityClass: "dense_forest",
    canopyDensityLabel: "Dense Closed Forest Canopy (FVC ≥ 70%)",
    crownClosurePct: 88.6,
    vegetatedAreaHa: 12.24,
    nonVegetatedAreaHa: 2.26,
    canopyChlorophyllRating: "optimal",
  },
  seasonalTrends: {
    phenologicalTrajectory: [
      {
        season: "kharif_monsoon",
        seasonLabel: "Kharif Monsoon",
        periodMonths: "June — October",
        meanNdvi: 0.833,
        peakNdvi: 0.9,
        baseNdvi: 0.71,
        fvcPct: 97.9,
        phenologyStage: "maturity_peak",
      },
      {
        season: "rabi_winter",
        seasonLabel: "Rabi Post-Monsoon / Winter",
        periodMonths: "November — March",
        meanNdvi: 0.725,
        peakNdvi: 0.76,
        baseNdvi: 0.64,
        fvcPct: 84.4,
        phenologyStage: "greenup",
      },
      {
        season: "zaid_summer",
        seasonLabel: "Zaid Pre-Monsoon / Summer",
        periodMonths: "April — May",
        meanNdvi: 0.521,
        peakNdvi: 0.57,
        baseNdvi: 0.43,
        fvcPct: 58.9,
        phenologyStage: "senescence",
      },
    ],
    startOfSeasonNdvi: 0.64,
    peakOfSeasonNdvi: 0.9,
    endOfSeasonNdvi: 0.43,
    seasonalAmplitude: 0.26,
    annualIntegralNppProxy: 0.736,
    mannKendallTrendDirection: "improving",
    trendSlopePerYear: 0.018,
    seasonalAnomalyZScore: 1.8,
    phenologicalHealthSummary:
      "Exceptional vigor: Current photosynthetic canopy index significantly exceeds multi-year seasonal norm (+ 1.8σ).",
  },
  pixelLevelDistribution: {
    ndviHistogram: [
      { bin: "< 0.20 (Barren/Water)", count: 2, percentage: 4.0 },
      { bin: "0.20 - 0.40 (Sparse/Crop)", count: 3, percentage: 6.0 },
      { bin: "0.40 - 0.60 (Moderate Canopy)", count: 10, percentage: 20.0 },
      { bin: "0.60 - 0.80 (Dense Agroforest)", count: 25, percentage: 50.0 },
      { bin: "≥ 0.80 (Lush Closed Canopy)", count: 10, percentage: 20.0 },
    ],
    meanNdvi: 0.725,
    stdDevNdvi: 0.062,
    minNdvi: 0.18,
    maxNdvi: 0.89,
  },
  mrvComplianceDigest: "VERRA-VM0047-NDVI-TEST-7F8A",
};

describe("PHASE 10 TASK 57 — Satellite Vegetation Indicators HUD UI Suite", () => {
  beforeEach(() => {
    vi.spyOn(
      satelliteVegetationIndicatorsService,
      "generateProjectVegetationIndicators"
    ).mockResolvedValue(mockIndicatorsData);
  });

  it("1. Renders Vegetation Indicators HUD with header title, badges, and primary NDVI card", async () => {
    render(<SatelliteVegetationIndicatorsHUD projectId="proj_deodhar_01" />);

    expect(screen.getByTestId("satellite-vegetation-indicators-hud")).toBeInTheDocument();
    expect(screen.getByText(/Vegetation Indicators & Biometrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 57 Ready/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("ndvi-value")).toHaveTextContent("0.725");
      expect(screen.getByTestId("evi-value")).toHaveTextContent("0.582");
      expect(screen.getByTestId("savi-value")).toHaveTextContent("0.612");
      expect(screen.getByTestId("ndre-value")).toHaveTextContent("0.541");
    });
  });

  it("2. Displays secondary indices (MSAVI2, NDWI, NDMI) and pixel histogram", async () => {
    render(<SatelliteVegetationIndicatorsHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByText("0.638")).toBeInTheDocument(); // MSAVI2
      expect(screen.getByText("-0.320")).toBeInTheDocument(); // NDWI
      expect(screen.getByText("0.485")).toBeInTheDocument(); // NDMI
      expect(screen.getByText(/Pixel-Level NDVI Histogram Distribution/i)).toBeInTheDocument();
    });
  });

  it("3. Switches to Vegetation Change tab and interacts with baseline slider", async () => {
    render(<SatelliteVegetationIndicatorsHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-change")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-change"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-change")).toBeInTheDocument();
      expect(screen.getByTestId("delta-ndvi-value")).toBeInTheDocument();
      expect(screen.getByTestId("vci-value")).toHaveTextContent("90.2%");
      expect(screen.getByTestId("change-classification-alert")).toBeInTheDocument();
    });

    // Change baseline slider
    const slider = screen.getByTestId("baseline-slider");
    fireEvent.change(slider, { target: { value: "0.55" } });

    await waitFor(() => {
      // delta NDVI should now be 0.725 - 0.55 = +0.175
      expect(screen.getByTestId("delta-ndvi-value")).toHaveTextContent("+0.175");
    });
  });

  it("4. Switches to Canopy & Land Cover tab and validates FVC, LAI, and AGBD metrics", async () => {
    render(<SatelliteVegetationIndicatorsHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-canopy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-canopy"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-canopy")).toBeInTheDocument();
      expect(screen.getByTestId("fvc-value")).toHaveTextContent("84.4%");
      expect(screen.getByTestId("lai-value")).toHaveTextContent("3.25");
      expect(screen.getByTestId("agbd-value")).toHaveTextContent("96.2");
      expect(screen.getByText(/DENSE FOREST/i)).toBeInTheDocument();
    });
  });

  it("5. Switches to Seasonal Phenology tab and validates Kharif/Rabi/Zaid trajectory and Mann-Kendall trend", async () => {
    render(<SatelliteVegetationIndicatorsHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-phenology")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-phenology"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-phenology")).toBeInTheDocument();
      expect(screen.getByText(/Kharif Monsoon/i)).toBeInTheDocument();
      expect(screen.getByText(/Rabi Post-Monsoon/i)).toBeInTheDocument();
      expect(screen.getByText(/Zaid Pre-Monsoon/i)).toBeInTheDocument();
      expect(screen.getByTestId("trend-direction")).toHaveTextContent(/IMPROVING/i);
    });
  });

  it("6. Triggers export MRV dossier callback", async () => {
    const mockExport = vi.fn();
    render(
      <SatelliteVegetationIndicatorsHUD
        projectId="proj_deodhar_01"
        onExportDossier={mockExport}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("export-indicators-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("export-indicators-btn"));
    expect(mockExport).toHaveBeenCalledWith(mockIndicatorsData);
  });
});
