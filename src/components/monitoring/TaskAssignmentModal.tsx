import React, { useState, useEffect } from "react";
import {
  X,
  ClipboardList,
  Calendar,
  AlertCircle,
  UserCheck,
  Plane,
  Satellite,
  CloudRain,
  TreePine,
  Check,
} from "lucide-react";
import {
  monitoringTaskService,
  MonitoringTask,
  TaskPriority,
} from "../../services/monitoringTaskService";
import { CadenceType } from "../../services/monitoringScheduleService";

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToReassign?: MonitoringTask | null;
  onSaved?: (task: MonitoringTask) => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  taskToReassign,
  onSaved,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("proj-sahayadri");
  const [projectName, setProjectName] = useState("Sahayadri Tiger Reserve Afforestation");
  const [cadenceType, setCadenceType] = useState<CadenceType>("ground_sample_psp");
  const [priority, setPriority] = useState<TaskPriority>("high");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16)
  );
  const [gracePeriodDays, setGracePeriodDays] = useState(5);
  const [assignedTo, setAssignedTo] = useState("Sahayadri Ranger Squad Alpha");
  const [targetQuota, setTargetQuota] = useState(45);
  const [quotaUnit, setQuotaUnit] = useState("quadrats");
  const [locationReference, setLocationReference] = useState("Sector 4B (Plots Q12-Q56)");

  useEffect(() => {
    if (taskToReassign) {
      setTitle(taskToReassign.title);
      setDescription(taskToReassign.description);
      setProjectId(taskToReassign.projectId);
      setProjectName(taskToReassign.projectName);
      setCadenceType(taskToReassign.cadenceType);
      setPriority(taskToReassign.priority);
      setDueDate(new Date(taskToReassign.dueDate).toISOString().slice(0, 16));
      setGracePeriodDays(taskToReassign.gracePeriodDays);
      setAssignedTo(taskToReassign.assignedTo);
      setTargetQuota(taskToReassign.targetQuota);
      setQuotaUnit(taskToReassign.quotaUnit);
      setLocationReference(taskToReassign.locationReference || "");
    } else {
      setTitle("Ground Truth PSP Audit Batch");
      setDescription("Dispatch field rangers for representative Cochran sample quadrat biometrics.");
      setProjectId("proj-sahayadri");
      setProjectName("Sahayadri Tiger Reserve Afforestation");
      setCadenceType("ground_sample_psp");
      setPriority("high");
      setDueDate(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
      setGracePeriodDays(5);
      setAssignedTo("Sahayadri Ranger Squad Alpha");
      setTargetQuota(45);
      setQuotaUnit("quadrats");
      setLocationReference("Sector 4B (Plots Q12-Q56)");
    }
  }, [taskToReassign, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo.trim()) return;

    if (taskToReassign) {
      const updated = monitoringTaskService.updateTask(taskToReassign.id, {
        title,
        description,
        assignedTo,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        gracePeriodDays,
        targetQuota,
        quotaUnit,
        locationReference,
      });
      if (onSaved) onSaved(updated);
    } else {
      const created = monitoringTaskService.createTask({
        title,
        description,
        projectId,
        projectName,
        cadenceType,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        gracePeriodDays,
        assignedTo,
        targetQuota,
        quotaUnit,
        locationReference,
      });
      if (onSaved) onSaved(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {taskToReassign ? "Reassign & Update Work Order" : "Dispatch New Monitoring Work Order"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Assign field squad or telemetry unit with SLA due dates and quota targets
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Work Order Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ground Truth PSP Audit — Stratified Quadrat Batch"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Target Project
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setProjectName(e.target.options[e.target.selectedIndex].text);
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="proj-sahayadri">Sahayadri Tiger Reserve Afforestation</option>
                <option value="proj-konkan">Konkan Coastal Mangrove Restoration</option>
                <option value="proj-marathwada">Marathwada Agroforestry Corridor</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none"
              >
                <option value="critical">CRITICAL (Immediate SLA)</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Assigned Squad / Operator
              </label>
              <input
                type="text"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="e.g. Sahayadri Ranger Squad Alpha"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Sector / Location Reference
              </label>
              <input
                type="text"
                value={locationReference}
                onChange={(e) => setLocationReference(e.target.value)}
                placeholder="e.g. Sector 4B (Plots Q12-Q56)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                SLA Due Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Target Quota & Unit
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={targetQuota}
                  onChange={(e) => setTargetQuota(Number(e.target.value))}
                  className="w-1/2 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-center"
                />
                <input
                  type="text"
                  value={quotaUnit}
                  onChange={(e) => setQuotaUnit(e.target.value)}
                  placeholder="quadrats"
                  className="w-1/2 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-center font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Work Order Instructions & Method Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail specific measurement protocols or sensor settings..."
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
              data-testid="submit-dispatch-task-btn"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-sm"
            >
              {taskToReassign ? "Update Work Order" : "Dispatch Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
