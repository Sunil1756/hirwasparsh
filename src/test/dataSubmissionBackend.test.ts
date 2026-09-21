import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseKmlString, parseGeoJsonString } from "@/lib/kmlParser";
import {
  enqueueOfflineTree,
  getOfflineTreeQueue,
  removeOfflineTree,
  clearOfflineQueue,
  syncOfflineTreesWithSupabase,
} from "@/lib/offlineSyncService";
import {
  SPECIES_ALLOMETRIC_MAP,
  calculateCarbonLedgerMetrics,
} from "@/lib/carbonLedger";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: mockInsert.mockResolvedValue({ error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe("Data Submission, Geodetic Ingestion & Offline Sync Backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOfflineQueue();
  });

  describe("1. KML & GeoJSON Geodetic Parser", () => {
    it("parses valid KML XML polygon and computes area, perimeter and center coordinates", () => {
      const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <name>Satara Agroforestry Plot 1</name>
            <Polygon>
              <outerBoundaryIs>
                <LinearRing>
                  <coordinates>
                    73.9850,17.6800,0 73.9900,17.6800,0 73.9900,17.6850,0 73.9850,17.6850,0 73.9850,17.6800,0
                  </coordinates>
                </LinearRing>
              </outerBoundaryIs>
            </Polygon>
          </Placemark>
        </Document>
      </kml>`;

      const result = parseKmlString(sampleKml, "satara_plot.kml");

      expect(result.fileName).toBe("satara_plot.kml");
      expect(result.polygonCoords.length).toBeGreaterThanOrEqual(4);
      expect(result.areaSqMeters).toBeGreaterThan(0);
      expect(result.acres).toBeGreaterThan(0);
      expect(result.hectares).toBeGreaterThan(0);
      expect(result.perimeterKm).toBeGreaterThan(0);
      expect(result.centerCoords[0]).toBeCloseTo(17.6825, 2);
      expect(result.centerCoords[1]).toBeCloseTo(73.9875, 2);
    });

    it("throws a descriptive error if KML lacks coordinates or points", () => {
      const invalidKml = `<kml><Document><Placemark><name>Empty</name></Placemark></Document></kml>`;
      expect(() => parseKmlString(invalidKml, "invalid.kml")).toThrowError(/No <coordinates> tag found/);

      const insufficientKml = `<kml><coordinates>73.98,17.68,0 73.99,17.69,0</coordinates></kml>`;
      expect(() => parseKmlString(insufficientKml, "too_few.kml")).toThrowError(/at least 3 coordinate points/);
    });

    it("parses standard GeoJSON Polygon format accurately", () => {
      const sampleGeoJson = JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [73.985, 17.68],
                  [73.99, 17.68],
                  [73.99, 17.685],
                  [73.985, 17.685],
                  [73.985, 17.68],
                ],
              ],
            },
          },
        ],
      });

      const result = parseGeoJsonString(sampleGeoJson, "satara.geojson");
      expect(result.areaSqMeters).toBeGreaterThan(0);
      expect(result.polygonCoords[0]).toEqual([17.68, 73.985]);
    });
  });

  describe("2. Offline Sync Queue & Resilient Data Submission", () => {
    it("enqueues trees into the offline queue with auto-generated UUIDs and timestamps", () => {
      const item = enqueueOfflineTree({
        tree_name: "Neem Sapling 001",
        species: "Azadirachta indica",
        location: "Koregaon, Satara",
        latitude: 17.685,
        longitude: 73.985,
        height_cm: 65,
        plantation_date: "2026-06-15",
        notes: "Planted in deep pit with vermicompost",
      });

      expect(item.localId).toContain("offline-");
      expect(item.created_at).toBeDefined();

      const queue = getOfflineTreeQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].tree_name).toBe("Neem Sapling 001");
    });

    it("removes individual items and clears the queue", () => {
      const item1 = enqueueOfflineTree({
        tree_name: "Tree 1",
        species: "Neem",
        location: "Plot A",
        latitude: 17.68,
        longitude: 73.98,
        height_cm: 50,
        plantation_date: "2026-07-01",
      });
      const item2 = enqueueOfflineTree({
        tree_name: "Tree 2",
        species: "Teak",
        location: "Plot B",
        latitude: 17.69,
        longitude: 73.99,
        height_cm: 60,
        plantation_date: "2026-07-01",
      });

      expect(getOfflineTreeQueue().length).toBe(2);

      removeOfflineTree(item1.localId);
      expect(getOfflineTreeQueue().length).toBe(1);
      expect(getOfflineTreeQueue()[0].localId).toBe(item2.localId);

      clearOfflineQueue();
      expect(getOfflineTreeQueue().length).toBe(0);
    });

    it("synchronizes queued items to Supabase trees table with verified status", async () => {
      enqueueOfflineTree({
        tree_name: "Mahua Sapling",
        species: "Madhuca longifolia",
        location: "Vidarbha Sector 3",
        latitude: 20.89,
        longitude: 78.45,
        height_cm: 80,
        plantation_date: "2026-08-01",
      });

      const { syncedCount, failedCount } = await syncOfflineTreesWithSupabase("user-field-123");

      expect(syncedCount).toBe(1);
      expect(failedCount).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith("trees");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-field-123",
          tree_name: "Mahua Sapling",
          species: "Madhuca longifolia",
          verification_status: "verified",
          admin_status: "approved",
          ai_confidence: 94,
        })
      );
      expect(getOfflineTreeQueue().length).toBe(0);
    });
  });

  describe("3. Carbon Ledger & IPCC Tier-2 Allometric Accounting Engine", () => {
    it("contains verified allometric parameters for indigenous species", () => {
      expect(SPECIES_ALLOMETRIC_MAP.neem.woodDensityRho).toBe(0.72);
      expect(SPECIES_ALLOMETRIC_MAP.teak.woodDensityRho).toBe(0.65);
      expect(SPECIES_ALLOMETRIC_MAP.bamboo.woodDensityRho).toBe(0.70);
      expect(SPECIES_ALLOMETRIC_MAP.jamun.woodDensityRho).toBe(0.77);
      expect(SPECIES_ALLOMETRIC_MAP.mahua.woodDensityRho).toBe(0.82);
    });

    it("calculates Pantropical biomass, carbon offsets and deterministic certificate hash", () => {
      const result = calculateCarbonLedgerMetrics({
        projectId: "proj-satara-99",
        projectName: "Sahyadri Bio-Shield",
        organizationName: "Sahyadri Eco Foundation",
        targetTrees: 5000,
        acres: 12.5,
        speciesList: ["Neem", "Teak", "Jamun"],
        plantationDate: "2025-01-15",
        survivalRatePercent: 92,
      });

      expect(result.totalLivingTrees).toBe(4600); // 5000 * 92%
      expect(result.acres).toBe(12.5);
      expect(result.meanWoodDensityRho).toBeGreaterThan(0.6);
      expect(result.aboveGroundBiomassKgPerTree).toBeGreaterThan(0);
      expect(result.totalBiomassMetricTons).toBeGreaterThan(0);
      expect(result.co2SequesteredToDateMT).toBeGreaterThan(0);
      expect(result.projected10YearCo2MT).toBe(1100); // 5000 * 0.022 * 10
      expect(result.projected20YearCo2MT).toBe(2200); // 5000 * 0.022 * 20
      expect(result.estimatedCarbonValuationInr).toBe(1100 * 1200);
      expect(result.serialNumber).toContain("GE-IND-MH-2026-SAHY-");
      expect(result.cryptographicHash).toContain("sha256:0x");
      expect(result.qrVerificationUrl).toContain("/verify/cert/");
    });
  });
});
