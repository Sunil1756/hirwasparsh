import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const apiKey = env.VITE_GEMINI_API_KEY;

async function testGenerate() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Identify tree: Azadirachta indica. Return JSON with keys: common_name, scientific_name, native_region.' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Gemini 2.5 Flash Response:', json?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testGenerate();
