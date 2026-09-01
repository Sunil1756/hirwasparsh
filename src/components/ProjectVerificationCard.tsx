import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Bot,
  Activity,
  Trees,
  MapPin,
  Satellite,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ProjectAuditReport,
  DiagnosticCheckResult,
} from "@/lib/projectVerification";

interface Props {
  auditReport: ProjectAuditReport;
  onReaudit?: () => void;
  onRequestManualAudit?: () => void;
  isReauditing?: boolean;
}

export const ProjectVerificationCard = ({
  auditReport,
  onReaudit,
  onRequestManualAudit,
  isReauditing = false,
}: Props) => {
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-amber-500 stroke-amber-500 bg-amber-500/10 border-amber-500/30";
    return "text-rose-500 stroke-rose-500 bg-rose-500/10 border-rose-500/30";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified_active":
        return { label: "Verified Active ✓", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
      case "evidence_required":
        return { label: "Evidence Required 📸", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
      case "under_review":
        return { label: "Under Review ⏳", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
      case "rejected_fraud":
      default:
        return { label: "Flagged / Infeasible ⚠️", className: "bg-rose-500/15 text-rose-600 border-rose-500/30" };
    }
  };

  const statusBadge = getStatusBadge(auditReport.status);

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
      {/* Header & Trust Score Meter */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold">Automated AI Verification & Anti-Fraud Audit</h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Multi-spectral remote sensing, biological sapling density feasibility, and cadastral sanity screening.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`font-semibold px-3 py-1 text-xs border ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
          {onReaudit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReaudit}
              disabled={isReauditing}
              className="h-8 text-xs rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isReauditing ? "animate-spin" : ""}`} /> Re-Audit
            </Button>
          )}
        </div>
      </div>

      {/* Main Scorecard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-card border border-primary/20">
        {/* Score Radial Block */}
        <div className="flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 md:border-r border-border/40">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={getScoreColor(auditReport.overallScore).split(" ")[0]}
                strokeDasharray={`${auditReport.overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="font-heading font-extrabold text-xl">{auditReport.overallScore}</span>
              <span className="text-[10px] text-muted-foreground block -mt-1">/100</span>
            </div>
          </div>
          <span className="text-xs font-bold mt-2">Project Trust Score</span>
        </div>

        {/* Telemetry Metrics */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Planting Density</span>
            <strong className="text-sm font-bold text-foreground">{auditReport.treesPerAcre} / acre</strong>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Plot: {auditReport.acres} Acres</span>
          </div>

          <div className="p-3 rounded-xl bg-background/80 border border-border/40">
            <span className="text-[11px] text-muted-foreground block">Pre-Plant Baseline NDVI</span>
            <strong className="text-sm font-bold text-primary">{auditReport.baselineNdvi} (t₀)</strong>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Sentinel-2 Reflectance</span>
          </div>

          <div className="p-3 rounded-xl bg-background/80 border border-border/40 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-muted-foreground block">Carbon Credit Additionality</span>
            <strong className="text-sm font-bold text-emerald-600">{auditReport.carbonEligibility}</strong>
            <span className="text-[10px] text-muted-foreground block mt-0.5">IPCC Tier-2 Model</span>
          </div>

          <div className="col-span-2 sm:col-span-3 pt-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{auditReport.statusDescription}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4 Diagnostic Check Tiers */}
      <div className="space-y-3">
        <h4 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Diagnostic Audit Tiers
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {auditReport.checks.map((check) => {
            const isPass = check.status === "pass";
            const isWarn = check.status === "warn";
            const isFail = check.status === "fail";

            return (
              <div
                key={check.id}
                className={`p-4 rounded-xl border transition-all ${
                  isPass
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : isWarn
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-rose-500/30 bg-rose-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPass && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {isWarn && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                    {isFail && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                    <h5 className="font-heading font-semibold text-xs text-foreground">{check.name}</h5>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPass
                        ? "bg-emerald-500/15 text-emerald-600"
                        : isWarn
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {check.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs font-medium text-foreground mt-2">{check.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{check.details}</p>

                {check.metric && (
                  <div className="mt-2.5 pt-2 border-t border-border/30 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                    <span>Telemetric Metric:</span>
                    <span className="font-bold text-foreground">{check.metric}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
