import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, selfieBase64, beforeBase64, treeId, species, photoHash } = await req.json();

    if (!imageBase64 || !treeId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and treeId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the analysis prompt with all available images
    const userContent: any[] = [
      {
        type: "text",
        text: `Perform comprehensive multi-modal analysis of these tree plantation verification photos using advanced computer vision and botanical expertise:

VERIFICATION CHECKLIST:
1. **TREE AUTHENTICITY**: Confirm presence of a genuine, living tree/plant. Detect artificial/fake trees, drawings, or CGI.
2. **PHOTO GENUINENESS**: Analyze for authentic outdoor photography. Flag screenshots, stock photos, edited images, or digital artifacts.
3. **SPECIES VERIFICATION**: ${species ? `Verify if the tree matches "${species}". Provide detailed morphological analysis.` : "Identify species using leaf shape, bark texture, branching pattern, and other characteristics."}
4. **TREE HEALTH ASSESSMENT**: Evaluate overall health using leaf color, density, structural integrity, and signs of disease/pest damage.
5. **HUMAN VERIFICATION**: ${selfieBase64 ? "Confirm presence of a real person in natural pose with the tree." : "No selfie provided."}
6. **TEMPORAL DIFFERENCE**: ${beforeBase64 ? "Verify before/after photos show genuine change over time (growth, seasonal changes)." : "No before photo for temporal analysis."}
7. **FRAUD DETECTION**: Check for photo manipulation, duplication, or suspicious patterns using advanced image forensics.

ANALYSIS REQUIREMENTS:
- Use multi-scale analysis (close-up details + full context)
- Consider environmental context (soil, surroundings, lighting)
- Apply botanical taxonomy for species identification
- Provide confidence scores for each criterion
- Flag any inconsistencies or red flags

REJECTION CRITERIA:
- No visible tree or artificial substitute
- Evidence of photo manipulation or stock images
- Missing human in required selfie
- Identical before/after photos
- Confidence below 70% for critical checks

You MUST use the verify_tree tool for your response.`,
      },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      },
    ];

    if (selfieBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${selfieBase64}` },
      });
    }

    if (beforeBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${beforeBase64}` },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an advanced AI botanist and computer vision expert specializing in tree plantation verification. Use state-of-the-art image analysis techniques to thoroughly validate submissions. Employ multi-modal reasoning combining visual features, contextual clues, and botanical knowledge. Be extremely rigorous in fraud detection - reject any submission that shows signs of manipulation, duplication, or artificial content. Analyze lighting, shadows, textures, backgrounds, and metadata-like artifacts. For species identification, use detailed morphological characteristics. Provide quantitative confidence scores based on multiple verification criteria.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_tree",
              description: "Return comprehensive tree verification results",
              parameters: {
                type: "object",
                properties: {
                  is_tree: { type: "boolean", description: "Whether the after photo contains a real, living tree or plant using advanced visual analysis" },
                  is_genuine_photo: { type: "boolean", description: "Whether photos appear to be genuine outdoor photographs without manipulation artifacts" },
                  has_human_in_selfie: { type: "boolean", description: "Whether a real person is clearly visible and naturally posed in the selfie photo" },
                  images_are_different: { type: "boolean", description: "Whether before and after photos show genuine temporal differences" },
                  is_duplicate: { type: "boolean", description: "Whether this appears to be a duplicate or previously submitted photo" },
                  species_match: { type: "string", enum: ["match", "mismatch", "uncertain", "no_claim"], description: "Species verification result" },
                  detected_species: { type: "string", description: "Scientifically identified species with confidence reasoning" },
                  health_status: { type: "string", enum: ["healthy", "moderate", "unhealthy", "unknown"], description: "Overall tree health assessment" },
                  health_recommendation: { type: "string", description: "Specific care recommendations based on health analysis" },
                  confidence: { type: "number", description: "Overall confidence score 0-100 based on multi-criteria analysis" },
                  analysis: { type: "string", description: "Comprehensive analysis explaining all verification checks and reasoning" },
                  co2_absorption_rate: { type: "number", description: "Estimated annual CO2 absorption in kg/year based on species and size" },
                  is_native: { type: "boolean", description: "Whether this species is native to the Indian subcontinent" },
                  environmental_context: { type: "string", description: "Analysis of planting environment (soil type, climate suitability, urban/rural setting)" },
                  growth_stage: { type: "string", enum: ["sapling", "young", "mature", "unknown"], description: "Estimated growth stage of the tree" },
                  fraud_indicators: { type: "array", items: { type: "string" }, description: "List of any detected fraud indicators or red flags" },
                },
                required: ["is_tree", "is_genuine_photo", "has_human_in_selfie", "images_are_different", "species_match", "health_status", "confidence", "analysis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_tree" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from AI");

    const verification = JSON.parse(toolCall.function.arguments);

    // Determine verification status with advanced criteria
    const passesAllChecks =
      verification.is_tree &&
      verification.is_genuine_photo &&
      verification.confidence >= 75 && // Increased threshold for advanced AI
      (selfieBase64 ? verification.has_human_in_selfie : true) &&
      (beforeBase64 ? verification.images_are_different : true) &&
      !verification.is_duplicate &&
      (!verification.fraud_indicators || verification.fraud_indicators.length === 0);

    const status = passesAllChecks ? "verified" : "rejected";

    // Check for duplicate photo hash in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    let isDuplicate = false;
    if (photoHash) {
      const { data: existing } = await supabaseClient
        .from("trees")
        .select("id")
        .eq("photo_hash", photoHash)
        .neq("id", treeId)
        .limit(1);
      if (existing && existing.length > 0) isDuplicate = true;
    }

    const finalStatus = isDuplicate ? "rejected" : status;
    const finalAnalysis = isDuplicate
      ? `DUPLICATE DETECTED: This photo has been submitted before. ${verification.analysis}`
      : verification.analysis;

    const { error: updateError } = await supabaseClient
      .from("trees")
      .update({
        verification_status: finalStatus,
        ai_confidence: verification.confidence,
        ai_analysis: finalAnalysis,
        ai_detected_species: verification.detected_species || null,
        ai_health_status: verification.health_status,
        ai_health_recommendation: verification.health_recommendation,
        ai_co2_absorption: verification.co2_absorption_rate,
        ai_is_native: verification.is_native,
        ai_environmental_context: verification.environmental_context,
        ai_growth_stage: verification.growth_stage,
        ai_fraud_indicators: verification.fraud_indicators,
        updated_at: new Date().toISOString(),
      })
      .eq("id", treeId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw new Error("Failed to update tree record");
    }

    return new Response(
      JSON.stringify({ status: finalStatus, verification: { ...verification, is_duplicate: isDuplicate } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-tree error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
