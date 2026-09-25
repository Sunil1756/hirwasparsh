import React, { useState } from "react";
import {
  X,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  UserCheck,
  Calendar,
} from "lucide-react";
import {
  monitoringEscalationService,
  EscalationCase,
  EscalationTier,
} from "../../services/monitoringEscalationService";

interface EscalationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  escalationCase?: EscalationCase | null;
  mode: "advance_tier" | "mitigation_plan";
  onCompleted?: (updated: EscalationCase) => void;
}

export const EscalationActionModal: React.FC<EscalationActionModalProps> = ({
  isOpen,
  onClose,
  escalationCase,
  mode,
  onCompleted,
}) => {
  const [targetTier, setTargetTier] = useState<EscalationTier>("tier3_verifier");
  const [assignedOfficer, setAssignedOfficer] = useState("Lead Verifier (Dr. A. Deshmukh)");
  const [notes, setNotes] = useState(
    "Ground obstacles require specialized emergency logistics contract and chief scientific verification.",
  );
  const [mitigationPlan, setMitigationPlan] = useState(
    "Dispatch twin-engine drone vessel on tidal retreat and cross-verify with RADARSAT SAR pass.",
  );
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 10)
  );

  if (!isOpen || !escalationCase) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let updated: EscalationCase;
    if (mode === "advance_tier") {
      updated = monitoringEscalationService.advanceTier(
        escalationCase.id,
        targetTier,
        assignedOfficer,
        notes
      );
    } else {
      updated = monitoringEscalationService.submitMitigationPlan(
        escalationCase.id,
        mitigationPlan,
        new Date(targetDate).toISOString()
      );
    }

    if (onCompleted) onCompleted(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
              {mode === "advance_tier" ? <ArrowUpRight className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {mode === "advance_tier" ? "Promote Escalation Tier" : "Submit SLA Mitigation Plan"}
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
          {mode === "advance_tier" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                    Target Operational Tier
                  </label>
                  <select
                    value={targetTier}
                    onChange={(e) => setTargetTier(e.target.value as EscalationTier)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none"
                  >
                    <option value="tier2_operations">Tier 2: Regional Operations</option>
                    <option value="tier3_verifier">Tier 3: Lead MRV Verifier</option>
                    <option value="tier4_executive">Tier 4: Executive & Registry Governance</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                    Designated Escalation Officer
                  </label>
                  <input
                    type="text"
                    required
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    placeholder="e.g. Lead Verifier (Dr. A. Deshmukh)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                  Tier Promotion Justification & Action Directives
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail operational urgency and requested higher-tier signoff..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                  Target Mitigation Recovery Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                  Remedial SLA Mitigation Strategy
                </label>
                <textarea
                  rows={4}
                  required
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  placeholder="Specify immediate corrective actions, replanting orders, or sensor overrides..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </>
          )}

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
              data-testid="submit-escalation-action-btn"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors shadow-sm"
            >
              {mode === "advance_tier" ? "Promote Tier & Alert Officer" : "Register Mitigation Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
