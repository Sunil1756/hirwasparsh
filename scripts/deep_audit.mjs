import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "fs";

const SUPABASE_URL = "https://qvikwdginymvjbrrlvkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWt3ZGdpbnltdmpicnJsdmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTk4ODIsImV4cCI6MjA5MjE3NTg4Mn0.dSTRLwXQV8lfqT2QrYpjYsZKX9wqKdDCJM6f6P--eqM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tablesToCheck = [
  "trees",
  "profiles",
  "user_roles",
  "growth_updates",
  "plantation_projects",
  "community_events",
  "carbon_offsets",
  "adoptions",
  "notifications",
  "eco_rewards",
  "field_reports"
];

async function runAudit() {
  console.log("==================================================");
  console.log("       GREEN ENLIGHTENMENT DEEP SYSTEM AUDIT      ");
  console.log("==================================================");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = {};

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .limit(1);

      if (error) {
        results[table] = {
          status: "ERROR",
          code: error.code,
          message: error.message,
          hint: error.hint
        };
      } else {
        const sampleRow = data && data.length > 0 ? data[0] : null;
        results[table] = {
          status: "OK",
          count: count ?? 0,
          columns: sampleRow ? Object.keys(sampleRow) : "Table is empty (accessible)"
        };
      }
    } catch (e) {
      results[table] = {
        status: "EXCEPTION",
        message: e.message
      };
    }
  }

  console.log("--- SUPABASE TABLES AUDIT RESULTS ---");
  for (const [table, res] of Object.entries(results)) {
    if (res.status === "OK") {
      console.log(`✅ [${table}]: Accessible | Total Rows: ${res.count}`);
      if (Array.isArray(res.columns)) {
        console.log(`   Columns: ${res.columns.join(", ")}`);
      } else {
        console.log(`   ${res.columns}`);
      }
    } else {
      console.log(`❌ [${table}]: ${res.status} | Code: ${res.code || "N/A"} | Message: ${res.message}`);
    }
  }

  console.log("\n--- SUPABASE STORAGE BUCKETS AUDIT ---");
  try {
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
      console.log(`❌ Storage Buckets Error: ${bucketErr.message}`);
    } else {
      console.log(`✅ Storage Buckets Found (${buckets.length}):`);
      buckets.forEach(b => console.log(`   - ${b.name} (Public: ${b.public})`));
    }
  } catch (e) {
    console.log(`❌ Storage Exception: ${e.message}`);
  }

  console.log("\n==================================================");
}

runAudit().catch(console.error);
