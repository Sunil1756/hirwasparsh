async function testGemini() {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
    await ai.models.generateContent({ model: 'gemini-flash-latest', contents: 'Hi' });
    console.log('? Gemini AI: CONNECTED');
  } catch(e) { console.log('? Gemini AI: FAILED - ' + e.message); }
}

async function testSupabase() {
  try {
    const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY);
    if(res.ok) console.log('? Supabase DB: CONNECTED');
    else console.log('? Supabase DB: FAILED - HTTP ' + res.status);
  } catch(e) { console.log('? Supabase DB: FAILED - ' + e.message); }
}

async function testCopernicus() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.VITE_COPERNICUS_CLIENT_ID);
    params.append('client_secret', process.env.VITE_COPERNICUS_CLIENT_SECRET);
    const res = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST', body: params
    });
    if(res.ok) console.log('? Copernicus Satellite: CONNECTED');
    else console.log('? Copernicus Satellite: FAILED - HTTP ' + res.status);
  } catch(e) { console.log('? Copernicus Satellite: FAILED - ' + e.message); }
}

async function testFast2SMS() {
  if(!process.env.VITE_FAST2SMS_API_KEY) {
     console.log('?? Fast2SMS: SKIPPED (No API Key found)');
     return;
  }
  try {
    const res = await fetch('https://www.fast2sms.com/dev/wallet', {
      headers: { 'authorization': process.env.VITE_FAST2SMS_API_KEY }
    });
    const data = await res.json();
    if(data.return === true) console.log('? Fast2SMS: CONNECTED (Wallet Balance: Rs. ' + data.wallet + ')');
    else console.log('? Fast2SMS: FAILED - ' + JSON.stringify(data));
  } catch(e) { console.log('? Fast2SMS: FAILED - ' + e.message); }
}

async function runAll() {
  console.log('Running API Diagnostics...');
  await testGemini();
  await testSupabase();
  await testCopernicus();
  await testFast2SMS();
  console.log('Diagnostics Complete.');
}

runAll();
