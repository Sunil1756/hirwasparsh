/**
 * Direct Google Gemini AI Integration for Green Enlightenment
 * Supports Gemini 2.5 Flash & Gemini Pro for multimodal plant vision,
 * health diagnosis, species identification, and carbon/agroforestry intelligence.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SpeciesDetectionResult {
  common_name: string;
  scientific_name: string;
  confidence: number;
  description: string;
  growth_rate: "slow" | "medium" | "fast";
  water_requirement: "low" | "medium" | "high";
  co2_absorption_kg_per_year: number;
  native_regions: string[];
  care_tips: string[];
}

export interface TreeDiagnosisResult {
  is_plant: boolean;
  diagnosis: string;
  confidence: number;
  severity: "none" | "mild" | "moderate" | "severe";
  symptoms_observed: string[];
  likely_causes: string[];
  treatment_steps: string[];
  organic_remedies: string[];
  prevention: string[];
  urgency_days: number;
}

export interface SeasonalCareResult {
  season: string;
  summary: string;
  watering: string;
  mulching: string;
  fertilizing: string;
  pruning: string;
  pest_watch: string[];
  risks: string[];
  monthly_checklist: string[];
}

export interface SpeciesRecommendationResult {
  location_summary: string;
  best_planting_window: string;
  recommendations: Array<{
    common_name: string;
    scientific_name: string;
    native: boolean;
    suitability: number;
    why: string;
    co2_kg_per_year: number;
    water_need: "low" | "medium" | "high";
    growth_rate: "slow" | "medium" | "fast";
    care_note: string;
  }>;
  avoid: string[];
}

export interface VerificationResult {
  tree_visibility_score: number;
  environmental_authenticity_score: number;
  image_authenticity_score: number;
  species_match_score: number;
  human_presence_score: number;
  duplicate_probability_score: number;
  is_tree: boolean;
  is_genuine_photo: boolean;
  is_indoor: boolean;
  is_ai_generated: boolean;
  plantation_stage: "sapling" | "young" | "mature" | "unknown";
  health_status: "healthy" | "moderate" | "unhealthy" | "unknown";
  detected_species?: string;
  fraud_signals: string[];
  analysis: string;
  co2_absorption_rate?: number;
}

/**
 * Retrieves the Gemini API Key from environment or local storage
 */
export function getGeminiApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 5) return envKey;
  return localStorage.getItem("green_gemini_api_key") || null;
}

export function setGeminiApiKey(key: string) {
  if (!key) {
    localStorage.removeItem("green_gemini_api_key");
  } else {
    localStorage.setItem("green_gemini_api_key", key.trim());
  }
}

/**
 * Call Gemini REST API directly using JSON generation mode
 */
async function callGeminiDirect(prompt: string, imageBase64?: string, systemInstruction?: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_SET");

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  if (imageBase64) {
    const cleanB64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: cleanB64,
      },
    });
  }
  parts.push({ text: prompt });

  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("No response received from Gemini");

  return JSON.parse(rawText);
}

/**
 * Identify species from a tree photo
 */
export async function detectSpeciesAI(imageBase64: string): Promise<SpeciesDetectionResult> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    const systemPrompt = `You are an expert botanist and agroforestry specialist specializing in Indian and tropical flora. Identify the plant/tree species with high scientific accuracy. Return strict JSON matching the schema.`;
    const prompt = `Analyze this tree/plant photograph. Provide:
{
  "common_name": string (e.g. "Neem", "Banyan", "Peepal", "Mango", "Gulmohar"),
  "scientific_name": string (e.g. "Azadirachta indica"),
  "confidence": number (0-100),
  "description": string (short overview of ecological value),
  "growth_rate": "slow" | "medium" | "fast",
  "water_requirement": "low" | "medium" | "high",
  "co2_absorption_kg_per_year": number (average annual sequestration),
  "native_regions": string[] (e.g. ["Maharashtra", "Western Ghats", "Deccan"]),
  "care_tips": string[] (3 practical care instructions)
}`;
    return await callGeminiDirect(prompt, imageBase64, systemPrompt);
  }

  // Fallback to Supabase Edge Function
  const { data, error } = await supabase.functions.invoke("detect-species", {
    body: { imageBase64 },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

/**
 * Diagnose tree pathology & diseases from photos
 */
export async function diagnoseTreeAI(params: {
  imageBase64: string;
  species?: string;
  symptoms?: string;
  ageMonths?: number;
  location?: string;
}): Promise<TreeDiagnosisResult> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    const systemPrompt = `You are an expert Indian arborist and plant pathologist advising community tree planters and farmers. Reference low-cost organic remedies (neem oil, cow dung slurry, trichoderma, bio-fungicides) available in India.`;
    const prompt = `Diagnose this tree image.
Tree Species: ${params.species || "Unknown"}
Age: ${params.ageMonths ?? "unknown"} months
Location: ${params.location || "Maharashtra, India"}
Planter Symptoms Description: ${params.symptoms || "None provided"}

Provide JSON output:
{
  "is_plant": boolean,
  "diagnosis": string (name of pest, disease, or deficiency),
  "confidence": number (0-100),
  "severity": "none" | "mild" | "moderate" | "severe",
  "symptoms_observed": string[],
  "likely_causes": string[],
  "treatment_steps": string[],
  "organic_remedies": string[],
  "prevention": string[],
  "urgency_days": number
}`;
    return await callGeminiDirect(prompt, params.imageBase64, systemPrompt);
  }

  const { data, error } = await supabase.functions.invoke("tree-assistant", {
    body: { mode: "diagnose", ...params },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).result;
}

/**
 * Seasonal care plan generator
 */
export async function getSeasonalCareAI(params: {
  species?: string;
  ageMonths?: number;
  location?: string;
  month?: string;
}): Promise<SeasonalCareResult> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    const currentMonth = params.month || new Date().toLocaleString("en-IN", { month: "long" });
    const prompt = `Generate a seasonal care plan for a ${params.species || "young native tree"}, age ${params.ageMonths ?? 6} months, planted in ${params.location || "Maharashtra, India"} during ${currentMonth}.
Format as JSON:
{
  "season": string,
  "summary": string,
  "watering": string,
  "mulching": string,
  "fertilizing": string,
  "pruning": string,
  "pest_watch": string[],
  "risks": string[],
  "monthly_checklist": string[]
}`;
    return await callGeminiDirect(prompt, undefined, "You are a professional arborist.");
  }

  const { data, error } = await supabase.functions.invoke("tree-assistant", {
    body: { mode: "seasonal", ...params },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).result;
}

/**
 * Map My Crop style Parcel / Canopy Satellite Vegetation interpretation
 */
export async function analyzeCanopyWithAI(params: {
  plotName: string;
  areaAcres: number;
  district: string;
  treeCount: number;
  ndviScore: number;
}): Promise<{
  canopy_health_summary: string;
  biomass_assessment: string;
  annual_carbon_credits_mt: number;
  water_stress_index: string;
  recommendations: string[];
}> {
  const apiKey = getGeminiApiKey();
  const prompt = `Act as an agroforestry satellite analyst for the Green Enlightenment platform (inspired by Map My Crop).
Analyze this plantation plot:
- Plot Name: ${params.plotName}
- Area: ${params.areaAcres} Acres
- District: ${params.district}
- Tree Count: ${params.treeCount}
- Observed Satellite NDVI Index: ${params.ndviScore} (Range -1.0 to 1.0, where >0.6 is dense healthy canopy)

Provide structured JSON:
{
  "canopy_health_summary": string,
  "biomass_assessment": string,
  "annual_carbon_credits_mt": number (Metric Tons CO2e per year),
  "water_stress_index": "Low" | "Moderate" | "Severe",
  "recommendations": string[]
}`;

  if (apiKey) {
    return await callGeminiDirect(prompt, undefined, "You are an expert remote sensing agroforestry scientist.");
  }

  // Built-in calculation fallback if API key is not yet set
  const co2Estimate = Math.round(params.treeCount * 0.022 * (params.ndviScore > 0.4 ? 1.1 : 0.8) * 10) / 10;
  return {
    canopy_health_summary: params.ndviScore > 0.5 
      ? `High vegetation vigor detected across ${params.areaAcres} acres in ${params.district}. Canopy closure is advancing on schedule.`
      : `Moderate vegetation vigor. Supplemental mulch and irrigation recommended.`,
    biomass_assessment: `Estimated average standing biomass of ${(params.areaAcres * 12.5).toFixed(1)} MT across ${params.treeCount} trees.`,
    annual_carbon_credits_mt: co2Estimate,
    water_stress_index: params.ndviScore < 0.35 ? "Moderate" : "Low",
    recommendations: [
      "Maintain active organic mulching around tree root zones to preserve soil moisture.",
      "Monitor canopy density via monthly satellite NDVI spectral sweeps.",
      "Log growth height updates every 90 days for verifiable carbon credit issuance."
    ]
  };
}
