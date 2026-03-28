import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TreePine, Filter, Search, ShieldCheck, Clock, Loader2, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const verifiedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const pendingIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const rejectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const getIcon = (status: string) => status === "verified" ? verifiedIcon : status === "rejected" ? rejectedIcon : pendingIcon;

const fetchTrees = async () => {
  const { data, error } = await supabase
    .from("trees")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

const TreeMap = () => {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: fetchTrees,
  });

  const filtered = trees.filter(t =>
    (statusFilter === "all" || t.verification_status === statusFilter) &&
    (filter === "" ||
      t.tree_name.toLowerCase().includes(filter.toLowerCase()) ||
      t.species.toLowerCase().includes(filter.toLowerCase()) ||
      t.location.toLowerCase().includes(filter.toLowerCase()))
  );

  const treesWithCoords = filtered.filter(t => t.latitude && t.longitude);

  // Calculate map center from data or default to India
  const center: [number, number] = treesWithCoords.length > 0
    ? [treesWithCoords[0].latitude!, treesWithCoords[0].longitude!]
    : [20.5937, 78.9629];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h1 className="font-heading text-4xl font-bold mb-2">Tree Map</h1>
            <p className="text-muted-foreground">Explore all planted trees on a real interactive map</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, species, or location..." className="pl-10" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trees</SelectItem>
                <SelectItem value="verified">✅ Verified</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interactive Leaflet Map */}
          <div className="glass-card rounded-2xl overflow-hidden mb-8">
            {isLoading ? (
              <div className="h-[450px] flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading map...</p>
                </div>
              </div>
            ) : (
              <MapContainer center={center} zoom={treesWithCoords.length > 0 ? 10 : 5} scrollWheelZoom={true} style={{ height: "450px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {treesWithCoords.map((t) => (
                  <Marker key={t.id} position={[t.latitude!, t.longitude!]} icon={getIcon(t.verification_status)}>
                    <Popup>
                      <div className="text-sm">
                        <strong>{t.tree_name}</strong><br />
                        <span className="text-muted-foreground">{t.species}</span><br />
                        <span>📍 {t.location}</span><br />
                        <span>Status: {t.verification_status}</span>
                        {t.ai_confidence && <><br /><span>AI: {t.ai_confidence}%</span></>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Tree list */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading trees...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No trees found. Be the first to plant one!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => (
                <Link key={t.id} to={`/tree/${t.id}`} className="block glass-card rounded-xl p-4 hover:nature-glow transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-lg p-2"><TreePine className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold truncate">{t.tree_name}</h3>
                        {t.verification_status === "verified" ? (
                          <Badge variant="default" className="shrink-0 text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </Badge>
                        ) : t.verification_status === "rejected" ? (
                          <Badge variant="destructive" className="shrink-0 text-xs">Rejected</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.species}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">📍 {t.location}</p>
                      {t.ai_confidence && (
                        <p className="text-xs text-primary mt-1">AI Confidence: {t.ai_confidence}%</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TreeMap;
