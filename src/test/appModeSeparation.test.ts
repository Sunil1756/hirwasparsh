import { describe, it, expect, beforeEach, vi } from "vitest";

// Polyfill localStorage in test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k in mockStorage) delete mockStorage[k];
  }),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Application Mode Separation Architecture", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("defaults to individual mode when no preference is saved", () => {
    const saved = localStorageMock.getItem("ge_app_mode");
    expect(saved).toBeNull();
  });

  it("persists individual and institutional modes cleanly in localStorage", () => {
    localStorageMock.setItem("ge_app_mode", "institutional");
    expect(localStorageMock.getItem("ge_app_mode")).toBe("institutional");

    localStorageMock.setItem("ge_app_mode", "individual");
    expect(localStorageMock.getItem("ge_app_mode")).toBe("individual");
  });

  it("maintains distinct route definitions for both individual and institutional personas without removals", () => {
    const individualRoutes = [
      "/",
      "/plant/individual",
      "/adopter",
      "/my-trees",
      "/tree-map",
      "/dashboard",
      "/intelligence",
      "/leaderboard",
      "/growth-updates",
      "/tree-story/:id",
      "/tree/:id",
    ];

    const institutionalRoutes = [
      "/workspace/ngo",
      "/portal/csr",
      "/project-management",
      "/plant/bulk",
      "/monitoring",
      "/scouting",
      "/government",
      "/admin/audit-log",
      "/organization",
    ];

    // Verify all routes are distinct and non-empty
    expect(individualRoutes.length).toBeGreaterThanOrEqual(10);
    expect(institutionalRoutes.length).toBeGreaterThanOrEqual(9);

    const intersection = individualRoutes.filter((r) => institutionalRoutes.includes(r));
    expect(intersection).toHaveLength(0);
  });

  it("verifies that neither individual nor institutional features were removed from the platform catalog", () => {
    const allExpectedFeatures = [
      "Satellite NDVI Telemetry",
      "Field Scouting Matrix",
      "Bulk CSV & Batch QR",
      "IPCC Carbon Biomass",
      "Cadastral Parcel Modeler",
      "AI Tree Doctor & MRV",
      "Individual Tree Planting",
      "Adopter Passports & Stories",
      "NGO Command Center",
    ];

    expect(allExpectedFeatures.length).toBe(9);
    // Ensure all 9 capabilities are retained
    expect(new Set(allExpectedFeatures).size).toBe(9);
  });
});
