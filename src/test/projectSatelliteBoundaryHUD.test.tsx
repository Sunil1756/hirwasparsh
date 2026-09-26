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

const mockProjectTelemetry: any = {
  projectId: "proj-sahayadri",
  projectName: "Sahayadri Tiger Reserve Afforestation",
  projectType: "agroforestry",
  totalHectares: 1250,
  centroid: [18.53, 73.86],
  bbox: [73.85, 18.52, 73.87, 18.54],
  mgrsTilesCovered: ["43QCA"],
  primaryScene: {
    sceneId: "S2B_MSIL2A_20240518_43QCA",
    acquisitionDate: "2024-05-18T05:42:00Z",
    cloudCoverPercentage: 0.01,
    cloudCoverageLevel: "clear",
    sunElevationAngleDeg: 62.4,
    sunAzimuthAngleDeg: 88.2,
    platform: "Sentinel-2B",
    instrument: "MSI (MultiSpectral Instrument)",
    processingLevel: "Level-2A (Bottom Of Atmosphere / BOA Surface Reflectance)",
    mgrsTile: "43QCA",
    crs: "EPSG:32643",
    provider: "element84-earthsearch",
    stacItemUrl: "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_MSIL2A_20240518_43QCA",
    bands: {
      b02_blue: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B02.tif",
      b03_green: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B03.tif",
      b04_red: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B04.tif",
      b08_nir: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B08.tif",
      b05_rededge1: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B05.tif",
      b06_rededge2: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B06.tif",
      b07_rededge3: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B07.tif",
      b8a_narrow_nir: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B8A.tif",
      b11_swir1: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B11.tif",
      b12_swir2: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/B12.tif",
      scl_scene_classification: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/SCL.tif",
      visual: "https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/CA/2024/5/S2B_43QCA_20240518_0_L2A/TCI.tif",
    },
    sclSummary: {
      vegetationPct: 82.5,
      soilPct: 14.2,
      waterPct: 1.1,
      cloudPct: 0.01,
    },
    rawMetadata: {
      "earthsearch:payload_url": "https://earth-search.aws.element84.com/v1/search",
    },
  },
  overallIndices: {
    ndvi: 0.76,
    ndre: 0.58,
    evi: 0.69,
    savi: 0.64,
    msavi: 0.67,
    ndwi: 0.22,
    ndmi: 0.44,
    nbr: 0.61,
    canopyCoverPercentage: 86.4,
    chlorophyllContentIndex: 2.8,
    standingBiomassMTPerHa: 138.5,
    healthCategory: "dense_canopy",
    soilAdjustedVegetationIndex: 0.64,
    foliarMoistureIndex: 0.72,
    carbonStockEstimateTCO2e: 18450.0,
    atmosphericInterferenceIndex: 0.03,
  },
  samplingPointsCount: 40,
  plotBreakdowns: [
    {
      plotId: "plot-1",
      plotName: "PLOT-01 (Upper Ridge)",
      compartmentCode: "COMP-A1",
      centroid: [18.525, 73.855],
      areaHectares: 312.5,
      meanNdvi: 0.78,
      meanNdre: 0.61,
      meanNdwi: 0.25,
      canopyCoveragePct: 88.0,
      foliarMoistureIndex: 0.75,
      standingBiomassMTPerHa: 142.0,
      droughtStressScore: 12.0,
      survivalStatus: "optimal",
      lastSampledAt: "2024-05-18T05:42:00Z",
    },
  ],
  agroWeather: {
    latitude: 18.53,
    longitude: 73.86,
    elevationMeters: 560,
    timestamp: "2024-05-18T05:42:00Z",
    temperature2mC: 28.5,
    relativeHumidityPct: 65,
    dewPointC: 21.2,
    precipitationMm: 0.0,
    vaporPressureDeficitKpa: 1.25,
    referenceEvapotranspirationEt0Mm: 4.8,
    soilMoisture_0_to_7cm_m3m3: 0.28,
    soilMoisture_7_to_28cm_m3m3: 0.32,
    soilMoisture_28_to_100cm_m3m3: 0.35,
    soilMoisture_100_to_255cm_m3m3: 0.38,
    soilTemperature_0_to_7cm_C: 27.2,
    shortwaveRadiationWPerM2: 740,
    directNormalIrradianceWPerM2: 680,
    windSpeed10mKmh: 8.5,
    windDirection10mDeg: 240,
    droughtStressIndexPct: 15,
  },
  carbonAccrualEstimateTCO2e: 18450.0,
  boundaryGeoJson: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.85, 18.52],
          [73.85, 18.54],
          [73.87, 18.54],
          [73.87, 18.52],
          [73.85, 18.52],
        ],
      ],
    },
    properties: {
      name: "Sahayadri Tiger Reserve Afforestation",
    },
  },
  lastUpdated: "2024-05-18T05:42:00Z",
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
    vi.spyOn(projectGeometrySatelliteService, "fetchProjectSatelliteTelemetry").mockResolvedValue(mockProjectTelemetry);
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
