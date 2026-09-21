/**
 * Geospatial & Remote Sensing Core Type Definitions
 * Unifies Copernicus Sentinel-2 STAC schemas, multi-spectral band definitions,
 * botanical AI taxonomy results, and spatial coordinate contracts.
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  elevationMeters?: number;
  timestamp?: string;
}

export interface MultiSpectralBands {
  b02Blue: number;      // 490 nm (Blue)
  b03Green: number;     // 560 nm (Green)
  b04Red: number;       // 665 nm (Red)
  b05RedEdge: number;   // 705 nm (Vegetation RedEdge)
  b08Nir: number;       // 842 nm (Near Infrared)
  b11Swir: number;      // 1610 nm (Short-Wave Infrared)
}

export interface SpectralIndices {
  ndvi: number;         // Normalized Difference Vegetation Index: (-1.0 to +1.0)
  ndre: number;         // Red Edge Chlorophyll Index: (0.0 to 0.9)
  ndwi: number;         // Normalized Difference Water Index: (-0.5 to +0.6)
  evi: number;          // Enhanced Vegetation Index: (0.0 to 1.0)
  savi: number;         // Soil-Adjusted Vegetation Index: (-1.0 to +1.0)
  chlorophyllDensityUgCm2: number;
  surfaceTempC: number;
  foliarMoistureIndex: number;
  canopyCoveragePct: number;
  standingBiomassMTPerHa: number;
}

export interface SatelliteOverpassScene {
  tileId: string;
  acquisitionDate: string;
  cloudCoverPct: number;
  satelliteSource:
    | "copernicus_sentinel2_l2a"
    | "earth_search_stac"
    | "planetary_computer"
    | "calibrated_regional_sentinel2";
  centerLat: number;
  centerLng: number;
  elevationM: number;
  bands: MultiSpectralBands;
  indices: SpectralIndices;
  agroWeather?: {
    soilMoisture0to7cmPct: number;
    ambientTempC: number;
    relativeHumidityPct: number;
    vaporPressureDeficitKPa: number;
    dailyRainfallMm: number;
  };
}

export interface GpsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  elevationM?: number;
  isWithinIndiaBounds: boolean;
}

export type TreeSurvivalStatus =
  | "alive"
  | "healthy"
  | "moderate_growth"
  | "moisture_stressed"
  | "critical_risk"
  | "dead"
  | "unverified";

export interface VerificationPlanterContext {
  accountType?: "individual" | "ngo" | "csr" | "government" | "corporate" | string;
  plantingType?: "individual" | "organization" | "bulk_ngo" | "csr_sponsored" | string;
  isIndividualPlanter?: boolean;
  projectId?: string | null;
  plotId?: string | null;
}

export interface BotanicalAiVerificationResult {
  isLivingTree: boolean;
  speciesCommon: string;
  speciesScientific: string;
  botanicalFamily: string;
  crownHealthScore: number;
  vitalityStatus: "healthy" | "moderate_stress" | "severe_stress" | "dead_or_dry" | "not_a_tree_fraud";
  growthStage: "sapling" | "young_tree" | "mature_tree" | "overmature";
  stemLignification?: "woody" | "semi_woody" | "herbaceous" | "unknown";
  leafMorphology?: string;
  chlorophyllPigmentation?: "dense_photosynthetic_green" | "moderate_green" | "chlorotic_yellow" | "necrotic_brown";
  backgroundSetting?: "in_ground_soil_pit" | "nursery_polybag" | "indoor_pot" | "screen_or_recycled_media" | "open_field";
  isGenuineInGroundPlantation?: boolean;
  confidenceScore: number;
  detectedStressFactors: string[];
  fraudRiskScore: number;
  fraudFlags: string[];
  perceptualHash: string;
  aiReport: string;
  compositeScore: number;
  isAutoApproved: boolean;
  routingDecision: "auto_approved" | "manual_review_queue" | "fraud_rejected" | "institutional_mrv_audit_queue";
  rationale: string;
}
