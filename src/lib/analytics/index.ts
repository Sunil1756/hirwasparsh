/**
 * Green Enlightenment — PostHog User Behavior Analytics & Supabase Studio Telemetry Engine
 * Tracks user engagement, onboarding conversions, MRV auditing workflows, and Core Web Vitals.
 */

import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsEventProperties {
  [key: string]: any;
}

export type AnalyticsCategory =
  | "navigation"
  | "engagement"
  | "mrv_workflow"
  | "performance"
  | "security"
  | "conversion";

export interface UserTraits {
  role?: string;
  organization_name?: string;
  trees_planted?: number;
  green_points?: number;
  account_type?: string;
  planter_tier?: string;
}

let isPostHogInitialized = false;
let currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

/**
 * Initializes the PostHog analytics SDK with production best practices
 */
export function initAnalytics(): void {
  if (isPostHogInitialized) return;

  const apiKey =
    (typeof window !== "undefined" && window.localStorage?.getItem("posthog_api_key")) ||
    import.meta.env.VITE_POSTHOG_KEY ||
    "phc_green_enlightenment_live_analytics";

  const apiHost =
    import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  if (typeof window !== "undefined") {
    try {
      posthog.init(apiKey, {
        api_host: apiHost,
        autocapture: true,
        capture_pageview: false, // Managed manually for React Router SPA
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        disable_session_recording: false,
        loaded: (ph) => {
          if (import.meta.env.DEV) {
            ph.debug(false);
          }
        },
      });
      isPostHogInitialized = true;
    } catch (err) {
      console.warn("PostHog initialization notice:", err);
    }
  }
}

/**
 * Identifies the current logged-in user in PostHog and Supabase telemetry
 */
export function identifyUser(userId: string, traits?: UserTraits): void {
  if (!userId) return;

  try {
    if (isPostHogInitialized) {
      posthog.identify(userId, traits);
    }
  } catch (err) {
    console.warn("identifyUser error:", err);
  }
}

/**
 * Resets user session identity on logout
 */
export function resetUser(): void {
  try {
    if (isPostHogInitialized) {
      posthog.reset();
    }
    currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  } catch (err) {
    console.warn("resetUser error:", err);
  }
}

/**
 * Dispatches an event to PostHog and asynchronously persists to Supabase analytics_events table
 */
export async function trackEvent(
  eventName: string,
  properties: AnalyticsEventProperties = {},
  category: AnalyticsCategory = "engagement"
): Promise<void> {
  const timestamp = new Date().toISOString();
  const eventPayload = {
    session_id: currentSessionId,
    timestamp,
    platform: "Green Enlightenment Web",
    url: typeof window !== "undefined" ? window.location.href : "",
    path: typeof window !== "undefined" ? window.location.pathname : "",
    ...properties,
  };

  // 1. Dispatch to PostHog
  try {
    if (isPostHogInitialized) {
      posthog.capture(eventName, eventPayload);
    }
  } catch (phErr) {
    console.warn("PostHog capture notice:", phErr);
  }

  // 2. Dual-dispatch to Supabase Studio analytics_events table
  try {
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData?.session?.user?.id || null;

    const deviceInfo = typeof navigator !== "undefined" ? {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    } : {};

    await supabase.from("analytics_events" as any).insert({
      user_id: userId,
      event_name: eventName,
      event_category: category,
      properties: eventPayload,
      session_id: currentSessionId,
      device_info: deviceInfo,
    } as any);
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Tracks single-page application page views
 */
export function trackPageView(path: string, pageTitle?: string): void {
  const title = pageTitle || (typeof document !== "undefined" ? document.title : "");
  trackEvent("page_view", { path, title }, "navigation");
}

/**
 * Tracks performance and Core Web Vitals telemetry
 */
export function trackPerformanceMetric(
  metricName: string,
  value: number,
  unit = "ms",
  meta: Record<string, any> = {}
): void {
  trackEvent(
    `perf_${metricName.toLowerCase()}`,
    {
      metric_name: metricName,
      value,
      unit,
      ...meta,
    },
    "performance"
  );
}

// --------------------------------------------------------------------------------------
// DOMAIN-SPECIFIC ACTION TRACKERS
// --------------------------------------------------------------------------------------

export function trackTreePlanted(tree: {
  treeId?: string;
  species: string;
  heightCm?: number;
  location: string;
  hasPhoto: boolean;
}): void {
  trackEvent("tree_planted", {
    tree_id: tree.treeId,
    species: tree.species,
    height_cm: tree.heightCm,
    location: tree.location,
    has_photo: tree.hasPhoto,
  }, "engagement");
}

export function trackTreeAdopted(adoption: {
  treeId: string;
  species: string;
  adopterRole: string;
}): void {
  trackEvent("tree_adopted", {
    tree_id: adoption.treeId,
    species: adoption.species,
    adopter_role: adoption.adopterRole,
  }, "conversion");
}

export function trackFieldSpotAudit(audit: {
  treeId: string;
  scoutId: string;
  vitalityStatus: string;
  verifiedHeightCm: number;
}): void {
  trackEvent("field_spot_audit_submitted", {
    tree_id: audit.treeId,
    scout_id: audit.scoutId,
    vitality_status: audit.vitalityStatus,
    verified_height_cm: audit.verifiedHeightCm,
  }, "mrv_workflow");
}

export function trackRiskAlertAcknowledged(alert: {
  alertId: string;
  severity: string;
  riskCategory: string;
  actionTaken: string;
}): void {
  trackEvent("risk_alert_action_taken", {
    alert_id: alert.alertId,
    severity: alert.severity,
    risk_category: alert.riskCategory,
    action_taken: alert.actionTaken,
  }, "mrv_workflow");
}

export function trackCarbonCertificateGenerated(cert: {
  serialNumber: string;
  projectName: string;
  co2SequesteredMT: number;
  valuationInr: number;
}): void {
  trackEvent("carbon_certificate_issued", {
    serial_number: cert.serialNumber,
    project_name: cert.projectName,
    co2_mt: cert.co2SequesteredMT,
    valuation_inr: cert.valuationInr,
  }, "conversion");
}

export function trackKmlParcelOnboarded(parcel: {
  fileName: string;
  acres: number;
  targetTrees: number;
}): void {
  trackEvent("kml_parcel_onboarded", {
    file_name: parcel.fileName,
    acres: parcel.acres,
    target_trees: parcel.targetTrees,
  }, "mrv_workflow");
}

export function trackNdviSatelliteInspected(satellite: {
  plotId?: string;
  ndvi: number;
  source: string;
}): void {
  trackEvent("satellite_ndvi_inspected", {
    plot_id: satellite.plotId,
    mean_ndvi: satellite.ndvi,
    satellite_source: satellite.source,
  }, "engagement");
}

// --------------------------------------------------------------------------------------
// REACT COMPONENT & HOOK FOR ROUTER LISTENING
// --------------------------------------------------------------------------------------

import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function AnalyticsTracker(): React.ReactElement | null {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

export function useAnalytics() {
  return {
    trackEvent,
    trackPageView,
    trackTreePlanted,
    trackTreeAdopted,
    trackFieldSpotAudit,
    trackRiskAlertAcknowledged,
    trackCarbonCertificateGenerated,
    trackKmlParcelOnboarded,
    trackNdviSatelliteInspected,
    trackPerformanceMetric,
    identifyUser,
    resetUser,
  };
}
