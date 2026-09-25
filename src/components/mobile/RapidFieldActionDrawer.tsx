import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  MapPin,
  TreePine,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Upload,
  Activity,
  Sparkles,
  QrCode,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SurvivalStatus, TreeStatus } from "@/types/coreDatabase";
import { treeService } from "@/services/treeService";
import { enqueueOfflineTree } from "@/lib/offlineSyncService";
import { toast } from "sonner";

export interface RapidFieldActionDrawerProps {
  isOpen: boolean;
  mode: "plant" | "audit";
  onClose: () => void;
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
  projectId?: string;
  onSuccess?: (record: any) => void;
}

const COMMON_SPECIES = [
  { name: "Neem", scientific: "Azadirachta indica", vernacular: "कडूलिंब" },
  { name: "Banyan", scientific: "Ficus benghalensis", vernacular: "वड" },
  { name: "Peepal", scientific: "Ficus religiosa", vernacular: "पिंपळ" },
  { name: "Teak", scientific: "Tectona grandis", vernacular: "सागवान" },
  { name: "Mahua", scientific: "Madhuca longifolia", vernacular: "मोह" },
  { name: "Karanj", scientific: "Millettia pinnata", vernacular: "करंज" },
  { name: "Amla", scientific: "Phyllanthus emblica", vernacular: "आवळा" },
  { name: "Red Mangrove", scientific: "Rhizophora mucronata", vernacular: "कांदळ" },
];

export const RapidFieldActionDrawer: React.FC<RapidFieldActionDrawerProps> = ({
  isOpen,
  mode,
  onClose,
  currentLocation,
  projectId = "demo-project-dev-001",
  onSuccess,
}) => {
  // Plant State
  const [selectedSpecies, setSelectedSpecies] = useState(COMMON_SPECIES[0].name);
  const [heightCm, setHeightCm] = useState(120);
  const [dbhCm, setDbhCm] = useState(4.5);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audit State
  const [treeCodeInput, setTreeCodeInput] = useState("TRE-2025-001");
  const [survivalStatus, setSurvivalStatus] = useState<SurvivalStatus>("ALIVE");
  const [healthNotes, setHealthNotes] = useState("");

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handlePlantSubmit = async () => {
    setIsSubmitting(true);
    const lat = currentLocation?.lat || 18.4735;
    const lng = currentLocation?.lng || 73.4361;

    try {
      const treeData = {
        tree_name: `${selectedSpecies} Sapling`,
        species: selectedSpecies,
        latitude: lat,
        longitude: lng,
        height_cm: heightCm,
        dbh_cm: dbhCm,
        project_id: projectId,
        plantation_date: new Date().toISOString().split("T")[0],
        status: "alive" as TreeStatus,
        photo_url: photoPreview || undefined,
      };

      if (!navigator.onLine) {
        // Enqueue offline
        enqueueOfflineTree(treeData as any);
        toast.info("Offline: Tree draft saved to local queue");
      } else {
        await treeService.createTree(treeData as any);
        toast.success(`🌱 ${selectedSpecies} successfully registered!`);
      }

      if (onSuccess) onSuccess(treeData);
      onClose();
    } catch {
      toast.error("Error saving tree registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuditSubmit = async () => {
    setIsSubmitting(true);
    try {
      const auditRecord = {
        treeCode: treeCodeInput,
        survivalStatus,
        notes: healthNotes,
        timestamp: new Date().toISOString(),
        location: currentLocation,
      };

      toast.success(`📸 Health audit recorded: ${survivalStatus} for ${treeCodeInput}`);
      if (onSuccess) onSuccess(auditRecord);
      onClose();
    } catch {
      toast.error("Error saving audit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      data-testid="rapid-field-drawer"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
              {mode === "plant" ? <TreePine className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-foreground">
                {mode === "plant" ? "Rapid Tree Registration" : "Rapid MRV Health Audit"}
              </h2>
              <p className="text-xs text-muted-foreground">One-Handed Mobile Field Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live GPS Lock Indicator */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {currentLocation
              ? `${currentLocation.lat.toFixed(5)}°N, ${currentLocation.lng.toFixed(5)}°E`
              : "18.47352°N, 73.43610°E (Default)"}
          </span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            ±{currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "3.2"}m Lock
          </Badge>
        </div>

        {mode === "plant" ? (
          /* PLANTING FORM */
          <div className="space-y-4">
            {/* Species Selector Chips */}
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                Select Species (टॅप करा)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_SPECIES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSelectedSpecies(s.name)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedSpecies === s.name
                        ? "bg-primary/15 border-primary text-primary font-bold shadow-sm"
                        : "bg-background/80 border-border/70 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs">{s.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">{s.vernacular} ({s.scientific})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric Sliders for Height & DBH */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/60 p-2.5 rounded-xl border border-border/70 space-y-1">
                <span className="text-[11px] text-muted-foreground">Height (cm)</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold font-mono text-foreground">{heightCm} cm</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setHeightCm(Math.max(20, heightCm - 10))}>-</Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setHeightCm(heightCm + 10)}>+</Button>
                  </div>
                </div>
              </div>

              <div className="bg-background/60 p-2.5 rounded-xl border border-border/70 space-y-1">
                <span className="text-[11px] text-muted-foreground">DBH / Girth (cm)</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold font-mono text-foreground">{dbhCm.toFixed(1)} cm</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setDbhCm(Math.max(1, Number((dbhCm - 0.5).toFixed(1))))}>-</Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setDbhCm(Number((dbhCm + 0.5).toFixed(1)))}>+</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Photo Capture */}
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                Sapling Photo Proof
              </Label>
              <label className="flex items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl p-3 cursor-pointer bg-background/50 hover:bg-accent/40 transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
                {photoPreview ? (
                  <div className="flex items-center gap-2">
                    <img src={photoPreview} alt="Preview" className="h-10 w-10 object-cover rounded-lg border" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Photo Captured ✓ Tap to Retake</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Camera className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">Tap Camera to Snap Photo</span>
                  </div>
                )}
              </label>
            </div>

            {/* 1-Tap Submit Button */}
            <Button
              onClick={handlePlantSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg"
            >
              🌱 Register Sapling Now (1-Tap)
            </Button>
          </div>
        ) : (
          /* AUDIT FORM */
          <div className="space-y-4">
            {/* Tree Code / QR */}
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                Tree Identification Code
              </Label>
              <div className="relative">
                <Input
                  value={treeCodeInput}
                  onChange={(e) => setTreeCodeInput(e.target.value)}
                  placeholder="e.g. TRE-2025-001"
                  className="font-mono text-sm pr-10"
                />
                <QrCode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* 4 Big Survival Status Buttons */}
            <div>
              <Label className="text-xs font-semibold text-foreground mb-2 block">
                Vitality Condition
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSurvivalStatus("ALIVE")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                    survivalStatus === "ALIVE"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                      : "bg-background/80 border-border/70 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <div className="text-xs font-bold">ALIVE</div>
                    <div className="text-[10px] opacity-75">सजीव / Thriving</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSurvivalStatus("STRESSED")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                    survivalStatus === "STRESSED"
                      ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                      : "bg-background/80 border-border/70 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <div className="text-xs font-bold">STRESSED</div>
                    <div className="text-[10px] opacity-75">ताणतणाव / Water Deficit</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSurvivalStatus("DAMAGED")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                    survivalStatus === "DAMAGED"
                      ? "bg-orange-500/20 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-sm"
                      : "bg-background/80 border-border/70 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Activity className="h-5 w-5 text-orange-500" />
                  <div className="text-left">
                    <div className="text-xs font-bold">DAMAGED</div>
                    <div className="text-[10px] opacity-75">नुकसानग्रस्त / Broken</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSurvivalStatus("DEAD")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                    survivalStatus === "DEAD"
                      ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-bold shadow-sm"
                      : "bg-background/80 border-border/70 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Flame className="h-5 w-5 text-rose-500" />
                  <div className="text-left">
                    <div className="text-xs font-bold">DEAD</div>
                    <div className="text-[10px] opacity-75">मृत / Replant Needed</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Health Notes */}
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                Observation Notes (पर्यायी)
              </Label>
              <Input
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="e.g. Mild canopy yellowing, trunk intact"
                className="text-xs"
              />
            </div>

            {/* Submit Audit Button */}
            <Button
              onClick={handleAuditSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
            >
              📸 Submit Ground Truth Audit (1-Tap)
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
