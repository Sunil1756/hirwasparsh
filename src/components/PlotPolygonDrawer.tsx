import { useState, useRef } from "react";
import {
  MapPin, Sparkles, ShieldCheck, FileText, Trees, PieChart, RefreshCw,
  Upload, Compass, CheckCircle2, AlertTriangle, Layers, Ruler, Bot, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculatePlotMetrics } from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { parseKmlString, parseGeoJsonString, ParcelBoundaryResult } from "@/lib/kmlParser";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

interface Props {
  onPlotSaved?: (plotData: any) => void;
}

// Helper to auto-fit map bounds to polygon
function MapBoundsUpdater({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  if (coords.length > 0) {
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  return null;
}

export function PlotPolygonDrawer({ onPlotSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plotName, setPlotName] = useState("Sahyadri Biodiversity Agro-Plot");
  const [district, setDistrict] = useState("Satara");
  const [areaSqM, setAreaSqM] = useState(16187); // ~4 acres
  const [treeCount, setTreeCount] = useState(650);
  const [avgAgeMonths, setAvgAgeMonths] = useState(18);

  const [kmlData, setKmlData] = useState<ParcelBoundaryResult | null>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const metrics = calculatePlotMetrics({
    areaSquareMeters: areaSqM,
    treeCount,
    averageAgeMonths: avgAgeMonths,
  });

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
        throw new Error("Unsupported format. Please upload .KML or .GeoJSON.");
      }

      setKmlData(res);
      setAreaSqM(Math.round(res.areaSqMeters));
      setPlotName(file.name.replace(/\.[^/.]+$/, ""));
      toast.success(`Parsed ${res.acres} Acres (${res.hectares} Ha) from ${file.name}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Boundary upload failed: ${err.message}`);
    }
  };

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
      toast.success("AI Parcel Analysis Complete!");
    } catch (e: any) {
      toast.error("Failed to run analysis: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">
              Module D: Forest Survey Boundary & Cadastral Parcel Modeler
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Import Google Earth KML / GeoJSON survey boundaries or simulate farm acreage and carbon yield.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className="rounded-xl gap-2 border-primary/30 text-xs font-semibold"
          >
            <Upload className="h-4 w-4 text-primary" /> Upload KML / GeoJSON
          </Button>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 hidden sm:inline-flex">
            Turf.js + GIS Engine
          </Badge>
        </div>
      </div>

      {/* Uploaded File Banner */}
      {kmlData && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Loaded <strong>{kmlData.fileName}</strong>: {kmlData.acres} Acres ({kmlData.hectares} Ha) · Perimeter: {kmlData.perimeterKm} km
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setKmlData(null)}
            className="h-7 text-xs text-muted-foreground"
          >
            Reset
          </Button>
        </div>
      )}

      {/* Interactive Satellite Polygon Map (if KML loaded) */}
      {kmlData && (
        <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-md">
          <MapContainer
            center={kmlData.centerCoords}
            zoom={14}
            scrollWheelZoom={false}
            style={{ height: "300px", width: "100%" }}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <Polygon
              positions={kmlData.polygonCoords}
              pathOptions={{
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.25,
                weight: 3,
                dashArray: "4 4",
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold">{plotName}</div>
                  <div>🌾 Area: {kmlData.acres} Acres</div>
                  <div>🌲 Density: {Math.round(treeCount / (kmlData.hectares || 1))} trees/Ha</div>
                </div>
              </Popup>
            </Polygon>
            <MapBoundsUpdater coords={kmlData.polygonCoords} />
          </MapContainer>
        </div>
      )}

      {/* Plot Configuration Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Plot Name</label>
          <input
            type="text"
            value={plotName}
            onChange={(e) => setPlotName(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">District / Region</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Planted Tree Count</label>
          <input
            type="number"
            value={treeCount}
            onChange={(e) => setTreeCount(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Area Sliders */}
      <div className="p-3 rounded-xl bg-background/50 border border-primary/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Adjust Area Size</span>
          <span className="font-semibold text-primary">{metrics.acres} Acres ({metrics.hectares} Ha)</span>
        </div>
        <input
          type="range"
          min={4047}
          max={202343}
          step={1000}
          value={areaSqM}
          onChange={(e) => setAreaSqM(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Computed Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <div className="text-[11px] text-muted-foreground">Canopy Cover</div>
          <div className="text-lg font-bold text-primary mt-0.5">{metrics.canopyCoverPercent}%</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <div className="text-[11px] text-muted-foreground">Tree Density</div>
          <div className="text-lg font-bold text-foreground mt-0.5">{metrics.densityPerHectare}/Ha</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <div className="text-[11px] text-muted-foreground">Annual CO₂</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.estimatedCo2Tons} MT</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <div className="text-[11px] text-muted-foreground">Carbon Credits</div>
          <div className="text-lg font-bold text-primary mt-0.5">₹{metrics.carbonCreditValuationInr.toLocaleString()}</div>
        </div>
      </div>

      {/* AI Parcel Diagnosis Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-primary/15">
        <Button
          onClick={handleRunAiAnalysis}
          disabled={analyzing}
          className="rounded-xl gap-2 text-xs font-semibold shadow-md"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing Satellite Geometry...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Run AI Parcel Health Diagnostic (Gemini)
            </>
          )}
        </Button>

        {aiReport && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs w-full mt-2 space-y-1">
            <div className="font-semibold text-primary flex items-center gap-1.5">
              <Bot className="h-4 w-4" /> AI Agroforestry Recommendation:
            </div>
            <p className="text-foreground/90">{aiReport.summary || aiReport.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
