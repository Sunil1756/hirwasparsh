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

console.log('Testing Supabase URL:', env.VITE_SUPABASE_URL);
console.log('Anon key prefix:', env.VITE_SUPABASE_ANON_KEY ? env.VITE_SUPABASE_ANON_KEY.substring(0, 10) : 'none');

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  try {
    const { data, error } = await supabase.from('trees').select('id, name, species').limit(5);
    if (error) {
      console.log('Trees error:', error);
    } else {
      console.log('Trees data returned successfully:', data);
    }

    const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id, name').limit(5);
    if (orgErr) {
      console.log('Orgs error:', orgErr);
    } else {
      console.log('Orgs data returned successfully:', orgs);
    }

    const { data: projs, error: projErr } = await supabase.from('projects').select('id, name').limit(5);
    if (projErr) {
      console.log('Projects error:', projErr);
    } else {
      console.log('Projects data returned successfully:', projs);
    }
  } catch (err) {
    console.error('Network / runtime error:', err);
  }
}

run();
