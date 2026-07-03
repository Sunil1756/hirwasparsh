#!/usr/bin/env node
/**
 * CI check: verify Supabase column-level GRANTs on sensitive tables.
 *
 * Guards the fix for security findings:
 *   - profiles_green_points_public
 *   - tree_adopters_selfie_url_exposed
 *   - trees_sensitive_columns_exposed
 *
 * Requires a Postgres superuser/owner connection. Reads the standard PG*
 * env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) or DATABASE_URL.
 *
 * Usage:  node scripts/verify-column-grants.mjs
 * Exits non-zero and prints a diff when actual grants drift from expected.
 */
import pg from "pg";

/**
 * Expected column-level SELECT grants for the `authenticated` role.
 * Any column NOT listed here must NOT be selectable by `authenticated`.
 * Table-level SELECT to `authenticated` is also forbidden — access must
 * be column-scoped so sensitive columns stay hidden.
 */
const EXPECTED = {
  profiles: {
    authenticated_select: [
      "id",
      "full_name",
      "avatar_url",
      "trees_planted",
      "green_points",
      "team_id",
      "created_at",
      "updated_at",
    ],
  },
  trees: {
    authenticated_select: [
      "id",
      "user_id",
      "tree_name",
      "species",
      "location",
      "latitude",
      "longitude",
      "height_cm",
      "plantation_date",
      "description",
      "photo_url",
      "before_photo_url",
      "drive_id",
      "admin_status",
      "verification_status",
      "points_awarded",
      "ai_analysis",
      "ai_confidence",
      "ai_detected_species",
      "ai_scientific_name",
      "ai_species_confidence",
      "ai_validation_score",
      "created_at",
      "updated_at",
    ],
    // These MUST never be granted to `authenticated`.
    forbidden_authenticated: [
      "selfie_photo_url",
      "device_fingerprint",
      "photo_hash",
      "qr_token",
      "exif_timestamp",
      "flagged_reason",
    ],
  },
  tree_adopters: {
    authenticated_select: [
      "id",
      "tree_id",
      "user_id",
      "role",
      "current_photo_url",
      "latitude",
      "longitude",
      "created_at",
    ],
    forbidden_authenticated: ["selfie_photo_url"],
  },
};

// Roles that must NEVER have any SELECT on these tables (column or table).
const FORBIDDEN_ROLES = ["anon"];

const TABLES = Object.keys(EXPECTED);

function normalize(arr) {
  return [...new Set(arr)].sort();
}

async function main() {
  const { Client } = pg;
  const useSsl =
    process.env.PGSSLMODE !== "disable" &&
    (process.env.DATABASE_URL?.includes("sslmode=") ? false : true);
  const client = new Client({
    ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}),
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  const errors = [];

  // 1. Table-level ACLs: `authenticated` must NOT hold table-level SELECT
  //    (column-level only); `anon` must not hold any privilege.
  const tableAcls = await client.query(
    `SELECT c.relname,
            has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select,
            has_table_privilege('anon', c.oid, 'SELECT') AS anon_select
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
    [TABLES]
  );

  for (const row of tableAcls.rows) {
    // authenticated may hold INSERT/UPDATE/DELETE at table level, but SELECT
    // must be column-scoped only. `has_table_privilege` returns true if the
    // role has SELECT on ANY column — so we assert via ACL introspection.
    const aclRow = await client.query(
      `SELECT relacl::text[] AS acl
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1`,
      [row.relname]
    );
    const acl = (aclRow.rows[0]?.acl ?? []).join(" ");
    // Look for `authenticated=...r...` (table-level SELECT).
    const authEntry = acl.match(/authenticated=([a-zA-Z*]+)/)?.[1] ?? "";
    if (authEntry.includes("r")) {
      errors.push(
        `[${row.relname}] table-level SELECT granted to 'authenticated' — must be column-scoped only`
      );
    }
    for (const role of FORBIDDEN_ROLES) {
      const entry = acl.match(new RegExp(`${role}=([a-zA-Z*]+)`))?.[1] ?? "";
      if (entry.includes("r")) {
        errors.push(`[${row.relname}] table-level SELECT granted to forbidden role '${role}'`);
      }
    }
  }

  // 2. Column-level SELECT for `authenticated` must match EXPECTED exactly,
  //    and none of the forbidden columns may appear.
  for (const table of TABLES) {
    const { rows } = await client.query(
      `SELECT a.attname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relname = $1
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND has_column_privilege('authenticated', c.oid, a.attname, 'SELECT')`,
      [table]
    );
    const actual = normalize(rows.map((r) => r.attname));
    const expected = normalize(EXPECTED[table].authenticated_select);

    const missing = expected.filter((c) => !actual.includes(c));
    const extra = actual.filter((c) => !expected.includes(c));

    if (missing.length) {
      errors.push(`[${table}] missing SELECT grant to 'authenticated' on: ${missing.join(", ")}`);
    }
    if (extra.length) {
      errors.push(
        `[${table}] unexpected SELECT grant to 'authenticated' on: ${extra.join(", ")}`
      );
    }

    const forbidden = EXPECTED[table].forbidden_authenticated ?? [];
    const leaked = forbidden.filter((c) => actual.includes(c));
    if (leaked.length) {
      errors.push(
        `[${table}] SENSITIVE column(s) exposed to 'authenticated': ${leaked.join(", ")}`
      );
    }

    // 3. `anon` must have no column-level SELECT either.
    for (const role of FORBIDDEN_ROLES) {
      const { rows: anonRows } = await client.query(
        `SELECT a.attname
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = c.oid
          WHERE n.nspname='public' AND c.relname=$1
            AND a.attnum > 0 AND NOT a.attisdropped
            AND has_column_privilege($2, c.oid, a.attname, 'SELECT')`,
        [table, role]
      );
      if (anonRows.length) {
        errors.push(
          `[${table}] column SELECT granted to forbidden role '${role}': ${anonRows.map((r) => r.attname).join(", ")}`
        );
      }
    }
  }

  await client.end();

  if (errors.length) {
    console.error("❌ Column-grant verification FAILED:\n");
    for (const e of errors) console.error("  - " + e);
    console.error(
      "\nUpdate EXPECTED in scripts/verify-column-grants.mjs only if the change is intentional and reviewed."
    );
    process.exit(1);
  }
  console.log("✅ Column-level GRANTs on profiles/trees/tree_adopters match expected policy.");
}

main().catch((err) => {
  console.error("verify-column-grants: unexpected error", err);
  process.exit(2);
});
