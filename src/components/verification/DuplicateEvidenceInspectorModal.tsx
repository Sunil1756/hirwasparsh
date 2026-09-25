import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Copy,
  Check,
  X,
  MapPin,
  Calendar,
  User,
  Camera,
  Layers,
  Sparkles,
  Fingerprint,
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react";
import {
  EvidenceCollision,
  CollisionResolutionStatus,
  duplicateEvidenceService,
} from "../../services/duplicateEvidenceService";

interface DuplicateEvidenceInspectorModalProps {
  collision: EvidenceCollision;
  onClose: () => void;
  onResolved?: (updatedCollision: EvidenceCollision) => void;
}

export const DuplicateEvidenceInspectorModal: React.FC<DuplicateEvidenceInspectorModalProps> = ({
  collision,
  onClose,
  onResolved,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeResolution, setActiveResolution] = useState<CollisionResolutionStatus>(
    collision.resolutionStatus || "pending"
  );
  const [copiedSha, setCopiedSha] = useState(false);

  const handleCopySha = (hash: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hash);
    }
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleResolve = async (status: CollisionResolutionStatus) => {
    setIsProcessing(true);
    try {
      const updated = duplicateEvidenceService.resolveCollision(
        collision.id,
        status,
        resolutionNotes || ("Resolved as " + status.replace(/_/g, " ")),
        "admin_inspector"
      );
      setActiveResolution(status);
      if (onResolved) {
        onResolved(updated);
      }
    } catch (err) {
      console.error("Resolution error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical_fraud":
        return "bg-rose-950/80 text-rose-300 border-rose-500/50";
      case "high_risk_collision":
        return "bg-amber-950/80 text-amber-300 border-amber-500/50";
      case "moderate_similarity":
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
      aria-labelledby="duplicate-inspector-title"
    >
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-950/80 via-zinc-900 to-zinc-900 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="duplicate-inspector-title"
                className="text-lg font-bold text-white tracking-wide flex items-center gap-2"
              >
                Duplicate Evidence Collision Inspector
                <span
                  className={"text-xs font-bold px-2.5 py-0.5 rounded-full uppercase border " + getRiskColor(collision.riskLevel)}
                >
                  {collision.riskLevel.replace(/_/g, " ")}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Multi-vector cryptographic (SHA-256) & perceptual (dHash) duplicate photo forensics.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close duplicate inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200 text-sm">
          {/* Reason Alert Banner */}
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">Anti-Fraud Alert Details</p>
              <p className="leading-relaxed">{collision.reason}</p>
            </div>
          </div>

          {/* Forensics Metrics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Visual Similarity</span>
              <p className="text-xl font-black text-rose-400 mt-1">{collision.visualSimilarityPct}%</p>
              <span className="text-[10px] text-zinc-500">dHash match confidence</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Hamming Distance</span>
              <p className="text-xl font-black text-amber-400 mt-1">{collision.hammingDistance} bits</p>
              <span className="text-[10px] text-zinc-500">&le; 6 bits = visual duplicate</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Spatial Distance</span>
              <p className="text-xl font-black text-rose-400 mt-1">
                {collision.spatialDistanceMeters > 1000
                  ? (collision.spatialDistanceMeters / 1000).toFixed(2) + " km"
                  : collision.spatialDistanceMeters.toFixed(1) + " m"}
              </p>
              <span className="text-[10px] text-rose-300 font-semibold">
                {collision.spatialDistanceMeters > 20 ? "Disjoint locations!" : "Co-located base"}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Time Gap</span>
              <p className="text-xl font-black text-blue-400 mt-1">{collision.timeDeltaDays.toFixed(1)} days</p>
              <span className="text-[10px] text-zinc-500">Between captures</span>
            </div>
          </div>

          {/* Side-by-Side Photographic Evidence Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Candidate Photo */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-rose-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4" /> Suspicious Submission (Candidate)
                </span>
                <span className="font-mono text-zinc-400">{collision.candidateTreeId}</span>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                <img
                  src={collision.candidatePhotoUrl}
                  alt="Candidate Evidence"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-rose-300 border border-rose-500/30">
                  FLAGGED CANDIDATE
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Planter: <strong className="text-white">{collision.candidatePlanterId}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono">{collision.candidateGps.latitude.toFixed(5)}, {collision.candidateGps.longitude.toFixed(5)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Captured: {new Date(collision.candidateTimestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Matching Repository Photo */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Original Repository Record
                </span>
                <span className="font-mono text-zinc-400">{collision.matchingRecord.treeId}</span>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                <img
                  src={collision.matchingRecord.photoUrl}
                  alt="Original Evidence"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                  FIRST RECORDED (ORIGINAL)
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>First Claimed By: <strong className="text-white">{collision.matchingRecord.planterId} ({collision.matchingRecord.planterName || "Registered Farmer"})</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">{collision.matchingRecord.gps.latitude.toFixed(5)}, {collision.matchingRecord.gps.longitude.toFixed(5)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>First Recorded: {new Date(collision.matchingRecord.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collision Vectors Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 block">
              Active Collision Vectors ({collision.vectors.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {collision.vectors.map((vec) => (
                <span
                  key={vec}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {vec === "exact_sha256" && "Exact SHA-256 Byte Hash Collision"}
                  {vec === "perceptual_dhash" && "Perceptual dHash Match (≤ 6 bits)"}
                  {vec === "exif_sensor" && "EXIF Hardware Timestamp / Serial Collision"}
                  {vec === "geospatial_mismatch" && "Geodetic Distance Mismatch (> 20m)"}
                </span>
              ))}
            </div>
          </div>

          {/* Auditor Resolution Section */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Auditor Adjudication & Action
              </span>
              {activeResolution !== "pending" && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Status: {activeResolution.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <textarea
              rows={2}
              placeholder="Enter auditor adjudication rationale / inspection notes..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                onClick={() => handleResolve("dismissed_false_positive")}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
              >
                Dismiss False Positive
              </button>

              <button
                onClick={() => handleResolve("legitimate_exception_granted")}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors disabled:opacity-50"
              >
                Grant Legitimate Exception
              </button>

              <button
                onClick={() => handleResolve("confirmed_fraud_rejected")}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950 disabled:opacity-50"
              >
                Confirm Fraud & Reject
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            HirwaSparsh • Multi-Vector Forensics
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
