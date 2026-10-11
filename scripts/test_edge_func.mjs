import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testEdgeFunc() {
  console.log('Invoking copernicus-sentinel on Supabase...');
  try {
    const { data, error } = await supabase.functions.invoke('copernicus-sentinel', {
      body: { lat: 18.5204, lng: 73.8567 }
    });
    console.log('Edge function response:', { data, error });
  } catch (err) {
    console.error('Edge function invocation failed:', err);
  }
}

testEdgeFunc();
