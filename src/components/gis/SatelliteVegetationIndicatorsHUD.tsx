import React, { useState, useEffect } from "react";
import {
  Activity,
  Layers,
  TrendingUp,
  TrendingDown,
  TreeDeciduous,
  Leaf,
  Droplets,
  Sun,
  ShieldCheck,
  RefreshCw,
  Info,
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Sliders,
} from "lucide-react";
import {
  satelliteVegetationIndicatorsService,
  ProjectVegetationIndicatorsPackage,
  ComprehensiveVegetationIndices,
  VegetationChangeAssessment,
  CanopyLandCoverIndicators,
  SeasonalTrendAnalysis,
} from "../../services/satelliteVegetationIndicatorsService";

interface SatelliteVegetationIndicatorsHUDProps {
  projectId?: string;
  className?: string;
  onExportDossier?: (pkg: ProjectVegetationIndicatorsPackage) => void;
}

export const SatelliteVegetationIndicatorsHUD: React.FC<SatelliteVegetationIndicatorsHUDProps> = ({
  projectId = "proj_deodhar_01",
  className = "",
  onExportDossier,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ProjectVegetationIndicatorsPackage | null>(null);
  const [activeTab, setActiveTab] = useState<"indices" | "change" | "canopy" | "phenology">("indices");
  const [interactiveBaselineNdvi, setInteractiveBaselineNdvi] = useState<number>(0.42);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await satelliteVegetationIndicatorsService.generateProjectVegetationIndicators(projectId);
      setData(res);
      setInteractiveBaselineNdvi(res.vegetationChange.baselineNdvi);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to calculate vegetation indicators", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Live dynamic change recalculation based on interactive slider
  const dynamicChange: VegetationChangeAssessment | null = data
    ? satelliteVegetationIndicatorsService.evaluateVegetationChange(
        data.indices.ndvi,
        interactiveBaselineNdvi
      )
    : null;

  return (
    <div
      className={`bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="satellite-vegetation-indicators-hud"
    >
      {/* Header Banner */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <TreeDeciduous className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Vegetation Indicators & Biometrics
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Task 57 Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Copernicus Sentinel-2 L2A & Landsat-8/9 • 10m Multi-Spectral Photometry • MRV VM0047
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              Updated: <span className="text-slate-300 font-mono">{lastUpdated}</span>
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            data-testid="refresh-indicators-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh Indicators
          </button>
          {data && (
            <button
              onClick={() => onExportDossier?.(data)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-lg shadow-emerald-900/30"
              data-testid="export-indicators-btn"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Export MRV Dossier
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("indices")}
          data-testid="tab-indices"
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "indices"
              ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Leaf className="w-4 h-4" />
          Multi-Spectral Indices (NDVI, EVI, SAVI, NDRE)
        </button>

        <button
          onClick={() => setActiveTab("change")}
          data-testid="tab-change"
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "change"
              ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Vegetation Change & Disturbance (ΔNDVI, VCI)
        </button>

        <button
          onClick={() => setActiveTab("canopy")}
          data-testid="tab-canopy"
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "canopy"
              ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          Canopy & Land-Cover Indicators (FVC, LAI, AGBD)
        </button>

        <button
          onClick={() => setActiveTab("phenology")}
          data-testid="tab-phenology"
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "phenology"
              ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Seasonal Trends & Phenology (Kharif, Rabi, Zaid)
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6">
        {loading || !data ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm">Calculating multi-spectral vegetation indices from pre-processed rasters...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: MULTI-SPECTRAL INDICES */}
            {activeTab === "indices" && (
              <div className="space-y-6" data-testid="panel-indices">
                {/* Primary Metric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* NDVI Card */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-emerald-500/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        NDVI (Green Vigor)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                        B08 / B04
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white font-mono" data-testid="ndvi-value">
                        {data.indices.ndvi.toFixed(3)}
                      </span>
                      <span className="text-xs text-emerald-400 font-medium">
                        {data.indices.ndvi >= 0.65
                          ? "Lush Closed Canopy"
                          : data.indices.ndvi >= 0.45
                          ? "Dense Agroforest"
                          : "Moderate Growth"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, ((data.indices.ndvi + 0.2) / 1.2) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Formula: (NIR - Red) / (NIR + Red)
                    </p>
                  </div>

                  {/* EVI Card */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/40 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                        EVI (Enhanced Index)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 text-[10px] font-mono border border-teal-500/30">
                        B08 / B04 / B02
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white font-mono" data-testid="evi-value">
                        {data.indices.evi.toFixed(3)}
                      </span>
                      <span className="text-xs text-teal-400 font-medium">
                        {data.indices.evi >= 0.5 ? "High Canopy Density" : "Standard Vigor"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, data.indices.evi * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Atmosphere-corrected for dense high-biomass stands
                    </p>
                  </div>

                  {/* SAVI Card */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-amber-500/40 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        SAVI (Soil-Adjusted)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                        L = 0.5
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white font-mono" data-testid="savi-value">
                        {data.indices.savi.toFixed(3)}
                      </span>
                      <span className="text-xs text-amber-400 font-medium">Soil Corrected</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, data.indices.savi * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Suppresses background soil brightness noise in young plantations
                    </p>
                  </div>

                  {/* NDRE Card */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-lime-500/40 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-lime-400 uppercase tracking-wider">
                        NDRE (Red Edge)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-lime-950 text-lime-300 text-[10px] font-mono border border-lime-500/30">
                        B08 / B05 (705nm)
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white font-mono" data-testid="ndre-value">
                        {data.indices.ndre.toFixed(3)}
                      </span>
                      <span className="text-xs text-lime-400 font-medium">Chlorophyll High</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-lime-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, data.indices.ndre * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Sensitive to leaf nitrogen concentration in mature canopy
                    </p>
                  </div>
                </div>

                {/* Secondary Indices: MSAVI2, NDWI, NDMI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
                    <div className="flex items-center gap-2 mb-2 text-indigo-300">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs font-semibold">MSAVI2 (Modified SAVI)</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white mb-1">
                      {data.indices.msavi2.toFixed(3)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Auto-calculates soil line slope factor for accurate young sapling boundary tracking.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
                    <div className="flex items-center gap-2 mb-2 text-sky-300">
                      <Droplets className="w-4 h-4" />
                      <span className="text-xs font-semibold">NDWI (Water / Canopy Moisture)</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white mb-1">
                      {data.indices.ndwiWater.toFixed(3)}
                    </div>
                    <p className="text-xs text-slate-400">
                      (Green - NIR) / (Green + NIR) — Detects open irrigation, ponds & foliar water stress.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
                    <div className="flex items-center gap-2 mb-2 text-cyan-300">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-semibold">NDMI (Gao Moisture Index)</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white mb-1">
                      {data.indices.ndmiMoisture.toFixed(3)}
                    </div>
                    <p className="text-xs text-slate-400">
                      (NIR - SWIR) / (NIR + SWIR) — Direct liquid water thickness within tree leaves.
                    </p>
                  </div>
                </div>

                {/* Pixel Distribution Histogram */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Pixel-Level NDVI Histogram Distribution
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Mean: <span className="text-emerald-400 font-bold">{data.pixelLevelDistribution.meanNdvi}</span> ±{" "}
                      {data.pixelLevelDistribution.stdDevNdvi}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {data.pixelLevelDistribution.ndviHistogram.map((bin, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{bin.bin}</span>
                          <span className="text-slate-400 font-mono">
                            {bin.percentage}% ({bin.count} px)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              i >= 3 ? "bg-emerald-500" : i === 2 ? "bg-lime-500" : i === 1 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${bin.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VEGETATION CHANGE & DISTURBANCE */}
            {activeTab === "change" && dynamicChange && (
              <div className="space-y-6" data-testid="panel-change">
                {/* Baseline Comparison Bar */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        Multi-Temporal Baseline Comparison & ΔNDVI
                      </h4>
                      <p className="text-xs text-slate-400">
                        Compare current optical acquisition with plantation baseline reference
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Baseline NDVI:</span>
                      <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                        {interactiveBaselineNdvi.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.01"
                    value={interactiveBaselineNdvi}
                    onChange={(e) => setInteractiveBaselineNdvi(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    data-testid="baseline-slider"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>0.10 (Barren Planting Start)</span>
                    <span>0.42 (Regional Mean)</span>
                    <span>0.80 (Dense Forest)</span>
                  </div>
                </div>

                {/* Change Assessment Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Delta NDVI */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      ΔNDVI (Canopy Growth Delta)
                    </span>
                    <div className="flex items-center gap-2">
                      {dynamicChange.deltaNdvi >= 0 ? (
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-rose-400" />
                      )}
                      <span
                        className={`text-3xl font-extrabold font-mono ${
                          dynamicChange.deltaNdvi >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                        data-testid="delta-ndvi-value"
                      >
                        {dynamicChange.deltaNdvi > 0 ? `+${dynamicChange.deltaNdvi.toFixed(3)}` : dynamicChange.deltaNdvi.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-300">
                      Relative Gain:{" "}
                      <span className={dynamicChange.relativeChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {dynamicChange.relativeChangePct > 0 ? `+${dynamicChange.relativeChangePct}%` : `${dynamicChange.relativeChangePct}%`}
                      </span>
                    </div>
                  </div>

                  {/* VCI Meter */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      VCI (Vegetation Condition Index)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-white" data-testid="vci-value">
                        {dynamicChange.vegetationConditionIndex}%
                      </span>
                      <span className="text-xs text-emerald-400 font-medium">
                        {dynamicChange.vegetationConditionIndex >= 70
                          ? "Optimal Vitality"
                          : dynamicChange.vegetationConditionIndex >= 40
                          ? "Normal Season"
                          : "Drought / Stress"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${dynamicChange.vegetationConditionIndex}%` }}
                      />
                    </div>
                  </div>

                  {/* Biomass Delta */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      Aboveground Biomass Delta
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-white">
                        {dynamicChange.biomassDeltaTonsPerHa > 0
                          ? `+${dynamicChange.biomassDeltaTonsPerHa}`
                          : dynamicChange.biomassDeltaTonsPerHa}{" "}
                        <span className="text-sm font-normal text-slate-400">t/ha</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Allometric correlation based on IPCC Tier-2 agroforestry expansion
                    </p>
                  </div>
                </div>

                {/* Classification Alert Box */}
                <div
                  className={`p-4 sm:p-5 rounded-xl border flex items-start gap-3 ${
                    dynamicChange.isDegradationAlert
                      ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                      : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                  }`}
                  data-testid="change-classification-alert"
                >
                  {dynamicChange.isDegradationAlert ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-sm font-bold capitalize">
                      {dynamicChange.changeClassification.replace("_", " ")} Status
                    </h5>
                    <p className="text-xs mt-1 opacity-90">{dynamicChange.changeDescription}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CANOPY & LAND-COVER INDICATORS */}
            {activeTab === "canopy" && (
              <div className="space-y-6" data-testid="panel-canopy">
                {/* Canopy Cover Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* FVC Gauge */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      FVC (Fractional Vegetation Cover)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-white" data-testid="fvc-value">
                        {data.canopyCover.fractionalVegetationCoverPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${data.canopyCover.fractionalVegetationCoverPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Gutman & Ignatov radiative transfer fraction of pure green canopy
                    </p>
                  </div>

                  {/* LAI Meter */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      LAI (Leaf Area Index)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-white" data-testid="lai-value">
                        {data.canopyCover.leafAreaIndex}{" "}
                        <span className="text-sm font-normal text-slate-400">m²/m²</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">
                      Total one-sided foliage leaf surface area per unit ground surface
                    </p>
                  </div>

                  {/* AGBD Biomass Density */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                      Aboveground Biomass Density
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono text-white" data-testid="agbd-value">
                        {data.canopyCover.aboveGroundBiomassDensityTonsHa}{" "}
                        <span className="text-sm font-normal text-slate-400">t/ha</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">
                      Integrated canopy woody density calibrated for regional forest plots
                    </p>
                  </div>
                </div>

                {/* Land Cover Classification Details */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Cadastral Land Cover Partitioning
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Canopy Class</span>
                      <span className="text-sm font-bold text-emerald-300 font-mono block mt-1">
                        {data.canopyCover.canopyDensityClass.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Crown Closure</span>
                      <span className="text-sm font-bold text-white font-mono block mt-1">
                        {data.canopyCover.crownClosurePct}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Vegetated Area</span>
                      <span className="text-sm font-bold text-white font-mono block mt-1">
                        {data.canopyCover.vegetatedAreaHa} ha
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Chlorophyll Rating</span>
                      <span className="text-sm font-bold text-lime-400 uppercase font-mono block mt-1">
                        {data.canopyCover.canopyChlorophyllRating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SEASONAL PHENOLOGY & TRENDS */}
            {activeTab === "phenology" && (
              <div className="space-y-6" data-testid="panel-phenology">
                {/* Phenology Header Summary */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Agroforestry Phenological Seasonality & Trajectory
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Long-term Trend:</span>
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded uppercase ${
                          data.seasonalTrends.mannKendallTrendDirection === "improving"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-300"
                        }`}
                        data-testid="trend-direction"
                      >
                        {data.seasonalTrends.mannKendallTrendDirection} (Sen's Slope:{" "}
                        {data.seasonalTrends.trendSlopePerYear > 0
                          ? `+${data.seasonalTrends.trendSlopePerYear}`
                          : data.seasonalTrends.trendSlopePerYear}
                        /yr)
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{data.seasonalTrends.phenologicalHealthSummary}</p>
                </div>

                {/* 3 Seasons Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.seasonalTrends.phenologicalTrajectory.map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white">{pt.seasonLabel}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{pt.periodMonths}</span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-extrabold font-mono text-emerald-400">
                          {pt.meanNdvi.toFixed(3)}
                        </span>
                        <span className="text-xs text-slate-400">Mean NDVI</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Peak NDVI:</span>
                          <span className="font-mono text-white">{pt.peakNdvi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Base NDVI:</span>
                          <span className="font-mono text-white">{pt.baseNdvi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">FVC Coverage:</span>
                          <span className="font-mono text-emerald-400">{pt.fvcPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Stage:</span>
                          <span className="font-mono uppercase text-[10px] text-slate-200">
                            {pt.phenologyStage.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key Phenometrics Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">Start of Season (SOS)</span>
                    <span className="text-lg font-bold font-mono text-white mt-1 block">
                      {data.seasonalTrends.startOfSeasonNdvi}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">Peak of Season (POS)</span>
                    <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                      {data.seasonalTrends.peakOfSeasonNdvi}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">Seasonal Amplitude</span>
                    <span className="text-lg font-bold font-mono text-cyan-400 mt-1 block">
                      {data.seasonalTrends.seasonalAmplitude}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">Annual Greenness (NPP)</span>
                    <span className="text-lg font-bold font-mono text-lime-400 mt-1 block">
                      {data.seasonalTrends.annualIntegralNppProxy}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer MRV Verification Certificate */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verra VM0047 / Gold Standard Biometric Compliance:</span>
                <span className="font-mono text-slate-200">{data.mrvComplianceDigest}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                10m GSD Optical Resolution • Cloud Filtered • Topographically Calibrated
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
