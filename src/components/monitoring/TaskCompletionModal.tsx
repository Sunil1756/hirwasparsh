import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Camera,
  Layers,
} from "lucide-react";
import {
  monitoringTaskService,
  MonitoringTask,
} from "../../services/monitoringTaskService";

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: MonitoringTask | null;
  onCompleted?: (task: MonitoringTask) => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  isOpen,
  onClose,
  task,
  onCompleted,
}) => {
  const [completedBy, setCompletedBy] = useState("Field Ranger Squad Alpha");
  const [completionSummary, setCompletionSummary] = useState(
    "All scheduled sample quadrats audited. DBH and height measurements recorded with geotagged photo proof."
  );
  const [itemsProcessed, setItemsProcessed] = useState(task?.targetQuota || 45);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedBy.trim() || !completionSummary.trim()) return;

    const completed = monitoringTaskService.completeTask(task.id, {
      completedBy,
      completionSummary,
      itemsProcessed: Number(itemsProcessed),
      evidenceArtifacts: {
        timestamp: new Date().toISOString(),
        verifiedQuota: Number(itemsProcessed),
        surveyor: completedBy,
      },
    });

    if (onCompleted) onCompleted(completed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Complete Monitoring Work Order
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
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">
              {task.projectName}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              Assigned to: <strong className="text-zinc-700 dark:text-zinc-300">{task.assignedTo}</strong> • Target Quota: <strong className="text-zinc-700 dark:text-zinc-300">{task.targetQuota} {task.quotaUnit}</strong>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Completed By (Surveyor / Operator Name)
            </label>
            <input
              type="text"
              required
              value={completedBy}
              onChange={(e) => setCompletedBy(e.target.value)}
              placeholder="e.g. Lead Ranger R. Shinde (Squad Alpha)"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Actual Items / Quota Processed ({task.quotaUnit})
            </label>
            <input
              type="number"
              min={1}
              required
              value={itemsProcessed}
              onChange={(e) => setItemsProcessed(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Field Completion Summary & Evidence Notes
            </label>
            <textarea
              rows={3}
              required
              value={completionSummary}
              onChange={(e) => setCompletionSummary(e.target.value)}
              placeholder="Describe observations, survival findings, or raster tiles verified..."
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm"
            >
              Submit & Complete Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
