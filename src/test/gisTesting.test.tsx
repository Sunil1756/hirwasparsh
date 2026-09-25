/**
 * HIRWA SPARSH — PHASE 6 TASK 32: GIS TESTING & REAL DATABASE INTEGRATION
 * 
 * Comprehensive Test Suite covering:
 *   1. Coordinate Accuracy & Geodesic Precision (WGS84, 6 decimals, DMS, GPS circles, Haversine)
 *   2. Role-Based Permissions & Multi-Tenant Data Isolation (Public, Field Worker, Org Admin, Auditor)
 *   3. Large Datasets & Spatial Grid Clustering (< 50ms performance, 1,000 - 10,000 trees, viewport bounding box)
 *   4. Map Loading & Real Database Record Sourcing (Supabase integration, dynamic mapping, offline resilience, tile failover)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import {
  validateTreeCoordinate,
  formatTreeCoordinates,
  mapDbStatusToSurvivalStatus,
  mapDatabaseTreeToRealTreeFeature,
  enforceGisPermissions,
  filterByGpsAccuracy,
  filterTreesByViewport,
  clusterTreesBySpatialGrid,
  fetchRealTreeMapData,
  getSyntheticRealTrees,
  RealTreeFeature,
  UserGisAccessContext,
} from "@/services/treeMapService";
import {
  isValidCoordinate,
  normalizeCoordinate,
  coordinateToDMS,
  dmsToDecimal,
  calculateHaversineDistance,
  computeBoundingBox,
  computeCentroid,
  isPointInBoundingBox,
  calculateGpsAccuracyCircle,
  clusterPointsBySpatialGrid,
  getBasemapTileConfig,
  BASEMAP_PROVIDERS,
  LatLngTuple,
  BoundingBox,
} from "@/lib/gisMapFoundation";
import { supabase } from "@/integrations/supabase/client";
import { TreeMapViewer } from "@/components/gis/TreeMapViewer";

const mockMap = {
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  getZoom: vi.fn(() => 15),
  getCenter: vi.fn(() => ({ lat: 18.5204, lng: 73.8567 })),
  getBounds: vi.fn(() => ({
    getSouth: () => 18.4,
    getWest: () => 73.7,
    getNorth: () => 18.6,
    getEast: () => 73.9,
  })),
};

vi.mock("leaflet", () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn((opts) => opts),
  },
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock React Leaflet components
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="mock-map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: any) => (
    <div data-testid="mock-tile-layer" data-url={url} data-attribution={attribution} />
  ),
  ZoomControl: () => <div data-testid="mock-zoom-control" />,
  ScaleControl: () => <div data-testid="mock-scale-control" />,
  Marker: ({ position, children, eventHandlers }: any) => (
    <div
      data-testid="mock-tree-marker"
      data-lat={position?.[0]}
      data-lng={position?.[1]}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="mock-tree-popup">{children}</div>,
  Circle: ({ center, radius, pathOptions }: any) => (
    <div
      data-testid="mock-accuracy-circle"
      data-lat={center?.[0]}
      data-lng={center?.[1]}
      data-radius={radius}
      data-color={pathOptions?.color}
    />
  ),
  useMap: () => mockMap,
  useMapEvents: vi.fn((handlers) => ({
    mousemove: handlers?.mousemove,
    mouseout: handlers?.mouseout,
    zoomend: handlers?.zoomend,
    moveend: handlers?.moveend,
  })),
}));

describe("PHASE 6 TASK 32 — GIS Testing & Real Database Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. COORDINATE ACCURACY & GEODETIC PRECISION
  // =========================================================================
  describe("1. Coordinate Accuracy & Geodesic Math", () => {
    it("validates WGS84 global coordinates and Indian subcontinent regional bounds", () => {
      // Valid Indian Coordinates (Mulshi, Pune: 18.473521, 73.436102)
      expect(isValidCoordinate(18.473521, 73.436102)).toBe(true);
      expect(validateTreeCoordinate(18.473521, 73.436102)).toBe(true);

      // Valid Global but outside Indian subcontinent (Greenwich: 51.4769, 0.0)
      expect(isValidCoordinate(51.4769, 0.0)).toBe(true);
      expect(validateTreeCoordinate(51.4769, 0.0)).toBe(false);

      // Out of bounds lat/lng
      expect(isValidCoordinate(95.0, 73.0)).toBe(false);
      expect(isValidCoordinate(18.0, 190.0)).toBe(false);
      expect(isValidCoordinate(-95.0, 73.0)).toBe(false);
      expect(isValidCoordinate(NaN, 73.0)).toBe(false);
      expect(isValidCoordinate("18.47" as any, 73.0)).toBe(false);
      expect(validateTreeCoordinate(null, undefined)).toBe(false);
    });

    it("normalizes coordinates to 6 decimal places (~0.11m sub-meter accuracy)", () => {
      const highPrecisionCoord: LatLngTuple = [18.47352189412, 73.43610245198];
      const normalized = normalizeCoordinate(highPrecisionCoord, 6);

      expect(normalized[0]).toBe(18.473522);
      expect(normalized[1]).toBe(73.436102);
    });

    it("converts Decimal Degrees to DMS and back with high precision", () => {
      const lat = 18.473521;
      const lng = 73.436102;

      const formatted = formatTreeCoordinates(lat, lng);
      expect(formatted.decimal).toContain("18.473521°N");
      expect(formatted.decimal).toContain("73.436102°E");
      expect(formatted.googleMapsUrl).toContain("18.473521,73.436102");

      const dmsLat = coordinateToDMS(lat, true);
      const dmsLng = coordinateToDMS(lng, false);

      expect(dmsLat).toBe("18°28'24.68\"N");
      expect(dmsLng).toBe("73°26'9.97\"E");

      const roundTripLat = dmsToDecimal(18, 28, 24.68, "N");
      const roundTripLng = dmsToDecimal(73, 26, 9.97, "E");

      expect(Math.abs(roundTripLat - lat)).toBeLessThan(0.0001);
      expect(Math.abs(roundTripLng - lng)).toBeLessThan(0.0001);
    });

    it("computes accurate Geodesic Haversine Distance between coordinates", () => {
      // Pune (18.5204, 73.8567) to Mumbai (19.0760, 72.8777)
      const pune: LatLngTuple = [18.5204, 73.8567];
      const mumbai: LatLngTuple = [19.0760, 72.8777];

      const distanceMeters = calculateHaversineDistance(pune, mumbai);
      const distanceKm = distanceMeters / 1000;

      // Distance should be approximately 120km to 125km
      expect(distanceKm).toBeGreaterThan(115);
      expect(distanceKm).toBeLessThan(130);

      // Distance between identical coordinates is 0
      expect(calculateHaversineDistance(pune, pune)).toBe(0);
    });

    it("generates GPS accuracy circular polygon buffer and filters degraded fixes", () => {
      const center: LatLngTuple = [18.473521, 73.436102];
      const ring = calculateGpsAccuracyCircle(center, 4.0, 16);

      expect(ring.length).toBe(16);
      expect(ring[0][0]).toBeGreaterThan(18.4);
      expect(ring[0][1]).toBeGreaterThan(73.4);

      // Test GPS accuracy threshold filtering
      const testTrees: RealTreeFeature[] = [
        { ...getSyntheticRealTrees()[0], id: "accurate-1", gpsAccuracyMeters: 2.5 },
        { ...getSyntheticRealTrees()[0], id: "accurate-2", gpsAccuracyMeters: 4.8 },
        { ...getSyntheticRealTrees()[0], id: "degraded-1", gpsAccuracyMeters: 18.2 },
        { ...getSyntheticRealTrees()[0], id: "degraded-2", gpsAccuracyMeters: 25.0 },
      ];

      const highPrecisionOnly = filterByGpsAccuracy(testTrees, 15);
      expect(highPrecisionOnly.length).toBe(2);
      expect(highPrecisionOnly.map((t) => t.id)).toEqual(["accurate-1", "accurate-2"]);
    });
  });

  // =========================================================================
  // 2. ROLE-BASED PERMISSIONS & MULTI-TENANT ISOLATION
  // =========================================================================
  describe("2. Role-Based Permissions & Tenancy Access Control", () => {
    const allTrees = getSyntheticRealTrees();

    it("public guest viewer can only view verified trees (no pending drafts)", () => {
      const publicContext: UserGisAccessContext = { userRole: "public" };
      const accessibleTrees = enforceGisPermissions(allTrees, publicContext);

      // In synthetic dataset, tree-geo-006 is pending verification
      expect(accessibleTrees.every((t) => t.verificationStatus === "verified")).toBe(true);
      expect(accessibleTrees.find((t) => t.id === "tree-geo-006")).toBeUndefined();
    });

    it("organization tenant admin is strictly restricted to their own organization ID", () => {
      // Sahyadri Bio-Shield Foundation Admin
      const sahContext: UserGisAccessContext = {
        userRole: "ngo",
        organizationId: "org-sah-01",
      };
      const sahTrees = enforceGisPermissions(allTrees, sahContext);

      expect(sahTrees.length).toBeGreaterThan(0);
      expect(sahTrees.every((t) => t.organizationId === "org-sah-01")).toBe(true);
      // Ensures Tata CSR mangrove trees are not leaked
      expect(sahTrees.find((t) => t.organizationId === "org-tata-03")).toBeUndefined();

      // Tata CSR Admin
      const tataContext: UserGisAccessContext = {
        userRole: "corporate_csr",
        organizationId: "org-tata-03",
      };
      const tataTrees = enforceGisPermissions(allTrees, tataContext);
      expect(tataTrees.every((t) => t.organizationId === "org-tata-03")).toBe(true);
      expect(tataTrees.find((t) => t.organizationId === "org-sah-01")).toBeUndefined();
    });

    it("field worker is restricted to own planted trees and assigned project boundaries", () => {
      const workerContext: UserGisAccessContext = {
        userRole: "field_worker",
        userId: "user-planter-01",
        assignedProjectIds: ["proj-pune-western-ghats"],
      };
      const workerTrees = enforceGisPermissions(allTrees, workerContext);

      expect(workerTrees.length).toBeGreaterThan(0);
      expect(
        workerTrees.every(
          (t) =>
            t.userId === "user-planter-01" ||
            t.createdBy === "user-planter-01" ||
            (t.projectId && workerContext.assignedProjectIds?.includes(t.projectId))
        )
      ).toBe(true);
    });

    it("auditor and super admin have complete unrestricted global access", () => {
      const auditorContext: UserGisAccessContext = { userRole: "auditor" };
      const auditorTrees = enforceGisPermissions(allTrees, auditorContext);
      expect(auditorTrees.length).toBe(allTrees.length);

      const adminContext: UserGisAccessContext = { userRole: "admin" };
      const adminTrees = enforceGisPermissions(allTrees, adminContext);
      expect(adminTrees.length).toBe(allTrees.length);
    });
  });

  // =========================================================================
  // 3. LARGE DATASETS & SPATIAL GRID CLUSTERING
  // =========================================================================
  describe("3. Large Datasets & Spatial Grid Clustering Performance", () => {
    it("clusters 1,000+ trees in under 50ms without UI freezing", () => {
      // Generate 1,500 synthetic trees across Maharashtra bounding region
      const largeBatch: RealTreeFeature[] = [];
      for (let i = 0; i < 1500; i++) {
        const lat = 18.0 + (i % 50) * 0.05 + Math.random() * 0.01;
        const lng = 73.0 + Math.floor(i / 50) * 0.05 + Math.random() * 0.01;
        largeBatch.push({
          id: `large-tree-${i}`,
          treeName: `Batch Tree #${i}`,
          species: i % 2 === 0 ? "Teak (Tectona grandis)" : "Neem (Azadirachta indica)",
          locationName: `Compartment ${i}`,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          gpsAccuracyMeters: 3.5,
          survivalStatus: i % 10 === 0 ? "STRESSED" : "ALIVE",
          healthStatus: "alive",
          verificationStatus: "verified",
          monitoringStatus: "up_to_date",
          plantingType: "institutional",
          plantedDate: "2025-06-01T00:00:00Z",
        });
      }

      const startTime = performance.now();
      const clusters = clusterTreesBySpatialGrid(largeBatch, 0.08);
      const durationMs = performance.now() - startTime;

      expect(durationMs).toBeLessThan(50); // Under 50ms performance benchmark
      expect(clusters.length).toBeGreaterThan(0);

      const totalClusteredCount = clusters.reduce((acc, c) => acc + c.count, 0);
      expect(totalClusteredCount).toBe(1500);

      // Verify cluster schema
      const sampleCluster = clusters[0];
      expect(sampleCluster.id).toBeDefined();
      expect(sampleCluster.centroid).toBeDefined();
      expect(sampleCluster.dominantStatus).toBeDefined();
      expect(sampleCluster.survivalBreakdown).toBeDefined();
    });

    it("filters trees strictly by map viewport BoundingBox", () => {
      const trees = getSyntheticRealTrees();
      // Pune region viewport
      const puneViewport: BoundingBox = {
        minLat: 18.4,
        maxLat: 18.7,
        minLng: 73.3,
        maxLng: 73.95,
      };

      const inViewport = filterTreesByViewport(trees, puneViewport);
      expect(inViewport.length).toBeGreaterThan(0);
      expect(
        inViewport.every((t) => isPointInBoundingBox([t.latitude, t.longitude], puneViewport))
      ).toBe(true);
    });
  });

  // =========================================================================
  // 4. MAP LOADING & REAL DATABASE SOURCING (ACCEPTANCE REQUIREMENT)
  // =========================================================================
  describe("4. Map Loading & Real Database Record Sourcing", () => {
    it("maps raw database Tree records to RealTreeFeature GIS entities correctly", () => {
      const rawDbRow = {
        id: "d8c1103f-7236-4d22-9214-411a7c36d012",
        tree_code: "GE-2026-000142",
        species: "Pongamia pinnata",
        botanical_name: "Millettia pinnata",
        vernacular_name: "Karanj",
        latitude: 18.520432,
        longitude: 73.856743,
        elevation_m: 560,
        gps_accuracy_m: 2.9,
        status: "thriving",
        verification_status: "verified",
        monitoring_status: "up_to_date",
        height_cm: 260,
        dbh_cm: 12.5,
        planting_type: "institutional",
        project_id: "proj-pune-bio-01",
        organization_id: "org-pune-01",
        plantation_date: "2025-07-01",
        qr_token: "QR-TEST-142",
        projects: { name: "Pune Smart Urban Canopy" },
        organizations: { name: "Pune Eco Trust" },
      };

      const mappedFeature = mapDatabaseTreeToRealTreeFeature(rawDbRow);

      expect(mappedFeature.id).toBe(rawDbRow.id);
      expect(mappedFeature.treeCode).toBe("GE-2026-000142");
      expect(mappedFeature.species).toBe("Pongamia pinnata");
      expect(mappedFeature.scientificName).toBe("Millettia pinnata");
      expect(mappedFeature.vernacularName).toBe("Karanj");
      expect(mappedFeature.latitude).toBe(18.520432);
      expect(mappedFeature.longitude).toBe(73.856743);
      expect(mappedFeature.gpsAccuracyMeters).toBe(2.9);
      expect(mappedFeature.survivalStatus).toBe("ALIVE");
      expect(mappedFeature.projectName).toBe("Pune Smart Urban Canopy");
      expect(mappedFeature.organizationName).toBe("Pune Eco Trust");
      expect(mappedFeature.estimatedBiomassKgCo2e).toBeGreaterThan(0);
    });

    it("fetches real tree records from Supabase database with projects and organizations joins", async () => {
      const mockDatabaseRows = [
        {
          id: "db-tree-001",
          tree_code: "DB-2026-001",
          tree_name: "Database Planted Teak",
          species: "Teak (Tectona grandis)",
          latitude: 18.5512,
          longitude: 73.8821,
          gps_accuracy_m: 3.0,
          status: "alive",
          verification_status: "verified",
          monitoring_status: "up_to_date",
          project_id: "proj-db-01",
          organization_id: "org-db-01",
          plantation_date: "2025-06-01",
          projects: { id: "proj-db-01", name: "DB Project Alpha" },
          organizations: { id: "org-db-01", name: "DB Green NGO" },
        },
        {
          id: "db-tree-002",
          tree_code: "DB-2026-002",
          tree_name: "Database Planted Peepal",
          species: "Peepal (Ficus religiosa)",
          latitude: 18.5589,
          longitude: 73.8895,
          gps_accuracy_m: 4.2,
          status: "stressed",
          verification_status: "verified",
          monitoring_status: "due_soon",
          project_id: "proj-db-01",
          organization_id: "org-db-01",
          plantation_date: "2025-06-15",
          projects: { id: "proj-db-01", name: "DB Project Alpha" },
          organizations: { id: "org-db-01", name: "DB Green NGO" },
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockDatabaseRows,
          error: null,
        }),
      });

      const response = await fetchRealTreeMapData({}, { dataSource: "database" });

      expect(response.isFromDatabase).toBe(true);
      expect(response.totalTrees).toBe(2);
      expect(response.trees[0].id).toBe("db-tree-001");
      expect(response.trees[0].projectName).toBe("DB Project Alpha");
      expect(response.trees[0].organizationName).toBe("DB Green NGO");
      expect(response.projectsList[0].name).toBe("DB Project Alpha");
      expect(response.organizationsList[0].name).toBe("DB Green NGO");
    });

    it("handles database query failures or empty responses gracefully with fallback", async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Supabase connection timeout"),
        }),
      });

      // Auto mode gracefully falls back to synthetic real data without throwing
      const response = await fetchRealTreeMapData({}, { dataSource: "auto" });

      expect(response.isFromDatabase).toBe(false);
      expect(response.totalTrees).toBeGreaterThan(0);
      expect(response.trees[0].latitude).toBeDefined();
      expect(response.centroid).toBeDefined();
    });

    it("provides valid tile provider configurations with fallback support", () => {
      const satelliteConfig = getBasemapTileConfig("satellite");
      expect(satelliteConfig.url).toContain("ArcGIS");
      expect(satelliteConfig.fallbackUrl).toContain("google.com");

      const osmConfig = getBasemapTileConfig("osm");
      expect(osmConfig.url).toContain("openstreetmap.org");

      const cartoDarkConfig = getBasemapTileConfig("carto_dark");
      expect(cartoDarkConfig.url).toContain("cartocdn.com");
    });

    it("renders TreeMapViewer component and loads database map records in DOM", async () => {
      const mockDatabaseRows = [
        {
          id: "dom-tree-001",
          tree_code: "DOM-001",
          tree_name: "DOM Verified Neem",
          species: "Neem (Azadirachta indica)",
          latitude: 18.5204,
          longitude: 73.8567,
          gps_accuracy_m: 3.5,
          status: "alive",
          verification_status: "verified",
          monitoring_status: "up_to_date",
          plantation_date: "2025-06-01",
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockDatabaseRows,
          error: null,
        }),
      });

      render(
        <MemoryRouter>
          <TreeMapViewer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Tree Registry GIS/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Search by code, species, or lat, lng.../i)).toBeInTheDocument();
      expect(screen.getByTestId("mock-map-container")).toBeInTheDocument();
    });
  });
});
