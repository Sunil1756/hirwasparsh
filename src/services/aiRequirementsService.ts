/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 11 TASK 61
 * AI Requirements & Intelligence Problem Formulation Framework
 *
 * Defines exact problem formulations, mathematical criteria, validation pipelines,
 * and operational constraints for AI across 5 core forestry applications:
 * 1. Species Assistance (Taxonomic Identification & Native Agroforestry Validation)
 * 2. Tree-Condition Classification (Vitality, Foliar Health, Growth Stage & Lignification)
 * 3. Image Quality Checks (Sharpness/Blur, Luminance/Exposure, Glare & Moire Screening)
 * 4. Duplicate-Image Detection (Perceptual dHash, SHA-256, & Spatiotemporal Geodetic Collision)
 * 5. Anomaly Detection (Predictive Defoliation Shock, Drought Stress, & Remote Sensing Discrepancies)
 */

export type AiApplicationDomain =
  | "species_assistance"
  | "tree_condition_classification"
  | "image_quality_checks"
  | "duplicate_image_detection"
  | "anomaly_detection";

export type AiInferenceTarget = "edge_client" | "serverless_api" | "batch_pipeline";

export type ConfidenceTier = "high_auto_approve" | "medium_human_review" | "low_reject_retry";

export interface MathematicalFormulation {
  formulaLatex: string;
  variableDefinitions: Record<string, string>;
  decisionThreshold: string;
  scientificReference: string;
}

export interface AiProblemRequirement {
  id: string;
  domain: AiApplicationDomain;
  title: string;
  shortDefinition: string;
  operationalObjective: string;
  inputModalities: string[];
  outputSchema: Record<string, string>;
  mathematicalFormulation: MathematicalFormulation;
  confidenceTiers: {
    high: { minConfidence: number; action: string };
    medium: { minConfidence: number; maxConfidence: number; action: string };
    low: { maxConfidence: number; action: string };
  };
  failureModesAndMitigations: Array<{
    failureMode: string;
    riskSeverity: "low" | "medium" | "high" | "critical";
    mitigationStrategy: string;
  }>;
  targetLatencyMs: number;
  inferenceTarget: AiInferenceTarget;
  verraMrvComplianceRequirement: string;
}

export interface ImageQualityEvaluationResult {
  passedQualityGate: boolean;
  blurLaplacianScore: number;
  minBlurThreshold: number;
  meanLuminance: number;
  luminanceRange: [number, number];
  isExposureAcceptable: boolean;
  resolutionMpx: number;
  minResolutionMpx: number;
  glareContaminationRatio: number;
  moireScreenPatternRisk: boolean;
  viewfinderGuidance: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  collisionVector: "none" | "exact_sha256" | "perceptual_dhash" | "spatiotemporal_geodesic";
  hammingDistance: number;
  similarityPct: number;
  spatialSeparationMeters?: number;
  fraudRiskLevel: "safe" | "low" | "medium" | "high" | "critical_fraud";
  actionRecommendation: string;
}

export interface SpeciesAssistanceResult {
  predictedSpeciesCommon: string;
  predictedSpeciesScientific: string;
  botanicalFamily: string;
  isNativeToMaharashtra: boolean;
  topCandidates: Array<{ species: string; confidencePct: number }>;
  confidenceTier: ConfidenceTier;
  morphologyInspected: {
    leafVenation: string;
    phyllotaxy: string;
    barkTexture: string;
    growthHabit: string;
  };
}

export interface TreeConditionResult {
  vitalityStatus: "thriving" | "healthy" | "moderate_stress" | "severe_stress" | "dead_or_dry";
  crownHealthScore: number; // 0 to 100
  growthStage: "sapling" | "young_tree" | "mature_tree" | "overmature";
  chlorophyllPigmentation: "dense_green" | "moderate_green" | "chlorotic_yellow" | "necrotic_brown";
  stemLignification: "herbaceous" | "semi_woody" | "woody";
  isGenuineInGroundPit: boolean;
  stressDrivers: string[];
}

export interface AnomalyDetectionResult {
  hasAnomaly: boolean;
  anomalyType:
    | "none"
    | "foliar_defoliation_shock"
    | "drought_hydration_shock"
    | "growth_stagnation_lag"
    | "understory_weed_false_positive"
    | "young_sapling_soil_masking"
    | "cluster_mortality_spike";
  severity: "none" | "low" | "medium" | "high" | "critical";
  triggerMetric: string;
  leadTimeDays: number;
  recommendedScoutAction: string;
}

export class AiRequirementsService {
  /**
   * 1. GET COMPLETE AI REQUIREMENTS SPECIFICATION
   * Returns formal problem formulations across all 5 key applications.
   */
  public getRequirementsSpecification(): Record<AiApplicationDomain, AiProblemRequirement> {
    return {
      species_assistance: {
        id: "REQ-AI-001",
        domain: "species_assistance",
        title: "Botanical Species Assistance & Native Agroforestry Validation",
        shortDefinition:
          "Automated taxonomic classification of tree species from field photographs to eliminate user misidentification and enforce regional biodiversity rules.",
        operationalObjective:
          "Provide top-k species assistance for Maharashtra native trees (Neem, Banyan, Teak, Sandalwood, Mahua, Shisham, Jamun) with confidence scoring and native agroforestry validation.",
        inputModalities: [
          "RGB Close-up Photo (Leaves, flowers, bark)",
          "Planter Geolocation (State/District context)",
          "Plantation Season Context",
        ],
        outputSchema: {
          speciesCommon: "string",
          speciesScientific: "string",
          botanicalFamily: "string",
          confidenceScore: "float (0.0 - 1.0)",
          isNativeAgroforestry: "boolean",
          top3Candidates: "Array<{ species: string, confidence: float }>",
          suggestedCareRegime: "string",
        },
        mathematicalFormulation: {
          formulaLatex:
            "\\hat{y} = \\arg\\max_{k \\in \\mathcal{S}} P(\\text{species}_k \\mid \\mathbf{x}_{\\text{image}}, \\mathbf{c}_{\\text{geo}})",
          variableDefinitions: {
            "\\mathcal{S}": "Catalog of 120+ Western Ghats & Deccan Maharashtra native and agroforestry tree species",
            "\\mathbf{x}_{\\text{image}}": "RGB Normalized visual tensor [3 x 224 x 224]",
            "\\mathbf{c}_{\\text{geo}}": "District ecological biotope prior (Rainfall zone, soil type)",
          },
          decisionThreshold: "High confidence auto-approval if P(species) >= 0.85; Suggest top-3 if 0.60 <= P < 0.85; Require scout QA if P < 0.60.",
          scientificReference: "Flora of Maharashtra State (Botanical Survey of India, 2000); APG IV Botanical Taxonomy.",
        },
        confidenceTiers: {
          high: { minConfidence: 0.85, action: "Auto-populate species dropdown with verified badge" },
          medium: { minConfidence: 0.6, maxConfidence: 0.85, action: "Present top-3 ranked species suggestions to user for confirmation" },
          low: { maxConfidence: 0.6, action: "Request clearer macro photo focusing on leaf margins and venation" },
        },
        failureModesAndMitigations: [
          {
            failureMode: "Non-tree object (human, animal, indoor furniture) submitted as tree",
            riskSeverity: "high",
            mitigationStrategy: "Pre-inference Out-of-Distribution (OOD) binary tree detector rejects non-botanical imagery immediately.",
          },
          {
            failureMode: "Deciduous tree in leafless dry-season phase",
            riskSeverity: "medium",
            mitigationStrategy: "Secondary multi-part branch bark fissuring and silhouette classification fallback.",
          },
        ],
        targetLatencyMs: 1200,
        inferenceTarget: "serverless_api",
        verraMrvComplianceRequirement:
          "Verra VM0047 Section 6.2 requires species-specific wood density constants for allometric biomass carbon equations.",
      },

      tree_condition_classification: {
        id: "REQ-AI-002",
        domain: "tree_condition_classification",
        title: "Tree Vitality, Foliar Condition & Growth Stage Classifier",
        shortDefinition:
          "Computer vision assessment of sapling and tree physiological vitality, defoliation percentage, chlorophyll pigment status, and stem lignification.",
        operationalObjective:
          "Continuously evaluate individual tree health to determine survival status, distinguish living trees from dead/dry stalks, and detect nursery pot fraud.",
        inputModalities: [
          "Full-Habit Tree Image (Ground view including base and crown)",
          "Age in Months (Derived from plantation date)",
          "Historical Tree Health Records",
        ],
        outputSchema: {
          vitalityStatus: "'thriving' | 'healthy' | 'moderate_stress' | 'severe_stress' | 'dead_or_dry'",
          crownHealthScore: "integer (0 - 100)",
          growthStage: "'sapling' | 'young_tree' | 'mature_tree' | 'overmature'",
          chlorophyllPigmentation: "'dense_green' | 'moderate_green' | 'chlorotic_yellow' | 'necrotic_brown'",
          stemLignification: "'herbaceous' | 'semi_woody' | 'woody'",
          isGenuineInGroundPit: "boolean (true if in soil pit, false if mobile plastic bag)",
          detectedStressFactors: "Array<string>",
        },
        mathematicalFormulation: {
          formulaLatex:
            "H_{\\text{crown}} = 0.40 \\cdot \\Phi_{\\text{chlorophyll}} + 0.35 \\cdot (1 - \\delta_{\\text{defoliation}}) + 0.25 \\cdot \\Psi_{\\text{turgor}}",
          variableDefinitions: {
            "\\Phi_{\\text{chlorophyll}}": "Chromatic vegetation index from visible RGB leaf segmentation (0-100)",
            "\\delta_{\\text{defoliation}}": "Fraction of expected canopy crown missing due to leaf shedding or pests (0.0-1.0)",
            "\\Psi_{\\text{turgor}}": "Structural leaf angle and shoot erectness rating (0-100)",
          },
          decisionThreshold: "Thriving: H >= 85; Healthy: 70 <= H < 85; Moderate Stress: 45 <= H < 70; Severe Stress: 20 <= H < 45; Dead/Dry: H < 20.",
          scientificReference: "IPCC Guidelines for National Greenhouse Gas Inventories (AFOLU Forestry Volume 4).",
        },
        confidenceTiers: {
          high: { minConfidence: 0.88, action: "Update official ledger tree health score and carbon accretion coefficient" },
          medium: { minConfidence: 0.65, maxConfidence: 0.88, action: "Log provisional health score; schedule follow-up verification in 14 days" },
          low: { maxConfidence: 0.65, action: "Flag for Field Scout physical inspection" },
        },
        failureModesAndMitigations: [
          {
            failureMode: "Mobile nursery polybag photographed repeatedly across multiple locations (Plastic Pot Fraud)",
            riskSeverity: "critical",
            mitigationStrategy: "Boundary soil collar segmentation inspects soil-stem junction for black polyethylene bag seams.",
          },
          {
            failureMode: "Seasonal winter leaf drop confused with mortality in deciduous species",
            riskSeverity: "medium",
            mitigationStrategy: "Cross-reference with species phenology calendar; inspect terminal buds for live green cambium.",
          },
        ],
        targetLatencyMs: 1500,
        inferenceTarget: "serverless_api",
        verraMrvComplianceRequirement:
          "Verra VM0047 Section 8.1 requires documented living condition verification for every credited tree cohort.",
      },

      image_quality_checks: {
        id: "REQ-AI-003",
        domain: "image_quality_checks",
        title: "Edge Pre-Inference Photographic Quality & Validation Gate",
        shortDefinition:
          "Client-side real-time quality filter ensuring uploaded photos meet focus, lighting, resolution, and authenticity standards before submission.",
        operationalObjective:
          "Prevent unidentifiable, blurry, underexposed, or screen-rephotographed images from entering the audit stream and saving upstream compute.",
        inputModalities: [
          "Raw Client-Captured Canvas/File Buffer",
          "Camera Sensor Metadata",
        ],
        outputSchema: {
          passedQualityGate: "boolean",
          blurScore: "float (Laplacian Variance)",
          exposureScore: "float (Mean Luminance 0-255)",
          resolutionMpx: "float",
          glareRatio: "float (0.0 - 1.0)",
          isScreenRephotography: "boolean",
          viewfinderGuidance: "Array<string>",
        },
        mathematicalFormulation: {
          formulaLatex:
            "\\sigma^2_{\\nabla^2} = \\frac{1}{MN} \\sum_{x=1}^M \\sum_{y=1}^N \\left( \\nabla^2 I(x,y) - \\bar{\\nabla}^2 I \\right)^2 \\ge \\tau_{\\text{blur}} = 100.0",
          variableDefinitions: {
            "\\nabla^2 I": "Discrete Laplacian convolution kernel [[0, 1, 0], [1, -4, 1], [0, 1, 0]] over grayscale image I",
            "\\sigma^2_{\\nabla^2}": "Variance of the Laplacian edge response (sharpness metric)",
            "\\tau_{\\text{blur}}": "Strict focus threshold (100.0 for crisp foliage margin definition)",
          },
          decisionThreshold: "Pass if Variance >= 100.0, Mean Luminance in [40, 220], Resolution >= 0.3 MP, and Glare Ratio < 0.08.",
          scientificReference: "Pech-Pacheco et al. (2000) 'Diatom autofocusing in brightfield microscopy using Laplacian variance'.",
        },
        confidenceTiers: {
          high: { minConfidence: 0.95, action: "Instant pass: proceed directly to species & condition inference" },
          medium: { minConfidence: 0.8, maxConfidence: 0.95, action: "Warning prompt with option for user to retake or proceed" },
          low: { maxConfidence: 0.8, action: "Hard reject on client side with specific viewfinder improvement prompt" },
        },
        failureModesAndMitigations: [
          {
            failureMode: "Motion blur from moving vehicle or shaky hands in rural field conditions",
            riskSeverity: "high",
            mitigationStrategy: "Laplacian variance rejects frame in < 50ms and triggers vibration alert to hold camera steady.",
          },
          {
            failureMode: "Harsh midday tropical sun overexposing white leaf glare",
            riskSeverity: "medium",
            mitigationStrategy: "Luminance histogram clipping detection warns planter to shade tree canopy.",
          },
        ],
        targetLatencyMs: 65,
        inferenceTarget: "edge_client",
        verraMrvComplianceRequirement:
          "Verra VM0047 Section 8.2 & Gold Standard Forestry Standards mandate that all digital monitoring evidence must be legible and auditable by third-party VVBs.",
      },

      duplicate_image_detection: {
        id: "REQ-AI-004",
        domain: "duplicate_image_detection",
        title: "Perceptual Hashing & Spatiotemporal Anti-Fraud Engine",
        shortDefinition:
          "Multi-vector image fingerprinting to detect recycled stock photos, duplicate tree submissions, and impossible geodetic coordinate jumps.",
        operationalObjective:
          "Ensure that every registered tree and observation represents a unique physical planting, preventing carbon credit double-counting.",
        inputModalities: [
          "Image Pixel Matrix (64-bit dHash / pHash)",
          "Binary File Buffer (SHA-256)",
          "GPS Coordinates & Timestamp",
          "Camera Sensor EXIF Signatures",
        ],
        outputSchema: {
          isDuplicate: "boolean",
          collisionVector: "'none' | 'exact_sha256' | 'perceptual_dhash' | 'spatiotemporal_geodesic'",
          hammingDistance: "integer (0 - 64)",
          visualSimilarityPct: "float (0 - 100%)",
          spatialSeparationMeters: "float",
          fraudRiskLevel: "'safe' | 'low' | 'medium' | 'high' | 'critical_fraud'",
          matchedEvidenceId: "string | null",
        },
        mathematicalFormulation: {
          formulaLatex:
            "D_H(h_A, h_B) = \\sum_{i=1}^{64} (h_{A,i} \\oplus h_{B,i}) \\le \\tau_{\\text{hamming}} = 6 \\quad \\land \\quad d_{\\text{haversine}}(g_A, g_B) > 15\\text{ m}",
          variableDefinitions: {
            "h_A, h_B": "64-bit difference hash (dHash) computed from 9x8 luminance gradient matrix",
            "D_H": "Hamming distance (number of differing bits between fingerprints)",
            "d_{\\text{haversine}}": "Great-circle distance between recorded GPS locations g_A and g_B in meters",
          },
          decisionThreshold: "Exact Match: SHA256 match OR DH <= 3 (Similarity >= 95.3%); Suspicious: DH <= 6; Geodetic Fraud: DH <= 10 with distance > 15m.",
          scientificReference: "Zauner (2010) 'Implementation and Benchmarking of Perceptual Image Hash Functions'.",
        },
        confidenceTiers: {
          high: { minConfidence: 0.98, action: "Auto-reject fraudulent duplicate and freeze suspicious planter submission queue" },
          medium: { minConfidence: 0.85, maxConfidence: 0.98, action: "Escalate to Human Auditor with side-by-side visual diff overlay" },
          low: { maxConfidence: 0.85, action: "Allow as unique authentic evidence record" },
        },
        failureModesAndMitigations: [
          {
            failureMode: "Same tree photographed 6 months apart flagged as duplicate due to identical background fence",
            riskSeverity: "medium",
            mitigationStrategy: "Temporal growth delta filter: If elapsed time > 90 days and tree height increased, treat as valid re-monitoring.",
          },
          {
            failureMode: "Adversarial geometric transformations (cropping, rotation, color filters) applied to bypass hash",
            riskSeverity: "high",
            mitigationStrategy: "Combined dHash (gradient) + pHash (DCT frequency domain) + deep feature embedding comparison.",
          },
        ],
        targetLatencyMs: 120,
        inferenceTarget: "serverless_api",
        verraMrvComplianceRequirement:
          "Verra VM0047 Section 5.4 strictly prohibits double-counting or multi-registration of singular biomass assets across MRV boundaries.",
      },

      anomaly_detection: {
        id: "REQ-AI-005",
        domain: "anomaly_detection",
        title: "Predictive Telemetry, Defoliation Shock & Discrepancy Anomaly Engine",
        shortDefinition:
          "Multi-modal anomaly detection flagging physiological stress, sudden canopy loss, and contradictions between satellite and ground observations.",
        operationalObjective:
          "Alert field foresters, CSR managers, and tree adopters to acute threats (drought, pests, soil masking, weed false positives) before tree death occurs.",
        inputModalities: [
          "Sentinel-2 10m Time-Series (NDVI, NDRE, NDWI, SAVI)",
          "Agro-Climatic Telemetry (Root-zone soil moisture 0-100cm, VPD, Precipitation)",
          "Ground-Truth Growth & Health Observations",
        ],
        outputSchema: {
          hasAnomaly: "boolean",
          anomalyType: "'none' | 'foliar_defoliation_shock' | 'drought_hydration_shock' | 'growth_stagnation_lag' | 'understory_weed_false_positive' | 'young_sapling_soil_masking' | 'cluster_mortality_spike'",
          anomalySeverity: "'none' | 'low' | 'medium' | 'high' | 'critical'",
          anomalyConfidencePct: "float (0 - 100%)",
          triggerMetric: "string",
          leadTimeDays: "integer",
          recommendedScoutAction: "string",
        },
        mathematicalFormulation: {
          formulaLatex:
            "Z_{\\text{anomaly}} = \\frac{\\Delta \\text{NDVI}_{30\\text{d}} - \\mu_{\\Delta \\text{seasonal}}}{\\sigma_{\\Delta \\text{seasonal}}} < -2.0 \\quad \\lor \\quad \\text{NDWI} < 0.05",
          variableDefinitions: {
            "\\Delta \\text{NDVI}_{30\\text{d}}": "30-day rate of change in mean top-of-canopy vegetation index",
            "\\mu_{\\Delta}, \\sigma_{\\Delta}": "Historical baseline mean and standard deviation for the given phenological season",
            "Z_{\\text{anomaly}}": "Standardized anomaly Z-score threshold (Z < -2.0 signifies 97.7% statistical divergence)",
          },
          decisionThreshold: "Trigger High Alert if Z < -2.0 (Defoliation Shock), or NDWI < 0.05 with soil moisture < 15% (Drought Shock).",
          scientificReference: "Verbesselt et al. (2010) 'Detecting trend and seasonal changes in satellite image time series (BFAST)'.",
        },
        confidenceTiers: {
          high: { minConfidence: 0.9, action: "Trigger automated SMS/WhatsApp alert & dispatch scout with prescriptive rescue regimen" },
          medium: { minConfidence: 0.7, maxConfidence: 0.9, action: "Highlight on Project Anomaly Radar; request next scheduled observation" },
          low: { maxConfidence: 0.7, action: "Log to background telemetry buffer for trend aggregation" },
        },
        failureModesAndMitigations: [
          {
            failureMode: "False drought alarm triggered during normal winter leaf shedding (phenological senescence)",
            riskSeverity: "medium",
            mitigationStrategy: "Phenology-aware baseline: Normalize anomaly thresholds dynamically based on species deciduous calendar.",
          },
          {
            failureMode: "Cloud shadow fringe contaminating satellite pixel mimicking canopy loss",
            riskSeverity: "high",
            mitigationStrategy: "Copernicus SCL Scene Classification cloud/shadow bitmask screening before time-series delta calculation.",
          },
        ],
        targetLatencyMs: 350,
        inferenceTarget: "batch_pipeline",
        verraMrvComplianceRequirement:
          "Verra Methodology VM0047 Section 9 mandates proactive disturbance monitoring and reversal risk buffer deduction mitigation.",
      },
    };
  }

  /**
   * 2. EXECUTE CLIENT-SIDE IMAGE QUALITY EVALUATION
   */
  public evaluateImageQuality(
    canvasData: {
      width: number;
      height: number;
      meanLuminance: number;
      laplacianVariance: number;
      glarePixelPct: number;
      isScreenDetected?: boolean;
    }
  ): ImageQualityEvaluationResult {
    const minBlurThreshold = 100.0;
    const minResolutionMpx = 0.3;
    const luminanceRange: [number, number] = [40, 220];

    const resolutionMpx = (canvasData.width * canvasData.height) / 1000000;
    const isFocusAcceptable = canvasData.laplacianVariance >= minBlurThreshold;
    const isExposureAcceptable =
      canvasData.meanLuminance >= luminanceRange[0] && canvasData.meanLuminance <= luminanceRange[1];
    const isResolutionAcceptable = resolutionMpx >= minResolutionMpx;
    const isGlareAcceptable = canvasData.glarePixelPct <= 0.08;
    const isNotScreen = !canvasData.isScreenDetected;

    const passedQualityGate =
      isFocusAcceptable &&
      isExposureAcceptable &&
      isResolutionAcceptable &&
      isGlareAcceptable &&
      isNotScreen;

    const viewfinderGuidance: string[] = [];
    if (!isFocusAcceptable) viewfinderGuidance.push("Image is blurry. Hold camera steady or tap to focus.");
    if (canvasData.meanLuminance < luminanceRange[0]) viewfinderGuidance.push("Too dark. Move into better lighting or turn on flash.");
    if (canvasData.meanLuminance > luminanceRange[1]) viewfinderGuidance.push("Too bright / overexposed. Avoid direct sunlight reflection.");
    if (!isResolutionAcceptable) viewfinderGuidance.push("Resolution too low. Step closer to the sapling.");
    if (!isGlareAcceptable) viewfinderGuidance.push("Intense surface glare detected. Adjust camera angle.");
    if (!isNotScreen) viewfinderGuidance.push("Screen re-photography detected. Please capture a live physical tree.");

    if (passedQualityGate) {
      viewfinderGuidance.push("Image quality optimal for botanical AI analysis.");
    }

    return {
      passedQualityGate,
      blurLaplacianScore: Math.round(canvasData.laplacianVariance * 10) / 10,
      minBlurThreshold,
      meanLuminance: Math.round(canvasData.meanLuminance * 10) / 10,
      luminanceRange,
      isExposureAcceptable,
      resolutionMpx: Math.round(resolutionMpx * 100) / 100,
      minResolutionMpx,
      glareContaminationRatio: canvasData.glarePixelPct,
      moireScreenPatternRisk: Boolean(canvasData.isScreenDetected),
      viewfinderGuidance,
    };
  }

  /**
   * 3. EVALUATE DUPLICATE COLLISION VECTOR
   */
  public evaluateDuplicateCollision(
    dhashA: string,
    dhashB: string,
    gpsA?: { lat: number; lng: number },
    gpsB?: { lat: number; lng: number },
    shaA?: string,
    shaB?: string
  ): DuplicateDetectionResult {
    // 1. Exact SHA-256
    if (shaA && shaB && shaA.toLowerCase() === shaB.toLowerCase()) {
      return {
        isDuplicate: true,
        collisionVector: "exact_sha256",
        hammingDistance: 0,
        similarityPct: 100,
        fraudRiskLevel: "critical_fraud",
        actionRecommendation: "Reject duplicate submission immediately; log exact bitwise fraud attempt.",
      };
    }

    // 2. Perceptual dHash Hamming Distance
    let differingBits = 0;
    const len = Math.min(dhashA.length, dhashB.length);
    for (let i = 0; i < len; i++) {
      const valA = parseInt(dhashA[i], 16) || 0;
      const valB = parseInt(dhashB[i], 16) || 0;
      let xor = valA ^ valB;
      while (xor > 0) {
        if (xor & 1) differingBits++;
        xor >>= 1;
      }
    }
    const similarityPct = Math.round(((64 - differingBits) / 64) * 1000) / 10;

    // 3. Geodetic distance check
    let spatialSeparationM = 0;
    if (gpsA && gpsB) {
      const dLat = ((gpsB.lat - gpsA.lat) * Math.PI) / 180;
      const dLng = ((gpsB.lng - gpsA.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((gpsA.lat * Math.PI) / 180) *
          Math.cos((gpsB.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      spatialSeparationM = Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
    }

    // Evaluate risk
    if (differingBits <= 3) {
      if (spatialSeparationM > 15) {
        return {
          isDuplicate: true,
          collisionVector: "spatiotemporal_geodesic",
          hammingDistance: differingBits,
          similarityPct,
          spatialSeparationMeters: spatialSeparationM,
          fraudRiskLevel: "critical_fraud",
          actionRecommendation: "Reject: Identical tree photo submitted at impossible geodetic location jump (>15m).",
        };
      }
      return {
        isDuplicate: true,
        collisionVector: "perceptual_dhash",
        hammingDistance: differingBits,
        similarityPct,
        spatialSeparationMeters: spatialSeparationM,
        fraudRiskLevel: "high",
        actionRecommendation: "Reject: High perceptual similarity (>95%) matches previously registered tree photo.",
      };
    }

    if (differingBits <= 6) {
      return {
        isDuplicate: false,
        collisionVector: "perceptual_dhash",
        hammingDistance: differingBits,
        similarityPct,
        spatialSeparationMeters: spatialSeparationM,
        fraudRiskLevel: "medium",
        actionRecommendation: "Escalate to Human Reviewer: Moderate visual similarity detected.",
      };
    }

    return {
      isDuplicate: false,
      collisionVector: "none",
      hammingDistance: differingBits,
      similarityPct,
      spatialSeparationMeters: spatialSeparationM,
      fraudRiskLevel: "safe",
      actionRecommendation: "Accept: Unique tree photographic evidence.",
    };
  }
}

export const aiRequirementsService = new AiRequirementsService();
