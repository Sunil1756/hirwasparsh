/**
 * Remote Sensing & Spectral Vegetation Index Simulator
 * Enterprise Sentinel-2 MSI Multi-Spectral & Carbon Biomass Modeling Engine
 */

export interface SpectralIndexLayer {
  id: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "savi" | "thermal";
  name: string;
  shortDescription: string;
  formula: string;
  bandsUsed: string;
  palette: { min: string; mid: string; max: string };
  scaleLabel: string;
  minVal: number;
  maxVal: number;
  optimalRange: string;
}

export const SPECTRAL_LAYERS: SpectralIndexLayer[] = [
  {
    id: "rgb",
    name: "True Color Satellite (High-Res RGB)",
    shortDescription: "Optical aerial / satellite imagery of canopy boundaries and visual terrain",
    formula: "Natural Visual Spectrum (B04-Red, B03-Green, B02-Blue)",
    bandsUsed: "Band 4, Band 3, Band 2 (10m Resolution)",
    palette: { min: "#4b5563", mid: "#84cc16", max: "#15803d" },
    scaleLabel: "Visual Spectrum Reflectance",
    minVal: 0,
    maxVal: 1,
    optimalRange: "High Contrast",
  },
  {
    id: "ndvi",
    name: "NDVI (Normalized Difference Vegetation Index)",
    shortDescription: "Canopy vigor, chlorophyll absorption & green biomass density from space",
    formula: "(NIR - Red) / (NIR + Red)",
    bandsUsed: "Sentinel-2 B08 (NIR) & B04 (Red)",
    palette: { min: "#dc2626", mid: "#eab308", max: "#15803d" },
    scaleLabel: "-0.2 (Barren/Water) to +0.9 (Dense Lush Forest)",
    minVal: -0.2,
    maxVal: 1.0,
    optimalRange: "> 0.65 (Dense Vigor)",
  },
  {
    id: "ndre",
    name: "NDRE (Red Edge Chlorophyll Index)",
    shortDescription: "Deep canopy chlorophyll content & leaf nitrogen health in dense mature trees",
    formula: "(NIR - RedEdge) / (NIR + RedEdge)",
    bandsUsed: "Sentinel-2 B08 (NIR) & B05 (RedEdge-705nm)",
    palette: { min: "#ea580c", mid: "#facc15", max: "#047857" },
    scaleLabel: "0.1 to 0.85 (Chlorophyll Index)",
    minVal: 0.0,
    maxVal: 0.9,
    optimalRange: "> 0.50 (High Nitrogen)",
  },
  {
    id: "ndwi",
    name: "NDWI (Normalized Difference Water Index)",
    shortDescription: "Foliar cellular water content & root-zone drought moisture stress levels",
    formula: "(Green - NIR) / (Green + NIR)",
    bandsUsed: "Sentinel-2 B03 (Green) & B08 (NIR)",
    palette: { min: "#b45309", mid: "#38bdf8", max: "#1d4ed8" },
    scaleLabel: "-0.5 (Severe Drought Stress) to +0.6 (High Canopy Hydration)",
    minVal: -0.5,
    maxVal: 0.6,
    optimalRange: "+0.15 to +0.45",
  },
  {
    id: "evi",
    name: "EVI (Enhanced Vegetation Index)",
    shortDescription: "Atmospheric-corrected index with superior sensitivity in dense high-biomass forests",
    formula: "2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)",
    bandsUsed: "Sentinel-2 B08, B04, B02",
    palette: { min: "#e11d48", mid: "#ca8a04", max: "#16a34a" },
    scaleLabel: "0.0 (Sparse) to 0.95 (High Biomass)",
    minVal: 0.0,
    maxVal: 1.0,
    optimalRange: "> 0.55",
  },
  {
    id: "thermal",
    name: "Land Surface Temperature & Thermal Stress",
    shortDescription: "Canopy micro-climate cooling effect & heat island mitigation",
    formula: "Thermal Infrared Radiance (TIRS Band 10 / Modis LST)",
    bandsUsed: "Landsat-8 TIRS & Sentinel-3 SLSTR",
    palette: { min: "#1e3a8a", mid: "#f59e0b", max: "#b91c1c" },
    scaleLabel: "18°C (Cool Forest Canopy) to 48°C (Barren Concrete)",
    minVal: 15,
    maxVal: 50,
    optimalRange: "24°C - 30°C (Canopy Cooling)",
  },
];

export interface AgroforestryPresetZone {
  id: string;
  name: string;
  location: string;
  district: string;
  center: [number, number];
  zoom: number;
  boundary: [number, number][];
  targetTrees: number;
  species: string[];
  plantedDate: string;
  meanNdvi: number;
  meanNdwi: number;
  biomassTonsPerHa: number;
  carbonOffsetTons: number;
  healthStatus: "Optimal Vigor" | "Moderate Growth" | "Moisture Alert" | "Pioneer Saplings";
  description: string;
}

export const AGROFORESTRY_PRESET_ZONES: AgroforestryPresetZone[] = [
  {
    id: "nagpur_miyawaki",
    name: "Nagpur Urban Miyawaki Forest",
    location: "Nagpur Agro-Zone Phase 1",
    district: "Nagpur, Maharashtra",
    center: [21.1458, 79.0882],
    zoom: 15,
    boundary: [
      [21.1480, 79.0850],
      [21.1495, 79.0910],
      [21.1445, 79.0935],
      [21.1420, 79.0870],
    ],
    targetTrees: 5000,
    species: ["Neem", "Peepal", "Banyan", "Jamun", "Bamboo", "Karanj"],
    plantedDate: "2024-07-15",
    meanNdvi: 0.81,
    meanNdwi: 0.32,
    biomassTonsPerHa: 48.5,
    carbonOffsetTons: 110.0,
    healthStatus: "Optimal Vigor",
    description: "High-density Japanese Miyawaki agro-forest with 30+ native indigenous species creating a biodiverse carbon sink in urban Vidarbha.",
  },
  {
    id: "satara_watershed",
    name: "Satara Sahyadri Watershed Basin",
    location: "Koregaon Basin Plot #12",
    district: "Satara, Maharashtra",
    center: [17.6850, 74.0150],
    zoom: 14,
    boundary: [
      [17.6920, 74.0100],
      [17.6950, 74.0240],
      [17.6810, 74.0270],
      [17.6770, 74.0120],
    ],
    targetTrees: 12000,
    species: ["Teak", "Mahua", "Bamboo", "Shisham", "Arjun", "Khair"],
    plantedDate: "2023-08-20",
    meanNdvi: 0.76,
    meanNdwi: 0.28,
    biomassTonsPerHa: 62.4,
    carbonOffsetTons: 264.0,
    healthStatus: "Optimal Vigor",
    description: "Catchment reforestation reducing topsoil erosion in the Krishna River riverbank basin with soil carbon enrichment.",
  },
  {
    id: "western_ghats",
    name: "Western Ghats Biodiversity Reserve",
    location: "Mahabaleshwar Buffer Zone",
    district: "Satara / Raigad, Maharashtra",
    center: [17.9237, 73.6586],
    zoom: 14,
    boundary: [
      [17.9350, 73.6450],
      [17.9390, 73.6720],
      [17.9150, 73.6780],
      [17.9100, 73.6510],
    ],
    targetTrees: 25000,
    species: ["Indian Laurel", "Wild Mango", "Jamun", "Ficus", "Haritaki"],
    plantedDate: "2022-06-10",
    meanNdvi: 0.88,
    meanNdwi: 0.42,
    biomassTonsPerHa: 94.2,
    carbonOffsetTons: 550.0,
    healthStatus: "Optimal Vigor",
    description: "Dense cloud-forest canopy corridor restoring endangered Western Ghats endemic biodiversity and wildlife corridors.",
  },
  {
    id: "solapur_dryland",
    name: "Solapur Bio-Shield Dryland Belt",
    location: "Pandharpur Agroforestry Corridor",
    district: "Solapur, Maharashtra",
    center: [17.6572, 75.3678],
    zoom: 14,
    boundary: [
      [17.6680, 75.3550],
      [17.6710, 75.3820],
      [17.6500, 75.3880],
      [17.6440, 75.3610],
    ],
    targetTrees: 8500,
    species: ["Tamarind", "Ber", "Amla", "Subabul", "Neem", "Shisham"],
    plantedDate: "2024-09-05",
    meanNdvi: 0.63,
    meanNdwi: 0.16,
    biomassTonsPerHa: 28.6,
    carbonOffsetTons: 85.0,
    healthStatus: "Moderate Growth",
    description: "Drought-hardy bio-shield mitigating desertification, enhancing aquifer recharge, and supporting local farmer livelihoods.",
  },
  {
    id: "konkan_mangrove",
    name: "Konkan Coastal Mangrove & Teak Zone",
    location: "Ratnagiri Estuary Buffer",
    district: "Ratnagiri, Maharashtra",
    center: [16.9902, 73.3120],
    zoom: 14,
    boundary: [
      [17.0010, 73.3000],
      [17.0060, 73.3250],
      [16.9820, 73.3310],
      [16.9760, 73.3050],
    ],
    targetTrees: 15000,
    species: ["Mangrove (Rhizophora)", "Casuarina", "Coconut", "Teak", "Kokum"],
    plantedDate: "2023-11-12",
    meanNdvi: 0.84,
    meanNdwi: 0.51,
    biomassTonsPerHa: 78.0,
    carbonOffsetTons: 330.0,
    healthStatus: "Optimal Vigor",
    description: "Blue-carbon coastal marine buffer shielding shoreline from cyclonic surges with 4x higher carbon sequestration per hectare.",
  },
];

export interface CoordinateTelemetryResult {
  latitude: number;
  longitude: number;
  elevationM: number;
  tileId: string;
  overpassDate: string;
  cloudCoverPct: number;
  ndvi: number;
  ndre: number;
  ndwi: number;
  evi: number;
  savi: number;
  surfaceTempC: number;
  chlorophyllDensityUgCm2: number;
  canopyCoveragePct: number;
  biomassCarbonMTPerHa: number;
  soilMoisturePct: number;
  classification: string;
  healthDiagnosis: string;
  recommendation: string;
}

/**
 * Precision Remote Sensing Inspector for any clicked GPS Coordinate
 */
export function inspectCoordinateTelemetry(
  lat: number,
  lng: number,
  activeLayer: string = "ndvi"
): CoordinateTelemetryResult {
  // Deterministic high-precision seed based on coordinates
  const latSeed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233)) * 43758.5453;
  const hash = latSeed - Math.floor(latSeed);

  // Geographic context for Maharashtra / India
  const isWesternGhats = lng < 74.5 && lat > 15.5 && lat < 20.5;
  const isCoast = lng < 73.5;
  const isVidarbha = lng > 78.0;

  let baseNdvi = 0.62 + hash * 0.26;
  if (isWesternGhats) baseNdvi = Math.min(0.92, baseNdvi + 0.14);
  if (isCoast) baseNdvi = Math.min(0.89, baseNdvi + 0.10);

  const ndvi = Math.round(baseNdvi * 100) / 100;
  const ndre = Math.round((ndvi * 0.82 + (hash - 0.5) * 0.08) * 100) / 100;
  const ndwi = Math.round(((ndvi - 0.45) * 0.7 + (isCoast ? 0.15 : 0.0)) * 100) / 100;
  const evi = Math.round((ndvi * 0.88) * 100) / 100;
  const savi = Math.round((ndvi * 0.75) * 100) / 100;
  const surfaceTempC = Math.round((38 - ndvi * 12 + (hash - 0.5) * 3) * 10) / 10;
  const chlorophyllDensityUgCm2 = Math.round((ndvi * 62 + 8) * 10) / 10;
  const canopyCoveragePct = Math.min(96, Math.round(ndvi * 105));
  const biomassCarbonMTPerHa = Math.round((ndvi * 65.5 + 4.2) * 10) / 10;
  const soilMoisturePct = Math.min(65, Math.max(12, Math.round(20 + ndwi * 50)));

  const elevationM = Math.round(isWesternGhats ? 600 + hash * 700 : isCoast ? 15 + hash * 40 : 250 + hash * 300);

  let classification = "Dense Healthy Canopy (High Vigor)";
  let healthDiagnosis = "High photosynthetic activity with robust chlorophyll absorption across NIR/Red spectrum.";
  let recommendation = "Canopy integrity verified. Proceed with regular quarterly survival monitoring.";

  if (ndvi < 0.3) {
    classification = "Barren / Non-Vegetated Terrain";
    healthDiagnosis = "Low chlorophyll reflectance; soil exposure dominates the pixel signature.";
    recommendation = "Ideal site for new afforestation drive, pit preparation, and initial soil de-compaction.";
  } else if (ndvi < 0.5) {
    classification = "Sparse Canopy / Pioneer Saplings";
    healthDiagnosis = "Moderate vegetation signature consistent with young saplings or dryland foliage.";
    recommendation = "Maintain regular mulching and drip irrigation to promote canopy closure.";
  } else if (ndwi < 0.05) {
    classification = "Dense Canopy (Moisture Stressed)";
    healthDiagnosis = "Vegetation is dense but shows foliar hydration deficit in the SWIR spectral bands.";
    recommendation = "Initiate supplemental irrigation or soil moisture conservation to prevent leaf shedding.";
  }

  // Sentinel-2 Tile naming
  const tileId = `T${Math.floor(lat / 6) + 40}Q${String.fromCharCode(65 + Math.floor(lng % 26))}${String.fromCharCode(65 + Math.floor(lat % 26))}`;
  const overpassDate = new Date(Date.now() - (1 + Math.floor(hash * 4)) * 86400000).toISOString().split("T")[0];

  return {
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    elevationM,
    tileId,
    overpassDate,
    cloudCoverPct: Math.round(hash * 2.8 * 10) / 10,
    ndvi,
    ndre,
    ndwi,
    evi,
    savi,
    surfaceTempC,
    chlorophyllDensityUgCm2,
    canopyCoveragePct,
    biomassCarbonMTPerHa,
    soilMoisturePct,
    classification,
    healthDiagnosis,
    recommendation,
  };
}

/**
 * Calculates NDVI and vegetation statistics from coordinates and tree data
 */
export function calculatePlotMetrics(params: {
  areaSquareMeters: number;
  treeCount: number;
  speciesArray?: string[];
  averageAgeMonths?: number;
}) {
  const safeArea = Math.max(1, params.areaSquareMeters || 4046.86);
  const safeTreeCount = Math.max(1, params.treeCount || 100);
  const acres = Math.round((safeArea / 4046.86) * 100) / 100;
  const hectares = Math.round((safeArea / 10000) * 100) / 100;

  // Tree density per hectare
  const densityPerHectare = hectares > 0 ? Math.round(safeTreeCount / hectares) : safeTreeCount;

  // Average annual carbon sequestration: 22 kg CO2 per mature tree, scaled by age
  const ageFactor = Math.min(1.0, Math.max(0.2, (params.averageAgeMonths || 12) / 36));
  const annualCo2Kg = Math.round(safeTreeCount * 22 * ageFactor);
  const annualCo2MetricTons = Math.round((annualCo2Kg / 1000) * 10) / 10;

  // 10-Year cumulative carbon offset projection
  const tenYearOffsetTons = Math.round(annualCo2MetricTons * 8.5 * 10) / 10;

  // Canopy cover percentage estimation
  const estimatedCanopyRadiusM = Math.min(4, 0.5 + ((params.averageAgeMonths || 12) / 12) * 0.8);
  const totalCanopyAreaSqM = safeTreeCount * Math.PI * Math.pow(estimatedCanopyRadiusM, 2);
  const canopyCoveragePercent = Math.min(95, Math.round((totalCanopyAreaSqM / safeArea) * 100));

  // Synthesized NDVI index based on density and canopy coverage
  const baselineNdvi = 0.35 + (canopyCoveragePercent / 100) * 0.45;
  const ndviScore = Math.min(0.88, Math.round(baselineNdvi * 100) / 100);

  // Carbon credit valuation @ ₹1,200 / MT CO2e
  const carbonCreditValuationInr = Math.round(annualCo2MetricTons * 1200);

  return {
    acres,
    hectares,
    densityPerHectare,
    annualCo2Kg,
    annualCo2MetricTons,
    estimatedCo2Tons: annualCo2MetricTons,
    tenYearOffsetTons,
    canopyCoveragePercent,
    canopyCoverPercent: canopyCoveragePercent,
    ndviScore,
    carbonCreditValuationInr,
  };
}

/**
 * Color mapper for NDVI scores
 */
export function getNdviColor(score: number): string {
  if (score < 0.2) return "#ef4444"; // Barren / Stressed (Red)
  if (score < 0.4) return "#f59e0b"; // Sparse / Low vigor (Amber)
  if (score < 0.6) return "#84cc16"; // Moderate healthy canopy (Lime)
  if (score < 0.75) return "#22c55e"; // Dense healthy canopy (Green)
  return "#15803d"; // Prime lush agroforestry canopy (Emerald)
}

