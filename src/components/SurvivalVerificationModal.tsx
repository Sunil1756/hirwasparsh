/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 23
 * Survival Status Verification Modal (Human-in-the-Loop Sign-Off)
 * 
 * Allows foresters, field workers, and admins to review AI suggestions,
 * inspect ground evidence, and officially verify or override survival status.
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Bot,
  Heart,
  Droplets,
  AlertTriangle,
  Skull,
  HelpCircle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import {
  SurvivalStatus,
  SurvivalVerificationSource,
  StatusVerificationInput,
} from "@/types/coreDatabase";
import { survivalStatusService } from "@/services/survivalStatusService";
import { SurvivalStatusBadge } from "@/components/SurvivalStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface SurvivalVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  treeCode?: string | null;
  species: string;
  currentSurvivalStatus?: SurvivalStatus | string | null;
  aiSuggestedStatus?: SurvivalStatus | string | null;
  aiConfidence?: number | null;
  aiRationale?: string | null;
  photoUrl?: string | null;
  onSuccess?: () => void;
}

export const SurvivalVerificationModal: React.FC<SurvivalVerificationModalProps> = ({
  isOpen,
  onClose,
  treeId,
  treeCode,
  species,
  currentSurvivalStatus = "ALIVE",
  aiSuggestedStatus,
  aiConfidence,
  aiRationale,
  photoUrl,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normCurrent = survivalStatusService.normalizeSurvivalStatus(currentSurvivalStatus);
  const normAi = aiSuggestedStatus ? survivalStatusService.normalizeSurvivalStatus(aiSuggestedStatus) : null;

  const [selectedStatus, setSelectedStatus] = useState<SurvivalStatus>(normAi || normCurrent);
  const [verificationSource, setVerificationSource] = useState<SurvivalVerificationSource>("field_observation");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeId) return;

    setIsSubmitting(true);

    try {
      const input: StatusVerificationInput = {
        treeId,
        verifiedStatus: selectedStatus,
        reviewerId: user?.id || "verified-monitor",
        reviewerName: profile?.full_name || user?.email || "Forester / Field Auditor",
        reviewerRole: (profile as any)?.role || "field_worker",
        verificationSource,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl || undefined,
      };

      const result = await survivalStatusService.verifySurvivalStatus(input);

      if (!result.success) {
        throw new Error(result.error || "Failed to verify survival status.");
      }

      toast({
        title: "Survival Status Verified",
        description: `Tree officially certified as ${result.verifiedStatus}.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Verification Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Human-in-the-Loop Audit</span>
          </div>
          <DialogTitle className="text-xl font-heading font-bold">
            Verify Tree Survival Status
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {species} • ID: <span className="font-mono font-medium text-foreground">{treeCode || treeId.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* AI vs Current Status Comparison Card */}
          <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Current Status:</span>
              <SurvivalStatusBadge status={normCurrent} size="sm" />
            </div>

            {normAi && (
              <div className="p-3 rounded-lg bg-card border border-primary/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Bot className="h-4 w-4" /> AI Telemetry Proposal
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SurvivalStatusBadge status={normAi} size="sm" />
                    {aiConfidence && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {aiConfidence}% conf
                      </span>
                    )}
                  </div>
                </div>
                {aiRationale && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiRationale}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status Selection Buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Official Verified Survival Status *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "ALIVE", label: "Alive & Vigorous", icon: Heart, color: "text-emerald-400" },
                { id: "STRESSED", label: "Stressed / Water Deficit", icon: Droplets, color: "text-amber-400" },
                { id: "DAMAGED", label: "Damaged / Broken", icon: AlertTriangle, color: "text-orange-400" },
                { id: "DEAD", label: "Dead / Mortality", icon: Skull, color: "text-rose-400" },
                { id: "UNKNOWN", label: "Unknown / Unsurveyed", icon: HelpCircle, color: "text-slate-400" },
                { id: "NEEDS_REVIEW", label: "Needs Expert Review", icon: ShieldAlert, color: "text-purple-400" },
              ].map((item) => {
                const isSelected = selectedStatus === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStatus(item.id as SurvivalStatus)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary/15 border-primary text-foreground shadow-sm ring-1 ring-primary"
                        : "bg-card/50 border-border text-muted-foreground hover:bg-card"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1.5 ${item.color}`} />
                    <span className="text-center font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification Source Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="verificationSource" className="text-xs font-semibold uppercase text-muted-foreground">
              Verification Authority Source *
            </Label>
            <Select
              value={verificationSource}
              onValueChange={(val: SurvivalVerificationSource) => setVerificationSource(val)}
            >
              <SelectTrigger id="verificationSource" className="w-full">
                <SelectValue placeholder="Select verification source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="field_observation">Field Worker Direct Ground Audit</SelectItem>
                <SelectItem value="forester_audit">Certified Forester Verification</SelectItem>
                <SelectItem value="admin_override">Institutional / Admin Sign-off</SelectItem>
                <SelectItem value="initial_planting">Baseline Planting Registration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="verificationNotes" className="text-xs font-semibold uppercase text-muted-foreground">
              Auditor Notes & Justification
            </Label>
            <Textarea
              id="verificationNotes"
              placeholder="State observations, visual ground verification details, or reasons for status determination..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Certify Status
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
