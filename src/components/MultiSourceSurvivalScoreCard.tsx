import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Satellite,
  TreePine,
  Activity,
  Droplets,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  calculateMultiSourceSurvivalConfidence,
  MultiSourceSurvivalResult,
  CalculateSurvivalParams,
} from "@/lib/multiSourceSurvivalFusion";

interface Props {
  initialParams?: CalculateSurvivalParams;
  projectName?: string;
  onRefresh?: () => void;
  className?: string;
}

export function MultiSourceSurvivalScoreCard({
  initialParams,
  projectName = "Maharashtra Agroforestry Sector 4",
  onRefresh,
  className = "",
}: Props) {
  const [isInteractiveSimulator, setIsInteractiveSimulator] = useState(false);

  // Simulator parameters
  const [totalTrees, setTotalTrees] = useState(initialParams?.totalPlantedTrees || 500);
  const [living, setLiving] = useState(initialParams?.livingCount ?? 46);
  const [stressed, setStressed] = useState(initialParams?.stressedCount ?? 3);
  const [dead, setDead] = useState(initialParams?.deadCount ?? 1);
  const [ndvi, setNdvi] = useState(initialParams?.currentMeanNdvi ?? 0.76);
  const [overpasses, setOverpasses] = useState(initialParams?.overpassCount ?? 5);
  const [daysSinceAudit, setDaysSinceAudit] = useState(12);

  // Compute live multi-source fusion result
  const fusionResult: MultiSourceSurvivalResult = useMemo(() => {
    const fakeLastDate = new Date(Date.now() - daysSinceAudit * 86400000).toISOString();

    return calculateMultiSourceSurvivalConfidence({
      totalPlantedTrees: totalTrees,
      livingCount: living,
      stressedCount: stressed,
      deadCount: dead,
      currentMeanNdvi: ndvi,
      baselineNdvi: 0.65,
      overpassCount: overpasses,
      lastAuditDate: fakeLastDate,
      weatherSuitabilityScore: 88,
    });
  }, [totalTrees, living, stressed, dead, ndvi, overpasses, daysSinceAudit]);

  const {
    overallConfidenceScore,
    survivalRatePct,
    healthStatusLabel,
    tierLabel,
    tierColor,
    isCarbonMRVReady,
    breakdown,
    recommendedInterventions,
    diagnosis,
  } = fusionResult;

  // Arc stroke offset calculation for 100-point circle gauge
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallConfidenceScore / 100) * circumference;

  return (
    <div
      className={`glass-card rounded-3xl p-6 sm:p-8 border border-primary/25 shadow-xl relative overflow-hidden space-y-6 ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">
              Multi-Source Fusion Survival Confidence Score
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cryptographically weighted 3-Pillar MRV combining Sentinel-2 NDVI telemetry & 5% ground truth ranger audits for{" "}
            <span className="font-semibold text-foreground">{projectName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInteractiveSimulator(!isInteractiveSimulator)}
            className="text-xs gap-1.5 rounded-xl border-primary/30 hover:bg-primary/10"
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            {isInteractiveSimulator ? "Hide Simulator" : "Interactive Simulator"}
          </Button>

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
              title="Refresh Live Data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Score Hero Display */}
      <div className="grid md:grid-cols-[220px_1fr] gap-6 items-center">
        {/* Radial Confidence Dial */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background/60 border border-primary/15 relative">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-muted/30 stroke-current"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                className={`stroke-current ${
                  overallConfidenceScore >= 80
                    ? "text-amber-500"
                    : overallConfidenceScore >= 60
                    ? "text-emerald-500"
                    : "text-blue-500"
                }`}
                strokeWidth="8"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-heading text-3xl font-extrabold tracking-tight">
                {overallConfidenceScore}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Confidence
              </span>
            </div>
          </div>

          <Badge className={`mt-3 text-[10px] font-semibold border ${tierColor}`}>
            {tierLabel}
          </Badge>
        </div>

        {/* Key Survival Highlights */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex-1 min-w-[160px]">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                <TreePine className="h-3.5 w-3.5 text-primary" /> Fused Tree Survival Rate
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {survivalRatePct}%
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {healthStatusLabel}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex-1 min-w-[160px]">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                <Satellite className="h-3.5 w-3.5 text-sky-500" /> Sentinel-2 Mean NDVI
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {breakdown.satelliteNdvi.stats.meanNdvi.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                ΔNDVI: {breakdown.satelliteNdvi.stats.ndviDelta >= 0 ? "+" : ""}
                {breakdown.satelliteNdvi.stats.ndviDelta.toFixed(3)} ({breakdown.satelliteNdvi.stats.trend})
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex-1 min-w-[160px]">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                <Award className="h-3.5 w-3.5 text-amber-500" /> 5% Ground Audit Quota
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {breakdown.groundTruth.stats.totalAudited} / {breakdown.groundTruth.stats.targetAuditQuota}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {breakdown.groundTruth.stats.samplingCoveragePct}% Sampled ({breakdown.groundTruth.stats.groundSurvivalRatePct}% Ground Rate)
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed bg-primary/5 p-3 rounded-xl border border-primary/10">
            <span className="font-semibold text-foreground">Scientific Diagnosis: </span>
            {diagnosis}
          </p>
        </div>
      </div>

      {/* 3-Pillar Breakdown Progress Cards */}
      <div className="grid sm:grid-cols-3 gap-4 pt-2">
        {/* Pillar 1: Ground Truth */}
        <div className="p-4 rounded-2xl bg-background/50 border border-primary/15 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <TreePine className="h-4 w-4 text-emerald-500" /> Ground Truth Audits
            </div>
            <span className="text-xs font-bold text-primary">
              {breakdown.groundTruth.score} / {breakdown.groundTruth.maxScore} pts
            </span>
          </div>
          <Progress
            value={(breakdown.groundTruth.score / breakdown.groundTruth.maxScore) * 100}
            className="h-2 bg-primary/10"
          />
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {breakdown.groundTruth.summary}
          </p>
        </div>

        {/* Pillar 2: Sentinel-2 NDVI */}
        <div className="p-4 rounded-2xl bg-background/50 border border-primary/15 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Satellite className="h-4 w-4 text-sky-500" /> Sentinel-2 NDVI Vigor
            </div>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {breakdown.satelliteNdvi.score} / {breakdown.satelliteNdvi.maxScore} pts
            </span>
          </div>
          <Progress
            value={(breakdown.satelliteNdvi.score / breakdown.satelliteNdvi.maxScore) * 100}
            className="h-2 bg-sky-500/20"
          />
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {breakdown.satelliteNdvi.summary}
          </p>
        </div>

        {/* Pillar 3: Weather & Time Decay */}
        <div className="p-4 rounded-2xl bg-background/50 border border-primary/15 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" /> Weather & Time Decay
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {breakdown.environmental.score} pts{" "}
              {breakdown.timeDecay.isDecayed && (
                <span className="text-rose-500">(-{breakdown.timeDecay.penaltyPoints})</span>
              )}
            </span>
          </div>
          <Progress
            value={(breakdown.environmental.score / breakdown.environmental.maxScore) * 100}
            className="h-2 bg-amber-500/20"
          />
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {breakdown.timeDecay.summary}
          </p>
        </div>
      </div>

      {/* Recommended Silvicultural Interventions */}
      {recommendedInterventions.length > 0 && (
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
          <div className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Recommended Silvicultural Actions
          </div>
          <ul className="space-y-1.5">
            {recommendedInterventions.map((action, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive Parameter Simulator Drawer */}
      {isInteractiveSimulator && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-primary/15 pb-2">
            <h4 className="font-heading text-sm font-bold flex items-center gap-2 text-primary">
              <Sliders className="h-4 w-4" /> Live Multi-Source Parameter Simulator
            </h4>
            <span className="text-[11px] text-muted-foreground">Adjust inputs to test fusion math</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Total Trees & Living */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Living Trees Audited:</span>
                <span className="font-bold text-primary">{living} trees</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[living]}
                onValueChange={([val]) => setLiving(val)}
              />
            </div>

            {/* Stressed Trees */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Moisture-Stressed Saplings (0.5 wt):</span>
                <span className="font-bold text-amber-500">{stressed} trees</span>
              </div>
              <Slider
                min={0}
                max={30}
                step={1}
                value={[stressed]}
                onValueChange={([val]) => setStressed(val)}
              />
            </div>

            {/* Dead Trees */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Confirmed Dead Trees:</span>
                <span className="font-bold text-rose-500">{dead} trees</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[dead]}
                onValueChange={([val]) => setDead(val)}
              />
            </div>

            {/* Sentinel-2 NDVI */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Sentinel-2 Mean NDVI:</span>
                <span className="font-bold text-emerald-600">{ndvi.toFixed(2)}</span>
              </div>
              <Slider
                min={0.2}
                max={0.95}
                step={0.01}
                value={[ndvi]}
                onValueChange={([val]) => setNdvi(val)}
              />
            </div>

            {/* Overpasses Count */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Satellite Overpasses:</span>
                <span className="font-bold text-sky-600">{overpasses} passes</span>
              </div>
              <Slider
                min={0}
                max={12}
                step={1}
                value={[overpasses]}
                onValueChange={([val]) => setOverpasses(val)}
              />
            </div>

            {/* Days Since Last Audit */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Days Since Last Field Audit:</span>
                <span className={`font-bold ${daysSinceAudit > 30 ? "text-rose-500" : "text-foreground"}`}>
                  {daysSinceAudit} days {daysSinceAudit > 30 ? "(Decayed)" : ""}
                </span>
              </div>
              <Slider
                min={1}
                max={90}
                step={1}
                value={[daysSinceAudit]}
                onValueChange={([val]) => setDaysSinceAudit(val)}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
