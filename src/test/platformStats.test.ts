import { describe, it, expect, vi } from "vitest";
import { fetchLivePlatformMetrics } from "../lib/platformStats";
import { supabase } from "../integrations/supabase/client";

describe("Live Platform Metrics & Tree Survival Statistics", () => {
  it("fetches and computes surviving trees accurately from database records", async () => {
    const metrics = await fetchLivePlatformMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.survivingTrees).toBe("number");
    expect(typeof metrics.survivalRatePct).toBe("number");
    expect(typeof metrics.totalTreesPlanted).toBe("number");
    expect(metrics.survivingTrees).toBeGreaterThanOrEqual(0);
    expect(metrics.survivalRatePct).toBeGreaterThanOrEqual(0);
    expect(metrics.survivalRatePct).toBeLessThanOrEqual(100);
  }, 15000);
});
