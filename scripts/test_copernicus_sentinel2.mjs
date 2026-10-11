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
  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function testSentinel2Catalog(token) {
  console.log("Testing Copernicus STAC catalog search for Sentinel-2 L2A over Pune, Maharashtra (18.5204, 73.8567)...");
  const stacUrl = "https://catalogue.dataspace.copernicus.eu/stac/search";
  const body = {
    collections: ["SENTINEL-2"],
    bbox: [73.84, 18.50, 73.88, 18.54],
    datetime: "2026-08-01T00:00:00Z/2026-10-10T23:59:59Z",
    limit: 5,
    query: {
      "cloudCover": { "lte": 50 }
    }
  };

  const res = await fetch(stacUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  console.log("STAC Catalog response status:", res.status);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    console.log(`Found ${data.features.length} Sentinel-2 scenes!`);
    const scene = data.features[0];
    console.log("Sample Scene ID:", scene.id);
    console.log("Date:", scene.properties?.datetime);
    console.log("Cloud Cover %:", scene.properties?.cloudCover ?? scene.properties?.["eo:cloud_cover"]);
    console.log("Assets available:", Object.keys(scene.assets || {}));
  } else {
    console.log("STAC result:", JSON.stringify(data, null, 2).substring(0, 500));
  }
}

async function testSentinelHubProcess(token) {
  console.log("\nTesting Sentinel Hub Process API (reflectance & NDVI calculation)...");
  const processUrl = "https://sh.dataspace.copernicus.eu/api/v1/process";

  // Evalscript to get raw bands and calculate true NDVI
  const evalscript = `//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "B11", "dataMask"],
    output: { bands: 5, sampleType: "FLOAT32" }
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return [sample.B02, sample.B03, sample.B04, sample.B08, ndvi];
}
`;

  const requestBody = {
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
      width: 1,
      height: 1,
      responses: [
        {
          identifier: "default",
          format: { type: "application/json" }
        }
      ]
    },
    evalscript: evalscript
  };

  const res = await fetch(processUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log("Process API response status:", res.status);
  const text = await res.text();
  console.log("Process API response body:", text.substring(0, 500));
}

async function testSentinelHubStatistical(token) {
  console.log("\nTesting Sentinel Hub Statistical API (direct statistics/NDVI for polygon)...");
  const statsUrl = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

  const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B08", "B11", "dataMask"] }],
    output: [
      { id: "default", bands: ["B02", "B03", "B04", "B08", "NDVI"], sampleType: "FLOAT32" }
    ]
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 + sample.B04) !== 0 ? (sample.B08 - sample.B04) / (sample.B08 + sample.B04) : 0;
  return {
    default: [sample.B02, sample.B03, sample.B04, sample.B08, ndvi]
  };
}
`;

  const body = {
    input: {
      bounds: {
        geometry: {
          type: "Polygon",
          coordinates: [[
            [73.850, 18.515],
            [73.860, 18.515],
            [73.860, 18.525],
            [73.850, 18.525],
            [73.850, 18.515]
          ]]
        }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: {
            from: "2026-08-01T00:00:00Z",
            to: "2026-10-10T23:59:59Z"
          },
          maxCloudCoverage: 40
        }
      }]
    },
    aggregation: {
      timeRange: {
        from: "2026-08-01T00:00:00Z",
        to: "2026-10-10T23:59:59Z"
      },
      aggregationInterval: {
        of: "P10D"
      },
      evalscript: evalscript
    }
  };

  const res = await fetch(statsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  console.log("Statistical API response status:", res.status);
  const text = await res.text();
  console.log("Statistical API response:", text.substring(0, 500));
}

async function run() {
  try {
    const token = await getAccessToken();
    console.log("Successfully obtained Copernicus token!");
    await testSentinel2Catalog(token);
    await testSentinelHubProcess(token);
    await testSentinelHubStatistical(token);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

run();
