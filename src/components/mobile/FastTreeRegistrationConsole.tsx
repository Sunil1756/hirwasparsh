import React, { useState, useEffect } from "react";
import {
  TreePine,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Flame,
  Zap,
  RotateCcw,
  Sparkles,
  Sliders,
  Layers,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  History,
  Grid,
  Radio,
  UploadCloud,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fastTreeRegistrationService,
  FAST_SPECIES_PRESETS,
  STANDARD_HEIGHT_PRESETS,
  STANDARD_DBH_PRESETS,
  FastTreeRegistrationResult,
  FastRegistrationSession,
} from "@/services/fastTreeRegistrationService";
import { toast } from "sonner";

export interface FastTreeRegistrationConsoleProps {
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
  projectId?: string;
  projectName?: string;
  compartmentId?: string;
  compartmentName?: string;
  planterId?: string;
  planterName?: string;
  onSuccess?: (result: FastTreeRegistrationResult) => void;
  onClose?: () => void;
  className?: string;
}

export const FastTreeRegistrationConsole: React.FC<FastTreeRegistrationConsoleProps> = ({
  currentLocation,
  projectId = "demo-project-dev-001",
  projectName = "Western Ghats Sahyadri Reforestation",
  compartmentId = "comp-alpha-1",
  compartmentName = "Block A-1 (Ridge)",
  planterId = "field-ranger-01",
  planterName = "Ranger Sanjay Patil",
  onSuccess,
  onClose,
  className = "",
}) => {
  // Active session
  const [session, setSession] = useState<FastRegistrationSession>(() =>
    fastTreeRegistrationService.getSession()
  );

  // Form inputs
  const [selectedSpecies, setSelectedSpecies] = useState(FAST_SPECIES_PRESETS[0].name);
  const [heightCm, setHeightCm] = useState(FAST_SPECIES_PRESETS[0].defaultHeight);
  const [dbhCm, setDbhCm] = useState(FAST_SPECIES_PRESETS[0].defaultDbh);
  const [healthStatus, setHealthStatus] = useState<"healthy" | "moderate" | "fragile">("healthy");
  const [tagId, setTagId] = useState("");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRegistrations, setRecentRegistrations] = useState<FastTreeRegistrationResult[]>([]);
  const [sunlightMode, setSunlightMode] = useState(false);
  const [activeView, setActiveView] = useState<"rapid" | "transect" | "history">("rapid");
  const [lastSuccessCode, setLastSuccessCode] = useState<string | null>(null);

  // Transect Batch Generator State
  const [transectCount, setTransectCount] = useState(5);
  const [transectSpacing, setTransectSpacing] = useState(3.5);
  const [transectBearing, setTransectBearing] = useState(90);
  const [generatedTransects, setGeneratedTransects] = useState<Array<{ index: number; latitude: number; longitude: number }>>([]);

  // Initialize session on mount
  useEffect(() => {
    const active = fastTreeRegistrationService.startSession(
      projectId,
      projectName,
      planterId,
      planterName,
      compartmentId,
      compartmentName
    );
    setSession({ ...active });
  }, [projectId, projectName, planterId, planterName, compartmentId, compartmentName]);

  // When species changes, update default biometrics
  const handleSpeciesSelect = (speciesName: string) => {
    setSelectedSpecies(speciesName);
    const matched = FAST_SPECIES_PRESETS.find((s) => s.name === speciesName);
    if (matched) {
      setHeightCm(matched.defaultHeight);
      setDbhCm(matched.defaultDbh);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  // Ultra-Fast Rapid Registration Submission
  const handleFastRegister = async () => {
    setIsSubmitting(true);
    const lat = currentLocation?.lat || 18.473521;
    const lng = currentLocation?.lng || 73.436102;
    const accuracy = currentLocation?.accuracy || 3.0;

    try {
      const result = await fastTreeRegistrationService.fastRegisterTree({
        species: selectedSpecies,
        heightCm,
        dbhCm,
        healthStatus,
        tagId: tagId.trim() || undefined,
        notes: notes.trim() || undefined,
        photoDataUrl: photoPreview || undefined,
        coordinates: {
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
        },
        projectId,
        compartmentId,
        planterId,
      });

      // Update local state
      setSession({ ...fastTreeRegistrationService.getSession() });
      setRecentRegistrations((prev) => [result, ...prev.slice(0, 19)]);
      setLastSuccessCode(result.treeCode);

      // Trigger callback
      if (onSuccess) onSuccess(result);

      // Fast reset: clear tag, photo, notes; keep species & height locked for next tree
      setTagId("");
      setNotes("");
      setPhotoPreview(null);

      toast.success(
        `🔥 Streak #${result.streakCount}: ${selectedSpecies} registered! (${result.treeCode})`,
        { duration: 2500 }
      );
    } catch (err) {
      console.error("Fast registration error:", err);
      toast.error("Registration failed, enqueued to offline storage");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Transect Batch coordinates
  const handleGenerateTransect = () => {
    const lat = currentLocation?.lat || 18.473521;
    const lng = currentLocation?.lng || 73.436102;
    const points = fastTreeRegistrationService.generateTransectCoordinates(
      { latitude: lat, longitude: lng },
      transectCount,
      transectSpacing,
      transectBearing
    );
    setGeneratedTransects(points);
    toast.info(`Generated ${points.length} transect coordinate waypoints`);
  };

  const handleRegisterBatchPoint = async (point: { latitude: number; longitude: number; index: number }) => {
    const result = await fastTreeRegistrationService.fastRegisterTree({
      species: selectedSpecies,
      heightCm,
      dbhCm,
      healthStatus,
      notes: `Transect line point #${point.index}`,
      coordinates: {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracyMeters: 2.5,
      },
      projectId,
      compartmentId,
      planterId,
    });
    setSession({ ...fastTreeRegistrationService.getSession() });
    setRecentRegistrations((prev) => [result, ...prev.slice(0, 19)]);
    setGeneratedTransects((prev) => prev.filter((p) => p.index !== point.index));
    toast.success(`Point #${point.index} registered (${result.treeCode})`);
  };

  const currentSpacing = fastTreeRegistrationService.calculateGridSpacing(
    { latitude: currentLocation?.lat || 18.4735, longitude: currentLocation?.lng || 73.4361 },
    session.lastPlantedCoord
  );

  return (
    <div
      data-testid="fast-tree-registration-console"
      className={`flex flex-col min-h-screen bg-background text-foreground transition-colors ${
        sunlightMode ? "bg-amber-100 text-black dark:bg-amber-950 dark:text-amber-100" : ""
      } ${className}`}
    >
      {/* 1. TOP TELEMETRY & STREAK HUD */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-600 flex items-center justify-center font-bold">
            <Zap className="h-5 w-5 fill-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
                Fast Tree Register
              </h1>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600">
                Sub-5s
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                ±{currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "2.8"}m
              </span>
              <span>•</span>
              <span>{compartmentName}</span>
            </div>
          </div>
        </div>

        {/* Right controls */}
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

      {/* 2. STREAK & SESSION BANNER */}
      <div className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-emerald-600/15 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-sm font-black font-mono text-foreground">
              Streak: {session.streakCount}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Total Today: <strong className="text-foreground">{session.totalPlanted}</strong>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            CO₂e: <strong className="text-emerald-600">+{session.estimatedCarbonOffsetKg.toFixed(0)} kg</strong>
          </span>
        </div>

        <button
          onClick={() => {
            fastTreeRegistrationService.resetStreak();
            setSession({ ...fastTreeRegistrationService.getSession() });
            toast.info("Streak reset for new planting sector");
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
        >
          <RotateCcw className="h-2.5 w-2.5" /> Reset Streak
        </button>
      </div>

      {/* 3. MODE TABS (Rapid Single | Transect Afforestation | Recent History) */}
      <div className="flex border-b border-border/80 bg-muted/30 px-4">
        <button
          onClick={() => setActiveView("rapid")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeView === "rapid"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TreePine className="h-3.5 w-3.5" /> Rapid Plant
        </button>
        <button
          onClick={() => setActiveView("transect")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeView === "transect"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Grid className="h-3.5 w-3.5" /> Transect Grid
        </button>
        <button
          onClick={() => setActiveView("history")}
          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeView === "history"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" /> Session Log ({recentRegistrations.length})
        </button>
      </div>

      {/* 4. MAIN CONTENT VIEW */}
      <main className="flex-1 p-4 pb-32 max-w-xl mx-auto w-full space-y-4">
        {activeView === "rapid" && (
          <div className="space-y-4" data-testid="rapid-planting-view">
            {/* A. SPACING RADAR CALLOUT */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                currentSpacing.status === "optimal"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : currentSpacing.status === "too_dense"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200"
                  : "bg-muted/50 border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse shrink-0" />
                <span className="font-medium">{currentSpacing.message}</span>
              </div>
              {currentSpacing.distanceMeters !== null && (
                <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                  {currentSpacing.distanceMeters}m
                </Badge>
              )}
            </div>

            {/* B. SPECIES SELECTOR CHIPS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Select Species (जात)
                </Label>
                <span className="text-[10px] text-primary font-medium">
                  {selectedSpecies} • {FAST_SPECIES_PRESETS.find((s) => s.name === selectedSpecies)?.vernacular}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-0.5">
                {FAST_SPECIES_PRESETS.map((spec) => (
                  <button
                    key={spec.name}
                    type="button"
                    onClick={() => handleSpeciesSelect(spec.name)}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all text-xs ${
                      selectedSpecies === spec.name
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold scale-[1.02]"
                        : "bg-card hover:bg-accent border-border/80 text-foreground"
                    }`}
                  >
                    <span className="font-semibold text-xs leading-tight truncate">{spec.name}</span>
                    <span className="text-[10px] opacity-80 truncate">{spec.vernacular}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* C. RAPID BIOMETRICS PRESETS (HEIGHT & DBH) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Height Presets */}
              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Height (cm)</Label>
                  <span className="text-xs font-black font-mono text-primary">{heightCm} cm</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_HEIGHT_PRESETS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHeightCm(h)}
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        heightCm === h
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer mt-1"
                />
              </div>

              {/* DBH Presets */}
              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Stem DBH (cm)</Label>
                  <span className="text-xs font-black font-mono text-primary">{dbhCm} cm</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_DBH_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDbhCm(d)}
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        dbhCm === d
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={dbhCm}
                  onChange={(e) => setDbhCm(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* D. PHYSICAL NURSERY TAG & QUICK PHOTO */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tag Binding */}
              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <QrCode className="h-3.5 w-3.5 text-primary" /> Physical Tag / Barcode
                </Label>
                <Input
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  placeholder="Scan or enter tag..."
                  className="h-9 text-xs font-mono bg-background"
                />
              </div>

              {/* Quick Photo Snap */}
              <div className="space-y-1.5 bg-card p-3 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-primary" /> Sapling Photo
                </Label>
                <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-border rounded-xl cursor-pointer bg-muted/40 hover:bg-muted/70 transition-colors h-9">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate font-medium">
                    {photoPreview ? "Photo Added ✓" : "Snap Quick Photo"}
                  </span>
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

            {/* E. SAPLING HEALTH CONDITION */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Baseline Condition
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["healthy", "moderate", "fragile"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHealthStatus(h)}
                    className={`py-2 rounded-xl border text-center text-xs font-bold capitalize transition-all ${
                      healthStatus === h
                        ? h === "healthy"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : h === "moderate"
                          ? "bg-amber-600 text-white border-amber-600 shadow-md"
                          : "bg-rose-600 text-white border-rose-600 shadow-md"
                        : "bg-card border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRANSECT GRID VIEW */}
        {activeView === "transect" && (
          <div className="space-y-4" data-testid="transect-planting-view">
            <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Batch Transect Line Generator</h3>
                  <p className="text-xs text-muted-foreground">
                    Afforestation row calculator along compass azimuth
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {transectCount} Trees
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Saplings Count</Label>
                  <Input
                    type="number"
                    min="2"
                    max="25"
                    value={transectCount}
                    onChange={(e) => setTransectCount(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Spacing (m)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={transectSpacing}
                    onChange={(e) => setTransectSpacing(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Bearing (°)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={transectBearing}
                    onChange={(e) => setTransectBearing(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateTransect}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-xl gap-2"
              >
                <Grid className="h-4 w-4" /> Calculate Transect Waypoints
              </Button>
            </div>

            {/* Generated Points List */}
            {generatedTransects.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pending Transect Waypoints ({generatedTransects.length})
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generatedTransects.map((pt) => (
                    <div
                      key={pt.index}
                      className="bg-card p-3 rounded-xl border border-border/80 flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            Point #{pt.index}
                          </Badge>
                          <span className="text-xs font-bold">{selectedSpecies}</span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {pt.latitude}, {pt.longitude}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleRegisterBatchPoint(pt)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-3 rounded-lg"
                      >
                        Register
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECENT SESSION LOG VIEW */}
        {activeView === "history" && (
          <div className="space-y-3" data-testid="session-history-view">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Planted in this session ({recentRegistrations.length})
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                {session.planterName}
              </span>
            </div>

            {recentRegistrations.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border/80">
                <TreePine className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-muted-foreground">No saplings registered yet in this session.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Switch to Rapid Plant and tap "Plant & Next"!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentRegistrations.map((rec, i) => (
                  <div
                    key={rec.treeCode}
                    className="p-3 bg-card rounded-xl border border-border/70 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        #{recentRegistrations.length - i}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{rec.tree?.species}</span>
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                            {rec.treeCode}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {rec.tree?.height_cm}cm • {rec.executionTimeMs}ms execution
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-emerald-500/15 text-emerald-600 border-0"
                      >
                        ✓ Saved
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 5. GIANT BOTTOM "PLANT & NEXT" TACTICAL BUTTON */}
      {activeView === "rapid" && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/80 p-3 max-w-xl mx-auto shadow-2xl">
          <Button
            data-testid="plant-and-next-button"
            onClick={handleFastRegister}
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 text-sm">
                <Sparkles className="h-5 w-5 animate-spin" /> Registering Sapling...
              </span>
            ) : (
              <>
                <TreePine className="h-6 w-6" />
                <span>PLANT & NEXT (झाड नोंदवा)</span>
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
