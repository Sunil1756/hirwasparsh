#!/usr/bin/env node
/**
 * CI check: verify Supabase table + column-level GRANTs on sensitive tables
 * have not drifted from the approved snapshot.
 *
 * Guards the resolved security findings:
 *   - profiles_green_points_public
 *   - tree_adopters_selfie_url_exposed
 *   - trees_sensitive_columns_exposed
 *
 * The snapshot at scripts/column-grants.snapshot.json is the source of truth.
 * Any drift (added, removed, or role-changed grants) fails CI. Sensitive
 * columns are additionally hard-asserted to never be granted at column level
 * to `anon` or `authenticated`, independent of the snapshot — belt & braces
 * so an accidental snapshot update can't silently re-expose them.
 *
 * Updating the snapshot:
 *   node scripts/verify-column-grants.mjs --update
 *
 * Env:  standard PG* vars or DATABASE_URL. Needs a role that can read
 *       pg_class / pg_attribute ACLs (owner or superuser).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, "column-grants.snapshot.json");

const TABLES = ["profiles", "trees", "tree_adopters"];

/**
 * Columns that must NEVER be readable by `anon` or `authenticated` at the
 * column level, regardless of what the snapshot says. Hard invariant.
 */
const SENSITIVE_COLUMNS = {
  trees: [
    "selfie_photo_url",
    "device_fingerprint",
    "photo_hash",
    "qr_token",
    "exif_timestamp",
    "flagged_reason",
  ],
  tree_adopters: ["selfie_photo_url"],
  profiles: [],
};
const PUBLIC_ROLES = ["anon", "authenticated"];

async function fetchAcls(client) {
  const out = { tables: {}, columns: {} };

  const tableRows = await client.query(
    `SELECT c.relname, coalesce(c.relacl::text[], '{}') AS acl
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname = ANY($1::text[])
      ORDER BY c.relname`,
    [TABLES]
  );
  for (const r of tableRows.rows) {
    out.tables[r.relname] = [...r.acl].sort();
  }

  const colRows = await client.query(
    `SELECT c.relname, a.attname, a.attacl::text[] AS acl
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname='public' AND c.relname = ANY($1::text[])
        AND a.attnum > 0 AND NOT a.attisdropped
        AND a.attacl IS NOT NULL
      ORDER BY c.relname, a.attname`,
    [TABLES]
  );
  for (const r of colRows.rows) {
    out.columns[r.relname] ??= {};
    out.columns[r.relname][r.attname] = [...(r.acl ?? [])].sort();
  }
  return out;
}

function connect() {
  const { Client } = pg;
  const opts = process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {};
  // Supabase pooler uses self-signed certs — accept them for read-only verification.
  if (process.env.PGSSLMODE !== "disable") {
    opts.ssl = { rejectUnauthorized: false };
  }
  return new Client(opts);
}

function diff(expected, actual, label, errors) {
  const e = JSON.stringify(expected, null, 2);
  const a = JSON.stringify(actual, null, 2);
  if (e !== a) {
    errors.push(`${label} drift:\n--- expected\n${e}\n--- actual\n${a}`);
  }
}

async function main() {
  const update = process.argv.includes("--update");
  const client = connect();
  await client.connect();
  const actual = await fetchAcls(client);
  await client.end();

  // Hard invariant check — sensitive columns must NOT have column-level ACL
  // entries granting SELECT (`r`) to anon or authenticated.
  const errors = [];
  for (const [table, cols] of Object.entries(SENSITIVE_COLUMNS)) {
    for (const col of cols) {
      const acl = actual.columns[table]?.[col] ?? [];
      for (const role of PUBLIC_ROLES) {
        const entry = acl.find((e) => e.startsWith(`${role}=`));
        if (entry && /=([a-zA-Z*]*)r/.test(entry)) {
          errors.push(
            `SENSITIVE: ${table}.${col} exposes SELECT to '${role}' (acl='${entry}'). ` +
              `Revoke immediately — this re-opens a fixed security finding.`
          );
        }
      }
    }
  }

  if (update) {
    if (errors.length) {
      console.error("Refusing to update snapshot while sensitive-column invariants fail:\n");
      for (const e of errors) console.error("  - " + e);
      process.exit(1);
    }
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(actual, null, 2) + "\n");
    console.log(`✅ Snapshot written to ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
    return;
  }

  if (!existsSync(SNAPSHOT_PATH)) {
    console.error(
      `Snapshot missing at ${SNAPSHOT_PATH}. Run:\n  node scripts/verify-column-grants.mjs --update`
    );
    process.exit(1);
  }
  const expected = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  diff(expected.tables, actual.tables, "table ACL", errors);
  diff(expected.columns, actual.columns, "column ACL", errors);

  if (errors.length) {
    console.error("❌ Column-grant verification FAILED:\n");
    for (const e of errors) console.error(e + "\n");
    console.error(
      "If the change is intentional and reviewed, refresh the snapshot with:\n" +
        "  node scripts/verify-column-grants.mjs --update\n" +
        "and commit scripts/column-grants.snapshot.json."
    );
    process.exit(1);
  }
  console.log("✅ Table + column GRANTs on profiles/trees/tree_adopters match snapshot.");
}

main().catch((err) => {
  console.error("verify-column-grants: unexpected error", err);
  process.exit(2);
});
