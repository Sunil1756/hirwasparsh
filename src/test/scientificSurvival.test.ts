import { describe, it, expect } from "vitest";
import {
  calculateScientificSurvivalMetrics,
  summarizeCohortSurvivalFromRecords,
} from "../lib/scientificSurvivalCalculation";
import {
  generateCanonicalTreeCode,
  validateTreeGpsCoordinates,
  generateTreeQrData,
  lookupNativeSpecies,
  NATIVE_SPECIES_REGISTRY,
} from "../lib/treeIdentityService";

describe("Phase 2: Scientific Survival Calculation Engine", () => {
  it("computes Document 1 benchmark case accurately: 754 alive, 46 dead, 200 uninspected out of 1,000 planted", () => {
    const result = calculateScientificSurvivalMetrics({
      totalPlanted: 1000,
      confirmedAlive: 754,
      confirmedDead: 46,
      notInspected: 200,
    });

    // Assessed trees = 754 + 46 = 800
    expect(result.totalAssessed).toBe(800);
    // Assessed survival = 754 / 800 * 100 = 94.25%
    expect(result.observedSurvivalRateAssessedPct).toBe(94.25);
    // Planted cohort confirmed alive share = 754 / 1000 * 100 = 75.40%
    expect(result.confirmedAlivePlantedCohortPct).toBe(75.4);
    // Coverage = 800 / 1000 * 100 = 80.00%
    expect(result.inspectionCoveragePct).toBe(80.0);
    expect(result.livingTreesCensus).toBe(754);
    expect(result.uninspectedTreesCount).toBe(200);
    expect(result.assessmentStatus).toBe("STATISTICALLY_ROBUST");
    expect(result.sampleSizeWarning).toBe(false);
  });

  it("handles 0 inspected trees truthfully without hallucinating 100% or 97%", () => {
    const result = calculateScientificSurvivalMetrics({
      totalPlanted: 500,
      confirmedAlive: 0,
      confirmedDead: 0,
      notInspected: 500,
    });

    expect(result.totalAssessed).toBe(0);
    expect(result.observedSurvivalRateAssessedPct).toBeNull();
    expect(result.confirmedAlivePlantedCohortPct).toBe(0);
    expect(result.livingTreesCensus).toBe(0);
    expect(result.assessmentStatus).toBe("PENDING_INSPECTION");
    expect(result.sampleSizeWarning).toBe(true);
    expect(result.provenanceSummary).toContain("Pending Ground Census");
  });

  it("flags under-sampled cohorts (< 10% coverage) with a warning badge", () => {
    const result = calculateScientificSurvivalMetrics({
      totalPlanted: 1000,
      confirmedAlive: 8,
      confirmedDead: 1,
      notInspected: 991,
    });

    expect(result.totalAssessed).toBe(9);
    // 8 / 9 * 100 = 88.89%
    expect(result.observedSurvivalRateAssessedPct).toBe(88.89);
    expect(result.inspectionCoveragePct).toBe(0.9);
    expect(result.assessmentStatus).toBe("UNDER_SAMPLED");
    expect(result.sampleSizeWarning).toBe(true);
    expect(result.provenanceSummary).toContain("Preliminary");
  });

  it("handles 0 total planted trees gracefully without throwing divide-by-zero", () => {
    const result = calculateScientificSurvivalMetrics({
      totalPlanted: 0,
      confirmedAlive: 0,
      confirmedDead: 0,
      notInspected: 0,
    });

    expect(result.totalAssessed).toBe(0);
    expect(result.observedSurvivalRateAssessedPct).toBeNull();
    expect(result.confirmedAlivePlantedCohortPct).toBe(0);
    expect(result.livingTreesCensus).toBe(0);
    expect(result.assessmentStatus).toBe("PENDING_INSPECTION");
  });

  it("summarizes raw tree inspection records into scientific cohort metrics", () => {
    const records = [
      { id: "T1", survivalStatus: "ALIVE" as const },
      { id: "T2", survivalStatus: "ALIVE" as const },
      { id: "T3", survivalStatus: "STRESSED" as const }, // Stressed is alive
      { id: "T4", survivalStatus: "DEAD" as const },
      { id: "T5", survivalStatus: "UNINSPECTED" as const },
    ];

    const result = summarizeCohortSurvivalFromRecords(records, 10);
    // Alive: T1, T2, T3 = 3
    expect(result.confirmedAlive).toBe(3);
    // Dead: T4 = 1
    expect(result.confirmedDead).toBe(1);
    // Assessed: 3 + 1 = 4
    expect(result.totalAssessed).toBe(4);
    // Assessed rate: 3 / 4 * 100 = 75.00%
    expect(result.observedSurvivalRateAssessedPct).toBe(75.0);
    // Confirmed alive share: 3 / 10 * 100 = 30.00%
    expect(result.confirmedAlivePlantedCohortPct).toBe(30.0);
  });
});

describe("Phase 2: Tree Identity, Botanical Registry & GPS Thresholds", () => {
  it("generates deterministic canonical tree codes GE-{ORG}-{PROJ}-{SERIAL}", () => {
    const code1 = generateCanonicalTreeCode({
      orgCode: "MAH",
      projectCode: "P01",
      sequenceNumber: 42,
    });
    expect(code1).toBe("GE-MAH-P01-00042");

    const code2 = generateCanonicalTreeCode({
      orgCode: "TATA",
      projectCode: "PNE",
      sequenceNumber: 10001,
    });
    expect(code2).toBe("GE-TATA-PNE-10001");

    const fallbackCode = generateCanonicalTreeCode({
      sequenceNumber: 1,
    });
    expect(fallbackCode).toBe("GE-ORG-P01-00001");
  });

  it("enforces strict GPS accuracy threshold (rejects > 50 meters)", () => {
    // High accuracy (5m) -> Valid
    const valid = validateTreeGpsCoordinates({
      latitude: 18.5204,
      longitude: 73.8567,
      accuracyMeters: 5,
    });
    expect(valid.isValid).toBe(true);
    expect(valid.warning).toBeUndefined();

    // Medium accuracy (35m) -> Valid with warning
    const withWarning = validateTreeGpsCoordinates({
      latitude: 18.5204,
      longitude: 73.8567,
      accuracyMeters: 35,
    });
    expect(withWarning.isValid).toBe(true);
    expect(withWarning.warning).toBeDefined();

    // Poor accuracy (65m) -> Strictly rejected
    const poor = validateTreeGpsCoordinates({
      latitude: 18.5204,
      longitude: 73.8567,
      accuracyMeters: 65,
    });
    expect(poor.isValid).toBe(false);
    expect(poor.error).toContain("within 50 meters");
  });

  it("rejects degenerate Null Island coordinates (0.0, 0.0)", () => {
    const nullIsland = validateTreeGpsCoordinates({
      latitude: 0.0,
      longitude: 0.0,
      accuracyMeters: 5,
    });
    expect(nullIsland.isValid).toBe(false);
    expect(nullIsland.error).toContain("Null Island");
  });

  it("rejects out-of-range latitude/longitude coordinates", () => {
    const invalidLat = validateTreeGpsCoordinates({
      latitude: 95.5,
      longitude: 73.8567,
    });
    expect(invalidLat.isValid).toBe(false);

    const invalidLng = validateTreeGpsCoordinates({
      latitude: 18.5204,
      longitude: -190.0,
    });
    expect(invalidLng.isValid).toBe(false);
  });

  it("generates verified QR code URL and tamper-evident payload", () => {
    const qr = generateTreeQrData({
      treeId: "tree-uuid-12345",
      treeCode: "GE-MAH-P01-00042",
      species: "Neem",
      baseUrl: "https://green-enlightenment.com",
    });

    expect(qr.qrUrl).toBe("https://green-enlightenment.com/tree/tree-uuid-12345");
    expect(qr.treeCode).toBe("GE-MAH-P01-00042");

    const parsed = JSON.parse(qr.qrPayloadJson);
    expect(parsed.protocol).toBe("GREEN_ENLIGHTENMENT_TREE_V1");
    expect(parsed.id).toBe("tree-uuid-12345");
    expect(parsed.code).toBe("GE-MAH-P01-00042");
    expect(parsed.species).toBe("Neem");
  });

  it("looks up native Maharashtra species by English, Marathi, and scientific names", () => {
    expect(NATIVE_SPECIES_REGISTRY.length).toBeGreaterThanOrEqual(11);

    const neem = lookupNativeSpecies("Neem");
    expect(neem).not.toBeNull();
    expect(neem?.scientificName).toBe("Azadirachta indica");

    const vad = lookupNativeSpecies("कडुलिंब");
    expect(vad?.id).toBe("neem");

    const banyan = lookupNativeSpecies("Ficus benghalensis");
    expect(banyan?.id).toBe("banyan");

    const unknown = lookupNativeSpecies("Invasive Alien Weed");
    expect(unknown).toBeNull();
  });
});
