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

async function testProductDetails() {
  const token = await getAccessToken();
  const productId = "d9db2183-7ef7-4777-9495-11abec1ccf1e";
  
  // Inspect GRANULE nodes
  const nodesUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Nodes`;
  const res = await fetch(nodesUrl, { headers: { "Authorization": `Bearer ${token}` } });
  const data = await res.json();
  console.log("Product top-level nodes:", data.value.map(n => n.Name));

  // Find GRANULE
  const granuleNode = data.value.find(n => n.Name === 'GRANULE');
  if (granuleNode) {
    const gUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Nodes('GRANULE')/Nodes`;
    const gRes = await fetch(gUrl, { headers: { "Authorization": `Bearer ${token}` } });
    const gData = await gRes.json();
    console.log("Granules:", gData.value.map(n => n.Name));
    const firstGranule = gData.value[0]?.Name;
    if (firstGranule) {
      const imgDataUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Nodes('GRANULE')/Nodes('${firstGranule}')/Nodes('IMG_DATA')/Nodes`;
      const imgRes = await fetch(imgDataUrl, { headers: { "Authorization": `Bearer ${token}` } });
      const imgData = await imgRes.json();
      console.log("IMG_DATA resolutions:", imgData.value?.map(n => n.Name));

      // 10m bands (B02, B03, B04, B08)
      const r10Url = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Nodes('GRANULE')/Nodes('${firstGranule}')/Nodes('IMG_DATA')/Nodes('R10m')/Nodes`;
      const r10Res = await fetch(r10Url, { headers: { "Authorization": `Bearer ${token}` } });
      const r10Data = await r10Res.json();
      console.log("10m Spectral Bands available:");
      r10Data.value?.forEach(b => console.log(" - Band file:", b.Name, `(Id: ${b.Id})`));
    }
  }
}

testProductDetails();
