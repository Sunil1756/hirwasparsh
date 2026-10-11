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

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.models) {
      console.log('Supported generateContent models:');
      json.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .forEach(m => console.log(' -', m.name));
    } else {
      console.log('No models or error:', json);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

listModels();
