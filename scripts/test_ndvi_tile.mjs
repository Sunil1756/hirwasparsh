import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const clientId = env.COPERNICUS_CLIENT_ID || env.VITE_COPERNICUS_CLIENT_ID;
const clientSecret = env.COPERNICUS_CLIENT_SECRET || env.VITE_COPERNICUS_CLIENT_SECRET;

async function getAccessToken() {
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
  const json = await res.json();
  return json.access_token;
}

async function testNdviTileDataUrl() {
  const token = await getAccessToken();
  const lat = 18.5204;
  const lng = 73.8567;
  const delta = 0.005;

  const requestBody = {
    input: {
      bounds: {
        bbox: [lng - delta, lat - delta, lng + delta, lat + delta],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString()
          },
          maxCloudCoverage: 40
        }
      }]
    },
    output: {
      width: 64,
      height: 64,
      responses: [{ identifier: "default", format: { type: "image/png" } }]
    },
    evalscript: `//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "B08"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 + sample.B04) !== 0 ? (sample.B08 - sample.B04) / (sample.B08 + sample.B04) : 0;
  // Color ramp: red (barren) to yellow to green (dense canopy)
  if (ndvi < 0.2) return [0.8, 0.2, 0.2, 1];
  if (ndvi < 0.4) return [0.9, 0.7, 0.1, 1];
  if (ndvi < 0.6) return [0.5, 0.8, 0.2, 1];
  return [0.1, 0.6, 0.1, 1];
}`
  };

  const res = await fetch("https://sh.dataspace.copernicus.eu/api/v1/process", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png"
    },
    body: JSON.stringify(requestBody)
  });

  console.log("Process API status:", res.status);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    console.log("Real NDVI raster tile data URL created! Length:", dataUrl.length, "bytes");
    console.log("Data URL prefix:", dataUrl.substring(0, 50));
  } else {
    console.log("Error:", await res.text());
  }
}

testNdviTileDataUrl();
