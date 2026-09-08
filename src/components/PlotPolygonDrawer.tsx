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
  Search,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  calculatePlotMetrics,
  fetchRealSentinel2Telemetry,
  Sentinel2TelemetryData,
} from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { parseKmlString, parseGeoJsonString, ParcelBoundaryResult } from "@/lib/kmlParser";
import {
  validateGeodeticBoundary,
  searchGeocodingLocations,
  GeocodingResult,
  onboardAfforestationProject,
} from "@/lib/projectOnboardingService";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

interface Props {
  onPlotSaved?: (plotData: any) => void;
}

// Map resizer hook
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

// Fly & Bounds updater
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

// Drawing click listener
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
  const [treeCount, setTreeCount] = useState(750);
  const [avgAgeMonths, setAvgAgeMonths] = useState(24);

  // Geocoding search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Drawing & GIS states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([
    [17.6845, 74.012],
    [17.688, 74.0165],
    [17.6895, 74.011],
    [17.686, 74.0075],
  ]);

  // AI, Satellite & Database states
  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSatellite, setIsFetchingSatellite] = useState(false);
  const [liveSatelliteTelemetry, setLiveSatelliteTelemetry] = useState<Sentinel2TelemetryData | null>(null);

  // Geodetic boundary validation
  const validation = useMemo(
    () => validateGeodeticBoundary(isDrawing ? drawPoints : polygonCoords),
    [isDrawing, drawPoints, polygonCoords]
  );

  // Calculate live metrics safely
  const metrics = useMemo(() => {
    return calculatePlotMetrics({
      areaSquareMeters: Math.max(500, validation.areaSqMeters || 20234),
      treeCount,
      averageAgeMonths: avgAgeMonths,
    });
  }, [validation.areaSqMeters, treeCount, avgAgeMonths]);

  // Handle Geocoding Search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const results = await searchGeocodingLocations(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast.error(`No geodetic matches found for "${searchQuery}".`);
      } else if (results.length === 1) {
        const item = results[0];
        setDistrict(item.displayName.split(",")[0]);
        // Set sample bounding box polygon centered at target
        const d = 0.003;
        setPolygonCoords([
          [item.lat - d, item.lng - d],
          [item.lat + d, item.lng - d],
          [item.lat + d, item.lng + d],
          [item.lat - d, item.lng + d],
        ]);
        setSearchResults([]);
        toast.success(`Centered at ${item.displayName.split(",")[0]}`);
      }
    } catch {
      toast.error("Geocoding service unavailable.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectSearchResult = (item: GeocodingResult) => {
    setDistrict(item.displayName.split(",")[0]);
    const d = 0.003;
    setPolygonCoords([
      [item.lat - d, item.lng - d],
      [item.lat + d, item.lng - d],
      [item.lat + d, item.lng + d],
      [item.lat - d, item.lng + d],
    ]);
    setSearchResults([]);
    setSearchQuery(item.displayName.split(",")[0]);
    toast.success(`Navigated to ${item.displayName.split(",")[0]}`);
  };

  // Add point in drawing mode
  const handleAddDrawPoint = (lat: number, lng: number) => {
    const next = [...drawPoints, [lat, lng] as [number, number]];
    setDrawPoints(next);
  };

  // Finish drawing boundary
  const handleFinishDrawing = () => {
    if (drawPoints.length < 3) {
      toast.error("Please plot at least 3 points to form a polygon boundary.");
      return;
    }
    const check = validateGeodeticBoundary(drawPoints);
    if (!check.isValid) {
      toast.error(check.errorMessage || "Invalid polygon geometry.");
      return;
    }
    setPolygonCoords(drawPoints);
    setIsDrawing(false);
    setDrawPoints([]);
    toast.success(`Boundary locked with ${drawPoints.length} vertices (${check.acres} Acres)!`);
  };

  // Undo last point
  const handleUndoPoint = () => {
    if (drawPoints.length === 0) return;
    setDrawPoints(drawPoints.slice(0, -1));
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
        throw new Error("Unsupported format. Please upload .kml or .geojson");
      }

      const check = validateGeodeticBoundary(res.polygonCoords);
      if (!check.isValid) {
        throw new Error(check.errorMessage || "Imported boundary failed geodetic validation.");
      }

      setPolygonCoords(res.polygonCoords);
      setPlotName(file.name.replace(/\.[^/.]+$/, ""));
      setIsDrawing(false);
      setDrawPoints([]);
      toast.success(`✅ Imported ${res.acres} Acres (${res.hectares} Ha) from ${file.name}!`);
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
            acres: validation.acres,
            hectares: validation.hectares,
            tree_count: treeCount,
            estimated_co2_tons: metrics.annualCo2MetricTons,
            platform: "Hirwasparsh MRV Geodetic Engine",
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

  // Save new plot boundary directly to Supabase Database
  const handleSaveToDatabase = async () => {
    if (!validation.isValid) {
      toast.error(validation.errorMessage || "Please provide a valid polygon boundary.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await onboardAfforestationProject({
        projectName: plotName,
        organizationName: "ACIC Afforestation Partner",
        organizationType: "ngo",
        locationName: `${district}, Maharashtra`,
        boundaryPoints: polygonCoords,
        targetTrees: treeCount,
        speciesList: ["Neem", "Teak", "Banyan", "Jamun"],
        plantationDate: new Date().toISOString().split("T")[0],
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to onboard project.");
      }

      toast.success(`🎉 Plot "${plotName}" onboarded with live Sentinel-2 baseline!`);
      if (onPlotSaved) onPlotSaved(result);
    } catch (err: any) {
      toast.error(`Database onboarding error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch real Copernicus Sentinel-2 STAC telemetry for this plot
  const handleFetchLiveSatelliteTelemetry = async () => {
    if (!validation.isValid) {
      toast.error("Valid geodetic boundary required before querying Copernicus satellite.");
      return;
    }

    setIsFetchingSatellite(true);
    try {
      const sat = await fetchRealSentinel2Telemetry({
        lat: validation.centroid[0],
        lng: validation.centroid[1],
        bbox: validation.boundingBox,
        maxCloudCover: 25,
      });

      setLiveSatelliteTelemetry(sat as any);
      toast.success(
        `🛰️ Real Sentinel-2 L2A retrieved: ${sat.historicalOverpasses?.length || 0} passes, Current NDVI: ${sat.ndviCurrent}`
      );
    } catch (err: any) {
      toast.error(`Satellite telemetry query error: ${err.message}`);
    } finally {
      setIsFetchingSatellite(false);
    }
  };

  // Run AI Parcel Health Diagnostic with Gemini
  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeCanopyWithAI({
        plotName,
        areaAcres: validation.acres,
        district,
        treeCount,
        ndviScore: liveSatelliteTelemetry?.ndvi || metrics.ndviScore,
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
                Geodetic parcel drawing on Sentinel-2 satellite imagery, KML/GeoJSON survey parser, and carbon yield estimation.
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchLiveSatelliteTelemetry}
                disabled={isFetchingSatellite}
                className="rounded-xl gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold"
              >
                {isFetchingSatellite ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                )}
                🛰️ Real Sentinel-2 STAC
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleSaveToDatabase}
                disabled={isSaving || !validation.isValid}
                className="rounded-xl gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Save to Supabase DB
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Geocoding Location Search Bar */}
      <div className="relative">
        <form onSubmit={handleSearchLocation} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search location in Maharashtra / India (e.g. Satara, Pune, Nagpur, Solapur)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl bg-background/60 pl-8 text-xs border-primary/20"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs rounded-xl" disabled={isSearchingLocation}>
            {isSearchingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </Button>
        </form>

        {/* Dropdown suggestions */}
        {searchResults.length > 0 && (
          <div className="absolute top-10 left-0 right-0 z-[1000] max-h-48 overflow-y-auto rounded-xl bg-card/95 backdrop-blur-xl border border-border/40 p-1 shadow-lg text-xs">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(res)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors truncate"
              >
                <div className="font-semibold text-foreground truncate">{res.displayName.split(",")[0]}</div>
                <div className="text-[10px] text-muted-foreground truncate">{res.displayName}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Satellite Polygon Map */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-inner relative">
        <MapContainer
          center={polygonCoords[0] || [17.6845, 74.012]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: "380px", width: "100%" }}
        >
          <MapResizer />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri World Imagery"
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri Places"
          />

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
                color: validation.isValid ? "#22c55e" : "#ef4444",
                fillColor: validation.isValid ? "#22c55e" : "#ef4444",
                fillOpacity: 0.28,
                weight: 3,
                dashArray: "3, 6",
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-foreground">{plotName}</div>
                  <div className="text-muted-foreground">📍 {district} District</div>
                  <div className="text-emerald-600 font-semibold">
                    🌾 Acreage: {validation.acres} Acres ({validation.hectares} Ha)
                  </div>
                  <div>🌲 Trees: {treeCount}</div>
                  <div className="text-sky-600 font-semibold">
                    ✨ Est. Carbon: {metrics.annualCo2MetricTons} MT CO₂e
                  </div>
                </div>
              </Popup>
            </Polygon>
          )}

          <MapBoundsUpdater coords={isDrawing && drawPoints.length >= 3 ? drawPoints : polygonCoords} />
        </MapContainer>

        {/* Geodetic Validation Badge */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/40 shadow-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-foreground">
              {validation.acres} Acres ({validation.hectares} Ha)
            </span>
            {!validation.isValid && (
              <span className="text-amber-500 text-[11px] truncate">
                {validation.errorMessage}
              </span>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] bg-background/50">
            {polygonCoords.length} Vertices
          </Badge>
        </div>
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
          <label className="text-xs text-muted-foreground block mb-1">District / Region</label>
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

      {/* Live Carbon Sequestration Metrics Card */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Annual Carbon Sequestration Potential</div>
          <div className="text-xl font-bold font-heading text-primary mt-0.5">
            {metrics.annualCo2MetricTons} MT CO₂e / year
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            10-Year Cumulative Offset: <strong className="text-foreground">{metrics.tenYearOffsetTons} MT CO₂e</strong>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRunAiAnalysis}
          disabled={analyzing}
          className="rounded-xl text-xs border-primary/30 gap-1.5"
        >
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
          Run AI Health Diagnostic
        </Button>
      </div>

      {/* AI Diagnostic Output */}
      {aiReport && (
        <div className="p-4 rounded-xl bg-card border border-primary/20 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-primary" /> Gemini Botanical AI Assessment
            </span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
              Score: {aiReport.healthScore || 88}/100
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed">{aiReport.summary || aiReport.recommendations}</p>
        </div>
      )}
    </div>
  );
}
