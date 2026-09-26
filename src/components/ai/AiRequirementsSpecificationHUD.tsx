import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Camera,
  Copy,
  Activity,
  ShieldCheck,
  Scale,
  Zap,
  Clock,
  Cpu,
  RefreshCw,
  Eye,
  Sliders,
} from "lucide-react";
import {
  aiRequirementsService,
  AiApplicationDomain,
  AiProblemRequirement,
  ImageQualityEvaluationResult,
  DuplicateDetectionResult,
} from "../../services/aiRequirementsService";

interface AiRequirementsSpecificationHUDProps {
  className?: string;
}

export const AiRequirementsSpecificationHUD: React.FC<AiRequirementsSpecificationHUDProps> = ({
  className = "",
}) => {
  const requirements = aiRequirementsService.getRequirementsSpecification();
  const [activeTab, setActiveTab] = useState<AiApplicationDomain>("species_assistance");

  // Quality Simulation State
  const [blurVal, setBlurVal] = useState<number>(145);
  const [luminanceVal, setLuminanceVal] = useState<number>(128);
  const [glareVal, setGlareVal] = useState<number>(0.03);
  const [isScreenVal, setIsScreenVal] = useState<boolean>(false);

  // Duplicate Simulation State
  const [dhashSampleA, setDhashSampleA] = useState<string>("8f3c4e2a1b9d0e7f");
  const [dhashSampleB, setDhashSampleB] = useState<string>("8f3c4e2a1b9d0e7e"); // 1 bit diff
  const [gpsDistMeters, setGpsDistMeters] = useState<number>(450);

  const selectedReq: AiProblemRequirement = requirements[activeTab];

  // Live image quality calculation
  const qualityResult: ImageQualityEvaluationResult = aiRequirementsService.evaluateImageQuality({
    width: 1920,
    height: 1080,
    meanLuminance: luminanceVal,
    laplacianVariance: blurVal,
    glarePixelPct: glareVal,
    isScreenDetected: isScreenVal,
  });

  // Live duplicate calculation
  const duplicateResult: DuplicateDetectionResult = aiRequirementsService.evaluateDuplicateCollision(
    dhashSampleA,
    dhashSampleB,
    { lat: 18.5204, lng: 73.8567 },
    { lat: 18.5204 + (gpsDistMeters / 111000), lng: 73.8567 }
  );

  return (
    <div
      className={`bg-slate-900/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="ai-requirements-specification-hud"
    >
      {/* 1. MASTER HEADER BANNER */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-inner">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                AI Forestry Intelligence Requirements & Problem Formulation
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Task 61 Validated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mathematical Criteria • Confidence Routing • Failure Mode Mitigations • Verra VM0047 Integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-purple-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            5 Production AI Domains
          </span>
        </div>
      </div>

      {/* 2. FIVE APPLICATION DOMAIN TABS */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("species_assistance")}
            data-testid="tab-species-assistance"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "species_assistance"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            1. Species Assistance
          </button>

          <button
            onClick={() => setActiveTab("tree_condition_classification")}
            data-testid="tab-tree-condition"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "tree_condition_classification"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            2. Tree Condition & Vitality
          </button>

          <button
            onClick={() => setActiveTab("image_quality_checks")}
            data-testid="tab-image-quality"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "image_quality_checks"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            3. Image Quality Pre-Gate
          </button>

          <button
            onClick={() => setActiveTab("duplicate_image_detection")}
            data-testid="tab-duplicate-detection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "duplicate_image_detection"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <Copy className="w-4 h-4 text-rose-400" />
            4. Duplicate & Fraud Detection
          </button>

          <button
            onClick={() => setActiveTab("anomaly_detection")}
            data-testid="tab-anomaly-detection"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "anomaly_detection"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            5. Anomaly & Threat Detection
          </button>
        </div>
      </div>

      {/* 3. PROBLEM DEFINITION HERO STRIP */}
      <div className="p-4 sm:p-6 bg-slate-950/40 border-b border-slate-800 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                {selectedReq.id}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {selectedReq.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {selectedReq.shortDefinition}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target:</span>
              <strong className="text-white uppercase">{selectedReq.inferenceTarget}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Latency SLA:</span>
              <strong className="text-emerald-400">{selectedReq.targetLatencyMs} ms</strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
          <strong className="text-white font-semibold block mb-0.5">Operational Objective:</strong>
          {selectedReq.operationalObjective}
        </div>
      </div>

      {/* 4. SPECIFICATION DETAILS GRID */}
      <div className="p-4 sm:p-6 grid lg:grid-cols-2 gap-6">
        {/* Left Column: Mathematical Formulation & Inputs/Outputs */}
        <div className="space-y-6">
          {/* Mathematical Formulation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" data-testid="section-math">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              Rigorous Mathematical Formulation
            </span>
            <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/20 font-mono text-xs text-purple-300 overflow-x-auto">
              <code>{selectedReq.mathematicalFormulation.formulaLatex}</code>
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-slate-400 text-[11px] uppercase tracking-wider block">
                Variable Definitions:
              </strong>
              {Object.entries(selectedReq.mathematicalFormulation.variableDefinitions).map(([sym, def]) => (
                <div key={sym} className="flex gap-2 text-slate-300 text-xs font-mono">
                  <span className="text-purple-400 font-bold">{sym}:</span>
                  <span className="font-sans text-slate-400">{def}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-300 pt-2 border-t border-slate-800">
              <strong className="text-emerald-400 block mb-0.5 font-mono">Decision Threshold:</strong>
              {selectedReq.mathematicalFormulation.decisionThreshold}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Ref: {selectedReq.mathematicalFormulation.scientificReference}
            </div>
          </div>

          {/* Input Modalities & Expected Output Schema */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Input Modalities
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                {selectedReq.inputModalities.map((m, i) => (
                  <li key={i} className="text-slate-300">{m}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Output Schema
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                {Object.entries(selectedReq.outputSchema).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-800/60 pb-0.5">
                    <span className="text-purple-300">{k}:</span>
                    <span className="text-slate-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3-Tier Confidence Routing & Failure Mode Mitigations */}
        <div className="space-y-6">
          {/* Confidence Routing Tiers */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" data-testid="section-confidence">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              3-Tier Confidence Routing Pipeline
            </span>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <strong className="text-emerald-300">Tier 1: High Confidence (Auto-Approve)</strong>
                    <span className="text-emerald-400">≥ {(selectedReq.confidenceTiers.high.minConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {selectedReq.confidenceTiers.high.action}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <strong className="text-amber-300">Tier 2: Medium Confidence (Human Review)</strong>
                    <span className="text-amber-400">
                      {(selectedReq.confidenceTiers.medium.minConfidence * 100).toFixed(0)}% – {(selectedReq.confidenceTiers.medium.maxConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {selectedReq.confidenceTiers.medium.action}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <strong className="text-rose-300">Tier 3: Low Confidence (Reject & Retry)</strong>
                    <span className="text-rose-400">&lt; {(selectedReq.confidenceTiers.low.maxConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {selectedReq.confidenceTiers.low.action}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Failure Modes and Mitigations */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" data-testid="section-failures">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Known Failure Modes & Anti-Fraud Mitigations
            </span>

            <div className="space-y-2 text-xs">
              {selectedReq.failureModesAndMitigations.map((fm, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{fm.failureMode}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        fm.riskSeverity === "critical"
                          ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                          : fm.riskSeverity === "high"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                          : "bg-blue-950 text-blue-300 border border-blue-500/40"
                      }`}
                    >
                      {fm.riskSeverity} Risk
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong className="text-purple-300 font-medium">Mitigation: </strong>
                    {fm.mitigationStrategy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE LIVE SIMULATION PLAYGROUND */}
      <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/70 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-bold text-white">
            Interactive AI Validation Simulator
          </h4>
          <span className="text-xs text-slate-400">(Test edge quality gate & anti-fraud collision heuristics)</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Simulator A: Image Quality Gate */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3" data-testid="sim-quality">
            <strong className="text-xs text-amber-300 block font-semibold flex items-center justify-between">
              <span>Image Quality Gate Simulator (Req 3)</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  qualityResult.passedQualityGate
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-950 text-rose-300 border border-rose-500/40"
                }`}
              >
                {qualityResult.passedQualityGate ? "QUALITY PASS" : "QUALITY REJECT"}
              </span>
            </strong>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 font-mono mb-1">
                  <span>Focus Blur (Laplacian Variance):</span>
                  <span className={blurVal >= 100 ? "text-emerald-400" : "text-rose-400"}>{blurVal} / 100</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={blurVal}
                  onChange={(e) => setBlurVal(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 font-mono mb-1">
                  <span>Mean Luminance (0-255):</span>
                  <span className={luminanceVal >= 40 && luminanceVal <= 220 ? "text-emerald-400" : "text-rose-400"}>
                    {luminanceVal} (Target: 40-220)
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="250"
                  value={luminanceVal}
                  onChange={(e) => setLuminanceVal(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isScreenVal}
                    onChange={(e) => setIsScreenVal(e.target.checked)}
                    className="accent-purple-500 rounded"
                  />
                  <span>Simulate Screen Re-photography</span>
                </label>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <strong className="text-purple-300 block mb-0.5">Viewfinder Guidance:</strong>
                {qualityResult.viewfinderGuidance.map((g, i) => (
                  <div key={i} className="text-slate-400">• {g}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulator B: Duplicate & Fraud Collision */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3" data-testid="sim-duplicate">
            <strong className="text-xs text-rose-300 block font-semibold flex items-center justify-between">
              <span>Duplicate & Geodetic Fraud Detector (Req 4)</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  duplicateResult.fraudRiskLevel === "critical_fraud" || duplicateResult.fraudRiskLevel === "high"
                    ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                    : duplicateResult.fraudRiskLevel === "medium"
                    ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {duplicateResult.fraudRiskLevel.toUpperCase()}
              </span>
            </strong>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 font-mono mb-1">
                  <span>Hamming Distance (dHash diff bits):</span>
                  <span className="text-purple-300">{duplicateResult.hammingDistance} bits ({duplicateResult.similarityPct}% match)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDhashSampleA("8f3c4e2a1b9d0e7f");
                      setDhashSampleB("8f3c4e2a1b9d0e7f"); // 0 bits diff
                    }}
                    className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                  >
                    Exact Match (0 bits)
                  </button>
                  <button
                    onClick={() => {
                      setDhashSampleA("8f3c4e2a1b9d0e7f");
                      setDhashSampleB("8f3c4e2a1b9d0e7e"); // 1 bit diff
                    }}
                    className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                  >
                    Cropped/Angle (1 bit)
                  </button>
                  <button
                    onClick={() => {
                      setDhashSampleA("8f3c4e2a1b9d0e7f");
                      setDhashSampleB("00000000ffffffff"); // 32 bits diff
                    }}
                    className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                  >
                    Different Tree (32 bits)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 font-mono mb-1">
                  <span>GPS Spatial Separation:</span>
                  <span className="text-amber-300">{gpsDistMeters} meters</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="25"
                  value={gpsDistMeters}
                  onChange={(e) => setGpsDistMeters(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <strong className="text-purple-300 block mb-0.5">Fraud Action Recommendation:</strong>
                <p className="text-slate-400">{duplicateResult.actionRecommendation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. VERRA / CARBON MRV COMPLIANCE FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Verra Methodology VM0047 AI Governance Link:</span>
          <span className="font-mono text-slate-200">{selectedReq.verraMrvComplianceRequirement}</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          ISO 14064-2 & Gold Standard Audited Architecture
        </span>
      </div>
    </div>
  );
};
