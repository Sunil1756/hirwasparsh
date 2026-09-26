import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SatelliteTimeSeriesHUD } from "../components/gis/SatelliteTimeSeriesHUD";
import {
  satelliteTimeSeriesService,
  StoredSatelliteObservation,
} from "../services/satelliteTimeSeriesService";
import { satelliteVegetationIndicatorsService } from "../services/satelliteVegetationIndicatorsService";

const mockObservations: StoredSatelliteObservation[] = [
  {
    id: "obs_test_01",
    projectId: "proj_deodhar_01",
    sceneId: "S2A_MSIL2A_20260920T0540_R062",
    satelliteConstellation: "Sentinel-2A MSI (10m)",
    acquisitionTimestamp: "2026-09-20T05:40:00.000Z",
    observationDate: "2026-09-20",
    cloudCoverPct: 4.2,
    sclVegetationPct: 86.4,
    indices: {
      ndvi: 0.745,
      evi: 0.592,
      savi: 0.625,
      ndre: 0.542,
      msavi2: 0.65,
      ndwiWater: -0.32,
      ndmiMoisture: 0.51,
    },
    fvcPct: 86.9,
    lai: 3.42,
    agbdTonsHa: 98.4,
    deltaNdvi: 0.325,
    vciPct: 93.8,
    phenologicalSeason: "kharif_monsoon",
    soilMoisturePct: 42.5,
    temperatureC: 28.2,
    rainfallMm: 12.4,
    qaPassed: true,
    sha256Hash: "SHA256-obs_test_01-20260920",
    createdAt: "2026-09-20T06:00:00.000Z",
  },
  {
    id: "obs_test_02",
    projectId: "proj_deodhar_01",
    sceneId: "S2B_MSIL2A_20260820T0540_R062",
    satelliteConstellation: "Sentinel-2B MSI (10m)",
    acquisitionTimestamp: "2026-08-20T05:40:00.000Z",
    observationDate: "2026-08-20",
    cloudCoverPct: 8.5,
    sclVegetationPct: 82.1,
    indices: {
      ndvi: 0.712,
      evi: 0.565,
      savi: 0.598,
      ndre: 0.518,
      msavi2: 0.622,
      ndwiWater: -0.28,
      ndmiMoisture: 0.48,
    },
    fvcPct: 82.8,
    lai: 3.12,
    agbdTonsHa: 89.6,
    deltaNdvi: 0.292,
    vciPct: 87.9,
    phenologicalSeason: "kharif_monsoon",
    soilMoisturePct: 48.0,
    temperatureC: 27.5,
    rainfallMm: 18.2,
    qaPassed: true,
    sha256Hash: "SHA256-obs_test_02-20260820",
    createdAt: "2026-08-20T06:00:00.000Z",
  },
];

describe("PHASE 10 TASK 58 — Satellite Time Series HUD UI Suite", () => {
  beforeEach(() => {
    vi.spyOn(satelliteTimeSeriesService, "getProjectTimeSeries").mockResolvedValue(mockObservations);
    vi.spyOn(satelliteTimeSeriesService, "getAggregatedTimeSeries").mockResolvedValue([
      {
        periodKey: "2026-09",
        periodLabel: "2026 09",
        startDate: "2026-09-20",
        endDate: "2026-09-20",
        observationsCount: 1,
        meanNdvi: 0.745,
        minNdvi: 0.745,
        maxNdvi: 0.745,
        stdDevNdvi: 0.0,
        meanEvi: 0.592,
        meanSavi: 0.625,
        meanNdre: 0.542,
        meanFvcPct: 86.9,
        meanAgbdTonsHa: 98.4,
        meanSoilMoisturePct: 42.5,
        totalRainfallMm: 12.4,
        phenologicalSeason: "kharif_monsoon",
      },
    ]);
    vi.spyOn(satelliteTimeSeriesService, "detectTimeSeriesAnomalies").mockResolvedValue([]);
    vi.spyOn(
      satelliteVegetationIndicatorsService,
      "generateProjectVegetationIndicators"
    ).mockResolvedValue({
      projectId: "proj_deodhar_01",
      projectName: "Project Deodhar",
      timestamp: "2026-09-20T05:40:00.000Z",
      sensorConstellation: "Sentinel-2A",
      totalBoundaryAreaHa: 10.0,
      indices: mockObservations[0].indices,
      vegetationChange: {
        baselineNdvi: 0.42,
        currentNdvi: 0.745,
        deltaNdvi: 0.325,
        relativeChangePct: 77.4,
        vegetationConditionIndex: 93.8,
        changeClassification: "high_regrowth",
        changeDescription: "High growth",
        isPositiveGrowth: true,
        isDegradationAlert: false,
        biomassDeltaTonsPerHa: 113.8,
      },
      canopyCover: {
        fractionalVegetationCoverPct: 86.9,
        leafAreaIndex: 3.42,
        aboveGroundBiomassDensityTonsHa: 98.4,
        canopyDensityClass: "dense_forest",
        canopyDensityLabel: "Dense Forest",
        crownClosurePct: 91.2,
        vegetatedAreaHa: 8.69,
        nonVegetatedAreaHa: 1.31,
        canopyChlorophyllRating: "optimal",
      },
      seasonalTrends: {} as any,
      pixelLevelDistribution: {} as any,
      mrvComplianceDigest: "VERRA-DIGEST",
    });
  });

  it("1. Renders Time Series HUD with total observations count and longitudinal mean NDVI", async () => {
    render(<SatelliteTimeSeriesHUD projectId="proj_deodhar_01" />);

    expect(screen.getByTestId("satellite-time-series-hud")).toBeInTheDocument();
    expect(screen.getByText(/Satellite Time Series & Observation Storage/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 58 Stored/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("total-obs-count")).toHaveTextContent("2");
      expect(screen.getByTestId("longitudinal-mean-ndvi")).toHaveTextContent("0.728");
    });
  });

  it("2. Filters by date range buttons (30d, 6m, 1y, all)", async () => {
    render(<SatelliteTimeSeriesHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("range-30d")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("range-30d"));

    await waitFor(() => {
      expect(satelliteTimeSeriesService.getProjectTimeSeries).toHaveBeenCalled();
    });
  });

  it("3. Steps through time slider scrubber and updates active NDVI readout", async () => {
    render(<SatelliteTimeSeriesHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("time-slider")).toBeInTheDocument();
      expect(screen.getByTestId("scrubbed-ndvi")).toHaveTextContent("0.745");
    });

    const slider = screen.getByTestId("time-slider");
    fireEvent.change(slider, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByTestId("scrubbed-ndvi")).toHaveTextContent("0.712");
    });
  });

  it("4. Switches to Observation Table tab and displays historical records", async () => {
    render(<SatelliteTimeSeriesHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-table"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-table")).toBeInTheDocument();
      expect(screen.getByText("2026-09-20")).toBeInTheDocument();
      expect(screen.getByText("2026-08-20")).toBeInTheDocument();
    });
  });

  it("5. Switches to Anomalies tab and verifies anomaly alert status", async () => {
    render(<SatelliteTimeSeriesHUD projectId="proj_deodhar_01" />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-anomalies")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-anomalies"));

    await waitFor(() => {
      expect(screen.getByTestId("panel-anomalies")).toBeInTheDocument();
      expect(screen.getByText(/Zero Temporal Anomalies Detected/i)).toBeInTheDocument();
    });
  });

  it("6. Records a new live observation when clicking Record Observation button", async () => {
    const mockRecord = vi
      .spyOn(satelliteTimeSeriesService, "recordObservation")
      .mockResolvedValue(mockObservations[0]);
    const mockCallback = vi.fn();

    render(
      <SatelliteTimeSeriesHUD
        projectId="proj_deodhar_01"
        onObservationRecorded={mockCallback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-observation-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-observation-btn"));

    await waitFor(() => {
      expect(mockRecord).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
