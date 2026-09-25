import React from "react";
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  Cpu,
} from "lucide-react";
import {
  ScheduleExecutionLog,
  MonitoringSchedule,
  monitoringScheduleService,
} from "../../services/monitoringScheduleService";

interface ScheduleExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: MonitoringSchedule | null;
}

export const ScheduleExecutionHistoryModal: React.FC<ScheduleExecutionHistoryModalProps> = ({
  isOpen,
  onClose,
  schedule,
}) => {
  if (!isOpen) return null;

  const logs = monitoringScheduleService.getExecutionLogs(schedule?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {schedule ? `Execution History: ${schedule.name}` : "Global Monitoring Execution History"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Chronological log of automated cron passes, manual dispatches, and telemetry outcomes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs Stream */}
        <div className="p-6 overflow-y-auto space-y-3 text-xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl">
              No executions logged yet for this monitoring schedule. Click "Run Now" to trigger a run.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.executionId}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {log.executionId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {log.status}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {log.scheduleName}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.triggeredAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {log.executionDetails}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span>
                    Trigger: <strong className="text-zinc-700 dark:text-zinc-300 uppercase">{log.triggerType.replace(/_/g, " ")}</strong>
                  </span>
                  <span>
                    Duration: <strong className="text-zinc-700 dark:text-zinc-300">{log.durationMs}ms</strong>
                  </span>
                  <span>
                    Quota Processed: <strong className="text-zinc-700 dark:text-zinc-300">{log.itemsProcessed}</strong>
                  </span>
                  <span>
                    Anomalies: <strong className="text-zinc-700 dark:text-zinc-300">{log.anomaliesDetected}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
