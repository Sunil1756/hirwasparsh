import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  TreePine,
  Filter,
  Search,
  ShieldCheck,
  Clock,
  Loader2,
  Layers,
  Activity,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Satellite,
  ShieldAlert,
  Calendar,
  X,
  ExternalLink,
  Compass,
  CheckCircle2,
  Ruler,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { FieldScoutingModule } from "@/components/FieldScoutingModule";
import { ModuleASatelliteEngine } from "@/components/ModuleASatelliteEngine";

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
  status === "verified" ? verifiedIcon : status === "rejected" ? rejectedIcon : pendingIcon;

// Map tile layer options
const BASEMAP_TILES = {
  satellite: {
    name: "Satellite (ESRI)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  osm: {
    name: "Standard OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  topo: {
    name: "Topographic Relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
  },
};

const fetchTrees = async () => {
  const { data, error } = await supabase
    .from("trees")
    .select(
      "id, tree_name, species, location, latitude, longitude, verification_status, admin_status, ai_confidence, created_at, photo_url, height_cm"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

// Component to handle auto-panning map when filtered trees change
function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useMemo(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const TreeMap = () => {
  const [activeTab, setActiveTab] = useState<"tree_map" | "satellite_ndvi" | "field_scouting">(
    "tree_map"
  );
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [basemap, setBasemap] = useState<"satellite" | "osm" | "topo">("satellite");
  const [showProximityRings, setShowProximityRings] = useState(true);

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: fetchTrees,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["plantation-projects-treemap"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantation_projects").select("*");
      if (error) return [];
      return data || [];
    },
  });

  const speciesOptions = useMemo(
    () => Array.from(new Set(trees.map((t) => t.species).filter(Boolean))).sort(),
    [trees]
  );

  const filtered = useMemo(() => {
    return trees.filter((t) => {
      const stageOk =
        stageFilter === "all" ||
        (stageFilter === "sapling" && (t.height_cm ?? 0) < 100) ||
        (stageFilter === "young" && (t.height_cm ?? 0) >= 100 && (t.height_cm ?? 0) < 300) ||
        (stageFilter === "mature" && (t.height_cm ?? 0) >= 300);

      const speciesOk = speciesFilter === "all" || t.species === speciesFilter;

      const dateOk = (() => {
        if (dateFilter === "all") return true;
        const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
        const cutoff = Date.now() - days * 86400000;
        return new Date(t.created_at).getTime() >= cutoff;
      })();

      const statusOk = statusFilter === "all" || t.verification_status === statusFilter;

      const textMatch =
        filter === "" ||
        t.tree_name.toLowerCase().includes(filter.toLowerCase()) ||
        t.species.toLowerCase().includes(filter.toLowerCase()) ||
        t.location.toLowerCase().includes(filter.toLowerCase());

      return statusOk && stageOk && speciesOk && dateOk && textMatch;
    });
  }, [trees, statusFilter, stageFilter, speciesFilter, dateFilter, filter]);

  const treesWithCoords = useMemo(
    () => filtered.filter((t) => t.latitude && t.longitude),
    [filtered]
  );

  const center: [number, number] = useMemo(() => {
    if (treesWithCoords.length > 0) {
      return [treesWithCoords[0].latitude!, treesWithCoords[0].longitude!];
    }
    return [19.7515, 75.7139]; // Central Maharashtra coordinates
  }, [treesWithCoords]);

  const verifiedTrees = useMemo(
    () => trees.filter((t) => t.verification_status === "verified"),
    [trees]
  );

  const pendingTrees = useMemo(
    () => trees.filter((t) => t.verification_status === "pending" || !t.verification_status),
    [trees]
  );

  const totalCo2Kg = verifiedTrees.length * 22; // ~22 kg/tree/year average sequestration

  return (
    <div className="min-h-screen pt-24 pb-12">
      {/* Inline styles for glow markers */}
      <style>{`
        .tree-glow-marker { position:relative; width:22px; height:22px; }
        .tgm-dot { position:absolute; inset:6px; border-radius:9999px; background:var(--c); box-shadow:0 0 12px var(--c), 0 0 4px #fff inset; }
        .tgm-pulse { position:absolute; inset:0; border-radius:9999px; background:var(--c); opacity:.55; animation: tgm-pulse 2.2s ease-out infinite; }
        @keyframes tgm-pulse { 0%{transform:scale(.6);opacity:.7} 80%{transform:scale(2.2);opacity:0} 100%{opacity:0} }
        .leaflet-popup-content-wrapper { background:hsl(var(--background) / .92); backdrop-filter:blur(12px); border:1px solid hsl(var(--primary) / .3); border-radius:16px; box-shadow:0 12px 36px rgba(0,0,0,0.25); color:hsl(var(--foreground)); }
        .leaflet-popup-tip { background:hsl(var(--background) / .92); }
      `}</style>

      <div className="container mx-auto px-4">
        {/* 3-Option Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-muted/70 border border-primary/20 w-fit mx-auto mb-8 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("tree_map")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "tree_map"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            <TreePine className="h-4 w-4" />
            🌳 Interactive Tree Map
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("satellite_ndvi")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "satellite_ndvi"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            <Satellite className="h-4 w-4" />
            🛰️ Satellite NDVI & Carbon (Module A)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("field_scouting")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "field_scouting"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            📍 Field Scouting Matrix (Module B)
          </button>
        </div>

        {activeTab === "satellite_ndvi" ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <ModuleASatelliteEngine trees={trees} projects={projects} />
          </motion.div>
        ) : activeTab === "field_scouting" ? (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="font-heading text-3xl font-bold">Field Scouting & Anomaly Matrix</h2>
              <p className="text-sm text-muted-foreground">
                Geotag ground truth observations, pest & disease detection, and assign remediation tasks.
              </p>
            </div>
            <FieldScoutingModule />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Top KPI Metrics Bar (100% Real Data) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="glass-card rounded-2xl p-4 border border-primary/20 text-center">
                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <TreePine className="h-3.5 w-3.5 text-primary" /> Total Planted Trees
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-foreground mt-1">
                  {trees.length.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Live Database Records</div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 text-center">
                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> AI & Admin Verified
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 mt-1">
                  {verifiedTrees.length.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600/80 mt-0.5">
                  {trees.length > 0
                    ? `${Math.round((verifiedTrees.length / trees.length) * 100)}% Verified`
                    : "Zero Baseline"}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 text-center">
                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Verification
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-amber-600 dark:text-amber-400 mt-1">
                  {pendingTrees.length.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting Admin Audit</div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-sky-500/30 bg-sky-500/5 text-center">
                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Annual CO₂ Offset
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-sky-600 dark:text-sky-400 mt-1">
                  {(totalCo2Kg / 1000).toFixed(2)} MT
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">IPCC Pantropical Metric</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[310px_1fr] gap-6">
              {/* Comprehensive GIS & Tree Filter Panel */}
              <aside className="glass-card rounded-2xl p-5 h-fit space-y-4 lg:sticky lg:top-24 border border-primary/20">
                <div className="flex items-center justify-between text-primary border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <h3 className="font-heading font-semibold text-sm">Interactive GIS Filters</h3>
                  </div>
                  <Badge variant="outline" className="text-[11px] bg-primary/10 border-primary/20">
                    {filtered.length} of {trees.length}
                  </Badge>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tree name, species, location..."
                    className="pl-9 rounded-xl text-xs h-9"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Verification Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses ({trees.length})</SelectItem>
                      <SelectItem value="verified">✅ Verified ({verifiedTrees.length})</SelectItem>
                      <SelectItem value="pending">⏳ Pending Review ({pendingTrees.length})</SelectItem>
                      <SelectItem value="rejected">❌ Flagged / Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Growth Stage */}
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Growth Stage (Height)
                  </Label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Growth Stages</SelectItem>
                      <SelectItem value="sapling">🌱 Sapling (&lt; 100 cm)</SelectItem>
                      <SelectItem value="young">🌿 Young Tree (100–300 cm)</SelectItem>
                      <SelectItem value="mature">🌳 Mature Canopy (300+ cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Native Species Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tree Species
                  </Label>
                  <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Planted Species ({speciesOptions.length})</SelectItem>
                      {speciesOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plantation Date Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Plantation Window
                  </Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time History</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Basemap Switcher */}
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Satellite Basemap Layer
                  </Label>
                  <Select
                    value={basemap}
                    onValueChange={(val: any) => setBasemap(val)}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satellite">🛰️ High-Res Satellite (ESRI)</SelectItem>
                      <SelectItem value="osm">🗺️ Standard Street Map (OSM)</SelectItem>
                      <SelectItem value="topo">⛰️ Topographic Elevation Map</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 5m Proximity Circle Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-primary/15">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-xs font-semibold">5m Proximity Rings</div>
                      <div className="text-[10px] text-muted-foreground">Anti-crowding buffer</div>
                    </div>
                  </div>
                  <Switch
                    checked={showProximityRings}
                    onCheckedChange={setShowProximityRings}
                  />
                </div>

                {/* Reset Filters Button */}
                {(filter ||
                  statusFilter !== "all" ||
                  stageFilter !== "all" ||
                  speciesFilter !== "all" ||
                  dateFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilter("");
                      setStatusFilter("all");
                      setStageFilter("all");
                      setSpeciesFilter("all");
                      setDateFilter("all");
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Reset All Filters
                  </Button>
                )}
              </aside>

              {/* Real Leaflet Map */}
              <div className="relative glass-card rounded-2xl overflow-hidden border border-primary/20 shadow-md">
                {isLoading ? (
                  <div className="h-[620px] flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="relative">
                    <MapContainer
                      center={center}
                      zoom={treesWithCoords.length > 0 ? 8 : 6}
                      scrollWheelZoom
                      style={{ height: "620px", width: "100%" }}
                    >
                      <TileLayer
                        attribution={BASEMAP_TILES[basemap].attribution}
                        url={BASEMAP_TILES[basemap].url}
                        maxZoom={19}
                      />

                      <MapCenterController
                        center={center}
                        zoom={treesWithCoords.length > 0 ? 8 : 6}
                      />

                      {treesWithCoords.map((t) => {
                        const isVerified = t.verification_status === "verified";
                        const isRejected = t.verification_status === "rejected";

                        return (
                          <div key={t.id}>
                            {showProximityRings && (
                              <Circle
                                center={[t.latitude!, t.longitude!]}
                                radius={5}
                                pathOptions={{
                                  color: isVerified
                                    ? "#22c55e"
                                    : isRejected
                                    ? "#ef4444"
                                    : "#f59e0b",
                                  fillColor: isVerified
                                    ? "#22c55e"
                                    : isRejected
                                    ? "#ef4444"
                                    : "#f59e0b",
                                  fillOpacity: 0.12,
                                  weight: 1.5,
                                  dashArray: "3 3",
                                }}
                              />
                            )}

                            <Marker
                              position={[t.latitude!, t.longitude!]}
                              icon={getIcon(t.verification_status)}
                            >
                              <Popup>
                                <div className="text-xs min-w-[210px] space-y-2 p-1">
                                  {t.photo_url && (
                                    <img
                                      src={t.photo_url}
                                      alt={t.tree_name}
                                      className="w-full h-28 object-cover rounded-xl border border-primary/20"
                                    />
                                  )}
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-heading font-bold text-sm text-foreground">
                                        {t.tree_name}
                                      </h4>
                                      <p className="text-[11px] text-muted-foreground italic">
                                        {t.species}
                                      </p>
                                    </div>
                                    <Badge
                                      className={`text-[10px] shrink-0 ${
                                        isVerified
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                          : isRejected
                                          ? "bg-destructive/20 text-destructive border-destructive/30"
                                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                      }`}
                                    >
                                      {t.verification_status || "pending"}
                                    </Badge>
                                  </div>

                                  <div className="space-y-1 text-[11px] text-muted-foreground pt-1 border-t">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">{t.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-primary shrink-0" />
                                      <span>
                                        {new Date(t.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {t.height_cm && (
                                      <div className="flex items-center gap-1">
                                        <Ruler className="h-3 w-3 text-primary shrink-0" />
                                        <span>Height: {t.height_cm} cm</span>
                                      </div>
                                    )}
                                  </div>

                                  <Link
                                    to={`/tree/${t.id}`}
                                    className="block pt-1"
                                  >
                                    <Button
                                      size="sm"
                                      className="w-full text-xs h-7 gap-1 font-semibold rounded-lg"
                                    >
                                      <span>View Digital Passport</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              </Popup>
                            </Marker>
                          </div>
                        );
                      })}
                    </MapContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Tree Cards Gallery Below Map */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-xl flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-primary" />
                  Planted Tree Registry ({filtered.length})
                </h3>
                <Link to="/plant">
                  <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-sm">
                    <TreePine className="h-3.5 w-3.5" /> Plant a New Tree
                  </Button>
                </Link>
              </div>

              {filtered.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
                  <TreePine className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="font-semibold text-foreground">No trees match the selected filters.</p>
                  <p className="text-xs mt-1">Try resetting the filters or register a new plantation.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.slice(0, 16).map((t) => (
                    <Link
                      key={t.id}
                      to={`/tree/${t.id}`}
                      className="glass-card rounded-2xl overflow-hidden border border-primary/15 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col group"
                    >
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {t.photo_url ? (
                          <img
                            src={t.photo_url}
                            alt={t.tree_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <TreePine className="h-8 w-8 text-primary/40" />
                          </div>
                        )}
                        <Badge
                          className={`absolute top-2 right-2 text-[10px] capitalize shadow-md ${
                            t.verification_status === "verified"
                              ? "bg-emerald-500 text-white"
                              : t.verification_status === "rejected"
                              ? "bg-destructive text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {t.verification_status || "pending"}
                        </Badge>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-xs">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-foreground truncate">
                            {t.tree_name}
                          </h4>
                          <p className="text-muted-foreground italic text-[11px] truncate">
                            {t.species}
                          </p>
                        </div>

                        <div className="space-y-1 text-[10px] text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{t.location}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>{new Date(t.created_at).toLocaleDateString()}</span>
                            {t.height_cm && <span>{t.height_cm} cm</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TreeMap;
