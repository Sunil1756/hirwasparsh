import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvikwdginymvjbrrlvkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWt3ZGdpbnltdmpicnJsdmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTk4ODIsImV4cCI6MjA5MjE3NTg4Mn0.dSTRLwXQV8lfqT2QrYpjYsZKX9wqKdDCJM6f6P--eqM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const allQueriedTables = [
  "notifications",
  "trees",
  "growth_updates",
  "profiles",
  "challenge_participants",
  "user_roles",
  "admin_audit_log",
  "challenges",
  "treebank",
  "tree_delegations",
  "teams",
  "team_members",
  "plantation_projects",
  "project_evidence",
  "plantation_drives",
  "drive_participants",
  "selfies",
  "tree_adopters",
  "tree_health_updates"
];

async function check() {
  const existing = [];
  const missing = [];

  for (const t of allQueriedTables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error && error.code === "PGRST205") {
      missing.push(t);
    } else if (error) {
      existing.push({ table: t, status: "ERROR", message: error.message, code: error.code });
    } else {
      existing.push({ table: t, status: "OK" });
    }
  }

  console.log("EXISTING TABLES:", existing);
  console.log("MISSING TABLES:", missing);
}

check().catch(console.error);
