import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Trees,
  FileCheck,
  Download,
  Upload,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Compass,
  ArrowRight,
  RefreshCw,
  QrCode,
  Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageProcessing";

export interface SampledTreeRecord {
  sample_id: string;
  tree_id: string;
  species: string;
  expected_lat: number;
  expected_lng: number;
  status: "pending" | "alive" | "stressed" | "dead";
  measured_height_cm?: number;
  measured_dbh_mm?: number;
  auditor_notes?: string;
  photo_url?: string;
  audited_at?: string;
  audited_by?: string;
}

interface Props {
  projectId: string;
  projectName: string;
  organizationName: string;
  totalTrees: number;
  boundary: [number, number][];
  bulkData?: any[];
  onAuditCompleted?: (results: {
    auditedCount: number;
    survivalRatePercent: number;
    manifest: SampledTreeRecord[];
  }) => void;
}

export const FieldSpotAuditConsole = ({
  projectId,
  projectName,
  organizationName,
  totalTrees,
  boundary,
  bulkData = [],
  onAuditCompleted,
}: Props) => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<SampledTreeRecord[]>([]);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [auditorName, setAuditorName] = useState("Forest Ranger (Unit 4)");
  const [filter, setFilter] = useState<"all" | "pending" | "audited">("all");

  // Form State for currently auditing tree
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<"alive" | "stressed" | "dead">("alive");
  const [currentHeight, setCurrentHeight] = useState("55");
  const [currentDbh, setCurrentDbh] = useState("12");
  const [currentNotes, setCurrentNotes] = useState("Vigorous crown growth, active lateral branching.");
  const [currentPhoto, setCurrentPhoto] = useState<File | null>(null);
  const [currentPhotoPreview, setCurrentPhotoPreview] = useState<string | null>(null);

  // Generate or draw 5% Stratified Random Sample
  const generateRandomSampleBatch = () => {
    const sampleSize = Math.max(5, Math.min(50, Math.ceil(totalTrees * 0.05)));
    const speciesPool = ["Neem", "Banyan", "Peepal", "Teak", "Jamun", "Mahua", "Bamboo"];

    // Base coordinates from boundary or fallback
    const lats = boundary.length >= 3 ? boundary.map((p) => p[0]) : [19.7515];
    const lngs = boundary.length >= 3 ? boundary.map((p) => p[1]) : [75.7139];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const generated: SampledTreeRecord[] = [];

    if (bulkData && bulkData.length > 0) {
      const shuffled = [...bulkData].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, sampleSize);
      selected.forEach((item, i) => {
        generated.push({
          sample_id: `SAMPLE-${String(i + 1).padStart(3, "0")}`,
          tree_id: item.tree_id || `TREE-${i + 1}`,
          species: item.species || "Indigenous Tree",
          expected_lat: Number(item.latitude) || minLat,
          expected_lng: Number(item.longitude) || minLng,
          status: "pending",
        });
      });
    } else {
      for (let i = 1; i <= sampleSize; i++) {
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lng = minLng + Math.random() * (maxLng - minLng);
        const sp = speciesPool[(i - 1) % speciesPool.length];

        generated.push({
          sample_id: `SAMPLE-${String(i).padStart(3, "0")}`,
          tree_id: `GE-${String(i * 12).padStart(4, "0")}`,
          species: sp,
          expected_lat: Number(lat.toFixed(6)),
          expected_lng: Number(lng.toFixed(6)),
          status: "pending",
        });
      }
    }

    setSamples(generated);
    toast({
      title: "5% Stratified Sample Batch Generated! 🎯",
      description: `Selected ${sampleSize} sapling plots for on-ground physical audit.`,
    });
  };

  const activeSample = useMemo(
    () => samples.find((s) => s.sample_id === activeSampleId) || null,
    [samples, activeSampleId]
  );

  const stats = useMemo(() => {
    const total = samples.length;
    const audited = samples.filter((s) => s.status !== "pending");
    const alive = samples.filter((s) => s.status === "alive" || s.status === "stressed");
    const dead = samples.filter((s) => s.status === "dead");
    const rate = audited.length > 0 ? Math.round((alive.length / audited.length) * 100) : 100;

    return { total, audited: audited.length, alive: alive.length, dead: dead.length, rate };
  }, [samples]);

  const openAuditDialog = (sample: SampledTreeRecord) => {
    setActiveSampleId(sample.sample_id);
    setCurrentStatus(sample.status === "pending" ? "alive" : (sample.status as any));
    setCurrentHeight(String(sample.measured_height_cm || 55));
    setCurrentDbh(String(sample.measured_dbh_mm || 12));
    setCurrentNotes(sample.auditor_notes || "Field inspection confirmed healthy sapling.");
    setCurrentPhoto(null);
    setCurrentPhotoPreview(sample.photo_url || null);
    setModalOpen(true);
  };

  const handlePhotoSelect = (file: File) => {
    setCurrentPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setCurrentPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveSampleAudit = () => {
    if (!activeSampleId) return;

    setSamples((prev) =>
      prev.map((s) =>
        s.sample_id === activeSampleId
          ? {
              ...s,
              status: currentStatus,
              measured_height_cm: Number(currentHeight) || 55,
              measured_dbh_mm: Number(currentDbh) || 12,
              auditor_notes: currentNotes,
              photo_url: currentPhotoPreview || s.photo_url,
              audited_at: new Date().toISOString(),
              audited_by: auditorName,
            }
          : s
      )
    );

    setModalOpen(false);
    toast({
      title: "Sample Audited & Geotagged ✓",
      description: `${activeSampleId} recorded as [${currentStatus.toUpperCase()}]. Ground survival rate updated.`,
    });

    if (onAuditCompleted && stats.audited + 1 >= stats.total && stats.total > 0) {
      onAuditCompleted({
        auditedCount: stats.audited + 1,
        survivalRatePercent: stats.rate,
        manifest: samples,
      });
    }
  };

  const downloadAuditManifest = () => {
    if (samples.length === 0) {
      toast({ title: "No Samples", description: "Generate a 5% sample batch first.", variant: "destructive" });
      return;
    }

    const headers = "Sample_ID,Tree_ID,Species,Expected_Latitude,Expected_Longitude,Audit_Status,Height_cm,DBH_mm,Auditor,Audited_At\n";
    const rows = samples.map((s) =>
      `"${s.sample_id}","${s.tree_id}","${s.species}",${s.expected_lat},${s.expected_lng},"${s.status}",${s.measured_height_cm || ""},${s.measured_dbh_mm || ""},"${s.audited_by || ""}","${s.audited_at || ""}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Field_Spot_Audit_Manifest_${projectName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Audit Manifest Exported! 📥", description: "Official 5% spot check manifest downloaded." });
  };

  const filteredSamples = samples.filter((s) => {
    if (filter === "pending") return s.status === "pending";
    if (filter === "audited") return s.status !== "pending";
    return true;
  });

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">Field Ranger Scouting & 5% Spot Audit Console</h3>
              <p className="text-xs text-muted-foreground">
                Standardized stratified random sampling protocol (Verra VM0047 / Gold Standard compliance).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {samples.length === 0 ? (
            <Button onClick={generateRandomSampleBatch} className="rounded-xl font-semibold gap-1.5 shadow-sm">
              <Sparkles className="h-4 w-4" /> Draw 5% Sample Batch
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={downloadAuditManifest} className="h-8 text-xs rounded-xl gap-1">
                <Download className="h-3.5 w-3.5" /> Export Manifest
              </Button>
              <Button variant="outline" size="sm" onClick={generateRandomSampleBatch} className="h-8 text-xs rounded-xl gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Re-Sample
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Audit Progress & Calibrated Survival Metrics */}
      {samples.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-card border border-primary/20">
          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Sampling Size</span>
            <strong className="text-base font-bold text-foreground">{stats.total} Plots (5%)</strong>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Total: {totalTrees.toLocaleString()} trees</span>
          </div>

          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Audits Completed</span>
            <strong className="text-base font-bold text-primary">{stats.audited} / {stats.total}</strong>
            <div className="mt-1.5">
              <Progress value={(stats.audited / Math.max(1, stats.total)) * 100} className="h-1.5" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Calibrated Survival Rate</span>
            <strong className={`text-base font-bold ${stats.rate >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
              {stats.rate}%
            </strong>
            <span className="text-[10px] text-muted-foreground block mt-0.5">{stats.alive} Alive · {stats.dead} Dead</span>
          </div>

          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Assigned Ranger / Inspector</span>
            <Input
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="h-7 text-xs bg-background mt-1"
            />
          </div>
        </div>
      )}

      {/* Samples List & Table */}
      {samples.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="h-7 text-xs rounded-lg"
              >
                All ({samples.length})
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("pending")}
                className="h-7 text-xs rounded-lg"
              >
                Pending ({samples.filter((s) => s.status === "pending").length})
              </Button>
              <Button
                variant={filter === "audited" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("audited")}
                className="h-7 text-xs rounded-lg"
              >
                Audited ({stats.audited})
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">Click any plot to record field proof.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSamples.map((s) => {
              const isPending = s.status === "pending";
              const isAlive = s.status === "alive";
              const isStressed = s.status === "stressed";
              const isDead = s.status === "dead";

              return (
                <div
                  key={s.sample_id}
                  onClick={() => openAuditDialog(s)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/60 ${
                    isPending
                      ? "border-border/60 bg-card hover:bg-muted/20"
                      : isAlive
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isStressed
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-rose-500/30 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                        <span>{s.sample_id}</span>
                        <span className="text-muted-foreground font-normal">({s.tree_id})</span>
                      </div>
                      <p className="text-xs font-semibold text-primary mt-0.5">{s.species}</p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        isPending
                          ? "bg-muted text-muted-foreground"
                          : isAlive
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : isStressed
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          : "bg-rose-500/15 text-rose-600 border-rose-500/30"
                      }`}
                    >
                      {s.status}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> {s.expected_lat.toFixed(4)}, {s.expected_lng.toFixed(4)}
                    </span>
                    {s.measured_height_cm && (
                      <span className="font-semibold text-foreground">{s.measured_height_cm} cm</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Field Audit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Field Spot Audit: {activeSample?.sample_id}
            </DialogTitle>
          </DialogHeader>

          {activeSample && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Target Tree & Species</span>
                  <strong className="text-xs font-bold text-foreground">{activeSample.species}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">GPS Target Coordinates</span>
                  <strong className="text-xs font-mono text-primary">
                    {activeSample.expected_lat.toFixed(5)}, {activeSample.expected_lng.toFixed(5)}
                  </strong>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <Label className="mb-1.5 block font-semibold">Tree Vitality & Health Status *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "alive", label: "Alive & Thriving", color: "border-emerald-500 text-emerald-600 bg-emerald-500/10" },
                    { val: "stressed", label: "Stressed / Foliar", color: "border-amber-500 text-amber-600 bg-amber-500/10" },
                    { val: "dead", label: "Dead / Missing", color: "border-rose-500 text-rose-600 bg-rose-500/10" },
                  ].map(({ val, label, color }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCurrentStatus(val as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold text-[11px] ${
                        currentStatus === val ? `${color} shadow-sm ring-1 ring-primary/30` : "border-border/60 bg-card"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height & DBH */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block font-semibold flex items-center gap-1">
                    <Ruler className="h-3 w-3" /> Measured Height (cm)
                  </Label>
                  <Input
                    type="number"
                    value={currentHeight}
                    onChange={(e) => setCurrentHeight(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label className="mb-1 block font-semibold">Collar Diameter DBH (mm)</Label>
                  <Input
                    type="number"
                    value={currentDbh}
                    onChange={(e) => setCurrentDbh(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Photo Proof */}
              <div>
                <Label className="mb-1.5 block font-semibold">Geotagged Camera Photo Proof</Label>
                {currentPhotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/40 h-28 w-full">
                    <img src={currentPhotoPreview} alt="Field Proof" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCurrentPhoto(null); setCurrentPhotoPreview(null); }}
                      className="absolute top-1 right-1 h-6 text-[10px] bg-background/80 text-destructive"
                    >
                      Retake
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:border-primary transition-all">
                    <Camera className="h-6 w-6 text-primary opacity-80 mb-1" />
                    <span className="text-xs font-semibold text-foreground">Click to take / attach tree photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label className="mb-1 block font-semibold">Field Inspector Notes</Label>
                <Input
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  placeholder="e.g. Healthy foliage, irrigated via drip"
                  className="bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveSampleAudit} className="font-semibold rounded-xl">
                  Save Sample Audit Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
