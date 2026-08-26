import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvikwdginymvjbrrlvkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWt3ZGdpbnltdmpicnJsdmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTk4ODIsImV4cCI6MjA5MjE3NTg4Mn0.dSTRLwXQV8lfqT2QrYpjYsZKX9wqKdDCJM6f6P--eqM";

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
