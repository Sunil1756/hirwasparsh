import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  MapPin,
  ClipboardCheck,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  TreePine,
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  Clock,
  Sparkles,
  Camera,
  Navigation,
  FileSpreadsheet,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FieldReportSubmissionWizard } from "@/components/FieldReportSubmissionWizard";
import { MultiSourceSurvivalScoreCard } from "@/components/MultiSourceSurvivalScoreCard";
import { getOfflineTreeQueue, syncOfflineTreesWithSupabase } from "@/lib/offlineSyncService";
import {
  getQueuedOfflineFieldReportsCount,
  syncQueuedOfflineFieldReports,
} from "@/lib/fieldReportBackendService";
import { RiskAlertNotificationBanner } from "@/components/RiskAlertNotificationBanner";
import { Link } from "react-router-dom";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import { FastTreeRegistrationConsole } from "@/components/mobile/FastTreeRegistrationConsole";
import { Smartphone, Monitor } from "lucide-react";

export default function FieldWorkerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isMobileMode, setIsMobileMode] = useState(false);
  const [fastRegisterModalOpen, setFastRegisterModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("demo-project-dev-001");
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Vitality Quick Calculator state
  const [livingCount, setLivingCount] = useState<number>(95);
  const [stressedCount, setStressedCount] = useState<number>(10);
  const [deadCount, setDeadCount] = useState<number>(5);

  // User's live GPS coordinates
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check offline queue count
    const totalOffline = getOfflineTreeQueue().length + getQueuedOfflineFieldReportsCount();
    setOfflineCount(totalOffline);

    // Watch position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => console.warn("GPS error:", err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch recent field audits
  const { data: recentAudits = [], isLoading: isAuditsLoading } = useQuery({
    queryKey: ["field-worker-audits", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("project_evidence")
          .select("id, project_id, evidence_type, created_at, metadata, file_url")
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return data || [];
      } catch {
        return [
          {
            id: "ev-demo-1",
            project_id: "demo-project-dev-001",
            evidence_type: "field_ground_photo",
            created_at: new Date().toISOString(),
            metadata: {
              trees_observed: 100,
              trees_healthy: 92,
              trees_stressed: 6,
              trees_dead: 2,
              ground_survival_rate: 95,
              location_name: "Western Ghats Sector 4",
            },
            file_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
          },
        ];
      }
    },
  });

  // Mock / dynamic predictive risk dispatch tasks
  const fieldTasks = [
    {
      id: "task-01",
      title: "Moisture Stress Anomaly Check",
      location: "Sector 4B - Pune Hills (18.5204° N, 73.8567° E)",
      severity: "high",
      cause: "NDWI deficit (-0.18) & 6d dry spell detected by Sentinel-2",
      treesSample: 120,
      status: "pending",
      lat: 18.5204,
      lng: 73.8567,
    },
    {
      id: "task-02",
      title: "5% Cochran Ground Truth Spot Audit",
      location: "Ratnagiri Mango Plantation (16.9902° N, 73.3120° E)",
      severity: "medium",
      cause: "Quarterly MRV verification audit required for carbon credit issuance",
      treesSample: 85,
      status: "pending",
      lat: 16.9902,
      lng: 73.3120,
    },
    {
      id: "task-03",
      title: "Canopy Defoliation Inspection",
      location: "Mahabaleshwar Native Preserve (17.9237° N, 73.6586° E)",
      severity: "low",
      cause: "NDRE slope decrease (-0.08/mo) indicating possible aphid outbreak",
      treesSample: 50,
      status: "in_progress",
      lat: 17.9237,
      lng: 73.6586,
    },
  ];

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const treeRes = await syncOfflineTreesWithSupabase(user?.id);
      const reportRes = await syncQueuedOfflineFieldReports();
      const totalSynced = treeRes.syncedCount + reportRes.syncedCount;
      const totalFailed = treeRes.failedCount + reportRes.failedCount;
      const newCount = getOfflineTreeQueue().length + getQueuedOfflineFieldReportsCount();
      setOfflineCount(newCount);
      toast({
        title: "🔄 Offline Sync Completed",
        description: `Synced ${totalSynced} items (${totalFailed} pending).`,
      });
      queryClient.invalidateQueries({ queryKey: ["field-worker-audits"] });
    } catch (e: any) {
      toast({
        title: "Sync failed",
        description: e?.message || "Could not sync offline items.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Ground survival rate calculation
  const totalTreesEvaluated = livingCount + stressedCount + deadCount;
  const calculatedSurvivalRate =
    totalTreesEvaluated > 0
      ? ((livingCount + 0.5 * stressedCount) / totalTreesEvaluated) * 100
      : 100;

  if (isMobileMode) {
    return (
      <div className="min-h-screen pt-16 bg-background">
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Smartphone className="h-4 w-4" /> Mobile Field Mode Active
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMobileMode(false)}
            className="h-7 text-xs rounded-lg border-amber-500/40 text-amber-800 dark:text-amber-200"
          >
            <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop View
          </Button>
        </div>
        <MobileFieldInterface
          currentLocation={userLocation}
          projectId={selectedProjectId}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background via-amber-500/[0.02] to-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm">
                <Compass className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold">Field Scout & Ranger Console</h1>
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                    Field Worker Operative
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Ground truth verification, 5% Cochran spot audits, GPS waypoint inspections, and offline sync.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMode(true)}
                className="gap-1.5 text-xs font-semibold rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile Field Mode
              </Button>

              <Button
                data-testid="desktop-fast-register-btn"
                onClick={() => setFastRegisterModalOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                <Zap className="h-4 w-4" /> Fast Tree Register
              </Button>

              <Button
                onClick={() => setWizardOpen(true)}
                className="gap-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md"
              >
                <Camera className="h-4 w-4" /> Start 5% Spot Audit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="gap-1.5 text-xs font-semibold rounded-xl border-amber-500/30"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-amber-600" : ""}`} />
                Sync Offline ({offlineCount})
              </Button>
            </div>
          </div>

          {/* Real-Time Automated AI Risk Dispatch Alerts */}
          <RiskAlertNotificationBanner
            role="field_worker"
            onSelectAction={() => {
              setSelectedProjectId("demo-project-dev-001");
              setWizardOpen(true);
            }}
          />

          {/* AI Sentinel-2 Anomaly Alert Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-foreground">
                      Active AI Telemetry Anomaly Detected: Sector 4B Moisture Deficit
                    </h3>
                    <Badge className="bg-rose-500 text-white text-[10px]">Urgent Dispatch</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
                    Sentinel-2 multi-spectral scan detected <strong>NDWI foliar deficit (-0.18)</strong> and elevated surface temperatures. <strong>5% Cochran spot audit</strong> and moisture remediation are requested within <strong>3 days</strong>.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setSelectedProjectId("demo-project-dev-001");
                  setWizardOpen(true);
                }}
                size="sm"
                className="rounded-xl gap-2 font-semibold text-xs whitespace-nowrap shrink-0 shadow-md bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Camera className="h-3.5 w-3.5" /> Execute Spot Audit Now
              </Button>
            </div>
          </div>

          {/* Real-Time Connectivity & Operative Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Network Status</span>
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {isOnline ? "Online (Live API)" : "Offline Mode"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {isOnline ? "Direct Cloud Upload" : "Queued in Local Storage"}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Offline Queue</span>
                <UploadCloud className="h-4 w-4 text-amber-600" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {offlineCount} Audits
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">
                {offlineCount === 0 ? "All Audits Synchronized" : "Pending Auto-Upload"}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>GPS Fix</span>
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {userLocation ? `±${Math.round(userLocation.accuracy)}m` : "Acquiring..."}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {userLocation
                  ? `${userLocation.lat.toFixed(4)}°, ${userLocation.lng.toFixed(4)}°`
                  : "High-Precision GPS"}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Audit Standard</span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                5% Cochran
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">Confidence Level 95% (e=±5%)</div>
            </div>
          </div>

          {/* 3-Pillar Multi-Source Survival Confidence MRV Dial & Parameter Simulator */}
          <div className="mb-2">
            <MultiSourceSurvivalScoreCard
              projectName="Maharashtra Agroforestry Field Sector"
              initialParams={{
                totalPlantedTrees: 500,
                livingCount: livingCount,
                stressedCount: stressedCount,
                deadCount: deadCount,
                currentMeanNdvi: 0.74,
                baselineNdvi: 0.65,
                overpassCount: 5,
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["field-worker-audits"] })}
            />
          </div>

          {/* Main Grid: Left Column (Tasks & Calculations) | Right Column (Recent Field Audits) */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Actionable Field Tasks & Vitality Calculator */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Anomaly Dispatch Queue */}
              <div className="glass-card rounded-3xl p-6 border border-amber-500/20 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h2 className="font-heading text-lg font-bold">Predictive Risk Anomaly Dispatch Tasks</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {fieldTasks.length} Active Waypoints
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  High-priority ground waypoints generated from satellite NDVI drops, NDWI moisture stress, or defoliation trends.
                </p>

                <div className="space-y-3">
                  {fieldTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl border border-border/80 bg-background/60 hover:bg-background/90 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm text-foreground">
                            {task.title}
                          </span>
                          <Badge
                            className={`text-[10px] ${
                              task.severity === "high"
                                ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                                : task.severity === "medium"
                                ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                            }`}
                          >
                            {task.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{task.location}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground italic">
                          Telemetry Cause: {task.cause} · Sample: {task.treesSample} trees
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProjectId("demo-project-dev-001");
                            setWizardOpen(true);
                          }}
                          className="h-8 px-3 text-xs gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                        >
                          <Camera className="h-3.5 w-3.5" /> Inspect On-Site
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Interactive Ground Truth Vitality Estimator (Cochran Weighting) */}
              <div className="glass-card rounded-3xl p-6 border border-primary/20 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-bold">Ground Truth Survival Calculator</h2>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    0.5 Salvage Factor
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Estimate field survival percentage using the IPCC standard: Living ($1.0$), Stressed ($0.5$), Dead ($0.0$).
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-emerald-600 font-semibold">Living Trees (1.0x)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={livingCount}
                      onChange={(e) => setLivingCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-600 font-semibold">Stressed Trees (0.5x)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={stressedCount}
                      onChange={(e) => setStressedCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive font-semibold">Dead / Lost (0.0x)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={deadCount}
                      onChange={(e) => setDeadCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Computed Ground Truth Survival:</div>
                    <div className="font-heading text-2xl font-bold text-foreground">
                      {calculatedSurvivalRate.toFixed(1)}% Survival
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <div>Total Evaluated: <strong>{totalTreesEvaluated} Trees</strong></div>
                    <div>Effective Weight: <strong>{(livingCount + 0.5 * stressedCount).toFixed(1)} Equiv. Living</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Recent Field Audit Submissions */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-border shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-bold">Recent Field Audits</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {recentAudits.length} Logged
                  </Badge>
                </div>

                {isAuditsLoading ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">Loading field audits...</p>
                ) : recentAudits.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No field audits submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAudits.map((audit: any) => {
                      const meta = audit.metadata || {};
                      return (
                        <div
                          key={audit.id}
                          className="p-3.5 rounded-2xl border border-border/80 bg-background/50 space-y-2 hover:bg-background/80 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground truncate max-w-[150px]">
                              {meta.location_name || audit.project_id || "Field Site"}
                            </span>
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                              {meta.ground_survival_rate ? `${meta.ground_survival_rate}% Survival` : "Verified"}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>Observed: {meta.trees_observed || 100} trees</span>
                            <span>{new Date(audit.created_at).toLocaleDateString()}</span>
                          </div>

                          {audit.file_url && (
                            <img
                              src={audit.file_url}
                              alt="Audit"
                              className="w-full h-24 object-cover rounded-xl border mt-1"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="glass-card rounded-3xl p-5 border border-primary/20 bg-primary/5 space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground">Ranger Quick Tools</h3>
                <div className="space-y-2">
                  <Link to="/tree-map" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs rounded-xl gap-2">
                      <Navigation className="h-3.5 w-3.5 text-primary" /> Open GIS Satellite Overlay
                    </Button>
                  </Link>
                  <Link to="/bulk-onboard" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs rounded-xl gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary" /> Bulk GPS CSV Import
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Field Report Submission Wizard Modal */}
      <FieldReportSubmissionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={selectedProjectId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["field-worker-audits"] });
          setOfflineCount(getOfflineTreeQueue().length);
        }}
      />

      {/* Fast Tree Registration Fullscreen Overlay Modal */}
      <AnimatePresence>
        {fastRegisterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto"
          >
            <FastTreeRegistrationConsole
              currentLocation={userLocation}
              projectId={selectedProjectId}
              onClose={() => setFastRegisterModalOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
