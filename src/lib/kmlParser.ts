import * as turf from "@turf/helpers";
import turfArea from "@turf/area";

export interface ParcelBoundaryResult {
  fileName: string;
  polygonCoords: [number, number][]; // [lat, lng] array
  areaSqMeters: number;
  acres: number;
  hectares: number;
  perimeterKm: number;
  centerCoords: [number, number]; // [lat, lng]
}

/**
 * Calculates geodesic perimeter of a coordinate ring in kilometers.
 */
function calculatePerimeter(coords: [number, number][]): number {
  let totalMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lon1 = (coords[i][1] * Math.PI) / 180;
    const lat2 = (coords[i + 1][0] * Math.PI) / 180;
    const lon2 = (coords[i + 1][1] * Math.PI) / 180;

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const a =
      Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = 6371000 * c; // Earth radius in meters
    totalMeters += d;
  }
  return Number((totalMeters / 1000).toFixed(2));
}

/**
 * Parses raw XML KML content to extract Polygon coordinate rings.
 */
export function parseKmlString(kmlText: string, fileName: string): ParcelBoundaryResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, "text/xml");

  const coordNodes = xmlDoc.getElementsByTagName("coordinates");
  if (!coordNodes || coordNodes.length === 0) {
    throw new Error("No <coordinates> tag found in KML file.");
  }

  const rawCoords = coordNodes[0].textContent?.trim() || "";
  const points = rawCoords.split(/\s+/).filter(Boolean);

  const turfCoords: number[][] = []; // [lng, lat] for Turf.js
  const leafletCoords: [number, number][] = []; // [lat, lng] for Leaflet

  for (const point of points) {
    const parts = point.split(",").map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const lng = parts[0];
      const lat = parts[1];
      turfCoords.push([lng, lat]);
      leafletCoords.push([lat, lng]);
    }
  }

  if (turfCoords.length < 3) {
    throw new Error("KML polygon must contain at least 3 coordinate points.");
  }

  // Ensure closed ring for turf
  if (
    turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
    turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
  ) {
    turfCoords.push([...turfCoords[0]]);
    leafletCoords.push([...leafletCoords[0]]);
  }

  const polygon = turf.polygon([turfCoords]);
  const areaSqMeters = turfArea(polygon);
  const acres = Number((areaSqMeters * 0.000247105).toFixed(2));
  const hectares = Number((areaSqMeters / 10000).toFixed(2));
  const perimeterKm = calculatePerimeter(leafletCoords);

  // Compute bounding center
  const lats = leafletCoords.map((c) => c[0]);
  const lngs = leafletCoords.map((c) => c[1]);
  const centerCoords: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];

  return {
    fileName,
    polygonCoords: leafletCoords,
    areaSqMeters,
    acres,
    hectares,
    perimeterKm,
    centerCoords,
  };
}

/**
 * Parses a GeoJSON string to extract Polygon coordinates.
 */
export function parseGeoJsonString(jsonText: string, fileName: string): ParcelBoundaryResult {
  const geojson = JSON.parse(jsonText);
  let polygon: any = null;

  if (geojson.type === "FeatureCollection" && geojson.features?.length > 0) {
    polygon = geojson.features[0].geometry;
  } else if (geojson.type === "Feature") {
    polygon = geojson.geometry;
  } else if (geojson.type === "Polygon") {
    polygon = geojson;
  }

  if (!polygon || polygon.type !== "Polygon") {
    throw new Error("GeoJSON must contain a valid Polygon geometry.");
  }

  const turfCoords = polygon.coordinates[0]; // [lng, lat]
  const leafletCoords: [number, number][] = turfCoords.map((pt: number[]) => [pt[1], pt[0]]);

  const turfPoly = turf.polygon(polygon.coordinates);
  const areaSqMeters = turfArea(turfPoly);
  const acres = Number((areaSqMeters * 0.000247105).toFixed(2));
  const hectares = Number((areaSqMeters / 10000).toFixed(2));
  const perimeterKm = calculatePerimeter(leafletCoords);

  const lats = leafletCoords.map((c) => c[0]);
  const lngs = leafletCoords.map((c) => c[1]);
  const centerCoords: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];

  return {
    fileName,
    polygonCoords: leafletCoords,
    areaSqMeters,
    acres,
    hectares,
    perimeterKm,
    centerCoords,
  };
}
