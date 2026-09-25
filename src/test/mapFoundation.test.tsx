import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BASEMAP_PROVIDERS,
  CRS_DEFINITIONS,
  isValidCoordinate,
  normalizeCoordinate,
  coordinateToDMS,
  dmsToDecimal,
  calculateHaversineDistance,
  computeBoundingBox,
  computeCentroid,
  computeGeodesicPolygonArea,
  computePolygonPerimeter,
  isPointInsidePolygon,
  calculateOptimalZoomLevel,
  validateAndSanitizeGeoJson,
  LatLngTuple,
} from "@/lib/gisMapFoundation";
import { GisMapContainer } from "@/components/gis/GisMapContainer";

// Mock leaflet and react-leaflet with a stable mock instance
const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  getZoom: vi.fn(() => 13),
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
    divIcon: vi.fn(() => ({})),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="gis-map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: any) => (
    <div data-testid="gis-tile-layer" data-url={url} data-attribution={attribution} />
  ),
  ZoomControl: () => <div data-testid="gis-zoom-control" />,
  ScaleControl: ({ imperial }: any) => (
    <div data-testid="gis-scale-control" data-imperial={imperial} />
  ),
  useMap: () => mockMap,
  useMapEvents: vi.fn((handlers) => ({
    mousemove: handlers?.mousemove,
    mouseout: handlers?.mouseout,
    zoomend: handlers?.zoomend,
    moveend: handlers?.moveend,
  })),
}));

describe("Phase 6 Task 27 — Map Foundation & GIS Infrastructure Test Suite", () => {
  describe("1. Basemap Providers & CRS Standards", () => {
    it("registers all 6 production basemap providers with correct configurations", () => {
      const providerKeys = Object.keys(BASEMAP_PROVIDERS);
      expect(providerKeys).toEqual(
        expect.arrayContaining([
          "satellite",
          "osm",
          "carto_dark",
          "carto_light",
          "topo",
          "satellite_hybrid",
        ])
      );

      // Verify Satellite (ESRI)
      const satellite = BASEMAP_PROVIDERS.satellite;
      expect(satellite.name).toContain("ESRI World Imagery");
      expect(satellite.url).toContain("ArcGIS");
      expect(satellite.maxZoom).toBe(19);

      // Verify CartoDB Dark Matter
      const darkMatter = BASEMAP_PROVIDERS.carto_dark;
      expect(darkMatter.category).toBe("dark");
      expect(darkMatter.detectRetina).toBe(true);

      // Verify OpenStreetMap
      const osm = BASEMAP_PROVIDERS.osm;
      expect(osm.subdomains).toEqual(["a", "b", "c"]);
      expect(osm.attribution).toContain("OpenStreetMap");
    });

    it("defines standard WGS84 and Web Mercator CRS schemas", () => {
      expect(CRS_DEFINITIONS.WGS84.code).toBe("EPSG:4326");
      expect(CRS_DEFINITIONS.WGS84.datum).toBe("WGS 84");
      expect(CRS_DEFINITIONS.WEB_MERCATOR.code).toBe("EPSG:3857");
      expect(CRS_DEFINITIONS.WEB_MERCATOR.units).toBe("meters");
    });
  });

  describe("2. Coordinate Validation & Conversions", () => {
    it("validates legitimate geodetic coordinates and rejects out-of-bound inputs", () => {
      expect(isValidCoordinate(18.5204, 73.8567)).toBe(true); // Pune, India
      expect(isValidCoordinate(0, 0)).toBe(true); // Null Island
      expect(isValidCoordinate(-90, 180)).toBe(true);
      expect(isValidCoordinate(90, -180)).toBe(true);

      // Invalid coordinates
      expect(isValidCoordinate(91, 73.8567)).toBe(false); // Lat > 90
      expect(isValidCoordinate(-91, 73.8567)).toBe(false); // Lat < -90
      expect(isValidCoordinate(18.5204, 181)).toBe(false); // Lng > 180
      expect(isValidCoordinate(18.5204, -181)).toBe(false); // Lng < -180
      expect(isValidCoordinate(NaN, 73.8567)).toBe(false);
      expect(isValidCoordinate(18.5204, null as any)).toBe(false);
      expect(isValidCoordinate("18.52" as any, 73.8567)).toBe(false);
    });

    it("normalizes coordinate precision to 6 decimal places", () => {
      const rawCoord: LatLngTuple = [18.5204321987, 73.8567432198];
      const normalized = normalizeCoordinate(rawCoord);
      expect(normalized).toEqual([18.520432, 73.856743]);
    });

    it("converts Decimal Degrees to Degrees Minutes Seconds (DMS) string format", () => {
      const dmsLat = coordinateToDMS(18.5204, true);
      const dmsLng = coordinateToDMS(73.8567, false);
      expect(dmsLat).toContain("18°31'13.44\"N");
      expect(dmsLng).toContain("73°51'24.12\"E");

      const southDms = coordinateToDMS(-33.8688, true);
      expect(southDms).toContain("S");

      const westDms = coordinateToDMS(-70.6693, false);
      expect(westDms).toContain("W");
    });

    it("converts DMS notation back to Decimal Degrees", () => {
      const dd = dmsToDecimal(18, 31, 13.44, "N");
      expect(dd).toBeCloseTo(18.5204, 3);

      const ddSouth = dmsToDecimal(33, 52, 7.68, "S");
      expect(ddSouth).toBeCloseTo(-33.8688, 3);
    });
  });

  describe("3. Geodesic Spatial Calculations & Math", () => {
    it("computes accurate Haversine distance in meters between two geodetic points", () => {
      // Mumbai (19.0760, 72.8777) to Pune (18.5204, 73.8567) ~120 km
      const mumbai: LatLngTuple = [19.076, 72.8777];
      const pune: LatLngTuple = [18.5204, 73.8567];
      const distMeters = calculateHaversineDistance(mumbai, pune);

      expect(distMeters).toBeGreaterThan(115000);
      expect(distMeters).toBeLessThan(125000);

      // Short distance (~111 meters for 0.001 deg lat change)
      const p1: LatLngTuple = [18.5204, 73.8567];
      const p2: LatLngTuple = [18.5214, 73.8567];
      const shortDist = calculateHaversineDistance(p1, p2);
      expect(shortDist).toBeGreaterThan(110);
      expect(shortDist).toBeLessThan(112);
    });

    it("calculates bounding box and centroid across multiple tree coordinate points", () => {
      const points: LatLngTuple[] = [
        [18.52, 73.85],
        [18.54, 73.87],
        [18.51, 73.89],
        [18.53, 73.83],
      ];

      const bbox = computeBoundingBox(points);
      expect(bbox).toEqual({
        minLat: 18.51,
        minLng: 73.83,
        maxLat: 18.54,
        maxLng: 73.89,
      });

      const centroid = computeCentroid(points);
      expect(centroid[0]).toBeCloseTo(18.525, 3);
      expect(centroid[1]).toBeCloseTo(73.86, 3);

      // Empty points fallback
      expect(computeBoundingBox([])).toBeNull();
      expect(computeCentroid([])).toEqual([19.7515, 75.7139]);
    });

    it("computes polygon surface area in sqm, hectares, and acres using Turf.js", () => {
      // ~1 hectare square polygon (100m x 100m approx in degrees)
      const squarePolygon: LatLngTuple[] = [
        [18.52, 73.85],
        [18.5209, 73.85],
        [18.5209, 73.85095],
        [18.52, 73.85095],
      ];

      const areaResult = computeGeodesicPolygonArea(squarePolygon);
      expect(areaResult.sqm).toBeGreaterThan(9000);
      expect(areaResult.sqm).toBeLessThan(11000);
      expect(areaResult.hectares).toBeGreaterThan(0.9);
      expect(areaResult.hectares).toBeLessThan(1.1);
      expect(areaResult.acres).toBeGreaterThan(2.2);

      // Degenerate polygon (< 3 vertices)
      expect(computeGeodesicPolygonArea([[18.52, 73.85]])).toEqual({
        sqm: 0,
        hectares: 0,
        acres: 0,
        sqkm: 0,
      });
    });

    it("computes polygon perimeter in meters and kilometers", () => {
      const poly: LatLngTuple[] = [
        [18.52, 73.85],
        [18.521, 73.85],
        [18.521, 73.851],
        [18.52, 73.851],
      ];

      const perimeter = computePolygonPerimeter(poly);
      expect(perimeter.meters).toBeGreaterThan(400);
      expect(perimeter.meters).toBeLessThan(450);
      expect(perimeter.kilometers).toBeGreaterThan(0.4);
    });

    it("verifies point-in-polygon containment accurately", () => {
      const polygon: LatLngTuple[] = [
        [18.5, 73.8],
        [18.6, 73.8],
        [18.6, 73.9],
        [18.5, 73.9],
      ];

      const insidePoint: LatLngTuple = [18.55, 73.85];
      const outsidePoint: LatLngTuple = [18.7, 73.95];

      expect(isPointInsidePolygon(insidePoint, polygon)).toBe(true);
      expect(isPointInsidePolygon(outsidePoint, polygon)).toBe(false);
    });

    it("calculates optimal zoom level for bounding boxes", () => {
      const cityBbox = {
        minLat: 18.5,
        minLng: 73.8,
        maxLat: 18.6,
        maxLng: 73.9,
      };
      const zoom = calculateOptimalZoomLevel(cityBbox, 800, 600);
      expect(zoom).toBeGreaterThanOrEqual(10);
      expect(zoom).toBeLessThanOrEqual(14);
    });
  });

  describe("4. GeoJSON Standardization & Validation", () => {
    it("validates standard FeatureCollection objects", () => {
      const validFeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [73.8567, 18.5204],
            },
            properties: { tree_name: "Neem Tree #101" },
          },
        ],
      };

      const result = validateAndSanitizeGeoJson(validFeatureCollection);
      expect(result.isValid).toBe(true);
      expect(result.featureCount).toBe(1);
      expect(result.type).toBe("FeatureCollection");
    });

    it("converts standalone Polygon geometry into standardized FeatureCollection", () => {
      const rawPolygon = {
        type: "Polygon",
        coordinates: [
          [
            [73.85, 18.52],
            [73.85, 18.53],
            [73.86, 18.53],
            [73.86, 18.52],
            [73.85, 18.52],
          ],
        ],
      };

      const result = validateAndSanitizeGeoJson(rawPolygon);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.type).toBe("FeatureCollection");
      expect(result.sanitized.features[0].geometry.type).toBe("Polygon");
    });

    it("gracefully catches corrupted or invalid GeoJSON payloads", () => {
      expect(validateAndSanitizeGeoJson(null).isValid).toBe(false);
      expect(validateAndSanitizeGeoJson({ type: "InvalidType" }).isValid).toBe(false);
    });
  });

  describe("5. GisMapContainer Component Integration", () => {
    it("renders GisMapContainer with default satellite basemap and controls", () => {
      const onBasemapChangeMock = vi.fn();

      const { container } = render(
        <GisMapContainer
          center={[18.5204, 73.8567]}
          zoom={13}
          initialBasemap="satellite"
          onBasemapChange={onBasemapChangeMock}
          height={500}
        >
          <div data-testid="custom-marker">Tree Marker</div>
        </GisMapContainer>
      );

      expect(container).toBeDefined();
      expect(screen.getByTestId("gis-map-container")).toBeDefined();
      expect(screen.getByTestId("gis-tile-layer")).toBeDefined();
      expect(screen.getByTestId("gis-zoom-control")).toBeDefined();
      expect(screen.getByTestId("gis-scale-control")).toBeDefined();
      expect(screen.getByTestId("custom-marker")).toBeDefined();

      // Check layer switcher button
      const layerSwitcherButton = screen.getByRole("button", { name: /satellite/i });
      expect(layerSwitcherButton).toBeDefined();

      // Open layer menu
      fireEvent.click(layerSwitcherButton);
      expect(screen.getByText(/Basemap Provider/i)).toBeDefined();

      // Select CartoDB Dark Matter
      const darkOption = screen.getByText(/CartoDB Dark Matter/i);
      fireEvent.click(darkOption);
      expect(onBasemapChangeMock).toHaveBeenCalledWith("carto_dark");
    });
  });
});
