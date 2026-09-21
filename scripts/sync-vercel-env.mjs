#!/usr/bin/env node
/**
 * Green Enlightenment — Vercel Environment Variable Synchronizer
 * Synchronizes repository-defined secrets and configuration down to Vercel projects via the Vercel REST API.
 */

export const MANAGED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_GEMINI_API_KEY",
  "VITE_POSTHOG_KEY",
  "VITE_POSTHOG_HOST",
];

export function resolveTargets(targetInput = "all") {
  if (targetInput === "all") {
    return ["production", "preview", "development"];
  }
  return [targetInput];
}

export function buildEnvPayload(key, value, targets) {
  return {
    key,
    value: String(value),
    type: key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") ? "encrypted" : "plain",
    target: targets,
  };
}

export async function syncVercelEnvironmentVariables(options = {}) {
  const token = options.token || process.env.VERCEL_TOKEN;
  const projectId = options.projectId || process.env.VERCEL_PROJECT_ID;
  const orgId = options.orgId || process.env.VERCEL_ORG_ID;
  const targetMode = options.targetMode || process.env.SYNC_TARGET_ENV || "all";
  const dryRun = options.dryRun || process.argv.includes("--dry-run");

  const results = {
    synced: [],
    skipped: [],
    errors: [],
  };

  if (!token || !projectId) {
    const errorMsg = "Missing required credentials: VERCEL_TOKEN and VERCEL_PROJECT_ID must be defined.";
    if (!dryRun) {
      console.warn(`[Vercel Env Sync] Notice: ${errorMsg}`);
    }
    results.errors.push(errorMsg);
    return results;
  }

  const targets = resolveTargets(targetMode);
  console.log(`[Vercel Env Sync] Initiating sync for targets: ${targets.join(", ")} (Dry Run: ${dryRun})`);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const teamQuery = orgId ? `?teamId=${orgId}` : "";
  const apiUrl = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env${teamQuery}`;

  for (const envKey of MANAGED_ENV_VARS) {
    const value = options.envValues?.[envKey] ?? process.env[envKey];
    if (!value) {
      results.skipped.push({ key: envKey, reason: "No value present in source environment" });
      continue;
    }

    const payload = buildEnvPayload(envKey, value, targets);

    if (dryRun) {
      console.log(`[Vercel Env Sync - Dry Run] Would sync ${envKey} -> targets [${targets.join(", ")}]`);
      results.synced.push({ key: envKey, targets, status: "dry-run" });
      continue;
    }

    try {
      if (typeof fetch !== "undefined") {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(`[Vercel Env Sync] Successfully synced ${envKey}`);
          results.synced.push({ key: envKey, targets, status: "created" });
        } else {
          const errBody = await response.text();
          console.warn(`[Vercel Env Sync] API Response for ${envKey}: ${response.status} - ${errBody}`);
          results.skipped.push({ key: envKey, status: response.status, details: errBody });
        }
      }
    } catch (err) {
      console.error(`[Vercel Env Sync] Error syncing ${envKey}:`, err);
      results.errors.push({ key: envKey, error: String(err) });
    }
  }

  return results;
}

// Run CLI when invoked directly
if (typeof process !== "undefined" && process.argv && process.argv[1]?.endsWith("sync-vercel-env.mjs")) {
  syncVercelEnvironmentVariables().then((res) => {
    console.log("[Vercel Env Sync] Completed execution:", JSON.stringify(res, null, 2));
  });
}
