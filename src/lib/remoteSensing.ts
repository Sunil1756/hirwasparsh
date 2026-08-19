/**
 * Remote Sensing & Spectral Vegetation Index Simulator
 * Inspired by Map My Crop: NDVI, NDRE, NDWI, Canopy Coverage, and Carbon Sequestration Modeling
 */

export interface SpectralIndexLayer {
  id: "rgb" | "ndvi" | "ndre" | "ndwi";
  name: string;
  shortDescription: string;
  formula: string;
  palette: { min: string; mid: string; max: string };
  scaleLabel: string;
}

export const SPECTRAL_LAYERS: SpectralIndexLayer[] = [
  {
    id: "rgb",
    name: "True Color Satellite (High-Res RGB)",
    shortDescription: "Optical aerial / satellite imagery of canopy boundaries",
    formula: "Natural Visual Spectrum (Red, Green, Blue)",
    palette: { min: "#4b5563", mid: "#84cc16", max: "#15803d" },
    scaleLabel: "Visual Terrain",
  },
  {
    id: "ndvi",
    name: "NDVI (Normalized Difference Vegetation Index)",
    shortDescription: "Canopy vigor, chlorophyll absorption & green biomass density",
    formula: "(NIR - Red) / (NIR + Red)",
    palette: { min: "#dc2626", mid: "#eab308", max: "#15803d" },
    scaleLabel: "-0.2 (Bare Soil) to +0.9 (Dense Forest)",
  },
  {
    id: "ndre",
    name: "NDRE (Red Edge Index)",
    shortDescription: "Deep canopy chlorophyll content & nitrogen health in dense foliage",
    formula: "(NIR - RedEdge) / (NIR + RedEdge)",
    palette: { min: "#ea580c", mid: "#facc15", max: "#047857" },
    scaleLabel: "0.1 to 0.85 (Chlorophyll Index)",
  },
  {
    id: "ndwi",
    name: "NDWI (Normalized Difference Water Index)",
    shortDescription: "Foliar water content & root-zone moisture stress levels",
    formula: "(Green - NIR) / (Green + NIR)",
    palette: { min: "#b45309", mid: "#38bdf8", max: "#1d4ed8" },
    scaleLabel: "-0.5 (Drought Stressed) to +0.6 (High Hydration)",
  },
];

/**
 * Calculates NDVI and vegetation statistics from coordinates and tree data
 */
export function calculatePlotMetrics(params: {
  areaSquareMeters: number;
  treeCount: number;
  speciesArray?: string[];
  averageAgeMonths?: number;
}) {
  const acres = Math.round((params.areaSquareMeters / 4046.86) * 100) / 100;
  const hectares = Math.round((params.areaSquareMeters / 10000) * 100) / 100;
  
  // Tree density per hectare
  const densityPerHectare = hectares > 0 ? Math.round(params.treeCount / hectares) : params.treeCount;
  
  // Average annual carbon sequestration: 22 kg CO2 per mature tree, scaled by age
  const ageFactor = Math.min(1.0, Math.max(0.2, (params.averageAgeMonths || 12) / 36));
  const annualCo2Kg = Math.round(params.treeCount * 22 * ageFactor);
  const annualCo2MetricTons = Math.round((annualCo2Kg / 1000) * 10) / 10;
  
  // 10-Year cumulative carbon offset projection
  const tenYearOffsetTons = Math.round(annualCo2MetricTons * 8.5 * 10) / 10;

  // Canopy cover percentage estimation
  const estimatedCanopyRadiusM = Math.min(4, 0.5 + ((params.averageAgeMonths || 12) / 12) * 0.8);
  const totalCanopyAreaSqM = params.treeCount * Math.PI * Math.pow(estimatedCanopyRadiusM, 2);
  const canopyCoveragePercent = Math.min(95, Math.round((totalCanopyAreaSqM / Math.max(1, params.areaSquareMeters)) * 100));

  // Synthesized NDVI index based on density and canopy coverage
  const baselineNdvi = 0.35 + (canopyCoveragePercent / 100) * 0.45;
  const ndviScore = Math.min(0.88, Math.round(baselineNdvi * 100) / 100);

  return {
    acres,
    hectares,
    densityPerHectare,
    annualCo2Kg,
    annualCo2MetricTons,
    tenYearOffsetTons,
    canopyCoveragePercent,
    ndviScore,
  };
}

/**
 * Color mapper for NDVI scores
 */
export function getNdviColor(score: number): string {
  if (score < 0.2) return "#ef4444"; // Barren / Stressed
  if (score < 0.4) return "#f59e0b"; // Sparse / Low vigor
  if (score < 0.6) return "#84cc16"; // Moderate healthy canopy
  if (score < 0.75) return "#22c55e"; // Dense healthy canopy
  return "#15803d"; // Prime lush agroforestry canopy
}
