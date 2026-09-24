import { describe, it, expect, vi, beforeEach } from "vitest";
import { dashboardDataService } from "@/services/dashboardDataService";
import { fetchLivePlatformMetrics } from "@/lib/platformStats";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Phase 3 Task 13 — Real Project Dashboard & Platform Data Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Platform-Wide Real Telemetry Aggregation", () => {
    it("returns zero counts when database tables are empty (no fake fallbacks)", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        return {
          select: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        };
      });

      const stats = await dashboardDataService.getLivePlatformStatistics();

      expect(stats.totalTrees).toBe(0);
      expect(stats.aliveTrees).toBe(0);
      expect(stats.totalProjects).toBe(0);
      expect(stats.activeProjects).toBe(0);
      expect(stats.totalOrganizations).toBe(0);
      expect(stats.totalHectaresMapped).toBe(0);
      expect(stats.totalCo2SequesteredKg).toBe(0);
      expect(stats.totalCo2SequesteredMT).toBe(0);
      expect(stats.statusDistribution.active).toBe(0);
      expect(stats.statusDistribution.draft).toBe(0);
    });

    it("accurately aggregates real tree counts, survival rates, and species distributions", async () => {
      const mockTrees = [
        { id: "t1", species: "Neem", status: "alive", verification_status: "verified" },
        { id: "t2", species: "Neem", status: "thriving", verification_status: "verified" },
        { id: "t3", species: "Banyan", status: "dead", verification_status: "verified" },
        { id: "t4", species: "Peepal", status: "alive", verification_status: "verified" },
      ];

      const mockProjects = [
        { id: "p1", status: "active", project_type: "reforestation", target_trees: 1000, planted_trees: 500 },
        { id: "p2", status: "draft", project_type: "urban_greenery", target_trees: 200, planted_trees: 0 },
      ];

      const mockBoundaries = [
        { area_hectares: 2.5, area_acres: 6.18 },
        { area_hectares: 1.5, area_acres: 3.71 },
      ];

      const mockOrgs = [
        { id: "org1", is_verified: true },
        { id: "org2", is_verified: false },
      ];

      const mockProfiles = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return { select: vi.fn().mockResolvedValue({ data: mockTrees, error: null }) };
        }
        if (table === "projects") {
          return { select: vi.fn().mockResolvedValue({ data: mockProjects, error: null }) };
        }
        if (table === "project_boundaries") {
          return { select: vi.fn().mockResolvedValue({ data: mockBoundaries, error: null }) };
        }
        if (table === "organizations") {
          return { select: vi.fn().mockResolvedValue({ data: mockOrgs, error: null }) };
        }
        if (table === "profiles") {
          return { select: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const stats = await dashboardDataService.getLivePlatformStatistics();

      expect(stats.totalTrees).toBe(4);
      expect(stats.aliveTrees).toBe(3); // 2 alive + 1 thriving
      expect(stats.survivalRatePct).toBe(75); // 3 / 4 = 75%
      expect(stats.speciesDistribution["Neem"]).toBe(2);
      expect(stats.speciesDistribution["Banyan"]).toBe(1);
      expect(stats.speciesDistribution["Peepal"]).toBe(1);

      expect(stats.totalProjects).toBe(2);
      expect(stats.activeProjects).toBe(1);
      expect(stats.statusDistribution.active).toBe(1);
      expect(stats.statusDistribution.draft).toBe(1);

      expect(stats.totalHectaresMapped).toBe(4);
      expect(stats.totalOrganizations).toBe(2);
      expect(stats.verifiedOrganizations).toBe(1);
      expect(stats.totalPlanters).toBe(3);

      // Real CO2 Sequestration: 3 living trees * 22 kg = 66 kg
      expect(stats.totalCo2SequesteredKg).toBe(66);
      expect(stats.totalCo2SequesteredMT).toBe(0.07);
    });
  });

  describe("2. Project-Specific Live Dashboard Telemetry", () => {
    it("fetches and aggregates real metrics for an afforestation project", async () => {
      const mockProject = {
        id: "proj-101",
        name: "Western Ghats Corridor",
        organization_id: "org-55",
        status: "active",
        project_type: "reforestation",
        target_trees: 5000,
        species_list: ["Teak", "Bamboo", "Mahua"],
      };

      const mockBoundaries = [
        { area_hectares: 3.2, area_acres: 7.9 },
        { area_hectares: 1.8, area_acres: 4.45 },
      ];

      const mockTrees = [
        { id: "t1", status: "alive", species: "Teak" },
        { id: "t2", status: "alive", species: "Bamboo" },
        { id: "t3", status: "dead", species: "Mahua" },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
              }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockBoundaries, error: null }),
            }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
            }),
          };
        }
        if (table === "tree_photos" || table === "tree_observations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "photo1" }], error: null }),
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Green Earth Trust" }, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const metrics = await dashboardDataService.getProjectMetrics("proj-101");

      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.projectId).toBe("proj-101");
        expect(metrics.name).toBe("Western Ghats Corridor");
        expect(metrics.organizationName).toBe("Green Earth Trust");
        expect(metrics.targetTrees).toBe(5000);
        expect(metrics.plantedTrees).toBe(3);
        expect(metrics.aliveTrees).toBe(2);
        expect(metrics.survivalRatePct).toBe(67);
        expect(metrics.targetAreaHectares).toBe(5);
        expect(metrics.boundariesCount).toBe(2);
        expect(metrics.photosCount).toBe(1);
        expect(metrics.estimatedAnnualCo2eMT).toBe(0.04);
      }
    });
  });

  describe("3. Organization Dashboard Metrics Aggregation", () => {
    it("fetches and aggregates live organization projects, members and tree statistics", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Sahyadri Bio-Reserve",
        type: "ngo",
        is_verified: true,
      };

      const mockProjects = [
        { id: "p1", status: "active", target_trees: 2000, planted_trees: 1500 },
        { id: "p2", status: "under_review", target_trees: 1000, planted_trees: 0 },
      ];

      const mockMembers = [
        { id: "m1", status: "active" },
        { id: "m2", status: "active" },
      ];

      const mockTrees = [
        { id: "t1", status: "alive" },
        { id: "t2", status: "alive" },
        { id: "t3", status: "dead" },
      ];

      const mockBoundaries = [
        { id: "b1", area_hectares: 3.5 },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
              }),
            }),
          };
        }
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
            }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTrees, error: null }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockBoundaries, error: null }),
          };
        }
        return { select: vi.fn() };
      });

      const metrics = await dashboardDataService.getOrganizationDashboardMetrics("org-1");

      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.organizationId).toBe("org-1");
        expect(metrics.name).toBe("Sahyadri Bio-Reserve");
        expect(metrics.isVerified).toBe(true);
        expect(metrics.totalProjects).toBe(2);
        expect(metrics.activeProjects).toBe(1);
        expect(metrics.totalTargetTrees).toBe(3000);
        expect(metrics.totalPlantedTrees).toBe(3);
        expect(metrics.totalAliveTrees).toBe(2);
        expect(metrics.overallSurvivalRatePct).toBe(67);
        expect(metrics.membersCount).toBe(2);
        expect(metrics.totalHectares).toBe(3.5);
      }
    });
  });

  describe("4. Platform Stats Integration (fetchLivePlatformMetrics)", () => {
    it("fetches live real statistics without mock fallbacks", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: "t1", status: "alive", planting_type: "individual" },
                { id: "t2", status: "thriving", planting_type: "institutional" },
              ],
              error: null,
            }),
          };
        }
        if (table === "projects") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ id: "p1", target_trees: 500, status: "active" }],
              error: null,
            }),
          };
        }
        if (table === "organizations" || table === "profiles" || table === "tree_observations") {
          return {
            select: vi.fn().mockResolvedValue({ count: 1, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const metrics = await fetchLivePlatformMetrics();

      expect(metrics.totalTreesPlanted).toBe(2);
      expect(metrics.individualTrees).toBe(1);
      expect(metrics.plantationProjectTrees).toBe(1);
      expect(metrics.survivingTrees).toBe(2);
      expect(metrics.survivalRatePct).toBe(100);
      expect(metrics.activeProjectsCount).toBe(1);
      expect(metrics.totalOrganizationsCount).toBe(1);
      expect(metrics.co2OffsetKgPerYear).toBe(44); // 2 * 22
      expect(metrics.o2GeneratedKgPerYear).toBe(200); // 2 * 100
    });
  });
});
