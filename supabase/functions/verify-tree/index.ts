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
    // ---- Authentication ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = claimsData.claims.sub;

    const { imageBase64, selfieBase64, beforeBase64, treeId, species, photoHash } = await req.json();

    if (!imageBase64 || !treeId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and treeId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify tree ownership before doing any AI work
    const { data: ownedTree, error: ownErr } = await userClient
      .from("trees").select("id, user_id").eq("id", treeId).maybeSingle();
    if (ownErr || !ownedTree || ownedTree.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the analysis prompt with all available images
    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze these tree plantation photos for verification. Perform ALL of the following checks:

1. TREE PRESENCE: Is there a real tree/plant in the "after" photo? (not fake/artificial)
2. GENUINE PHOTO: Is it an authentic outdoor photo? (not screenshot, stock image, or digitally manipulated)
3. SPECIES MATCH: ${species ? `Does it look like "${species}"?` : "Identify the species if possible."}
4. HEALTH STATUS: What's the tree's health? (healthy/moderate/unhealthy)
5. ${selfieBase64 ? "HUMAN PRESENCE: Is there a real person visible in the selfie photo?" : "No selfie provided for human check."}
6. ${beforeBase64 ? "IMAGE DIFFERENCE: Are the before and after photos actually different images (not the same photo uploaded twice)?" : "No before photo provided for comparison."}

Provide a confidence score 0-100 and mark as failed if:
- No real tree detected
- Photos appear fake or duplicated
- ${selfieBase64 ? "No human visible in selfie" : ""}

You MUST respond using the verify_tree tool.`,
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert botanist and anti-fraud image analyst for a tree plantation verification platform. You must thoroughly check every submitted image for authenticity. Be strict — reject anything suspicious. You MUST respond using the verify_tree tool.`,
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
                  is_tree: { type: "boolean", description: "Whether the after photo contains a real tree or plant" },
                  is_genuine_photo: { type: "boolean", description: "Whether photos appear to be genuine outdoor photographs" },
                  has_human_in_selfie: { type: "boolean", description: "Whether a real person is visible in the selfie photo" },
                  images_are_different: { type: "boolean", description: "Whether before and after photos are actually different images" },
                  is_duplicate: { type: "boolean", description: "Whether this appears to be a duplicate/reused submission" },
                  species_match: { type: "string", enum: ["match", "mismatch", "uncertain", "no_claim"] },
                  detected_species: { type: "string", description: "The species detected in the photo" },
                  health_status: { type: "string", enum: ["healthy", "moderate", "unhealthy", "unknown"] },
                  health_recommendation: { type: "string", description: "Care recommendation based on health assessment" },
                  confidence: { type: "number", description: "Overall confidence score 0-100" },
                  analysis: { type: "string", description: "Detailed analysis explaining all verification checks" },
                  co2_absorption_rate: { type: "number", description: "Estimated CO2 absorption in kg/year for this species" },
                  is_native: { type: "boolean", description: "Whether this species is native to the Indian subcontinent" },
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

    // Determine verification status with strict rules
    const passesAllChecks =
      verification.is_tree &&
      verification.is_genuine_photo &&
      verification.confidence >= 60 &&
      (selfieBase64 ? verification.has_human_in_selfie : true) &&
      (beforeBase64 ? verification.images_are_different : true) &&
      !verification.is_duplicate;

    const status = passesAllChecks ? "verified" : "rejected";

    // Check for duplicate photo hash in database
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
