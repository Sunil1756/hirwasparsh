import React, { useState, useEffect } from "react";
import {
  GitMerge,
  Server,
  Smartphone,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  Sparkles,
  ShieldAlert,
  Info,
  Sliders,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  SyncConflict,
  ConflictFieldDiff,
  ConflictResolutionStrategy,
  ConflictResolutionPlan,
} from "@/services/syncConflictService";
import { toast } from "sonner";

export interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SyncConflict | null;
  onResolve: (conflictId: string, plan: ConflictResolutionPlan) => Promise<void>;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  onResolve,
}) => {
  const [activeDiffs, setActiveDiffs] = useState<ConflictFieldDiff[]>([]);
  const [rationale, setRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (conflict) {
      const initialized = (conflict.diffs || []).map((d) => ({
        ...d,
        chosenValue: d.localValue !== undefined ? d.localValue : d.serverValue,
        chosenSource: (d.localValue !== undefined ? "local" : "server") as "local" | "server" | "custom",
      }));
      setActiveDiffs(initialized);
      setRationale("");
    }
  }, [conflict]);

  if (!conflict) return null;

  const handleSelectFieldSource = (field: string, source: "local" | "server") => {
    setActiveDiffs((prev) =>
      prev.map((d) => {
        if (d.field !== field) return d;
        return {
          ...d,
          chosenValue: source === "local" ? d.localValue : d.serverValue,
          chosenSource: source,
        };
      })
    );
  };

  const handleExecuteResolution = async (strategy: ConflictResolutionStrategy) => {
    setIsSubmitting(true);
    try {
      const plan: ConflictResolutionPlan = {
        strategy,
        resolvedBy: "Field Worker / Supervisor",
        rationale: rationale || `Manually resolved via ${strategy}`,
        customDiffs: strategy === "custom_merge" ? activeDiffs : undefined,
      };

      await onResolve(conflict.conflictId, plan);
      toast.success(`Conflict resolved using ${strategy.replace(/_/g, " ")}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve conflict");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayValue = (val: any) => {
    if (val === undefined || val === null) return <span className="text-muted-foreground italic">None / Unset</span>;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl w-full p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-3xl max-h-[92vh] flex flex-col"
        data-testid="conflict-resolution-modal"
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-amber-600/15 via-orange-600/10 to-emerald-600/15 p-5 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/30">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-heading text-foreground flex items-center gap-2">
                  <span>Conflict Resolution Inspector</span>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] uppercase font-mono">
                    {conflict.entityType}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {conflict.title} &bull; {conflict.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE DIFF CONTAINER */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* COMPARISON LEGEND */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-800 dark:text-amber-200">Local Device Draft</div>
                <div className="text-[10px] text-muted-foreground">Offline Field Capture</div>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-xl">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Cloud / Server State</div>
                <div className="text-[10px] text-muted-foreground">Central Database Master</div>
              </div>
            </div>
          </div>

          {/* ATTRIBUTE DIFFS LIST */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Divergent Field Attributes ({activeDiffs.length})</span>
              <span className="text-[11px] font-normal text-muted-foreground lowercase">Click card to select preferred source</span>
            </div>

            {activeDiffs.map((diff) => {
              const isLocalSelected = diff.chosenSource === "local";
              const isServerSelected = diff.chosenSource === "server";

              return (
                <div
                  key={diff.field}
                  className="p-3.5 bg-muted/40 border border-border/80 rounded-2xl space-y-2.5 hover:border-border transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground font-heading">
                      {diff.label} <code className="text-[10px] font-mono text-muted-foreground">({diff.field})</code>
                    </span>
                    {diff.isConflicting ? (
                      <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                        Direct Conflict
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                        Non-Conflicting
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* LOCAL VALUE BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleSelectFieldSource(diff.field, "local")}
                      className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isLocalSelected
                          ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-100 font-semibold shadow-sm"
                          : "bg-background/60 border-border/70 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 mb-1">
                        <span>📱 Local</span>
                        {isLocalSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                      </div>
                      <div className="break-words line-clamp-3 text-xs">{formatDisplayValue(diff.localValue)}</div>
                    </button>

                    {/* SERVER VALUE BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleSelectFieldSource(diff.field, "server")}
                      className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isServerSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-semibold shadow-sm"
                          : "bg-background/60 border-border/70 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <span>☁️ Server</span>
                        {isServerSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="break-words line-clamp-3 text-xs">{formatDisplayValue(diff.serverValue)}</div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RESOLUTION RATIONALE */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Resolution Audit Note (Optional)</span>
            </label>
            <Input
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="e.g. Field ranger confirmed fresh GPS coordinates & DBH measurement."
              className="text-xs rounded-xl"
            />
          </div>
        </div>

        {/* ACTION TOOLBAR FOOTER */}
        <div className="p-4 bg-muted/40 border-t border-border/80 flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* SMART MERGE */}
            <Button
              type="button"
              variant="default"
              disabled={isSubmitting}
              onClick={() => handleExecuteResolution("smart_merge")}
              className="rounded-xl h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>Smart Merge</span>
            </Button>

            {/* KEEP LOCAL */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleExecuteResolution("local_wins")}
              className="rounded-xl h-10 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Keep Local</span>
            </Button>

            {/* KEEP SERVER */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleExecuteResolution("server_wins")}
              className="rounded-xl h-10 text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
            >
              <Server className="h-3.5 w-3.5" />
              <span>Keep Server</span>
            </Button>

            {/* FORK AS NEW */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleExecuteResolution("fork_new")}
              className="rounded-xl h-10 text-xs font-semibold border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 flex items-center justify-center gap-1.5"
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Fork Duplicate</span>
            </Button>
          </div>

          {/* CUSTOM ATTRIBUTE MERGE SUBMIT */}
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => handleExecuteResolution("custom_merge")}
            className="w-full rounded-xl h-9 text-xs font-medium border border-border/60 hover:bg-muted"
          >
            Apply Custom Field-by-Field Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
