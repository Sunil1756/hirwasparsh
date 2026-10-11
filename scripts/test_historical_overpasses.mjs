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

async function testHistoricalOverpasses() {
  const token = await getAccessToken();
  const lat = 18.5204;
  const lng = 73.8567;
  const delta = 0.002;

  // 6 months ago to today
  const toDate = new Date().toISOString();
  const fromDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const statsRequest = {
    input: {
      bounds: {
        bbox: [lng - delta, lat - delta, lng + delta, lat + delta],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: fromDate, to: toDate },
            maxCloudCoverage: 50
          }
        }
      ]
    },
    aggregation: {
      timeRange: { from: fromDate, to: toDate },
      aggregationInterval: { of: "P15D" }, // Every 15 days
      evalscript: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B08", "B11", "dataMask"] }],
    output: [
      { id: "dataMask", bands: 1 },
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 + sample.B04) !== 0 ? (sample.B08 - sample.B04) / (sample.B08 + sample.B04) : 0;
  let ndwi = (sample.B03 + sample.B08) !== 0 ? (sample.B03 - sample.B08) / (sample.B03 + sample.B08) : 0;
  return {
    dataMask: [sample.dataMask],
    ndvi: [ndvi],
    ndwi: [ndwi]
  };
}`
    }
  };

  fs.writeFileSync('scripts/history_request.json', JSON.stringify(statsRequest));
  const cmd = `curl.exe -s -X POST "https://sh.dataspace.copernicus.eu/api/v1/statistics" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Accept: application/json" --data-binary "@scripts/history_request.json" -w "%{http_code}" -o "scripts/history_response.json"`;
  const code = execSync(cmd).toString().trim();
  console.log("Historical Statistics HTTP Code:", code);
  const resp = JSON.parse(fs.readFileSync('scripts/history_response.json', 'utf8'));
  console.log(`Received ${resp.data?.length} historical periods!`);
  const points = (resp.data || [])
    .filter(p => p.outputs?.ndvi?.bands?.B0?.stats?.sampleCount > 0)
    .map(p => ({
      date: p.interval?.from?.split('T')[0],
      ndvi: Number(p.outputs?.ndvi?.bands?.B0?.stats?.mean?.toFixed(3)),
      ndwi: Number(p.outputs?.ndwi?.bands?.B0?.stats?.mean?.toFixed(3))
    }));
  console.log("Actual Historical Sentinel-2 Points:", points);
}

testHistoricalOverpasses();
