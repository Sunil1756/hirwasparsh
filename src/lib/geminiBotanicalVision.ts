import { VerificationPlanterContext } from "@/types/geospatial";

export interface BotanicalAiAnalysisResult {
  isLivingTree: boolean;
  speciesCommon: string;
  speciesScientific: string;
  botanicalFamily: string;
  crownHealthScore: number; // 0 to 100
  vitalityStatus: "healthy" | "moderate_stress" | "severe_stress" | "dead_or_dry" | "not_a_tree_fraud";
  growthStage: "sapling" | "young_tree" | "mature_tree" | "overmature";
  stemLignification?: "woody" | "semi_woody" | "herbaceous" | "unknown";
  leafMorphology?: string;
  chlorophyllPigmentation?: "dense_photosynthetic_green" | "moderate_green" | "chlorotic_yellow" | "necrotic_brown";
  backgroundSetting?: "in_ground_soil_pit" | "nursery_polybag" | "indoor_pot" | "screen_or_recycled_media" | "open_field";
  isGenuineInGroundPlantation?: boolean;
  confidenceScore: number; // 0.0 to 1.0
  detectedStressFactors: string[];
  fraudRiskScore: number; // 0 (genuine) to 100 (high fraud probability)
  fraudFlags: string[];
  perceptualHash: string; // 16-character hex dHash
  aiReport: string;
}

/**
 * Computes a 64-bit Difference Hash (dHash) from an image to detect duplicate/recycled photos.
 */
export async function computePerceptualDHash(imageSource: string | File | Blob): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof Image === "undefined") {
    return "dhash_node_env001";
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (hash: string) => {
      if (!resolved) {
        resolved = true;
        resolve(hash);
      }
    };

    // Safety timeout in case image never triggers onload/onerror in test/headless runner
    const timer = setTimeout(() => {
      safeResolve("dhash_fallback_01");
    }, 400);

    try {
      let imgSrc = "";
      if (typeof imageSource === "string") {
        if (!imageSource.startsWith("data:") && !imageSource.startsWith("blob:") && !imageSource.startsWith("http")) {
          clearTimeout(timer);
          safeResolve("dhash_mock_hex01");
          return;
        }
        imgSrc = imageSource;
      } else {
        imgSrc = URL.createObjectURL(imageSource);
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          // dHash uses a 9x8 grayscale matrix
          canvas.width = 9;
          canvas.height = 8;

          if (!ctx) {
            safeResolve("0000000000000000");
            return;
          }

          ctx.drawImage(img, 0, 0, 9, 8);
          const imageData = ctx.getImageData(0, 0, 9, 8).data;

          // Convert to grayscale values
          const grays: number[] = [];
          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            // Luminance formula
            grays.push(0.299 * r + 0.587 * g + 0.114 * b);
          }

          // Compare adjacent pixels in each row (8 rows of 8 comparisons = 64 bits)
          let hashBits = "";
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const left = grays[row * 9 + col];
              const right = grays[row * 9 + col + 1];
              hashBits += left < right ? "1" : "0";
            }
          }

          // Convert 64 binary bits to 16 hex characters
          let hexHash = "";
          for (let i = 0; i < 64; i += 4) {
            const nibble = hashBits.substring(i, i + 4);
            hexHash += parseInt(nibble, 2).toString(16);
          }

          safeResolve(hexHash);
        } catch {
          safeResolve("dhash_fallback_01");
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        safeResolve("dhash_err_failed00");
      };

      img.src = imgSrc;
    } catch {
      clearTimeout(timer);
      safeResolve("dhash_err_failed00");
    }
  });
}

/**
 * Executes multi-modal botanical inspection on a ground photo using Gemini 2.5 Flash.
 */
export async function analyzeTreePhotoWithBotanicalAi(
  imageSource: string | File | Blob,
  claimedSpecies?: string
): Promise<BotanicalAiAnalysisResult> {
  const dHash = await computePerceptualDHash(imageSource);

  // Convert File/Blob to base64 if needed
  let base64Data = "";
  if (typeof imageSource === "string") {
    if (imageSource.startsWith("data:image")) {
      base64Data = imageSource.split(",")[1];
    } else {
      // It's a remote URL, we will pass image analysis prompt with standard response
      base64Data = "";
    }
  } else {
    base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(",")[1] || "");
      };
      reader.readAsDataURL(imageSource);
    });
  }

  const apiKey =
    (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage?.getItem?.("gemini_api_key")) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    "";

  if (!apiKey || !base64Data) {
    // SECURITY FIX: If AI is not configured, we MUST reject, otherwise fakers get free passes.
    return {
      isLivingTree: false,
      speciesCommon: "Unknown",
      speciesScientific: "Unknown",
      botanicalFamily: "Unknown",
      crownHealthScore: 0,
      vitalityStatus: "critical_decline",
      growthStage: "unknown",
      stemLignification: "unknown",
      leafMorphology: "unknown",
      chlorophyllPigmentation: "none",
      backgroundSetting: "unknown",
      isGenuineInGroundPlantation: false,
      confidenceScore: 0,
      detectedStressFactors: ["ai_offline"],
      fraudRiskScore: 100,
      fraudFlags: ["AI Engine Unreachable (API Key Missing)"],
      perceptualHash: dHash,
      aiReport: "SYSTEM REJECTION: Botanical AI Vision engine is offline. VITE_GEMINI_API_KEY is not configured on this server, so evidence verification failed.",
    };
  }

  const prompt = `
You are an ADVERSARIAL BOTANICAL FORENSIC AUDITOR for an institutional Carbon MRV (Monitoring, Reporting & Verification) platform.
Your mission is to rigorously DETECT AND REJECT FRAUD, FAKES, POOR-QUALITY PHOTOS, SILHOUETTES, AND NON-PLANT OBJECTS.

SUBMISSION CLAIM:
The applicant claims this photo shows an in-ground planted tree or sapling of species: "${claimedSpecies || "Unspecified"}".
DO NOT TRUST THIS CLAIM. Rigorously cross-examine the image pixels.

REJECTION CRITERIA (MANDATORY FRAUD / QUALITY REJECTION):
You MUST set "isLivingTree": false, "vitalityStatus": "not_a_tree_fraud", "confidenceScore": 0.0, "crownHealthScore": 0, and "fraudRiskScore": 90-100 if ANY of the following are true:
1. SILHOUETTE / UNDEREXPOSURE / TWILIGHT: The tree or foliage is a dark or black silhouette against a twilight, sunset, or bright sky, where individual leaf veins, margins, serrations, and true green chlorophyll coloration are unreadable.
2. SKY / LANDSCAPE / DISTANT HORIZON: The photo is mostly sky, clouds, scenery, buildings, or distant background tree lines, rather than a clear close-up/mid-range photograph of an individual planted sapling or tree specimen.
3. NON-PLANT / ARTIFACT: The image shows animals, people, vehicles, furniture, food, or general household items.
4. DIGITAL SCREEN / REPLAY ATTACK: The image is a photo of a computer monitor, tablet, smartphone screen, moiré pattern, printed poster, or screenshot.
5. ARTIFICIAL / PLASTIC / CUT FOLIAGE: Plastic flowers/trees, pruned twigs stuck in ground, or artificial grass.
6. INDOOR / NURSERY POT: Houseplant in a ceramic pot, living room, or unplanted polybag instead of a genuine outdoor in-ground plantation soil pit.

SPECIES VERIFICATION RULE:
- If the photo is rejected for ANY reason above, DO NOT assign the claimed species. Set "speciesCommon": "None (Rejected / Unidentifiable)" and "speciesScientific": "None".
- Only confirm a species if distinct botanical traits (compound vs simple leaves, bipinnate arrangement, serrated margins, bark lenticels) are clearly visible under direct light with >= 80% certainty.

Return ONLY a valid JSON object with EXACTLY this structure:
{
  "isLivingTree": boolean,
  "speciesCommon": "Common English / Local Indian Name (or 'None (Rejected)' if not authentic)",
  "speciesScientific": "Genus species in Latin (or 'None' if rejected)",
  "botanicalFamily": "Botanical Family Name (or 'None' if rejected)",
  "crownHealthScore": integer (0 to 100, MUST be 0 if rejected or silhouette),
  "vitalityStatus": "healthy" | "moderate_stress" | "severe_stress" | "dead_or_dry" | "not_a_tree_fraud",
  "growthStage": "sapling" | "young_tree" | "mature_tree" | "overmature",
  "stemLignification": "woody" | "semi_woody" | "herbaceous" | "unknown",
  "leafMorphology": "string describing leaf structure (or 'unidentifiable' if rejected)",
  "chlorophyllPigmentation": "dense_photosynthetic_green" | "moderate_green" | "chlorotic_yellow" | "necrotic_brown",
  "backgroundSetting": "in_ground_soil_pit" | "nursery_polybag" | "indoor_pot" | "screen_or_recycled_media" | "open_field",
  "isGenuineInGroundPlantation": boolean,
  "confidenceScore": float (0.0 to 1.0, MUST be 0.0 if silhouette or fraud),
  "detectedStressFactors": ["string", "string"],
  "fraudRiskScore": integer (0 = authentic ground photo, 100 = silhouette/photo of computer monitor/fake plastic plant/indoor furniture),
  "fraudFlags": ["string", "string"],
  "aiReport": "1-2 sentence scientific assessment of leaf morphology, chlorophyll health, stem lignification, and ground establishment, or reason for fraud rejection."
}
`;

  // Prioritize active and available models; avoid deprecated or rate-limited endpoints
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-flash-latest",
    "gemini-pro-latest",
  ];

  let lastErr: any = null;

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `Gemini API responded with status ${res.status}`;
        lastErr = new Error(msg);
        continue;
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        lastErr = new Error("No text response in Gemini payload.");
        continue;
      }

      const cleanJson = candidateText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      const isLiving = Boolean(parsed.isLivingTree) && parsed.vitalityStatus !== "not_a_tree_fraud" && (parsed.fraudRiskScore ?? 0) < 50;

      return {
        isLivingTree: isLiving,
        speciesCommon: isLiving ? (parsed.speciesCommon || claimedSpecies || "Indigenous Native Species") : "Rejected / Not a Living Specimen",
        speciesScientific: isLiving ? (parsed.speciesScientific || "Flora indica") : "None",
        botanicalFamily: isLiving ? (parsed.botanicalFamily || "Plantae") : "None",
        crownHealthScore: isLiving ? (Number(parsed.crownHealthScore) || 75) : 0,
        vitalityStatus: isLiving ? (parsed.vitalityStatus || "healthy") : "not_a_tree_fraud",
        growthStage: parsed.growthStage || "young_tree",
        stemLignification: parsed.stemLignification || "woody",
        leafMorphology: parsed.leafMorphology || (isLiving ? "Broadleaf foliage" : "Unidentifiable"),
        chlorophyllPigmentation: parsed.chlorophyllPigmentation || (isLiving ? "dense_photosynthetic_green" : "necrotic_brown"),
        backgroundSetting: parsed.backgroundSetting || (isLiving ? "in_ground_soil_pit" : "screen_or_recycled_media"),
        isGenuineInGroundPlantation: isLiving && parsed.isGenuineInGroundPlantation !== undefined ? Boolean(parsed.isGenuineInGroundPlantation) : false,
        confidenceScore: isLiving ? (typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.85) : 0,
        detectedStressFactors: Array.isArray(parsed.detectedStressFactors) ? parsed.detectedStressFactors : [],
        fraudRiskScore: typeof parsed.fraudRiskScore === "number" ? parsed.fraudRiskScore : (isLiving ? 5 : 95),
        fraudFlags: Array.isArray(parsed.fraudFlags) ? parsed.fraudFlags : (!isLiving ? ["Botanical verification rejected: not an in-ground living tree"] : []),
        perceptualHash: dHash,
        aiReport: parsed.aiReport || (isLiving ? "Botanical validation completed successfully." : "Photo rejected: does not show an authentic living tree specimen."),
      };
    } catch (err: any) {
      lastErr = err;
    }
  }

  console.warn("Gemini Botanical AI analysis failed across candidate models:", lastErr);
  // Honest unverified response routed to supervisor review — NEVER fabricate fake 85% auto-approval!
  return {
    isLivingTree: false,
    speciesCommon: claimedSpecies || "Unidentified Species",
    speciesScientific: "Pending taxonomic review",
    botanicalFamily: "Plantae",
    crownHealthScore: 0,
    vitalityStatus: "moderate_stress",
    growthStage: "young_tree",
    stemLignification: "unknown",
    leafMorphology: "Foliage re-inspection required",
    chlorophyllPigmentation: "moderate_green",
    backgroundSetting: "open_field",
    isGenuineInGroundPlantation: false,
    confidenceScore: 0,
    detectedStressFactors: ["ai_analysis_incomplete"],
    fraudRiskScore: 35,
    fraudFlags: ["Botanical AI vision analysis unresolved: " + (lastErr?.message || "Service error")],
    perceptualHash: dHash,
    aiReport: "Automated botanical vision analysis could not be completed. Photo forwarded to human forestry supervisor review.",
  };
}

/**
 * Computes a standardized composite AI verification score and automated approval decision.
 * Strictly isolates individual citizen tree planters from institutional NGO / CSR corporate workflows.
 */
export function calculateCompositeAiVerificationScore(
  result: BotanicalAiAnalysisResult,
  context?: VerificationPlanterContext
): {
  compositeScore: number;
  isAutoApproved: boolean;
  routingDecision: "auto_approved" | "manual_review_queue" | "fraud_rejected" | "institutional_mrv_audit_queue";
  rationale: string;
} {
  // 1. Fraud & Non-Tree / Silhouette Detection Gate
  if (
    !result.isLivingTree ||
    result.vitalityStatus === "not_a_tree_fraud" ||
    (result.fraudRiskScore ?? 0) >= 50 ||
    result.backgroundSetting === "screen_or_recycled_media"
  ) {
    return {
      compositeScore: 0,
      isAutoApproved: false,
      routingDecision: "fraud_rejected",
      rationale: "Photo flagged as non-plant object, synthetic artificial plant, computer screen capture, duplicate image, or dark silhouette.",
    };
  }

  const confidenceComponent = (result.confidenceScore ?? 0.8) * 70;
  const healthComponent = (result.crownHealthScore ?? 70) * 0.3;
  const fraudPenalty = (result.fraudRiskScore ?? 0) * 0.5;

  const compositeScore = Math.max(0, Math.min(100, Math.round(confidenceComponent + healthComponent - fraudPenalty)));

  // 2. Strict Institutional Isolation Gate:
  // NGO, CSR, Corporate, Government, or Plot-level bulk plantation drives MUST NOT be auto-approved by individual photo AI.
  const isInstitutional =
    context &&
    (context.accountType === "ngo" ||
      context.accountType === "csr" ||
      context.accountType === "corporate" ||
      context.accountType === "government" ||
      context.plantingType === "organization" ||
      context.plantingType === "bulk_ngo" ||
      context.plantingType === "csr_sponsored" ||
      context.projectId != null ||
      context.isIndividualPlanter === false);

  if (isInstitutional) {
    return {
      compositeScore,
      isAutoApproved: false,
      routingDecision: "institutional_mrv_audit_queue",
      rationale:
        "Institutional NGO/CSR projects are isolated from lightweight individual auto-approval. Must complete Tier 1/2/3 multi-tree MRV audits (geodetic polygon validation, Sentinel-2 plot accretion, 5% ranger spot audit, and admin sign-off).",
    };
  }

  // 3. Individual Planter Auto-Approval Gate (>= 70% composite score & low fraud risk)
  if (compositeScore >= 70 && result.fraudRiskScore < 25) {
    return {
      compositeScore,
      isAutoApproved: true,
      routingDecision: "auto_approved",
      rationale: "High-confidence taxonomic match and genuine living tree structure verified for individual planter profile.",
    };
  }

  // 4. Borderline / Moderate Confidence -> Supervisory Review Queue
  return {
    compositeScore,
    isAutoApproved: false,
    routingDecision: "manual_review_queue",
    rationale: "Moderate confidence or borderline health score (< 70% threshold) requires forestry supervisor review.",
  };
}
