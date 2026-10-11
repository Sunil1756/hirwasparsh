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

async function testQuicklook() {
  const token = await getAccessToken();
  const productId = "d9db2183-7ef7-4777-9495-11abec1ccf1e";
  
  // Try quicklook / thumbnail endpoint
  const url = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Quicklook/$value`;
  const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
  console.log("Quicklook status:", res.status);
  console.log("Quicklook content-type:", res.headers.get("content-type"));
  console.log("Quicklook content-length:", res.headers.get("content-length"));
  if (res.ok) {
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log("Quicklook image downloaded successfully! Size:", buffer.length, "bytes");
  }
}

testQuicklook();
