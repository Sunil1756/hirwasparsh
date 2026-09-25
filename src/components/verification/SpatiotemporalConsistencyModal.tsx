import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  MapPin,
  Calendar,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Gauge,
  Zap,
  Copy,
  Check,
  X,
  Navigation,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  SpatiotemporalAuditReport,
  SpatiotemporalAdjudicationStatus,
  spatiotemporalConsistencyService,
} from "../../services/spatiotemporalConsistencyService";

interface SpatiotemporalConsistencyModalProps {
  report: SpatiotemporalAuditReport;
  onClose: () => void;
  onResolved?: (updated: SpatiotemporalAuditReport) => void;
}

export const SpatiotemporalConsistencyModal: React.FC<SpatiotemporalConsistencyModalProps> = ({
  report,
  onClose,
  onResolved,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStatus, setActiveStatus] = useState<SpatiotemporalAdjudicationStatus>(
    report.adjudicationStatus
  );
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopySummary = () => {
    const summaryText = [
      "HIRWASPARSH SPATIOTEMPORAL AUDIT REPORT",
      "Tree ID: " + report.treeId,
      "Planter: " + report.planterName + " (" + report.planterId + ")",
      "Timestamp: " + report.timestamp,
      "Coordinates: " + report.coords.latitude + ", " + report.coords.longitude,
      "Kinematics: " + report.kinematics.speedKmh + " km/h (" + report.kinematics.status + ")",
      "Solar Zenith: " + report.solarEphemeris.solarZenithAngleDeg + "° (" + report.solarEphemeris.lightingStatus + ")",
      "Geofence: " + report.geofence.status + " (" + report.geofence.distanceToBoundaryMeters + "m from perimeter)",
      "Overall Score: " + report.overallScore + "% (" + report.riskLevel + ")",
      "Active Violations: " + (report.activeViolations.join("; ") || "None"),
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summaryText);
    }
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleResolve = async (status: SpatiotemporalAdjudicationStatus) => {
    setIsProcessing(true);
    try {
      const updated = spatiotemporalConsistencyService.adjudicateReport(
        report.id,
        status,
        resolutionNotes || ("Spatiotemporal adjudication as " + status.replace(/_/g, " ")),
        "senior_verifier_01"
      );
      setActiveStatus(status);
      if (onResolved) {
        onResolved(updated);
      }
    } catch (err) {
      console.error("Adjudication error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "critical_spoofing":
        return "bg-rose-950/80 text-rose-300 border-rose-500/50";
      case "anomalous_flagged":
        return "bg-amber-950/80 text-amber-300 border-amber-500/50";
      case "minor_warning":
        return "bg-blue-950/80 text-blue-300 border-blue-500/50";
      default:
        return "bg-emerald-950/80 text-emerald-300 border-emerald-500/50";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spatiotemporal-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-950/80 via-zinc-900 to-zinc-900 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="spatiotemporal-modal-title"
                className="text-lg font-bold text-white tracking-wide flex items-center gap-2"
              >
                Spatiotemporal & Kinematic Verification Inspector
                <span
                  className={"text-xs font-bold px-2.5 py-0.5 rounded-full uppercase border " + getRiskBadge(report.riskLevel)}
                >
                  {report.riskLevel.replace(/_/g, " ")}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Kinematic speed physics, astronomical solar ephemeris, and geofence boundary consistency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close spatiotemporal inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200 text-sm">
          {/* Violations Banner */}
          {report.activeViolations.length > 0 ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Detected Spatiotemporal Anomalies ({report.activeViolations.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-rose-300/90 leading-relaxed">
                {report.activeViolations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>All physical kinematics, astronomical daylight, and geofence boundaries verified consistent.</span>
            </div>
          )}

          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Integrity Score</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{report.overallScore}%</p>
              <span className="text-[10px] text-zinc-500">Spatiotemporal Trust</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Kinematic Speed</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{report.kinematics.speedKmh} km/h</p>
              <span className="text-[10px] text-zinc-500">{report.kinematics.status.replace(/_/g, " ")}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Solar Zenith</span>
              <p className="text-2xl font-black text-blue-400 mt-1">{report.solarEphemeris.solarZenithAngleDeg}°</p>
              <span className="text-[10px] text-zinc-500">{report.solarEphemeris.lightingStatus.replace(/_/g, " ")}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Geofence Status</span>
              <p className="text-sm font-bold text-emerald-400 mt-2">{report.geofence.status.replace(/_/g, " ")}</p>
              <span className="text-[10px] text-zinc-500">{report.geofence.distanceToBoundaryMeters.toFixed(0)}m from boundary</span>
            </div>
          </div>

          {/* Detailed Forensic Vectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Kinematic Trajectory & Travel Vector */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" /> Kinematic Travel Feasibility
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {report.kinematics.status}
                </span>
              </div>

              {report.kinematics.previousPoint ? (
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>Prior Check-in: <strong className="text-zinc-200">{report.kinematics.previousPoint.treeId}</strong></span>
                    <span>{new Date(report.kinematics.previousPoint.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 py-1 text-amber-400 font-mono text-xs">
                    <span>{report.kinematics.distanceKm.toFixed(1)} km</span>
                    <ArrowRight className="w-4 h-4" />
                    <span>in {report.kinematics.elapsedMinutes.toFixed(1)} mins</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>Current Submission: <strong className="text-white">{report.treeId}</strong></span>
                    <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">Initial baseline check-in for this planter session.</p>
              )}

              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800">
                {report.kinematics.notes}
              </p>
            </div>

            {/* Right: Astronomical Solar Ephemeris */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  {report.solarEphemeris.lightingStatus === "astronomical_night" ? (
                    <Moon className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-400" />
                  )}
                  Solar Day/Night Ephemeris
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {report.solarEphemeris.lightingStatus}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <Sunrise className="w-3.5 h-3.5 mx-auto text-amber-400 mb-1" />
                  <span className="text-[10px] text-zinc-500 block">Sunrise</span>
                  <strong className="text-zinc-200">{report.solarEphemeris.sunriseTime}</strong>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <Sun className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-1" />
                  <span className="text-[10px] text-zinc-500 block">Solar Noon</span>
                  <strong className="text-zinc-200">{report.solarEphemeris.solarNoonTime}</strong>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <Sunset className="w-3.5 h-3.5 mx-auto text-rose-400 mb-1" />
                  <span className="text-[10px] text-zinc-500 block">Sunset</span>
                  <strong className="text-zinc-200">{report.solarEphemeris.sunsetTime}</strong>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800">
                {report.solarEphemeris.notes}
              </p>
            </div>
          </div>

          {/* Geodetic Geofence & Provenance Bar */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> Cadastral Geofence & Hardware Clock Provenance
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-400 font-semibold">Project Parcel Boundary:</span>
                <p className="text-zinc-200 font-mono">{report.geofence.boundaryName}</p>
                <p className="text-[11px] text-zinc-400">{report.geofence.notes}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-400 font-semibold">Hardware Clock Sync:</span>
                <p className="text-zinc-200 font-mono">
                  Drift: {report.chronology.clockDriftSeconds.toFixed(0)}s {report.chronology.isClockSynchronized ? "(Synchronized)" : "(Drift Alert)"}
                </p>
                <p className="text-[11px] text-zinc-400">{report.chronology.notes}</p>
              </div>
            </div>
          </div>

          {/* Auditor Adjudication Section */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Auditor Adjudication & Decision
              </span>
              {activeStatus !== "pending_review" && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Status: {activeStatus.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <textarea
              rows={2}
              placeholder="Enter auditor adjudication notes / physics waiver rationale..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? "Copied!" : "Copy Forensic Summary"}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleResolve("field_re_audit_requested")}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
                >
                  Request Field Re-Audit
                </button>

                <button
                  onClick={() => handleResolve("travel_waiver_granted")}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors disabled:opacity-50"
                >
                  Grant Travel/Terrain Waiver
                </button>

                <button
                  onClick={() => handleResolve("confirmed_spoofing_rejected")}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950 disabled:opacity-50"
                >
                  Confirm Spoofing & Reject
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            HirwaSparsh • Spatiotemporal Physics & Kinematics Engine
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
