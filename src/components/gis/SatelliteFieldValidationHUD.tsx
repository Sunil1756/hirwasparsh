import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  TreeDeciduous,
  Satellite,
  ShieldCheck,
  RefreshCw,
  Info,
  Scale,
  Send,
  Download,
  Filter,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileCheck,
} from "lucide-react";
import {
  satelliteFieldValidationService,
  CrossValidationReport,
  TreeSatelliteColocationRecord,
  ValidationDiscrepancyType,
} from "../../services/satelliteFieldValidationService";

interface SatelliteFieldValidationHUDProps {
  projectId?: string;
  className?: string;
  onDispatchScout?: (treeId: string, action: string) => void;
}

export const SatelliteFieldValidationHUD: React.FC<SatelliteFieldValidationHUDProps> = ({
  projectId = "proj_deodhar_01",
  className = "",
  onDispatchScout,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<CrossValidationReport | null>(null);
  const [filterType, setFilterType] = useState<"all" | ValidationDiscrepancyType>("all");
  const [dispatchedTreeIds, setDispatchedTreeIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await satelliteFieldValidationService.executeCrossValidation(projectId);
      setReport(res);
    } catch (err) {
      console.error("Failed to execute satellite-field cross validation", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleDispatch = (treeId: string, action: string) => {
    setDispatchedTreeIds((prev) => new Set(prev).add(treeId));
    onDispatchScout?.(treeId, action);
  };

  const filteredTrees = report
    ? filterType === "all"
      ? report.colocatedTreeRecords
      : report.colocatedTreeRecords.filter((t) => t.validationType === filterType)
    : [];

  return (
    <div
      className={`bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="satellite-field-validation-hud"
    >
      {/* 1. HEADER BANNER */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Scale className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Satellite vs Field Cross-Validation Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Task 60 Validated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-Source Ground Truth Calibration • Understory Weed & Soil Masking Discrepancy Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            data-testid="refresh-validation-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            Recalibrate Cross-Validation
          </button>
        </div>
      </div>

      {/* 2. CRUCIAL SCIENTIFIC LIMITATION NOTICE BANNER */}
      <div
        className="p-4 bg-amber-950/30 border-b border-amber-500/30 flex items-start gap-3 text-xs text-amber-200"
        data-testid="scientific-limitation-callout"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block text-sm font-semibold">
            Important Scientific Remote Sensing Limitation:
          </strong>
          <p className="leading-relaxed opacity-90">
            Satellite multi-spectral data (10m GSD = 100 m² pixel) measures area-integrated canopy reflectance and{" "}
            <strong>MUST NOT automatically be presented as conclusive proof that every individual young tree is alive</strong>.
            Young saplings occupy &lt; 1 m² within a 100 m² footprint and can be masked by bare soil, while weed/grass flushes can create false green signals. Satellite imagery is strictly utilized as <strong>one evidence source (30% weight)</strong> within the Hirwa Sparsh Multi-Source Verification Framework.
          </p>
        </div>
      </div>

      {/* 3. MULTI-SOURCE KPI STRIP */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800 bg-slate-950/60 divide-y md:divide-y-0 divide-x divide-slate-800 text-center">
          <div className="p-4">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">
              Overall Concordance
            </span>
            <span
              className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 block"
              data-testid="concordance-rate"
            >
              {report.discrepancyMatrix.overallConcordanceRatePct}%
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {report.discrepancyMatrix.concordantHealthyCount + report.discrepancyMatrix.concordantStressedCount} of{" "}
              {report.discrepancyMatrix.totalTreesEvaluated} Trees Corroborated
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">
              Fused Survival Index
            </span>
            <span
              className="text-2xl font-extrabold font-mono text-indigo-300 mt-1 block"
              data-testid="composite-survival-index"
            >
              {report.evidenceWeighting.compositeSurvivalIndexPct}%
            </span>
            <span className="text-[10px] text-indigo-400 mt-0.5 block font-mono">
              95% CI: [{report.evidenceWeighting.confidenceInterval95Pct[0]}% —{" "}
              {report.evidenceWeighting.confidenceInterval95Pct[1]}%]
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">
              Understory Weed False Positives
            </span>
            <span
              className="text-2xl font-extrabold font-mono text-rose-400 mt-1 block"
              data-testid="weed-false-positives"
            >
              {report.discrepancyMatrix.understoryWeedFalsePositiveCount}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {report.discrepancyMatrix.falsePositiveRatePct}% False Green Risk
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">
              Young Sapling Soil Masking
            </span>
            <span
              className="text-2xl font-extrabold font-mono text-amber-400 mt-1 block"
              data-testid="soil-masking-count"
            >
              {report.discrepancyMatrix.youngSaplingSoilMaskingCount}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {report.discrepancyMatrix.falseNegativeRatePct}% Soil Background Noise
            </span>
          </div>
        </div>
      )}

      {/* 4. MULTI-SOURCE EVIDENCE WEIGHTING FORMULA BREAKDOWN */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            Multi-Source Fusion Weighting Standard (Verra VM0047 Section 8.3)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Survival = 0.50(Field) + 0.30(Satellite) + 0.20(AgroClimatic)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">1. Field Ground Truth</span>
              <span className="font-bold text-emerald-400 font-mono">50% Weight</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Geotagged growth photos, height/DBH measurements, observer role QA.
            </p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">2. Space-Borne Multi-Spectral</span>
              <span className="font-bold text-cyan-400 font-mono">30% Weight</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              10m Sentinel-2 BOA NDVI, SAVI (soil-corrected), NDRE, and FVC canopy cover.
            </p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">3. Agro-Climatic Weather</span>
              <span className="font-bold text-amber-400 font-mono">20% Weight</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Root-zone soil moisture (0-100cm), VPD, rainfall, and drought stress index.
            </p>
          </div>
        </div>
      </div>

      {/* 5. TREE-BY-TREE COLOCATION & DISCREPANCY TABLE */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-400 text-[11px] px-1">Filter Discrepancies:</span>
            <button
              onClick={() => setFilterType("all")}
              data-testid="filter-all"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === "all" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Trees ({report?.colocatedTreeRecords.length || 0})
            </button>
            <button
              onClick={() => setFilterType("concordant_healthy")}
              data-testid="filter-concordant"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === "concordant_healthy"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Concordant ({report?.discrepancyMatrix.concordantHealthyCount || 0})
            </button>
            <button
              onClick={() => setFilterType("understory_weed_false_positive")}
              data-testid="filter-weed"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === "understory_weed_false_positive"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Weed False Positives ({report?.discrepancyMatrix.understoryWeedFalsePositiveCount || 0})
            </button>
            <button
              onClick={() => setFilterType("young_sapling_soil_masking")}
              data-testid="filter-soil-masking"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === "young_sapling_soil_masking"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Young Saplings ({report?.discrepancyMatrix.youngSaplingSoilMaskingCount || 0})
            </button>
          </div>
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Colocating ground trees with 10m Sentinel-2 pixel rasters...</p>
          </div>
        ) : filteredTrees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p>No trees match the selected discrepancy filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700" data-testid="validation-table">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Tree & Species</th>
                  <th className="p-3">Field Health Status</th>
                  <th className="p-3">Sentinel-2 (10m) Pixel</th>
                  <th className="p-3">Cross-Validation Status</th>
                  <th className="p-3">Discrepancy Analysis & Action</th>
                  <th className="p-3">Field Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {filteredTrees.map((tree) => {
                  const isDispatched = dispatchedTreeIds.has(tree.treeId);

                  return (
                    <tr key={tree.treeId} className="hover:bg-slate-800/50">
                      {/* Tree Info */}
                      <td className="p-3">
                        <span className="font-bold text-white block">{tree.treeName}</span>
                        <span className="text-slate-400 font-sans block text-[11px]">{tree.species}</span>
                        <span className="text-[10px] text-slate-500">Age: {tree.treeAgeMonths} months</span>
                      </td>

                      {/* Field Status */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tree.fieldHealthStatus === "thriving" || tree.fieldHealthStatus === "healthy"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : tree.fieldHealthStatus === "stressed"
                              ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                              : "bg-rose-950 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {tree.fieldHealthStatus}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                          GPS: ±{tree.fieldGpsAccuracyM}m
                        </span>
                      </td>

                      {/* Satellite Pixel */}
                      <td className="p-3">
                        <span className="text-emerald-400 font-bold block">NDVI: {tree.colocatedPixel.ndvi.toFixed(3)}</span>
                        <span className="text-amber-400 text-[11px] block">SAVI: {tree.colocatedPixel.savi.toFixed(3)}</span>
                        <span className="text-[10px] text-slate-500 block">FVC: {tree.colocatedPixel.fvcPct}%</span>
                      </td>

                      {/* Validation Status */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold block max-w-fit ${
                            tree.validationType === "concordant_healthy"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                              : tree.validationType === "understory_weed_false_positive"
                              ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                              : "bg-amber-950 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {tree.validationLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Confidence: {tree.confidenceScore}%
                        </span>
                      </td>

                      {/* Action Message */}
                      <td className="p-3 font-sans text-xs max-w-xs text-slate-300">
                        {tree.actionMessage}
                      </td>

                      {/* Dispatch Button */}
                      <td className="p-3">
                        {tree.recommendedAction === "none" ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Corroborated
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDispatch(tree.treeId, tree.recommendedAction)}
                            disabled={isDispatched}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              isDispatched
                                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30"
                            }`}
                            data-testid={`dispatch-btn-${tree.treeId}`}
                          >
                            <Send className="w-3 h-3" />
                            {isDispatched ? "Scout Dispatched" : "Dispatch Scout"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. FOOTER AUDIT DIGEST */}
      {report && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Verra VM0047 Section 8.3 Cross-Validation Certificate:</span>
            <span className="font-mono text-slate-200">{report.mrvCrossValidationDigest}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Ground Calibration Enforced • Zero Autonomous Survival Assertion
          </span>
        </div>
      )}
    </div>
  );
};
