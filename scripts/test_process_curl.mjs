import fs from 'fs';
import { execSync } from 'child_process';

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

async function testProcessCurl() {
  const token = await getAccessToken();
  console.log("Token obtained!");

  const requestJson = {
    input: {
      bounds: {
        bbox: [73.850, 18.515, 73.860, 18.525],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: "2026-08-01T00:00:00Z",
              to: "2026-10-10T23:59:59Z"
            },
            maxCloudCoverage: 40
          }
        }
      ]
    },
    output: {
      width: 16,
      height: 16,
      responses: [
        {
          identifier: "default",
          format: { type: "image/png" }
        }
      ]
    },
    evalscript: `//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "B08"],
    output: { bands: 3 }
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  // Visualize as green gradient
  return [0, ndvi, 0];
}`
  };

  fs.writeFileSync('scripts/request.json', JSON.stringify(requestJson));

  try {
    const cmd = `curl.exe -s -X POST "https://sh.dataspace.copernicus.eu/api/v1/process" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Accept: image/png" --data-binary "@scripts/request.json" -o "scripts/ndvi_tile.png" -w "%{http_code}"`;
    const httpCode = execSync(cmd).toString().trim();
    console.log("Process API HTTP Code:", httpCode);
    if (httpCode === '200') {
      const stats = fs.statSync('scripts/ndvi_tile.png');
      console.log(`SUCCESS! Real Sentinel-2 NDVI raster tile downloaded! Size: ${stats.size} bytes`);
    } else {
      console.log("Process response body:", fs.readFileSync('scripts/ndvi_tile.png', 'utf8').substring(0, 500));
    }
  } catch (err) {
    console.error("Curl failed:", err.message);
  }
}

testProcessCurl();
