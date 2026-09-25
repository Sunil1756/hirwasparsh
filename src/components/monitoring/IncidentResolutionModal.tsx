import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  monitoringAlertService,
  AlertIncident,
} from "../../services/monitoringAlertService";

interface IncidentResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident?: AlertIncident | null;
  actionType: "resolve" | "dismiss";
  onCompleted?: (incident: AlertIncident) => void;
}

export const IncidentResolutionModal: React.FC<IncidentResolutionModalProps> = ({
  isOpen,
  onClose,
  incident,
  actionType,
  onCompleted,
}) => {
  const [rootCause, setRootCause] = useState(
    actionType === "resolve"
      ? "Field quadrat audit confirmed localized drought stress. Drip irrigation intensified."
      : "Atmospheric cloud cover obscuration artifact on optical band."
  );
  const [resolutionNotes, setResolutionNotes] = useState(
    actionType === "resolve"
      ? "Ground ranger squad completed remedial watering. Foliar vigor restored to normal."
      : "Subsequent cloud-free Sentinel-2 pass confirmed healthy NDVI of 0.75."
  );

  if (!isOpen || !incident) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;

    let updated: AlertIncident;
    if (actionType === "resolve") {
      updated = monitoringAlertService.resolveIncident(
        incident.id,
        resolutionNotes,
        rootCause
      );
    } else {
      updated = monitoringAlertService.dismissIncident(
        incident.id,
        resolutionNotes
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
            <div className={`p-2 rounded-xl ${
              actionType === "resolve"
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}>
              {actionType === "resolve" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {actionType === "resolve" ? "Resolve Anomaly Incident" : "Dismiss Incident (False Positive)"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {incident.id} • {incident.title}
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
              {incident.projectName} ({incident.locationReference})
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              Observed Value: <strong className="text-zinc-800 dark:text-zinc-200">{incident.observedValue} {incident.unit}</strong> • Threshold: <strong className="text-zinc-800 dark:text-zinc-200">{incident.thresholdValue} {incident.unit}</strong>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Root Cause Classification
            </label>
            <input
              type="text"
              required
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Localized drought stress or Sensor cloud shadow"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              {actionType === "resolve" ? "Resolution & Remedial Action Summary" : "False Positive Justification Notes"}
            </label>
            <textarea
              rows={3}
              required
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail verification findings or cloud-free verification passes..."
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
              data-testid="submit-incident-resolution-btn"
              className={`px-5 py-2 rounded-xl text-white font-bold transition-colors shadow-sm ${
                actionType === "resolve"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              {actionType === "resolve" ? "Confirm & Close Incident" : "Dismiss Incident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
