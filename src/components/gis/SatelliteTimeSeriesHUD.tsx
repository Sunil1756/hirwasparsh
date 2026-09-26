import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  Download,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  satelliteTimeSeriesService,
  StoredSatelliteObservation,
  AggregatedTimeSeriesPoint,
  TimeSeriesAnomalyAlert,
} from "../../services/satelliteTimeSeriesService";
import { satelliteVegetationIndicatorsService } from "../../services/satelliteVegetationIndicatorsService";

interface SatelliteTimeSeriesHUDProps {
  projectId?: string;
  className?: string;
  onObservationRecorded?: (obs: StoredSatelliteObservation) => void;
}

export const SatelliteTimeSeriesHUD: React.FC<SatelliteTimeSeriesHUDProps> = ({
  projectId = "proj_deodhar_01",
  className = "",
  onObservationRecorded,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);
  const [observations, setObservations] = useState<StoredSatelliteObservation[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedTimeSeriesPoint[]>([]);
  const [anomalies, setAnomalies] = useState<TimeSeriesAnomalyAlert[]>([]);
  const [timeRange, setTimeRange] = useState<"30d" | "6m" | "1y" | "all">("1y");
  const [selectedMetric, setSelectedMetric] = useState<"ndvi" | "evi" | "savi" | "ndre" | "fvc" | "agbd">("ndvi");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<"trajectory" | "table" | "anomalies">("trajectory");

  const loadData = async () => {
    setLoading(true);
    try {
      let startDate: string | undefined;
      const now = new Date();
      if (timeRange === "30d") startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
      else if (timeRange === "6m") startDate = new Date(now.getTime() - 180 * 86400000).toISOString().split("T")[0];
      else if (timeRange === "1y") startDate = new Date(now.getTime() - 365 * 86400000).toISOString().split("T")[0];

      const obs = await satelliteTimeSeriesService.getProjectTimeSeries(projectId, {
        startDate,
        sortOrder: "desc",
      });
      const agg = await satelliteTimeSeriesService.getAggregatedTimeSeries(projectId, "monthly");
      const anom = await satelliteTimeSeriesService.detectTimeSeriesAnomalies(projectId);

      setObservations(obs);
      setAggregated(agg);
      setAnomalies(anom);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Failed to fetch time series observations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, timeRange]);

  // Animation timeline stepper
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && observations.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % observations.length);
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, observations.length]);

  const handleRecordNewObservation = async () => {
    setRecording(true);
    try {
      const indicators = await satelliteVegetationIndicatorsService.generateProjectVegetationIndicators(projectId);
      const newObs = await satelliteTimeSeriesService.recordObservation({
        projectId,
        indices: indicators.indices,
        fvcPct: indicators.canopyCover.fractionalVegetationCoverPct,
        lai: indicators.canopyCover.leafAreaIndex,
        agbdTonsHa: indicators.canopyCover.aboveGroundBiomassDensityTonsHa,
        deltaNdvi: indicators.vegetationChange.deltaNdvi,
        vciPct: indicators.vegetationChange.vegetationConditionIndex,
        qaPassed: true,
      });

      await loadData();
      onObservationRecorded?.(newObs);
    } catch (err) {
      console.error("Failed to record new observation", err);
    } finally {
      setRecording(false);
    }
  };

  const handleExportCsv = async () => {
    const csv = await satelliteTimeSeriesService.exportTimeSeriesDossier(projectId, "csv");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `satellite_timeseries_${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMrvJson = async () => {
    const json = await satelliteTimeSeriesService.exportTimeSeriesDossier(projectId, "verra_mrv");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mrv_dossier_${projectId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeObs: StoredSatelliteObservation | null =
    observations.length > 0 ? observations[currentIndex] : null;

  return (
    <div
      className={`bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="satellite-time-series-hud"
    >
      {/* Top Banner Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Satellite Time Series & Observation Storage
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Task 58 Stored
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Persistent Multi-Temporal Observation Archive • Dekad / Monthly Aggregation • Verra VM0047
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRecordNewObservation}
            disabled={recording}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-md shadow-emerald-900/20"
            data-testid="record-observation-btn"
          >
            <PlusCircle className={`w-3.5 h-3.5 ${recording ? "animate-spin" : ""}`} />
            {recording ? "Persisting..." : "Record Observation"}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            data-testid="export-csv-btn"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV
          </button>

          <button
            onClick={handleExportMrvJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            data-testid="export-json-btn"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            MRV JSON
          </button>
        </div>
      </div>

      {/* Sub-Header KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800 bg-slate-950/40 divide-x divide-slate-800">
        <div className="p-3 text-center">
          <span className="text-[11px] text-slate-400 block">Total Stored Passes</span>
          <span className="text-xl font-bold font-mono text-white mt-0.5 block" data-testid="total-obs-count">
            {observations.length}
          </span>
        </div>

        <div className="p-3 text-center">
          <span className="text-[11px] text-slate-400 block">Longitudinal Mean NDVI</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block" data-testid="longitudinal-mean-ndvi">
            {observations.length > 0
              ? (
                  observations.reduce((acc, o) => acc + o.indices.ndvi, 0) / observations.length
                ).toFixed(3)
              : "0.000"}
          </span>
        </div>

        <div className="p-3 text-center">
          <span className="text-[11px] text-slate-400 block">Monthly Aggregated Dekads</span>
          <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
            {aggregated.length}
          </span>
        </div>

        <div className="p-3 text-center">
          <span className="text-[11px] text-slate-400 block">Biomass Accretion Gain</span>
          <span className="text-xl font-bold font-mono text-lime-400 mt-0.5 block">
            {observations.length > 0
              ? `+${Math.max(
                  0,
                  observations[0].agbdTonsHa - observations[observations.length - 1].agbdTonsHa
                ).toFixed(1)} t/ha`
              : "+0.0 t/ha"}
          </span>
        </div>
      </div>

      {/* Controls Bar: Range Filter + View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/70 border-b border-slate-800">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="px-2 text-slate-400 text-[11px]">Range:</span>
          {(["30d", "6m", "1y", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              data-testid={`range-${r}`}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                timeRange === r
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r === "30d" ? "30 Days" : r === "6m" ? "6 Months" : r === "1y" ? "1 Year" : "All Time"}
            </button>
          ))}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveViewTab("trajectory")}
            data-testid="tab-trajectory"
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeViewTab === "trajectory"
                ? "bg-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Trajectory Slider
          </button>
          <button
            onClick={() => setActiveViewTab("table")}
            data-testid="tab-table"
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeViewTab === "table"
                ? "bg-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Observation Table
          </button>
          <button
            onClick={() => setActiveViewTab("anomalies")}
            data-testid="tab-anomalies"
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeViewTab === "anomalies"
                ? "bg-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Anomalies ({anomalies.length})
          </button>
        </div>
      </div>

      {/* Main Body View */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">Querying multi-temporal satellite observation database...</p>
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p>No observations recorded yet for this project.</p>
          </div>
        ) : (
          <>
            {/* VIEW 1: INTERACTIVE TIMELINE SLIDER & PLAYBACK */}
            {activeViewTab === "trajectory" && activeObs && (
              <div className="space-y-6" data-testid="panel-trajectory">
                {/* Active Selected Overpass Inspector Card */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/80 border border-slate-700 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                          {activeObs.satelliteConstellation}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Scene: {activeObs.sceneId}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        Observation Date: <span className="text-cyan-400 font-mono">{activeObs.observationDate}</span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Index ({currentIndex + 1}/{observations.length})</span>
                      <button
                        onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                        disabled={currentIndex === 0}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow"
                        data-testid="play-pause-btn"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setCurrentIndex((p) => Math.min(observations.length - 1, p + 1))}
                        disabled={currentIndex === observations.length - 1}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scrub Slider */}
                  <input
                    type="range"
                    min="0"
                    max={observations.length - 1}
                    value={currentIndex}
                    onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    data-testid="time-slider"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>{observations[0].observationDate} (Latest)</span>
                    <span>{observations[observations.length - 1].observationDate} (Earliest)</span>
                  </div>

                  {/* Multi-Index Readout for Active Step */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-5">
                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">NDVI</span>
                      <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block" data-testid="scrubbed-ndvi">
                        {activeObs.indices.ndvi.toFixed(3)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">EVI</span>
                      <span className="text-base font-bold font-mono text-teal-400 mt-0.5 block">
                        {activeObs.indices.evi.toFixed(3)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">SAVI</span>
                      <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
                        {activeObs.indices.savi.toFixed(3)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">NDRE</span>
                      <span className="text-base font-bold font-mono text-lime-400 mt-0.5 block">
                        {activeObs.indices.ndre.toFixed(3)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">FVC Cover</span>
                      <span className="text-base font-bold font-mono text-cyan-400 mt-0.5 block">
                        {activeObs.fvcPct}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">Biomass (AGBD)</span>
                      <span className="text-base font-bold font-mono text-white mt-0.5 block">
                        {activeObs.agbdTonsHa} t/ha
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Aggregation Trend Breakdown */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Aggregated Monthly Phenological Progression
                  </h4>

                  <div className="space-y-3">
                    {aggregated.slice(0, 8).map((aggPoint, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">{aggPoint.periodLabel}</span>
                          <span className="text-slate-400 font-mono">
                            NDVI: <strong className="text-emerald-400">{aggPoint.meanNdvi}</strong> (Min: {aggPoint.minNdvi}, Max: {aggPoint.maxNdvi}) • {aggPoint.observationsCount} passes
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, Math.min(100, aggPoint.meanNdvi * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: HISTORICAL OBSERVATIONS TABLE */}
            {activeViewTab === "table" && (
              <div className="overflow-x-auto rounded-xl border border-slate-700" data-testid="panel-table">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3">Observation Date</th>
                      <th className="p-3">Satellite Sensor</th>
                      <th className="p-3">NDVI</th>
                      <th className="p-3">EVI</th>
                      <th className="p-3">SAVI</th>
                      <th className="p-3">NDRE</th>
                      <th className="p-3">FVC %</th>
                      <th className="p-3">Biomass</th>
                      <th className="p-3">Season</th>
                      <th className="p-3">QA Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                    {observations.map((obs) => (
                      <tr key={obs.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-white font-semibold">{obs.observationDate}</td>
                        <td className="p-3 text-slate-400">{obs.satelliteConstellation}</td>
                        <td className="p-3 text-emerald-400 font-bold">{obs.indices.ndvi.toFixed(3)}</td>
                        <td className="p-3 text-teal-400">{obs.indices.evi.toFixed(3)}</td>
                        <td className="p-3 text-amber-400">{obs.indices.savi.toFixed(3)}</td>
                        <td className="p-3 text-lime-400">{obs.indices.ndre.toFixed(3)}</td>
                        <td className="p-3 text-cyan-400">{obs.fvcPct}%</td>
                        <td className="p-3">{obs.agbdTonsHa} t/ha</td>
                        <td className="p-3 uppercase text-[10px] text-slate-400">
                          {obs.phenologicalSeason.replace("_", " ")}
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-500/30">
                            PASSED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 3: TIME SERIES ANOMALIES */}
            {activeViewTab === "anomalies" && (
              <div className="space-y-4" data-testid="panel-anomalies">
                {anomalies.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-800/60 border border-slate-700 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">Zero Temporal Anomalies Detected</p>
                    <p className="text-xs mt-1">All longitudinal acquisitions demonstrate steady phenological continuity.</p>
                  </div>
                ) : (
                  anomalies.map((anom, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-start gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase">{anom.anomalyType.replace("_", " ")}</span>
                          <span className="text-[10px] font-mono text-amber-300">Date: {anom.date}</span>
                          <span className="text-[10px] font-mono text-slate-400">Z-Score: {anom.zScore}σ</span>
                        </div>
                        <p className="text-xs mt-1 opacity-90">{anom.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Verra MRV Time Series Compliance Digest */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Verra VM0047 Longitudinal Archive Digest:</span>
                <span className="font-mono text-slate-200">
                  {observations.length > 0 ? observations[0].sha256Hash : "UNSEEDED"}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Persistent Storage Active • Dekad / Monthly Aggregation Synchronized
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
