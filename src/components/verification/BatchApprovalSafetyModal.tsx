import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Lock,
  X,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  ApprovalClaim,
  ReviewerRole,
} from "../../services/reviewerApprovalService";

interface BatchApprovalSafetyModalProps {
  claims: ApprovalClaim[];
  currentRole: ReviewerRole;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const BatchApprovalSafetyModal: React.FC<BatchApprovalSafetyModalProps> = ({
  claims,
  currentRole,
  onConfirm,
  onCancel,
  isProcessing,
}) => {
  const eligible = claims.filter(
    (c) => c.trustTier !== "low_flagged" && c.stage !== "rejected"
  );
  const quarantined = claims.filter(
    (c) => c.trustTier === "low_flagged" || c.stage === "rejected"
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 id="batch-modal-title" className="text-lg font-bold text-white tracking-wide">
                Safe Batch Approval & Certification Preview
              </h3>
              <p className="text-xs text-zinc-400">
                Automatic quarantine guardrails for high-risk / flagged submissions.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-zinc-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-zinc-300">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Eligible for Batch Sealing
              </span>
              <p className="text-2xl font-black text-white">{eligible.length} Claims</p>
              <p className="text-[11px] text-emerald-300/80">High-trust, 0 active critical fraud flags.</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Quarantined (Excluded)
              </span>
              <p className="text-2xl font-black text-white">{quarantined.length} Claims</p>
              <p className="text-[11px] text-amber-300/80">Requires manual forensic inspection.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-zinc-400 leading-relaxed">
            <p className="font-semibold text-zinc-200">Safety Policy & Merkle Tree Certification:</p>
            <p>
              Executing this batch sign-off will generate a cryptographic batch manifest and attach digital
              signatures to all {eligible.length} eligible claims under reviewer role <strong>{currentRole.replace(/_/g, " ")}</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing || eligible.length === 0}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {isProcessing ? "Sealing Cryptographic Batch..." : "Confirm & Seal " + eligible.length + " Claims"}
          </button>
        </div>
      </div>
    </div>
  );
};
