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

async function inspectTrees() {
  const { data, error } = await supabase.from('trees').select('*').limit(1);
  if (error) {
    console.error('Error fetching tree:', error);
  } else {
    console.log('Trees sample columns:', data.length > 0 ? Object.keys(data[0]) : 'Empty table, querying RPC or trying basic select');
    if (data.length > 0) {
      console.log('Sample tree record:', data[0]);
    }
  }

  // Also count trees
  const { count, error: countErr } = await supabase.from('trees').select('*', { count: 'exact', head: true });
  console.log('Total trees count in DB:', count, countErr || '');
}

inspectTrees();
