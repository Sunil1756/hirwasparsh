import { describe, it, expect } from "vitest";
import {
  calculatePlotSurvivalStats,
  evaluateQoQNdviDrop,
} from "../lib/survivalTrackingService";

describe("Ground Truth Survival Tracking Engine", () => {
  it("strictly excludes unverified trees from the denominator in verified survival rate %", () => {
    const plotId = "plot-123";
    const plotName = "Saga Agroforest";

    const trees = [
      { id: "t1", plot_id: plotId, status: "alive" },
      { id: "t2", plot_id: plotId, status: "alive" },
      { id: "t3", plot_id: plotId, status: "alive" },
      { id: "t4", plot_id: plotId, status: "dead" },
      { id: "t5", plot_id: plotId, status: "unverified" },
      { id: "t6", plot_id: plotId, status: "unverified" },
    ];

    const today = new Date().toISOString();
    const checkIns = [
      { tree_id: "t1", status: "alive", checked_at: today },
      { tree_id: "t2", status: "alive", checked_at: today },
      { tree_id: "t3", status: "alive", checked_at: today },
      { tree_id: "t4", status: "dead", checked_at: today },
      { tree_id: "t5", status: "unverified", checked_at: today },
      { tree_id: "t6", status: "unverified", checked_at: today },
    ];

    const stats = calculatePlotSurvivalStats(plotId, plotName, trees, checkIns);

    expect(stats.total_trees).toBe(6);
    expect(stats.alive_count).toBe(3);
    expect(stats.dead_count).toBe(1);
    expect(stats.unverified_count).toBe(2);

    // Verified survival rate = alive / (alive + dead) = 3 / (3 + 1) = 75.0%
    // Denominator = 4 (excludes the 2 unverified trees)
    expect(stats.verified_survival_rate_pct).toBe(75.0);

    // Effective conservative ESG rate = alive / total = 3 / 6 = 50.0%
    expect(stats.effective_survival_rate_pct).toBe(50.0);
  });

  it("flags trees with no check-in in >60 days as unverified", () => {
    const plotId = "plot-456";
    const plotName = "Western Ghats Corridor";

    const now = new Date();
    const eightyDaysAgo = new Date(now.getTime() - 80 * 86400000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();

    const trees = [
      { id: "t1", plot_id: plotId, status: "alive", created_at: eightyDaysAgo },
      { id: "t2", plot_id: plotId, status: "alive", created_at: eightyDaysAgo },
      { id: "t3", plot_id: plotId, status: "alive", created_at: eightyDaysAgo },
    ];

    const checkIns = [
      { tree_id: "t1", status: "alive", checked_at: tenDaysAgo }, // recent
      { tree_id: "t2", status: "alive", checked_at: eightyDaysAgo }, // overdue (>60d)
      // t3 has no check-in at all
    ];

    const stats = calculatePlotSurvivalStats(plotId, plotName, trees, checkIns);

    expect(stats.total_trees).toBe(3);
    expect(stats.alive_count).toBe(1); // Only t1 is verified alive within 60 days
    expect(stats.dead_count).toBe(0);
    expect(stats.unverified_count).toBe(2); // t2 (overdue) + t3 (never checked)
    expect(stats.verified_survival_rate_pct).toBe(100.0); // 1 / 1
  });

  it("handles empty plots without division by zero errors", () => {
    const stats = calculatePlotSurvivalStats("empty-plot", "Empty Corridor", [], []);
    expect(stats.total_trees).toBe(0);
    expect(stats.alive_count).toBe(0);
    expect(stats.dead_count).toBe(0);
    expect(stats.unverified_count).toBe(0);
    expect(stats.verified_survival_rate_pct).toBe(0.0);
    expect(stats.effective_survival_rate_pct).toBe(0.0);
  });

  it("triggers alert and task recommendation when QoQ NDVI drops > 15%", () => {
    const today = new Date();
    const readings = [
      {
        reading_date: new Date(today.getTime() - 120 * 86400000).toISOString().split("T")[0],
        ndvi: 0.80, // previous quarter avg = 0.80
      },
      {
        reading_date: new Date(today.getTime() - 100 * 86400000).toISOString().split("T")[0],
        ndvi: 0.80,
      },
      {
        reading_date: new Date(today.getTime() - 30 * 86400000).toISOString().split("T")[0],
        ndvi: 0.64, // current quarter avg = 0.62 (22.5% drop)
      },
      {
        reading_date: new Date().toISOString().split("T")[0],
        ndvi: 0.60,
      },
    ];

    const evaluation = evaluateQoQNdviDrop("plot-789", "Konkan Mango Agroforest", readings, 15.0);

    expect(evaluation.previousQuarterAvgNdvi).toBe(0.80);
    expect(evaluation.currentQuarterAvgNdvi).toBe(0.62);
    expect(evaluation.percentageChange).toBe(-22.5);
    expect(evaluation.hasSignificantDrop).toBe(true);
    expect(evaluation.recommendedAction).toBe("dispatch_urgent_verification_task");
  });

  it("does not trigger alert when QoQ NDVI is steady or expanding", () => {
    const today = new Date();
    const readings = [
      {
        reading_date: new Date(today.getTime() - 120 * 86400000).toISOString().split("T")[0],
        ndvi: 0.72,
      },
      {
        reading_date: new Date(today.getTime() - 15 * 86400000).toISOString().split("T")[0],
        ndvi: 0.78,
      },
    ];

    const evaluation = evaluateQoQNdviDrop("plot-101", "Solapur Miyawaki", readings, 15.0);

    expect(evaluation.percentageChange).toBeGreaterThan(0);
    expect(evaluation.hasSignificantDrop).toBe(false);
    expect(evaluation.recommendedAction).toBe("none");
  });
});
