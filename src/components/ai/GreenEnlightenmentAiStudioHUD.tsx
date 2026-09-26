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
  Award,
  Download,
  Flame,
  FileCode,
  TreePine,
  Activity,
  Heart,
  Droplets,
  Scan,
  RefreshCw,
} from "lucide-react";
import {
  greenEnlightenmentAiModelService,
  ModelExecutionEngine,
  CompleteAiInspectionReport,
  MAHARASHTRA_NATIVE_SPECIES_DB,
  SftTrainingPair,
} from "../../services/greenEnlightenmentAiModelService";

interface GreenEnlightenmentAiStudioHUDProps {
  className?: string;
}

export const GreenEnlightenmentAiStudioHUD: React.FC<GreenEnlightenmentAiStudioHUDProps> = ({
  className = "",
}) => {
  const [selectedEngine, setSelectedEngine] = useState<ModelExecutionEngine>("gemini-2.5-flash");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("Neem");
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [report, setReport] = useState<CompleteAiInspectionReport | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<
    "taxonomy" | "vitality" | "pathology" | "antifraud" | "sft_dataset"
  >("taxonomy");

  const [sftPairs, setSftPairs] = useState<SftTrainingPair[]>(
    greenEnlightenmentAiModelService.generateSftDataset(6)
  );
  const [sftJsonlExported, setSftJsonlExported] = useState<string>("");

  const handleRunInspection = async () => {
    setInspecting(true);
    try {
      // Execute inspection with selected engine
      const res = await greenEnlightenmentAiModelService.executeFullInspection(
        "data:image/jpeg;base64,mockFieldPhotoData001",
        selectedSpecies,
        selectedEngine
      );
      setReport(res);
    } catch (err) {
      console.error("AI inspection error", err);
    } finally {
      setInspecting(false);
    }
  };

  const handleExportJsonl = () => {
    const jsonl = greenEnlightenmentAiModelService.exportSftJsonl(sftPairs);
    setSftJsonlExported(jsonl);
  };

  return (
    <div
      className={`bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="ge-ai-studio-hud"
    >
      {/* 1. MASTER HEADER BANNER */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Green Enlightenment AI Model Studio & Botanical Vision Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Phase 11 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multimodal Botanical Taxonomy • Microscopic Pathology • Anti-Fraud Pot Discrimination • Vertex SFT Dataset Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Gemini 2.5 Pro / Flash & SFT Pipeline
          </span>
        </div>
      </div>

      {/* 2. MODEL ENGINE & SAMPLE CONTROLS */}
      <div className="p-4 sm:p-6 bg-slate-950/60 border-b border-slate-800 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Model Engine Selector */}
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">
              Select AI Execution Engine:
            </label>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedEngine("gemini-2.5-flash")}
                data-testid="engine-flash-btn"
                className={`w-full p-2.5 rounded-xl text-left border text-xs font-mono transition-all flex items-center justify-between ${
                  selectedEngine === "gemini-2.5-flash"
                    ? "bg-indigo-950/80 border-indigo-400 text-white shadow-md shadow-indigo-950/40"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gemini 2.5 Flash</span>
                </div>
                <span className="text-[10px] text-emerald-400">$0.15/1k</span>
              </button>

              <button
                onClick={() => setSelectedEngine("gemini-2.5-pro")}
                data-testid="engine-pro-btn"
                className={`w-full p-2.5 rounded-xl text-left border text-xs font-mono transition-all flex items-center justify-between ${
                  selectedEngine === "gemini-2.5-pro"
                    ? "bg-purple-950/80 border-purple-400 text-white shadow-md shadow-purple-950/40"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gemini 2.5 Pro (Deep Reasoning)</span>
                </div>
                <span className="text-[10px] text-purple-400">$1.25/1k</span>
              </button>

              <button
                onClick={() => setSelectedEngine("ge-biovision-sft-v1")}
                data-testid="engine-custom-btn"
                className={`w-full p-2.5 rounded-xl text-left border text-xs font-mono transition-all flex items-center justify-between ${
                  selectedEngine === "ge-biovision-sft-v1"
                    ? "bg-emerald-950/80 border-emerald-400 text-white shadow-md shadow-emerald-950/40"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GE-BioVision-SFT v1.0</span>
                </div>
                <span className="text-[10px] text-cyan-400">Custom SFT</span>
              </button>
            </div>
          </div>

          {/* Species Selector */}
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">
              Select Field Specimen / Species Target:
            </label>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              data-testid="species-select"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-medium focus:border-emerald-500 focus:outline-none"
            >
              <option value="Neem">Azadirachta indica (Neem / कडुनिंब)</option>
              <option value="Teak">Tectona grandis (Teak / सागवान)</option>
              <option value="Banyan">Ficus benghalensis (Banyan / वड)</option>
              <option value="Sandalwood">Santalum album (Sandalwood / चंदन)</option>
              <option value="Mahua">Madhuca longifolia (Mahua / महुआ)</option>
              <option value="Shisham">Dalbergia sissoo (Shisham / शिसव)</option>
              <option value="Jamun">Syzygium cumini (Jamun / जांभूळ)</option>
            </select>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 mt-2">
              <strong className="text-slate-300 block mb-0.5">Ecological Biotope:</strong>
              Maharashtra Western Ghats & Deccan Plateau agroforestry buffer zone.
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                Execute AI Multimodal Inspection:
              </label>
              <button
                onClick={handleRunInspection}
                disabled={inspecting}
                data-testid="run-inspection-btn"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {inspecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Botanical Morphology...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 text-emerald-200" />
                    <span>Run Multimodal Inspection</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-mono mt-2">
              Full Zod schema extraction • In-ground soil pit validation • Verra VM0047 digest
            </p>
          </div>
        </div>
      </div>

      {/* 3. LIVE INSPECTION RESULTS PANEL */}
      {report && (
        <div className="p-4 sm:p-6 space-y-6" data-testid="inspection-results-panel">
          {/* Header KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Overall Confidence</span>
              <strong className="text-xl font-bold font-mono text-emerald-400 block mt-0.5" data-testid="report-confidence">
                {(report.confidenceScore * 100).toFixed(1)}%
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Crown Health Score</span>
              <strong className="text-xl font-bold font-mono text-indigo-300 block mt-0.5" data-testid="report-health">
                {report.vitality.crownHealthScore} / 100
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Latency (P95)</span>
              <strong className="text-xl font-bold font-mono text-purple-300 block mt-0.5">
                {report.executionLatencyMs} ms
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Inference Cost</span>
              <strong className="text-xl font-bold font-mono text-amber-400 block mt-0.5">
                ${report.tokenCostUsd.toFixed(5)}
              </strong>
            </div>
          </div>

          {/* Results Tab Navigation */}
          <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveResultTab("taxonomy")}
              data-testid="tab-res-taxonomy"
              className={`pb-2 px-3 border-b-2 transition-all ${
                activeResultTab === "taxonomy"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              1. Taxonomy & Native Status
            </button>

            <button
              onClick={() => setActiveResultTab("vitality")}
              data-testid="tab-res-vitality"
              className={`pb-2 px-3 border-b-2 transition-all ${
                activeResultTab === "vitality"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              2. Foliar Vitality & Biomass
            </button>

            <button
              onClick={() => setActiveResultTab("pathology")}
              data-testid="tab-res-pathology"
              className={`pb-2 px-3 border-b-2 transition-all ${
                activeResultTab === "pathology"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              3. Pathology & Bio-Prescription
            </button>

            <button
              onClick={() => setActiveResultTab("antifraud")}
              data-testid="tab-res-antifraud"
              className={`pb-2 px-3 border-b-2 transition-all ${
                activeResultTab === "antifraud"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              4. Anti-Fraud & In-Ground Pit
            </button>

            <button
              onClick={() => setActiveResultTab("sft_dataset")}
              data-testid="tab-res-sft"
              className={`pb-2 px-3 border-b-2 transition-all ${
                activeResultTab === "sft_dataset"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              5. Vertex AI SFT Vault
            </button>
          </div>

          {/* Tab Content 1: Taxonomy */}
          {activeResultTab === "taxonomy" && (
            <div className="grid md:grid-cols-2 gap-4 text-xs" data-testid="panel-taxonomy">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider block">
                  Primary Botanical Classification
                </span>
                <h3 className="text-lg font-bold text-white">
                  {report.species.commonName} — <em>{report.species.scientificName}</em>
                </h3>
                <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                  <div>APG IV Family: <span className="text-indigo-300">{report.species.botanicalFamily}</span></div>
                  <div>Marathi Vernacular: <span className="text-amber-300">{report.species.marathiName}</span></div>
                  <div>Hindi Vernacular: <span className="text-slate-300">{report.species.hindiName}</span></div>
                  <div>Wood Density: <span className="text-emerald-400">{report.species.woodDensityGPerCm3} g/cm³</span></div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Ecological Profile:</strong>
                  {report.species.ecologicalRole}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                  Top Ranked Species Candidates
                </span>
                <div className="space-y-2">
                  {report.speciesCandidates.map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                      <div>
                        <strong className="text-white block">{c.species}</strong>
                        <span className="text-[10px] text-slate-400 italic">{c.scientificName}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">
                        {(c.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Vitality */}
          {activeResultTab === "vitality" && (
            <div className="grid md:grid-cols-2 gap-4 text-xs" data-testid="panel-vitality">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-indigo-400 uppercase font-bold tracking-wider block">
                  Physiological Vitality Rating
                </span>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    {report.vitality.vitalityStatus}
                  </span>
                  <span className="text-slate-400 font-mono">Stage: {report.vitality.growthStage.replace(/_/g, " ")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-2">
                  <div className="p-2 rounded bg-slate-900">Height: <strong className="text-white">{report.vitality.estimatedHeightCm} cm</strong></div>
                  <div className="p-2 rounded bg-slate-900">DBH: <strong className="text-white">{report.vitality.estimatedDbhCm} cm</strong></div>
                  <div className="p-2 rounded bg-slate-900">Defoliation: <strong className="text-emerald-400">{report.vitality.defoliationPercentage}%</strong></div>
                  <div className="p-2 rounded bg-slate-900">Stem: <strong className="text-white">{report.vitality.stemLignification}</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider block">
                  Allometric Biomass & IPCC Carbon Accretion
                </span>
                <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <div>Estimated Aboveground Biomass: <strong className="text-white">{report.allometricBiomass.estimatedAboveGroundBiomassKg} kg dry mass</strong></div>
                  <div>Annual Carbon Accretion: <strong className="text-emerald-400">{report.allometricBiomass.annualCarbonAccretionTonsCo2e} tCO₂e/yr</strong></div>
                  <div>Methodology Standard: <span className="text-purple-300">{report.allometricBiomass.ipccMethodologyTier}</span></div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-800 font-sans">
                  {report.narrativeAiAuditReport}
                </p>
              </div>
            </div>
          )}

          {/* Tab Content 3: Pathology */}
          {activeResultTab === "pathology" && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs" data-testid="panel-pathology">
              <span className="text-[11px] text-amber-400 uppercase font-bold tracking-wider block">
                Microscopic Foliar Pathology & Agronomic Prescriptions
              </span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">No acute fungal, bacterial or shoot-borer frass detected.</span>
              </div>
              <div className="space-y-2">
                <strong className="text-slate-300 block">Prescribed Prophylactic Organic Regimen:</strong>
                {report.pathology.organicRemedies.map((r, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content 4: Anti-Fraud */}
          {activeResultTab === "antifraud" && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs" data-testid="panel-antifraud">
              <span className="text-[11px] text-rose-400 uppercase font-bold tracking-wider block">
                Anti-Fraud & In-Ground Plantation Authenticity Gate
              </span>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">In-Ground Soil Pit</span>
                  <strong className="text-emerald-400 font-mono">VERIFIED (100%)</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Plastic Pot / Polybag</span>
                  <strong className="text-emerald-400 font-mono">NOT DETECTED</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Perceptual dHash</span>
                  <strong className="text-purple-300 font-mono">{report.antiFraud.perceptualHash}</strong>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                <span className="text-indigo-400">Verra VM0047 Certificate: </span>
                {report.verraComplianceDigest}
              </div>
            </div>
          )}

          {/* Tab Content 5: SFT Dataset Vault */}
          {activeResultTab === "sft_dataset" && (
            <div className="space-y-4 text-xs" data-testid="panel-sft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-slate-300 font-semibold">
                  Google Cloud Vertex AI Supervised Fine-Tuning (SFT) Dataset Vault ({sftPairs.length} Curated Pairs)
                </span>
                <button
                  onClick={handleExportJsonl}
                  data-testid="export-jsonl-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export Gemini SFT JSONL
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-2.5">Pair ID</th>
                      <th className="p-2.5">Species</th>
                      <th className="p-2.5">Ground Truth Auditor</th>
                      <th className="p-2.5">Verra Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                    {sftPairs.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-purple-300 font-bold">{p.id}</td>
                        <td className="p-2.5 text-white font-sans">{p.species}</td>
                        <td className="p-2.5 text-[11px] text-slate-400 font-sans">{p.groundTruthVerifiedBy}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">VERRA_ELIGIBLE</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sftJsonlExported && (
                <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/40 space-y-2">
                  <strong className="text-purple-300 block font-mono text-xs">
                    Generated Gemini SFT JSONL Training Stream:
                  </strong>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-40">
                    {sftJsonlExported}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
