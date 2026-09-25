import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  monitoringTaskService,
  MonitoringTask,
} from "../../services/monitoringTaskService";

interface TaskEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: MonitoringTask | null;
  onEscalated?: (task: MonitoringTask) => void;
}

export const TaskEscalationModal: React.FC<TaskEscalationModalProps> = ({
  isOpen,
  onClose,
  task,
  onEscalated,
}) => {
  const [escalatedTo, setEscalatedTo] = useState("Senior MRV Operations Lead (Dr. A. Deshmukh)");
  const [escalationReason, setEscalationReason] = useState(
    "Field inspection exceeded SLA grace period due to terrain access delays. Escalated for emergency dispatch."
  );

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatedTo.trim() || !escalationReason.trim()) return;

    const updated = monitoringTaskService.escalateTask(
      task.id,
      escalatedTo,
      escalationReason
    );

    if (onEscalated) onEscalated(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                SLA Breach & Task Escalation
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {task.id} • {task.title}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">SLA Breach Alert:</strong>
              This work order is overdue by {task.overdueDurationHours} hours (SLA Grace Period: {task.gracePeriodDays} days).
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Escalate To Authority / Supervisor
            </label>
            <input
              type="text"
              required
              value={escalatedTo}
              onChange={(e) => setEscalatedTo(e.target.value)}
              placeholder="e.g. Regional Lead Auditor"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Escalation Justification & Mitigation Plan
            </label>
            <textarea
              rows={3}
              required
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Detail reasons for delay, weather constraints, or resource bottlenecks..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-sm"
            >
              Confirm Escalation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
