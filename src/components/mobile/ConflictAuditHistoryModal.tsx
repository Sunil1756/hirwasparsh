import React from "react";
import {
  ShieldCheck,
  History,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Calendar,
  User,
  Sparkles,
  Smartphone,
  Server,
  GitFork,
  Trash2,
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
import { ConflictAuditLogEntry } from "@/services/syncConflictService";
import { useSyncConflicts } from "@/hooks/useSyncConflicts";
import { toast } from "sonner";

export interface ConflictAuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictAuditHistoryModal: React.FC<ConflictAuditHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { auditTrail, clearAuditTrail } = useSyncConflicts();

  const renderStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case "smart_merge":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Smart Merge</span>
          </Badge>
        );
      case "local_wins":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            <span>Local Wins</span>
          </Badge>
        );
      case "server_wins":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] flex items-center gap-1">
            <Server className="h-3 w-3" />
            <span>Server Wins</span>
          </Badge>
        );
      case "fork_new":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            <span>Fork Duplicate</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {strategy}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl w-full p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-3xl max-h-[85vh] flex flex-col"
        data-testid="conflict-audit-history-modal"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/15 p-5 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-primary/20 text-primary rounded-2xl border border-primary/30">
                <History className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-heading text-foreground">
                  Conflict Resolution Audit Trail
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  MRV & Silvicultural compliance log for resolved field collisions
                </DialogDescription>
              </div>
            </div>
            {auditTrail.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearAuditTrail();
                  toast.info("Conflict audit history cleared.");
                }}
                className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear Log
              </Button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {auditTrail.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <ShieldCheck className="h-10 w-10 mx-auto opacity-40 text-primary" />
              <div className="text-sm font-semibold">No Conflict Records Found</div>
              <p className="text-xs max-w-xs mx-auto">
                All offline syncs have completed cleanly or no sync collisions have occurred yet.
              </p>
            </div>
          ) : (
            auditTrail.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-heading text-foreground">
                      {entry.entityId || "Item"}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {entry.entityType}
                    </Badge>
                  </div>
                  {renderStrategyBadge(entry.resolutionStrategy)}
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(entry.resolvedAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.resolvedBy}
                  </span>
                </div>

                {entry.rationale && (
                  <div className="text-[11px] italic bg-background/60 p-2 rounded-xl border border-border/60 text-foreground">
                    "{entry.rationale}"
                  </div>
                )}

                {/* DIFF SNAPSHOT TABLE */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Resolved Attributes:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {Object.entries(entry.diffSummary || {}).map(([key, diff]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-[11px] p-1.5 bg-background/40 rounded-lg border border-border/40 font-mono"
                      >
                        <span className="font-sans font-medium text-foreground">{key}:</span>
                        <span className="text-primary font-bold">{JSON.stringify(diff.chosen)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
