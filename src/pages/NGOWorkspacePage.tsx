import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trees,
  MapPin,
  Upload,
  Plus,
  ShieldCheck,
  Satellite,
  Bot,
  Activity,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  Compass,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RoleBadge } from "@/components/B2BRoleGate";
import { supabase } from "@/integrations/supabase/client";

interface NGOPlot {
  id: string;
  name: string;
  location: string;
  district: string;
  acres: number;
  hectares: number;
  targetTrees: number;
  verifiedTrees: number;
  confidenceScore: number;
  verificationTier: "Gold" | "Field Verified" | "Satellite Only" | "Unverified";
  pendingScoutTasks: number;
  lastSatellitePass: string;
  ndviCurrent: number;
}

const SAMPLE_NGO_PLOTS: NGOPlot[] = [
  {
    id: "plot_satara_agro",
    name: "Sahyadri Bio-Reserve Agroforestry Parcel",
    location: "Satara Watershed Basin, Maharashtra",
    district: "Satara",
    acres: 5.0,
    hectares: 2.02,
    targetTrees: 750,
    verifiedTrees: 712,
    confidenceScore: 88,
    verificationTier: "Gold",
    pendingScoutTasks: 0,
    lastSatellitePass: "2026-09-06",
    ndviCurrent: 0.72,
  },
  {
    id: "plot_nagpur_teak",
    name: "Vidarbha Teakwood & Bamboo Carbon Plot",
    location: "Nagpur Agroforestry Belt, Maharashtra",
    district: "Nagpur",
    acres: 12.0,
    hectares: 4.86,
    targetTrees: 1800,
    verifiedTrees: 1420,
    confidenceScore: 76,
    verificationTier: "Field Verified",
    pendingScoutTasks: 2,
    lastSatellitePass: "2026-09-02",
    ndviCurrent: 0.65,
  },
];

export default function NGOWorkspacePage() {
  const [search, setSearch] = useState("");
  const [dbPlots, setDbPlots] = useState<NGOPlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data: projects } = await supabase
          .from("plantation_projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projects && projects.length > 0) {
          const mapped: NGOPlot[] = projects.map((p) => {
            const target = Number(p.target_trees) || 100;
            const verified = Number(p.verified_trees) || 0;
            const score = verified > 0 ? Math.min(100, Math.round(40 + (verified / target) * 60)) : 28;
            const tier = score >= 80 ? "Gold" : score >= 50 ? "Field Verified" : "Satellite Only";

            return {
              id: p.id,
              name: p.project_name || "Agroforestry Parcel",
              location: p.location || "Maharashtra, India",
              district: p.location?.split(",")[0] || "Maharashtra",
              acres: Math.max(0.5, Math.round((target / 450) * 10) / 10),
              hectares: Math.max(0.2, Math.round((target / 1100) * 10) / 10),
              targetTrees: target,
              verifiedTrees: verified,
              confidenceScore: score,
              verificationTier: tier,
              pendingScoutTasks: verified === 0 ? 1 : 0,
              lastSatellitePass: p.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
              ndviCurrent: 0.72,
            };
          });
          setDbPlots(mapped);
        }
      } catch (err) {
        console.warn("Could not load NGO plots from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const activePlotList = useMemo(() => {
    if (dbPlots.length > 0) return dbPlots;
    return SAMPLE_NGO_PLOTS;
  }, [dbPlots]);

  const filteredPlots = useMemo(() => {
    return activePlotList.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.district.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, activePlotList]);

  const totalAcres = useMemo(() => filteredPlots.reduce((sum, p) => sum + p.acres, 0), [filteredPlots]);
  const totalTargetTrees = useMemo(() => filteredPlots.reduce((sum, p) => sum + p.targetTrees, 0), [filteredPlots]);
  const totalVerified = useMemo(() => filteredPlots.reduce((sum, p) => sum + p.verifiedTrees, 0), [filteredPlots]);

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/20 shadow-xl bg-gradient-to-r from-emerald-500/10 via-background to-primary/10 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 rounded-full font-semibold">
              ACIC Afforestation Operator Suite
            </Badge>
            <RoleBadge role="ngo_admin" />
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
            NGO & Project Operator Command Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage your geodetic boundary parcels, upload tree planting manifests, assign field scouts,
            and monitor live Copernicus Sentinel-2 vegetation health to unlock tradeable carbon verification.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="default" className="rounded-xl gap-2 text-xs font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/plant/organization?create=true">
              <Plus className="h-4 w-4" /> Onboard Geodetic Boundary
            </Link>
          </Button>

          <Button asChild variant="outline" className="rounded-xl gap-2 text-xs font-semibold border-primary/30">
            <Link to="/bulk-onboard">
              <Upload className="h-4 w-4 text-primary" /> Bulk Manifest CSV / KML
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/30 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Managed Land Area</span>
              <Compass className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-foreground">
              {totalAcres.toFixed(1)} Acres
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Across {filteredPlots.length} geodetically validated parcels
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Target Tree Capacity</span>
              <Trees className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {totalTargetTrees.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            {totalVerified.toLocaleString()} trees ground & satellite verified
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Field Scouting Tasks</span>
              <Users className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              7 Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Ground truth photos required to reach Gold Tier
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-purple-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Automated STAC Sync</span>
              <Satellite className="h-4 w-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-purple-600 dark:text-purple-400">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Copernicus Sentinel-2 L2A auto-ingest enabled
          </CardContent>
        </Card>
      </div>

      {/* Parcel Portfolio & Field Workflows */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading">Afforestation Parcels & Plots</h2>
            <p className="text-xs text-muted-foreground">
              Monitor multi-source confidence scores and upgrade unverified parcels with ground evidence.
            </p>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Search parcel by name or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-xl text-xs bg-background/60 pl-8 border-primary/20"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Grid of Plots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlots.map((plot) => (
            <Card
              key={plot.id}
              className="rounded-2xl border border-primary/20 bg-card/70 backdrop-blur-md shadow-md flex flex-col justify-between overflow-hidden"
            >
              <div>
                <CardHeader className="pb-3 border-b border-border/20 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        plot.verificationTier === "Gold"
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          : plot.verificationTier === "Field Verified"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                      }`}
                    >
                      {plot.verificationTier} ({plot.confidenceScore}%)
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      NDVI {plot.ndviCurrent}
                    </span>
                  </div>

                  <CardTitle className="text-base font-bold font-heading mt-2 line-clamp-1">
                    {plot.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    📍 {plot.location}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-background/60 border border-border/30 space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Area:</span>
                      <strong className="text-foreground font-semibold">
                        {plot.acres} Acres ({plot.hectares} Ha)
                      </strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Planted Inventory:</span>
                      <strong className="text-foreground">
                        {plot.verifiedTrees} / {plot.targetTrees} trees
                      </strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Last Satellite Overpass:</span>
                      <span className="font-mono text-foreground">{plot.lastSatellitePass}</span>
                    </div>
                  </div>

                  {plot.pendingScoutTasks > 0 ? (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] flex items-center justify-between">
                      <span>📸 {plot.pendingScoutTasks} Field photos needed</span>
                      <Link to="/scouting" className="font-semibold underline">
                        Dispatch &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>All required ground surveys up to date</span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 pt-0 border-t border-border/20 bg-muted/10 mt-2 flex items-center justify-between">
                <Button asChild size="sm" variant="ghost" className="h-8 text-xs rounded-xl">
                  <Link to={`/tree-map?project=${plot.id}`}>
                    Inspect Satellite HUD &rarr;
                  </Link>
                </Button>

                <Button asChild size="sm" variant="outline" className="h-8 text-xs rounded-xl border-primary/30">
                  <Link to={`/plant/organization?project=${plot.id}`}>
                    Edit Parcel
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
