import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  Download,
  Droplets,
  TreePine,
  ShieldCheck,
  Award,
  Zap,
  Clock,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import {
  monitoringAnalyticsService,
  MonitoringAnalyticsSummary,
  TimeRange,
} from "../../services/monitoringAnalyticsService";
import { AnalyticsExportModal } from "./AnalyticsExportModal";

export const MonitoringAnalyticsConsole: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const [projectId, setProjectId] = useState<string>("all");
  const [summary, setSummary] = useState<MonitoringAnalyticsSummary>(() =>
    monitoringAnalyticsService.getAnalyticsSummary()
  );
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    setSummary(monitoringAnalyticsService.getAnalyticsSummary({ timeRange, projectId }));
    const unsub = monitoringAnalyticsService.subscribe(() => {
      setSummary(monitoringAnalyticsService.getAnalyticsSummary({ timeRange, projectId }));
    });
    return unsub;
  }, [timeRange, projectId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="monitoring-analytics-console">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 text-white shadow-xl border border-emerald-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Phase 9 • Task 51 — Monitoring Analytics
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              IPCC Tier-2 Carbon & Biometrics
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            MRV Monitoring Analytics & Cadence Intelligence
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Real-time fulfillment rates across Copernicus orbital sweeps, PSP sample plots, and UAV LiDAR. Tracks allometric biomass accrual vs ecological baselines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700">
            {(["30d", "90d", "1y", "all"] as const).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                data-testid={`time-range-${tr}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                  timeRange === tr
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tr}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            data-testid="open-export-modal-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export MRV Report
          </button>
        </div>
      </div>

      {/* 6-Card Executive Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Monitored</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {summary.totalMonitoredHectares} <span className="text-xs font-normal text-zinc-400">ha</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">100% Boundary Mapped</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Cadence Fulfillment</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.overallFulfillmentRatePct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">5 Active Protocols</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Mean NDVI Index</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {summary.meanNdviIndex}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">+{summary.ndviDeltaVsBaseline} vs Baseline</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Cohort Survival</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.meanSurvivalRatePct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{summary.totalTreesSampled.toLocaleString()} Trees Sampled</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Carbon Accrued</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.carbonAccrual.totalCarbonAccruedTCO2e.toLocaleString()} <span className="text-xs font-normal text-zinc-400">tCO₂e</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">{summary.carbonAccrual.biomassGrowthDeltaPct}% vs PDD</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">SLA Adherence</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {summary.operationalSlaCompliancePct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">MTTR: {summary.meanTimeToResolveHours}h</div>
        </div>
      </div>

      {/* Cadence Fulfillment Scorecard */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Monitoring Protocol & Multi-Cadence Fulfillment Scorecard
            </h3>
            <p className="text-xs text-zinc-500">
              Surveillance quota targets vs verified completed runs under international MRV standards
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
            {summary.overallFulfillmentRatePct}% Aggregate Compliance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.cadenceMetrics.map((cad) => (
            <div
              key={cad.cadenceType}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{cad.name}</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {cad.fulfillmentRatePct}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${cad.fulfillmentRatePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Runs: <strong>{cad.completedCount} / {cad.scheduledCount}</strong></span>
                <span>Quota: <strong>{cad.quotaAchieved} / {cad.quotaTarget}</strong> {cad.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trajectory & Species Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trajectory Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Biomass Growth & NDVI Temporal Trajectory
              </h3>
              <p className="text-xs text-zinc-500">Observed spectral vigor vs ecological baseline model</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Timeline</th>
                  <th className="py-2.5 px-3">Observed NDVI</th>
                  <th className="py-2.5 px-3">Baseline NDVI</th>
                  <th className="py-2.5 px-3">Canopy Cover</th>
                  <th className="py-2.5 px-3">Biomass Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                {summary.trajectoryData.map((pt) => (
                  <tr key={pt.timestamp} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{pt.label}</td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{pt.observedNdvi}</td>
                    <td className="py-2 px-3 text-zinc-400">{pt.baselineNdvi}</td>
                    <td className="py-2 px-3">{pt.canopyCoverPct}%</td>
                    <td className="py-2 px-3 font-semibold">{pt.carbonDensityTonnesPerHa} t/ha</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Species Breakdown */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-600" />
                Species Survival & Allometric Increment Benchmark
              </h3>
              <p className="text-xs text-zinc-500">Cohort vigor and DBH/height growth across taxa</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Species</th>
                  <th className="py-2.5 px-3">Survival %</th>
                  <th className="py-2.5 px-3">Avg Height</th>
                  <th className="py-2.5 px-3">Avg DBH</th>
                  <th className="py-2.5 px-3">Growth / Mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {summary.speciesMetrics.map((sp) => (
                  <tr key={sp.speciesName} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{sp.speciesName}</div>
                      <div className="text-[10px] text-zinc-400 italic">{sp.scientificName}</div>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {sp.survivalRatePct}%
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">{sp.avgHeightMeters}m</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{sp.avgDbgCm}cm</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-blue-600 font-semibold">
                      +{sp.growthRateCmPerMonth} cm/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Squad Performance & Anomaly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Squad Performance */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Ranger Squad & Verifier Operational Scorecard
              </h3>
              <p className="text-xs text-zinc-500">Field task completion rate and resolution SLA compliance</p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.squadMetrics.map((sq) => (
              <div
                key={sq.squadName}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{sq.squadName}</div>
                  <div className="text-[11px] text-zinc-400">{sq.role} • Avg MTTR: {sq.avgResolutionHours}h</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                    {sq.onTimeRatePct}% On-Time
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {sq.completedTasks} / {sq.assignedTasks} Tasks Completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly Distribution */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-600" />
                Ecological Risk & Anomaly Forensics
              </h3>
              <p className="text-xs text-zinc-500">Biometric failure frequency and sensor reliability index</p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.anomalyDistribution.map((an) => (
              <div
                key={an.category}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{an.label}</div>
                  <div className="text-[11px] text-zinc-400">
                    False Positive: {an.falsePositiveRatePct}% • MTTR: {an.avgResolutionHours}h
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                    {an.count} Breaches ({an.criticalCount} Critical)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <AnalyticsExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
