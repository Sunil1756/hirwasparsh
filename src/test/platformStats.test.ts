import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLivePlatformMetrics } from "../lib/platformStats";
import { supabase } from "../integrations/supabase/client";

describe("Live Platform Metrics & Tree Survival Statistics", () => {
  it("computes surviving trees and metrics with mock data", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string): any => {
      if (table === "trees") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: "tree-1", admin_status: "approved", verification_status: "verified", health_status: "healthy", status: "alive" },
              { id: "tree-2", admin_status: "approved", verification_status: "verified", health_status: "dead", status: "dead" },
              { id: "tree-3", admin_status: "approved", verification_status: "verified", health_status: "healthy", status: "alive" },
            ],
          }),
        };
      }
      if (table === "projects") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: "proj-1", target_trees: 1000, planted_trees: 950, status: "active" },
            ],
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ count: 42 }),
      };
    });

    const metrics = await fetchLivePlatformMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalTreesPlanted).toBeGreaterThan(0);
    expect(metrics.survivingTrees).toBeGreaterThan(0);
    expect(metrics.survivalRatePct).toBeGreaterThanOrEqual(0);
    expect(metrics.survivalRatePct).toBeLessThanOrEqual(100);
    expect(metrics.co2OffsetKgPerYear).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it("handles live or empty database gracefully without crashing", async () => {
    vi.spyOn(supabase, "from").mockImplementation((): any => ({
      select: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    }));

    const metrics = await fetchLivePlatformMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.survivingTrees).toBe("number");
    expect(typeof metrics.survivalRatePct).toBe("number");
    expect(metrics.totalTreesPlanted).toBe(0);

    vi.restoreAllMocks();
  });
});
