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
    const { imageBase64, treeId, species } = await req.json();

    if (!imageBase64 || !treeId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and treeId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI with the image for tree verification
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
            content: `You are an expert botanist and environmental scientist. Analyze the provided image and determine:
1. Whether it contains a real tree or plant (not a fake/artificial one)
2. Whether the image appears to be a genuine outdoor photo (not a screenshot or stock image)
3. If a species is claimed, whether it looks consistent with that species
4. The approximate health of the tree/plant (healthy, moderate, unhealthy)
5. A confidence score from 0 to 100

You MUST respond using the verify_tree tool.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please verify this tree photo.${species ? ` The claimed species is: ${species}` : ""} Analyze whether this is a real tree, if the photo is genuine, and assess its health.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_tree",
              description: "Return tree verification results",
              parameters: {
                type: "object",
                properties: {
                  is_tree: {
                    type: "boolean",
                    description: "Whether the image contains a real tree or plant",
                  },
                  is_genuine_photo: {
                    type: "boolean",
                    description: "Whether this appears to be a genuine outdoor photograph",
                  },
                  species_match: {
                    type: "string",
                    enum: ["match", "mismatch", "uncertain", "no_claim"],
                    description: "Whether the tree matches the claimed species",
                  },
                  health_status: {
                    type: "string",
                    enum: ["healthy", "moderate", "unhealthy", "unknown"],
                    description: "Approximate health of the tree",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score from 0 to 100",
                  },
                  analysis: {
                    type: "string",
                    description: "Brief analysis summary explaining the verification result",
                  },
                },
                required: ["is_tree", "is_genuine_photo", "species_match", "health_status", "confidence", "analysis"],
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
        return new Response(
          JSON.stringify({ error: "AI service rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const verification = JSON.parse(toolCall.function.arguments);

    // Determine verification status
    const status =
      verification.is_tree && verification.is_genuine_photo && verification.confidence >= 60
        ? "verified"
        : "rejected";

    // Update tree record in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("trees")
      .update({
        verification_status: status,
        ai_confidence: verification.confidence,
        ai_analysis: verification.analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", treeId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw new Error("Failed to update tree record");
    }

    return new Response(
      JSON.stringify({
        status,
        verification,
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
