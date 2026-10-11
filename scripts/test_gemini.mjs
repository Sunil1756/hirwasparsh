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
console.log('Testing Gemini API key:', apiKey ? `${apiKey.substring(0, 8)}... (${apiKey.length} chars)` : 'MISSING');

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, are you functional? Answer in 5 words.' }] }]
      })
    });
    const json = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testGemini();
