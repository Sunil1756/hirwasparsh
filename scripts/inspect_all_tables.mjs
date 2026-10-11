import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const candidateTables = [
  'profiles',
  'organizations',
  'organization_members',
  'projects',
  'project_boundaries',
  'trees',
  'tree_observations',
  'tree_evidence',
  'tree_photos',
  'monitoring_tasks',
  'satellite_telemetry',
  'satellite_readings',
  'verifications',
  'confidence_scores',
  'drone_surveys',
  'spectral_anomalies',
  'plantation_projects',
  'plots',
  'check_ins',
  'plantation_drives',
  'drive_participants',
  'challenges',
  'growth_updates',
  'audit_logs',
  'notifications'
];

async function checkTables() {
  console.log('--- Checking table row counts in live Supabase ---');
  for (const table of candidateTables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Table '${table}': ERROR (${error.code}) ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': ${count} rows`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': EXCEPTION ${e.message}`);
    }
  }
}

checkTables();
