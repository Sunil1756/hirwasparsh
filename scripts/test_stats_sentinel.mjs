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

async function testStatisticalIndices() {
  const token = await getAccessToken();
  console.log("Token obtained!");

  // Query actual Sentinel-2 L2A statistics over Pune (18.5204, 73.8567)
  const lat = 18.5204;
  const lng = 73.8567;
  const delta = 0.002; // ~200m box around target coordinate

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
            timeRange: {
              from: "2026-08-01T00:00:00Z",
              to: "2026-10-10T23:59:59Z"
            },
            maxCloudCoverage: 40
          }
        }
      ]
    },
    aggregation: {
      timeRange: {
        from: "2026-08-01T00:00:00Z",
        to: "2026-10-10T23:59:59Z"
      },
      aggregationInterval: {
        of: "P10D"
      },
      evalscript: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B08", "B11", "dataMask"] }],
    output: [
      { id: "dataMask", bands: 1 },
      { id: "bands", bands: 5, sampleType: "FLOAT32" },
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 + sample.B04) !== 0 ? (sample.B08 - sample.B04) / (sample.B08 + sample.B04) : 0;
  return {
    dataMask: [sample.dataMask],
    bands: [sample.B02, sample.B03, sample.B04, sample.B08, sample.B11],
    ndvi: [ndvi]
  };
}`
    }
  };

  fs.writeFileSync('scripts/stats_request.json', JSON.stringify(statsRequest));

  const cmd = `curl.exe -s -X POST "https://sh.dataspace.copernicus.eu/api/v1/statistics" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Accept: application/json" --data-binary "@scripts/stats_request.json" -w "%{http_code}" -o "scripts/stats_response.json"`;
  const code = execSync(cmd).toString().trim();
  console.log("Statistics API HTTP Code:", code);
  const resp = JSON.parse(fs.readFileSync('scripts/stats_response.json', 'utf8'));
  if (resp.data && resp.data.length > 0) {
    console.log(`\nSUCCESS! Real multi-temporal Sentinel-2 observations retrieved: ${resp.data.length} overpass intervals!`);
    resp.data.forEach((interval, i) => {
      const from = interval.interval?.from?.split('T')[0];
      const to = interval.interval?.to?.split('T')[0];
      const ndviStats = interval.outputs?.ndvi?.bands?.B0?.stats;
      const blueStats = interval.outputs?.bands?.bands?.B0?.stats;
      const greenStats = interval.outputs?.bands?.bands?.B1?.stats;
      const redStats = interval.outputs?.bands?.bands?.B2?.stats;
      const nirStats = interval.outputs?.bands?.bands?.B3?.stats;
      if (ndviStats && ndviStats.sampleCount > 0) {
        console.log(`[Overpass ${from} to ${to}]`);
        console.log(` - Mean NDVI: ${ndviStats.mean?.toFixed(4)} (min: ${ndviStats.min?.toFixed(4)}, max: ${ndviStats.max?.toFixed(4)})`);
        console.log(` - Reflectance: Blue=${blueStats?.mean?.toFixed(4)}, Green=${greenStats?.mean?.toFixed(4)}, Red=${redStats?.mean?.toFixed(4)}, NIR=${nirStats?.mean?.toFixed(4)}`);
      }
    });
  } else {
    console.log("Response summary:", JSON.stringify(resp, null, 2).substring(0, 500));
  }
}

testStatisticalIndices();
