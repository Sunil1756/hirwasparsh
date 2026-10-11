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

async function testOData(token) {
  // Query Sentinel-2 L2A over Pune, Maharashtra area
  // Polygon: POINT(73.8567 18.5204)
  console.log("Querying Copernicus OData API for Sentinel-2 L2A tiles...");
  const point = "POINT(73.8567 18.5204)";
  const filter = `Collection/Name eq 'SENTINEL-2' and contains(Name,'MSIL2A') and OData.CSC.Intersects(area=geography'SRID=4326;${point}')`;
  const url = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=${encodeURIComponent(filter)}&$orderby=ContentDate/Start desc&$top=5&$expand=Attributes`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  console.log("OData status:", res.status);
  const data = await res.json();
  if (data.value && data.value.length > 0) {
    console.log(`SUCCESS! Found ${data.value.length} real Sentinel-2 L2A products from Copernicus:`);
    data.value.forEach((prod, i) => {
      console.log(`\n[Product #${i + 1}]`);
      console.log(" - ID:", prod.Id);
      console.log(" - Name:", prod.Name);
      console.log(" - Acquisition Date:", prod.ContentDate?.Start);
      console.log(" - Footprint GeoJSON:", JSON.stringify(prod.Footprint).substring(0, 80) + "...");
      const cloudAttr = prod.Attributes?.find(a => a.Name === 'cloudCover');
      if (cloudAttr) console.log(" - Cloud Cover %:", cloudAttr.Value);
    });

    const firstProduct = data.value[0];
    console.log("\nChecking nodes/tiles inside first product:");
    const nodesUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${firstProduct.Id})/Nodes`;
    const nodeRes = await fetch(nodesUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const nodesData = await nodeRes.json();
    console.log("Nodes status:", nodeRes.status);
    if (nodesData.value) {
      console.log("Top-level Nodes:", nodesData.value.map(n => n.Name));
    }
  } else {
    console.log("OData empty or error response:", JSON.stringify(data, null, 2).substring(0, 500));
  }
}

async function main() {
  try {
    const token = await getAccessToken();
    console.log("Token received!");
    await testOData(token);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
