import { createClient } from '@supabase/supabase-js';
async function testSupa() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    if(error) console.log('? Supabase FAILED:', error.message);
    else console.log('? Supabase CONNECTED (Rows fetched: ' + (data ? data.length : 0) + ')');
  } catch(e) { console.log('? Supabase CRASHED:', e.message); }
}
testSupa();
