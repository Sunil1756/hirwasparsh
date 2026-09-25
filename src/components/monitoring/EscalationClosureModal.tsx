import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Award,
  FileSignature,
} from "lucide-react";
import {
  monitoringEscalationService,
  EscalationCase,
} from "../../services/monitoringEscalationService";

interface EscalationClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  escalationCase?: EscalationCase | null;
  onClosed?: (updated: EscalationCase) => void;
}

export const EscalationClosureModal: React.FC<EscalationClosureModalProps> = ({
  isOpen,
  onClose,
  escalationCase,
  onClosed,
}) => {
  const [closingReport, setClosingReport] = useState(
    "Ground truth verification audit completed. Photographic and biometric records uploaded with 91.2% healthy establishment verified. SLA breach cleared without registry non-conformance.",
  );
  const [signoffOfficer, setSignoffOfficer] = useState(
    "Head of ESG & Climate Compliance"
  );

  if (!isOpen || !escalationCase) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingReport.trim() || !signoffOfficer.trim()) return;

    const closed = monitoringEscalationService.resolveAndCloseEscalation(
      escalationCase.id,
      closingReport,
      signoffOfficer
    );

    if (onClosed) onClosed(closed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Formal Compliance Sign-Off & Closure
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {escalationCase.id} • {escalationCase.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {escalationCase.projectName} ({escalationCase.currentTier.toUpperCase()})
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              SLA Breach Duration: <strong className="text-rose-600 dark:text-rose-400">{escalationCase.slaBreachHours} hours</strong> • Source: {escalationCase.sourceEntity.toUpperCase()}
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Executive Sign-Off Authority
            </label>
            <input
              type="text"
              required
              value={signoffOfficer}
              onChange={(e) => setSignoffOfficer(e.target.value)}
              placeholder="e.g. Head of ESG & Climate Compliance"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Final MRV Remediation & Verification Findings Report
            </label>
            <textarea
              rows={4}
              required
              value={closingReport}
              onChange={(e) => setClosingReport(e.target.value)}
              placeholder="Summarize field audit signoff, replanting metrics, and regulatory verification confirmation..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-escalation-closure-btn"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm"
            >
              Sign-Off & Close Escalation Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
