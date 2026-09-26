import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SatelliteDataIngestionConsole } from "../components/gis/SatelliteDataIngestionConsole";
import { satelliteIngestionService } from "../services/satelliteIngestionService";

const mockIngestionPackage: any = {
  projectId: "proj-sahayadri",
  projectName: "Sahayadri Tiger Reserve Afforestation",
  projectType: "agroforestry",
  totalHectares: 1250,
  centroid: [18.53, 73.86],
  bbox: [73.85, 18.52, 73.87, 18.54],
  ingestionTimestamp: "2024-05-18T06:00:00Z",
  primaryScene: {
    sceneId: "S2B_MSIL2A_20240518_43QCA",
    sensor: "sentinel-2-msi",
    platform: "Sentinel-2B",
    provider: "Element84 AWS Earth Search STAC",
    acquisitionDate: "2024-05-18T05:42:00Z",
    ingestedAt: "2024-05-18T06:00:00Z",
    mgrsTileOrPathRow: "43QCA",
    cloudCoverPct: 0.01,
    sunElevationDeg: 62.4,
    sunAzimuthDeg: 88.2,
    crs: "EPSG:32643",
    stacItemUrl: "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_MSIL2A_20240518_43QCA",
    assetUrls: {
      trueColorTci: "https://sentinel-cogs.s3.amazonaws.com/.../TCI.tif",
      falseColorCir: "https://sentinel-cogs.s3.amazonaws.com/.../B08.tif",
      b04Red: "https://sentinel-cogs.s3.amazonaws.com/.../B04.tif",
      b08Nir: "https://sentinel-cogs.s3.amazonaws.com/.../B08.tif",
    },
    sclSummary: {
      vegetationPct: 84.5,
      soilPct: 12.0,
      waterPct: 1.5,
      cloudPct: 0.01,
      shadowPct: 0.0,
      isObscuredByCloud: false,
    },
    derivedIndices: {
      ndvi: 0.78,
      ndre: 0.58,
      evi: 0.69,
      savi: 0.64,
      msavi: 0.67,
      ndwi: 0.22,
      ndmi: 0.22,
      nbr: 0.61,
      cci: 2.8,
      foliarMoistureIndex: 0.72,
      canopyCoveragePct: 88,
      standingBiomassMTPerHa: 142.5,
      belowgroundBiomassMTPerHa: 37.1,
      totalBiomassMTPerHa: 179.6,
      carbonStockEstimateTCO2e: 18450.0,
      annualSequestrationRateTCO2e: 1476.0,
      qaQualityScore: 95,
    },
    agroWeather: {
      latitude: 18.53,
      longitude: 73.86,
      elevationM: 560,
      timestamp: "2024-05-18T05:42:00Z",
      soilMoisture0to7cmPct: 24.5,
      soilMoisture7to28cmPct: 28.0,
      soilMoisture28to100cmPct: 32.5,
      vaporPressureDeficitKPa: 0.85,
      ambientTempC: 28.5,
      relativeHumidityPct: 65.0,
      dailyRainfallMm: 0.0,
      evapotranspirationEt0Mm: 4.8,
      surfacePressureHPa: 955.0,
      windSpeedKmh: 8.5,
      droughtStressScore: 15.0,
    },
    qaFlags: {
      passedQualityGate: true,
      cloudContaminationRisk: "none",
      shadowContaminationRisk: false,
      radiometricIntegrity: "optimal",
      notes: [],
    },
  },
  historicalScenes: [],
  crossSensorCorroboration: {
    sentinel2Ndvi: 0.78,
    landsatNdvi: 0.77,
    multiSensorNdviDelta: 0.01,
    gediLidarCanopyHeightM: 13.8,
    gediRh98HeightM: 18.6,
    gediAgbdMTPerHa: 145.2,
    crossSensorAgreementPct: 98.7,
    sensorCalibrationFactor: 1.015,
  },
  zonalStatistics: {
    sampledPixelsCount: 1250,
    minNdvi: 0.68,
    maxNdvi: 0.86,
    meanNdvi: 0.78,
    standardDeviationNdvi: 0.045,
    medianNdvi: 0.77,
    vegetatedPixelRatio: 0.94,
    canopyHomogeneityScore: 88.5,
  },
  boundaryGeoJson: { type: "Feature" },
  verificationDigestSha256: "sha256_3a8f9c1b7d5e4a2f0e6b8c1a3d5e7f9a",
  mrvStandardCompliance: {
    verraVM0047: true,
    goldStandardAR: true,
    ipccTier2Biomass: true,
    unfcccReddPlus: true,
  },
};

const switchTab = (tabElement: HTMLElement) => {
  fireEvent.pointerDown(tabElement, { button: 0 });
  fireEvent.mouseDown(tabElement, { button: 0 });
  fireEvent.click(tabElement);
  fireEvent.keyDown(tabElement, { key: "Enter", code: "Enter" });
};

describe("PHASE 10 TASK 55 — Satellite Data Ingestion Console UI Component Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(satelliteIngestionService, "ingestProjectSatelliteData").mockResolvedValue(mockIngestionPackage);
    vi.spyOn(satelliteIngestionService, "getRecentIngestionLogs").mockReturnValue([
      {
        id: "log-1",
        timestamp: "2024-05-18T06:00:00Z",
        projectId: "proj-sahayadri",
        sensor: "sentinel-2-msi",
        status: "success",
        message: "Ingestion completed: Scene S2B_MSIL2A_20240518_43QCA",
      },
    ]);
  });

  it("1. Renders Satellite Data Ingestion Console with project metadata and badges", async () => {
    render(<SatelliteDataIngestionConsole projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-data-ingestion-console")).toBeInTheDocument();
    });

    expect(screen.getByText("Sahayadri Tiger Reserve Afforestation")).toBeInTheDocument();
    expect(screen.getByText(/Copernicus Sentinel-2 L2A STAC Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/10m Surface Reflectance/i)).toBeInTheDocument();
    expect(screen.getByText(/Verra VM0047 Validated/i)).toBeInTheDocument();
  });

  it("2. Switches between Derived Visual composites (True Color TCI, False Color CIR, NDVI, SCL)", async () => {
    render(<SatelliteDataIngestionConsole projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-data-ingestion-console")).toBeInTheDocument();
    });

    // Default TCI
    expect(screen.getByText(/True Color Surface Composite/i)).toBeInTheDocument();

    // Switch to False Color NIR
    const cirBtn = screen.getByRole("button", { name: /False Color NIR/i });
    fireEvent.click(cirBtn);
    expect(screen.getByText(/False Color Infrared Composite/i)).toBeInTheDocument();

    // Switch to NDVI Heatmap
    const ndviBtn = screen.getByRole("button", { name: /NDVI Heatmap/i });
    fireEvent.click(ndviBtn);
    expect(screen.getByText(/Normalized Difference Vegetation Index/i)).toBeInTheDocument();

    // Switch to SCL Mask
    const sclBtn = screen.getByRole("button", { name: /SCL Mask/i });
    fireEvent.click(sclBtn);
    expect(screen.getByText(/Scene Classification Layer/i)).toBeInTheDocument();
  });

  it("3. Switches to Spectral Indices tab and renders IPCC Tier-2 Biomass metrics", async () => {
    render(<SatelliteDataIngestionConsole projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-data-ingestion-console")).toBeInTheDocument();
    });

    const indicesTab = screen.getByRole("tab", { name: /Spectral Indices/i });
    switchTab(indicesTab);

    await waitFor(() => {
      expect(screen.getByText(/IPCC Tier-2 Biomass & Carbon Sequestration Engine/i)).toBeInTheDocument();
      expect(screen.getByText("142.5 MT/ha")).toBeInTheDocument();
      expect(screen.getByText("18,450 tCO₂e")).toBeInTheDocument();
    });
  });

  it("4. Switches to Multi-Sensor Cross-Validation tab and renders Landsat & GEDI LiDAR metrics", async () => {
    render(<SatelliteDataIngestionConsole projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-data-ingestion-console")).toBeInTheDocument();
    });

    const crossTab = screen.getByRole("tab", { name: /Cross-Validation/i });
    switchTab(crossTab);

    await waitFor(() => {
      expect(screen.getByText(/Agreement: 98.7%/i)).toBeInTheDocument();
      expect(screen.getAllByText(/NASA GEDI LiDAR/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Primary Optical Sensor/i)).toBeInTheDocument();
    });
  });

  it("5. Triggers live ingestion on button click and exports MRV dossier", async () => {
    const exportSpy = vi.spyOn(satelliteIngestionService, "exportMRVVerificationDossier").mockResolvedValue('{"standard":"Verra VM0047"}');

    // Mock URL.createObjectURL and URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    render(<SatelliteDataIngestionConsole projectId="proj-sahayadri" />);

    await waitFor(() => {
      expect(screen.getByTestId("satellite-data-ingestion-console")).toBeInTheDocument();
    });

    const triggerBtn = screen.getByRole("button", { name: /Trigger Ingestion/i });
    fireEvent.click(triggerBtn);

    const exportBtn = screen.getByRole("button", { name: /Export MRV Dossier/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith("proj-sahayadri");
    });
  });
});
