import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MODEL = "google/gemini-3.1-pro-preview";

const SYSTEM = `You are an expert Indian arborist and plant pathologist advising community tree planters in Maharashtra, India.
Be practical, specific and local: reference Indian species names, monsoon/summer/winter cycles, low-cost organic remedies available in rural Maharashtra.
Never invent certainty — if a photo is unclear, say so and lower your confidence.
Always answer using the provided tool.`;

const TOOLS: Record<string, unknown> = {
  diagnose: {
    type: "function",
    function: {
      name: "diagnose_tree",
      description: "Diagnose disease / pest / nutrient problems from a tree photo and symptoms",
      parameters: {
        type: "object",
        properties: {
          is_plant: { type: "boolean", description: "Whether the image actually shows a plant or tree" },
          diagnosis: { type: "string", description: "Most likely disease, pest or deficiency name" },
          confidence: { type: "number", description: "0-100 confidence in the diagnosis" },
          severity: { type: "string", enum: ["none", "mild", "moderate", "severe"] },
          symptoms_observed: { type: "array", items: { type: "string" } },
          likely_causes: { type: "array", items: { type: "string" } },
          treatment_steps: { type: "array", items: { type: "string" }, description: "Ordered, actionable steps" },
          organic_remedies: { type: "array", items: { type: "string" }, description: "Low cost organic remedies (neem oil, cow dung slurry etc.)" },
          prevention: { type: "array", items: { type: "string" } },
          urgency_days: { type: "number", description: "Act within this many days" },
        },
        required: ["is_plant", "diagnosis", "confidence", "severity", "symptoms_observed", "likely_causes", "treatment_steps", "organic_remedies", "prevention", "urgency_days"],
        additionalProperties: false,
      },
    },
  },
  seasonal: {
    type: "function",
    function: {
      name: "seasonal_care_plan",
      description: "Return a seasonal care plan for a tree in a given month and location",
      parameters: {
        type: "object",
        properties: {
          season: { type: "string", description: "e.g. Pre-monsoon, Monsoon, Post-monsoon, Winter, Summer" },
          summary: { type: "string", description: "2-3 sentence overview of what this tree needs right now" },
          watering: { type: "string", description: "Frequency and quantity for this season" },
          mulching: { type: "string" },
          fertilizing: { type: "string" },
          pruning: { type: "string" },
          pest_watch: { type: "array", items: { type: "string" }, description: "Pests/diseases common this season" },
          risks: { type: "array", items: { type: "string" }, description: "Season specific risks e.g. waterlogging, heat stress" },
          monthly_checklist: { type: "array", items: { type: "string" }, description: "4-6 concrete tasks for this month" },
        },
        required: ["season", "summary", "watering", "mulching", "fertilizing", "pruning", "pest_watch", "risks", "monthly_checklist"],
        additionalProperties: false,
      },
    },
  },
  recommend: {
    type: "function",
    function: {
      name: "recommend_species",
      description: "Recommend the best tree species to plant at a location",
      parameters: {
        type: "object",
        properties: {
          location_summary: { type: "string", description: "Short read of the climate/soil for this location" },
          best_planting_window: { type: "string" },
          recommendations: {
            type: "array",
            description: "5-6 ranked species",
            items: {
              type: "object",
              properties: {
                common_name: { type: "string" },
                scientific_name: { type: "string" },
                native: { type: "boolean" },
                suitability: { type: "number", description: "0-100 fit score for this location" },
                why: { type: "string", description: "Why it fits this location and goal" },
                co2_kg_per_year: { type: "number" },
                water_need: { type: "string", enum: ["low", "medium", "high"] },
                growth_rate: { type: "string", enum: ["slow", "medium", "fast"] },
                care_note: { type: "string" },
              },
              required: ["common_name", "scientific_name", "native", "suitability", "why", "co2_kg_per_year", "water_need", "growth_rate", "care_note"],
              additionalProperties: false,
            },
          },
          avoid: { type: "array", items: { type: "string" }, description: "Species to avoid here and why" },
        },
        required: ["location_summary", "best_planting_window", "recommendations", "avoid"],
        additionalProperties: false,
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const mode: string = body.mode;
    if (!TOOLS[mode]) return json({ error: "Invalid mode" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const content: unknown[] = [];

    if (mode === "diagnose") {
      const { imageBase64, species, symptoms, ageMonths, location } = body;
      if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);
      if (imageBase64.length > 11_000_000) return json({ error: "Image too large (max ~8MB)" }, 413);
      content.push({
        type: "text",
        text: `Diagnose this tree. Species (user reported): ${species || "unknown"}. Age: ${ageMonths ?? "unknown"} months. Location: ${location || "Maharashtra, India"}. Observed symptoms from the planter: ${symptoms || "none described"}.
If the image is not a plant, set is_plant=false and explain that in diagnosis.`,
      });
      content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    } else if (mode === "seasonal") {
      const { species, ageMonths, location, month } = body;
      content.push({
        type: "text",
        text: `Give a seasonal care plan for a ${species || "young native"} tree, about ${ageMonths ?? 6} months old, planted at ${location || "Maharashtra, India"}. Current month: ${month || new Date().toLocaleString("en-IN", { month: "long" })}. Tailor to the Indian monsoon calendar.`,
      });
    } else {
      const { location, goal, space, soil } = body;
      content.push({
        type: "text",
        text: `Recommend the best trees to plant at: ${location || "Maharashtra, India"}. Planting goal: ${goal || "maximum environmental impact"}. Available space: ${space || "open ground, medium"}. Soil/site notes: ${soil || "unknown"}. Prioritise native and drought-resilient species; rank by suitability.`,
      });
    }

    const tool = TOOLS[mode] as { function: { name: string } };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return json({ error: "AI service is busy. Please try again shortly." }, 429);
      if (aiResponse.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured response from AI");

    return json({ mode, result: JSON.parse(args) });
  } catch (e) {
    console.error("tree-assistant error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
