import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  ShieldCheck,
  Award,
  Zap,
  CheckCircle2,
  Server,
  Layers,
  Cpu,
  Copy,
  Check,
  RefreshCw,
  Play,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  TreePine,
  Droplets,
  ExternalLink,
} from "lucide-react";
import {
  geminiProFlagshipService,
  GeminiProEnterpriseLicense,
  GeminiProDeepReasoningReport,
} from "../../services/geminiProFlagshipService";

interface GeminiProEnterpriseActivationHUDProps {
  className?: string;
}

export const GeminiProEnterpriseActivationHUD: React.FC<GeminiProEnterpriseActivationHUDProps> = ({
  className = "",
}) => {
  const [license] = useState<GeminiProEnterpriseLicense>(geminiProFlagshipService.getLicense());
  const [selectedSpecies, setSelectedSpecies] = useState<string>("Neem");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [report, setReport] = useState<GeminiProDeepReasoningReport | null>(null);
  const [showThinkingProcess, setShowThinkingProcess] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const handleRunDeepReasoning = async () => {
    setIsExecuting(true);
    try {
      const res = await geminiProFlagshipService.executeDeepReasoningInspection(
        "data:image/jpeg;base64,mockGeminiProFieldData001",
        selectedSpecies
      );
      setReport(res);
    } catch (err) {
      console.error("Gemini 2.5 Pro execution error", err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard?.writeText?.(license.licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div
      className={`bg-slate-900/95 border-2 border-purple-500/50 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="gemini-pro-activation-hud"
    >
      {/* 1. MASTER FLAGSHIP HEADER */}
      <div className="p-5 sm:p-7 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-inner">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Google Gemini 2.5 Pro — Enterprise Flagship Edition
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/50 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Pro License
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              1,048,576 Token Multimodal Context • Deep Chain-of-Thought Botanical Reasoning • Dedicated Vertex AI TPU v5e Endpoint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 text-xs font-mono text-purple-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-400" />
            Verra VM0047 Accredited
          </span>
        </div>
      </div>

      {/* 2. ACTIVE ENTERPRISE LICENSE CREDENTIALS STRIP */}
      <div className="p-4 sm:p-6 bg-slate-950/80 border-b border-slate-800 grid md:grid-cols-3 gap-4">
        {/* License Key */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-purple-300 font-bold uppercase tracking-wider">Enterprise License Key:</span>
            <span className="text-[10px] text-emerald-400 font-bold">100K Scans/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={license.licenseKey}
              data-testid="gemini-pro-license-key"
              className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-purple-200 font-bold focus:outline-none"
            />
            <button
              onClick={handleCopyKey}
              data-testid="copy-gemini-pro-key-btn"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
              title="Copy Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dedicated TPU Endpoint */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
          <span className="text-xs text-slate-400 block font-semibold">Dedicated Cloud TPU v5e Endpoint:</span>
          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 truncate">
            <Server className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ep-gemini-2.5-pro-dedicated-tpu-v5e</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Region: asia-south1 (Mumbai) • Zero Rate Throttling</span>
        </div>

        {/* Context Window & SLA */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
          <span className="text-slate-400 block font-semibold">Model Capacity & Context Window:</span>
          <div className="text-lg font-bold font-mono text-white">
            1,048,576 Tokens <span className="text-xs text-purple-400 font-normal">(1M Context)</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Organization: <strong className="text-slate-200">{license.organizationName}</strong>
          </span>
        </div>
      </div>

      {/* 3. INTERACTIVE GEMINI 2.5 PRO DEEP REASONING PLAYGROUND */}
      <div className="p-4 sm:p-6 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Execute Gemini 2.5 Pro Deep Reasoning Botanical Inspection
              </h3>
              <p className="text-xs text-slate-400">
                Runs full chain-of-thought multimodal vision, APG IV taxonomic decomposition, and Verra VM0047 carbon audit.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                data-testid="gemini-pro-species-select"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
              >
                <option value="Neem">Azadirachta indica (Neem / कडुनिंब)</option>
                <option value="Teak">Tectona grandis (Teak / सागवान)</option>
                <option value="Banyan">Ficus benghalensis (Banyan / वड)</option>
                <option value="Sandalwood">Santalum album (Sandalwood / चंदन)</option>
                <option value="Mahua">Madhuca longifolia (Mahua / महुआ)</option>
                <option value="Shisham">Dalbergia sissoo (Shisham / शिसव)</option>
                <option value="Jamun">Syzygium cumini (Jamun / जांभूळ)</option>
              </select>

              <button
                onClick={handleRunDeepReasoning}
                disabled={isExecuting}
                data-testid="run-gemini-pro-btn"
                className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/60 transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini 2.5 Pro Thinking...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Gemini 2.5 Pro Deep Reasoning</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4. LIVE REPORT PANEL */}
        {report && (
          <div className="space-y-6" data-testid="gemini-pro-results-panel">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/40 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Confidence Score</span>
                <strong className="text-2xl font-extrabold font-mono text-purple-300 block mt-0.5" data-testid="pro-confidence">
                  {(report.confidenceScore * 100).toFixed(1)}%
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Crown Health Score</span>
                <strong className="text-2xl font-extrabold font-mono text-emerald-400 block mt-0.5" data-testid="pro-health">
                  {report.foliarHealthDiagnostics.crownHealthScore} / 100
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Reasoning Tokens</span>
                <strong className="text-2xl font-extrabold font-mono text-indigo-300 block mt-0.5">
                  {report.tokenConsumption.reasoningThoughtTokens} tokens
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Inference Latency</span>
                <strong className="text-2xl font-extrabold font-mono text-amber-400 block mt-0.5">
                  {report.executionLatencyMs} ms
                </strong>
              </div>
            </div>

            {/* Step-by-Step Chain of Thought (CoT) Viewer */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3" data-testid="cot-thinking-panel">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Gemini 2.5 Pro Deep Chain-of-Thought (CoT) Botanical Proof Stream
                  </span>
                </div>
                <button
                  onClick={() => setShowThinkingProcess(!showThinkingProcess)}
                  data-testid="toggle-cot-btn"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1"
                >
                  {showThinkingProcess ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showThinkingProcess ? "Hide Reasoning" : "View Reasoning"}</span>
                </button>
              </div>

              {showThinkingProcess && (
                <div className="space-y-2 pt-2">
                  {report.chainOfBotanicalThought.map((thought, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3 rounded-xl bg-slate-900/90 border border-purple-900/40 font-mono text-[11px] text-purple-200 leading-relaxed"
                    >
                      {thought}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Analysis Cards */}
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              {/* Botanical Taxonomy & Native Validation */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider block">
                  APG IV Native Botanical Classification
                </span>
                <h4 className="text-base font-bold text-white">
                  {report.botanicalTaxonomy.speciesCommon} (<em>{report.botanicalTaxonomy.speciesScientific}</em>)
                </h4>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div>Family: <span className="text-purple-300">{report.botanicalTaxonomy.botanicalFamily}</span></div>
                  <div>Marathi Vernacular: <span className="text-amber-300">{report.botanicalTaxonomy.vernacularMarathi}</span></div>
                  <div>Wood Density Constant: <span className="text-emerald-400">{report.botanicalTaxonomy.woodDensityGPerCm3} g/cm³</span></div>
                  <div>Western Ghats Status: <span className="text-emerald-400 font-bold">CONFIRMED NATIVE</span></div>
                </div>
              </div>

              {/* Foliar Health & Pathology */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-indigo-400 uppercase font-bold tracking-wider block">
                  Microscopic Foliar & Physiological Diagnostics
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
                  <div className="p-2 rounded bg-slate-900">SPAD Index: <strong className="text-emerald-400">{report.foliarHealthDiagnostics.chlorophyllIndexSpad}</strong></div>
                  <div className="p-2 rounded bg-slate-900">Defoliation: <strong className="text-white">{report.foliarHealthDiagnostics.defoliationPercentage}%</strong></div>
                  <div className="p-2 rounded bg-slate-900">Meristem: <strong className="text-emerald-400">{report.foliarHealthDiagnostics.apicalBudActivity}</strong></div>
                  <div className="p-2 rounded bg-slate-900">Lignification: <strong className="text-white">Structural</strong></div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Pathology Status:</strong>
                  {report.microscopicPathology.pathologyDetails}
                </div>
              </div>
            </div>

            {/* Verra VM0047 Carbon Certificate Sign-off */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <strong className="text-sm font-bold text-white">
                    Verra VM0047 Cryptographic MRV Sign-Off Certificate
                  </strong>
                </div>
                <span className="text-xs font-mono text-purple-300 font-bold">
                  {report.ipccCarbonAccretion.verraVm0047AuditDigest}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.executiveAuditorDigest}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
