/**
 * Green Enlightenment — Environment Configuration & Validation Engine
 * Ensures type-safe build-time and runtime environment variables across Vercel & local environments.
 */

import { z } from "zod";

export const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid HTTPS URL (e.g., https://your-project.supabase.co)")
    .default("https://hirwasparsh-project.supabase.co"),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(10, "VITE_SUPABASE_ANON_KEY must be a valid Supabase anonymous key")
    .default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholderKeyForClientSafeInit"),
  VITE_GEMINI_API_KEY: z
    .string()
    .optional()
    .default(""),
  VITE_POSTHOG_KEY: z
    .string()
    .optional()
    .default("phc_green_enlightenment_live_analytics"),
  VITE_POSTHOG_HOST: z
    .string()
    .url("VITE_POSTHOG_HOST must be a valid URL")
    .optional()
    .default("https://us.i.posthog.com"),
  MODE: z.string().optional().default("development"),
  DEV: z.boolean().optional().default(true),
  PROD: z.boolean().optional().default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

export interface EnvValidationResult {
  isValid: boolean;
  data: EnvConfig;
  errors?: string[];
}

/**
 * Validates raw environment variable object against the defined schema
 */
export function validateEnvConfig(
  rawEnv?: Record<string, any>,
  isStrict: boolean = false
): EnvValidationResult {
  const source = rawEnv || (typeof import.meta !== "undefined" && import.meta.env) || {};

  const parseResult = envSchema.safeParse(source);

  if (parseResult.success) {
    if (isStrict) {
      const strictErrors: string[] = [];
      if (!parseResult.data.VITE_SUPABASE_URL || parseResult.data.VITE_SUPABASE_URL.toLowerCase().includes("placeholder")) {
        strictErrors.push("VITE_SUPABASE_URL contains placeholder value and must be configured with a real Supabase endpoint in production.");
      }
      if (!parseResult.data.VITE_SUPABASE_ANON_KEY || parseResult.data.VITE_SUPABASE_ANON_KEY.toLowerCase().includes("placeholder")) {
        strictErrors.push("VITE_SUPABASE_ANON_KEY contains placeholder value and must be configured with a real Supabase anon key in production.");
      }
      if (strictErrors.length > 0) {
        return {
          isValid: false,
          data: parseResult.data,
          errors: strictErrors,
        };
      }
    }

    return {
      isValid: true,
      data: parseResult.data,
    };
  }

  const formattedErrors = parseResult.error.errors.map(
    (err) => `${err.path.join(".")}: ${err.message}`
  );

  return {
    isValid: false,
    data: envSchema.parse({}), // Safe defaults
    errors: formattedErrors,
  };
}

/**
 * Returns validated environment settings with safe fallbacks
 */
export function getValidatedEnv(): EnvConfig {
  const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD;
  const result = validateEnvConfig(
    typeof import.meta !== "undefined" ? import.meta.env : {},
    isProd
  );

  if (!result.isValid && result.errors && result.errors.length > 0) {
    if (isProd) {
      console.error("Critical: Environment variable validation warnings:", result.errors);
    } else {
      console.warn("Notice: Environment variables using development fallbacks:", result.errors);
    }
  }

  return result.data;
}
