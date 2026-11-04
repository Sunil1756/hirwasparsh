import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function audit() {
  console.log("=== GREEN ENLIGHTENMENT BACKEND & FRONTEND AUDIT ===");
  console.log("Connected to:", SUPABASE_URL);

  const tablesToCheck = [
    "trees",
    "profiles",
    "user_roles",
    "growth_updates",
    "plantation_projects",
    "challenges",
    "community_events"
  ];

  const results = {};

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        results[table] = { status: "ERROR / MISSING", error: error.message };
      } else {
        results[table] = { status: "EXISTS & CONNECTED", count: count ?? 0 };
      }
    } catch (e) {
      results[table] = { status: "EXCEPTION", error: e.message };
    }
  }

  console.log("\n--- Table Health Check ---");
  console.log(JSON.stringify(results, null, 2));

  // Storage Buckets Check
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    console.log("\n--- Storage Buckets Check ---");
    if (bErr) {
      console.log("Storage check error:", bErr.message);
    } else {
      console.log("Active Buckets:", buckets.map(b => ({ name: b.name, public: b.public })));
    }
  } catch (e) {
    console.log("Storage exception:", e.message);
  }
}

audit();
