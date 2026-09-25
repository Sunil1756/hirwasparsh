import React, { useState, useEffect } from "react";
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
  Sun,
  Moon,
  Battery,
  BatteryCharging,
  Sliders,
  Plus,
  Minus,
  Globe,
  Trash2,
  Flame,
  Activity,
  ArrowRightLeft,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldWaypointCompass, WaypointTarget } from "./FieldWaypointCompass";
import { RapidFieldActionDrawer } from "./RapidFieldActionDrawer";
import { FastTreeRegistrationConsole } from "./FastTreeRegistrationConsole";
import { FastObservationConsole } from "./FastObservationConsole";
import { HardwarePermissionSentinel } from "./HardwarePermissionSentinel";
import { HardwarePermissionModal } from "./HardwarePermissionModal";
import { NetworkQualitySentinel } from "./NetworkQualitySentinel";
import { OfflineNetworkDrawer } from "./OfflineNetworkDrawer";
import { FieldTestSimulationSuite } from "./FieldTestSimulationSuite";
import { useSyncConflicts } from "@/hooks/useSyncConflicts";
import { offlineSyncManager } from "@/services/offlineSyncManager";
import { networkQualityService } from "@/services/networkQualityService";
import { getOfflineTreeQueue, syncOfflineTreesWithSupabase } from "@/lib/offlineSyncService";
import { getQueuedOfflineFieldReportsCount, syncQueuedOfflineFieldReports } from "@/lib/fieldReportBackendService";
import { toast } from "sonner";

export interface MobileFieldInterfaceProps {
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
  projectId?: string;
  className?: string;
}

export type MobileTab = "tasks" | "compass" | "tally" | "queue";

export const MobileFieldInterface: React.FC<MobileFieldInterfaceProps> = ({
  currentLocation,
  projectId = "demo-project-dev-001",
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>("tasks");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [sunlightMode, setSunlightMode] = useState(false);
  const [language, setLanguage] = useState<"en" | "mr" | "hi">("en");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync Conflict Tracking
  const { pendingConflictCount } = useSyncConflicts();

  // Drawer Modals & Fast Consoles
  const [isFastPlantOpen, setIsFastPlantOpen] = useState(false);
  const [isFastObservationOpen, setIsFastObservationOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"plant" | "audit">("plant");
  const [selectedWaypoint, setSelectedWaypoint] = useState<WaypointTarget | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isOfflineDrawerOpen, setIsOfflineDrawerOpen] = useState(false);
  const [isFieldTestOpen, setIsFieldTestOpen] = useState(false);

  // Quick Compartment Vitality Tally state
  const [tallyAlive, setTallyAlive] = useState(88);
  const [tallyStressed, setTallyStressed] = useState(8);
  const [tallyDead, setTallyDead] = useState(4);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const updateQueue = () => {
      const count = getOfflineTreeQueue().length + getQueuedOfflineFieldReportsCount();
      setOfflineQueueCount(count);
    };

    updateQueue();
    const interval = setInterval(updateQueue, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.error("No network connection available. Keep working offline.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncOfflineTreesWithSupabase();
      await syncQueuedOfflineFieldReports();
      setOfflineQueueCount(getOfflineTreeQueue().length + getQueuedOfflineFieldReportsCount());
      toast.success("All offline field records synced to cloud!");
    } catch {
      toast.error("Sync encountered an error, will retry.");
    } finally {
      setIsSyncing(false);
    }
  };

  const totalTally = tallyAlive + tallyStressed + tallyDead;
  const survivalRatePct = totalTally > 0 ? ((tallyAlive / totalTally) * 100).toFixed(1) : "100.0";

  const fieldWorkOrders = [
    {
      id: "wo-001",
      title: "Moisture Stress Anomaly Check",
      location: "Sector 4B - Mulshi (18.4735°N, 73.4361°E)",
      severity: "high",
      cause: "Sentinel-2 NDWI deficit (-0.18) & 6d dry spell",
      sampleCount: 40,
      target: {
        id: "wo-001-target",
        name: "Sector 4B Banyan Mother Tree",
        latitude: 18.473521,
        longitude: 73.436102,
        species: "Banyan",
        type: "anomaly_spot" as const,
      },
    },
    {
      id: "wo-002",
      title: "5% Cochran Ground Spot Audit",
      location: "Paithan Zone 1 (19.4812°N, 75.3861°E)",
      severity: "medium",
      cause: "Quarterly carbon MRV verification audit",
      sampleCount: 25,
      target: {
        id: "wo-002-target",
        name: "Paithan Neem Sapling Spot #02",
        latitude: 19.481234,
        longitude: 75.386128,
        species: "Neem",
        type: "tree" as const,
      },
    },
  ];

  if (isFastPlantOpen) {
    return (
      <FastTreeRegistrationConsole
        currentLocation={currentLocation}
        projectId={projectId}
        onClose={() => setIsFastPlantOpen(false)}
      />
    );
  }

  if (isFastObservationOpen) {
    return (
      <FastObservationConsole
        currentLocation={currentLocation}
        projectId={projectId}
        onClose={() => setIsFastObservationOpen(false)}
      />
    );
  }

  return (
    <div
      className={`flex flex-col min-h-screen bg-background text-foreground transition-colors ${
        sunlightMode ? "bg-amber-100 dark:bg-amber-950 text-black dark:text-amber-100 font-medium" : ""
      } ${className}`}
      data-testid="mobile-field-interface"
    >
      {/* 1. TOP MOBILE TELEMETRY & STATUS BAR */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/70 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {/* Real-time Network Quality Sentinel (4G / 2G Data Saver / Offline) */}
          <NetworkQualitySentinel onOpenDrawer={() => setIsOfflineDrawerOpen(true)} />

          {/* GPS Accuracy Pill */}
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary flex items-center gap-1 font-mono">
            <MapPin className="w-3 h-3 text-primary" />
            ±{currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "3.2"}m
          </Badge>

          {/* Hardware Permission Sentinel Pill */}
          <HardwarePermissionSentinel onOpenModal={() => setIsPermissionModalOpen(true)} />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* Offline Queue Badge & Fast Sync */}
          {offlineQueueCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncAll}
              disabled={isSyncing || !isOnline}
              className="h-7 px-2 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              Sync ({offlineQueueCount})
            </Button>
          )}

          {/* Sunlight High Contrast Mode Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`h-7 w-7 p-0 rounded-lg ${sunlightMode ? "bg-amber-400 text-black" : "text-muted-foreground"}`}
            title="Toggle Sunlight Readability Mode"
          >
            <Sun className="h-4 w-4" />
          </Button>

          {/* Vernacular Language Switcher */}
          <button
            onClick={() => setLanguage(language === "en" ? "mr" : language === "mr" ? "hi" : "en")}
            className="px-2 py-1 bg-accent rounded-lg text-[10px] font-bold text-foreground border border-border/60"
          >
            {language.toUpperCase()}
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <main className="flex-1 p-4 pb-28 space-y-4 max-w-xl mx-auto w-full">
        {/* Sync Conflict Warning Banner */}
        {pendingConflictCount > 0 && (
          <div
            data-testid="sync-conflict-banner"
            className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-100 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold font-heading truncate">
                  {pendingConflictCount} Sync Conflict{pendingConflictCount > 1 ? "s" : ""} Staged
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Divergent field records require resolution before cloud push.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOfflineDrawerOpen(true)}
              className="h-7 text-xs font-semibold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0"
            >
              Resolve
            </Button>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-3.5" data-testid="mobile-tasks-view">
            {/* Quick Fast Tree Registration Action Card */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <TreePine className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">Fast Tree Registration</h3>
                    <p className="text-[11px] text-white/80">Sub-5s streak planting & spacing radar</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-mono">
                  Sub-5s
                </Badge>
              </div>
              <Button
                data-testid="start-fast-registration-btn"
                onClick={() => setIsFastPlantOpen(true)}
                className="w-full bg-white text-emerald-800 hover:bg-white/90 text-xs font-bold h-9 rounded-xl shadow-md"
              >
                Launch Fast Registration Mode →
              </Button>
            </div>

            {/* Field Hardware Sensor Readiness Bar */}
            <div className="bg-card rounded-2xl p-3 border border-border/80 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Sensor Readiness</span>
                  <p className="text-[10px] text-muted-foreground">GPS lock & Field Camera status</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPermissionModalOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                data-testid="open-sensor-readiness-btn"
              >
                Inspect Sensors →
              </Button>
            </div>

                        {/* Field Test Simulation Suite Action Card */}
            <div className="bg-card rounded-2xl p-3 border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Field Testing Suite</span>
                  <p className="text-[10px] text-muted-foreground">Simulate GPS walk, streak & 2G offline</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFieldTestOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                data-testid="open-field-test-suite-btn"
              >
                Launch Suite →
              </Button>
            </div>

            {/* Quick Fast Tree Observation Action Card */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-4 text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">Fast Tree Observation</h3>
                    <p className="text-[11px] text-white/80">Sub-3s health audit, proximity lock & threat tags</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-mono">
                  1-Tap
                </Badge>
              </div>
              <Button
                data-testid="start-fast-observation-btn"
                onClick={() => setIsFastObservationOpen(true)}
                className="w-full bg-white text-amber-900 hover:bg-white/90 text-xs font-bold h-9 rounded-xl shadow-md"
              >
                Launch Fast Observation Mode →
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-base text-foreground">Assigned Field Tasks</h2>
                <p className="text-xs text-muted-foreground">Ground audits & high priority work orders</p>
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                {fieldWorkOrders.length} Active
              </Badge>
            </div>

            {fieldWorkOrders.map((task) => (
              <div
                key={task.id}
                className="glass-card rounded-2xl p-4 border border-border/80 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                      {task.title}
                    </span>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-primary" /> {task.location}
                    </p>
                  </div>
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                    task.severity === "high" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {task.severity.toUpperCase()}
                  </Badge>
                </div>

                <div className="bg-background/80 rounded-xl p-2.5 border border-border/60 text-xs space-y-1">
                  <div className="text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Trigger: </span>
                    {task.cause}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Sample Size: </span>
                    {task.sampleCount} trees
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedWaypoint(task.target);
                      setActiveTab("compass");
                    }}
                    className="flex-1 h-9 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Navigation className="h-3.5 w-3.5 mr-1.5" /> Navigate (Compass)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDrawerMode("audit");
                      setDrawerOpen(true);
                    }}
                    className="flex-1 h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Audit Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "compass" && (
          <div className="space-y-4" data-testid="mobile-compass-view">
            <FieldWaypointCompass
              currentLocation={currentLocation}
              target={selectedWaypoint}
            />
          </div>
        )}

        {activeTab === "tally" && (
          <div className="space-y-4" data-testid="mobile-tally-view">
            <div className="glass-card rounded-2xl p-5 border border-border/80 shadow-md space-y-4">
              <div>
                <h2 className="font-heading font-bold text-base text-foreground">Vitality Quick Tally</h2>
                <p className="text-xs text-muted-foreground">High-speed compartment tree counter</p>
              </div>

              {/* Survival Score Output */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-primary/10 to-transparent p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Survival Rate</span>
                  <div className="text-3xl font-extrabold font-mono text-foreground">{survivalRatePct}%</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Total Counted: <span className="font-bold text-foreground font-mono">{totalTally}</span></div>
                  <div>Healthy: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{tallyAlive}</span></div>
                </div>
              </div>

              {/* Tally Step Counters */}
              <div className="space-y-3">
                {/* Alive Counter */}
                <div className="bg-background/80 p-3 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <span className="font-bold text-sm text-foreground">Alive / Thriving</span>
                      <p className="text-[10px] text-muted-foreground">सजीव / सुदृढ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setTallyAlive(Math.max(0, tallyAlive - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-extrabold text-lg font-mono">{tallyAlive}</span>
                    <Button size="icon" className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTallyAlive(tallyAlive + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stressed Counter */}
                <div className="bg-background/80 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <div>
                      <span className="font-bold text-sm text-foreground">Stressed</span>
                      <p className="text-[10px] text-muted-foreground">पाण्याचा ताण</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setTallyStressed(Math.max(0, tallyStressed - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-extrabold text-lg font-mono">{tallyStressed}</span>
                    <Button size="icon" className="h-10 w-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setTallyStressed(tallyStressed + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dead Counter */}
                <div className="bg-background/80 p-3 rounded-2xl border border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-rose-500" />
                    <div>
                      <span className="font-bold text-sm text-foreground">Dead / Missing</span>
                      <p className="text-[10px] text-muted-foreground">मृत / फेरलागवड</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setTallyDead(Math.max(0, tallyDead - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-extrabold text-lg font-mono">{tallyDead}</span>
                    <Button size="icon" className="h-10 w-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setTallyDead(tallyDead + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "queue" && (
          <div className="space-y-4" data-testid="mobile-queue-view">
            <div className="glass-card rounded-2xl p-5 border border-border/80 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-base text-foreground">Offline Storage & Sync</h2>
                  <p className="text-xs text-muted-foreground">Local IndexedDB drafts & sync engine</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
                  {offlineQueueCount} queued
                </Badge>
              </div>

              <div className="bg-background/80 rounded-xl p-3 border border-border/60 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Engine:</span>
                  <span className="font-semibold text-foreground">IndexedDB / Dexie.js</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-Sync on Network:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Enabled ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unsynced Tree Plantings:</span>
                  <span className="font-mono font-bold text-foreground">{getOfflineTreeQueue().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unsynced Audit Reports:</span>
                  <span className="font-mono font-bold text-foreground">{getQueuedOfflineFieldReportsCount()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsOfflineDrawerOpen(true)}
                  variant="outline"
                  className="flex-1 h-11 text-xs font-bold rounded-xl border-primary/30 text-primary"
                  data-testid="open-offline-manager-btn"
                >
                  Manage Offline Cache →
                </Button>
                <Button
                  onClick={handleSyncAll}
                  disabled={isSyncing || !isOnline || offlineQueueCount === 0}
                  className="flex-1 h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  data-testid="sync-pending-records-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isOnline ? "Sync All Now" : "Offline Mode"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION (THUMB ZONE) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/80 px-2 py-2 flex items-center justify-around shadow-2xl max-w-xl mx-auto">
        <button
          data-testid="tab-nav-tasks"
          onClick={() => setActiveTab("tasks")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === "tasks" ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-[10px] mt-1">Tasks</span>
        </button>

        <button
          data-testid="tab-nav-compass"
          onClick={() => setActiveTab("compass")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === "compass" ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] mt-1">Compass</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="relative -top-5">
          <button
            data-testid="fab-fast-plant"
            onClick={() => setIsFastPlantOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl flex flex-col items-center justify-center border-4 border-background active:scale-95 transition-transform"
            title="Fast Tree Registration"
          >
            <TreePine className="h-6 w-6" />
          </button>
        </div>

        <button
          data-testid="tab-nav-tally"
          onClick={() => setActiveTab("tally")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === "tally" ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-5 w-5" />
          <span className="text-[10px] mt-1">Tally</span>
        </button>

        <button
          data-testid="tab-nav-queue"
          onClick={() => setActiveTab("queue")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${
            activeTab === "queue" ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloud className="h-5 w-5" />
          <span className="text-[10px] mt-1">Sync</span>
          {offlineQueueCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
          )}
        </button>
      </nav>

      {/* 4. RAPID ACTION DRAWER */}
      <RapidFieldActionDrawer
        isOpen={drawerOpen}
        mode={drawerMode}
        onClose={() => setDrawerOpen(false)}
        currentLocation={currentLocation}
        projectId={projectId}
      />

      {/* 5. HARDWARE PERMISSION & DIAGNOSTICS MODAL */}
      <HardwarePermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
      />

      {/* 6. OFFLINE & POOR-NETWORK DRAWER */}
      <OfflineNetworkDrawer
        isOpen={isOfflineDrawerOpen}
        onClose={() => setIsOfflineDrawerOpen(false)}
      />

      {/* 7. FIELD TEST SIMULATION SUITE */}
      <FieldTestSimulationSuite
        isOpen={isFieldTestOpen}
        onClose={() => setIsFieldTestOpen(false)}
        currentLocation={currentLocation}
        projectId={projectId}
      />
    </div>
  );
};
