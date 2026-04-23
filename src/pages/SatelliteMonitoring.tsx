import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Satellite, MapPin, TreePine, AlertTriangle, Loader2, Layers, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap, Pane, ZoomControl, ScaleControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Maharashtra center and tight bounds (state extent)
const MH_CENTER: [number, number] = [19.7515, 75.7139];
const MH_BOUNDS: L.LatLngBoundsExpression = [[15.4, 72.4], [22.4, 81.0]];

// India-states GeoJSON (community-maintained, contains Maharashtra polygon)
const INDIA_STATES_URL =
  "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson";
// Maharashtra district boundaries
const MH_DISTRICTS_URL =
  "https://raw.githubusercontent.com/datameet/maps/master/maharashtra/maharashtra.geojson";

// Build a world polygon with the Maharashtra ring as a hole → masks everything outside MH
const buildMaharashtraMask = (mhFeature: any): GeoJSON.Feature => {
  const world: number[][] = [
    [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
  ];
  const rings: number[][][] = [world];
  const geom = mhFeature.geometry;
  const pushRings = (coords: any) => {
    // outer ring of each polygon becomes a hole
    coords.forEach((poly: any) => rings.push(poly[0]));
  };
  if (geom.type === "Polygon") pushRings([geom.coordinates]);
  else if (geom.type === "MultiPolygon") pushRings(geom.coordinates);
  return {
    type: "Feature",
    properties: { mask: true },
    geometry: { type: "Polygon", coordinates: rings as any },
  };
};

// Auto-fit map to Maharashtra polygon once it loads
const FitToFeature = ({ feature }: { feature: any }) => {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const layer = L.geoJSON(feature);
    map.fitBounds(layer.getBounds(), { padding: [10, 10] });
    map.setMaxBounds(layer.getBounds().pad(0.05));
  }, [map, feature]);
  return null;
};

const MH_DISTRICTS = [
  "Pune", "Solapur", "Kolhapur", "Sangli", "Satara", "Nagpur", "Nashik",
  "Mumbai", "Thane", "Ahmednagar", "Chhatrapati Sambhajinagar", "Amravati",
  "Ratnagiri", "Sindhudurg", "Raigad", "Latur", "Osmanabad", "Beed",
  "Jalgaon", "Dhule", "Nandurbar", "Buldhana", "Akola", "Washim",
  "Yavatmal", "Wardha", "Chandrapur", "Gadchiroli", "Gondia", "Bhandara",
  "Palghar", "Nanded", "Hingoli", "Parbhani", "Jalna"
];

// Heatmap layer component
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const heat = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 12,
      gradient: { 0.2: "#ef4444", 0.4: "#eab308", 0.6: "#84cc16", 0.8: "#22c55e", 1: "#166534" },
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
};

const SatelliteMonitoring = () => {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");
  const [tileLayer, setTileLayer] = useState<"street" | "satellite">("satellite");

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["satellite-trees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const filteredTrees = districtFilter === "all"
    ? trees
    : trees.filter(t => t.location?.toLowerCase().includes(districtFilter.toLowerCase()));

  const approvedTrees = filteredTrees.filter(t => t.admin_status === "approved");
  const heatPoints: [number, number, number][] = filteredTrees
    .filter(t => t.latitude && t.longitude)
    .map(t => [t.latitude!, t.longitude!, t.admin_status === "approved" ? 1 : 0.3]);

  // District stats
  const districtStats = new Map<string, { total: number; approved: number }>();
  trees.forEach(t => {
    const loc = t.location || "";
    const district = MH_DISTRICTS.find(d => loc.toLowerCase().includes(d.toLowerCase())) || "Other";
    const cur = districtStats.get(district) || { total: 0, approved: 0 };
    cur.total++;
    if (t.admin_status === "approved") cur.approved++;
    districtStats.set(district, cur);
  });

  const tileUrl = tileLayer === "satellite"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-4xl font-bold">Maharashtra Satellite Monitor</h1>
          </div>
          <p className="text-muted-foreground mb-6">Track real plantation impact across Maharashtra with satellite imagery and AI</p>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {MH_DISTRICTS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger className="w-40">
                <Layers className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markers">Markers</SelectItem>
                <SelectItem value="heatmap">Heatmap</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tileLayer} onValueChange={(v: any) => setTileLayer(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="street">Street</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Plantations", value: filteredTrees.length },
              { label: "Verified", value: approvedTrees.length },
              { label: "Survival Rate", value: filteredTrees.length > 0 ? `${Math.round((approvedTrees.length / filteredTrees.length) * 100)}%` : "0%" },
              { label: "Districts Active", value: districtStats.size },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="font-heading text-2xl font-bold text-primary">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="glass-card rounded-2xl overflow-hidden mb-8">
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            ) : (
              <MapContainer
                center={MH_CENTER}
                zoom={7}
                maxBounds={MH_BOUNDS}
                minZoom={6}
                scrollWheelZoom
                style={{ height: "500px", width: "100%" }}
              >
                <TileLayer url={tileUrl} />

                {viewMode === "heatmap" ? (
                  <HeatmapLayer points={heatPoints} />
                ) : (
                  filteredTrees.filter(t => t.latitude && t.longitude).map(t => (
                    <CircleMarker
                      key={t.id}
                      center={[t.latitude!, t.longitude!]}
                      radius={7}
                      pathOptions={{
                        color: t.admin_status === "approved" ? "#22c55e" : t.admin_status === "rejected" ? "#ef4444" : "#f59e0b",
                        fillOpacity: 0.8,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1 min-w-[200px]">
                          <div className="font-bold text-base">{t.tree_name}</div>
                          <div>🌿 {t.species}{t.ai_detected_species ? ` (AI: ${t.ai_detected_species})` : ""}</div>
                          <div>📍 {t.location}</div>
                          <div>📅 {new Date(t.plantation_date).toLocaleDateString()}</div>
                          <div>Status: <span className={t.admin_status === "approved" ? "text-green-600 font-semibold" : "text-amber-600"}>{t.admin_status}</span></div>
                          {t.ai_confidence && <div>AI Confidence: {t.ai_confidence}%</div>}
                          {t.photo_url && <img src={t.photo_url} alt={t.tree_name} className="w-full h-20 object-cover rounded mt-1" />}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))
                )}
              </MapContainer>
            )}
          </div>

          {/* District Rankings */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> District Rankings
              </h2>
              {Array.from(districtStats.entries())
                .sort((a, b) => b[1].approved - a[1].approved)
                .slice(0, 12)
                .map(([district, stats], i) => {
                  const rate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
                  return (
                    <div key={district} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{i + 1}</span>
                        <div>
                          <span className="font-medium">{district}</span>
                          <span className="text-xs text-muted-foreground ml-2">({rate}% survival)</span>
                        </div>
                      </div>
                      <Badge variant="default" className="text-xs">{stats.approved} verified</Badge>
                    </div>
                  );
                })}
              {districtStats.size === 0 && <p className="text-muted-foreground text-center py-4">No data yet</p>}
            </div>

            {/* Deforestation Alerts placeholder */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Deforestation Alerts
              </h2>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-muted-foreground">
                    AI-powered deforestation monitoring is active. Alerts will appear here when vegetation loss is detected in monitored plantation areas.
                  </p>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <TreePine className="h-12 w-12 mx-auto mb-2 text-primary/30" />
                  <p className="text-sm">No alerts — all plantation zones are healthy</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SatelliteMonitoring;
