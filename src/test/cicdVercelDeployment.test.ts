import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  validateEnvConfig,
  getValidatedEnv,
  envSchema,
} from "../lib/envConfig";
import {
  resolveTargets,
  buildEnvPayload,
  syncVercelEnvironmentVariables,
  MANAGED_ENV_VARS,
} from "../../scripts/sync-vercel-env.mjs";

describe("CI/CD Vercel Deployment & Environment Configuration Engine", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("1. Vercel Configuration (vercel.json)", () => {
    const vercelPath = path.join(rootDir, "vercel.json");

    it("verifies vercel.json exists and contains valid JSON", () => {
      expect(existsSync(vercelPath)).toBe(true);
      const content = readFileSync(vercelPath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed).toBeDefined();
    });

    it("enforces correct build and SPA routing rules in vercel.json", () => {
      const content = readFileSync(vercelPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.buildCommand).toBe("npm run build");
      expect(parsed.outputDirectory).toBe("dist");
      expect(parsed.framework).toBe("vite");
      expect(parsed.cleanUrls).toBe(true);

      const hasSpaRewrite = parsed.rewrites?.some(
        (r: any) => r.source === "/(.*)" && r.destination === "/index.html"
      );
      expect(hasSpaRewrite).toBe(true);
    });

    it("enforces robust security and caching headers in vercel.json", () => {
      const content = readFileSync(vercelPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.headers).toBeInstanceOf(Array);

      // Verify asset caching
      const assetHeaderGroup = parsed.headers.find((h: any) => h.source === "/assets/(.*)");
      expect(assetHeaderGroup).toBeDefined();
      const cacheControl = assetHeaderGroup.headers.find((kv: any) => kv.key === "Cache-Control");
      expect(cacheControl.value).toContain("max-age=31536000");

      // Verify root security headers
      const rootHeaderGroup = parsed.headers.find((h: any) => h.source === "/(.*)");
      expect(rootHeaderGroup).toBeDefined();
      const headerKeys = rootHeaderGroup.headers.map((kv: any) => kv.key);
      expect(headerKeys).toContain("X-Content-Type-Options");
      expect(headerKeys).toContain("X-Frame-Options");
      expect(headerKeys).toContain("Strict-Transport-Security");
      expect(headerKeys).toContain("Referrer-Policy");
      expect(headerKeys).toContain("Permissions-Policy");
    });
  });

  describe("2. GitHub Actions Workflows", () => {
    it("validates deploy.yml workflow configuration and Git triggers", () => {
      const deployPath = path.join(rootDir, ".github/workflows/deploy.yml");
      expect(existsSync(deployPath)).toBe(true);

      const content = readFileSync(deployPath, "utf-8");
      expect(content).toContain("name: Vercel Production & Preview Deployment");
      expect(content).toContain("branches:\n      - main");
      expect(content).toContain("pull_request:");
      expect(content).toContain("workflow_dispatch:");
      expect(content).toContain("quality-gate:");
      expect(content).toContain("deploy:");
      expect(content).toContain("vercel pull");
      expect(content).toContain("vercel build");
      expect(content).toContain("vercel deploy --prebuilt");
      expect(content).toContain("secrets.VERCEL_TOKEN");
      expect(content).toContain("secrets.VERCEL_ORG_ID");
      expect(content).toContain("secrets.VERCEL_PROJECT_ID");
    });

    it("validates ci.yml workflow for branch and PR quality validation", () => {
      const ciPath = path.join(rootDir, ".github/workflows/ci.yml");
      expect(existsSync(ciPath)).toBe(true);

      const content = readFileSync(ciPath, "utf-8");
      expect(content).toContain("name: Continuous Integration & Verification");
      expect(content).toContain("npx tsc --noEmit");
      expect(content).toContain("npm test -- --run");
      expect(content).toContain("npm run build");
    });

    it("validates sync-env.yml workflow for GitHub Secrets to Vercel sync", () => {
      const syncPath = path.join(rootDir, ".github/workflows/sync-env.yml");
      expect(existsSync(syncPath)).toBe(true);

      const content = readFileSync(syncPath, "utf-8");
      expect(content).toContain("name: Sync Environment Variables to Vercel");
      expect(content).toContain("node scripts/sync-vercel-env.mjs");
      expect(content).toContain("SYNC_TARGET_ENV:");
      expect(content).toContain("secrets.VERCEL_TOKEN");
    });
  });

  describe("3. Environment Variable Schema & Validation Engine", () => {
    it("validates compliant environment configuration with safe defaults", () => {
      const validEnv = {
        VITE_SUPABASE_URL: "https://example-project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validAnonKeyStructure",
        VITE_GEMINI_API_KEY: "AIzaSyValidGeminiKey",
        VITE_POSTHOG_KEY: "phc_test_key_12345",
        VITE_POSTHOG_HOST: "https://us.i.posthog.com",
      };

      const result = validateEnvConfig(validEnv);
      expect(result.isValid).toBe(true);
      expect(result.data.VITE_SUPABASE_URL).toBe("https://example-project.supabase.co");
      expect(result.data.VITE_POSTHOG_KEY).toBe("phc_test_key_12345");
    });

    it("safely catches invalid URLs and returns formatted validation errors", () => {
      const invalidEnv = {
        VITE_SUPABASE_URL: "not-a-valid-url",
        VITE_SUPABASE_ANON_KEY: "short",
        VITE_POSTHOG_HOST: "invalid-host-url",
      };

      const result = validateEnvConfig(invalidEnv);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.some((e) => e.includes("VITE_SUPABASE_URL"))).toBe(true);
    });

    it("detects placeholder keys when strict mode is enabled for production", () => {
      const placeholderEnv = {
        VITE_SUPABASE_URL: "https://placeholder-project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholderKeyForClientSafeInit",
      };

      const result = validateEnvConfig(placeholderEnv, true);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.includes("placeholder"))).toBe(true);
    });

    it("provides safe fallback configuration when getValidatedEnv is called", () => {
      const env = getValidatedEnv();
      expect(env).toBeDefined();
      expect(env.VITE_SUPABASE_URL).toBeDefined();
      expect(env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    });
  });

  describe("4. Vercel Environment Variable Synchronizer Script", () => {
    it("correctly resolves target environments", () => {
      expect(resolveTargets("all")).toEqual(["production", "preview", "development"]);
      expect(resolveTargets("production")).toEqual(["production"]);
      expect(resolveTargets("preview")).toEqual(["preview"]);
      expect(resolveTargets("development")).toEqual(["development"]);
    });

    it("builds correct Vercel API payloads with encrypted classification", () => {
      const keyPayload = buildEnvPayload("VITE_SUPABASE_ANON_KEY", "secret-token", ["production"]);
      expect(keyPayload.key).toBe("VITE_SUPABASE_ANON_KEY");
      expect(keyPayload.value).toBe("secret-token");
      expect(keyPayload.type).toBe("encrypted");
      expect(keyPayload.target).toEqual(["production"]);

      const urlPayload = buildEnvPayload("VITE_SUPABASE_URL", "https://prod.supabase.co", ["production", "preview"]);
      expect(urlPayload.type).toBe("plain");
      expect(urlPayload.target).toEqual(["production", "preview"]);
    });

    it("executes dry-run environment synchronization without throwing", async () => {
      const results = await syncVercelEnvironmentVariables({
        token: "fake-vercel-token",
        projectId: "prj_fake_id",
        dryRun: true,
        envValues: {
          VITE_SUPABASE_URL: "https://test.supabase.co",
          VITE_SUPABASE_ANON_KEY: "anon-test-key",
        },
      });

      expect(results.synced.length).toBeGreaterThan(0);
      expect(results.synced[0].status).toBe("dry-run");
      expect(results.errors.length).toBe(0);
    });

    it("reports missing credentials when token or projectId are absent", async () => {
      const results = await syncVercelEnvironmentVariables({
        token: "",
        projectId: "",
        dryRun: false,
      });

      expect(results.errors.length).toBe(1);
      expect(results.errors[0]).toContain("Missing required credentials");
    });
  });
});
