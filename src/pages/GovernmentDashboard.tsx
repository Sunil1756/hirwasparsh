import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  TreePine,
  Users,
  TrendingUp,
  MapPin,
  Loader2,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { resolveAgroClimaticZone, MAHARASHTRA_AGRO_ZONES } from "@/lib/agroClimaticService";
import { sha256 } from "@/services/auditLogService";
import { toast } from "sonner";
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
      return data || [];
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

  // Calculate genuine forestry metrics
  const approvedTrees = useMemo(() => trees.filter((t) => t.admin_status === "approved"), [trees]);
  const verifiedTrees = useMemo(() => trees.filter((t) => t.verification_status === "verified"), [trees]);
  const pendingTrees = useMemo(() => trees.filter((t) => !t.admin_status || t.admin_status === "pending"), [trees]);
  const approvalRate = trees.length > 0 ? Math.round((approvedTrees.length / trees.length) * 100) : 0;

  // Group by Official Maharashtra Agro-Climatic Zone
  const agroZoneStats = useMemo(() => {
    const stats: Record<string, { count: number; approved: number; name: string; rainfall: string; species: string[] }> = {};

    Object.values(MAHARASHTRA_AGRO_ZONES).forEach((zone) => {
      stats[zone.zoneCode] = {
        count: 0,
        approved: 0,
        name: zone.zoneName,
        rainfall: zone.annualRainfallMm,
        species: zone.recommendedNativeSpecies,
      };
    });

    trees.forEach((t) => {
      if (t.latitude && t.longitude) {
        const zone = resolveAgroClimaticZone(t.latitude, t.longitude, t.location || undefined);
        if (stats[zone.zoneCode]) {
          stats[zone.zoneCode].count++;
          if (t.admin_status === "approved") {
            stats[zone.zoneCode].approved++;
          }
        }
      }
    });

    return stats;
  }, [trees]);

  // Group by district
  const districts = useMemo(() => {
    const districtMap = new Map<string, number>();
    approvedTrees.forEach((t) => {
      const parts = t.location?.split(",") || [];
      const district = parts.length > 2 ? parts[parts.length - 3]?.trim() : parts[0]?.trim() || "Maharashtra";
      districtMap.set(district, (districtMap.get(district) || 0) + 1);
    });
    return Array.from(districtMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [approvedTrees]);

  // Export State Forest Department Registry CSV
  const handleExportForestryCSV = () => {
    const headers =
      "Tree_ID,Tree_Name,Species,Botanical_Name,Agro_Zone_Code,Agro_Zone_Name,District,WGS84_Latitude,WGS84_Longitude,Admin_Status,Verification_Status,Plantation_Date,SHA256_Integrity_Hash\n";

    const rows = trees
      .map((t) => {
        const zone = resolveAgroClimaticZone(t.latitude || 19.75, t.longitude || 75.71, t.location || undefined);
        const parts = t.location?.split(",") || [];
        const district = parts.length > 2 ? parts[parts.length - 3]?.trim() : parts[0]?.trim() || "Maharashtra";
        const hash = sha256(`${t.id}:${t.species}:${t.latitude}:${t.longitude}:${t.created_at || ""}`);

        return `"${t.id}","${t.tree_name || "Sapling"}","${t.species || "Native"}","${t.botanical_name || "Indigenous"}","${zone.zoneCode}","${zone.zoneName}","${district}",${t.latitude || 0},${t.longitude || 0},"${t.admin_status || "pending"}","${t.verification_status || "unverified"}","${t.plantation_date || t.created_at || "2026-01-01"}","sha256:${hash}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Maharashtra_Forest_Dept_Registry_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("State Forest Department Registry CSV Exported!");
  };

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

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header Banner */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-primary/20 shadow-xl bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-3 py-1 rounded-full font-semibold">
                  Official Forest Department Monitoring HUD
                </Badge>
                <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  MPKV / ICAR Agro-Ecological Classification
                </Badge>
              </div>
              <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
                Maharashtra Forestry &amp; Cadastral Audit HUD
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                State afforestation surveillance platform with high-precision WGS84 coordinates,
                tamper-evident photo integrity auditing, and agro-climatic species compliance tracking.
              </p>
            </div>

            <Button
              onClick={handleExportForestryCSV}
              className="rounded-xl gap-2 text-xs font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Forest Dept Registry
            </Button>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">Total Field Submissions</span>
                <TreePine className="h-5 w-5 text-primary" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold">{trees.length.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Geotagged ground truth uploads</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">Admin Approved Stand</span>
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {approvedTrees.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{approvalRate}% administrative pass rate</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-sky-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">AI &amp; Scout Verified</span>
                <TrendingUp className="h-5 w-5 text-sky-500" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">
                {verifiedTrees.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{pendingTrees.length} pending supervisor review</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">Active Ground Planters</span>
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold">{profiles.length.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Field workers &amp; community foresters</div>
            </div>
          </div>

          {/* Map & District Analytics */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Map */}
            <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold">WGS84 Geodetic Cadastral Surveillance</h2>
                  <p className="text-xs text-muted-foreground">High-precision GPS pins colored by administrative status</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary gap-1">
                  <Compass className="h-3 w-3" /> WGS84 Datum
                </Badge>
              </div>

              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-80 rounded-xl overflow-hidden border border-border/30">
                  <MapContainer center={MH_CENTER} zoom={7} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {trees
                      .filter((t) => t.latitude && t.longitude)
                      .map((t) => (
                        <CircleMarker
                          key={t.id}
                          center={[t.latitude!, t.longitude!]}
                          radius={6}
                          pathOptions={{
                            color:
                              t.admin_status === "approved"
                                ? "#22c55e"
                                : t.admin_status === "rejected"
                                ? "#ef4444"
                                : "#f59e0b",
                            fillOpacity: 0.7,
                          }}
                        >
                          <Popup>
                            <div className="text-xs space-y-1">
                              <strong>{t.tree_name || "Sapling"}</strong>
                              <div>Species: {t.species}</div>
                              <div>Status: {t.admin_status || "pending"}</div>
                              <div className="font-mono text-[10px]">
                                {t.latitude?.toFixed(4)}°, {t.longitude?.toFixed(4)}°
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                  </MapContainer>
                </div>
              )}
            </div>

            {/* Top Forestry Districts */}
            <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold">Top Afforestation Districts</h2>
                <p className="text-xs text-muted-foreground">Approved saplings ranked by Maharashtra revenue district</p>
              </div>

              {districts.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 text-xs">No district records available yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {districts.map(([district, count], i) => (
                    <div
                      key={district}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/20 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-sm text-muted-foreground w-6">#{i + 1}</span>
                        <span className="font-medium text-foreground">{district}</span>
                      </div>
                      <span className="font-heading font-bold text-primary">{count.toLocaleString()} approved</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Official ICAR/MPKV Maharashtra Agro-Climatic Zones HUD */}
          <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Official Maharashtra Agro-Climatic Zones Surveillance (ICAR / MPKV)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Zonal breakdown of monitored trees, rainfall bands, and ecological species matching.
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">9 Official Zones Active</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Object.entries(agroZoneStats).map(([code, data]) => (
                <div
                  key={code}
                  className="p-3.5 rounded-xl bg-muted/30 border border-border/30 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                        {code}
                      </Badge>
                      <span className="font-heading font-bold text-sm text-foreground">
                        {data.count} trees ({data.approved} approved)
                      </span>
                    </div>
                    <div className="font-semibold text-foreground text-xs pt-1">{data.name}</div>
                    <div className="text-[11px] text-muted-foreground">Rainfall: {data.rainfall}</div>
                  </div>

                  <div className="pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">Native Species: </span>
                    {data.species.slice(0, 3).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;
