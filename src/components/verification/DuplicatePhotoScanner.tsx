import React, { useState, useEffect, useMemo } from "react";
import {
  Fingerprint,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  Layers,
  CheckCircle2,
  XCircle,
  Zap,
  Filter,
  MapPin,
  Calendar,
  User,
  ArrowRightLeft,
} from "lucide-react";
import {
  duplicateEvidenceService,
  EvidenceCollision,
  DuplicateCluster,
  RepositoryScanSummary,
} from "../../services/duplicateEvidenceService";
import { DuplicateEvidenceInspectorModal } from "./DuplicateEvidenceInspectorModal";

export const DuplicatePhotoScanner: React.FC = () => {
  const [collisions, setCollisions] = useState<EvidenceCollision[]>(() =>
    duplicateEvidenceService.getCollisions()
  );
  const [clusters, setClusters] = useState<DuplicateCluster[]>(() =>
    duplicateEvidenceService.getClusters()
  );
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanSummary, setLastScanSummary] = useState<RepositoryScanSummary | null>(null);
  const [selectedCollision, setSelectedCollision] = useState<EvidenceCollision | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const summary = duplicateEvidenceService.scanRepositoryForDuplicates();
      setLastScanSummary(summary);
      setCollisions(summary.collisions);
      setClusters(summary.clusters);
      setIsScanning(false);
    }, 400);
  };

  useEffect(() => {
    const unsubscribe = duplicateEvidenceService.subscribe(() => {
      setCollisions(duplicateEvidenceService.getCollisions());
    });
    return unsubscribe;
  }, []);

  const filteredCollisions = useMemo(() => {
    return collisions.filter((col) => {
      if (riskFilter !== "all" && col.riskLevel !== riskFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchCandidate = col.candidateTreeId.toLowerCase().includes(q);
        const matchOriginal = col.matchingRecord.treeId.toLowerCase().includes(q);
        const matchPlanter = col.candidatePlanterId.toLowerCase().includes(q);
        const matchReason = col.reason.toLowerCase().includes(q);
        if (!matchCandidate && !matchOriginal && !matchPlanter && !matchReason) return false;
      }
      return true;
    });
  }, [collisions, riskFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = collisions.length;
    const critical = collisions.filter((c) => c.riskLevel === "critical_fraud").length;
    const highRisk = collisions.filter((c) => c.riskLevel === "high_risk_collision").length;
    const pending = collisions.filter((c) => c.resolutionStatus === "pending").length;
    const resolved = collisions.filter((c) => c.resolutionStatus !== "pending").length;
    return { total, critical, highRisk, pending, resolved };
  }, [collisions]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "critical_fraud":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Critical Fraud
          </span>
        );
      case "high_risk_collision":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> High Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {risk}
          </span>
        );
    }
  };

  const getResolutionBadge = (status: string) => {
    switch (status) {
      case "confirmed_fraud_rejected":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-500/40">Fraud Rejected</span>;
      case "legitimate_exception_granted":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-500/40">Exception Granted</span>;
      case "dismissed_false_positive":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-500/40">Dismissed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-500/40">Pending Review</span>;
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 animate-fade-in" data-testid="duplicate-photo-scanner">
      {/* Top Banner & Scan Trigger */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-rose-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <Fingerprint className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Repository Duplicate Evidence Scanner
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/30 font-semibold font-mono">
                Task 41
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Cross-plantation perceptual image hashing (dHash) & exact SHA-256 byte collision scanner.
            </p>
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition-all disabled:opacity-50"
        >
          <RefreshCw className={"w-4 h-4 " + (isScanning ? "animate-spin" : "")} />
          <span>{isScanning ? "Scanning Entire Repository..." : "Run Duplicate Evidence Scan"}</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Collisions</span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/30 bg-rose-950/10">
          <span className="text-[10px] uppercase font-bold text-rose-400">Critical Fraud</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.critical}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 bg-amber-950/10">
          <span className="text-[10px] uppercase font-bold text-amber-400">High Risk Similarity</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.highRisk}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-[10px] uppercase font-bold text-amber-300">Pending Adjudication</span>
          <p className="text-2xl font-black text-amber-300 mt-1">{stats.pending}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Resolved</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search colliding tree, planter, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {["all", "critical_fraud", "high_risk_collision"].map((risk) => {
            const isActive = riskFilter === risk;
            return (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={"px-3 py-1.5 rounded-lg capitalize whitespace-nowrap font-medium transition-colors " + (
                  isActive
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {risk === "all" ? "All Severities" : risk.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collisions List Grid */}
      <div className="space-y-3">
        {filteredCollisions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-zinc-300">No duplicate evidence collisions match your filter.</p>
          </div>
        ) : (
          filteredCollisions.map((collision) => (
            <div
              key={collision.id}
              className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getRiskBadge(collision.riskLevel)}
                  {getResolutionBadge(collision.resolutionStatus)}
                  <span className="text-xs font-mono font-bold text-white">
                    {collision.candidateTreeId} <ArrowRightLeft className="w-3.5 h-3.5 inline mx-1 text-zinc-500" /> {collision.matchingRecord.treeId}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {collision.reason}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-zinc-400 flex-wrap">
                  <span>Visual Similarity: <strong className="text-rose-400 font-mono">{collision.visualSimilarityPct}%</strong></span>
                  <span>Hamming Distance: <strong className="text-amber-400 font-mono">{collision.hammingDistance} bits</strong></span>
                  <span>Spatial Delta: <strong className="text-white font-mono">{collision.spatialDistanceMeters.toFixed(0)}m</strong></span>
                  <span>Planter: {collision.candidatePlanterId} vs {collision.matchingRecord.planterId}</span>
                </div>
              </div>

              {/* Right Side Photo Preview & Action Button */}
              <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <img
                    src={collision.candidatePhotoUrl}
                    alt="Candidate"
                    className="w-14 h-14 rounded-lg object-cover border border-rose-500/40"
                  />
                  <img
                    src={collision.matchingRecord.photoUrl}
                    alt="Original"
                    className="w-14 h-14 rounded-lg object-cover border border-emerald-500/40"
                  />
                </div>

                <button
                  onClick={() => setSelectedCollision(collision)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Forensics</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Duplicate Evidence Inspector Modal */}
      {selectedCollision && (
        <DuplicateEvidenceInspectorModal
          collision={selectedCollision}
          onClose={() => setSelectedCollision(null)}
          onResolved={(updated) => {
            setCollisions((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
            setSelectedCollision(null);
          }}
        />
      )}
    </div>
  );
};
