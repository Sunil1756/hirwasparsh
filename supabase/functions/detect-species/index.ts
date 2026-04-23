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
    // Require authenticated caller to prevent abuse of paid AI credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PLANTNET_API_KEY = Deno.env.get("PLANTNET_API_KEY");
    if (!PLANTNET_API_KEY) {
      throw new Error("PLANTNET_API_KEY is not configured");
    }

    // Convert base64 to blob
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const blob = new Blob([imageData], { type: 'image/jpeg' });

    // Create form data
    const formData = new FormData();
    formData.append('images', blob, 'image.jpg');
    formData.append('modifiers', JSON.stringify(['similar_images']));
    formData.append('project', 'indiasouth');

    const plantnetResponse = await fetch(`https://my-api.plantnet.org/v2/identify/indiasouth?api-key=${PLANTNET_API_KEY}&include-related-images=false&no-reject=false&lang=en`, {
      method: 'POST',
      body: formData,
    });

    if (!plantnetResponse.ok) {
      const errText = await plantnetResponse.text();
      console.error("PlantNet API error:", plantnetResponse.status, errText);
      throw new Error(`PlantNet API error: ${plantnetResponse.status}`);
    }

    const plantnetData = await plantnetResponse.json();

    if (!plantnetData.results || plantnetData.results.length === 0) {
      return new Response(JSON.stringify({
        common_name: "Unknown",
        scientific_name: "Unknown",
        confidence: 0,
        description: "No species identified by PlantNet"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topResult = plantnetData.results[0];
    const species = topResult.species;
    const score = topResult.score;

    const detection = {
      common_name: species.commonNames?.[0] || species.scientificNameWithoutAuthor,
      scientific_name: species.scientificNameWithoutAuthor,
      confidence: Math.round(score * 100),
      description: `Identified using PlantNet AI model. Score: ${score.toFixed(2)}`
    };

    return new Response(JSON.stringify(detection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-species error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
