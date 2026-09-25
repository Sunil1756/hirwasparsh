import React from "react";
import {
  UploadCloud,
  Cpu,
  UserCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  PipelineStage,
  PipelineStageCount,
} from "../../services/verificationDashboardService";

interface VerificationPipelineFunnelProps {
  stages: PipelineStageCount[];
  activeStageFilter: PipelineStage | "all";
  onSelectStage: (stage: PipelineStage | "all") => void;
}

export const VerificationPipelineFunnel: React.FC<VerificationPipelineFunnelProps> = ({
  stages,
  activeStageFilter,
  onSelectStage,
}) => {
  const getStageIcon = (stage: PipelineStage) => {
    switch (stage) {
      case "stage_1_submission":
        return <UploadCloud className="w-5 h-5 text-blue-500" />;
      case "stage_2_automated_screening":
        return <Cpu className="w-5 h-5 text-purple-500" />;
      case "stage_3_reviewer_triage":
        return <UserCheck className="w-5 h-5 text-amber-500" />;
      case "stage_4_final_decision":
        return <Award className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getStageAccent = (stage: PipelineStage, isSelected: boolean) => {
    if (isSelected) {
      return "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/20";
    }
    switch (stage) {
      case "stage_1_submission":
        return "border-blue-500/30 hover:border-blue-500/60 bg-blue-950/10";
      case "stage_2_automated_screening":
        return "border-purple-500/30 hover:border-purple-500/60 bg-purple-950/10";
      case "stage_3_reviewer_triage":
        return "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10";
      case "stage_4_final_decision":
        return "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10";
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          4-Stage MRV Verification Pipeline Flow
        </div>
        {activeStageFilter !== "all" && (
          <button
            onClick={() => onSelectStage("all")}
            className="text-xs text-emerald-400 hover:underline font-medium"
          >
            Clear Stage Filter (Show All)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
        {stages.map((st, idx) => {
          const isSelected = activeStageFilter === st.stage;
          return (
            <div
              key={st.stage}
              onClick={() => onSelectStage(isSelected ? "all" : st.stage)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${getStageAccent(
                st.stage,
                isSelected
              )}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                    {getStageIcon(st.stage)}
                  </div>
                  <span className="text-xs font-bold text-zinc-200">
                    {st.label}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  {st.throughputPercent}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-3">
                <div className="text-2xl font-black text-white">
                  {st.totalCount}
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {idx === 0
                    ? "Received"
                    : idx === 1
                    ? "Screened"
                    : idx === 2
                    ? "In Review"
                    : "Finalized"}
                </span>
              </div>

              {/* Sub-counts breakdown */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1 text-[11px] text-zinc-400">
                {Object.entries(st.subCounts).map(([key, count]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="capitalize text-zinc-400">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
