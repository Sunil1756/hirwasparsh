import { motion } from "framer-motion";
import { Building2, TreePine, Users, TrendingUp, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MH_CENTER: [number, number] = [19.7515, 75.7139];

const GovernmentDashboard = () => {
  const { user, isGovernment, isAdmin } = useAuth();
  const hasAccess = isGovernment || isAdmin;

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["govt-trees"],
    enabled: hasAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .not("latitude", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["govt-profiles"],
    enabled: hasAccess,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, trees_planted").gt("trees_planted", 0);
      return data || [];
    },
  });

  if (!hasAccess) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="font-heading text-2xl font-bold">Government Access Required</h2>
          <p className="text-muted-foreground">This dashboard is for government officials and forest department monitors.</p>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const approvedTrees = trees.filter(t => t.admin_status === "approved");
  const verifiedTrees = trees.filter(t => t.verification_status === "verified");
  const survivalRate = trees.length > 0 ? Math.round((approvedTrees.length / trees.length) * 100) : 0;

  // Group by location (rough district extraction)
  const districtMap = new Map<string, number>();
  approvedTrees.forEach(t => {
    const parts = t.location?.split(",") || [];
    const district = parts.length > 2 ? parts[parts.length - 3]?.trim() : parts[0]?.trim() || "Unknown";
    districtMap.set(district, (districtMap.get(district) || 0) + 1);
  });
  const districts = Array.from(districtMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-4xl font-bold">Government Dashboard</h1>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Submissions", value: trees.length, icon: <TreePine className="h-5 w-5" /> },
              { label: "Approved Trees", value: approvedTrees.length, icon: <TrendingUp className="h-5 w-5" /> },
              { label: "Active Planters", value: profiles.length, icon: <Users className="h-5 w-5" /> },
              { label: "Approval Rate", value: `${survivalRate}%`, icon: <MapPin className="h-5 w-5" /> },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                  <span className="text-primary">{s.icon}</span>
                </div>
                <div className="font-heading text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Map */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">District-wise Plantation Map</h2>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="h-80 rounded-lg overflow-hidden">
                  <MapContainer center={MH_CENTER} zoom={7} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {trees.filter(t => t.latitude && t.longitude).map(t => (
                      <CircleMarker
                        key={t.id}
                        center={[t.latitude!, t.longitude!]}
                        radius={6}
                        pathOptions={{
                          color: t.admin_status === "approved" ? "#22c55e" : t.admin_status === "rejected" ? "#ef4444" : "#f59e0b",
                          fillOpacity: 0.7,
                        }}
                      >
                        <Popup>
                          <strong>{t.tree_name}</strong><br />
                          {t.species} · {t.admin_status}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </div>

            {/* District breakdown */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Top Districts</h2>
              {districts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No district data available yet.</p>
              ) : (
                <div className="space-y-3">
                  {districts.map(([district, count], i) => (
                    <div key={district} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{i + 1}</span>
                        <span className="font-medium">{district}</span>
                      </div>
                      <span className="font-heading font-bold text-primary">{count} trees</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;
