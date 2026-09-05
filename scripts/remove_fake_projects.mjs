import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function removeFakeProjects() {
  console.log("Fetching fake projects...");
  const { data: projects, error } = await supabase.from("plantation_projects").select("id, project_name");
  
  if (error) {
    console.error("Error querying projects:", error);
    return;
  }

  console.log("Found projects:", projects);

  if (projects && projects.length > 0) {
    for (const p of projects) {
      console.log('Deleting project_evidence for project ' + p.id + ' (' + p.project_name + ')...');
      const { error: evErr } = await supabase.from("project_evidence").delete().eq("project_id", p.id);
      if (evErr) console.warn("Evidence delete note:", evErr.message);

      console.log('Deleting project ' + p.id + ' (' + p.project_name + ')...');
      const { error: delErr } = await supabase.from("plantation_projects").delete().eq("id", p.id);
      if (delErr) {
        console.error('Failed to delete project ' + p.id + ':', delErr.message);
      } else {
        console.log('Successfully deleted project: ' + p.project_name);
      }
    }
  }

  console.log("\nRe-syncing user profiles to exact verified data...");
  const { data: profiles } = await supabase.from("profiles").select("id");
  if (profiles) {
    for (const prof of profiles) {
      const { data: trees } = await supabase.from("trees").select("id, points_awarded").eq("user_id", prof.id).eq("admin_status", "approved");
      const realTrees = (trees || []).length;
      let realPoints = 0;
      (trees || []).forEach(t => realPoints += (t.points_awarded || 10));

      await supabase.from("profiles").update({
        trees_planted: realTrees,
        green_points: realPoints
      }).eq("id", prof.id);
      console.log('User ' + prof.id + ' set to: ' + realTrees + ' trees, ' + realPoints + ' points.');
    }
  }

  console.log("\nCleanup complete!");
}

removeFakeProjects();
