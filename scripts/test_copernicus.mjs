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

console.log('Testing Copernicus Credentials:');
console.log('Client ID:', clientId ? `${clientId.substring(0, 8)}... (${clientId.length} chars)` : 'MISSING');
console.log('Client Secret:', clientSecret ? `****** (${clientSecret.length} chars)` : 'MISSING');

async function testCopernicus() {
  const tokenEndpoint = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
  try {
    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    console.log('Copernicus OAuth status:', res.status);
    const json = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Token received! Expires in:', json.expires_in, 'seconds');
      console.log('Token type:', json.token_type);
    } else {
      console.log('Copernicus OAuth error:', json);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testCopernicus();
