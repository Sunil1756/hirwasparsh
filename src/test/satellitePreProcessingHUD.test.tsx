import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SatellitePreProcessingHUD } from "../components/gis/SatellitePreProcessingHUD";
import { satellitePreProcessingService } from "../services/satellitePreProcessingService";

const mockPreProcessedPackage: any = {
  projectId: "proj-sahayadri",
  sceneId: "S2B_MSIL2A_20240518_43QCA",
  processingTimestamp: "2024-05-18T06:00:00Z",
  temporalSelection: {
    selectedDate: "2024-05-18T05:42:00Z",
    window: {
      startDate: "2024-04-18T00:00:00Z",
      endDate: "2024-05-18T23:59:59Z",
      maxCloudThresholdPct: 20,
      compositeMethod: "greenest_pixel_mvc",
      season: "zaid_summer",
    },
    phenologicalSeason: "zaid_summer",
    compositeMethod: "greenest_pixel_mvc",
    scenesConsideredCount: 7,
  },
  cloudMasking: {
    totalPixels: 1250,
    validPixels: 1230,
    cloudPixels: 12,
    shadowPixels: 5,
    cirrusPixels: 3,
    usablePixelCoveragePct: 98.4,
    cloudContaminationPct: 1.6,
    isAcceptableForMRV: true,
    filteredPixels: [],
  },
  spatialClipping: {
    projectId: "proj-sahayadri",
    totalBoundaryAreaHa: 1250.0,
    interiorAreaHa: 1218.8,
    setbackBufferMeters: 10,
    clippingPolygon: [],
    sampledPixelsCount: 1250,
    usablePixelsCount: 1230,
    clippedRasters: [],
    subCompartmentBreakdown: [
      {
        compartmentId: "COMP-A1",
        compartmentName: "Upper Ridge Compartment",
        areaHectares: 350.0,
        meanNdvi: 0.81,
        meanNdre: 0.62,
        validPixelPct: 98.5,
      },
    ],
  },
  radiometricNormalization: {
    rawDigitalNumbers: { B04: 1380, B08: 6400 },
    scaledSurfaceReflectance: { b04Red: 0.038, b08Nir: 0.540, b02Blue: 0.035, b03Green: 0.095, b05RedEdge: 0.230, b11Swir: 0.110 },
    sunElevationAngleDeg: 62.4,
    solarZenithCosine: 0.886,
    topographicallyCorrectedBands: { b04Red: 0.039, b08Nir: 0.550, b02Blue: 0.036, b03Green: 0.096, b05RedEdge: 0.235, b11Swir: 0.112 },
    harmonizedLandsatEquivalent: { b04Red: 0.038, b08Nir: 0.545, b02Blue: 0.035, b03Green: 0.095, b05RedEdge: 0.235, b11Swir: 0.112 },
    calibrationQualityScore: 98,
  },
  cleanIndices: {
    ndvi: 0.79,
    ndre: 0.60,
    evi: 0.71,
    savi: 0.66,
    msavi: 0.69,
    ndwi: 0.24,
    ndmi: 0.24,
    nbr: 0.63,
    cci: 2.9,
    foliarMoistureIndex: 0.74,
    canopyCoveragePct: 89,
    standingBiomassMTPerHa: 145.0,
    belowgroundBiomassMTPerHa: 37.7,
    totalBiomassMTPerHa: 182.7,
    carbonStockEstimateTCO2e: 18750.0,
    annualSequestrationRateTCO2e: 1500.0,
    qaQualityScore: 98,
  },
  preProcessingAuditCertificate: {
    algorithmVersion: "Sen2Cor-2.11 / MRV-PreProc-v3.0",
    complianceStandard: "Verra VM0047 / IPCC Tier-2 BOA Surface Reflectance",
    qaGatePassed: true,
    verificationDigestSha256: "sha256_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c",
  },
};

const switchTab = (tabElement: HTMLElement) => {
  fireEvent.pointerDown(tabElement, { button: 0 });
  fireEvent.mouseDown(tabElement, { button: 0 });
  fireEvent.click(tabElement);
  fireEvent.keyDown(tabElement, { key: "Enter", code: "Enter" });
};

describe("PHASE 10 TASK 56 — Satellite Pre-Processing HUD UI Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(satellitePreProcessingService, "executePreProcessingPipeline").mockResolvedValue(mockPreProcessedPackage);
  });

  it("1. Renders Satellite Pre-Processing HUD with status badges and scene info", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    expect(screen.getByText(/Task 56 Pre-Processing Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Scientific Pre-Processing & Normalization Suite/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Quality Gate Passed/i).length).toBeGreaterThan(0);
  });

  it("2. Switches between Temporal Synthesis strategies (Greenest Pixel MVC, Single Clearest, Median Reflectance)", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    const clearestBtn = screen.getByRole("button", { name: /Single Clearest/i });
    fireEvent.click(clearestBtn);

    const medianBtn = screen.getByRole("button", { name: /Median Reflectance/i });
    fireEvent.click(medianBtn);

    expect(satellitePreProcessingService.executePreProcessingPipeline).toHaveBeenCalled();
  });

  it("3. Displays Cloud & Shadow Masking metrics (usable pixels, shadow/cirrus counts)", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    expect(screen.getByText("98.4%")).toBeInTheDocument(); // usable pixels
    expect(screen.getByText("1.6%")).toBeInTheDocument(); // cloud contamination
    expect(screen.getByText(/SCL Class 3 Filtered/i)).toBeInTheDocument();
  });

  it("4. Switches to Spatial Clipping tab and renders setback buffer & sub-compartment breakdown", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    const spatialTab = screen.getByRole("tab", { name: /Spatial Clipping/i });
    switchTab(spatialTab);

    await waitFor(() => {
      expect(screen.getByText("1250 ha")).toBeInTheDocument();
      expect(screen.getByText("-10m Edge")).toBeInTheDocument();
      expect(screen.getByText("1218.8 ha")).toBeInTheDocument();
      expect(screen.getByText("Upper Ridge Compartment")).toBeInTheDocument();
    });
  });

  it("5. Switches to Radiometric Normalization tab and renders illumination & Landsat harmonization", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    const radioTab = screen.getByRole("tab", { name: /Radiometric Normalization/i });
    switchTab(radioTab);

    await waitFor(() => {
      expect(screen.getByText(/Solar Zenith & Topographic Illumination Correction/i)).toBeInTheDocument();
      expect(screen.getByText(/Harmonized Landsat-8\/9/i)).toBeInTheDocument();
    });
  });

  it("6. Switches to Clean Telemetry tab and displays clean NDVI & SHA-256 audit digest", async () => {
    render(<SatellitePreProcessingHUD projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-preprocessing-hud")).toBeInTheDocument();
    });

    const cleanTab = screen.getByRole("tab", { name: /Clean Telemetry/i });
    switchTab(cleanTab);

    await waitFor(() => {
      expect(screen.getByText("0.79")).toBeInTheDocument(); // clean NDVI
      expect(screen.getByText("145 MT/ha")).toBeInTheDocument(); // standing biomass
      expect(screen.getByText(/SHA-256 Pre-Processing Digest/i)).toBeInTheDocument();
    });
  });
});
