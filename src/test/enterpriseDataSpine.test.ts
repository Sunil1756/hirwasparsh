import { describe, it, expect } from "vitest";
import {
  calculateHammingDistance,
  calculateHashSimilarity,
  evaluatePhotoDuplicateFraud,
} from "../lib/perceptualHash";
import {
  computeSpectralIndicesFromBands,
  calculatePlotMetrics,
  generateSeedTrees,
} from "../lib/remoteSensing";

describe("Enterprise Data Spine & Anti-Fraud Algorithms", () => {
  describe("Perceptual Hashing & Hamming Distance", () => {
    it("computes exact match (distance = 0, similarity = 100%) for identical hashes", () => {
      const hash1 = "a1b2c3d4e5f67890";
      const hash2 = "a1b2c3d4e5f67890";

      const distance = calculateHammingDistance(hash1, hash2);
      const similarity = calculateHashSimilarity(hash1, hash2);

      expect(distance).toBe(0);
      expect(similarity).toBe(100);
    });

    it("detects minor variation duplicate with distance <= 3 and similarity >= 95%", () => {
      // 1 bit difference in hex (0 vs 1)
      const hash1 = "a1b2c3d4e5f67890";
      const hash2 = "a1b2c3d4e5f67891";

      const distance = calculateHammingDistance(hash1, hash2);
      const similarity = calculateHashSimilarity(hash1, hash2);

      expect(distance).toBe(1);
      expect(similarity).toBeGreaterThanOrEqual(98);
    });

    it("correctly identifies completely distinct images with distance > 20", () => {
      const hash1 = "ffffffffffffffff";
      const hash2 = "0000000000000000";

      const distance = calculateHammingDistance(hash1, hash2);
      const similarity = calculateHashSimilarity(hash1, hash2);

      expect(distance).toBe(64);
      expect(similarity).toBe(0);
    });

    it("evaluates duplicate fraud risk level accurately", () => {
      const existing = [
        { id: "tree-101", phash: "f0a1e2b3c4d5e6f7", tree_name: "Neem #101" },
        { id: "tree-102", phash: "0123456789abcdef", tree_name: "Banyan #102" },
      ];

      // Critical fraud case (exact or 1 bit diff)
      const dupCandidate = "f0a1e2b3c4d5e6f7";
      const result = evaluatePhotoDuplicateFraud(dupCandidate, existing);

      expect(result.isDuplicate).toBe(true);
      expect(result.riskLevel).toBe("critical_fraud");
      expect(result.matchedId).toBe("tree-101");

      // Unique non-duplicate case
      const uniqueCandidate = "ffff0000aaaa5555";
      const uniqueResult = evaluatePhotoDuplicateFraud(uniqueCandidate, existing);

      expect(uniqueResult.isDuplicate).toBe(false);
      expect(uniqueResult.riskLevel).toBe("none");
    });
  });

  describe("Real Sentinel-2 Multi-Spectral Indices Computation", () => {
    it("computes mathematically correct NDVI = (NIR - Red) / (NIR + Red)", () => {
      // High chlorophyll canopy: B08 (NIR) = 0.50, B04 (Red) = 0.05
      // NDVI = (0.50 - 0.05) / (0.50 + 0.05) = 0.45 / 0.55 = 0.818 -> 0.82
      const result = computeSpectralIndicesFromBands({
        b02Blue: 0.04,
        b03Green: 0.09,
        b04Red: 0.05,
        b05RedEdge: 0.20,
        b08Nir: 0.50,
        b11Swir: 0.12,
        areaHectares: 2.0,
      });

      expect(result.ndvi).toBe(0.82);
      expect(result.ndre).toBeGreaterThan(0.40);
      expect(result.ndwi).toBeLessThan(0); // Foliar moisture non-water
      expect(result.classification).toContain("Dense Healthy Canopy");
      expect(result.biomassCarbonMTPerHa).toBeGreaterThan(50);
      expect(result.totalCarbonStockCo2eMT).toBeGreaterThan(0);
    });

    it("correctly identifies barren/stressed land when Red reflectance is high and NIR is low", () => {
      // Barren soil: B08 = 0.15, B04 = 0.20 -> NDVI = (0.15 - 0.20)/(0.35) = -0.14
      const result = computeSpectralIndicesFromBands({
        b02Blue: 0.10,
        b03Green: 0.12,
        b04Red: 0.20,
        b05RedEdge: 0.16,
        b08Nir: 0.15,
        b11Swir: 0.25,
      });

      expect(result.ndvi).toBeLessThan(0.1);
      expect(result.classification).toContain("Barren");
    });
  });

  describe("Pilot Seed Data & Allometric Yield Equations", () => {
    it("generates verified GPS tree records mapped to real plots", () => {
      const plotMap = {
        "Nagpur Urban Miyawaki Forest #1": "plot-nagpur-1",
        "Satara Sahyadri Watershed Basin Plot #12": "plot-satara-1",
        "Western Ghats Biodiversity Corridor": "plot-ghats-1",
        "Solapur Bio-Shield Dryland Belt": "plot-solapur-1",
        "Konkan Coastal Mangrove & Teak Zone": "plot-konkan-1",
      };

      const trees = generateSeedTrees(plotMap);

      expect(trees.length).toBeGreaterThanOrEqual(50);
      expect(trees[0].latitude).toBeGreaterThan(15);
      expect(trees[0].longitude).toBeGreaterThan(70);
      expect(trees[0].phash).toBeDefined();
      expect(trees[0].species).toBeDefined();
      expect(trees[0].is_verified).toBe(true);
    });

    it("calculates plot metrics and carbon credits based on acreage", () => {
      const metrics = calculatePlotMetrics({
        areaSquareMeters: 40468.6, // 10 acres
        treeCount: 5000,
        averageAgeMonths: 24,
      });

      expect(metrics.acres).toBe(10);
      expect(metrics.hectares).toBe(4.05);
      expect(metrics.annualCo2MetricTons).toBeGreaterThan(0);
      expect(metrics.carbonCreditValuationInr).toBe(metrics.annualCo2MetricTons * 1200);
    });
  });
});
