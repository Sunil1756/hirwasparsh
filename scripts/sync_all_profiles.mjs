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

async function syncAll() {
  console.log("-------------------------------------------------------");
  console.log("SYNCING ALL USER PROFILES WITH LIVE PLANTATION DATA...");
  console.log("-------------------------------------------------------");

  // Fetch all projects
  const { data: projects } = await supabase.from("plantation_projects").select("*");
  const { data: trees } = await supabase.from("trees").select("*");
  const { data: profiles } = await supabase.from("profiles").select("*");

  console.log(`Found ${profiles?.length || 0} profiles, ${projects?.length || 0} projects, ${trees?.length || 0} individual trees.`);

  for (const prof of profiles || []) {
    const userTrees = (trees || []).filter((t) => t.user_id === prof.id);
    const userProjects = (projects || []).filter((p) => p.user_id === prof.id);

    let projTrees = 0;
    userProjects.forEach((p) => {
      projTrees += p.verified_trees > 0 ? p.verified_trees : (p.target_trees || p.bulk_rows || 0);
    });

    const totalPlanted = userTrees.length + projTrees;
    const totalPoints = userTrees.length * 50 + projTrees * 10;

    console.log(`User ${prof.id} (${prof.full_name || "Anonymous"}): ${totalPlanted} trees (${userTrees.length} individual, ${projTrees} in ${userProjects.length} projects), ${totalPoints} points.`);

    if (totalPlanted > 0) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          trees_planted: totalPlanted,
          green_points: totalPoints,
          last_activity_date: new Date().toISOString(),
        })
        .eq("id", prof.id);

      if (updErr) {
        console.error(`  ❌ Failed to update profile ${prof.id}:`, updErr.message);
      } else {
        console.log(`  ✅ Profile updated successfully!`);
      }
    }
  }

  console.log("-------------------------------------------------------");
  console.log("SYNC COMPLETED!");
  console.log("-------------------------------------------------------");
}

syncAll();
