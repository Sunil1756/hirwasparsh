import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Weighted scoring rubric (sums to 100)
const WEIGHTS = {
  tree_visibility: 20,
  environmental_authenticity: 15,
  gps_accuracy: 15,
  image_authenticity: 15,
  duplicate_probability: 15,
  species_confidence: 10,
  user_trust: 10,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
      return new Response(JSON.stringify({ error: "imageBase64 and treeId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify ownership + load tree (need lat/lng for GPS scoring)
    const { data: ownedTree, error: ownErr } = await userClient
      .from("trees").select("id, user_id, latitude, longitude").eq("id", treeId).maybeSingle();
    if (ownErr || !ownedTree || ownedTree.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: any[] = [
      {
        type: "text",
        text: `You are an environmental verification auditor for a tree-plantation platform. Analyze ALL provided photos as a complete plantation submission and score each dimension 0-100.

EVALUATION DIMENSIONS (score each 0-100):

1. TREE_VISIBILITY: Is a real living tree/sapling clearly visible in the after photo? Estimate plantation stage (sapling/young/mature) and apparent health.

2. ENVIRONMENTAL_AUTHENTICITY: Does the surrounding environment look like a genuine outdoor plantation site? Check soil visibility, ground texture, natural vegetation consistency, sunlight/shadow direction consistency, sky if visible. PENALIZE indoor scenes, potted houseplants on tiles/carpet, artificial backdrops, or implausible environments.

3. IMAGE_AUTHENTICITY: Is the photo a genuine camera capture? PENALIZE: AI-generated imagery (telltale smoothness, impossible details, fused leaves), screenshots (UI chrome, status bars), heavy filters, watermarks/overlays, obvious digital editing, blurriness suggesting evasion, stock-photo quality.

4. SPECIES_MATCH: ${species ? `User claims species "${species}". Score how well the photographed plant matches.` : "No species claimed — score 70 baseline."}

5. HUMAN_PRESENCE: ${selfieBase64 ? "Selfie provided — verify a real human face is visible WITH the tree in an outdoor setting (not separate scenes)." : "No selfie required — return 100."}

6. IMAGE_DIFFERENCE: ${beforeBase64 ? "Verify before & after photos are genuinely different captures of the same site (not same image reused, not totally unrelated locations)." : "No before photo — return 100."}

Also detect overall fraud signals: indoor plantation, mass-fake patterns, duplicate-looking submission, GPS-spoofing visual cues (e.g. environment doesn't match claimed region).

Respond ONLY via the verify_tree tool. Be strict — when in doubt, score lower.`,
      },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
    ];
    if (selfieBase64) userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${selfieBase64}` } });
    if (beforeBase64) userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${beforeBase64}` } });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: `You are a STRICT environmental plantation auditor and anti-fraud image analyst.

COMMON-SENSE GATE (apply FIRST, before anything else):
- The submission MUST show an actual living tree or sapling planted in soil/ground.
- If the photo shows ONLY a human/face/selfie with NO tree, a random object (car, building, food, furniture, animal, paper, screen, hand, etc.), an empty room, a drawing/painting, a meme, a logo, a plain background, dead wood, cut flowers, vegetables, fruits in a market, or anything that is clearly NOT a planted tree — set is_tree=false and score tree_visibility 0-10.
- A potted houseplant on a tile floor / table / indoor setting is NOT a valid plantation — penalize heavily (is_indoor=true, tree_visibility ≤ 30).
- Use human common sense like a human auditor: would a reasonable person accept this as proof someone planted a tree outdoors? If no → reject.

You analyze the COMPLETE plantation context — tree presence, environment realism, image authenticity, human presence, species — not just species name. You MUST respond using the verify_tree tool. Be strict; when in doubt, score lower.` },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "verify_tree",
            description: "Comprehensive environmental verification analysis",
            parameters: {
              type: "object",
              properties: {
                // Dimension scores (0-100 each)
                tree_visibility_score: { type: "number" },
                environmental_authenticity_score: { type: "number" },
                image_authenticity_score: { type: "number" },
                species_match_score: { type: "number" },
                human_presence_score: { type: "number" },
                image_difference_score: { type: "number" },
                duplicate_probability_score: { type: "number", description: "0-100 likelihood this is a duplicate (HIGH = bad)" },
                // Categorical
                is_tree: { type: "boolean" },
                is_genuine_photo: { type: "boolean" },
                is_indoor: { type: "boolean" },
                is_ai_generated: { type: "boolean" },
                is_screenshot: { type: "boolean" },
                has_watermark: { type: "boolean" },
                has_human_in_selfie: { type: "boolean" },
                images_are_different: { type: "boolean" },
                plantation_stage: { type: "string", enum: ["sapling", "young", "mature", "unknown"] },
                health_status: { type: "string", enum: ["healthy", "moderate", "unhealthy", "unknown"] },
                detected_species: { type: "string" },
                health_recommendation: { type: "string" },
                fraud_signals: { type: "array", items: { type: "string" }, description: "Specific fraud indicators found" },
                analysis: { type: "string", description: "Detailed multi-dimensional analysis explaining each score" },
                co2_absorption_rate: { type: "number" },
                is_native: { type: "boolean" },
              },
              required: [
                "tree_visibility_score", "environmental_authenticity_score", "image_authenticity_score",
                "species_match_score", "human_presence_score", "image_difference_score", "duplicate_probability_score",
                "is_tree", "is_genuine_photo", "is_indoor", "is_ai_generated", "is_screenshot",
                "health_status", "fraud_signals", "analysis"
              ],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "verify_tree" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from AI");
    const v = JSON.parse(toolCall.function.arguments);

    // Service-role client for privileged ops
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // ===== Duplicate hash check =====
    let hashDuplicate = false;
    if (photoHash) {
      const { data: existing } = await supabaseClient
        .from("trees").select("id").eq("photo_hash", photoHash).neq("id", treeId).limit(1);
      if (existing && existing.length > 0) hashDuplicate = true;
    }

    // ===== GPS accuracy score =====
    // Valid coords present + within plausible India/Maharashtra bounds = high
    let gpsScore = 0;
    const lat = ownedTree.latitude, lng = ownedTree.longitude;
    if (lat != null && lng != null) {
      const inIndia = lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
      const inMaharashtra = lat >= 15.5 && lat <= 22.5 && lng >= 72 && lng <= 81;
      gpsScore = inMaharashtra ? 100 : inIndia ? 75 : 40;
    }

    // ===== User trust history =====
    const { count: approvedCount } = await supabaseClient
      .from("trees").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("admin_status", "approved");
    const { count: rejectedCount } = await supabaseClient
      .from("trees").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("admin_status", "rejected");
    const ac = approvedCount || 0, rc = rejectedCount || 0;
    const totalDecided = ac + rc;
    let userTrustScore = 50; // neutral baseline for new users
    if (totalDecided > 0) {
      const ratio = ac / totalDecided;
      userTrustScore = Math.round(Math.min(100, 30 + ratio * 70 + Math.min(ac, 10) * 2));
    }

    // ===== Duplicate probability (combined hash + AI signal) =====
    let dupProb = Number(v.duplicate_probability_score) || 0;
    if (hashDuplicate) dupProb = Math.max(dupProb, 95);
    // duplicate_probability contributes inversely (higher dup = lower score)
    const dupContribution = 100 - dupProb;

    // ===== Weighted composite score =====
    const dims = {
      tree_visibility: Number(v.tree_visibility_score) || 0,
      environmental_authenticity: Number(v.environmental_authenticity_score) || 0,
      gps_accuracy: gpsScore,
      image_authenticity: Number(v.image_authenticity_score) || 0,
      duplicate_probability: dupContribution,
      species_confidence: Number(v.species_match_score) || 0,
      user_trust: userTrustScore,
    };

    let score = 0;
    for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      score += (dims[k] * WEIGHTS[k]) / 100;
    }

    // Hard fraud penalties
    if (v.is_indoor) score -= 25;
    if (v.is_ai_generated) score -= 40;
    if (v.is_screenshot) score -= 35;
    if (!v.is_tree) score -= 50;
    if (selfieBase64 && v.has_human_in_selfie === false) score -= 20;
    if (beforeBase64 && v.images_are_different === false) score -= 25;

    score = Math.max(0, Math.min(100, Math.round(score)));

    // ===== Decision logic =====
    let finalStatus: "verified" | "rejected" | "pending";
    let flaggedReason: string | null = null;
    let prefix = "";

    if (score < 50 || hashDuplicate || v.is_ai_generated || v.is_screenshot || !v.is_tree) {
      finalStatus = "rejected";
      const reasons = [];
      if (score < 50) reasons.push(`AI score ${score}/100 < 50%`);
      if (hashDuplicate) reasons.push("duplicate photo detected");
      if (v.is_ai_generated) reasons.push("AI-generated image detected");
      if (v.is_screenshot) reasons.push("screenshot detected");
      if (!v.is_tree) reasons.push("no real tree detected");
      prefix = `❌ AUTO-REJECTED (${reasons.join("; ")}). `;
    } else if (score < 75) {
      finalStatus = "pending";
      flaggedReason = `Pending manual review — AI verification score ${score}/100`;
      prefix = `⚠️ FLAGGED FOR REVIEW (score ${score}/100). `;
    } else {
      finalStatus = "verified";
      prefix = `✅ AUTO-VERIFIED (score ${score}/100). `;
    }

    const breakdown = `\n\n📊 Score Breakdown:\n` +
      `• Tree Visibility: ${dims.tree_visibility}/100 (×${WEIGHTS.tree_visibility}%)\n` +
      `• Environmental Authenticity: ${dims.environmental_authenticity}/100 (×${WEIGHTS.environmental_authenticity}%)\n` +
      `• GPS Accuracy: ${dims.gps_accuracy}/100 (×${WEIGHTS.gps_accuracy}%)\n` +
      `• Image Authenticity: ${dims.image_authenticity}/100 (×${WEIGHTS.image_authenticity}%)\n` +
      `• Duplicate Safety: ${dims.duplicate_probability}/100 (×${WEIGHTS.duplicate_probability}%)\n` +
      `• Species Confidence: ${dims.species_confidence}/100 (×${WEIGHTS.species_confidence}%)\n` +
      `• User Trust History: ${dims.user_trust}/100 (×${WEIGHTS.user_trust}%)` +
      (v.fraud_signals?.length ? `\n\n🚩 Fraud signals: ${v.fraud_signals.join(", ")}` : "");

    const finalAnalysis = `${prefix}${v.analysis}${breakdown}`;

    const { error: updateError } = await supabaseClient
      .from("trees")
      .update({
        verification_status: finalStatus,
        ai_confidence: dims.tree_visibility,
        ai_validation_score: score,
        ai_analysis: finalAnalysis,
        ai_detected_species: v.detected_species || null,
        flagged_reason: flaggedReason,
        ...(finalStatus === "rejected" ? { admin_status: "rejected" } : {}),
        ...(flaggedReason ? { admin_status: "flagged" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", treeId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw new Error("Failed to update tree record");
    }

    return new Response(
      JSON.stringify({
        status: finalStatus,
        score,
        breakdown: dims,
        weights: WEIGHTS,
        flagged_reason: flaggedReason,
        verification: { ...v, hash_duplicate: hashDuplicate },
      }),
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
