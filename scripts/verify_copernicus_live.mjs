#!/usr/bin/env node
/**
 * Green Enlightenment — Copernicus Sentinel-2 Live Connection & Health Diagnostic
 * Tests live OAuth2 authentication and multi-spectral pixel retrieval from the European Space Agency CDSE.
 */

async function verifyCopernicusHealth() {
  console.log("=== Copernicus Sentinel-2 Live Diagnostics ===");
  const clientId = process.env.COPERNICUS_CLIENT_ID || "sh-bca04d51-5029-419e-a9d2-29b4cb7ae6fa";
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET || "65bC8ZTF2Uu4Vy9nBV8Tg6q6ldXAxenF";

  const tokenEndpoint = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

  console.log(`1. Authenticating Client ID: ${clientId.substring(0, 10)}...`);
  try {
    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("❌ Authentication failed:", tokenData);
      process.exit(1);
    }

    const token = tokenData.access_token;
    console.log("✅ Authenticated successfully with Copernicus Data Space Ecosystem!");

    // 2. Query Statistical API for Live NDVI over Maharashtra Afforestation Plot
    console.log("2. Querying live 10m Sentinel-2 L2A pixels for Nashik stand (19.9975, 73.7898)...");
    const statsEndpoint = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

    const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B05", "B08", "B11", "dataMask"] }],
    output: [{ id: "bands", bands: 6 }, { id: "ndvi", bands: 1 }, { id: "dataMask", bands: 1 }]
  };
}
function evaluatePixel(samples) {
  let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.0001);
  return {
    bands: [samples.B02, samples.B03, samples.B04, samples.B05, samples.B08, samples.B11],
    ndvi: [ndvi],
    dataMask: [samples.dataMask]
  };
}`;

    const statReq = {
      input: {
        bounds: { bbox: [73.78, 19.99, 73.80, 20.01] },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: "2026-08-01T00:00:00Z", to: new Date().toISOString() },
            maxCloudCoverage: 50
          }
        }]
      },
      aggregation: {
        timeRange: { from: "2026-08-01T00:00:00Z", to: new Date().toISOString() },
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

    if (statRes.ok) {
      const statJson = await statRes.json();
      const latest = statJson.data?.[statJson.data.length - 1];
      const ndviStats = latest?.outputs?.ndvi?.bands?.B0?.stats;
      console.log("✅ Live Copernicus Sentinel-2 L2A Pixel Telemetry Received:");
      console.log(`   • Acquisition Interval: ${latest?.interval?.from} to ${latest?.interval?.to}`);
      console.log(`   • Mean Live NDVI: ${ndviStats?.mean?.toFixed(4)} (Max: ${ndviStats?.max?.toFixed(4)}, Min: ${ndviStats?.min?.toFixed(4)})`);
      console.log(`   • Pixel Samples Evaluated: ${ndviStats?.sampleCount?.toLocaleString()} pixels`);
      console.log("=== Copernicus Sentinel-2 Live Pipeline 100% Operational ===");
    } else {
      console.warn("Notice: Statistical API responded with status", statRes.status);
    }
  } catch (e) {
    console.error("Error during Copernicus health check:", e.message);
  }
}

verifyCopernicusHealth();
