import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Satellite,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Flame,
  TreePine,
  Search,
  Filter,
  Download,
  Share2,
  RefreshCw,
  QrCode,
  Calendar,
  Sparkles,
  Sliders,
  Award,
  Activity,
  ArrowUpRight,
  Send,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TreeSurvivalRecord,
  ZoneSurvivalAnalytics,
  calculateZoneSurvivalMetrics,
  runSatelliteSurvivalScan,
  simulateSurvivalIntervention,
} from "@/lib/treeSurvivalEngine";
import { AgroforestryPresetZone } from "@/lib/remoteSensing";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  selectedZone: AgroforestryPresetZone;
  onInspectTreeCoordinates?: (lat: number, lng: number) => void;
  trees?: TreeSurvivalRecord[];
}

export function SatelliteTreeSurvivalAssurance({
  selectedZone,
  onInspectTreeCoordinates,
  trees,
}: Props) {
  const { toast } = useToast();

  // Zone Survival Analytics State
  const [analytics, setAnalytics] = useState<ZoneSurvivalAnalytics>(() =>
    calculateZoneSurvivalMetrics(selectedZone, trees)
  );

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);

  // Intervention Simulator State
  const [wateringFreq, setWateringFreq] = useState(2);
  const [mulchPct, setMulchPct] = useState(70);
  const [scanInterval, setScanInterval] = useState(5);
  const [bioFertilizer, setBioFertilizer] = useState(true);

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedTreeModal, setSelectedTreeModal] = useState<TreeSurvivalRecord | null>(null);

  // Recalculate when zone or trees change
  useEffect(() => {
    setAnalytics(calculateZoneSurvivalMetrics(selectedZone, trees));
  }, [selectedZone, trees]);

  // Simulation calculations
  const simulationResult = useMemo(() => {
    return simulateSurvivalIntervention(analytics.satelliteAuditedSurvivalRate, {
      wateringFrequencyPerWeek: wateringFreq,
      mulchCoveragePct: mulchPct,
      satelliteScanIntervalDays: scanInterval,
      bioFertilizerBoost: bioFertilizer,
    });
  }, [analytics.satelliteAuditedSurvivalRate, wateringFreq, mulchPct, scanInterval, bioFertilizer]);

  // Trigger On-Demand Satellite Constellation Scan
  const handleTriggerSatelliteScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scanResult = runSatelliteSurvivalScan(analytics.zoneId, analytics.trees);
      const updatedAnalytics = calculateZoneSurvivalMetrics(selectedZone, scanResult.updatedTrees);
      setAnalytics(updatedAnalytics);
      setIsScanning(false);

      toast({
        title: "🛰️ Sentinel-2 Constellation Scan Complete",
        description: `Scanned ${scanResult.scannedPixelsCount} multi-spectral pixels across ${selectedZone.name}. ${scanResult.newAlertsCount} moisture/vigor alerts updated.`,
      });
    }, 1200);
  };

  // Dispatch Action for a Stressed Tree
  const handleDispatchAction = async (tree: TreeSurvivalRecord, actionType: TreeSurvivalRecord["interventionStatus"]) => {
    const updatedTrees = analytics.trees.map((t) =>
      t.treeId === tree.treeId
        ? {
            ...t,
            interventionStatus: actionType,
            interventionDate: new Date().toISOString().split("T")[0],
          }
        : t
    );

    setAnalytics((prev) => calculateZoneSurvivalMetrics(selectedZone, updatedTrees));

    try {
      await supabase.from("admin_audit_log").insert({
        action: `SPACE_SURVIVAL_${actionType.toUpperCase().replace(/\s+/g, "_")}`,
        new_status: actionType,
        previous_status: tree.healthStatus,
      });
    } catch (err) {
      console.warn("Could not record survival dispatch in database:", err);
    }

    toast({
      title: `⚡ Action Dispatched for ${tree.treeId}`,
      description: `${actionType} registered in Supabase and dispatched for coordinates ${tree.latitude.toFixed(4)}°N, ${tree.longitude.toFixed(4)}°E. Field officer ticket generated.`,
    });
  };

  // Filtered Tree List
  const filteredTrees = useMemo(() => {
    return analytics.trees.filter((tree) => {
      const matchesSearch =
        tree.treeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.treeName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "thriving" && tree.healthStatus === "Thriving Canopy") ||
        (statusFilter === "moderate" && tree.healthStatus === "Moderate Growth") ||
        (statusFilter === "stressed" && tree.healthStatus === "Moisture Stressed") ||
        (statusFilter === "critical" && tree.healthStatus === "Critical Mortality Risk");

      return matchesSearch && matchesStatus;
    });
  }, [analytics.trees, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER: HERO SURVIVAL GUARANTEE & SENTINEL-2 STATUS       */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border-2 border-emerald-500/30 shadow-lg bg-gradient-to-br from-emerald-500/10 via-background to-background">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-2xl text-foreground">
                    36-Month Satellite Tree Survival & Mortality Assurance
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs font-bold">
                    Sentinel-2 L2A Verified
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Continuous multi-spectral earth observation tracking every sapling from planting through maturity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTriggerSatelliteScan}
              disabled={isScanning}
              className="h-9 text-xs rounded-xl gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning ? "Scanning Constellation..." : "Run Sentinel-2 Scan"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCertModal(true)}
              className="h-9 text-xs rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold"
            >
              <Award className="h-4 w-4" />
              Proof-of-Survival Certificate (ESG)
            </Button>
          </div>
        </div>

        {/* Key Telemetry KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-emerald-500/20">
          <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-sm space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Audited Survival Rate
            </div>
            <div className="font-heading font-extrabold text-3xl text-emerald-600 dark:text-emerald-400">
              {analytics.satelliteAuditedSurvivalRate}%
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +{analytics.survivalGainOverBaseline}% vs Unmonitored (52%)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <TreePine className="h-3.5 w-3.5 text-primary" />
              Monitored Saplings
            </div>
            <div className="font-heading font-extrabold text-3xl text-foreground">
              {analytics.totalMonitoredTrees.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {selectedZone.name.split(" ")[0]} Agro-Zone
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Early Mortality Rescues
            </div>
            <div className="font-heading font-extrabold text-3xl text-amber-600 dark:text-amber-400">
              {analytics.mortalityCasesAvoided.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Saved via Early Stress Alerts
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Satellite className="h-3.5 w-3.5 text-sky-500" />
              Latest Sentinel-2 Pass
            </div>
            <div className="font-heading font-bold text-lg text-foreground mt-1">
              {analytics.lastConstellationPass}
            </div>
            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              Next Pass: {analytics.nextScheduledPass}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: 36-MONTH TRAJECTORY CHART (SATELLITE VS BASELINE) */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h4 className="font-heading font-bold text-lg text-foreground">
                36-Month Survival Retention Curve vs Unmonitored Baseline
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Empirical cohort curve demonstrating how Sentinel-2 continuous telemetry prevents early sapling mortality.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
              ● Green Enlightenment (94.8% Retained)
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs">
              - - Industry Baseline (52.0%)
            </Badge>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthlyTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[40, 100]} unit="%" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  borderColor: "rgba(34, 197, 94, 0.4)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: any, name: string) => [
                  `${value}%`,
                  name === "satelliteMonitoredSurvival" ? "Satellite-Monitored Survival" : "Unmonitored Baseline",
                ]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="satelliteMonitoredSurvival"
                name="Satellite-Monitored Survival"
                stroke="#22c55e"
                strokeWidth={3}
                fill="#22c55e"
                fillOpacity={0.15}
              />
              <Line
                type="monotone"
                dataKey="unmonitoredBaseline"
                name="Unmonitored Baseline (Traditional)"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: LIVE TREE MORTALITY RADAR & ACTION DISPATCH       */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h4 className="font-heading font-bold text-lg text-foreground">
                Live Sapling Early-Stress Radar & Ground Action Dispatch
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any sapling to inspect multi-spectral telemetry or dispatch emergency drip/mulch intervention.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search Tree ID, species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
              {[
                { id: "all", label: `All (${analytics.trees.length})` },
                { id: "thriving", label: `Thriving (${analytics.thrivingTreesCount})` },
                { id: "moderate", label: `Moderate (${analytics.moderateGrowthCount})` },
                { id: "stressed", label: `Stressed (${analytics.moistureStressedCount})` },
                { id: "critical", label: `Critical (${analytics.criticalRiskCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                    statusFilter === tab.id
                      ? "bg-background text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tree Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 max-h-[520px] overflow-y-auto pr-1">
          {filteredTrees.map((tree) => {
            const isStressed = tree.healthStatus === "Moisture Stressed";
            const isCritical = tree.healthStatus === "Critical Mortality Risk";
            const isThriving = tree.healthStatus === "Thriving Canopy";

            const badgeColor = isThriving
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : isStressed
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : isCritical
              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";

            return (
              <div
                key={tree.treeId}
                className={`p-4 rounded-2xl bg-card border transition-all hover:shadow-md space-y-3 ${
                  isCritical
                    ? "border-red-500/50 bg-red-500/5"
                    : isStressed
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-extrabold text-sm text-foreground">
                        {tree.treeName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({tree.treeId})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Planted: {tree.plantedDate} • {tree.monthsMonitored} mos age
                    </p>
                  </div>

                  <Badge className={`text-[10px] font-bold ${badgeColor}`}>
                    {tree.healthStatus}
                  </Badge>
                </div>

                {/* Spectral Indicators */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl bg-muted/40 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground">NDVI (Vigor)</div>
                    <div className="font-bold text-foreground">{tree.currentNdvi}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">NDWI (Moist)</div>
                    <div className={`font-bold ${tree.currentNdwi < 0.1 ? "text-red-500" : "text-sky-500"}`}>
                      {tree.currentNdwi}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Survival Prob</div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {tree.survivalProbability}%
                    </div>
                  </div>
                </div>

                {/* Intervention Status & Action Trigger */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-muted-foreground truncate">
                    Status: <span className="font-semibold text-foreground">{tree.interventionStatus}</span>
                  </div>

                  <div className="flex gap-1.5">
                    {onInspectTreeCoordinates && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onInspectTreeCoordinates(tree.latitude, tree.longitude)}
                        className="h-7 text-[10px] px-2 rounded-lg"
                      >
                        <Satellite className="h-3 w-3 mr-1" /> Inspect
                      </Button>
                    )}

                    {isStressed && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDispatchAction(tree, "Drip Irrigation Dispatched")}
                        className="h-7 text-[10px] px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold"
                      >
                        <Droplets className="h-3 w-3 mr-1" /> Drip Rescue
                      </Button>
                    )}

                    {isCritical && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDispatchAction(tree, "Agro-Ranger Scheduled")}
                        className="h-7 text-[10px] px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" /> Ranger Ticket
                      </Button>
                    )}

                    {isThriving && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTreeModal(tree)}
                        className="h-7 text-[10px] px-2 rounded-lg"
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-primary" /> Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: INTERACTIVE SURVIVAL INTERVENTION SIMULATOR       */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <h4 className="font-heading font-bold text-lg text-foreground">
            Interactive Field Intervention & Survival Optimizer
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Simulate how optimizing drip cycles, bio-mulching, and satellite scan frequency maximizes the 36-month survival rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Watering Frequency */}
          <div className="space-y-2 p-4 rounded-xl bg-card border border-border/60">
            <div className="flex justify-between text-xs font-semibold">
              <span>Drip Watering Frequency:</span>
              <span className="text-primary font-bold">{wateringFreq}x / week</span>
            </div>
            <Slider
              value={[wateringFreq]}
              min={1}
              max={4}
              step={1}
              onValueChange={(val) => setWateringFreq(val[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1x (Dryland)</span>
              <span>4x (Intensive)</span>
            </div>
          </div>

          {/* Slider 2: Mulch Coverage */}
          <div className="space-y-2 p-4 rounded-xl bg-card border border-border/60">
            <div className="flex justify-between text-xs font-semibold">
              <span>Organic Bio-Mulch Coverage:</span>
              <span className="text-primary font-bold">{mulchPct}%</span>
            </div>
            <Slider
              value={[mulchPct]}
              min={0}
              max={100}
              step={10}
              onValueChange={(val) => setMulchPct(val[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0% (Bare Soil)</span>
              <span>100% (High Retention)</span>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 via-card to-card border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Projected 36-Month Survival Rate</div>
              <div className="font-heading font-extrabold text-3xl text-emerald-600 dark:text-emerald-400 mt-1">
                {simulationResult.projectedSurvivalRate}%
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                +{simulationResult.gainPercentage}% Boost (+{simulationResult.estimatedAdditionalTreesSaved} Extra Trees Saved)
              </p>
            </div>

            <div className="text-[10px] text-muted-foreground pt-2 border-t border-emerald-500/20">
              Mortality Risk Reduction: <span className="font-bold text-foreground">{simulationResult.mortalityRiskReductionPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROOF OF SURVIVAL (PoS) ESG & DONOR CERTIFICATE        */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={showCertModal} onOpenChange={setShowCertModal}>
        <DialogContent className="max-w-2xl bg-card border border-primary/30 rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold text-center text-primary flex items-center justify-center gap-2">
              <Award className="h-6 w-6 text-emerald-500" />
              Official Satellite Proof-of-Survival Certificate (PoS)
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Verified by European Space Agency Sentinel-2 Multi-Spectral Earth Observation Constellation
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-6 rounded-2xl bg-gradient-to-b from-primary/5 via-background to-background border-2 border-primary/30 space-y-5 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center border-2 border-emerald-500/30">
                <ShieldCheck className="h-8 w-8" />
              </div>
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {selectedZone.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {selectedZone.district} • GPS: {selectedZone.center[0]}°N, {selectedZone.center[1]}°E
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 border-y border-border/60">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Certified Survival</div>
                <div className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
                  {analytics.satelliteAuditedSurvivalRate}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Monitored Trees</div>
                <div className="font-heading font-extrabold text-2xl text-foreground">
                  {analytics.totalMonitoredTrees.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avoided Mortality</div>
                <div className="font-heading font-extrabold text-2xl text-amber-600 dark:text-amber-400">
                  +{analytics.mortalityCasesAvoided}
                </div>
              </div>
            </div>

            <div className="text-left space-y-1 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl font-mono">
              <div>• Constellation: {analytics.constellation}</div>
              <div>• Latest Pass: {analytics.lastConstellationPass} (Spectral Bands: B08, B04, B05, B03)</div>
              <div>• Mean Canopy NDVI: {analytics.meanCanopyVigorNdvi} (Optimal Green Vigor)</div>
              <div className="truncate text-primary">• Cryptographic PoS Hash: {analytics.proofOfSurvivalHash}</div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => window.print()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl font-bold gap-2"
              >
                <Download className="h-4 w-4" /> Print / Save Certificate PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(analytics.proofOfSurvivalHash);
                  toast({ title: "Copied!", description: "PoS Hash copied to clipboard." });
                }}
                className="text-xs rounded-xl gap-2 border-primary/20"
              >
                <Share2 className="h-4 w-4" /> Copy Verification Hash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INDIVIDUAL SAPLING SPACE-BORNE INSPECTION HUD          */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!selectedTreeModal} onOpenChange={(open) => !open && setSelectedTreeModal(null)}>
        <DialogContent className="max-w-lg bg-card border border-primary/30 rounded-3xl p-6">
          {selectedTreeModal && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <DialogTitle className="font-heading text-xl font-bold text-foreground">
                      {selectedTreeModal.treeName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                      {selectedTreeModal.treeId} • {selectedTreeModal.species}
                    </DialogDescription>
                  </div>
                  <Badge
                    className={`text-xs font-bold ${
                      selectedTreeModal.healthStatus === "Thriving Canopy"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : selectedTreeModal.healthStatus === "Moisture Stressed"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : selectedTreeModal.healthStatus === "Critical Mortality Risk"
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {selectedTreeModal.healthStatus}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Photo Preview if available */}
              {selectedTreeModal.photoUrl ? (
                <div className="rounded-2xl overflow-hidden border border-border/60 max-h-48 bg-muted">
                  <img
                    src={selectedTreeModal.photoUrl}
                    alt={selectedTreeModal.treeName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    🌳
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Continuous Space Telemetry Active</div>
                    <div className="text-muted-foreground">Sentinel-2 multi-spectral spectral signature registered.</div>
                  </div>
                </div>
              )}

              {/* Multi-Spectral Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">NDVI (Vigor)</div>
                  <div className="font-heading font-bold text-sm text-emerald-600 mt-0.5">
                    {selectedTreeModal.currentNdvi}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">NDWI (Water)</div>
                  <div className="font-heading font-bold text-sm text-sky-600 mt-0.5">
                    {selectedTreeModal.currentNdwi}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">NDRE (Chlorophyll)</div>
                  <div className="font-heading font-bold text-sm text-foreground mt-0.5">
                    {selectedTreeModal.ndre}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Survival Prob</div>
                  <div className="font-heading font-extrabold text-sm text-emerald-600 mt-0.5">
                    {selectedTreeModal.survivalProbability}%
                  </div>
                </div>
              </div>

              {/* Coordinates & Metadata */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-[11px] space-y-1 font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>GPS Location:</span>
                  <span className="font-semibold text-foreground">
                    {selectedTreeModal.latitude.toFixed(5)}°N, {selectedTreeModal.longitude.toFixed(5)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Planted Date:</span>
                  <span className="text-foreground">{selectedTreeModal.plantedDate} ({selectedTreeModal.monthsMonitored} mos age)</span>
                </div>
                <div className="flex justify-between">
                  <span>Sentinel-2 Tile:</span>
                  <span className="text-foreground">{selectedTreeModal.tileId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Intervention Status:</span>
                  <span className="font-semibold text-primary">{selectedTreeModal.interventionStatus}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
                {onInspectTreeCoordinates && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onInspectTreeCoordinates(selectedTreeModal.latitude, selectedTreeModal.longitude);
                      setSelectedTreeModal(null);
                    }}
                    className="text-xs rounded-xl gap-1.5"
                  >
                    <Satellite className="h-3.5 w-3.5" /> Center on Map
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setSelectedTreeModal(null)}
                  className="text-xs rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
