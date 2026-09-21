import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  calculateSilviculturalGroundSurvival,
  calculateMultiSourceSurvivalConfidence,
  evaluateProjectMultiSourceSurvival,
} from "../lib/multiSourceSurvivalFusion";
import { MultiSourceSurvivalScoreCard } from "../components/MultiSourceSurvivalScoreCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import FieldWorkerDashboard from "../pages/FieldWorkerDashboard";

// Mock Supabase client
vi.mock("../integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "demo-project-dev-001",
          name: "Maharashtra Agroforestry Sector 4",
          target_trees: 500,
          planted_trees: 500,
          verified_trees: 480,
        },
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "evidence/test.jpg" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/test.jpg" } }),
      })),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("Multi-Source Fusion Survival Confidence Engine & Dashboard Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  describe("1. Mathematical Calculation Logic & Weights", () => {
    it("calculates silvicultural survival rate according to IPCC standard (Living=1.0, Stressed=0.5, Dead=0.0)", () => {
      // 90 living, 10 stressed, 0 dead -> (90 + 5) / 100 = 95.0%
      const res1 = calculateSilviculturalGroundSurvival(90, 10, 0);
      expect(res1.rate).toBe(95.0);
      expect(res1.totalAudited).toBe(100);

      // 40 living, 20 stressed, 40 dead -> (40 + 10) / 100 = 50.0%
      const res2 = calculateSilviculturalGroundSurvival(40, 20, 40);
      expect(res2.rate).toBe(50.0);
      expect(res2.totalAudited).toBe(100);
    });

    it("evaluates Zero-Greenwashing Gold Tier when 5% Cochran quota is met and NDVI is high", () => {
      const result = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 1000,
        livingCount: 50, // exactly 5% of 1000
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.82,
        baselineNdvi: 0.65,
        overpassCount: 6,
        weatherSuitabilityScore: 90,
        lastAuditDate: new Date().toISOString(),
      });

      expect(result.overallConfidenceScore).toBeGreaterThanOrEqual(80);
      expect(result.tier).toBe("zero_greenwashing_gold");
      expect(result.isCarbonMRVReady).toBe(true);
      expect(result.isBrsrEsgCompliant).toBe(true);
      expect(result.healthStatus).toBe("optimal_vigor");
      expect(result.breakdown.groundTruth.score).toBeGreaterThanOrEqual(45);
      expect(result.breakdown.satelliteNdvi.score).toBeGreaterThanOrEqual(30);
    });

    it("applies time decay penalty when audit date exceeds 30-day grace period", () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      const result = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 500,
        livingCount: 30,
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.76,
        overpassCount: 5,
        lastAuditDate: sixtyDaysAgo,
      });

      expect(result.breakdown.timeDecay.isDecayed).toBe(true);
      expect(result.breakdown.timeDecay.penaltyPoints).toBeGreaterThan(0);
      expect(result.recommendedInterventions.some((i) => i.includes("quarterly field spot check"))).toBe(true);
    });

    it("detects Critical Mortality Risk when dead ratio is high or NDVI collapses", () => {
      const criticalResult = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 100,
        livingCount: 10,
        stressedCount: 5,
        deadCount: 20, // dead ratio 20/35 = 57%
        currentMeanNdvi: 0.32,
        baselineNdvi: 0.65,
        overpassCount: 4,
      });

      expect(criticalResult.healthStatus).toBe("critical_risk");
      expect(criticalResult.healthStatusLabel).toContain("Critical Mortality Risk");
      expect(criticalResult.recommendedInterventions.some((i) => i.includes("replacement planting"))).toBe(true);
    });

    it("handles zero audits gracefully and suggests field ranger dispatch", () => {
      const zeroResult = calculateMultiSourceSurvivalConfidence({
        totalPlantedTrees: 500,
        livingCount: 0,
        stressedCount: 0,
        deadCount: 0,
        currentMeanNdvi: 0.70,
        overpassCount: 3,
      });

      expect(zeroResult.breakdown.groundTruth.stats.totalAudited).toBe(0);
      expect(zeroResult.breakdown.groundTruth.score).toBe(0);
      expect(zeroResult.recommendedInterventions.some((i) => i.includes("Dispatch field ranger"))).toBe(true);
    });
  });

  describe("2. MultiSourceSurvivalScoreCard UI Component", () => {
    it("renders radial confidence dial, 3-pillar breakdown, and scientific diagnosis", () => {
      render(
        <MultiSourceSurvivalScoreCard
          projectName="Pune Western Ghats Sector"
          initialParams={{
            totalPlantedTrees: 400,
            livingCount: 38,
            stressedCount: 2,
            deadCount: 0,
            currentMeanNdvi: 0.78,
            baselineNdvi: 0.65,
            overpassCount: 5,
          }}
        />
      );

      expect(screen.getByText(/Multi-Source Fusion Survival Confidence Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Pune Western Ghats Sector/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Fused Tree Survival Rate/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Sentinel-2 Mean NDVI/i)).toBeInTheDocument();
      expect(screen.getByText(/Ground Truth Audits/i)).toBeInTheDocument();
      expect(screen.getByText(/Weather & Time Decay/i)).toBeInTheDocument();
    });

    it("toggles the interactive parameter simulator and recalculates in real-time", () => {
      render(
        <MultiSourceSurvivalScoreCard
          projectName="Satara Agro Cluster"
          initialParams={{
            totalPlantedTrees: 500,
            livingCount: 45,
            stressedCount: 5,
            deadCount: 0,
            currentMeanNdvi: 0.75,
          }}
        />
      );

      // Click toggle simulator
      const simButton = screen.getByRole("button", { name: /Interactive Simulator/i });
      fireEvent.click(simButton);

      expect(screen.getByText(/Live Multi-Source Parameter Simulator/i)).toBeInTheDocument();
      expect(screen.getByText(/Living Trees Audited:/i)).toBeInTheDocument();
      expect(screen.getByText(/Moisture-Stressed Saplings/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirmed Dead Trees:/i)).toBeInTheDocument();
    });
  });

  describe("3. FieldWorkerDashboard Integration", () => {
    it("renders MultiSourceSurvivalScoreCard within the Field Worker Dashboard", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <FieldWorkerDashboard />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText(/Field Scout & Ranger Console/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-Source Fusion Survival Confidence Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Ground Truth Survival Calculator/i)).toBeInTheDocument();
      expect(screen.getAllByText(/5% Cochran/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
