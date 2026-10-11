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

async function testCandidates() {
  const candidates = [
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest'
  ];

  for (const model of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the single word: "READY"' }] }]
        })
      });
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`Model ${model}: status ${res.status} => ${txt || data?.error?.message?.substring(0, 80)}`);
    } catch (e) {
      console.log(`Model ${model}: fetch error ${e.message}`);
    }
  }
}

testCandidates();
