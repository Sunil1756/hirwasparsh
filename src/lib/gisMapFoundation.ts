/**
 * GIS Map Foundation & Geospatial Core Engine
 * 
 * Provides centralized basemap provider catalogs, Coordinate Reference System (CRS)
 * validation, geodesic spatial math, auto-zoom calculation, and GeoJSON standardization.
 */

import area from "@turf/area";
import length from "@turf/length";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import {
  point as turfPoint,
  polygon as turfPolygon,
  multiPolygon as turfMultiPolygon,
  lineString as turfLineString,
} from "@turf/helpers";

// Coordinate Reference System definitions
export const CRS_DEFINITIONS = {
  WGS84: {
    code: "EPSG:4326",
    name: "World Geodetic System 1984 (WGS 84)",
    units: "degrees",
    datum: "WGS 84",
  },
  WEB_MERCATOR: {
    code: "EPSG:3857",
    name: "WGS 84 / Pseudo-Mercator",
    units: "meters",
    datum: "WGS 84",
  },
} as const;

export type BasemapProviderId =
  | "satellite"
  | "osm"
  | "carto_dark"
  | "carto_light"
  | "topo"
  | "satellite_hybrid";

export interface BasemapProviderConfig {
  id: BasemapProviderId;
  name: string;
  category: "satellite" | "street" | "dark" | "light" | "terrain" | "hybrid";
  url: string;
  attribution: string;
  maxZoom: number;
  minZoom: number;
  subdomains?: string[];
  detectRetina?: boolean;
  tileSize?: number;
  description: string;
  thumbnailColor: string;
  fallbackUrl?: string;
}

/**
 * Standard Production Basemap Tile Providers
 */
export const BASEMAP_PROVIDERS: Record<BasemapProviderId, BasemapProviderConfig> = {
  satellite: {
    id: "satellite",
    name: "Satellite (ESRI World Imagery)",
    category: "satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    fallbackUrl: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 19,
    minZoom: 2,
    description: "High-resolution real satellite imagery for tree canopy and ground condition inspection.",
    thumbnailColor: "#1e3a1e",
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap Standard",
    category: "street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 1,
    description: "Standard road map with administrative boundaries, towns, and highway networks.",
    thumbnailColor: "#3b82f6",
  },
  carto_dark: {
    id: "carto_dark",
    name: "CartoDB Dark Matter",
    category: "dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    detectRetina: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    minZoom: 1,
    description: "High-contrast dark theme optimized for carbon heatmaps, nighttime inspection, and glow markers.",
    thumbnailColor: "#0f172a",
  },
  carto_light: {
    id: "carto_light",
    name: "CartoDB Positron",
    category: "light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    detectRetina: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    minZoom: 1,
    description: "Minimalist light basemap for clean PDF export, executive reporting, and daylight audits.",
    thumbnailColor: "#f8fafc",
  },
  topo: {
    id: "topo",
    name: "Topographic Relief (OpenTopoMap)",
    category: "terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    minZoom: 1,
    description: "Elevation contour lines and shaded relief for watershed, slope, and terrain analysis.",
    thumbnailColor: "#854d0e",
  },
  satellite_hybrid: {
    id: "satellite_hybrid",
    name: "Satellite with Road Labels",
    category: "hybrid",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    fallbackUrl: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution:
      "Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
    maxZoom: 19,
    minZoom: 2,
    description: "High-resolution satellite imagery paired with administrative boundary and road overlays.",
    thumbnailColor: "#14532d",
  },
};

export type LatLngTuple = [number, number]; // [lat, lng]

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface AreaComputationResult {
  sqm: number;
  hectares: number;
  acres: number;
  sqkm: number;
}

/**
 * Validates whether latitude and longitude are within standard geodetic limits.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Normalizes coordinate precision to standard 6 decimal places (~0.11m ground accuracy).
 */
export function normalizeCoordinate(coord: LatLngTuple, precision = 6): LatLngTuple {
  return [
    Number(coord[0].toFixed(precision)),
    Number(coord[1].toFixed(precision)),
  ];
}

/**
 * Converts Decimal Degrees (DD) to Degrees Minutes Seconds (DMS) string representation.
 */
export function coordinateToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Number(((minutesNotTruncated - minutes) * 60).toFixed(2));

  let hemisphere = "";
  if (isLatitude) {
    hemisphere = decimal >= 0 ? "N" : "S";
  } else {
    hemisphere = decimal >= 0 ? "E" : "W";
  }

  return `${degrees}°${minutes}'${seconds}"${hemisphere}`;
}

/**
 * Converts DMS values to Decimal Degrees.
 */
export function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: "N" | "S" | "E" | "W"
): number {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === "S" || direction === "W") {
    dd = dd * -1;
  }
  return Number(dd.toFixed(6));
}

/**
 * Computes the Geodesic Distance in meters between two coordinates using the Haversine formula.
 */
export function calculateHaversineDistance(
  coord1: LatLngTuple,
  coord2: LatLngTuple
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371e3; // Earth's mean radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(2));
}

/**
 * Computes bounding box covering a list of [lat, lng] coordinates.
 */
export function computeBoundingBox(points: LatLngTuple[]): BoundingBox | null {
  const validPoints = points.filter((p) => isValidCoordinate(p[0], p[1]));
  if (validPoints.length === 0) return null;

  let minLat = validPoints[0][0];
  let maxLat = validPoints[0][0];
  let minLng = validPoints[0][1];
  let maxLng = validPoints[0][1];

  for (const [lat, lng] of validPoints) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Computes the geometric centroid (Center of Mass) for an array of coordinates.
 */
export function computeCentroid(points: LatLngTuple[]): LatLngTuple {
  const valid = points.filter((p) => isValidCoordinate(p[0], p[1]));
  if (valid.length === 0) {
    return [19.7515, 75.7139]; // Default Central Maharashtra
  }

  const sumLat = valid.reduce((acc, p) => acc + p[0], 0);
  const sumLng = valid.reduce((acc, p) => acc + p[1], 0);

  return [
    Number((sumLat / valid.length).toFixed(6)),
    Number((sumLng / valid.length).toFixed(6)),
  ];
}

/**
 * Computes geodesic polygon surface area in sqm, hectares, acres, and sqkm using Turf.js.
 */
export function computeGeodesicPolygonArea(points: LatLngTuple[]): AreaComputationResult {
  if (points.length < 3) {
    return { sqm: 0, hectares: 0, acres: 0, sqkm: 0 };
  }

  try {
    // Turf expects [lng, lat] coordinate rings closed with initial vertex
    const ring = [...points, points[0]].map(([lat, lng]) => [lng, lat]);
    const poly = turfPolygon([ring]);
    const sqm = area(poly);

    return {
      sqm: Number(sqm.toFixed(2)),
      hectares: Number((sqm / 10000).toFixed(4)),
      acres: Number((sqm / 4046.8564224).toFixed(4)),
      sqkm: Number((sqm / 1000000).toFixed(6)),
    };
  } catch (err) {
    console.warn("Geodesic polygon area computation error:", err);
    return { sqm: 0, hectares: 0, acres: 0, sqkm: 0 };
  }
}

/**
 * Computes polygon perimeter in meters and kilometers.
 */
export function computePolygonPerimeter(points: LatLngTuple[]): { meters: number; kilometers: number } {
  if (points.length < 2) return { meters: 0, kilometers: 0 };
  try {
    const ring = [...points, points[0]].map(([lat, lng]) => [lng, lat]);
    const line = turfLineString(ring);
    const km = length(line, { units: "kilometers" });
    return {
      meters: Number((km * 1000).toFixed(2)),
      kilometers: Number(km.toFixed(4)),
    };
  } catch {
    return { meters: 0, kilometers: 0 };
  }
}

/**
 * Tests whether a point [lat, lng] lies strictly inside a polygon defined by [lat, lng] vertices.
 */
export function isPointInsidePolygon(point: LatLngTuple, polygonPoints: LatLngTuple[]): boolean {
  if (polygonPoints.length < 3 || !isValidCoordinate(point[0], point[1])) return false;
  try {
    const pt = turfPoint([point[1], point[0]]); // [lng, lat]
    const ring = [...polygonPoints, polygonPoints[0]].map(([lat, lng]) => [lng, lat]);
    const poly = turfPolygon([ring]);
    return booleanPointInPolygon(pt, poly);
  } catch {
    return false;
  }
}

/**
 * Calculates the optimal zoom level to frame a given bounding box in a viewport.
 */
export function calculateOptimalZoomLevel(
  bbox: BoundingBox,
  mapWidthPx = 800,
  mapHeightPx = 600
): number {
  const latFraction = (bbox.maxLat - bbox.minLat) / 180;
  const lngDiff = bbox.maxLng - bbox.minLng;
  const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

  const latZoom = Math.floor(Math.log(mapHeightPx / 256 / Math.max(latFraction, 0.000001)) / Math.LN2);
  const lngZoom = Math.floor(Math.log(mapWidthPx / 256 / Math.max(lngFraction, 0.000001)) / Math.LN2);

  const zoom = Math.min(latZoom, lngZoom);
  return Math.max(1, Math.min(zoom, 19));
}

/**
 * Standardizes and validates GeoJSON FeatureCollection.
 */
export function validateAndSanitizeGeoJson(raw: any): {
  isValid: boolean;
  type: string;
  featureCount: number;
  error?: string;
  sanitized?: any;
} {
  if (!raw || typeof raw !== "object") {
    return { isValid: false, type: "invalid", featureCount: 0, error: "Input is not a valid JSON object" };
  }

  if (raw.type === "FeatureCollection") {
    if (!Array.isArray(raw.features)) {
      return { isValid: false, type: "FeatureCollection", featureCount: 0, error: "FeatureCollection must have features array" };
    }
    return {
      isValid: true,
      type: "FeatureCollection",
      featureCount: raw.features.length,
      sanitized: raw,
    };
  }

  if (raw.type === "Feature") {
    return {
      isValid: !!raw.geometry,
      type: "Feature",
      featureCount: 1,
      sanitized: {
        type: "FeatureCollection",
        features: [raw],
      },
    };
  }

  if (raw.type === "Polygon" || raw.type === "MultiPolygon" || raw.type === "Point") {
    return {
      isValid: Array.isArray(raw.coordinates),
      type: raw.type,
      featureCount: 1,
      sanitized: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: raw,
          },
        ],
      },
    };
  }

  return { isValid: false, type: raw.type || "unknown", featureCount: 0, error: "Unsupported GeoJSON structure" };
}

/**
 * Checks if a coordinate point [lat, lng] lies inside a BoundingBox.
 */
export function isPointInBoundingBox(point: LatLngTuple, bbox: BoundingBox): boolean {
  if (!isValidCoordinate(point[0], point[1])) return false;
  return (
    point[0] >= bbox.minLat &&
    point[0] <= bbox.maxLat &&
    point[1] >= bbox.minLng &&
    point[1] <= bbox.maxLng
  );
}

/**
 * Checks if two bounding boxes intersect.
 */
export function doBoundingBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.maxLat < b.minLat ||
    a.minLat > b.maxLat ||
    a.maxLng < b.minLng ||
    a.minLng > b.maxLng
  );
}

/**
 * Generates an approximated circular polygon ring of coordinates for a GPS accuracy buffer.
 */
export function calculateGpsAccuracyCircle(
  center: LatLngTuple,
  radiusMeters: number,
  steps = 32
): LatLngTuple[] {
  if (!isValidCoordinate(center[0], center[1]) || radiusMeters <= 0) return [];
  const coords: LatLngTuple[] = [];
  const lat = center[0];
  const lng = center[1];

  // Approximate degrees conversion: 1 deg lat = 111,320m; 1 deg lng = 111,320m * cos(lat)
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const pLat = Number((lat + latDelta * Math.sin(angle)).toFixed(6));
    const pLng = Number((lng + lngDelta * Math.cos(angle)).toFixed(6));
    coords.push([pLat, pLng]);
  }
  return coords;
}

export interface SpatialCluster<T> {
  id: string;
  gridKey: string;
  centroid: LatLngTuple;
  count: number;
  items: T[];
  boundingBox: BoundingBox;
}

/**
 * High-performance spatial grid clustering algorithm.
 * Groups arbitrary georeferenced items into discrete spatial grid cells.
 */
export function clusterPointsBySpatialGrid<T>(
  items: T[],
  getCoord: (item: T) => LatLngTuple,
  gridSizeDeg = 0.05
): SpatialCluster<T>[] {
  const gridMap = new Map<string, { items: T[]; sumLat: number; sumLng: number; coords: LatLngTuple[] }>();

  for (const item of items) {
    const coord = getCoord(item);
    if (!isValidCoordinate(coord[0], coord[1])) continue;

    const gridX = Math.floor(coord[1] / gridSizeDeg);
    const gridY = Math.floor(coord[0] / gridSizeDeg);
    const key = `${gridY}:${gridX}`;

    let cell = gridMap.get(key);
    if (!cell) {
      cell = { items: [], sumLat: 0, sumLng: 0, coords: [] };
      gridMap.set(key, cell);
    }
    cell.items.push(item);
    cell.sumLat += coord[0];
    cell.sumLng += coord[1];
    cell.coords.push(coord);
  }

  const clusters: SpatialCluster<T>[] = [];
  let clusterIdx = 1;

  for (const [key, cell] of gridMap.entries()) {
    const count = cell.items.length;
    const centroid: LatLngTuple = [
      Number((cell.sumLat / count).toFixed(6)),
      Number((cell.sumLng / count).toFixed(6)),
    ];
    const boundingBox = computeBoundingBox(cell.coords) || {
      minLat: centroid[0],
      minLng: centroid[1],
      maxLat: centroid[0],
      maxLng: centroid[1],
    };

    clusters.push({
      id: `cluster-${clusterIdx++}`,
      gridKey: key,
      centroid,
      count,
      items: cell.items,
      boundingBox,
    });
  }

  return clusters;
}

/**
 * Resolves basemap tile URL with failover support.
 */
export function getBasemapTileConfig(providerId: BasemapProviderId): BasemapProviderConfig {
  const config = BASEMAP_PROVIDERS[providerId] || BASEMAP_PROVIDERS.osm;
  return config;
}

