import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SatelliteFieldValidationHUD } from "../components/gis/SatelliteFieldValidationHUD";
import { satelliteFieldValidationService } from "../services/satelliteFieldValidationService";

const mockValidationReport = {
  projectId: "proj_deodhar_01",
  projectName: "Project Deodhar Reforestation",
  generatedAt: "2026-09-25T06:00:00.000Z",
  sensorConstellation: "Copernicus Sentinel-2 L2A + Ground GPS In-Situ Verifications",
  discrepancyMatrix: {
    totalTreesEvaluated: 6,
    concordantHealthyCount: 3,
    concordantStressedCount: 1,
    understoryWeedFalsePositiveCount: 1,
    youngSaplingSoilMaskingCount: 1,
    boundaryEdgeNoiseCount: 0,
    overallConcordanceRatePct: 66.7,
    falsePositiveRatePct: 16.7,
    falseNegativeRatePct: 16.7,
  },
  evidenceWeighting: {
    fieldGroundTruthWeightPct: 50,
    satelliteMultiSpectralWeightPct: 30,
    agroClimaticWeatherWeightPct: 20,
    compositeSurvivalIndexPct: 81.7,
    confidenceInterval95Pct: [78.4, 85.0] as [number, number],
  },
  scientificLimitationNotice: {
    statement:
      "Satellite multi-spectral data (10m GSD) measures spatial canopy reflectance and must NOT be interpreted as autonomous proof that every individual young tree is alive.",
    youngTreeCaveat:
      "Young saplings (< 3 years old) occupy < 1 m² within a 100 m² pixel. Low NDVI does not prove tree death if surrounding soil dominates the pixel reflectance.",
    understoryInterferenceCaveat:
      "Dense understory grass or weed flushes can elevate pixel NDVI above 0.70 even if the target planted sapling is distressed or dead.",
    verraComplianceStandard:
      "Verra Methodology VM0047 Section 8.3 & Gold Standard Forestry Rules mandate ground-truth calibration sample plots (minimum 5% physical survey) to corroborate satellite observations.",
  },
  colocatedTreeRecords: [
    {
      treeId: "tree_001",
      treeName: "Deodhar Heritage Neem #1",
      species: "Azadirachta indica (Neem)",
      plantationDate: "2024-07-15",
      treeAgeMonths: 26,
      latitude: 18.5204,
      longitude: 73.8567,
      fieldHealthStatus: "healthy" as const,
      fieldObserverName: "Field Scout Ranger",
      fieldObservationDate: "2026-09-20",
      fieldGpsAccuracyM: 1.8,
      colocatedPixel: {
        pixelLat: 18.5204,
        pixelLng: 73.8567,
        ndvi: 0.74,
        savi: 0.62,
        ndre: 0.52,
        fvcPct: 85,
        sclCategory: "Vegetation (Dense)",
      },
      validationType: "concordant_healthy" as const,
      validationLabel: "Concordant Healthy (Corroborated)",
      confidenceScore: 95,
      recommendedAction: "none" as const,
      actionMessage: "Field healthy status corroborated by vigorous near-infrared pixel reflectance.",
      discrepancySeverity: "none" as const,
    },
    {
      treeId: "tree_002",
      treeName: "Deodhar Heritage Banyan #2",
      species: "Ficus benghalensis (Banyan)",
      plantationDate: "2025-08-10",
      treeAgeMonths: 13,
      latitude: 18.5207,
      longitude: 73.8571,
      fieldHealthStatus: "dead" as const,
      fieldObserverName: "Field Scout Ranger",
      fieldObservationDate: "2026-09-20",
      fieldGpsAccuracyM: 2.1,
      colocatedPixel: {
        pixelLat: 18.5207,
        pixelLng: 73.8571,
        ndvi: 0.68,
        savi: 0.55,
        ndre: 0.47,
        fvcPct: 75,
        sclCategory: "Vegetation (Medium)",
      },
      validationType: "understory_weed_false_positive" as const,
      validationLabel: "Understory Weed Interference (False Positive Risk)",
      confidenceScore: 48,
      recommendedAction: "weed_clearance_required" as const,
      actionMessage:
        "Satellite shows high greenness, but field reports dead/stressed sapling. Likely weed/grass flush masking sapling mortality.",
      discrepancySeverity: "high" as const,
    },
    {
      treeId: "tree_003",
      treeName: "Deodhar Sandalwood #3",
      species: "Santalum album (Sandalwood)",
      plantationDate: "2025-11-20",
      treeAgeMonths: 10,
      latitude: 18.5211,
      longitude: 73.8564,
      fieldHealthStatus: "healthy" as const,
      fieldObserverName: "Field Scout Ranger",
      fieldObservationDate: "2026-09-20",
      fieldGpsAccuracyM: 1.5,
      colocatedPixel: {
        pixelLat: 18.5211,
        pixelLng: 73.8564,
        ndvi: 0.31,
        savi: 0.42,
        ndre: 0.22,
        fvcPct: 20,
        sclCategory: "Bare Soil / Low Veg",
      },
      validationType: "young_sapling_soil_masking" as const,
      validationLabel: "Young Sapling Soil Background Masking",
      confidenceScore: 78,
      recommendedAction: "soil_mulching_recommended" as const,
      actionMessage:
        "Field verifies living sapling, but small canopy (< 1m) is optically masked by 100 m² bare soil pixel matrix.",
      discrepancySeverity: "low" as const,
    },
  ],
  mrvCrossValidationDigest: "VERRA-VM0047-XVAL-TEST-DIGEST",
};

describe("PHASE 10 TASK 60 — Satellite vs Field Validation HUD Component", () => {
  beforeEach(() => {
    vi.spyOn(satelliteFieldValidationService, "executeCrossValidation").mockResolvedValue(
      mockValidationReport as any
    );
  });

  it("1. Renders Master Validation HUD header, Task 60 badge, and Scientific Limitation banner", async () => {
    render(<SatelliteFieldValidationHUD projectId="proj_deodhar_01" />);

    expect(screen.getByTestId("satellite-field-validation-hud")).toBeInTheDocument();
    expect(screen.getByText(/Satellite vs Field Cross-Validation Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 60 Validated/i)).toBeInTheDocument();

    await waitFor(() => {
      // Caveat Banner
      expect(screen.getByTestId("scientific-limitation-callout")).toBeInTheDocument();
      expect(screen.getByText(/Important Scientific Remote Sensing Limitation/i)).toBeInTheDocument();
      expect(
        screen.getByText(/MUST NOT automatically be presented as conclusive proof that every individual young tree is alive/i)
      ).toBeInTheDocument();
    });
  });

  it("2. Displays Discrepancy Matrix KPI strips and multi-source survival score", async () => {
    render(<SatelliteFieldValidationHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("concordance-rate")).toHaveTextContent("66.7%");
      expect(screen.getByTestId("composite-survival-index")).toHaveTextContent("81.7%");
      expect(screen.getByTestId("weed-false-positives")).toHaveTextContent("1");
      expect(screen.getByTestId("soil-masking-count")).toHaveTextContent("1");
    });
  });

  it("3. Displays Colocated Tree Observations and filters by discrepancy type", async () => {
    render(<SatelliteFieldValidationHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByText("Deodhar Heritage Neem #1")).toBeInTheDocument();
      expect(screen.getByText("Deodhar Heritage Banyan #2")).toBeInTheDocument();
      expect(screen.getByText("Deodhar Sandalwood #3")).toBeInTheDocument();
    });

    // Filter by Weed False Positive button
    const weedFilterBtn = screen.getByTestId("filter-weed");
    fireEvent.click(weedFilterBtn);

    await waitFor(() => {
      expect(screen.getByText("Deodhar Heritage Banyan #2")).toBeInTheDocument();
      expect(screen.queryByText("Deodhar Heritage Neem #1")).not.toBeInTheDocument();
    });
  });

  it("4. Dispatches scout on discrepancy alert action", async () => {
    const mockScoutDispatch = vi.fn();
    render(
      <SatelliteFieldValidationHUD
        projectId="proj_deodhar_01"
        onDispatchScout={mockScoutDispatch}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dispatch-btn-tree_002")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("dispatch-btn-tree_002"));
    expect(mockScoutDispatch).toHaveBeenCalledWith("tree_002", "weed_clearance_required");
  });
});
