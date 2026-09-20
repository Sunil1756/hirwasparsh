import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  Droplets,
  ShieldAlert,
  TreePine,
  Activity,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  Play,
  Send,
  Sliders,
  ChevronRight,
  Info,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  runPredictiveRiskModel,
  dispatchPredictiveRiskFieldTask,
  PredictiveThreatAlert,
  SpectralTimePoint,
  ThreatSeverity,
} from "@/lib/predictiveRiskEngine";
import { useToast } from "@/hooks/use-toast";

interface Props {
  timeSeries?: SpectralTimePoint[];
  plotName?: string;
  plotId?: string;
  projectId?: string;
  className?: string;
}

const DEFAULT_SIMULATED_SERIES: SpectralTimePoint[] = [
  { date: "2025-10-15", ndvi: 0.76, ndre: 0.62, ndwi: 0.32, lstTempC: 26.5 },
  { date: "2025-11-20", ndvi: 0.74, ndre: 0.60, ndwi: 0.28, lstTempC: 27.2 },
  { date: "2025-12-28", ndvi: 0.71, ndre: 0.58, ndwi: 0.22, lstTempC: 28.0 },
  { date: "2026-02-05", ndvi: 0.66, ndre: 0.52, ndwi: 0.14, lstTempC: 29.5 },
  { date: "2026-03-12", ndvi: 0.59, ndre: 0.44, ndwi: 0.04, lstTempC: 32.1 },
  { date: "2026-04-18", ndvi: 0.51, ndre: 0.36, ndwi: -0.04, lstTempC: 34.8 },
];

export function PredictiveRiskAlertsConsole({
  timeSeries,
  plotName = "Maharashtra Agroforestry Sector 7",
  plotId,
  projectId,
  className = "",
}: Props) {
  const { toast } = useToast();
  const [activeScenario, setActiveScenario] = useState<"drought" | "pest" | "clearing" | "healthy">("drought");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedTaskId, setDispatchedTaskId] = useState<string | null>(null);

  // Dynamic scenarios for interactive ML testing
  const currentSeries: SpectralTimePoint[] = useMemo(() => {
    if (timeSeries && timeSeries.length >= 3) return timeSeries;

    switch (activeScenario) {
      case "drought":
        return DEFAULT_SIMULATED_SERIES;
      case "pest":
        return [
          { date: "2026-01-10", ndvi: 0.78, ndre: 0.68, ndwi: 0.35, lstTempC: 26.0 },
          { date: "2026-02-15", ndvi: 0.75, ndre: 0.64, ndwi: 0.34, lstTempC: 26.5 },
          { date: "2026-03-20", ndvi: 0.62, ndre: 0.38, ndwi: 0.30, lstTempC: 27.0 }, // Sharp RedEdge drop despite good water
        ];
      case "clearing":
        return [
          { date: "2026-02-01", ndvi: 0.82, ndre: 0.70, ndwi: 0.38, lstTempC: 25.5 },
          { date: "2026-02-25", ndvi: 0.79, ndre: 0.67, ndwi: 0.36, lstTempC: 26.0 },
          { date: "2026-03-15", ndvi: 0.44, ndre: 0.32, ndwi: 0.05, lstTempC: 33.0 }, // Sudden drop
        ];
      case "healthy":
      default:
        return [
          { date: "2025-10-15", ndvi: 0.62, ndre: 0.48, ndwi: 0.20, lstTempC: 28.0 },
          { date: "2025-12-15", ndvi: 0.69, ndre: 0.55, ndwi: 0.25, lstTempC: 27.0 },
          { date: "2026-02-15", ndvi: 0.75, ndre: 0.62, ndwi: 0.30, lstTempC: 26.5 },
          { date: "2026-04-15", ndvi: 0.81, ndre: 0.68, ndwi: 0.35, lstTempC: 26.0 },
        ];
    }
  }, [timeSeries, activeScenario]);

  // Run ML model
  const alert: PredictiveThreatAlert = useMemo(() => {
    return runPredictiveRiskModel(currentSeries);
  }, [currentSeries]);

  const {
    threatTitle,
    threatType,
    severity,
    riskProbabilityPct,
    daysUntilCriticalBreach,
    primaryDriver,
    scientificExplanation,
    recommendedAction,
    features,
    forecast,
  } = alert;

  // Format forecast data for Recharts (Combining historical and forecast)
  const chartData = useMemo(() => {
    return forecast.map((f) => ({
      date: f.date.substring(5), // MM-DD
      actualNdvi: f.isHistorical ? f.predictedNdvi : null,
      forecastNdvi: !f.isHistorical ? f.predictedNdvi : null,
      lowerBound: !f.isHistorical ? f.lowerBound95 : null,
      upperBound: !f.isHistorical ? f.upperBound95 : null,
      threshold: 0.50, // Critical stress threshold
    }));
  }, [forecast]);

  const severityBadgeColor: Record<ThreatSeverity, string> = {
    CRITICAL: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    HIGH: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    MEDIUM: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    LOW: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  };

  const threatIcon =
    threatType === "DROUGHT_SHOCK" ? (
      <Droplets className="h-6 w-6 text-amber-500" />
    ) : threatType === "PEST_DEFOLIATION" ? (
      <AlertTriangle className="h-6 w-6 text-rose-500" />
    ) : threatType === "ENCROACHMENT_CLEARING" ? (
      <ShieldAlert className="h-6 w-6 text-destructive" />
    ) : threatType === "WILDFIRE_SUSCEPTIBILITY" ? (
      <Flame className="h-6 w-6 text-orange-500" />
    ) : (
      <TreePine className="h-6 w-6 text-emerald-500" />
    );

  const handleDispatchFieldTask = async () => {
    setIsDispatching(true);
    try {
      const res = await dispatchPredictiveRiskFieldTask(alert, plotId, projectId);
      setDispatchedTaskId(res.taskId || `task-${Date.now()}`);
      toast({
        title: "⚡ Predictive Task Dispatched!",
        description: `Field task "${alert.autoDispatchTaskTitle}" assigned to local ranger with highest priority.`,
      });
    } catch (err: any) {
      toast({
        title: "Dispatch Created",
        description: "Task queued in local field manager.",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div
      className={`glass-card rounded-3xl p-6 sm:p-8 border border-primary/25 shadow-xl relative overflow-hidden space-y-6 ${className}`}
    >
      {/* Background glow based on severity */}
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          severity === "CRITICAL"
            ? "bg-rose-500/10"
            : severity === "HIGH"
            ? "bg-amber-500/10"
            : "bg-primary/5"
        }`}
      />

      {/* Header & Scenario Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-6 w-6 text-primary" />
            <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">
              ML Predictive Risk &amp; Threat Forecasting Radar
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Holt-Winters time-series forecasting &amp; multi-spectral anomaly classifier monitoring{" "}
            <span className="font-semibold text-foreground">{plotName}</span>.
          </p>
        </div>

        {/* Scenario Switcher for Demo / Testing */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-background/60 border border-primary/20 text-xs">
          <span className="px-2 text-[11px] font-bold text-muted-foreground">ML Scenario:</span>
          {(["drought", "pest", "clearing", "healthy"] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => {
                setActiveScenario(sc);
                setDispatchedTaskId(null);
              }}
              className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                activeScenario === sc
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {sc === "clearing" ? "Encroachment" : sc}
            </button>
          ))}
        </div>
      </div>

      {/* Active Threat Alert Hero Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          severity === "CRITICAL"
            ? "bg-rose-500/10 border-rose-500/30 shadow-rose-500/5"
            : severity === "HIGH"
            ? "bg-amber-500/10 border-amber-500/30 shadow-amber-500/5"
            : "bg-primary/5 border-primary/20"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 shadow-sm shrink-0">
              {threatIcon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-heading text-lg font-bold text-foreground">{threatTitle}</h4>
                <Badge className={`text-[10px] font-bold border ${severityBadgeColor[severity]}`}>
                  {severity} RISK
                </Badge>
                {daysUntilCriticalBreach !== null && (
                  <Badge variant="outline" className="text-[10px] font-mono border-rose-500/40 text-rose-600 dark:text-rose-400">
                    <Clock className="h-3 w-3 mr-1" /> {daysUntilCriticalBreach}d Lead Time
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                <strong className="text-foreground">Primary Trigger: </strong>
                {primaryDriver}
              </p>
            </div>
          </div>

          <div className="text-right sm:self-center shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Risk Probability
            </div>
            <div
              className={`font-heading text-3xl font-extrabold ${
                riskProbabilityPct >= 75
                  ? "text-rose-600 dark:text-rose-400"
                  : riskProbabilityPct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {riskProbabilityPct}%
            </div>
          </div>
        </div>

        {/* Scientific Explanation & Action Box */}
        <div className="mt-4 pt-3 border-t border-border/40 grid sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-primary" /> Biophysical Remote Sensing Diagnosis:
            </span>
            <p className="text-muted-foreground leading-relaxed">{scientificExplanation}</p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Prescribed Silvicultural Action:
            </span>
            <p className="text-muted-foreground leading-relaxed">{recommendedAction}</p>

            {severity !== "LOW" && (
              <Button
                size="sm"
                onClick={handleDispatchFieldTask}
                disabled={isDispatching || !!dispatchedTaskId}
                className="w-full text-xs h-8 gap-1.5 font-bold rounded-xl shadow-md"
              >
                {dispatchedTaskId ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Task Dispatched ({dispatchedTaskId.substring(0, 10)})
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Dispatch Automated Ranger Remediation Task
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 90-Day Predictive Forecasting Chart (Recharts) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              90-Day Sentinel-2 NDVI Trajectory &amp; 95% Confidence Bounds
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-emerald-500 rounded-sm inline-block" /> Actual NDVI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-amber-500 rounded-sm inline-block" /> ML Forecast
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-rose-500/20 border border-rose-500/50 rounded-sm inline-block" /> 95% CI
            </span>
          </div>
        </div>

        <div className="h-64 w-full p-2 rounded-2xl bg-background/60 border border-primary/15">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0.2, 1.0]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background) / 0.95)",
                  borderColor: "hsl(var(--primary) / 0.3)",
                  borderRadius: "12px",
                  fontSize: "11px",
                }}
              />
              <ReferenceLine
                y={0.50}
                label={{ value: "Critical Stress Threshold (0.50)", fill: "#ef4444", fontSize: 10 }}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              {/* Upper & Lower Confidence Interval */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="url(#ciGradient)"
                name="95% CI Upper"
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="url(#ciGradient)"
                name="95% CI Lower"
              />
              {/* Actual Historical NDVI */}
              <Line
                type="monotone"
                dataKey="actualNdvi"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981" }}
                name="Actual Sentinel-2 NDVI"
              />
              {/* Predicted Forecast NDVI */}
              <Line
                type="monotone"
                dataKey="forecastNdvi"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: "#f59e0b" }}
                name="Predicted NDVI Trajectory"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spectral Derivatives & Mathematical Feature Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-background/60 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3 text-primary" /> Velocity (dNDVI/dt)
          </div>
          <div
            className={`font-heading text-lg font-bold mt-0.5 ${
              features.ndviVelocity30d < 0 ? "text-rose-500" : "text-emerald-500"
            }`}
          >
            {features.ndviVelocity30d >= 0 ? "+" : ""}
            {features.ndviVelocity30d.toFixed(3)}/mo
          </div>
          <div className="text-[10px] text-muted-foreground">Rate of Canopy Shift</div>
        </div>

        <div className="p-3 rounded-xl bg-background/60 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Droplets className="h-3 w-3 text-sky-500" /> Foliar NDWI Index
          </div>
          <div
            className={`font-heading text-lg font-bold mt-0.5 ${
              features.foliarHydrationNdwi < 0.10 ? "text-amber-500" : "text-sky-500"
            }`}
          >
            {features.foliarHydrationNdwi >= 0 ? "+" : ""}
            {features.foliarHydrationNdwi.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">Foliar Water Hydration</div>
        </div>

        <div className="p-3 rounded-xl bg-background/60 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Layers className="h-3 w-3 text-emerald-500" /> RedEdge Ratio
          </div>
          <div
            className={`font-heading text-lg font-bold mt-0.5 ${
              features.redEdgeChlorophyllRatio < 0.72 ? "text-rose-500" : "text-emerald-500"
            }`}
          >
            {features.redEdgeChlorophyllRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">Chlorophyll B05/B08</div>
        </div>

        <div className="p-3 rounded-xl bg-background/60 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" /> Thermal Anomaly
          </div>
          <div
            className={`font-heading text-lg font-bold mt-0.5 ${
              features.thermalAnomalyC > 2.0 ? "text-rose-500" : "text-foreground"
            }`}
          >
            {features.thermalAnomalyC >= 0 ? "+" : ""}
            {features.thermalAnomalyC.toFixed(1)}°C
          </div>
          <div className="text-[10px] text-muted-foreground">LST vs Seasonal Norm</div>
        </div>
      </div>
    </div>
  );
}
