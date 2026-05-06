import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, TreePine, Filter, Search, ShieldCheck, Clock, Loader2,
  Plane, Layers, Activity, Camera, Bot, X, Sparkles, TrendingUp, AlertTriangle
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
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const fetchTrees = async () => {
  const { data, error } = await supabase
    .from("trees")
    .select("id, tree_name, species, location, latitude, longitude, verification_status, admin_status, ai_confidence, created_at, photo_url, height_cm")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// Mock drone survey polygons over Maharashtra
const droneZones: { name: string; coords: [number, number][]; health: "Good" | "Moderate" | "Critical"; density: number; survival: number }[] = [
  {
    name: "Pune Sector A",
    coords: [[18.62, 73.78], [18.62, 73.95], [18.48, 73.95], [18.48, 73.78]],
    health: "Good", density: 412, survival: 87,
  },
  {
    name: "Solapur Belt",
    coords: [[17.75, 75.85], [17.75, 76.05], [17.62, 76.05], [17.62, 75.85]],
    health: "Moderate", density: 268, survival: 71,
  },
  {
    name: "Nagpur Greenway",
    coords: [[21.20, 79.00], [21.20, 79.18], [21.08, 79.18], [21.08, 79.00]],
    health: "Critical", density: 132, survival: 48,
  },
];

const healthColor = (h: string) =>
  h === "Good" ? "#22c55e" : h === "Moderate" ? "#f59e0b" : "#ef4444";

const TreeMap = () => {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [droneOnly, setDroneOnly] = useState(false);
  const [showDronePanel, setShowDronePanel] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);

  const { data: trees = [], isLoading } = useQuery({ queryKey: ["trees"], queryFn: fetchTrees });

  const filtered = useMemo(() => trees.filter(t => {
    const stageOk =
      stageFilter === "all" ||
      (stageFilter === "sapling" && (t.height_cm ?? 0) < 100) ||
      (stageFilter === "young" && (t.height_cm ?? 0) >= 100 && (t.height_cm ?? 0) < 300) ||
      (stageFilter === "mature" && (t.height_cm ?? 0) >= 300);
    const inDrone = droneZones.some(z => {
      if (!t.latitude || !t.longitude) return false;
      const lats = z.coords.map(c => c[0]); const lngs = z.coords.map(c => c[1]);
      return t.latitude >= Math.min(...lats) && t.latitude <= Math.max(...lats)
        && t.longitude >= Math.min(...lngs) && t.longitude <= Math.max(...lngs);
    });
    return (statusFilter === "all" || t.verification_status === statusFilter)
      && stageOk
      && (!droneOnly || inDrone)
      && (filter === "" ||
        t.tree_name.toLowerCase().includes(filter.toLowerCase()) ||
        t.species.toLowerCase().includes(filter.toLowerCase()) ||
        t.location.toLowerCase().includes(filter.toLowerCase()));
  }), [trees, statusFilter, stageFilter, droneOnly, filter]);

  const treesWithCoords = filtered.filter(t => t.latitude && t.longitude);
  const center: [number, number] = treesWithCoords.length > 0
    ? [treesWithCoords[0].latitude!, treesWithCoords[0].longitude!]
    : [19.7515, 75.7139];

  const verifiedCount = trees.filter(t => t.verification_status === "verified").length;
  const avgSurvival = Math.round(droneZones.reduce((s, z) => s + z.survival, 0) / droneZones.length);

  return (
    <div className="min-h-screen pt-24 pb-12">
      {/* Inline styles for glow markers + tint */}
      <style>{`
        .tree-glow-marker { position:relative; width:22px; height:22px; }
        .tgm-dot { position:absolute; inset:6px; border-radius:9999px; background:var(--c); box-shadow:0 0 12px var(--c), 0 0 4px #fff inset; }
        .tgm-pulse { position:absolute; inset:0; border-radius:9999px; background:var(--c); opacity:.55; animation: tgm-pulse 2.2s ease-out infinite; }
        @keyframes tgm-pulse { 0%{transform:scale(.6);opacity:.7} 80%{transform:scale(2.2);opacity:0} 100%{opacity:0} }
        .map-tint { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse at center, hsl(125 56% 24% / 0.08), hsl(125 56% 12% / 0.18)); mix-blend-mode:multiply; z-index:400; }
        .leaflet-popup-content-wrapper { background:hsl(0 0% 100% / .85); backdrop-filter:blur(10px); border:1px solid hsl(125 40% 60% / .3); border-radius:14px; box-shadow:0 10px 30px hsl(125 56% 24% / .25); }
        .leaflet-popup-tip { background:hsl(0 0% 100% / .85); }
      `}</style>

      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h1 className="font-heading text-4xl font-bold mb-2">Explore Tree Map</h1>
            <p className="text-muted-foreground">Satellite intelligence for every planted tree</p>
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* Filter panel */}
            <aside className="glass-card rounded-2xl p-5 h-fit space-y-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 text-primary">
                <Filter className="h-4 w-4" />
                <h3 className="font-heading font-semibold">Filters</h3>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search trees..." className="pl-10 rounded-xl" value={filter} onChange={e => setFilter(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Verification</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Growth Stage</Label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="sapling">Sapling (&lt;1m)</SelectItem>
                    <SelectItem value="young">Young (1–3m)</SelectItem>
                    <SelectItem value="mature">Mature (3m+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Drone surveyed</span>
                </div>
                <Switch checked={droneOnly} onCheckedChange={setDroneOnly} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Coverage layer</span>
                </div>
                <Switch checked={showCoverage} onCheckedChange={setShowCoverage} />
              </div>

              <Button onClick={() => setShowDronePanel(true)} className="w-full rounded-xl gap-2 shadow-lg">
                <Plane className="h-4 w-4" /> Drone Survey
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <div className="text-xl font-heading font-bold text-primary">{trees.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Trees</div>
                </div>
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <div className="text-xl font-heading font-bold text-primary">{verifiedCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Verified</div>
                </div>
              </div>
            </aside>

            {/* Map */}
            <div className="relative glass-card rounded-2xl overflow-hidden">
              {isLoading ? (
                <div className="h-[600px] flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              ) : (
                <div className="relative">
                  <MapContainer center={center} zoom={treesWithCoords.length > 0 ? 9 : 6} scrollWheelZoom style={{ height: "600px", width: "100%" }}>
                    <LayersControl position="topright">
                      <LayersControl.BaseLayer checked name="Satellite">
                        <TileLayer
                          attribution='Tiles &copy; Esri'
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          maxZoom={19}
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.Overlay checked name="Labels">
                        <TileLayer
                          url="https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png"
                          opacity={0.6}
                        />
                      </LayersControl.Overlay>
                    </LayersControl>

                    {showCoverage && droneZones.map(z => (
                      <Polygon
                        key={z.name}
                        positions={z.coords}
                        pathOptions={{
                          color: healthColor(z.health),
                          fillColor: healthColor(z.health),
                          fillOpacity: 0.18,
                          weight: 2,
                          dashArray: "6 6",
                        }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>{z.name}</strong><br />
                            Density: {z.density} trees/km²<br />
                            Survival: {z.survival}%<br />
                            Health: <span style={{ color: healthColor(z.health) }}>{z.health}</span>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}

                    {treesWithCoords.map(t => (
                      <Marker key={t.id} position={[t.latitude!, t.longitude!]} icon={getIcon(t.verification_status)}>
                        <Popup>
                          <div className="text-sm min-w-[200px]">
                            {t.photo_url && (
                              <img src={t.photo_url} alt={t.tree_name} className="w-full h-28 object-cover rounded-lg mb-2" />
                            )}
                            <div className="font-semibold text-base">{t.tree_name}</div>
                            <div className="text-muted-foreground text-xs">{t.species}</div>
                            <div className="flex items-center gap-1 text-xs mt-1"><MapPin className="h-3 w-3" /> {t.location}</div>
                            <div className="text-xs mt-1">Growth: {Math.min(100, Math.round(((t.height_cm ?? 30) / 500) * 100))}%</div>
                            <div className="mt-2 flex items-center gap-2">
                              {t.verification_status === "verified"
                                ? <Badge className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                                : <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> Pending</Badge>}
                              <Link to={`/tree/${t.id}`} className="text-xs text-primary underline ml-auto">View →</Link>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                  <div className="map-tint" />

                  {/* Floating legend */}
                  <div className="absolute bottom-4 left-4 z-[500] glass-card rounded-xl px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" /> Verified</div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" /> Pending</div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" /> Rejected</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tree list */}
          <div className="mt-10">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No trees match the filters.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.slice(0, 12).map(t => (
                  <Link key={t.id} to={`/tree/${t.id}`} className="block glass-card rounded-2xl p-4 hover:nature-glow transition-all hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-xl p-2"><TreePine className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold truncate">{t.tree_name}</h3>
                          {t.verification_status === "verified"
                            ? <Badge className="shrink-0 text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                            : <Badge variant="secondary" className="shrink-0 text-xs gap-1"><Clock className="h-3 w-3" /> Pending</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{t.species}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate"><MapPin className="h-3 w-3 inline" /> {t.location}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Drone Survey Modal */}
      <AnimatePresence>
        {showDronePanel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-nature-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDronePanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl p-2"><Plane className="h-6 w-6 text-primary" /></div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold">Drone Survey</h2>
                    <p className="text-sm text-muted-foreground">Aerial intelligence across {droneZones.length} zones</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowDronePanel(false)}><X className="h-5 w-5" /></Button>
              </div>

              {/* AI summary */}
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary mb-1"><Activity className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Avg Survival</span></div>
                  <div className="text-2xl font-heading font-bold">{avgSurvival}%</div>
                </div>
                <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Growth (vs prev)</span></div>
                  <div className="text-2xl font-heading font-bold">+12.4%</div>
                </div>
                <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Anomalies</span></div>
                  <div className="text-2xl font-heading font-bold">3 zones</div>
                </div>
              </div>

              {/* Zone reports */}
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Zone Reports</h3>
              <div className="space-y-3 mb-6">
                {droneZones.map(z => (
                  <div key={z.name} className="rounded-2xl border border-border/40 bg-card/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{z.name}</div>
                      <Badge style={{ background: healthColor(z.health), color: "#fff" }}>{z.health}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><div className="text-xs text-muted-foreground">Density</div><div className="font-medium">{z.density}/km²</div></div>
                      <div><div className="text-xs text-muted-foreground">Survival</div><div className="font-medium">{z.survival}%</div></div>
                      <div><div className="text-xs text-muted-foreground">Status</div><div className="font-medium" style={{ color: healthColor(z.health) }}>{z.health}</div></div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${z.survival}%`, background: healthColor(z.health) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Aerial snapshots */}
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Aerial Snapshots</h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Before · Jan 2025", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600" },
                  { label: "After · Apr 2026", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl overflow-hidden relative group">
                    <img src={s.url} alt={s.label} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-nature-900/80 to-transparent p-2 text-xs text-white">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* AI insights */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-heading font-semibold">AI Insights</span>
                </div>
                <ul className="text-sm space-y-1.5 text-foreground/80">
                  <li className="flex gap-2"><Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Pune Sector A shows strong canopy expansion — recommend scaling planting pattern.</li>
                  <li className="flex gap-2"><Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Solapur Belt has 14 detected dead zones — schedule replanting in Q3.</li>
                  <li className="flex gap-2"><Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Nagpur Greenway anomaly detected: irregular spacing reducing survival rate.</li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TreeMap;
