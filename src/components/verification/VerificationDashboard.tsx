import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  UploadCloud,
  Cpu,
  UserCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  Fingerprint,
  Clock,
  User,
  FileCheck,
  Zap,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  Info,
  Check,
} from "lucide-react";
import {
  verificationDashboardService,
  VerificationDashboardMetrics,
  PipelineClaimItem,
  PipelineStage,
  ZERO_GREENWASHING_DISCLAIMER,
} from "../../services/verificationDashboardService";
import { VerificationPipelineFunnel } from "./VerificationPipelineFunnel";
import { EvidenceVerificationWorkbench } from "./EvidenceVerificationWorkbench";

interface VerificationDashboardProps {
  onNavigateToModule?: (module: "workbench" | "duplicates" | "spatiotemporal" | "approvals" | "audit") => void;
}

export const VerificationDashboard: React.FC<VerificationDashboardProps> = ({
  onNavigateToModule,
}) => {
  const [metrics, setMetrics] = useState<VerificationDashboardMetrics>(() =>
    verificationDashboardService.getDashboardMetricsSync()
  );
  const [claims, setClaims] = useState<PipelineClaimItem[]>(() =>
    verificationDashboardService.getPipelineClaimsSync()
  );
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "workbench">("dashboard");

  const refreshData = () => {
    setMetrics(verificationDashboardService.getDashboardMetricsSync());
    setClaims(verificationDashboardService.getPipelineClaimsSync());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = verificationDashboardService.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const handleSimulatePipeline = async () => {
    setIsSimulating(true);
    try {
      const result = await verificationDashboardService.simulateEndToEndPipeline();
      setSimulationToast(
        `Pipeline Simulation Passed: Claim ${result.claimId} successfully traversed Ingestion → AI Screening (${result.stage2ScreeningResult.score}%) → Dual-Control Review → Certified (${result.stage4Certification.serial})`
      );
      refreshData();
      setTimeout(() => setSimulationToast(null), 8000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((item) => {
      if (stageFilter !== "all" && item.currentStage !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.id.toLowerCase().includes(q) ||
          item.treeId.toLowerCase().includes(q) ||
          item.species.toLowerCase().includes(q) ||
          item.planterName.toLowerCase().includes(q) ||
          item.projectId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [claims, stageFilter, searchQuery]);

  const getDecisionBadge = (decision?: string, status?: string) => {
    if (decision === "approved_certified" || status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Certified Approved
        </span>
      );
    }
    if (decision === "rejected" || status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <XCircle className="w-3 h-3 text-rose-400" /> Rejected (Fraud/Anomaly)
        </span>
      );
    }
    if (decision === "re_audit_assigned" || status === "re_audit_requested") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <RotateCcw className="w-3 h-3 text-amber-400" /> Re-Audit Assigned
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <Clock className="w-3 h-3 text-blue-400" /> Needs Review
      </span>
    );
  };

  if (activeView === "workbench") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400">Integrated Verification Workbench Active</span>
          <button
            onClick={() => setActiveView("dashboard")}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
          >
            ← Back to Main Verification Dashboard
          </button>
        </div>
        <EvidenceVerificationWorkbench />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="verification-dashboard">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 text-white shadow-2xl border border-emerald-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phase 8 • Task 45 — Verification Dashboard
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              MRV Pipeline Command Center
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verification Pipeline & Trust Command Center
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Orchestrates multi-stage evidence lifecycle: Submission → Automated AI/Heuristic Checks → Reviewer Four-Eyes Triage → Final Certified Decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulatePipeline}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isSimulating ? "animate-spin text-emerald-200" : ""}`} />
            {isSimulating ? "Simulating Pipeline..." : "Simulate End-to-End Pipeline"}
          </button>
          <button
            onClick={() => setActiveView("workbench")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition-colors border border-zinc-700"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            Open Full Workbench
          </button>
          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            title="Refresh Pipeline Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulation Success Toast */}
      {simulationToast && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/80 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simulationToast}</span>
          </div>
          <button
            onClick={() => setSimulationToast(null)}
            className="text-xs text-emerald-400 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zero Greenwashing & Probabilistic Disclaimer Callout */}
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex items-start gap-3.5 backdrop-blur-sm">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-xs uppercase tracking-wider text-amber-300">
            Zero-Greenwashing & Probabilistic Screening Principle
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            {ZERO_GREENWASHING_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* 4-Stage Pipeline Funnel Flow Visualizer */}
      <VerificationPipelineFunnel
        stages={metrics.pipelineStages}
        activeStageFilter={stageFilter}
        onSelectStage={setStageFilter}
      />

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
          <div className="text-xs text-zinc-400">Total Submissions</div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics.totalSubmissions}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Stage 1 Ingested</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
          <div className="text-xs text-purple-400">Screening Passed</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {metrics.automatedScreeningPassed}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Probabilistic AI High-Trust</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
          <div className="text-xs text-amber-400">Reviewer Queue</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {metrics.reviewerPendingCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Pending L1/L2/L3</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
          <div className="text-xs text-emerald-400">Certified Approved</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {metrics.finalApprovedCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Dual-Control Signed</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm">
          <div className="text-xs text-rose-400">Fraud / Flagged</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {metrics.finalRejectedCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Duplicate / Kinematic Breaches</div>
        </div>
      </div>

      {/* Probabilistic Screening Health Matrix (4 Pillars) */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-purple-400" />
          Probabilistic Screening Telemetry (Automated Heuristics)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Gemini Botanical AI</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metrics.probabilisticMetrics.botanicalVisionConfidenceAvg}%
              </div>
              <span className="text-[10px] text-emerald-400">Taxonomy Match</span>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">dHash Photo Deduplication</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metrics.probabilisticMetrics.perceptualDedupCollisionRate}%
              </div>
              <span className="text-[10px] text-rose-400">Collision Collision Risk</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Fingerprint className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Kinematics & Solar</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metrics.probabilisticMetrics.spatiotemporalPlausibilityRate}%
              </div>
              <span className="text-[10px] text-amber-400">Physical Plausibility</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Cadastral Geofence</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metrics.probabilisticMetrics.geofenceContainmentRate}%
              </div>
              <span className="text-[10px] text-emerald-400">Plot Boundary Match</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Stage Claim Pipeline Matrix Table */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pipeline Claims Live Stream ({filteredClaims.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search specimen, planter, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Specimen & Species</th>
                  <th className="py-3 px-4">Planter / Project</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Screening Heuristics</th>
                  <th className="py-3 px-4">Reviewer Triage</th>
                  <th className="py-3 px-4">Final Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No claims match the active stage or search query.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.treeId}</div>
                        <div className="text-[11px] text-zinc-400 italic">{item.species}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-zinc-200">{item.planterName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{item.projectId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {item.currentStage.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              item.probabilisticChecks.botanicalMatch.status === "pass"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                            title="Botanical AI Match"
                          >
                            AI: {item.probabilisticChecks.botanicalMatch.confidence}%
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              item.probabilisticChecks.photoDeduplication.status === "pass"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-rose-950 text-rose-300 border border-rose-800"
                            }`}
                            title="dHash Collision"
                          >
                            dHash: {item.probabilisticChecks.photoDeduplication.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-zinc-300">
                          {item.reviewerStage ? (
                            <span className="font-medium text-amber-400">
                              {item.reviewerStage.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Auto-Triage</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">{item.auditTrailCount} Audit Logs</div>
                      </td>
                      <td className="py-3 px-4">
                        {getDecisionBadge(item.decisionOutcome, item.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
