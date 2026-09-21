import { describe, it, expect, vi, beforeEach } from "vitest";
import posthog from "posthog-js";
import {
  initAnalytics,
  identifyUser,
  resetUser,
  trackEvent,
  trackPageView,
  trackPerformanceMetric,
  trackTreePlanted,
  trackTreeAdopted,
  trackFieldSpotAudit,
  trackRiskAlertAcknowledged,
  trackCarbonCertificateGenerated,
  trackKmlParcelOnboarded,
  trackNdviSatelliteInspected,
  useAnalytics,
} from "@/lib/analytics";

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-analytics-01" } } },
      }),
    },
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    capture: vi.fn(),
  },
}));

describe("PostHog Analytics & Supabase Studio Telemetry Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Initialization & User Identity Lifecycle", () => {
    it("initializes PostHog with production SPA tracking settings", () => {
      initAnalytics();
      expect(posthog.init).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autocapture: true,
          capture_pageview: false,
          capture_pageleave: true,
        })
      );
    });

    it("identifies user in PostHog with role and organization traits", () => {
      initAnalytics();
      identifyUser("user-analytics-01", {
        role: "ngo",
        organization_name: "Green Trust Maharashtra",
        trees_planted: 240,
        planter_tier: "enterprise_mrv",
      });

      expect(posthog.identify).toHaveBeenCalledWith("user-analytics-01", {
        role: "ngo",
        organization_name: "Green Trust Maharashtra",
        trees_planted: 240,
        planter_tier: "enterprise_mrv",
      });
    });

    it("resets user identity and session token upon logout", () => {
      initAnalytics();
      resetUser();
      expect(posthog.reset).toHaveBeenCalled();
    });
  });

  describe("2. Event Dispatching & Supabase Studio Dual-Persistence", () => {
    it("captures event in PostHog and dual-dispatches to Supabase analytics_events table", async () => {
      initAnalytics();
      await trackEvent("dashboard_filter_changed", { filter: "past_30_days", category: "all" }, "engagement");

      expect(posthog.capture).toHaveBeenCalledWith(
        "dashboard_filter_changed",
        expect.objectContaining({
          filter: "past_30_days",
          platform: "Green Enlightenment Web",
        })
      );

      expect(mockFrom).toHaveBeenCalledWith("analytics_events");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-analytics-01",
          event_name: "dashboard_filter_changed",
          event_category: "engagement",
        })
      );
    });

    it("tracks single-page application page views", () => {
      initAnalytics();
      trackPageView("/adopter", "Adopter Dashboard | Green Enlightenment");

      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          path: "/adopter",
          title: "Adopter Dashboard | Green Enlightenment",
        })
      );
    });

    it("records Core Web Vitals and frontend latency metrics", () => {
      initAnalytics();
      trackPerformanceMetric("LCP", 1250, "ms", { rating: "good" });

      expect(posthog.capture).toHaveBeenCalledWith(
        "perf_lcp",
        expect.objectContaining({
          metric_name: "LCP",
          value: 1250,
          unit: "ms",
          rating: "good",
        })
      );
    });
  });

  describe("3. Domain-Specific Business Event Trackers", () => {
    it("tracks tree planting events", () => {
      initAnalytics();
      trackTreePlanted({
        treeId: "tree-neem-101",
        species: "Azadirachta indica",
        heightCm: 75,
        location: "Satara",
        hasPhoto: true,
      });

      expect(posthog.capture).toHaveBeenCalledWith(
        "tree_planted",
        expect.objectContaining({
          tree_id: "tree-neem-101",
          species: "Azadirachta indica",
          has_photo: true,
        })
      );
    });

    it("tracks tree adoption conversion events", () => {
      initAnalytics();
      trackTreeAdopted({
        treeId: "tree-neem-101",
        species: "Azadirachta indica",
        adopterRole: "citizen_adopter",
      });

      expect(posthog.capture).toHaveBeenCalledWith(
        "tree_adopted",
        expect.objectContaining({
          tree_id: "tree-neem-101",
          adopter_role: "citizen_adopter",
        })
      );
    });

    it("tracks field spot audit submissions", () => {
      initAnalytics();
      trackFieldSpotAudit({
        treeId: "tree-neem-101",
        scoutId: "scout-01",
        vitalityStatus: "healthy",
        verifiedHeightCm: 80,
      });

      expect(posthog.capture).toHaveBeenCalledWith(
        "field_spot_audit_submitted",
        expect.objectContaining({
          scout_id: "scout-01",
          vitality_status: "healthy",
        })
      );
    });

    it("tracks risk alert acknowledgment actions", () => {
      initAnalytics();
      trackRiskAlertAcknowledged({
        alertId: "alert-99",
        severity: "critical",
        riskCategory: "drought_moisture_stress",
        actionTaken: "dispatched_drip_irrigation",
      });

      expect(posthog.capture).toHaveBeenCalledWith(
        "risk_alert_action_taken",
        expect.objectContaining({
          alert_id: "alert-99",
          risk_category: "drought_moisture_stress",
          action_taken: "dispatched_drip_irrigation",
        })
      );
    });

    it("tracks carbon certificate issuance conversions", () => {
      initAnalytics();
      trackCarbonCertificateGenerated({
        serialNumber: "GE-IND-MH-2026-SAHY-01",
        projectName: "Sahyadri Bio-Shield",
        co2SequesteredMT: 45.8,
        valuationInr: 54960,
      });

      expect(posthog.capture).toHaveBeenCalledWith(
        "carbon_certificate_issued",
        expect.objectContaining({
          serial_number: "GE-IND-MH-2026-SAHY-01",
          co2_mt: 45.8,
          valuation_inr: 54960,
        })
      );
    });

    it("tracks KML parcel onboarding and satellite NDVI inspections", () => {
      initAnalytics();
      trackKmlParcelOnboarded({
        fileName: "satara_plot.kml",
        acres: 12.4,
        targetTrees: 5000,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "kml_parcel_onboarded",
        expect.objectContaining({ file_name: "satara_plot.kml", acres: 12.4 })
      );

      trackNdviSatelliteInspected({
        plotId: "plot-101",
        ndvi: 0.82,
        source: "copernicus_sentinel2_l2a",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "satellite_ndvi_inspected",
        expect.objectContaining({ plot_id: "plot-101", mean_ndvi: 0.82 })
      );
    });

    it("exposes complete analytics methods via useAnalytics hook", () => {
      const analytics = useAnalytics();
      expect(analytics.trackEvent).toBeDefined();
      expect(analytics.trackPageView).toBeDefined();
      expect(analytics.trackTreePlanted).toBeDefined();
      expect(analytics.trackTreeAdopted).toBeDefined();
      expect(analytics.trackFieldSpotAudit).toBeDefined();
      expect(analytics.trackRiskAlertAcknowledged).toBeDefined();
      expect(analytics.trackCarbonCertificateGenerated).toBeDefined();
      expect(analytics.trackKmlParcelOnboarded).toBeDefined();
      expect(analytics.trackNdviSatelliteInspected).toBeDefined();
      expect(analytics.trackPerformanceMetric).toBeDefined();
      expect(analytics.identifyUser).toBeDefined();
      expect(analytics.resetUser).toBeDefined();
    });
  });
});
