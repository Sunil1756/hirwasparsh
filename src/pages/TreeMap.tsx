import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, TreePine, Filter, Search, ShieldCheck, Clock, Loader2,
  Plane, Layers, Activity, Camera, Bot, X, Sparkles, TrendingUp, AlertTriangle, Satellite, Compass
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { AgroWeatherWidget } from "@/components/AgroWeatherWidget";
import { NDVISpectralViewer } from "@/components/NDVISpectralViewer";
import { PlotPolygonDrawer } from "@/components/PlotPolygonDrawer";
import { CanopyNDVITimeSeriesChart } from "@/components/CanopyNDVITimeSeriesChart";
import { AllometricCarbonCalculator } from "@/components/AllometricCarbonCalculator";
import { FieldScoutingModule } from "@/components/FieldScoutingModule";
import { ESGReportModal } from "@/components/ESGReportModal";
import { GeminiApiKeyModal } from "@/components/GeminiApiKeyModal";

// Glowing pulse marker via DivIcon
const makeGlowIcon = (color: string) =>
  L.divIcon({
    className: "tree-glow-marker",
    html: `<span class="tgm-pulse" style="--c:${color}"></span><span class="tgm-dot" style="--c:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });

const verifiedIcon = makeGlowIcon("#22c55e");
const pendingIcon = makeGlowIcon("#f59e0b");
const rejectedIcon = makeGlowIcon("#ef4444");
const getIcon = (status: string) =>
  status === "verified" || status === "approved" ? verifiedIcon : status === "rejected" ? rejectedIcon : pendingIcon;

const fetchTrees = async () => {
  const { data, error } = await supabase
    .from("trees")
    .select("id, tree_name, species, location, latitude, longitude, verification_status, admin_status, ai_confidence, created_at, photo_url, height_cm, plantation_date")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

const MH_CENTER: [number, number] = [19.7515, 75.7139];

// Heatmap layer component
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
  const map = useMap();
  useMemo(() => {
    if (points.length === 0) return;
    const heat = (L as any).heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 12,
      gradient: { 0.2: "#ef4444", 0.4: "#eab308", 0.6: "#84cc16", 0.8: "#22c55e", 1: "#166534" },
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
};

const TreeMap = () => {
  // Main View Mode Toggle: "interactive" or "satellite_gis"
  const [activeView, setActiveView] = useState<"interactive" | "satellite_gis">("interactive");

  // Interactive Tree Map Filters
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Satellite GIS Filters
  const [spectralLayer, setSpectralLayer] = useState<"rgb" | "ndvi" | "ndre" | "ndwi">("ndvi");
  const [satelliteViewMode, setSatelliteViewMode] = useState<"markers" | "heatmap">("markers");

  const { data: trees = [], isLoading } = useQuery({ queryKey: ["trees"], queryFn: fetchTrees });

  const speciesOptions = useMemo(
    () => Array.from(new Set(trees.map((t) => t.species).filter(Boolean))).sort(),
    [trees],
  );

  // Dynamic real data computations (Strictly 0 if database is empty)
  const totalTreesCount = trees.length;
  const verifiedTrees = trees.filter(
    (t) => t.verification_status === "verified" || t.admin_status === "approved"
  );
  const verifiedCount = verifiedTrees.length;
  const survivalRate = totalTreesCount > 0 ? Math.round((verifiedCount / totalTreesCount) * 100) : 0;
  const totalCo2Kg = verifiedCount * 22; // 22 kg / mature tree / year
  const totalCo2MetricTons = (totalCo2Kg / 1000).toFixed(2);

  // Filtered Trees for Interactive Map
  const filtered = useMemo(() => trees.filter((t) => {
    const stageOk =
      stageFilter === "all" ||
      (stageFilter === "sapling" && (t.height_cm ?? 0) < 100) ||
      (stageFilter === "young" && (t.height_cm ?? 0) >= 100 && (t.height_cm ?? 0) < 300) ||
      (stageFilter === "mature" && (t.height_cm ?? 0) >= 300);
    const speciesOk = speciesFilter === "all" || t.species === speciesFilter;
    const statusOk =
      statusFilter === "all" ||
      (statusFilter === "verified" && (t.verification_status === "verified" || t.admin_status === "approved")) ||
      (statusFilter === "pending" && (t.verification_status === "pending" || t.admin_status === "pending")) ||
      (statusFilter === "rejected" && (t.verification_status === "rejected" || t.admin_status === "rejected"));
    const dateOk = (() => {
      if (dateFilter === "all") return true;
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      const cutoff = Date.now() - days * 86400000;
      return new Date(t.created_at).getTime() >= cutoff;
    })();
    const textOk =
      !filter ||
      t.tree_name.toLowerCase().includes(filter.toLowerCase()) ||
      t.species.toLowerCase().includes(filter.toLowerCase()) ||
      (t.location && t.location.toLowerCase().includes(filter.toLowerCase()));
    return stageOk && speciesOk && statusOk && dateOk && textOk;
  }), [trees, stageFilter, speciesFilter, statusFilter, dateFilter, filter]);

  // Heat points for satellite view
  const heatPoints: [number, number, number][] = trees
    .filter((t) => t.latitude && t.longitude)
    .map((t) => [t.latitude!, t.longitude!, t.admin_status === "approved" || t.verification_status === "verified" ? 1 : 0.4]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <TreePine className="h-8 w-8 text-primary" />
                <h1 className="font-heading text-3xl sm:text-4xl font-bold">
                  Agroforestry GIS & Tree Map
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time plantation tracking, live satellite NDVI spectral analysis, and field intelligence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <GeminiApiKeyModal />
              <ESGReportModal
                totalTrees={totalTreesCount}
                verifiedTrees={verifiedCount}
                organizationName="Maharashtra Community Agroforestry Drive"
                co2OffsetKg={totalCo2Kg}
              />
            </div>
          </div>

          {/* DUAL MODE SELECTOR TABS */}
          <div className="flex items-center justify-center sm:justify-start gap-2 p-1.5 rounded-2xl bg-muted/60 border border-primary/15 w-fit mb-6">
            <button
              onClick={() => setActiveView("interactive")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeView === "interactive"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Interactive Tree Map
            </button>

            <button
              onClick={() => setActiveView("satellite_gis")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeView === "satellite_gis"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Satellite className="h-4 w-4" />
              Satellite GIS & Telemetry (Map My Crop)
            </button>
          </div>

          {/* REAL DATA KPI CARDS (Shows exactly 0 when no data, real counts as user plants) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="glass-card rounded-2xl p-4 text-center border border-primary/10">
              <div className="text-xs text-muted-foreground">Total Planted Trees</div>
              <div className="font-heading text-2xl font-bold text-primary mt-1">
                {totalTreesCount.toLocaleString()}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-primary/10">
              <div className="text-xs text-muted-foreground">Verified Surviving</div>
              <div className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {verifiedCount.toLocaleString()}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-primary/10">
              <div className="text-xs text-muted-foreground">Survival Rate</div>
              <div className="font-heading text-2xl font-bold text-foreground mt-1">
                {totalTreesCount > 0 ? `${survivalRate}%` : "0% (No data yet)"}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-primary/10">
              <div className="text-xs text-muted-foreground">Annual CO₂ Sequestered</div>
              <div className="font-heading text-2xl font-bold text-primary mt-1">
                {totalCo2MetricTons} MT
              </div>
            </div>
          </div>

          {/* TAB 1: INTERACTIVE TREE MAP */}
          {activeView === "interactive" && (
            <div className="space-y-6">
              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tree name, species, location..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9 rounded-xl border-primary/20"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-36 rounded-xl">
                    <SelectValue placeholder="Growth Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="sapling">Sapling (&lt;1m)</SelectItem>
                    <SelectItem value="young">Young (1-3m)</SelectItem>
                    <SelectItem value="mature">Mature (&gt;3m)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue placeholder="All Species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Species</SelectItem>
                    {speciesOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Map Canvas */}
              <div className="glass-card rounded-2xl overflow-hidden border border-primary/20 shadow-lg">
                {isLoading ? (
                  <div className="h-[480px] flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                ) : (
                  <MapContainer
                    center={MH_CENTER}
                    zoom={7}
                    scrollWheelZoom
                    style={{ height: "480px", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {filtered.filter((t) => t.latitude && t.longitude).map((t) => (
                      <Marker
                        key={t.id}
                        position={[t.latitude!, t.longitude!]}
                        icon={getIcon(t.verification_status || t.admin_status || "pending")}
                      >
                        <Popup>
                          <div className="text-xs space-y-1.5 min-w-[200px]">
                            <div className="font-bold text-sm text-foreground">{t.tree_name}</div>
                            <div className="text-muted-foreground">🌿 {t.species}</div>
                            <div>📍 {t.location}</div>
                            <div>📅 {new Date(t.plantation_date || t.created_at).toLocaleDateString()}</div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <Badge variant="outline" className="text-[10px]">
                                {t.verification_status === "verified" || t.admin_status === "approved" ? "Verified" : "Pending"}
                              </Badge>
                              {t.height_cm && <span className="text-[11px] text-muted-foreground">{t.height_cm} cm</span>}
                            </div>
                            {t.photo_url && (
                              <img src={t.photo_url} alt={t.tree_name} className="w-full h-20 object-cover rounded-lg mt-1 border" />
                            )}
                            <Link to={`/tree/${t.id}`} className="block text-primary hover:underline text-center pt-1 font-semibold">
                              View Digital Passport →
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* Planted Tree Cards Grid */}
              <div className="mt-8">
                <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-primary" /> Planted Trees Directory
                </h3>

                {filtered.length === 0 ? (
                  <div className="p-8 text-center glass-card rounded-2xl border border-primary/10">
                    <TreePine className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {totalTreesCount === 0
                        ? "No trees planted in the database yet. Click 'Plant a Tree' to plant your first sapling!"
                        : "No trees match the current search filters."}
                    </p>
                    {totalTreesCount === 0 && (
                      <Link to="/plant/individual" className="inline-block mt-3">
                        <Button size="sm" className="rounded-xl">Plant Your First Tree</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.slice(0, 12).map((t) => (
                      <Link
                        key={t.id}
                        to={`/tree/${t.id}`}
                        className="block glass-card rounded-2xl p-4 hover:border-primary/40 transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 rounded-xl p-2.5 text-primary shrink-0">
                            <TreePine className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-heading font-semibold text-sm truncate">{t.tree_name}</h4>
                              <Badge
                                variant={t.verification_status === "verified" || t.admin_status === "approved" ? "default" : "secondary"}
                                className="text-[10px] shrink-0"
                              >
                                {t.verification_status === "verified" || t.admin_status === "approved" ? "Verified" : "Pending"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{t.species}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {t.location || "Maharashtra"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SATELLITE GIS & MAP MY CROP TELEMETRY */}
          {activeView === "satellite_gis" && (
            <div className="space-y-8">
              {/* Spectral Map & Controls */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Satellite className="h-5 w-5 text-primary" />
                    <h3 className="font-heading font-semibold text-base">Sentinel-2 Satellite Remote Sensing</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={satelliteViewMode} onValueChange={(v: any) => setSatelliteViewMode(v)}>
                      <SelectTrigger className="w-36 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="markers" className="text-xs">Satellite Pins</SelectItem>
                        <SelectItem value="heatmap" className="text-xs">NDVI Heatmap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-primary/20 shadow-lg">
                  <MapContainer
                    center={MH_CENTER}
                    zoom={7}
                    scrollWheelZoom
                    style={{ height: "480px", width: "100%" }}
                  >
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

                    {satelliteViewMode === "heatmap" ? (
                      <HeatmapLayer points={heatPoints} />
                    ) : (
                      trees.filter((t) => t.latitude && t.longitude).map((t) => (
                        <CircleMarker
                          key={t.id}
                          center={[t.latitude!, t.longitude!]}
                          radius={7}
                          pathOptions={{
                            color: t.admin_status === "approved" || t.verification_status === "verified" ? "#22c55e" : "#f59e0b",
                            fillOpacity: 0.85,
                            weight: 2,
                          }}
                        >
                          <Popup>
                            <div className="text-xs space-y-1 min-w-[180px]">
                              <div className="font-bold">{t.tree_name}</div>
                              <div>🌿 {t.species}</div>
                              <div>📍 {t.location}</div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Spectral Viewer & Live Agro-Weather Telemetry */}
              <div className="grid lg:grid-cols-2 gap-6">
                <NDVISpectralViewer
                  activeLayerId={spectralLayer}
                  onLayerChange={setSpectralLayer}
                  meanNdvi={totalTreesCount > 0 ? 0.71 : 0.0}
                />
                <AgroWeatherWidget latitude={18.5204} longitude={73.8567} locationName="Maharashtra Region" />
              </div>

              {/* Parcel Boundary & Acreage Carbon Modeler (Turf.js) */}
              <PlotPolygonDrawer />

              {/* 36-Month Satellite Time Series & Scientific Carbon Engine */}
              <CanopyNDVITimeSeriesChart initialTreeCount={totalTreesCount > 0 ? totalTreesCount : 0} />
              <AllometricCarbonCalculator />

              {/* Field Scouting Anomaly Matrix */}
              <FieldScoutingModule />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TreeMap;
