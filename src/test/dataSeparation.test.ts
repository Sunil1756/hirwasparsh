import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createIndividualTree,
  fetchMyIndividualTrees,
  fetchIndividualUserStats,
} from "@/services/individualDataService";
import {
  createOrganization,
  createInstitutionalPlot,
  onboardBulkManifest,
  fetchInstitutionalMRVMetrics,
} from "@/services/institutionalDataService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe("Data Backend Partitioning: Individual (B2C) vs Institutional (B2B / NGO / CSR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Individual Data Domain (B2C)", () => {
    it("enforces planting_type = 'individual' and plot_id = null on single tree creation", async () => {
      const mockInsertedTree = {
        id: "tree-ind-101",
        user_id: "user-123",
        tree_name: "My Backyard Neem",
        species: "Neem",
        planting_type: "individual",
        plot_id: null,
        org_id: null,
        height_cm: 110,
        location: "Pune, Maharashtra",
        plantation_date: "2026-09-10",
        verification_status: "pending",
        admin_status: "pending",
        points_awarded: 0,
        created_at: new Date().toISOString(),
      };

      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInsertedTree, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({ insert: insertSpy });

      const res = await createIndividualTree({
        userId: "user-123",
        treeName: "My Backyard Neem",
        species: "Neem",
        plantationDate: "2026-09-10",
        heightCm: 110,
        location: "Pune, Maharashtra",
        latitude: 18.5204,
        longitude: 73.8567,
      });

      expect(res.success).toBe(true);
      expect(res.tree?.planting_type).toBe("individual");
      expect(res.tree?.plot_id).toBeNull();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          planting_type: "individual",
          plot_id: null,
          org_id: null,
        })
      );
    });

    it("fetches only individual trees and excludes institutional plot trees for a user", async () => {
      const mockUserTrees = [
        { id: "tree-1", tree_name: "Terrace Mango", planting_type: "individual", plot_id: null },
        { id: "tree-2", tree_name: "Garden Peepal", planting_type: "individual", plot_id: null },
      ];

      const orderSpy = vi.fn().mockResolvedValue({ data: mockUserTrees, error: null });
      const isPlotSpy = vi.fn().mockReturnValue({ order: orderSpy });
      const eqTypeSpy = vi.fn().mockReturnValue({ is: isPlotSpy });
      const eqUserSpy = vi.fn().mockReturnValue({ eq: eqTypeSpy });
      const selectSpy = vi.fn().mockReturnValue({ eq: eqUserSpy });

      (supabase.from as any).mockReturnValue({ select: selectSpy });

      const trees = await fetchMyIndividualTrees("user-123");
      expect(trees).toHaveLength(2);
      expect(trees[0].planting_type).toBe("individual");
      expect(trees.every((t) => t.plot_id === null)).toBe(true);
    });

    it("computes individual user metrics strictly without mixing institutional acreage", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [
                      { id: "t1", admin_status: "approved", verification_status: "verified" },
                      { id: "t2", admin_status: "approved", verification_status: "verified" },
                    ],
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "growth_updates") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "u1" }, { id: "u2" }, { id: "u3" }] }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { eco_points: 120, green_points: 120, trees_planted: 2 },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const stats = await fetchIndividualUserStats("user-123");
      expect(stats.totalTreesPlanted).toBe(2);
      expect(stats.verifiedTrees).toBe(2);
      expect(stats.co2OffsetKgPerYear).toBe(44); // 2 * 22 kg
      expect(stats.growthUpdatesCount).toBe(3);
      expect(stats.badgesEarned).toContain("Survival Steward ⭐");
    });
  });

  describe("2. Institutional & Large-Scale Data Domain (B2B / NGO / CSR)", () => {
    it("creates an organization with institutional verification tier", async () => {
      const mockOrg = {
        id: "org-vidarbha-01",
        name: "Green Vidarbha Ecological Trust",
        slug: "green-vidarbha",
        org_type: "ngo",
        verification_status: "verified",
        tier: "enterprise_mrv",
      };

      const singleSpy = vi.fn().mockResolvedValue({ data: mockOrg, error: null });
      const selectSpy = vi.fn().mockReturnValue({ single: singleSpy });
      const insertSpy = vi.fn().mockReturnValue({ select: selectSpy });
      (supabase.from as any).mockReturnValue({ insert: insertSpy });

      const res = await createOrganization({
        name: "Green Vidarbha Ecological Trust",
        slug: "green-vidarbha",
        orgType: "ngo",
        registrationNumber: "MH-2022-0941",
        contactEmail: "contact@greenvidarbha.org",
      });

      expect(res.success).toBe(true);
      expect(res.organization?.tier).toBe("enterprise_mrv");
      expect(res.organization?.org_type).toBe("ngo");
    });

    it("creates an institutional geofenced plot parcel with multi-acre GeoJSON geometry", async () => {
      const mockPlot = {
        id: "plot-sahyadri-01",
        org_id: "org-01",
        name: "Sahyadri Watershed Basin Plot #12",
        district: "Satara",
        area_acres: 8.5,
        target_trees: 12000,
        polygon_geojson: [[17.692, 74.01], [17.695, 74.024]],
        current_mean_ndvi: 0.78,
      };

      const singleSpy = vi.fn().mockResolvedValue({ data: mockPlot, error: null });
      const selectSpy = vi.fn().mockReturnValue({ single: singleSpy });
      const insertSpy = vi.fn().mockReturnValue({ select: selectSpy });
      (supabase.from as any).mockReturnValue({ insert: insertSpy });

      const res = await createInstitutionalPlot({
        orgId: "org-01",
        name: "Sahyadri Watershed Basin Plot #12",
        district: "Satara",
        areaAcres: 8.5,
        targetTrees: 12000,
        polygonGeoJson: [[17.692, 74.01], [17.695, 74.024]],
        centerLat: 17.685,
        centerLng: 74.015,
      });

      expect(res.success).toBe(true);
      expect(res.plot?.area_acres).toBe(8.5);
      expect(res.plot?.polygon_geojson).toHaveLength(2);
    });

    it("onboards bulk manifests with mandatory planting_type = 'institutional' and plot_id link", async () => {
      const mockTrees = [
        { species: "Teak", height_cm: 120, latitude: 17.685, longitude: 74.015 },
        { species: "Bamboo", height_cm: 150, latitude: 17.686, longitude: 74.016 },
      ];

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "trees") return { insert: insertSpy };
        if (table === "plots") return { update: updateSpy };
        return {};
      });

      const res = await onboardBulkManifest("plot-101", "org-01", mockTrees, "surveyor-01");
      expect(res.success).toBe(true);
      expect(res.insertedCount).toBe(2);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            plot_id: "plot-101",
            org_id: "org-01",
            planting_type: "institutional",
          }),
        ])
      );
    });

    it("aggregates institutional MRV metrics across plots and Sentinel-2 satellite data", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return { select: vi.fn().mockResolvedValue({ data: [{ id: "o1" }, { id: "o2" }] }) };
        }
        if (table === "plots") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: "p1", area_acres: 10, target_trees: 5000, planted_trees: 4800, current_mean_ndvi: 0.82, current_biomass_mt: 50 },
                { id: "p2", area_acres: 15, target_trees: 8000, planted_trees: 7600, current_mean_ndvi: 0.78, current_biomass_mt: 80 },
              ],
            }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "t1", is_verified: true, verification_status: "verified" },
                  { id: "t2", is_verified: true, verification_status: "verified" },
                ],
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const metrics = await fetchInstitutionalMRVMetrics();
      expect(metrics.organizationsCount).toBe(2);
      expect(metrics.totalPlotsCount).toBe(2);
      expect(metrics.totalHectaresManaged).toBe(10.1); // (10 + 15) * 0.404686
      expect(metrics.totalTargetTrees).toBe(13000);
      expect(metrics.totalPlantedTrees).toBe(12400);
      expect(metrics.meanVegetationNdvi).toBe(0.8);
      expect(metrics.totalBiomassMetricTons).toBe(130);
      expect(metrics.brsrComplianceScorePct).toBe(94.8);
    });
  });
});
