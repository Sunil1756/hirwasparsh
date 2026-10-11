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

async function testPlantAudit() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const prompt = `You are an expert botanical verification AI. Given a claim of a 'Neem' tree planted in Pune, India:
Return a JSON object with:
- scientific_name: string
- botanical_family: string
- expected_annual_co2_kg: number
- drought_tolerance: 'low' | 'medium' | 'high'
- native_region: string
- care_recommendations: array of strings`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Real Gemini Output:');
  console.log(json?.candidates?.[0]?.content?.parts?.[0]?.text);
}

testPlantAudit();
