/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 22
 * Create Observation Modal Component
 * 
 * Allows field workers, foresters, and adopters to submit biometric inspections,
 * health condition updates, photo evidence, and GPS coordinates.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  Camera,
  Calendar,
  CheckCircle2,
  Heart,
  Droplets,
  AlertTriangle,
  MapPin,
  Ruler,
  Sparkles,
  Loader2,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import {
  TreeHealthStatus,
  CreateObservationInput,
} from "@/types/coreDatabase";
import { monitoringEventService } from "@/services/monitoringEventService";
import { PhotoEvidenceUploader } from "@/components/PhotoEvidenceUploader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface CreateObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  treeCode?: string | null;
  species: string;
  plantationDate: string;
  currentHeightCm?: number | null;
  currentDbhCm?: number | null;
  onSuccess?: () => void;
}

export const CreateObservationModal: React.FC<CreateObservationModalProps> = ({
  isOpen,
  onClose,
  treeId,
  treeCode,
  species,
  plantationDate,
  currentHeightCm,
  currentDbhCm,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [healthStatus, setHealthStatus] = useState<TreeHealthStatus>("healthy");
  const [heightCm, setHeightCm] = useState<string>(currentHeightCm ? String(currentHeightCm) : "");
  const [dbhCm, setDbhCm] = useState<string>(currentDbhCm ? String(currentDbhCm) : "");
  const [canopyWidthCm, setCanopyWidthCm] = useState<string>("");
  const [foliageDensityPct, setFoliageDensityPct] = useState<number>(90);
  const [hasPestDisease, setHasPestDisease] = useState(false);
  const [pestDescription, setPestDescription] = useState("");
  const [treatmentApplied, setTreatmentApplied] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [careRecommendations, setCareRecommendations] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  // Calculated next inspection preview
  const calculatedNext = React.useMemo(() => {
    return monitoringEventService.calculateNextMonitoringDate(
      plantationDate,
      healthStatus,
      new Date().toISOString()
    );
  }, [plantationDate, healthStatus]);

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Unavailable",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setIsCapturingGps(false);
        toast({
          title: "GPS Captured",
          description: `Coordinates acquired (±${Math.round(pos.coords.accuracy)}m accuracy)`,
        });
      },
      (err) => {
        setIsCapturingGps(false);
        toast({
          title: "GPS Error",
          description: err.message || "Failed to capture current coordinates.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeId) return;

    setIsSubmitting(true);

    try {
      const input: CreateObservationInput = {
        tree_id: treeId,
        observer_id: user?.id || null,
        observer_name: profile?.full_name || user?.email || "Field Monitor",
        observer_role: (profile as any)?.role || "field_worker",
        observation_date: new Date().toISOString(),
        health_status: healthStatus,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        dbh_cm: dbhCm ? parseFloat(dbhCm) : undefined,
        canopy_width_cm: canopyWidthCm ? parseFloat(canopyWidthCm) : undefined,
        foliage_density_pct: foliageDensityPct,
        pest_disease_detected: hasPestDisease,
        disease_description: hasPestDisease ? pestDescription : undefined,
        treatment_applied: treatmentApplied || undefined,
        condition_notes: conditionNotes || undefined,
        care_recommendations: careRecommendations || undefined,
        photo_url: photoUrl,
        sha256_hash: photoHash,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        gps_accuracy_meters: gpsAccuracy || undefined,
        verification_status: "verified",
      };

      const result = await monitoringEventService.createMonitoringEvent(input, true);

      if (!result.success) {
        throw new Error(result.error || "Failed to record observation.");
      }

      toast({
        title: "Observation Logged Successfully",
        description: `Next monitoring scheduled for ${new Date(result.schedule?.nextMonitoringDate || "").toLocaleDateString()}.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Activity className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Field Inspection & Audit</span>
          </div>
          <DialogTitle className="text-xl font-heading font-bold">
            Record Biometric Observation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {species} • ID: <span className="font-mono font-medium text-foreground">{treeCode || treeId.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Health Status Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Tree Health Condition *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "healthy", label: "Healthy / Vigorous", icon: Heart, color: "hover:border-emerald-500 text-emerald-400" },
                { id: "thriving", label: "Thriving", icon: Sparkles, color: "hover:border-emerald-400 text-emerald-300" },
                { id: "stressed", label: "Stressed / Water Deficit", icon: Droplets, color: "hover:border-amber-500 text-amber-400" },
                { id: "diseased", label: "Diseased / Infected", icon: AlertTriangle, color: "hover:border-orange-500 text-orange-400" },
              ].map((item) => {
                const isSelected = healthStatus === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHealthStatus(item.id as TreeHealthStatus)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary"
                        : "bg-card/40 border-border text-muted-foreground hover:bg-card/80"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1.5 ${item.color}`} />
                    <span className="text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Next Monitoring Scheduling Preview */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-primary">
                Next Schedule: {calculatedNext.intervalDays} Days ({calculatedNext.stageLabel})
              </div>
              <div className="text-muted-foreground leading-relaxed">
                {calculatedNext.rationale}
              </div>
            </div>
          </div>

          {/* Biometrics Measurements */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Biometric Growth Dimensions
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="heightCm" className="text-xs text-muted-foreground">Height (cm)</Label>
                <div className="relative mt-1">
                  <Input
                    id="heightCm"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 150"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span>
                </div>
              </div>

              <div>
                <Label htmlFor="dbhCm" className="text-xs text-muted-foreground">DBH / Trunk Caliper (cm)</Label>
                <div className="relative mt-1">
                  <Input
                    id="dbhCm"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 8.5"
                    value={dbhCm}
                    onChange={(e) => setDbhCm(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span>
                </div>
              </div>

              <div>
                <Label htmlFor="canopyWidthCm" className="text-xs text-muted-foreground">Canopy Spread (cm)</Label>
                <div className="relative mt-1">
                  <Input
                    id="canopyWidthCm"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 120"
                    value={canopyWidthCm}
                    onChange={(e) => setCanopyWidthCm(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pest & Pathology Section */}
          <div className="space-y-3 rounded-xl border border-border p-3.5 bg-card/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Pest or Pathological Symptoms</Label>
                <p className="text-xs text-muted-foreground">Flag insect infestation, fungal disease, or foliage necrosis.</p>
              </div>
              <Switch checked={hasPestDisease} onCheckedChange={setHasPestDisease} />
            </div>

            {hasPestDisease && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="pestDescription" className="text-xs text-muted-foreground">Symptom & Pest Description</Label>
                  <Input
                    id="pestDescription"
                    placeholder="e.g. Aphid cluster on new shoots; powdery mildew on leaves"
                    value={pestDescription}
                    onChange={(e) => setPestDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="treatmentApplied" className="text-xs text-muted-foreground">Treatment / Intervention Applied</Label>
                  <Input
                    id="treatmentApplied"
                    placeholder="e.g. Neem oil spray applied (5ml/L); organic compost mulching"
                    value={treatmentApplied}
                    onChange={(e) => setTreatmentApplied(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes & Recommendations */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="conditionNotes" className="text-xs font-semibold uppercase text-muted-foreground">
                Field Observation Notes
              </Label>
              <Textarea
                id="conditionNotes"
                placeholder="Describe general vitality, watering condition, soil moisture, weeding needs..."
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
          </div>

          {/* Photo Evidence Uploader */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-primary" /> Visual Photo Evidence
            </Label>
            <PhotoEvidenceUploader
              treeId={treeId}
              evidenceType="growth_photo"
              onUploadComplete={(result) => {
                setPhotoUrl(result.photo_url);
                setPhotoHash(result.sha256_hash || null);
                toast({
                  title: "Photo Attached",
                  description: "Photographic evidence cryptographically verified.",
                });
              }}
            />
          </div>

          {/* GPS Verification */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="text-xs">
                {latitude && longitude ? (
                  <span className="font-mono text-foreground font-medium">
                    {latitude.toFixed(6)}°, {longitude.toFixed(6)}° (±{gpsAccuracy}m)
                  </span>
                ) : (
                  <span className="text-muted-foreground">GPS Location (Optional verification)</span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCaptureGps}
              disabled={isCapturingGps}
              className="text-xs h-8"
            >
              {isCapturingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
              {latitude ? "Update GPS" : "Capture GPS"}
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Observation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
