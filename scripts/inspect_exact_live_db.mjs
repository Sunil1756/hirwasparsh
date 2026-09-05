import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read environment variables
const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function inspectExactDb() {
  console.log("====================================================================");
  console.log("LIVE DATABASE AUDIT: EXACT COUNTS & ROWS");
  console.log("====================================================================");

  // 1. trees table
  const { data: trees, error: treesErr } = await supabase.from("trees").select("*");
  console.log(`\n1. 'trees' table: ${trees?.length || 0} rows found (Error: ${treesErr?.message || "None"})`);
  if (trees && trees.length > 0) {
    trees.forEach((t) => {
      console.log(`   - ID: ${t.id} | Species: ${t.species || t.name} | Status: ${t.admin_status} | User: ${t.user_id}`);
    });
  }

  // 2. plantation_projects table
  const { data: projects, error: projErr } = await supabase.from("plantation_projects").select("*");
  console.log(`\n2. 'plantation_projects' table: ${projects?.length || 0} rows found (Error: ${projErr?.message || "None"})`);
  if (projects && projects.length > 0) {
    projects.forEach((p) => {
      console.log(`   - ID: ${p.id} | Name: ${p.project_name} | Target: ${p.target_trees} | Verified: ${p.verified_trees} | BulkRows: ${p.bulk_rows} | Status: ${p.status} | User: ${p.user_id}`);
    });
  }

  // 3. profiles table
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log(`\n3. 'profiles' table: ${profiles?.length || 0} rows found (Error: ${profErr?.message || "None"})`);
  if (profiles && profiles.length > 0) {
    profiles.forEach((pr) => {
      console.log(`   - ID: ${pr.id} | Name: ${pr.full_name} | TreesPlanted: ${pr.trees_planted} | Points: ${pr.green_points}`);
    });
  }

  // 4. Test platformStats aggregator output
  let totalProjTrees = 0;
  (projects || []).forEach((p) => {
    totalProjTrees += (p.verified_trees > 0 ? p.verified_trees : p.target_trees || p.bulk_rows || 0);
  });
  console.log(`\n4. Aggregate Calculation:`);
  console.log(`   - Total Individual Trees: ${trees?.length || 0}`);
  console.log(`   - Total Plantation Project Trees: ${totalProjTrees}`);
  console.log(`   - Grand Total: ${(trees?.length || 0) + totalProjTrees}`);

  console.log("====================================================================");
}

inspectExactDb();
