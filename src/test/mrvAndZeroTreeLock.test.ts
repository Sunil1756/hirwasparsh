import { describe, it, expect } from "vitest";
import { calculateCarbonLedgerMetrics } from "../lib/carbonLedger";
import { evaluateProjectVerification } from "../lib/projectVerification";
import { validateGeodeticBoundary } from "../lib/projectOnboardingService";

describe("MRV Zero-Tree Anti-Greenwashing Lock Engine", () => {
  it("strictly enforces 0 MT biomass, 0 MT CO2, and ₹0 valuation when verified trees = 0", () => {
    const metrics = calculateCarbonLedgerMetrics({
      projectId: "proj-zero-tree-test",
      projectName: "Nagpur Biodiversity Pilot",
      organizationName: "Eco Trust India",
      targetTrees: 500,
      acres: 2.5,
      speciesList: ["Neem", "Banyan"],
      plantationDate: new Date().toISOString(),
      survivalRatePercent: 0,
    });

    expect(metrics.isZeroTreeLocked).toBe(true);
    expect(metrics.totalLivingTrees).toBe(0);
    expect(metrics.totalBiomassMetricTons).toBe(0);
    expect(metrics.co2SequesteredToDateMT).toBe(0);
    expect(metrics.estimatedCarbonValuationInr).toBe(0);
    expect(metrics.serialNumber).toContain("GE-BASELINE-");
    expect(metrics.verificationMethodology).toContain("Pre-Planting Baseline");
  });

  it("calculates legitimate IPCC Tier-2 biomass and offsets when living trees are verified", () => {
    const metrics = calculateCarbonLedgerMetrics({
      projectId: "proj-verified-tree-test",
      projectName: "Satara Watershed Tract",
      organizationName: "Sahyadri Agro Forestry",
      targetTrees: 200,
      acres: 1.8,
      speciesList: ["Teak", "Jamun"],
      plantationDate: "2024-01-01",
      survivalRatePercent: 90,
    });

    expect(metrics.isZeroTreeLocked).toBe(false);
    expect(metrics.totalLivingTrees).toBe(180);
    expect(metrics.totalBiomassMetricTons).toBeGreaterThan(0);
    expect(metrics.co2SequesteredToDateMT).toBeGreaterThan(0);
    expect(metrics.estimatedCarbonValuationInr).toBeGreaterThan(0);
    expect(metrics.serialNumber).toContain("GE-IND-MH-2026-");
  });
});

describe("Project Verification & Trust Score Engine", () => {
  const testBoundary: [number, number][] = [
    [19.7515, 75.7139],
    [19.7540, 75.7150],
    [19.7535, 75.7180],
    [19.7510, 75.7170],
  ];

  it("caps pre-planting projects with verified botanical photos at honest 55/100 (never 100/100)", () => {
    const report = evaluateProjectVerification({
      projectName: "Solapur Bio-Shield Agroforestry",
      organizationName: "Solapur Farmers FPO",
      organizationType: "ngo",
      locationName: "Solapur, Maharashtra",
      boundary: testBoundary,
      targetTrees: 1000,
      speciesList: ["Neem", "Karanj"],
      evidenceCount: 1,
      isAiVerifiedTreePhoto: true,
      existingProjects: [],
      currentProjectId: "solapur-proj-01",
    });

    expect(report.overallScore).toBeLessThanOrEqual(55);
    expect(report.overallScore).toBeGreaterThanOrEqual(50);
    expect(report.statusLabel).toBe("Pre-Planting Baseline Approved");
  });

  it("assigns 30-40 score and Evidence Required status when tree photo is unverified", () => {
    const report = evaluateProjectVerification({
      projectName: "Solapur Bio-Shield Agroforestry",
      organizationName: "Solapur Farmers FPO",
      organizationType: "ngo",
      locationName: "Solapur, Maharashtra",
      boundary: testBoundary,
      targetTrees: 1000,
      speciesList: ["Neem", "Karanj"],
      evidenceCount: 0,
      isAiVerifiedTreePhoto: false,
      existingProjects: [],
      currentProjectId: "solapur-proj-01",
    });

    expect(report.overallScore).toBeLessThanOrEqual(40);
    expect(report.status).toBe("evidence_required");
  });
});

describe("Geodetic Boundary GIS Validation", () => {
  it("approves valid convex cadastral polygon", () => {
    const boundary: [number, number][] = [
      [18.5204, 73.8567],
      [18.5220, 73.8580],
      [18.5210, 73.8610],
      [18.5190, 73.8590],
    ];
    const result = validateGeodeticBoundary(boundary);
    expect(result.isValid).toBe(true);
  });

  it("rejects boundary with fewer than 3 coordinates", () => {
    const boundary: [number, number][] = [
      [18.5204, 73.8567],
      [18.5220, 73.8580],
    ];
    const result = validateGeodeticBoundary(boundary);
    expect(result.isValid).toBe(false);
  });
});
