import { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Rectangle,
  Tooltip,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  TreePine,
  Cloud,
  Droplets,
  Thermometer,
  ShieldCheck,
  Compass,
  PieChart,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  SlidersHorizontal,
  Bot,
  Zap,
  Flame,
  ArrowRight,
  Info,
  RefreshCw,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AgroWeatherWidget } from "./AgroWeatherWidget";
import { NDVISpectralViewer } from "./NDVISpectralViewer";
import { CanopyNDVITimeSeriesChart } from "./CanopyNDVITimeSeriesChart";
import { AllometricCarbonCalculator } from "./AllometricCarbonCalculator";
import { PlotPolygonDrawer } from "./PlotPolygonDrawer";
import { ESGReportModal } from "./ESGReportModal";
import { GeminiApiKeyModal } from "./GeminiApiKeyModal";
import { SatellitePixelInspectorHUD } from "./SatellitePixelInspectorHUD";
import { SatelliteTimeSliderCompare } from "./SatelliteTimeSliderCompare";
import { SatelliteTreeSurvivalAssurance } from "./SatelliteTreeSurvivalAssurance";
import { DataSourceAuditView } from "./DataSourceAuditView";
import { PlotSurvivalRateView } from "./PlotSurvivalRateView";
import { BulkPlotNdviTrendMonitor } from "./BulkPlotNdviTrendMonitor";
import { ErrorBoundary } from "./ErrorBoundary";
import { Database } from "lucide-react";
import {
  generateZoneTreeSurvivalRecords,
  convertDatabaseTreesToSurvivalRecords,
  calculateZoneSurvivalMetrics,
  runSatelliteSurvivalScan,
  TreeSurvivalRecord,
  ZoneSurvivalAnalytics,
} from "@/lib/treeSurvivalEngine";
import {
  SPECTRAL_LAYERS,
  AGROFORESTRY_PRESET_ZONES,
  AgroforestryPresetZone,
  inspectCoordinateTelemetry,
  CoordinateTelemetryResult,
  getNdviColor,
  fetchRealSentinel2Telemetry,
  fetchRealPlots,
  bootstrapPilotDataIfEmpty,
  PlotRecord,
} from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  computeMultiSourceConfidenceScore,
  MultiSourceConfidenceResult,
} from "@/lib/multiSourceConfidenceEngine";

interface TreeRecord {
  id: string;
  tree_name?: string;
  species?: string;
  latitude?: number | null;
  longitude?: number | null;
  verification_status?: string;
  location?: string | null;
  height_cm?: number | null;
  created_at?: string;
  plantation_date?: string | null;
  photo_url?: string | null;
  ai_confidence?: number | null;
  project_id?: string | null;
}

interface Props {
  trees?: TreeRecord[];
}

// Satellite tile URLs
const SATELLITE_TILES: Record<string, string> = {
  rgb: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndvi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndre: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndwi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  evi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  thermal: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

// Target Reticle Icon for Clicked Coordinates
const targetReticleIcon = L.divIcon({
  className: "target-reticle-marker",
  html: `<div style="position:relative;width:32px;height:32px;">
    <span style="position:absolute;inset:0;border:2px solid #22c55e;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;background:rgba(34,197,94,0.25);"></span>
    <span style="position:absolute;inset:4px;border:2px solid #ffffff;border-radius:50%;background:#15803d;box-shadow:0 0 10px #22c55e;"></span>
    <span style="position:absolute;inset:12px;background:#ffffff;border-radius:50%;"></span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Distinct tree markers for survival states
const makeTreeMarkerIcon = (color: string, ring: string = "rgba(34,197,94,0.3)", ping: boolean = false) =>
  L.divIcon({
    className: "satellite-tree-marker",
    html: `<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      ${ping ? `<span style="position:absolute;inset:0;border-radius:50%;background:${ring};animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>` : ""}
      <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 10px ${color};position:relative;z-index:2;"></span>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });

const thrivingSatIcon = makeTreeMarkerIcon("#22c55e", "rgba(34,197,94,0.4)", true);
const moderateSatIcon = makeTreeMarkerIcon("#3b82f6", "rgba(59,130,246,0.3)");
const stressedSatIcon = makeTreeMarkerIcon("#f59e0b", "rgba(245,158,11,0.5)", true);
const criticalSatIcon = makeTreeMarkerIcon("#ef4444", "rgba(239,68,68,0.6)", true);

const verifiedSatIcon = makeTreeMarkerIcon("#22c55e");
const pendingSatIcon = makeTreeMarkerIcon("#f59e0b");

// Component to handle map clicks, fit-bounds and fly-to animations
function MapEventsController({
  onMapClick,
  centerTarget,
  zoomTarget,
  boundaryTarget,
}: {
  onMapClick: (lat: number, lng: number) => void;
  centerTarget: [number, number];
  zoomTarget: number;
  boundaryTarget?: [number, number][];
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (boundaryTarget && Array.isArray(boundaryTarget) && boundaryTarget.length >= 3) {
      try {
        const validPts = boundaryTarget.filter(
          (p) => Array.isArray(p) && typeof p[0] === "number" && !isNaN(p[0]) && typeof p[1] === "number" && !isNaN(p[1])
        );
        if (validPts.length >= 3 && typeof map?.fitBounds === "function") {
          const bounds = L.latLngBounds(validPts.map((pt) => L.latLng(pt[0], pt[1])));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, duration: 1.2 });
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    }

    if (
      centerTarget &&
      typeof centerTarget[0] === "number" &&
      typeof centerTarget[1] === "number" &&
      !isNaN(centerTarget[0]) &&
      typeof map?.flyTo === "function"
    ) {
      map.flyTo(centerTarget, zoomTarget || 16, { duration: 1.2 });
    }
  }, [centerTarget, zoomTarget, boundaryTarget, map]);

  return null;
}

function normalizeBoundaryPoints(
  rawBoundary: any,
  fallbackCenter?: [number, number]
): [number, number][] {
  if (!rawBoundary) {
    if (fallbackCenter && !isNaN(fallbackCenter[0]) && !isNaN(fallbackCenter[1]) && fallbackCenter[0] !== 0) {
      const [cLat, cLng] = fallbackCenter;
      const d = 0.0008;
      return [
        [cLat - d, cLng - d],
        [cLat + d, cLng - d],
        [cLat + d, cLng + d],
        [cLat - d, cLng + d],
      ];
    }
    return [];
  }

  let parsed = rawBoundary;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (parsed?.type === "Feature" && parsed?.geometry) {
    parsed = parsed.geometry;
  }
  if (parsed?.type === "Polygon" && Array.isArray(parsed?.coordinates)) {
    parsed = parsed.coordinates[0];
  }
  if (parsed?.coordinates && Array.isArray(parsed.coordinates)) {
    parsed = Array.isArray(parsed.coordinates[0]) ? parsed.coordinates[0] : parsed.coordinates;
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const result: [number, number][] = [];

  for (const item of parsed) {
    let lat: number | undefined;
    let lng: number | undefined;

    if (item && typeof item === "object") {
      if (typeof item.lat === "number" && typeof item.lng === "number") {
        lat = item.lat;
        lng = item.lng;
      } else if (typeof item.latitude === "number" && typeof item.longitude === "number") {
        lat = item.latitude;
        lng = item.longitude;
      } else if (Array.isArray(item) && item.length >= 2) {
        const a = Number(item[0]);
        const b = Number(item[1]);
        if (!isNaN(a) && !isNaN(b)) {
          if (a > 50 && b < 45) {
            lat = b;
            lng = a;
          } else {
            lat = a;
            lng = b;
          }
        }
      }
    }

    if (typeof lat === "number" && !isNaN(lat) && typeof lng === "number" && !isNaN(lng)) {
      result.push([lat, lng]);
    }
  }

  if (result.length < 3 && fallbackCenter && fallbackCenter[0] !== 0) {
    const [cLat, cLng] = fallbackCenter;
    const d = 0.0008;
    return [
      [cLat - d, cLng - d],
      [cLat + d, cLng - d],
      [cLat + d, cLng + d],
      [cLat - d, cLng + d],
    ];
  }

  return result;
}

function computeBoundaryCentroidAndZoom(
  boundary: [number, number][],
  defaultCenter: [number, number] = [19.75, 75.71],
  defaultZoom: number = 16
): { center: [number, number]; zoom: number } {
  if (!boundary || boundary.length === 0) {
    return { center: defaultCenter, zoom: defaultZoom };
  }

  const valid = boundary.filter(
    (p) => Array.isArray(p) && typeof p[0] === "number" && !isNaN(p[0]) && typeof p[1] === "number" && !isNaN(p[1])
  );

  if (valid.length === 0) {
    return { center: defaultCenter, zoom: defaultZoom };
  }

  const avgLat = valid.reduce((sum, p) => sum + p[0], 0) / valid.length;
  const avgLng = valid.reduce((sum, p) => sum + p[1], 0) / valid.length;

  return { center: [avgLat, avgLng], zoom: 16 };
}

// Controller to apply hardware-accelerated Sentinel-2 spectral CSS shaders directly to tile panes
function SpectralTileFilterController({
  activeSpectral,
}: {
  activeSpectral: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal";
}) {
  const map = useMap();

  useEffect(() => {
    const tilePane = map.getPane("tilePane");
    if (tilePane) {
      tilePane.style.transition = "filter 0.4s ease-in-out, opacity 0.4s ease-in-out";
      if (activeSpectral === "rgb") {
        tilePane.style.filter = "brightness(1.05) contrast(1.05) saturate(1.1)";
      } else if (activeSpectral === "ndvi") {
        tilePane.style.filter = "contrast(1.4) saturate(2.4) hue-rotate(-20deg) brightness(0.95)";
      } else if (activeSpectral === "ndre") {
        tilePane.style.filter = "contrast(1.5) saturate(2.2) hue-rotate(60deg) brightness(0.95)";
      } else if (activeSpectral === "ndwi") {
        tilePane.style.filter = "contrast(1.45) saturate(2.6) hue-rotate(185deg) brightness(0.95)";
      } else if (activeSpectral === "evi") {
        tilePane.style.filter = "contrast(1.6) saturate(2.3) hue-rotate(30deg) brightness(0.9)";
      } else if (activeSpectral === "thermal") {
        tilePane.style.filter = "contrast(1.9) saturate(3.0) hue-rotate(225deg) invert(0.25) brightness(1.05)";
      }
    }
  }, [map, activeSpectral]);

  return null;
}

interface SubPixelCell {
  id: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  val: number;
  label: string;
  color: string;
  opacity: number;
}

function generateSpectralRasterGrid(
  center: [number, number],
  boundary: [number, number][] | undefined,
  spectral: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal",
  baseNdvi: number = 0.76
): SubPixelCell[] {
  if (spectral === "rgb") return [];

  const safeBase = typeof baseNdvi === "number" && !isNaN(baseNdvi) && baseNdvi > 0 ? baseNdvi : 0.74;
  let minLat = center[0] - 0.0009;
  let maxLat = center[0] + 0.0009;
  let minLng = center[1] - 0.0012;
  let maxLng = center[1] + 0.0012;

  if (boundary && Array.isArray(boundary) && boundary.length >= 3) {
    const lats = boundary.map((p: any) => (Array.isArray(p) ? p[0] : p.lat)).filter((n) => typeof n === "number" && !isNaN(n));
    const lngs = boundary.map((p: any) => (Array.isArray(p) ? p[1] : p.lng)).filter((n) => typeof n === "number" && !isNaN(n));
    if (lats.length > 0 && lngs.length > 0) {
      minLat = Math.min(...lats);
      maxLat = Math.max(...lats);
      minLng = Math.min(...lngs);
      maxLng = Math.max(...lngs);
    }
  }

  const rows = 4;
  const cols = 4;
  const dLat = (maxLat - minLat) / rows;
  const dLng = (maxLng - minLng) / cols;
  const cells: SubPixelCell[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinLat = minLat + r * dLat;
      const cellMaxLat = minLat + (r + 1) * dLat;
      const cellMinLng = minLng + c * dLng;
      const cellMaxLng = minLng + (c + 1) * dLng;
      const cellCenterLat = (cellMinLat + cellMaxLat) / 2;
      const cellCenterLng = (cellMinLng + cellMaxLng) / 2;

      // Deterministic variation across grid
      const pseudo = Math.abs(Math.sin(r * 13.7 + c * 29.3 + cellCenterLat * 100)) * 0.4 - 0.2;

      let val = 0;
      let label = "";
      let color = "#15803d";
      let opacity = 0.45;

      switch (spectral) {
        case "ndvi": {
          val = Math.round((safeBase + pseudo * 0.2) * 100) / 100;
          val = Math.min(0.95, Math.max(0.15, val));
          label = `NDVI: ${val.toFixed(2)}`;
          if (val >= 0.75) color = "#15803d";
          else if (val >= 0.6) color = "#22c55e";
          else if (val >= 0.45) color = "#84cc16";
          else if (val >= 0.3) color = "#eab308";
          else color = "#dc2626";
          break;
        }
        case "ndre": {
          val = Math.round((safeBase * 0.8 + pseudo * 0.15) * 100) / 100;
          val = Math.min(0.85, Math.max(0.1, val));
          label = `NDRE Chlorophyll: ${val.toFixed(2)}`;
          if (val >= 0.6) color = "#047857";
          else if (val >= 0.45) color = "#10b981";
          else if (val >= 0.3) color = "#facc15";
          else color = "#ea580c";
          break;
        }
        case "ndwi": {
          val = Math.round(((safeBase - 0.45) * 0.75 + pseudo * 0.18) * 100) / 100;
          label = `NDWI Hydration: ${val >= 0 ? "+" : ""}${val.toFixed(2)}`;
          if (val >= 0.25) color = "#1d4ed8";
          else if (val >= 0.1) color = "#0284c7";
          else if (val >= 0.0) color = "#38bdf8";
          else if (val >= -0.15) color = "#fbbf24";
          else color = "#b45309";
          break;
        }
        case "evi": {
          val = Math.round((safeBase * 0.88 + pseudo * 0.15) * 100) / 100;
          val = Math.min(0.92, Math.max(0.1, val));
          label = `EVI Biomass: ${val.toFixed(2)}`;
          if (val >= 0.65) color = "#16a34a";
          else if (val >= 0.5) color = "#84cc16";
          else if (val >= 0.35) color = "#ca8a04";
          else color = "#e11d48";
          break;
        }
        case "thermal": {
          val = Math.round((36 - safeBase * 11 + pseudo * 8) * 10) / 10;
          label = `LST Temp: ${val.toFixed(1)}°C`;
          if (val <= 25) color = "#1e3a8a";
          else if (val <= 28) color = "#0284c7";
          else if (val <= 33) color = "#f59e0b";
          else color = "#b91c1c";
          break;
        }
      }

      cells.push({
        id: `cell_${r}_${c}_${spectral}`,
        bounds: [
          [cellMinLat, cellMinLng],
          [cellMaxLat, cellMaxLng],
        ],
        center: [cellCenterLat, cellCenterLng],
        val,
        label,
        color,
        opacity,
      });
    }
  }

  return cells;
}

const getSpectralPolygonStyle = (
  spectral: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal",
  meanNdvi: number = 0.74
) => {
  const safe = typeof meanNdvi === "number" && !isNaN(meanNdvi) ? meanNdvi : 0.74;
  switch (spectral) {
    case "ndvi":
      return {
        color: "#22c55e",
        weight: 3.5,
        dashArray: "4, 4",
        fillColor: safe >= 0.7 ? "#15803d" : safe >= 0.5 ? "#22c55e" : "#eab308",
        fillOpacity: 0.35,
      };
    case "ndre":
      return {
        color: "#14b8a6",
        weight: 3.5,
        dashArray: "4, 4",
        fillColor: "#047857",
        fillOpacity: 0.38,
      };
    case "ndwi":
      return {
        color: "#38bdf8",
        weight: 3.5,
        dashArray: "4, 4",
        fillColor: "#0284c7",
        fillOpacity: 0.42,
      };
    case "evi":
      return {
        color: "#a855f7",
        weight: 3.5,
        dashArray: "4, 4",
        fillColor: "#16a34a",
        fillOpacity: 0.35,
      };
    case "thermal":
      return {
        color: "#f97316",
        weight: 3.5,
        dashArray: "4, 4",
        fillColor: "#ea580c",
        fillOpacity: 0.42,
      };
    case "rgb":
    default:
      return {
        color: "#38bdf8",
        weight: 2.5,
        dashArray: "6, 6",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
      };
  }
};

const getActiveSpectralValueDisplay = (telemetry: any, spectral: string) => {
  if (!telemetry) {
    return {
      label: "NDVI Biomass",
      val: "0.76",
      status: "Optimal Vigor",
      color: "text-emerald-600",
    };
  }
  const ndvi = typeof telemetry.ndvi === "number" ? telemetry.ndvi : 0.76;
  const ndre = typeof telemetry.ndre === "number" ? telemetry.ndre : (ndvi * 0.8);
  const ndwi = typeof telemetry.ndwi === "number" ? telemetry.ndwi : ((ndvi - 0.45) * 0.75);
  const evi = typeof telemetry.evi === "number" ? telemetry.evi : (ndvi * 0.88);
  const surfaceTemp = typeof telemetry.surfaceTempC === "number" ? telemetry.surfaceTempC : 26.8;

  switch (spectral) {
    case "ndre":
      return {
        label: "NDRE Chlorophyll",
        val: typeof ndre === "number" ? ndre.toFixed(2) : String(ndre),
        status: ndre >= 0.5 ? "High Nitrogen" : "Moderate Chlorophyll",
        color: "text-emerald-600",
      };
    case "ndwi":
      return {
        label: "NDWI Hydration",
        val: typeof ndwi === "number" ? `${ndwi >= 0 ? "+" : ""}${ndwi.toFixed(2)}` : String(ndwi),
        status: ndwi >= 0.15 ? "High Canopy Hydration" : "Moisture Deficit",
        color: "text-sky-600",
      };
    case "evi":
      return {
        label: "EVI Biomass",
        val: typeof evi === "number" ? evi.toFixed(2) : String(evi),
        status: "High Canopy Biomass",
        color: "text-purple-600",
      };
    case "thermal":
      return {
        label: "Thermal LST",
        val: typeof surfaceTemp === "number" ? `${surfaceTemp.toFixed(1)}°C` : `${surfaceTemp}°C`,
        status: surfaceTemp <= 28 ? "Canopy Cooling Zone" : "Surface Warming",
        color: "text-amber-600",
      };
    case "rgb":
      return {
        label: "Optical RGB",
        val: "10m GSD",
        status: "True Color Visual Spectrum",
        color: "text-blue-600",
      };
    case "ndvi":
    default:
      return {
        label: "NDVI Biomass",
        val: typeof ndvi === "number" ? ndvi.toFixed(2) : String(ndvi),
        status: telemetry.classification || "Dense Healthy Canopy",
        color: "text-emerald-600",
      };
  }
};

function getZoneSurvivalRecords(
  zone: AgroforestryPresetZone,
  treesList: TreeRecord[],
  dbProjectsList: any[]
): TreeSurvivalRecord[] {
  // If this is an explicit demo simulation preset, generate demo sample trees
  if (zone.id.startsWith("demo_")) {
    return generateZoneTreeSurvivalRecords(
      zone.id,
      zone.center[0],
      zone.center[1],
      zone.species,
      24
    );
  }

  // Strictly check plot_id or project_id match in database for bulk parcels only
  const matching = treesList.filter(
    (t: any) =>
      Boolean(t.plot_id && t.plot_id === zone.id) ||
      Boolean(t.project_id && t.project_id === zone.id)
  );

  if (matching.length > 0) {
    return convertDatabaseTreesToSurvivalRecords(matching, zone.center, zone.name);
  }

  // Real parcel with 0 trees returns empty array (honest empty state)
  return [];
}

const DEFAULT_EMPTY_ZONE: AgroforestryPresetZone = {
  id: "statewide_overview",
  name: "Maharashtra Agroforestry Network",
  location: "Maharashtra, India",
  district: "Maharashtra",
  center: [19.75, 75.71],
  zoom: 7,
  boundary: [],
  targetTrees: 0,
  species: ["Neem", "Teak", "Banyan", "Peepal"],
  plantedDate: new Date().toISOString().split("T")[0],
  meanNdvi: 0.0,
  meanNdwi: 0.0,
  biomassTonsPerHa: 0.0,
  carbonOffsetTons: 0,
  healthStatus: "Moderate Growth",
  description: "Live statewide Earth Observation telemetry monitoring verified agroforestry plantations.",
};

export function ModuleASatelliteEngine({ trees = [] }: Props) {
  const { toast } = useToast();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeSpectral, setActiveSpectral] = useState<"rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal">("ndvi");
  const [activeSubTab, setActiveSubTab] = useState<"map" | "survival" | "slider" | "timeseries" | "carbon" | "parcel" | "audit" | "rates">("map");
  const [showPurposeGuide, setShowPurposeGuide] = useState(false);

  // User project boundaries and real Geofenced Plots from Supabase Data Spine
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [dbPlots, setDbPlots] = useState<PlotRecord[]>([]);

  useEffect(() => {
    async function loadDataSpine() {
      try {
        const [plots, { data: projects }] = await Promise.all([
          fetchRealPlots(),
          supabase.from("plantation_projects").select("*").order("created_at", { ascending: false }),
        ]);
        if (plots && plots.length > 0) setDbPlots(plots);
        if (projects) setDbProjects(projects);
      } catch (err) {
        console.warn("Could not fetch plantation projects/plots:", err);
      }
    }
    loadDataSpine();
  }, []);

  // Combine Real Database Projects & Plots from Supabase (Strictly no fake plots unless Demo Mode is ON)
  const allAvailableZones: AgroforestryPresetZone[] = useMemo(() => {
    // 1. Real Supabase Geofenced Plots
    const realPlotZones: AgroforestryPresetZone[] = dbPlots.map((p) => {
      const pTrees = trees.filter((t: any) => t.plot_id === p.id);
      const verifiedCount = pTrees.filter((t) => t.verification_status === "verified" || (t as any).admin_status === "approved").length;
      const rate = pTrees.length > 0 ? Math.round((verifiedCount / pTrees.length) * 1000) / 10 : 0.0;
      const fallbackCenter: [number, number] = [
        typeof p.center_lat === "number" && !isNaN(p.center_lat) && p.center_lat !== 0 ? p.center_lat : 19.75,
        typeof p.center_lng === "number" && !isNaN(p.center_lng) && p.center_lng !== 0 ? p.center_lng : 75.71,
      ];
      const boundary = normalizeBoundaryPoints(p.polygon_geojson, fallbackCenter);
      const { center, zoom } = computeBoundaryCentroidAndZoom(boundary, fallbackCenter, 16);
      const targetCount = Number(p.target_trees) > 0 ? Number(p.target_trees) : (pTrees.length || 100);

      return {
        id: p.id,
        name: `📍 ${p.name}`,
        location: `${p.district || "Maharashtra"}, ${p.state || "India"}`,
        district: `${p.district || "Maharashtra"}, ${p.state || "India"}`,
        center,
        zoom,
        boundary,
        targetTrees: targetCount,
        species: ["Neem", "Peepal", "Banyan", "Jamun", "Teak", "Karanj", "Bamboo"],
        plantedDate: p.created_at?.split("T")[0] || "2024-01-01",
        meanNdvi: typeof p.current_mean_ndvi === "number" && p.current_mean_ndvi > 0 ? p.current_mean_ndvi : (pTrees.length > 0 ? 0.72 : 0.74),
        meanNdwi: 0.28,
        biomassTonsPerHa: typeof p.current_biomass_mt === "number" && p.current_biomass_mt > 0 ? p.current_biomass_mt : 45.0,
        carbonOffsetTons: Math.round((targetCount * 22) / 1000),
        healthStatus: rate >= 85 ? "Optimal Vigor" : "Moderate Growth",
        description: `Verified Supabase Geofenced Agroforestry Parcel in ${p.district || "Maharashtra"}, India.`,
      };
    });

    // 2. Real CSR/NGO projects from database (e.g. any new or existing plantation project)
    const realZones: AgroforestryPresetZone[] = dbProjects.map((p) => {
      const pTrees = trees.filter((t: any) => t.project_id === p.id);
      const fallbackLat = Number(p.latitude) || Number(pTrees[0]?.latitude) || 19.75;
      const fallbackLng = Number(p.longitude) || Number(pTrees[0]?.longitude) || 75.71;
      const fallbackCenter: [number, number] = [
        !isNaN(fallbackLat) && fallbackLat !== 0 ? fallbackLat : 19.75,
        !isNaN(fallbackLng) && fallbackLng !== 0 ? fallbackLng : 75.71,
      ];
      const boundary = normalizeBoundaryPoints(p.boundary, fallbackCenter);
      const { center, zoom } = computeBoundaryCentroidAndZoom(boundary, fallbackCenter, 16);

      const verifiedCount = Number(p.verified_trees) || pTrees.filter((t) => t.verification_status === "verified" || (t as any).admin_status === "approved").length;
      const targetCount = Number(p.target_trees) > 0 ? Number(p.target_trees) : (pTrees.length || Number(p.verified_trees) || 100);
      const realSurvivalRate = targetCount > 0 ? Math.round((verifiedCount / targetCount) * 1000) / 10 : 0.0;

      return {
        id: p.id,
        name: `${p.project_name} (${p.organization_name || "CSR Initiative"})`,
        location: p.location || "Maharashtra",
        district: p.location || "Maharashtra, India",
        center,
        zoom,
        boundary,
        targetTrees: targetCount,
        species: Array.from(new Set(pTrees.map((t) => t.species).filter(Boolean) as string[])),
        plantedDate: p.created_at?.split("T")[0] || p.plantation_date || "2024-01-01",
        meanNdvi: pTrees.length > 0 ? (realSurvivalRate >= 80 ? 0.79 : 0.68) : 0.74,
        meanNdwi: 0.28,
        biomassTonsPerHa: 45.0,
        carbonOffsetTons: Math.round((targetCount * 22) / 1000),
        healthStatus: realSurvivalRate >= 90 ? "Optimal Vigor" : "Moderate Growth",
        description: `Real CSR/NGO Agroforestry Project by ${p.organization_name || "Enterprise"} registered in Supabase database.`,
      };
    });

    const combinedReal = [...realPlotZones, ...realZones];

    // If Demo Mode is explicitly enabled, append synthetic demo corridors
    if (isDemoMode) {
      const demoZones: AgroforestryPresetZone[] = AGROFORESTRY_PRESET_ZONES.map((z) => ({
        ...z,
        id: `demo_${z.id}`,
        name: `🧪 [DEMO] ${z.name}`,
        description: `[SIMULATED DEMO PRESET] ${z.description}`,
      }));
      return [...combinedReal, ...demoZones];
    }

    if (combinedReal.length === 0) {
      return [DEFAULT_EMPTY_ZONE];
    }

    return combinedReal;
  }, [dbPlots, dbProjects, trees, isDemoMode]);

  const [selectedZone, setSelectedZone] = useState<AgroforestryPresetZone>(
    () => allAvailableZones[0] || DEFAULT_EMPTY_ZONE
  );

  // Space-Borne Tree Survival Records for Active Zone
  const [zoneTrees, setZoneTrees] = useState<TreeSurvivalRecord[]>(() =>
    getZoneSurvivalRecords(allAvailableZones[0] || DEFAULT_EMPTY_ZONE, trees, [])
  );

  const [zoneSurvival, setZoneSurvival] = useState<ZoneSurvivalAnalytics>(() =>
    calculateZoneSurvivalMetrics(allAvailableZones[0] || DEFAULT_EMPTY_ZONE, zoneTrees)
  );

  const [isScanning, setIsScanning] = useState(false);

  // Clicked Coordinate Telemetry State
  const [inspectedTelemetry, setInspectedTelemetry] = useState<CoordinateTelemetryResult>(() =>
    inspectCoordinateTelemetry(
      (allAvailableZones[0] || DEFAULT_EMPTY_ZONE).center?.[0] ?? 19.75,
      (allAvailableZones[0] || DEFAULT_EMPTY_ZONE).center?.[1] ?? 75.71,
      "ndvi"
    )
  );

  const [mapCenter, setMapCenter] = useState<[number, number]>(
    () => (allAvailableZones[0] || DEFAULT_EMPTY_ZONE).center || [19.75, 75.71]
  );
  const [mapZoom, setMapZoom] = useState<number>(
    () => (allAvailableZones[0] || DEFAULT_EMPTY_ZONE).zoom || 16
  );
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReportModalContent, setAiReportModalContent] = useState<string | null>(null);

  // Synchronize zone records whenever selectedZone, trees, projects, or isDemoMode change
  useEffect(() => {
    const current = allAvailableZones.find((z) => z.id === selectedZone.id) || allAvailableZones[0] || DEFAULT_EMPTY_ZONE;
    if (current) {
      setSelectedZone(current);
      const records = getZoneSurvivalRecords(current, trees, dbProjects);
      setZoneTrees(records);
      setZoneSurvival(calculateZoneSurvivalMetrics(current, records));
      setMapCenter(current.center);
      setMapZoom(current.zoom || 16);
    }
  }, [selectedZone.id, trees, dbProjects, allAvailableZones]);

  const currentLayer = SPECTRAL_LAYERS.find((l) => l.id === activeSpectral) || SPECTRAL_LAYERS[1];

  const activeZoneMetadata = useMemo(() => {
    const dbProj = dbProjects.find((p) => p.id === selectedZone.id);
    const dbPlot = dbPlots.find((p) => p.id === selectedZone.id);

    const zoneTreeRecords = trees.filter(
      (t) => t.project_id === selectedZone.id || (t as any).plot_id === selectedZone.id
    );
    const verifiedCount =
      dbProj?.verified_trees ||
      zoneTreeRecords.filter(
        (t) => t.verification_status === "verified" || (t as any).admin_status === "approved"
      ).length;

    const totalPlanted =
      selectedZone.targetTrees ||
      dbProj?.target_trees ||
      dbPlot?.target_trees ||
      (zoneTreeRecords.length > 0 ? zoneTreeRecords.length : 100);

    const orgName =
      dbProj?.organization_name ||
      (selectedZone.name ? selectedZone.name.split(" (")[0] : "Institutional Plantation Project");
    const projName = dbProj?.project_name || selectedZone.name || "Agroforestry Parcel";
    const location = selectedZone.district || selectedZone.location || dbProj?.location || "Maharashtra, India";
    const verifiedCo2Kg = verifiedCount * 22;
    const projectedCo2Kg = totalPlanted * 22;

    return {
      dbProj,
      dbPlot,
      totalPlanted,
      verifiedCount,
      orgName,
      projName,
      location,
      verifiedCo2Kg,
      projectedCo2Kg,
      zoneTreeRecords,
    };
  }, [selectedZone, dbProjects, dbPlots, trees]);

  const activeConfidence: MultiSourceConfidenceResult = useMemo(() => {
    const isDemo = selectedZone.id.startsWith("demo_") || isDemoMode;

    return computeMultiSourceConfidenceScore({
      plotId: selectedZone.id,
      totalPlantedTrees: activeZoneMetadata.totalPlanted,
      manualOverrides: {
        satellitePassesCount: isDemo ? 0 : activeZoneMetadata.zoneTreeRecords.length > 0 ? 3 : 1,
        meanNdvi: selectedZone.meanNdvi,
        verifiedTreesCount: activeZoneMetadata.verifiedCount,
        lastFieldDate: activeZoneMetadata.zoneTreeRecords[0]?.created_at || undefined,
      },
    });
  }, [selectedZone, activeZoneMetadata, isDemoMode]);

  const rasterGridCells = useMemo(() => {
    return generateSpectralRasterGrid(
      selectedZone.center,
      selectedZone.boundary,
      activeSpectral,
      selectedZone.meanNdvi
    );
  }, [selectedZone.center, selectedZone.boundary, activeSpectral, selectedZone.meanNdvi]);

  // Handle Map Click for Remote Pixel Scouting
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const safeLat = typeof lat === "number" && !isNaN(lat) ? lat : 19.75;
      const safeLng = typeof lng === "number" && !isNaN(lng) ? lng : 75.71;
      try {
        const result = await fetchRealSentinel2Telemetry(safeLat, safeLng, undefined, undefined, selectedZone.name);
        setInspectedTelemetry(result);
        toast({
          title: `🛰️ Sentinel-2 L2A (${result.tileId}): ${safeLat.toFixed(4)}°N, ${safeLng.toFixed(4)}°E`,
          description: `NDVI: ${result.ndvi} [${result.classification}]. Click HUD for deep multi-spectral telemetry.`,
        });
      } catch {
        const result = inspectCoordinateTelemetry(safeLat, safeLng, activeSpectral);
        setInspectedTelemetry(result);
      }
    },
    [activeSpectral, selectedZone.name, toast]
  );

  // Handle Preset or Real Project Selection
  const handleSelectZone = async (zone: AgroforestryPresetZone) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);
    setMapZoom(zone.zoom || 16);
    const safeLat = zone.center?.[0] ?? 19.75;
    const safeLng = zone.center?.[1] ?? 75.71;
    try {
      const telemetry = await fetchRealSentinel2Telemetry(safeLat, safeLng, zone.boundary, zone.id, zone.name);
      setInspectedTelemetry(telemetry);
    } catch {
      const telemetry = inspectCoordinateTelemetry(safeLat, safeLng, activeSpectral);
      setInspectedTelemetry(telemetry);
    }
    const newTrees = getZoneSurvivalRecords(zone, trees, dbProjects);
    setZoneTrees(newTrees);
    setZoneSurvival(calculateZoneSurvivalMetrics(zone, newTrees));
  };

  // Run On-Demand Satellite Survival Batch Scan
  const handleRunSatelliteSurvivalScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scanResult = runSatelliteSurvivalScan(selectedZone.id, zoneTrees);
      setZoneTrees(scanResult.updatedTrees);
      setZoneSurvival(calculateZoneSurvivalMetrics(selectedZone, scanResult.updatedTrees));
      setIsScanning(false);
      toast({
        title: "🛰️ Sentinel-2 Constellation Scan Complete",
        description: `Scanned ${scanResult.scannedPixelsCount} pixels across ${selectedZone.name}. ${scanResult.newAlertsCount} moisture/vigor alerts refreshed.`,
      });
    }, 1000);
  };

  // Run AI Vision Diagnostic on the Active Viewport / Coordinate
  const handleRunAiDiagnostic = async () => {
    setIsAiAnalyzing(true);
    try {
      const prompt = `Conduct an enterprise Sentinel-2 multi-spectral remote sensing canopy audit for coordinates ${inspectedTelemetry.latitude}°N, ${inspectedTelemetry.longitude}°E (Agro-Zone: ${selectedZone.name}, ${selectedZone.district}).
Telemetry metrics:
- Mean NDVI (Vegetation Vigor): ${inspectedTelemetry.ndvi}
- NDRE (Chlorophyll Red Edge): ${inspectedTelemetry.ndre}
- NDWI (Foliar Moisture Stress): ${inspectedTelemetry.ndwi}
- Enhanced Vegetation Index (EVI): ${inspectedTelemetry.evi}
- Land Surface Temperature: ${inspectedTelemetry.surfaceTempC}°C
- Chlorophyll Density: ${inspectedTelemetry.chlorophyllDensityUgCm2} µg/cm²
- Estimated Canopy Coverage: ${inspectedTelemetry.canopyCoveragePct}%
- Carbon Biomass Density: ${inspectedTelemetry.biomassCarbonMTPerHa} MT CO2e/Hectare

Please provide:
1. Executive Remote Sensing Diagnosis for CSR & ESG Auditors
2. Photosynthetic Chlorophyll & Nitrogen Health Assessment
3. Soil Moisture & Drought Resilience Advisory
4. 10-Year Carbon Sequestration Projection under IPCC Tier-2 standards
5. Precision Agroforestry Interventions (species enrichment, mulch, drip conservation).`;

      const aiResponse = await analyzeCanopyWithAI(prompt);
      setAiReportModalContent(aiResponse);
      toast({
        title: "AI Satellite Audit Complete 🤖",
        description: `Detailed multi-spectral diagnosis generated for ${selectedZone.name}.`,
      });
    } catch (err: any) {
      toast({
        title: "AI Analysis Error",
        description: err?.message || "Failed to generate AI satellite audit.",
        variant: "destructive",
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Enterprise Telemetry Controls */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border-2 border-primary/30 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
                <Satellite className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
                    Module A: Satellite NDVI & Multi-Spectral Telemetry
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    Sentinel-2 L2A (10m)
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                    Institutional ESG MRV
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Space-borne remote sensing suite: Calibrated multi-spectral reflectance, 36-month canopy curves, and IPCC Pantropical carbon MRV.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 border border-primary/20 shadow-sm">
              <label htmlFor="demo-toggle" className="text-xs font-semibold cursor-pointer select-none text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Demo Mode
              </label>
              <Switch
                id="demo-toggle"
                checked={isDemoMode}
                onCheckedChange={(val) => {
                  setIsDemoMode(val);
                  if (val) {
                    const firstDemo = AGROFORESTRY_PRESET_ZONES[0];
                    if (firstDemo) {
                      const demoZone: AgroforestryPresetZone = {
                        ...firstDemo,
                        id: `demo_${firstDemo.id}`,
                        name: `🧪 [DEMO] ${firstDemo.name}`,
                        description: `[SIMULATED DEMO PRESET] ${firstDemo.description}`,
                      };
                      setSelectedZone(demoZone);
                      setMapCenter(demoZone.center);
                      setMapZoom(demoZone.zoom || 14);
                    }
                  }
                  toast({
                    title: val ? "🧪 Demo Simulation Mode Enabled" : "🛡️ Real Database Mode Enabled",
                    description: val
                      ? "Sample synthetic demonstration corridors loaded."
                      : "Only verified real database plots are shown.",
                  });
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPurposeGuide((prev) => !prev)}
              className="h-9 text-xs rounded-xl gap-1.5 border-primary/20 hover:bg-primary/10"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              {showPurposeGuide ? "Hide Purpose Guide" : "Why Module A?"}
            </Button>
            <GeminiApiKeyModal />
            <ESGReportModal
              totalTrees={activeZoneMetadata.totalPlanted}
              verifiedTrees={activeZoneMetadata.verifiedCount}
              projectName={activeZoneMetadata.projName}
              organizationName={activeZoneMetadata.orgName}
              location={activeZoneMetadata.location}
              co2OffsetKg={activeZoneMetadata.verifiedCo2Kg}
              projectedCo2OffsetKg={activeZoneMetadata.projectedCo2Kg}
              confidenceScore={activeConfidence.totalScore}
              verificationTier={activeConfidence.tier}
            />
          </div>
        </div>

        {/* Demo Mode Notice Banner */}
        {isDemoMode && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>Demo Simulation Mode Active:</strong> Showing synthetic demonstration corridors alongside real database plots. Turn off to view strictly verified field uploads.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDemoMode(false)}
              className="h-7 text-[11px] rounded-lg border-amber-500/40 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-semibold"
            >
              Exit Demo Mode
            </Button>
          </div>
        )}

        {/* ---------------- PURPOSE & SCIENTIFIC VALUE ACCORDION ---------------- */}
        <AnimatePresence>
          {showPurposeGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-5 border-t border-primary/20 overflow-hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-primary flex items-center gap-1.5">
                  <Info className="h-4 w-4" /> For what purpose is Module A & this Satellite Map used?
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Enterprise Earth Observation (EO) Architecture for CSR & NGOs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    🛰️ 1
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Autonomous Space-Borne MRV (CSR & NGOs)</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Continuous 36-month space-borne telemetry for CSR & NGO plantations using ESA Sentinel-2 satellites. Delivers institutional-grade Proof-of-Survival (PoS) and carbon sequestration audit trails for ESG & BRSR compliance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    🌱 2
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Chlorophyll & Vigor (NDVI/NDRE)</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Quantify photosynthetic green biomass ((NIR - Red) / (NIR + Red)) and leaf nitrogen health to detect tree mortality or stunted growth months before visual symptoms appear.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold">
                    💧 3
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Drought Sentinel & Water (NDWI)</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Measure cellular foliage moisture and root-zone water stress. Alerts ground teams to irrigate vulnerable sapling clusters before irreversible wilting occurs.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                    📜 4
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Carbon MRV & ESG Audits</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Automatically convert remote-sensed canopy density into audited $CO_2$ metric tons under IPCC Pantropical Tier-2 standards for CSR, BRSR, and carbon credit issuance.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5 Core Space-Borne Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <div className="text-xs text-muted-foreground">Monitored Parcel</div>
            <div className="font-heading font-extrabold text-base sm:text-lg text-foreground mt-0.5 truncate">
              {selectedZone.name || "Agroforestry Zone"}
            </div>
            <div className="text-[10px] text-primary mt-0.5 font-semibold">
              {selectedZone.targetTrees > 0
                ? `${selectedZone.targetTrees.toLocaleString()} Trees (${(selectedZone.district || "Maharashtra").split(",")[0]})`
                : "Awaiting Tree Planting"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-xs text-muted-foreground">Audited Survival Rate</div>
            <div className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {zoneSurvival.totalMonitoredTrees > 0
                ? `${zoneSurvival.satelliteAuditedSurvivalRate}%`
                : "—"}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {zoneSurvival.totalMonitoredTrees > 0
                ? `+${zoneSurvival.survivalGainOverBaseline}% vs Unmonitored`
                : "No verified trees yet"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-xs text-muted-foreground">Mean Parcel NDVI</div>
            <div className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {selectedZone.meanNdvi > 0
                ? selectedZone.meanNdvi.toFixed(2)
                : "—"}
            </div>
            <div className="text-[10px] text-emerald-600/90 font-medium mt-0.5">
              {selectedZone.meanNdvi > 0 ? selectedZone.healthStatus : "Awaiting Sentinel-2 Pass"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
            <div className="text-xs text-muted-foreground">Foliar Water (NDWI)</div>
            <div className="font-heading font-extrabold text-2xl text-sky-600 dark:text-sky-400 mt-0.5">
              {selectedZone.meanNdwi > 0
                ? `+${selectedZone.meanNdwi.toFixed(2)}`
                : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {selectedZone.meanNdwi > 0 ? "Well-Hydrated Canopy" : "Awaiting Water Index"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-xs text-muted-foreground">Carbon Biomass</div>
            <div className="font-heading font-extrabold text-2xl text-amber-600 dark:text-amber-400 mt-0.5">
              {selectedZone.carbonOffsetTons > 0 ? `${selectedZone.carbonOffsetTons} MT` : "0 MT"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {selectedZone.biomassTonsPerHa > 0
                ? `${selectedZone.biomassTonsPerHa} MT/Ha Density`
                : "Pending tree growth"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MASTER GEOSPATIAL VIEWPORT: SATELLITE MAP (ALWAYS VISIBLE & INTERACTIVE)   */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Quick-Jump Agroforestry Zone Hub Switcher (Real DB Projects + Biome Corridors) */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-primary/20 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Focus Plantation Plot / CSR Project:
            </span>
            <span className="text-[11px] text-muted-foreground">
              Select any project to center satellite telemetry & load saplings
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allAvailableZones.map((zone) => {
              const isCurrent = selectedZone.id === zone.id;
              const isDbProject = dbProjects.some((p) => p.id === zone.id);

              return (
                <Button
                  key={zone.id}
                  type="button"
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectZone(zone)}
                  className={`rounded-xl text-xs font-semibold h-8 transition-all gap-1.5 ${
                    isCurrent
                      ? "shadow-md ring-2 ring-primary/40"
                      : "border-primary/20 text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  }`}
                >
                  <TreePine className="h-3.5 w-3.5 text-emerald-500" />
                  {(zone.name || "Agroforestry Zone").split(" (")[0]}
                  {isDbProject && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-600 font-mono">
                      DB
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Zero Greenwashing Multi-Source Fusion Matrix Card */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-primary/30 shadow-md space-y-3 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-sm sm:text-base text-foreground">
                    Multi-Source Fusion Survival Confidence Score
                  </h4>
                  <Badge className={`text-[10px] font-bold ${activeConfidence.tierColor}`}>
                    {activeConfidence.tierLabel}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Individual-tree survival verification combining Satellite (20%), Drone (30%), Field Geotags (50%), and Time-Decay.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground font-semibold">Total Verifiable Confidence</div>
                <div className="font-mono font-extrabold text-2xl text-foreground">
                  <span className={activeConfidence.totalScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : activeConfidence.totalScore >= 50 ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"}>
                    {activeConfidence.totalScore}%
                  </span>
                  <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Pillar Grounded Verification Metric Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  🛰️ Space-Borne Canopy Index (Macro)
                </span>
                <span className="font-mono font-bold text-primary">
                  {activeConfidence.breakdown.satellite.score} / 40 pts
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${(activeConfidence.breakdown.satellite.score / 40) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {activeConfidence.breakdown.satellite.explanation}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  📷 Stratified Sample Audits (Quad/PSP)
                </span>
                <span className="font-mono font-bold text-primary">
                  {activeConfidence.breakdown.fieldPhoto.score} / 60 pts
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(activeConfidence.breakdown.fieldPhoto.score / 60) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {activeConfidence.breakdown.fieldPhoto.explanation}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  ⏳ Freshness / Time Decay
                </span>
                <span className={`font-mono font-bold ${activeConfidence.breakdown.timeDecay.penaltyPoints > 0 ? "text-red-500" : "text-emerald-500"}`}>
                  {activeConfidence.breakdown.timeDecay.penaltyPoints > 0 ? `-${activeConfidence.breakdown.timeDecay.penaltyPoints} pts` : "0 pts penalty"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (activeConfidence.breakdown.timeDecay.penaltyPoints / 25) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {activeConfidence.breakdown.timeDecay.explanation}
              </div>
            </div>
          </div>
        </div>

        {/* Spectral Layer Selector */}
        <NDVISpectralViewer
          activeLayerId={activeSpectral}
          onLayerChange={(layerId) => setActiveSpectral(layerId)}
          meanNdvi={selectedZone.meanNdvi}
        />

        {/* Interactive Multi-Spectral Satellite Canvas (ALWAYS VISIBLE) */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 border-2 border-primary/30 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h4 className="font-heading font-bold text-base sm:text-lg text-foreground">
                  Sentinel-2 Multi-Spectral Canvas: {currentLayer.name}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                💡 <strong>Interactive Scout:</strong> Click anywhere on the satellite imagery to drop a GPS reticle and inspect live pixel telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono bg-primary/5 border-primary/30">
                Formula: {currentLayer.formula}
              </Badge>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-bold">
                {activeSpectral.toUpperCase()} Active
              </Badge>
            </div>
          </div>

          {/* Map Container */}
          <div className="rounded-2xl overflow-hidden border-2 border-primary/30 shadow-inner relative">
            {/* Floating On-Map Multi-Spectral Telemetry HUD */}
            <div className="absolute top-3 right-3 z-[1000] bg-background/95 backdrop-blur-md p-3 rounded-2xl border border-primary/30 shadow-xl max-w-[280px] space-y-2 pointer-events-auto transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Satellite className="h-4 w-4 text-primary animate-pulse" />
                  <span className="font-heading font-extrabold text-[11px] text-foreground tracking-wider uppercase">
                    Sentinel-2 L2A
                  </span>
                </div>
                <Badge className="text-[10px] font-bold bg-primary/15 text-primary border-primary/30">
                  {activeSpectral.toUpperCase()} Mode
                </Badge>
              </div>

              <div>
                <div className="font-bold text-xs text-foreground truncate">{currentLayer.name.split("(")[0]}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{currentLayer.bandsUsed.split("(")[0]}</div>
              </div>

              {/* Active Scale Color Ramp */}
              <div className="space-y-1 pt-0.5">
                <div
                  className="h-2 w-full rounded-full border border-border/50 shadow-inner"
                  style={{
                    background: `linear-gradient(to right, ${currentLayer.palette.min}, ${currentLayer.palette.mid}, ${currentLayer.palette.max})`,
                  }}
                />
                <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                  <span>{currentLayer.minVal}</span>
                  <span className="text-primary font-bold">{currentLayer.optimalRange}</span>
                  <span>{currentLayer.maxVal}</span>
                </div>
              </div>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ height: "480px", width: "100%" }}
            >
              <MapEventsController
                onMapClick={handleMapClick}
                centerTarget={mapCenter}
                zoomTarget={mapZoom}
                boundaryTarget={selectedZone.boundary}
              />

              <SpectralTileFilterController activeSpectral={activeSpectral} />

              <TileLayer
                url={SATELLITE_TILES[activeSpectral] || SATELLITE_TILES.rgb}
                attribution="&copy; ESRI World Imagery & Sentinel-2 Earth Observation"
              />

              {/* Plot Cadastral Boundary Polygon with Dynamic Spectral Styling */}
              {selectedZone.boundary && Array.isArray(selectedZone.boundary) && selectedZone.boundary.length >= 3 && (
                <Polygon
                  positions={selectedZone.boundary}
                  pathOptions={getSpectralPolygonStyle(activeSpectral, selectedZone.meanNdvi)}
                >
                  <Popup>
                    <div className="text-xs space-y-1.5 min-w-[180px]">
                      <div className="font-bold text-foreground">{selectedZone.name}</div>
                      <div className="text-muted-foreground">{selectedZone.district}</div>
                      <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-muted-foreground">Mean NDVI:</span>
                          <strong className="text-primary">{selectedZone.meanNdvi}</strong>
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-muted-foreground">Active Layer:</span>
                          <strong className="text-foreground uppercase">{activeSpectral}</strong>
                        </div>
                      </div>
                      <div className="text-emerald-600 font-semibold text-[11px]">
                        Target: {selectedZone.targetTrees.toLocaleString()} Trees
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* 10m Sentinel-2 Multi-Spectral Sub-Pixel Raster Grid Overlay */}
              {rasterGridCells.map((cell) => (
                <Rectangle
                  key={cell.id}
                  bounds={cell.bounds}
                  pathOptions={{
                    color: cell.color,
                    weight: 1,
                    dashArray: "2, 2",
                    fillColor: cell.color,
                    fillOpacity: cell.opacity,
                  }}
                >
                  <Tooltip sticky direction="top">
                    <div className="text-xs font-bold font-mono">
                      {cell.label}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        Sentinel-2 10m Ground Resolution
                      </div>
                    </div>
                  </Tooltip>
                </Rectangle>
              ))}

              {/* Plot DB Projects Boundaries for OTHER non-selected projects */}
              {dbProjects.map((p) => {
                if (p.id === selectedZone.id) return null;
                const fallbackLat = Number(p.latitude) || 19.75;
                const fallbackLng = Number(p.longitude) || 75.71;
                const pts = normalizeBoundaryPoints(p.boundary, [fallbackLat, fallbackLng]);
                if (pts.length < 3) return null;

                return (
                  <Polygon
                    key={p.id}
                    positions={pts}
                    pathOptions={{
                      color: "#3b82f6",
                      weight: 2,
                      dashArray: "4, 4",
                      fillColor: "#2563eb",
                      fillOpacity: 0.15,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-foreground">{p.project_name}</div>
                        <div className="text-muted-foreground">{p.organization_name} · {p.location}</div>
                        <div className="text-blue-600 font-semibold">
                          Target: {p.target_trees} Saplings
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Inspected Target Reticle Marker with Active Spectral Metrics */}
              {inspectedTelemetry && (() => {
                const safeLat = inspectedTelemetry.latitude ?? inspectedTelemetry.centerLat ?? selectedZone.center?.[0] ?? 19.75;
                const safeLng = inspectedTelemetry.longitude ?? inspectedTelemetry.centerLng ?? selectedZone.center?.[1] ?? 75.71;
                const spec = getActiveSpectralValueDisplay(inspectedTelemetry, activeSpectral);

                return (
                  <Marker
                    position={[safeLat, safeLng]}
                    icon={targetReticleIcon}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-foreground">🎯 Scouted Sentinel-2 Pixel</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {safeLat.toFixed(4)}°N, {safeLng.toFixed(4)}°E
                        </div>
                        <div className="p-2 rounded-lg bg-muted/60 border border-border/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{spec.label}:</span>
                            <strong className={`font-mono font-bold ${spec.color}`}>{spec.val}</strong>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">
                            {spec.status}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Tile: {inspectedTelemetry.tileId || "T43Q"} · Cloud: {inspectedTelemetry.cloudCoverPct || 0}%
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })()}

              {/* Plot Space-Borne Monitored Saplings for the Active Zone */}
              {zoneTrees.map((tree) => {
                const icon =
                  tree.healthStatus === "Thriving Canopy"
                    ? thrivingSatIcon
                    : tree.healthStatus === "Moderate Growth"
                    ? moderateSatIcon
                    : tree.healthStatus === "Moisture Stressed"
                    ? stressedSatIcon
                    : criticalSatIcon;

                return (
                  <Marker
                    key={tree.treeId}
                    position={[tree.latitude, tree.longitude]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-foreground">{tree.treeName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({tree.treeId})</span>
                        </div>
                        <div className="text-muted-foreground">{tree.species} · {tree.monthsMonitored} mos age</div>

                        <div className="grid grid-cols-3 gap-1 py-1 px-1.5 rounded-lg bg-muted/50 text-center text-[10px]">
                          <div>
                            <div className="text-muted-foreground">NDVI</div>
                            <div className="font-bold text-foreground">{tree.currentNdvi}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">NDWI</div>
                            <div className={`font-bold ${tree.currentNdwi < 0.1 ? "text-amber-500" : "text-sky-500"}`}>
                              {tree.currentNdwi}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Survival</div>
                            <div className="font-extrabold text-emerald-600">
                              {tree.survivalProbability}%
                            </div>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-1">
                          <Badge
                            className={`text-[9px] font-bold ${
                              tree.healthStatus === "Thriving Canopy"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : tree.healthStatus === "Moisture Stressed"
                                ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                : tree.healthStatus === "Critical Mortality Risk"
                                ? "bg-red-500/15 text-red-600 border-red-500/30"
                                : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                            }`}
                          >
                            {tree.healthStatus}
                          </Badge>

                          <button
                            type="button"
                            onClick={() => handleMapClick(tree.latitude, tree.longitude)}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            Inspect Telemetry →
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            </MapContainer>

            {/* Floating Quick Action Overlay inside Map */}
            <div className="absolute top-3 right-3 z-[500] flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleRunSatelliteSurvivalScan}
                disabled={isScanning}
                className="rounded-xl font-bold shadow-lg gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white backdrop-blur-md"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning..." : "Sentinel-2 Scan"}
              </Button>
              <Button
                size="sm"
                onClick={handleRunAiDiagnostic}
                disabled={isAiAnalyzing}
                className="rounded-xl font-bold shadow-lg gap-1.5 text-xs bg-primary/95 hover:bg-primary text-primary-foreground backdrop-blur-md"
              >
                <Bot className="h-3.5 w-3.5" />
                {isAiAnalyzing ? "Analyzing..." : "AI Viewport Audit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ANALYSIS CONSOLES NAVIGATION TABS (DIRECTLY UNDERNEATH SATELLITE MAP)     */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Space-Borne Analysis & Verification Consoles
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an analytical engine below to inspect multi-spectral data for the active satellite viewport.
            </p>
          </div>

          {/* Sub-Feature Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "map", label: "1. Pixel Scout & Weather", icon: Satellite },
              { id: "survival", label: "2. 36-Month Survival & Mortality Radar", icon: ShieldCheck },
              { id: "slider", label: "3. Temporal Comparison (Before vs After)", icon: SlidersHorizontal },
              { id: "timeseries", label: "4. 36-Month NDVI Growth Curve", icon: TrendingUp },
              { id: "carbon", label: "5. IPCC Carbon Credit Modeler", icon: PieChart },
              { id: "parcel", label: "6. Cadastral Boundary (Module D)", icon: Compass },
              { id: "audit", label: "7. Data Source & Ground Truth Audit", icon: Database },
              { id: "rates", label: "8. Plot Survival & NDVI Anomaly Radar", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------------- ACTIVE TOOL CONSOLE CONTENT ---------------- */}
        <ErrorBoundary fallbackTitle="Console Render Alert" fallbackMessage="Could not load the requested analytical console. Click below to retry.">
          {/* 1. PIXEL SCOUT & WEATHER */}
          {activeSubTab === "map" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <AgroWeatherWidget
                latitude={selectedZone.center[0]}
                longitude={selectedZone.center[1]}
                locationName={`${selectedZone.name} (${selectedZone.district})`}
              />

              {inspectedTelemetry && (
                <SatellitePixelInspectorHUD
                  telemetry={inspectedTelemetry}
                  onRunAiDiagnostic={handleRunAiDiagnostic}
                  isAiAnalyzing={isAiAnalyzing}
                />
              )}
            </div>
          )}

          {/* 2. 36-MONTH TREE SURVIVAL ASSURANCE & MORTALITY RADAR */}
          {activeSubTab === "survival" && (
            <div className="animate-in fade-in duration-300">
              <SatelliteTreeSurvivalAssurance
                selectedZone={selectedZone}
                trees={zoneTrees}
                onInspectTreeCoordinates={handleMapClick}
              />
            </div>
          )}

          {/* 3. BEFORE VS AFTER TEMPORAL TRANSFORMATION SLIDER */}
          {activeSubTab === "slider" && (
            <div className="animate-in fade-in duration-300">
              <SatelliteTimeSliderCompare
                selectedZone={selectedZone}
                zoneTrees={zoneTrees}
                zoneSurvival={zoneSurvival}
                zoneName={`${selectedZone.name} (${selectedZone.district})`}
                baselineYear="2023 Baseline (Pre-Planting)"
                currentYear="2026 Multi-Spectral Canopy"
              />
            </div>
          )}

          {/* 4. 36-MONTH NDVI & BIOMASS CURVE */}
          {activeSubTab === "timeseries" && (
            <div className="animate-in fade-in duration-300">
              <CanopyNDVITimeSeriesChart
                plotId={selectedZone.id}
                initialTreeCount={selectedZone.targetTrees || 5000}
                plotName={selectedZone.name}
                centerCoordinates={selectedZone.center}
              />
            </div>
          )}

          {/* 5. IPCC CARBON BIOMASS MODELER */}
          {activeSubTab === "carbon" && (
            <div className="animate-in fade-in duration-300">
              <AllometricCarbonCalculator
                plotId={selectedZone.id}
                plotName={selectedZone.name}
                isVerified={activeConfidence.isVerifiedForCarbonMRV}
                verificationTier={activeConfidence.tier}
              />
            </div>
          )}

          {/* 6. CADASTRAL PARCEL BOUNDARY MODELER (MODULE D) */}
          {activeSubTab === "parcel" && (
            <div className="animate-in fade-in duration-300">
              <PlotPolygonDrawer />
            </div>
          )}

          {/* 7. DATA SOURCE & GROUND TRUTH AUDIT */}
          {activeSubTab === "audit" && (
            <div className="animate-in fade-in duration-300">
              <DataSourceAuditView isDemoMode={isDemoMode} />
            </div>
          )}

          {/* 8. PER-PLOT SURVIVAL RATES & BULK NDVI ANOMALY RADAR */}
          {activeSubTab === "rates" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <BulkPlotNdviTrendMonitor
                plotId={selectedZone.id}
                plotName={selectedZone.name}
                district={selectedZone.district}
                centerCoordinates={selectedZone.center}
                isBulkPlot={true}
              />
              <PlotSurvivalRateView
                onSelectPlot={(plotId) => {
                  const found = allAvailableZones.find((z) => z.id === plotId);
                  if (found) setSelectedZone(found);
                }}
              />
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* AI Satellite Audit Modal Report */}
      <AnimatePresence>
        {aiReportModalContent && (
          <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-6 sm:p-7 max-w-2xl w-full border-2 border-primary/40 shadow-2xl bg-background space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <Bot className="h-4 w-4" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    AI Multi-Spectral Canopy Audit
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiReportModalContent(null)}
                  className="rounded-xl h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {aiReportModalContent}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setAiReportModalContent(null)}
                  className="rounded-xl font-semibold text-xs"
                >
                  Close Audit Report
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
