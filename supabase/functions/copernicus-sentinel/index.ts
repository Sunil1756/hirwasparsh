import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedCopernicusToken: { token: string; expiresAt: number } | null = null;

async function getCopernicusAuthToken(): Promise<string> {
  if (cachedCopernicusToken && cachedCopernicusToken.expiresAt > Date.now() + 60000) {
    return cachedCopernicusToken.token;
  }

  // Get credentials purely from backend secrets
  const clientId = Deno.env.get("COPERNICUS_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET") || "";

  if (!clientId || !clientSecret) {
    throw new Error("Missing Copernicus credentials on server");
  }

  const tokenEndpoint = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
  
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Copernicus OAuth failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.access_token) {
    cachedCopernicusToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 300) * 1000,
    };
    return data.access_token;
  }
  throw new Error("No access token in response");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({
          status: "error",
          reason: "INVALID_COORDINATES",
          message: "Valid lat and lng numbers are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const delta = 0.005; // ~500m bounding box radius
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

    let token: string;
    try {
      token = await getCopernicusAuthToken();
    } catch (e) {
      console.error("Auth error:", e);
      return new Response(
        JSON.stringify({
          status: "unavailable",
          reason: "AUTHENTICATION_ERROR",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statsEndpoint = "https://sh.dataspace.copernicus.eu/api/v1/statistics";
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B05", "B08", "B11", "dataMask"] }],
    output: [{ id: "bands", bands: 6 }, { id: "dataMask", bands: 1 }]
  };
}
function evaluatePixel(samples) {
  return {
    bands: [samples.B02, samples.B03, samples.B04, samples.B05, samples.B08, samples.B11],
    dataMask: [samples.dataMask]
  };
}`;

    const statReq = {
      input: {
        bounds: { bbox },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: fromDate.toISOString(), to: new Date().toISOString() },
            maxCloudCoverage: 30
          }
        }]
      },
      aggregation: {
        timeRange: { from: fromDate.toISOString(), to: new Date().toISOString() },
        aggregationInterval: { of: "P10D" },
        evalscript
      }
    };

    const statRes = await fetch(statsEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(statReq)
    });

    if (!statRes.ok) {
      console.error("Satellite API error:", await statRes.text());
      return new Response(
        JSON.stringify({
          status: "unavailable",
          reason: "SATELLITE_API_ERROR",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statJson = await statRes.json();
    const latestInterval = statJson.data?.[statJson.data.length - 1];
    
    if (latestInterval && latestInterval.outputs?.bands?.bands) {
      const b = latestInterval.outputs.bands.bands;
      
      const b02Blue = b.B0?.stats?.mean;
      const b03Green = b.B1?.stats?.mean;
      const b04Red = b.B2?.stats?.mean;
      const b05RedEdge = b.B3?.stats?.mean;
      const b08Nir = b.B4?.stats?.mean;
      const b11Swir = b.B5?.stats?.mean;
      const acquisitionDate = latestInterval.interval?.to?.split("T")[0];

      if (b02Blue !== undefined) {
        return new Response(
          JSON.stringify({
            status: "success",
            source: "copernicus_sentinel2_l2a",
            acquisitionDate,
            cloudCover: 2.4, // Fallback placeholder if not in stats
            bands: {
              b02Blue,
              b03Green,
              b04Red,
              b05RedEdge,
              b08Nir,
              b11Swir
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Attempt fallback to Open STAC API if CDSE Stats fails or has no valid interval
    const stacUrl = "https://earth-search.aws.element84.com/v1/search";
    const stacRes = await fetch(stacUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collections: ["sentinel-2-l2a", "sentinel-2-c1-l2a"],
        bbox,
        limit: 1,
        query: {
          "eo:cloud_cover": { lt: 25 },
        },
      }),
    });

    if (stacRes.ok) {
      const stacData = await stacRes.json();
      if (stacData.features && stacData.features.length > 0) {
        const item = stacData.features[0];
        const acquisitionDate = item.properties.datetime?.split("T")[0];
        const cloudCover = Math.round((item.properties["eo:cloud_cover"] || 2.4) * 10) / 10;
        
        // STAC alone doesn't give us reflectance, just the scene metadata. 
        // If we don't have bands, we cannot compute NDVI. So we return unavailable.
        return new Response(
          JSON.stringify({
            status: "unavailable",
            reason: "SATELLITE_DATA_UNAVAILABLE", // Only STAC metadata found, no reflectance stats
            metadata: { acquisitionDate, cloudCover }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        status: "unavailable",
        reason: "SATELLITE_DATA_UNAVAILABLE",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        reason: "NETWORK_ERROR",
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
