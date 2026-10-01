async function testSupabase() {
  try {
    const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/', {
      headers: { 
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
      }
    });
    if(res.ok) console.log('? Supabase DB: CONNECTED');
    else console.log('? Supabase DB: FAILED - HTTP ' + res.status);
  } catch(e) { console.log('? Supabase DB: FAILED - ' + e.message); }
}
testSupabase();
