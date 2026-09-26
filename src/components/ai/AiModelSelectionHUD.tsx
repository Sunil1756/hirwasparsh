import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Zap,
  Clock,
  DollarSign,
  ShieldCheck,
  Scale,
  Wifi,
  WifiOff,
  Server,
  ArrowRight,
  Database,
  Sliders,
} from "lucide-react";
import {
  aiModelSelectionService,
  DomainModelSelectionPackage,
} from "../../services/aiModelSelectionService";
import { AiApplicationDomain } from "../../services/aiRequirementsService";

interface AiModelSelectionHUDProps {
  className?: string;
}

export const AiModelSelectionHUD: React.FC<AiModelSelectionHUDProps> = ({ className = "" }) => {
  const matrix = aiModelSelectionService.getModelSelectionMatrix();
  const summary = aiModelSelectionService.getArchitecturalDecisionSummary();

  const [activeTab, setActiveTab] = useState<AiApplicationDomain>("species_assistance");
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);

  const activePackage: DomainModelSelectionPackage = matrix[activeTab];
  const routingPlan = aiModelSelectionService.routeInference(activeTab, isOfflineSimulated);

  return (
    <div
      className={`bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="ai-model-selection-hud"
    >
      {/* 1. MASTER HEADER */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                AI Model & Service Selection Architecture
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Task 62 Validated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Foundational Models vs Custom Training Evaluation • Edge Deterministic Offloading • Cost Optimization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Save ~${summary.totalEstimatedAnnualSavingsUsd.toLocaleString()}/yr vs Custom MLOps
          </span>
        </div>
      </div>

      {/* 2. CUSTOM TRAINING DECISION GATE SUMMARY CALLOUT */}
      <div
        className="p-4 bg-indigo-950/30 border-b border-indigo-500/30 flex items-start gap-3 text-xs text-indigo-200"
        data-testid="custom-training-gate-banner"
      >
        <Scale className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block text-sm font-semibold">
            Custom Training Decision Gate Assessment:
          </strong>
          <p className="leading-relaxed opacity-90">
            {summary.customTrainingGateConclusion}
          </p>
        </div>
      </div>

      {/* 3. DOMAIN NAVIGATION TABS */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("species_assistance")}
            data-testid="tab-species-selection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "species_assistance"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            1. Species Assistance
          </button>

          <button
            onClick={() => setActiveTab("tree_condition_classification")}
            data-testid="tab-condition-selection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "tree_condition_classification"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            2. Tree Condition
          </button>

          <button
            onClick={() => setActiveTab("image_quality_checks")}
            data-testid="tab-quality-selection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "image_quality_checks"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            3. Image Quality
          </button>

          <button
            onClick={() => setActiveTab("duplicate_image_detection")}
            data-testid="tab-duplicate-selection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "duplicate_image_detection"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            4. Duplicate & Fraud
          </button>

          <button
            onClick={() => setActiveTab("anomaly_detection")}
            data-testid="tab-anomaly-selection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "anomaly_detection"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            5. Anomaly Detection
          </button>
        </div>
      </div>

      {/* 4. DOMAIN SPECIFIC SELECTION CARD */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Domain Rationale Banner */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{activePackage.domainTitle}</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  activePackage.customTrainingRecommendation === "not_justified" ||
                  activePackage.customTrainingRecommendation === "unnecessary_deterministic"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-950 text-amber-300 border border-amber-500/40"
                }`}
              >
                Custom Training: {activePackage.customTrainingRecommendation.replace(/_/g, " ")}
              </span>
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {activePackage.customTrainingRationale}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-mono">Cost Efficiency</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {activePackage.totalCostReductionFactor}
            </span>
          </div>
        </div>

        {/* Selected Model Comparison Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Model */}
          <div
            className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 space-y-4 relative"
            data-testid="card-primary-model"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
              Recommended Primary
            </div>

            <div>
              <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider block">
                Primary Selection
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                {activePackage.primarySelection.modelName}
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Provider: {activePackage.primarySelection.provider}
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {activePackage.primarySelection.primaryUseCase}
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Latency P95</span>
                <strong className="text-indigo-300">{activePackage.primarySelection.latencyP95Ms} ms</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Cost / 1k</span>
                <strong className="text-emerald-400">${activePackage.primarySelection.costPer1kCallsUsd.toFixed(2)}</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <strong className="text-cyan-400">{activePackage.primarySelection.accuracyBenchmarkPct}%</strong>
              </div>
            </div>

            {/* Strengths */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase">Key Strengths:</span>
              {activePackage.primarySelection.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Fallback / Edge Model */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4" data-testid="card-secondary-model">
            <div>
              <span className="text-[11px] text-purple-400 uppercase font-bold tracking-wider block">
                Secondary / Edge Fallback
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                {activePackage.secondaryFallback.modelName}
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Provider: {activePackage.secondaryFallback.provider}
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {activePackage.secondaryFallback.primaryUseCase}
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Latency P95</span>
                <strong className="text-indigo-300">{activePackage.secondaryFallback.latencyP95Ms} ms</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Cost / 1k</span>
                <strong className="text-emerald-400">${activePackage.secondaryFallback.costPer1kCallsUsd.toFixed(2)}</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <strong className="text-cyan-400">{activePackage.secondaryFallback.accuracyBenchmarkPct}%</strong>
              </div>
            </div>

            {/* Strengths */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase">Fallback Capabilities:</span>
              {activePackage.secondaryFallback.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Training Decision Gates Rubric */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" data-testid="decision-gates-rubric">
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            Decision Gate Evaluation (Custom Training Justification Rubric)
          </span>

          <div className="space-y-2 text-xs">
            {activePackage.decisionGates.map((dg, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-200">{dg.question}</strong>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dg.favorsCustomTraining
                        ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {dg.favorsCustomTraining ? "Favors Custom Training" : "Favors Existing Model/API"}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{dg.currentAssessment}</p>
                <p className="text-indigo-300 text-[11px] font-mono">
                  <strong>Conclusion: </strong>
                  {dg.justification}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE LIVE INFERENCE ROUTING SIMULATOR */}
      <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/80 space-y-4" data-testid="routing-simulator">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Live Inference Routing Simulator</h4>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOfflineSimulated(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !isOfflineSimulated
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" /> Online (Cellular 4G/5G)
            </button>
            <button
              onClick={() => setIsOfflineSimulated(true)}
              data-testid="toggle-offline-btn"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isOfflineSimulated
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" /> Offline Remote Forest
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block">Routed Model</span>
            <strong className="text-white text-xs block truncate" title={routingPlan.selectedModel}>
              {routingPlan.selectedModel}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Execution Path</span>
            <span className="text-emerald-400 uppercase font-bold">{routingPlan.executionPath.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Estimated Latency</span>
            <span className="text-indigo-300">{routingPlan.estimatedLatencyMs} ms</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Cost / Query</span>
            <span className="text-amber-400">${routingPlan.estimatedCostUsd.toFixed(5)}</span>
          </div>
        </div>
      </div>

      {/* 6. FOOTER COMPLIANCE LINK */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Carbon MRV Auditing Standard:</span>
          <span className="font-mono text-slate-200">{summary.complianceStatus}</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Zero Hallucination Tolerance • Edge-First Architecture
        </span>
      </div>
    </div>
  );
};
