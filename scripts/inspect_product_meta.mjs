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
  
  const productUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})?$expand=Attributes`;
  const res = await fetch(productUrl, { headers: { "Authorization": `Bearer ${token}` } });
  const data = await res.json();
  console.log("Product Name:", data.Name);
  console.log("Product Size:", (data.ContentLength / (1024*1024)).toFixed(1), "MB");
  console.log("Attributes count:", data.Attributes?.length);
  data.Attributes?.forEach(a => {
    if (['cloudCover', 'processingBaseline', 'orbitNumber', 'relativeOrbitNumber', 'tileId', 'datastripId', 'instrument'].includes(a.Name)) {
      console.log(` - ${a.Name}: ${a.Value}`);
    }
  });
}

testProductDetails();
