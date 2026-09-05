import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TreePine,
  ShieldCheck,
  Droplets,
  Info,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  computeProjectSurvivalModel,
  QuarterlyScanRecord,
  ProjectSurvivalModel,
} from "@/lib/survivalTracking";

interface Props {
  projectName: string;
  organizationName: string;
  targetTrees: number;
  existingTrees?: number;
  plantationDate: string;
  baselineNdvi?: number;
  groundAuditRate?: number;
  speciesList?: string[];
}

export const QuarterlySurvivalFeed = ({
  projectName,
  organizationName,
  targetTrees,
  existingTrees = 0,
  plantationDate,
  baselineNdvi = 0.22,
  groundAuditRate = 95,
  speciesList = ["Neem", "Banyan", "Peepal"],
}: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const survivalModel: ProjectSurvivalModel = useMemo(() => {
    return computeProjectSurvivalModel({
      targetTrees,
      existingTrees,
      plantationDate,
      baselineNdvi,
      groundAuditRate,
      speciesList,
    });
  }, [targetTrees, existingTrees, plantationDate, baselineNdvi, groundAuditRate, speciesList]);

  const copyDonorUpdate = () => {
    navigator.clipboard.writeText(survivalModel.donorUpdateSnippet);
    setCopied(true);
    toast({
      title: "Donor Update Copied! 📋",
      description: "Formatted quarterly progress summary copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">Continuous Tree Survival Tracking & Quarterly Feed</h3>
              <p className="text-xs text-muted-foreground">
                Multi-year ΔNDVI satellite trajectory cross-referenced with ground truth ranger audits over 36 months.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyDonorUpdate}
            className="h-8 text-xs rounded-xl gap-1.5 font-semibold"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copied Update" : "Export Donor Update"}
          </Button>
        </div>
      </div>

      {/* Top 4 Real-time Survival Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Project Tree Survival Rate</span>
          <strong className="text-xl font-bold font-heading text-emerald-600">
            {survivalModel.currentSurvivalPercent}%
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">Applied to {targetTrees.toLocaleString()} Planted</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Living Tree Census</span>
          <strong className="text-xl font-bold font-heading text-foreground">
            {survivalModel.estimatedLivingTrees.toLocaleString()}
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {existingTrees > 0
              ? `+ ${existingTrees.toLocaleString()} Pre-Existing (${survivalModel.totalLivingCanopyTrees.toLocaleString()} Total)`
              : `of ${targetTrees.toLocaleString()} target`}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Carbon Sequestered</span>
          <strong className="text-xl font-bold font-heading text-primary">
            {survivalModel.accumulatedCo2MT} MT CO₂e
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">IPCC Biomass Growth</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Mortality Risk Assessment</span>
          <strong className="text-sm font-bold block text-emerald-600">
            {survivalModel.mortalityRiskLevel}
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">{survivalModel.riskDescription}</span>
        </div>
      </div>

      {/* Visual Survival Curve Chart */}
      <div className="p-5 rounded-2xl bg-card border border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" /> 36-Month Survival & NDVI Telemetry Curve
          </h4>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Survival Index (%)
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2 w-2 rounded-full bg-primary" /> Sentinel-2 NDVI (x100)
            </span>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="h-48 w-full pt-2">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 600 160">
            {/* Grid Lines */}
            <line x1="40" y1="20" x2="580" y2="20" stroke="currentColor" strokeOpacity="0.08" />
            <line x1="40" y1="60" x2="580" y2="60" stroke="currentColor" strokeOpacity="0.08" />
            <line x1="40" y1="100" x2="580" y2="100" stroke="currentColor" strokeOpacity="0.08" />
            <line x1="40" y1="140" x2="580" y2="140" stroke="currentColor" strokeOpacity="0.15" />

            {/* Y Axis Labels */}
            <text x="5" y="24" fontSize="9" fill="currentColor" opacity="0.5">100%</text>
            <text x="10" y="64" fontSize="9" fill="currentColor" opacity="0.5">80%</text>
            <text x="10" y="104" fontSize="9" fill="currentColor" opacity="0.5">60%</text>
            <text x="10" y="144" fontSize="9" fill="currentColor" opacity="0.5">40%</text>

            {/* Area Fill for Survival */}
            <path
              d={`M 40,${160 - (survivalModel.quarterlyTimeline[0].calibratedSurvivalRate / 100) * 140} ${survivalModel.quarterlyTimeline
                .map((q, i) => `L ${40 + i * 45},${160 - (q.calibratedSurvivalRate / 100) * 140}`)
                .join(" ")} L ${40 + 12 * 45},140 L 40,140 Z`}
              fill="rgba(16, 185, 129, 0.08)"
            />

            {/* Survival Polyline */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={survivalModel.quarterlyTimeline
                .map((q, i) => `${40 + i * 45},${160 - (q.calibratedSurvivalRate / 100) * 140}`)
                .join(" ")}
            />

            {/* NDVI Polyline */}
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              points={survivalModel.quarterlyTimeline
                .map((q, i) => `${40 + i * 45},${160 - q.observedNdvi * 140}`)
                .join(" ")}
            />

            {/* Data Points */}
            {survivalModel.quarterlyTimeline.map((q, i) => {
              const x = 40 + i * 45;
              const ySurv = 160 - (q.calibratedSurvivalRate / 100) * 140;
              const isSelected = selectedQuarter === q.quarter;

              return (
                <g key={q.quarter} onClick={() => setSelectedQuarter(isSelected ? null : q.quarter)} className="cursor-pointer">
                  <circle
                    cx={x}
                    cy={ySurv}
                    r={isSelected ? 5 : 3.5}
                    fill={isSelected ? "#10b981" : "#fff"}
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <text x={x} y="155" fontSize="8" textAnchor="middle" fill="currentColor" opacity="0.6">
                    {q.quarter.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 12-Quarter Telemetry Feed Table */}
      <div className="space-y-3">
        <h4 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          Quarterly Monitoring & Telemetry Feed
        </h4>

        <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
          <div className="divide-y divide-border/30 text-xs">
            {survivalModel.quarterlyTimeline.map((q) => {
              const isSelected = selectedQuarter === q.quarter;
              const isStress = q.status === "mild_stress";

              return (
                <div key={q.quarter} className="transition-colors hover:bg-muted/30">
                  <div
                    onClick={() => setSelectedQuarter(isSelected ? null : q.quarter)}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-bold text-foreground text-xs w-20">{q.quarter}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{q.scanDate}</span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">NDVI</span>
                        <strong className="font-bold text-foreground">{q.observedNdvi}</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Canopy</span>
                        <strong className="font-bold text-foreground">{q.canopyCoverPercent}%</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Survival</span>
                        <strong className="font-bold text-emerald-600">{q.calibratedSurvivalRate}%</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Trees</span>
                        <strong className="font-bold text-foreground">{q.estimatedLivingTrees.toLocaleString()}</strong>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isStress
                            ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                            : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                        }`}
                      >
                        {isStress ? "Dry Spell ⚠️" : "Optimal ✓"}
                      </Badge>

                      {isSelected ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Quarter Diagnostic View */}
                  {isSelected && (
                    <div className="p-4 bg-muted/20 border-t border-border/30 text-xs space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">{q.notes}</p>
                          {q.actionRequired && (
                            <p className="text-amber-600 font-medium mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Recommended Field Action: {q.actionRequired}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-muted-foreground">
                        <div>Expected Baseline NDVI: <strong>{q.expectedNdvi}</strong></div>
                        <div>Delta Growth: <strong className="text-emerald-600">+{q.deltaNdvi}</strong></div>
                        <div>Cumulative Carbon: <strong className="text-primary">{q.co2SequesteredMT} MT</strong></div>
                        <div>Ground Sample Sync: <strong className="text-foreground">{groundAuditRate}% Validated</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
