import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function testDel() {
  const res = await supabase.from('plantation_projects').delete().eq('id', '13d0a0f3-4123-413e-b88f-d286dffe8adb').select();
  console.log('Delete result:', JSON.stringify(res, null, 2));
}
testDel();
