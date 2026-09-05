import { useState, useRef, useEffect, useMemo } from "react";
import {
  MapPin,
  Sparkles,
  ShieldCheck,
  FileText,
  Trees,
  PieChart,
  RefreshCw,
  Upload,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Ruler,
  Bot,
  Loader2,
  Pencil,
  Trash2,
  Download,
  Undo2,
  Maximize2,
  Scan,
  TreePine,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculatePlotMetrics } from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { parseKmlString, parseGeoJsonString, ParcelBoundaryResult } from "@/lib/kmlParser";
import { detectTreesInBoundary, BoundaryDetectionResult, LatLng } from "@/lib/boundaryTreeDetection";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

interface Props {
  trees?: Array<{ id: string; tree_name?: string; species?: string; latitude?: number | null; longitude?: number | null; verification_status?: string }>;
  onPlotSaved?: (plotData: any) => void;
}

// Preset Cadastral Parcel Boundaries across Maharashtra Agroforestry Belts
const PRESET_PARCELS: Record<
  string,
  { name: string; district: string; coords: [number, number][]; trees: number; ageMonths: number }
> = {
  satara: {
    name: "Sahyadri Bio-Reserve Agroforestry Parcel",
    district: "Satara",
    coords: [
      [17.6845, 74.0120],
      [17.6880, 74.0165],
      [17.6895, 74.0110],
      [17.6860, 74.0075],
      [17.6845, 74.0120],
    ],
    trees: 750,
    ageMonths: 24,
  },
  nagpur: {
    name: "Vidarbha Teakwood & Bamboo Carbon Plot",
    district: "Nagpur",
    coords: [
      [21.1490, 79.0820],
      [21.1540, 79.0890],
      [21.1570, 79.0830],
      [21.1510, 79.0760],
      [21.1490, 79.0820],
    ],
    trees: 1800,
    ageMonths: 36,
  },
  pune: {
    name: "Western Ghats Native Agro-Forestry Corridor",
    district: "Pune",
    coords: [
      [18.5204, 73.8567],
      [18.5255, 73.8610],
      [18.5270, 73.8540],
      [18.5220, 73.8510],
      [18.5204, 73.8567],
    ],
    trees: 1200,
    ageMonths: 18,
  },
  solapur: {
    name: "Solapur Dryland Horticulture & Tamarind Matrix",
    district: "Solapur",
    coords: [
      [17.6620, 75.9010],
      [17.6660, 75.9080],
      [17.6690, 75.9030],
      [17.6640, 75.8970],
      [17.6620, 75.9010],
    ],
    trees: 950,
    ageMonths: 14,
  },
};

// Geodesic spherical area calculator
function computePolygonAreaSqMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 20234;
  try {
    const R = 6378137; // Earth radius in meters
    let total = 0;
    const len = coords.length;
    for (let i = 0; i < len; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % len];
      const lat1 = (p1[0] * Math.PI) / 180;
      const lat2 = (p2[0] * Math.PI) / 180;
      const lon1 = (p1[1] * Math.PI) / 180;
      const lon2 = (p2[1] * Math.PI) / 180;
      total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    const area = Math.abs((total * R * R) / 2);
    return Math.max(100, Math.round(area));
  } catch (e) {
    return 20234;
  }
}

// Auto-invalidates container size on mount & tab switches
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Auto-pan and fit bounds when polygon changes
function MapBoundsUpdater({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length >= 3) {
      try {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (e) {
        console.warn("Bounds update error:", e);
      }
    }
  }, [coords, map]);
  return null;
}

// Click handler for drawing mode
function MapDrawingHandler({
  isDrawing,
  onAddPoint,
}: {
  isDrawing: boolean;
  onAddPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Vertex marker icon
const vertexIcon = L.divIcon({
  className: "polygon-vertex-marker",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.8)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Detected tree marker pin
const detectedTreePinIcon = L.divIcon({
  className: "detected-tree-pin",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 8px #10b981"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export function PlotPolygonDrawer({ trees = [], onPlotSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [plotName, setPlotName] = useState("Sahyadri Bio-Reserve Agroforestry Parcel");
  const [district, setDistrict] = useState("Satara");
  const [areaSqM, setAreaSqM] = useState(20234); // ~5 acres
  const [treeCount, setTreeCount] = useState(750);
  const [avgAgeMonths, setAvgAgeMonths] = useState(24);

  // Drawing & GIS states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>(PRESET_PARCELS.satara.coords);
  const [kmlData, setKmlData] = useState<ParcelBoundaryResult | null>(null);

  // AI & Analytics states
  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Automated Tree Detection in Active Boundary
  const activeBoundary = isDrawing && drawPoints.length >= 3 ? drawPoints : polygonCoords;
  const detectionResult: BoundaryDetectionResult | null = useMemo(() => {
    if (activeBoundary.length < 3) return null;
    return detectTreesInBoundary({
      boundary: activeBoundary,
      trees,
      baselineNdvi: 0.68,
      canopyCoverage: 50,
    });
  }, [activeBoundary, trees]);

  // Calculate live metrics safely
  const metrics = useMemo(() => {
    return calculatePlotMetrics({
      areaSquareMeters: areaSqM,
      treeCount,
      averageAgeMonths: avgAgeMonths,
    });
  }, [areaSqM, treeCount, avgAgeMonths]);

  // Recalculate area from points
  const handleRecalculateArea = (points: [number, number][]) => {
    if (points.length < 3) return;
    const computedArea = computePolygonAreaSqMeters(points);
    if (computedArea > 50) {
      setAreaSqM(computedArea);
    }
  };

  // Add point in drawing mode
  const handleAddDrawPoint = (lat: number, lng: number) => {
    const next = [...drawPoints, [lat, lng] as [number, number]];
    setDrawPoints(next);
    if (next.length >= 3) {
      handleRecalculateArea(next);
    }
  };

  // Finish drawing polygon
  const handleFinishDrawing = () => {
    if (drawPoints.length < 3) {
      toast.error("Please click at least 3 points on the satellite map to form a parcel boundary.");
      return;
    }
    const closed = [...drawPoints, drawPoints[0]];
    setPolygonCoords(closed);
    handleRecalculateArea(closed);
    setIsDrawing(false);
    setDrawPoints([]);

    const detect = detectTreesInBoundary({ boundary: closed, trees });
    setTreeCount(detect.totalDetectedCount);
    toast.success(`✅ Parcel Saved! Detected ${detect.totalDetectedCount} Trees within boundary.`);
  };

  // Undo last point
  const handleUndoPoint = () => {
    if (drawPoints.length === 0) return;
    const next = drawPoints.slice(0, -1);
    setDrawPoints(next);
    if (next.length >= 3) {
      handleRecalculateArea(next);
    }
  };

  // Load a preset parcel
  const handleSelectPreset = (key: string) => {
    const preset = PRESET_PARCELS[key];
    if (!preset) return;

    setPlotName(preset.name);
    setDistrict(preset.district);
    setPolygonCoords(preset.coords);
    handleRecalculateArea(preset.coords);
    setAvgAgeMonths(preset.ageMonths);
    setIsDrawing(false);
    setDrawPoints([]);

    const detect = detectTreesInBoundary({ boundary: preset.coords, trees });
    setTreeCount(preset.trees || detect.totalDetectedCount);
    toast.success(`📍 Loaded ${preset.name} (${preset.district}) — ${detect.totalDetectedCount} Trees Detected!`);
  };

  // Upload survey boundary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let res: ParcelBoundaryResult;

      if (file.name.endsWith(".kml") || file.name.endsWith(".xml")) {
        res = parseKmlString(text, file.name);
      } else if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        res = parseGeoJsonString(text, file.name);
      } else {
        throw new Error("Unsupported file format. Please upload .kml or .geojson.");
      }

      setKmlData(res);
      setPolygonCoords(res.polygonCoords);
      setAreaSqM(Math.round(res.areaSqMeters));
      setPlotName(file.name.replace(/\.[^/.]+$/, ""));
      setIsDrawing(false);
      setDrawPoints([]);

      const detect = detectTreesInBoundary({ boundary: res.polygonCoords, trees });
      setTreeCount(detect.totalDetectedCount);
      toast.success(`✅ Parsed ${res.acres} Acres from ${file.name}! Detected ${detect.totalDetectedCount} Trees.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Boundary upload failed: ${err.message}`);
    }
  };

  // Export boundary as GeoJSON file
  const handleExportGeoJSON = () => {
    if (polygonCoords.length < 3) {
      toast.error("No polygon boundary to export.");
      return;
    }

    const turfCoords = polygonCoords.map((p) => [p[1], p[0]]);
    if (
      turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
      turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
    ) {
      turfCoords.push([...turfCoords[0]]);
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            plot_name: plotName,
            district,
            acres: metrics.acres,
            hectares: metrics.hectares,
            tree_count: treeCount,
            estimated_co2_tons: metrics.annualCo2MetricTons,
            platform: "Green Enlightenment GIS Engine",
            timestamp: new Date().toISOString(),
          },
          geometry: {
            type: "Polygon",
            coordinates: [turfCoords],
          },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plotName.toLowerCase().replace(/\s+/g, "_")}_boundary.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded GeoJSON Survey Boundary!");
  };

  // Run AI Parcel Health Diagnostic with Gemini
  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeCanopyWithAI({
        plotName,
        areaAcres: metrics.acres,
        district,
        treeCount,
        ndviScore: metrics.ndviScore,
      });
      setAiReport(res);
      toast.success("AI Parcel Health Diagnostic Complete!");
    } catch (e: any) {
      toast.error("Failed to run AI analysis: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-6">
      {/* Module D Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground">
                Forest Survey & Cadastral Boundary Modeler (Module D)
              </h3>
              <p className="text-xs text-muted-foreground">
                Interactive parcel drawing on Sentinel-2 satellite imagery, automated in-boundary tree detection, and KML/GeoJSON survey parser.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".kml,.geojson,.json,.xml"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl text-xs gap-1.5 border-primary/20 hover:bg-primary/10"
          >
            <Upload className="h-3.5 w-3.5 text-primary" /> Import KML / GeoJSON
          </Button>

          {/* Draw Boundary Toggle */}
          {!isDrawing ? (
            <Button
              size="sm"
              onClick={() => {
                setIsDrawing(true);
                setDrawPoints([]);
                toast.info("🗺️ Drawing mode active: Click anywhere on the map to add boundary corners.");
              }}
              className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
            >
              <Pencil className="h-3.5 w-3.5" /> Draw Custom Boundary
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoPoint}
                disabled={drawPoints.length === 0}
                className="rounded-xl text-xs gap-1.5 border-amber-500/30 text-amber-600"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo Point
              </Button>
              <Button
                size="sm"
                onClick={handleFinishDrawing}
                disabled={drawPoints.length < 3}
                className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Finish Boundary ({drawPoints.length} pts)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDrawing(false);
                  setDrawPoints([]);
                }}
                className="rounded-xl text-xs text-muted-foreground"
              >
                Cancel
              </Button>
            </>
          )}

          {polygonCoords.length >= 3 && !isDrawing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportGeoJSON}
              className="rounded-xl text-xs gap-1.5 border-primary/20 hover:bg-primary/10"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Export GeoJSON
            </Button>
          )}
        </div>
      </div>

      {/* Preset Cadastral Parcel Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/10">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-primary" /> Quick Presets:
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectPreset("satara")}
          className="rounded-lg h-7 text-xs border-primary/20 bg-background/60 hover:bg-primary/10"
        >
          Satara (5 Acres)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectPreset("nagpur")}
          className="rounded-lg h-7 text-xs border-primary/20 bg-background/60 hover:bg-primary/10"
        >
          Nagpur Teak (12 Acres)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectPreset("pune")}
          className="rounded-lg h-7 text-xs border-primary/20 bg-background/60 hover:bg-primary/10"
        >
          Pune Corridor (8 Acres)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectPreset("solapur")}
          className="rounded-lg h-7 text-xs border-primary/20 bg-background/60 hover:bg-primary/10"
        >
          Solapur Agro (6 Acres)
        </Button>
      </div>

      {/* Tree Detection Live Scorecard Banner */}
      {detectionResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-bold text-sm text-foreground">
                  Detected {detectionResult.totalDetectedCount} Trees within Selected Boundary
                </h4>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 font-bold">
                  {detectionResult.confidencePercent}% Match
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Density: <strong>{detectionResult.densityPerAcre} trees/acre</strong> · Area: <strong>{metrics.acres} Acres</strong> ({metrics.hectares} Ha) · {detectionResult.densityLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setTreeCount(detectionResult.totalDetectedCount);
                toast.success(`Synced ${detectionResult.totalDetectedCount} detected trees to plot configuration!`);
              }}
              className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" /> Sync Count ({detectionResult.totalDetectedCount})
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Satellite Polygon Map */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-inner relative h-[420px]">
        {isDrawing && (
          <div className="absolute top-3 left-3 z-[400] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-primary/30 shadow-md text-xs font-semibold text-primary flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Click on map to add vertex ({drawPoints.length} added)
          </div>
        )}

        <MapContainer
          center={[17.6845, 74.0120]}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <MapResizer />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri World Imagery"
          />

          {/* Click Handler for Drawing Mode */}
          <MapDrawingHandler isDrawing={isDrawing} onAddPoint={handleAddDrawPoint} />

          {/* Live Drawing Points & Polyline */}
          {isDrawing && drawPoints.length > 0 && (
            <>
              <Polyline
                positions={drawPoints}
                pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "4, 6" }}
              />
              {drawPoints.map((pt, idx) => (
                <Marker key={idx} position={pt} icon={vertexIcon}>
                  <Popup>Point #{idx + 1}</Popup>
                </Marker>
              ))}
            </>
          )}

          {/* Confirmed Cadastral Polygon Layer */}
          {!isDrawing && polygonCoords.length >= 3 && (
            <Polygon
              positions={polygonCoords}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 0.32,
                weight: 3.5,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1">
                  <div className="font-bold text-foreground">{plotName}</div>
                  <div className="text-muted-foreground">📍 {district} District</div>
                  <div className="text-emerald-600 font-semibold">
                    🌾 Acreage: {metrics.acres} Acres ({metrics.hectares} Ha)
                  </div>
                  <div className="text-primary font-semibold">
                    🌳 Detected Trees: {detectionResult?.totalDetectedCount ?? treeCount}
                  </div>
                  <div className="text-sky-600 font-semibold">
                    ✨ Est. Sequestration: {metrics.annualCo2MetricTons} MT CO₂e
                  </div>
                </div>
              </Popup>
            </Polygon>
          )}

          {/* Detected Tree Markers inside Polygon */}
          {detectionResult &&
            detectionResult.insideTrees.map((t) => (
              <Marker key={t.id} position={[t.latitude, t.longitude]} icon={detectedTreePinIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="text-emerald-600 block">🌳 {t.name}</strong>
                    <span className="text-muted-foreground">{t.species}</span>
                  </div>
                </Popup>
              </Marker>
            ))}

          <MapBoundsUpdater coords={isDrawing && drawPoints.length >= 3 ? drawPoints : polygonCoords} />
        </MapContainer>
      </div>

      {/* Live Ecological & Biomass Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border/40 text-center">
          <div className="text-[11px] text-muted-foreground">Plot Area (Calculated)</div>
          <div className="font-heading font-bold text-lg sm:text-xl text-primary mt-0.5">
            {metrics.acres} <span className="text-xs font-normal">Acres</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{metrics.hectares} Hectares ({Math.round(areaSqM).toLocaleString()} m²)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/40 text-center">
          <div className="text-[11px] text-muted-foreground">Trees in Boundary</div>
          <div className="font-heading font-bold text-lg sm:text-xl text-emerald-600 mt-0.5">
            {detectionResult?.totalDetectedCount ?? treeCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Density: {metrics.densityPerHectare} trees/Ha</div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/40 text-center">
          <div className="text-[11px] text-muted-foreground">Est. Carbon Sequestered</div>
          <div className="font-heading font-bold text-lg sm:text-xl text-sky-600 mt-0.5">
            {metrics.annualCo2MetricTons} <span className="text-xs font-normal">MT/yr</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">IPCC Allometric Model</div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/40 text-center">
          <div className="text-[11px] text-muted-foreground">Sentinel-2 NDVI Vigor</div>
          <div className="font-heading font-bold text-lg sm:text-xl text-foreground mt-0.5">
            {metrics.ndviScore}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Dense Thriving Canopy</div>
        </div>
      </div>
    </div>
  );
}
