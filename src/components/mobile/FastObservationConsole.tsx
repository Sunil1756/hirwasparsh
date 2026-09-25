import React, { useState, useEffect } from "react";
import {
  Activity,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Compass,
  Radio,
  History,
  QrCode,
  TreePine,
  Search,
  Check,
  Zap,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fastObservationService,
  FIELD_THREAT_TAGS,
  HEIGHT_DELTA_PRESETS,
  FOLIAGE_DENSITY_PRESETS,
  TreeInspectionCandidate,
  FastObservationResult,
  FastObservationSession,
  ProximityTargetTree,
} from "@/services/fastObservationService";
import { toast } from "sonner";
import { FieldCameraViewfinder } from "./FieldCameraViewfinder";
import { HardwarePermissionModal } from "./HardwarePermissionModal";

export interface FastObservationConsoleProps {
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
  projectId?: string;
  projectName?: string;
  inspectorId?: string;
  inspectorName?: string;
  initialTargetTree?: TreeInspectionCandidate;
  candidateTrees?: TreeInspectionCandidate[];
  onSuccess?: (result: FastObservationResult) => void;
  onClose?: () => void;
  className?: string;
}

const DEFAULT_CANDIDATES: TreeInspectionCandidate[] = [
  {
    id: "tree-c1",
    treeCode: "GE-2026-000101",
    species: "Neem",
    vernacularName: "कडूलिंब",
    plantationDate: "2026-01-15",
    currentHeightCm: 125,
    lastStatus: "healthy",
    latitude: 18.473525,
    longitude: 73.436105,
    compartmentName: "Block A-1 (Ridge)",
  },
  {
    id: "tree-c2",
    treeCode: "GE-2026-000102",
    species: "Banyan",
    vernacularName: "वड",
    plantationDate: "2026-01-15",
    currentHeightCm: 160,
    lastStatus: "healthy",
    latitude: 18.473560,
    longitude: 73.436120,
    compartmentName: "Block A-1 (Ridge)",
  },
  {
    id: "tree-c3",
    treeCode: "GE-2026-000103",
    species: "Peepal",
    vernacularName: "पिंपळ",
    plantationDate: "2026-01-15",
    currentHeightCm: 145,
    lastStatus: "stressed",
    latitude: 18.473590,
    longitude: 73.436140,
    compartmentName: "Block A-1 (Ridge)",
  },
  {
    id: "tree-c4",
    treeCode: "GE-2026-000104",
    species: "Teak",
    vernacularName: "सागवान",
    plantationDate: "2026-01-20",
    currentHeightCm: 115,
    lastStatus: "healthy",
    latitude: 18.473630,
    longitude: 73.436170,
    compartmentName: "Block A-1 (Ridge)",
  },
  {
    id: "tree-c5",
    treeCode: "GE-2026-000105",
    species: "Mahua",
    vernacularName: "मोह",
    plantationDate: "2026-01-20",
    currentHeightCm: 105,
    lastStatus: "healthy",
    latitude: 18.473670,
    longitude: 73.436200,
    compartmentName: "Block A-1 (Ridge)",
  },
];

export const FastObservationConsole: React.FC<FastObservationConsoleProps> = ({
  currentLocation,
  projectId = "demo-project-dev-001",
  projectName = "Western Ghats Sahyadri Reforestation",
  inspectorId = "field-ranger-01",
  inspectorName = "Ranger Sanjay Patil",
  initialTargetTree,
  candidateTrees = DEFAULT_CANDIDATES,
  onSuccess,
  onClose,
  className = "",
}) => {
  const [session, setSession] = useState<FastObservationSession>(() =>
    fastObservationService.getSession()
  );
  const [inspectedTreeIds, setInspectedTreeIds] = useState<Set<string>>(new Set());
  const [targetTree, setTargetTree] = useState<TreeInspectionCandidate>(
    initialTargetTree || candidateTrees[0]
  );
  const [healthStatus, setHealthStatus] = useState<"healthy" | "stressed" | "damaged" | "dead">("healthy");
  const [heightDeltaCm, setHeightDeltaCm] = useState<number>(5);
  const [foliageDensity, setFoliageDensity] = useState<number>(100);
  const [selectedThreats, setSelectedThreats] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isViewfinderOpen, setIsViewfinderOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sunlightMode, setSunlightMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"observe" | "radar" | "log">("observe");
  const [recentAudits, setRecentAudits] = useState<FastObservationResult[]>([]);

  useEffect(() => {
    const active = fastObservationService.startSession(
      projectId,
      projectName,
      inspectorId,
      inspectorName
    );
    setSession({ ...active });
  }, [projectId, projectName, inspectorId, inspectorName]);

  const nearbyTrees: ProximityTargetTree[] = React.useMemo(() => {
    const loc = { lat: currentLocation?.lat || 18.473521, lng: currentLocation?.lng || 73.436102 };
    return fastObservationService.findNearestTrees(loc, candidateTrees, 300);
  }, [currentLocation, candidateTrees]);

  const targetProximity = React.useMemo(() => {
    const matched = nearbyTrees.find((t) => t.tree.id === targetTree.id);
    return (
      matched || {
        tree: targetTree,
        distanceMeters: 3.5,
        bearingDegrees: 45,
        isAutoLocked: true,
      }
    );
  }, [nearbyTrees, targetTree]);

  const toggleThreat = (threatId: string) => {
    setSelectedThreats((prev) =>
      prev.includes(threatId) ? prev.filter((t) => t !== threatId) : [...prev, threatId]
    );
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmitObservation = async (overrideStatus?: "healthy" | "stressed" | "damaged" | "dead") => {
    setIsSubmitting(true);
    const finalHealth = overrideStatus || healthStatus;
    const lat = currentLocation?.lat || 18.473521;
    const lng = currentLocation?.lng || 73.436102;
    const accuracy = currentLocation?.accuracy || 3.0;

    try {
      const result = await fastObservationService.fastRecordObservation({
        treeId: targetTree.id,
        treeCode: targetTree.treeCode,
        species: targetTree.species,
        healthStatus: finalHealth,
        heightDeltaCm,
        currentHeightCm: (targetTree.currentHeightCm || 120) + heightDeltaCm,
        foliageDensityPct: foliageDensity,
        threatTags: selectedThreats,
        notes: notes.trim() || undefined,
        photoDataUrl: photoPreview || undefined,
        coordinates: {
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
        },
        projectId,
        inspectorId,
        inspectorName,
      });

      const nextInspected = new Set(inspectedTreeIds);
      nextInspected.add(targetTree.id);
      setInspectedTreeIds(nextInspected);
      setSession({ ...fastObservationService.getSession() });
      setRecentAudits((prev) => [result, ...prev.slice(0, 19)]);

      if (onSuccess) onSuccess(result);

      const nextTree = fastObservationService.getNextTreeInSequence(
        targetTree.id,
        candidateTrees,
        nextInspected
      );

      if (nextTree) {
        setTargetTree(nextTree);
        setHealthStatus("healthy");
        setSelectedThreats([]);
        setNotes("");
        setPhotoPreview(null);
        toast.success(
          "Observation #" + result.streakCount + " recorded! Advancing to " + nextTree.treeCode,
          { duration: 2500 }
        );
      } else {
        toast.success(
          "All trees in this sector verified! Streak: " + result.streakCount,
          { duration: 3000 }
        );
      }
    } catch (err) {
      console.error("Fast observation error:", err);
      toast.error("Failed to record observation, saved to offline queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickHealthy = async () => {
    await handleSubmitObservation("healthy");
  };

  return (
    <div
      data-testid="fast-observation-console"
      className={"flex flex-col min-h-screen bg-background text-foreground transition-colors " +
        (sunlightMode ? "bg-amber-100 text-black dark:bg-amber-950 dark:text-amber-100 font-medium " : "") +
        className}
    >
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-600 flex items-center justify-center font-bold">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
                Fast Tree Observation
              </h1>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600">
                1-Tap Audit
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                ±{currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "3.0"}m
              </span>
              <span>•</span>
              <span>{targetTree.compartmentName || "Block A-1"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSunlightMode(!sunlightMode)}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground"
            title="Toggle Sunlight High-Contrast"
          >
            {sunlightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 px-2.5 text-xs font-semibold rounded-lg"
            >
              Done
            </Button>
          )}
        </div>
      </header>

      <div className="bg-gradient-to-r from-amber-600/15 via-emerald-600/10 to-amber-600/15 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-sm font-black font-mono text-foreground">
              Streak: {session.streakCount}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Survival: <strong className="text-emerald-600 font-mono">{session.survivalRatePct}%</strong>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Flags: <strong className="text-rose-600">{session.flagsRaisedCount}</strong>
          </span>
        </div>
        <button
          onClick={() => {
            fastObservationService.resetStreak();
            setSession({ ...fastObservationService.getSession() });
            toast.info("Inspection streak reset");
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
        >
          <RotateCcw className="h-2.5 w-2.5" /> Reset
        </button>
      </div>

      <div className="flex border-b border-border/80 bg-muted/30 px-4">
        <button
          onClick={() => setActiveTab("observe")}
          className={"flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 " +
            (activeTab === "observe"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <TreePine className="h-3.5 w-3.5" /> Fast Audit
        </button>
        <button
          onClick={() => setActiveTab("radar")}
          className={"flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 " +
            (activeTab === "radar"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <Compass className="h-3.5 w-3.5" /> Nearby Radar ({nearbyTrees.length})
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={"flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 " +
            (activeTab === "log"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <History className="h-3.5 w-3.5" /> Audit Log ({recentAudits.length})
        </button>
      </div>

      <main className="flex-1 p-4 pb-36 max-w-xl mx-auto w-full space-y-4">
        {activeTab === "observe" && (
          <div className="space-y-4" data-testid="active-observation-view">
            <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-sm space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-base text-foreground">
                      {targetTree.species}
                    </span>
                    {targetTree.vernacularName && (
                      <span className="text-xs text-muted-foreground">({targetTree.vernacularName})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">
                      {targetTree.treeCode}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Planted: {targetTree.plantationDate}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <Badge
                    className={"text-[10px] px-2 py-0.5 font-mono " +
                      (targetProximity.isAutoLocked
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 border-amber-500/30")}
                  >
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    {targetProximity.distanceMeters}m ({targetProximity.bearingDegrees}°)
                  </Badge>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {targetProximity.isAutoLocked ? "🎯 Proximity Lock" : "Approaching"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Living Health Status (आरोग्य स्थिती)
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-testid="health-tile-healthy"
                  onClick={() => setHealthStatus("healthy")}
                  className={"p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all " +
                    (healthStatus === "healthy"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]"
                      : "bg-card border-border/80 text-foreground hover:bg-accent")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🟢</span>
                    {healthStatus === "healthy" && <CheckCircle2 className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">HEALTHY</span>
                    <span className="text-[10px] opacity-90 block">उत्कृष्ट • Vigorous foliage</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="health-tile-stressed"
                  onClick={() => setHealthStatus("stressed")}
                  className={"p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all " +
                    (healthStatus === "stressed"
                      ? "bg-amber-600 text-white border-amber-600 shadow-md scale-[1.02]"
                      : "bg-card border-border/80 text-foreground hover:bg-accent")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🟡</span>
                    {healthStatus === "stressed" && <CheckCircle2 className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">STRESSED</span>
                    <span className="text-[10px] opacity-90 block">तणावग्रस्त • Water/heat stress</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="health-tile-damaged"
                  onClick={() => setHealthStatus("damaged")}
                  className={"p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all " +
                    (healthStatus === "damaged"
                      ? "bg-orange-600 text-white border-orange-600 shadow-md scale-[1.02]"
                      : "bg-card border-border/80 text-foreground hover:bg-accent")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🟠</span>
                    {healthStatus === "damaged" && <CheckCircle2 className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">DAMAGED</span>
                    <span className="text-[10px] opacity-90 block">इजा/कीड • Pest/Broken</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="health-tile-dead"
                  onClick={() => setHealthStatus("dead")}
                  className={"p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all " +
                    (healthStatus === "dead"
                      ? "bg-rose-600 text-white border-rose-600 shadow-md scale-[1.02]"
                      : "bg-card border-border/80 text-foreground hover:bg-accent")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🔴</span>
                    {healthStatus === "dead" && <CheckCircle2 className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">DEAD / MISSING</span>
                    <span className="text-[10px] opacity-90 block">सुके / मृत • Wilted</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Threat / Stress Flags (धोके व समस्या)
                </Label>
                {selectedThreats.length > 0 && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-mono">
                    {selectedThreats.length} Active
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {FIELD_THREAT_TAGS.map((tag) => {
                  const isChecked = selectedThreats.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleThreat(tag.id)}
                      className={"p-2 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between " +
                        (isChecked
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold"
                          : "bg-card border-border/70 text-muted-foreground hover:text-foreground")}
                    >
                      <span className="truncate">{tag.label}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 text-rose-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Growth Delta</Label>
                  <span className="text-xs font-black font-mono text-primary">+{heightDeltaCm} cm</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {HEIGHT_DELTA_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setHeightDeltaCm(d)}
                      className={"px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all " +
                        (heightDeltaCm === d
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-muted text-muted-foreground hover:text-foreground")}
                    >
                      +{d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Foliage Density</Label>
                  <span className="text-xs font-black font-mono text-primary">{foliageDensity}%</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {FOLIAGE_DENSITY_PRESETS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFoliageDensity(f)}
                      className={"px-1.5 py-1 rounded-lg text-xs font-mono font-bold transition-all " +
                        (foliageDensity === f
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-muted text-muted-foreground hover:text-foreground")}
                    >
                      {f}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card p-3 rounded-2xl border border-border/70 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground">Inspection Photo Evidence</span>
                  <p className="text-[10px] text-muted-foreground">Geotagged ground truth photo proof</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewfinderOpen(true)}
                  className="h-8 px-2.5 text-xs font-semibold rounded-xl bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 flex items-center gap-1"
                  data-testid="open-obs-viewfinder-btn"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{photoPreview ? "Retake" : "Viewfinder"}</span>
                </Button>
                <label
                  title="Upload from File"
                  className="flex items-center justify-center p-2 border border-border rounded-xl cursor-pointer bg-muted/40 hover:bg-muted/70 transition-colors h-8 w-8"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "radar" && (
          <div className="space-y-3" data-testid="nearby-radar-view">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nearby Compartment Trees ({nearbyTrees.length})
              </Label>
              <span className="text-xs text-muted-foreground font-mono">Sorted by Distance</span>
            </div>
            <div className="space-y-2">
              {nearbyTrees.map(({ tree, distanceMeters, bearingDegrees, isAutoLocked }) => {
                const isTarget = tree.id === targetTree.id;
                const isInspected = inspectedTreeIds.has(tree.id);
                return (
                  <div
                    key={tree.id}
                    className={"p-3 rounded-xl border flex items-center justify-between shadow-sm transition-all " +
                      (isTarget
                        ? "bg-primary/10 border-primary shadow-md"
                        : isInspected
                        ? "bg-card/60 opacity-60 border-border/60"
                        : "bg-card border-border/80")}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{tree.species}</span>
                        <Badge variant="outline" className="font-mono text-[9px]">
                          {tree.treeCode}
                        </Badge>
                        {isInspected && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[9px] px-1 py-0">
                            ✓ Done
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {distanceMeters}m away • {bearingDegrees}° Azimuth
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isTarget ? "default" : "outline"}
                      onClick={() => {
                        setTargetTree(tree);
                        setActiveTab("observe");
                      }}
                      className="text-xs h-7 px-3 rounded-lg"
                    >
                      {isTarget ? "Active Target" : "Select Target"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div className="space-y-3" data-testid="session-audit-log-view">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Audited This Session ({recentAudits.length})
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                Survival Rate: <strong className="text-emerald-600">{session.survivalRatePct}%</strong>
              </span>
            </div>
            {recentAudits.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border/80">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-muted-foreground">No tree audits completed in this session.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Tap "CONFIRM & NEXT" to start streak!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAudits.map((audit, i) => (
                  <div
                    key={audit.observationId}
                    className="p-3 bg-card rounded-xl border border-border/70 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        #{recentAudits.length - i}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono">{audit.treeCode}</span>
                          <Badge
                            className={"text-[9px] px-1.5 py-0 capitalize " +
                              (audit.healthStatus === "healthy"
                                ? "bg-emerald-600 text-white"
                                : audit.healthStatus === "stressed"
                                ? "bg-amber-600 text-white"
                                : "bg-rose-600 text-white")}
                          >
                            {audit.healthStatus}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Next due: {audit.intervalDays} days • {audit.executionTimeMs}ms
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-600 border-0">
                      ✓ Logged
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {activeTab === "observe" && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/80 p-3 max-w-xl mx-auto shadow-2xl space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              data-testid="quick-healthy-shortcut-btn"
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleQuickHealthy}
              className="col-span-1 h-12 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <Zap className="h-4 w-4 mr-1 text-emerald-600" />
              1-Tap All Healthy
            </Button>
            <Button
              data-testid="confirm-and-next-button"
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitObservation()}
              className="col-span-2 h-12 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>CONFIRM & NEXT (तपासा)</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {/* Live Camera Viewfinder Modal */}
      <FieldCameraViewfinder
        isOpen={isViewfinderOpen}
        onClose={() => setIsViewfinderOpen(false)}
        onCapture={(dataUrl) => {
          setPhotoPreview(dataUrl);
          toast.success("Inspection photo evidence attached!");
        }}
        currentLocation={currentLocation}
        treeCode={targetTree.treeCode}
        species={targetTree.species}
        onOpenPermissionGuide={() => setIsPermissionModalOpen(true)}
      />

      {/* Hardware Permission & Recovery Guide */}
      <HardwarePermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
      />
    </div>
  );
};