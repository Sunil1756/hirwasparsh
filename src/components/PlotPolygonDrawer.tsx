import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculatePlotMetrics } from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { parseKmlString, parseGeoJsonString, ParcelBoundaryResult } from "@/lib/kmlParser";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/helpers";
import turfArea from "@turf/area";
import { toast } from "sonner";

interface Props {
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

export function PlotPolygonDrawer({ onPlotSaved }: Props) {
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

  // Calculate live metrics
  const metrics = calculatePlotMetrics({
    areaSquareMeters: areaSqM,
    treeCount,
    averageAgeMonths: avgAgeMonths,
  });

  // Calculate area from polygon points using Turf.js safely
  const recalculateFromPoints = (points: [number, number][]) => {
    if (points.length < 3) return;

    try {
      const turfCoords = points.map((p) => [p[1], p[0]]); // [lng, lat]
      if (
        turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
        turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
      ) {
        turfCoords.push([...turfCoords[0]]);
      }

      const poly = turf.polygon([turfCoords]);
      const areaFn = typeof turfArea === "function" ? turfArea : (turfArea as any).default;
      const area = Math.round(areaFn(poly));
      if (area > 50) {
        setAreaSqM(area);
      }
    } catch (e) {
      console.warn("Area calculation error:", e);
    }
  };

  // Add point in drawing mode
  const handleAddDrawPoint = (lat: number, lng: number) => {
    const next = [...drawPoints, [lat, lng] as [number, number]];
    setDrawPoints(next);
    if (next.length >= 3) {
      recalculateFromPoints(next);
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
    recalculateFromPoints(closed);
    setIsDrawing(false);
    setDrawPoints([]);
    toast.success("✅ Custom Parcel Boundary Saved & Area Computed!");
  };

  // Undo last point
  const handleUndoPoint = () => {
    if (drawPoints.length === 0) return;
    const next = drawPoints.slice(0, -1);
    setDrawPoints(next);
    if (next.length >= 3) {
      recalculateFromPoints(next);
    }
  };

  // Load a preset parcel
  const handleSelectPreset = (key: string) => {
    const preset = PRESET_PARCELS[key];
    if (!preset) return;

    setPlotName(preset.name);
    setDistrict(preset.district);
    setTreeCount(preset.trees);
    setAvgAgeMonths(preset.ageMonths);
    setPolygonCoords(preset.coords);
    recalculateFromPoints(preset.coords);
    setIsDrawing(false);
    setDrawPoints([]);
    setKmlData(null);
    toast.success(`Loaded ${preset.name} (${preset.district})!`);
  };

  // Handle KML / GeoJSON File Upload
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
      toast.success(`✅ Parsed ${res.acres} Acres (${res.hectares} Ha) from ${file.name}!`);
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

    const turfCoords = polygonCoords.map((p) => [p[1], p[0]]); // [lng, lat]
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
            estimated_co2_tons: metrics.estimatedCo2Tons,
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
              <h3 className="font-heading font-bold text-lg sm:text-xl">
                Forest Survey & Cadastral Boundary Modeler (Module D)
              </h3>
              <p className="text-xs text-muted-foreground">
                Interactive parcel drawing on Sentinel-2 satellite imagery, KML/GeoJSON survey parser, and carbon yield estimation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isDrawing ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishDrawing}
                className="rounded-xl gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Save Boundary ({drawPoints.length} pts)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoPoint}
                disabled={drawPoints.length === 0}
                className="rounded-xl gap-1 text-xs"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDrawing(false);
                  setDrawPoints([]);
                }}
                className="rounded-xl text-xs text-rose-500 hover:bg-rose-500/10"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsDrawing(true);
                  setDrawPoints([]);
                  toast.info("🖱️ Click on the satellite map to draw your farm boundary corners!");
                }}
                className="rounded-xl gap-1.5 text-xs font-semibold shadow-sm"
              >
                <Pencil className="h-3.5 w-3.5" /> ✏️ Draw Boundary
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".kml, .geojson, .json, .xml"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl gap-1.5 border-primary/30 text-xs font-semibold"
              >
                <Upload className="h-3.5 w-3.5 text-primary" /> Import KML / GeoJSON
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportGeoJSON}
                className="rounded-xl gap-1.5 border-primary/30 text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5 text-primary" /> Export GeoJSON
              </Button>
            </>
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

      {/* Drawing Instructions Alert Banner */}
      {isDrawing && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Drawing Mode Active:</strong> Click on the satellite map to add corners. Vertices added:{" "}
              <strong>{drawPoints.length}</strong> (Minimum 3 required).
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleFinishDrawing}
            disabled={drawPoints.length < 3}
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
          >
            Finish & Save
          </Button>
        </div>
      )}

      {/* Interactive Satellite Polygon Map (Always Visible & Active) */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-inner relative">
        {isDrawing && (
          <div className="absolute top-3 left-3 z-[400] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-primary/30 shadow-md text-xs font-semibold text-primary flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Click on map to add vertex
          </div>
        )}

        <MapContainer
          center={[17.6845, 74.0120]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: "380px", width: "100%" }}
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
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.28,
                weight: 3,
                dashArray: "3, 6",
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-foreground">{plotName}</div>
                  <div className="text-muted-foreground">📍 {district} District</div>
                  <div className="text-emerald-600 font-semibold">🌾 Acreage: {metrics.acres} Acres ({metrics.hectares} Ha)</div>
                  <div>🌲 Density: {metrics.densityPerHectare} trees / Ha</div>
                  <div className="text-sky-600 font-semibold">✨ Est. Sequestration: {metrics.estimatedCo2Tons} MT CO₂e</div>
                </div>
              </Popup>
            </Polygon>
          )}

          <MapBoundsUpdater coords={isDrawing && drawPoints.length >= 3 ? drawPoints : polygonCoords} />
        </MapContainer>
      </div>

      {/* Plot Configuration Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Parcel / Farm Name</label>
          <input
            type="text"
            value={plotName}
            onChange={(e) => setPlotName(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">District / Agro-Zone</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Tree Inventory Count</label>
          <input
            type="number"
            value={treeCount}
            onChange={(e) => setTreeCount(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Area Slider Control */}
      <div className="p-3.5 rounded-xl bg-background/60 border border-primary/15 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Fine-Tune Parcel Surface Area:</span>
          <span className="font-bold text-primary text-sm">
            {metrics.acres} Acres ({metrics.hectares} Hectares · {areaSqM.toLocaleString()} m²)
          </span>
        </div>
        <input
          type="range"
          min={4047}
          max={202343}
          step={500}
          value={areaSqM}
          onChange={(e) => setAreaSqM(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
      </div>

      {/* 4 Computed Scientific Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Canopy Coverage</div>
          <div className="text-lg sm:text-xl font-bold text-primary mt-0.5">{metrics.canopyCoverPercent}%</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">NDVI Index: {metrics.ndviScore}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Stand Tree Density</div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{metrics.densityPerHectare} / Ha</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Optimal: 400-600/Ha</div>
        </div>

        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Annual Biomass CO₂</div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.estimatedCo2Tons} MT
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">IPCC Pantropical Tier-2</div>
        </div>

        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Carbon Valuation</div>
          <div className="text-lg sm:text-xl font-bold text-primary mt-0.5">
            ₹{metrics.carbonCreditValuationInr.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">@ ₹1,200 / MT CO₂e</div>
        </div>
      </div>

      {/* AI Gemini Parcel Diagnostic Button & Report */}
      <div className="pt-2 border-t border-primary/15 space-y-3">
        <Button
          onClick={handleRunAiAnalysis}
          disabled={analyzing}
          className="rounded-xl gap-2 text-xs font-semibold shadow-md w-full sm:w-auto"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing Multi-Spectral Parcel Geometry...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Run AI Parcel Health Diagnostic (Gemini 2.5)
            </>
          )}
        </Button>

        {aiReport && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-2">
            <div className="font-semibold text-primary flex items-center gap-1.5 text-sm">
              <Bot className="h-4 w-4" /> AI Agroforestry & Biodiversity Recommendation:
            </div>
            <p className="text-foreground/90 leading-relaxed">{aiReport.summary || aiReport.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
