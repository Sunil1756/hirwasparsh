import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  UserCheck,
  Plane,
  Satellite,
  CloudRain,
  TreePine,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  User,
  Trash2,
} from "lucide-react";
import {
  monitoringTaskService,
  MonitoringTask,
  TaskKPIs,
  TaskStatus,
  TaskPriority,
} from "../../services/monitoringTaskService";
import { CadenceType } from "../../services/monitoringScheduleService";
import { TaskAssignmentModal } from "./TaskAssignmentModal";
import { TaskCompletionModal } from "./TaskCompletionModal";
import { TaskEscalationModal } from "./TaskEscalationModal";

export const MonitoringTaskConsole: React.FC = () => {
  const [tasks, setTasks] = useState<MonitoringTask[]>(() =>
    monitoringTaskService.getTasks()
  );
  const [kpis, setKpis] = useState<TaskKPIs>(() =>
    monitoringTaskService.getTaskKPIs()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");

  // Modal states
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<MonitoringTask | null>(null);

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<MonitoringTask | null>(null);

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [taskToEscalate, setTaskToEscalate] = useState<MonitoringTask | null>(null);

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setTasks(
      monitoringTaskService.getTasks({
        searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        cadenceType: cadenceFilter as any,
      })
    );
    setKpis(monitoringTaskService.getTaskKPIs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = monitoringTaskService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, statusFilter, priorityFilter, cadenceFilter]);

  const handleGenerateDueTasks = () => {
    const result = monitoringTaskService.evaluateAndGenerateDueTasks();
    setActionSuccessMessage(
      `Evaluated schedules: Generated ${result.generatedCount} new due work orders.`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleCheckSLA = () => {
    const result = monitoringTaskService.checkAndEscalateOverdueTasks();
    setActionSuccessMessage(
      `SLA check complete: ${result.overdueCount} marked overdue, ${result.escalatedCount} escalated.`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleStartTask = (id: string, title: string) => {
    monitoringTaskService.startTask(id);
    setActionSuccessMessage(`Work Order "${title}" set to In Progress.`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleDeleteTask = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete work order "${title}"?`)) {
      monitoringTaskService.deleteTask(id);
    }
  };

  const openCreateModal = () => {
    setTaskToReassign(null);
    setIsAssignOpen(true);
  };

  const openReassignModal = (task: MonitoringTask) => {
    setTaskToReassign(task);
    setIsAssignOpen(true);
  };

  const openCompleteModal = (task: MonitoringTask) => {
    setTaskToComplete(task);
    setIsCompleteOpen(true);
  };

  const openEscalateModal = (task: MonitoringTask) => {
    setTaskToEscalate(task);
    setIsEscalateOpen(true);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "critical":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "high":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      case "low":
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "due":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      case "overdue":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "escalated":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "cancelled":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const getCadenceIcon = (type: CadenceType) => {
    switch (type) {
      case "satellite_sentinel2":
        return <Satellite className="w-4 h-4 text-emerald-400" />;
      case "ground_sample_psp":
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case "drone_lidar_ortho":
        return <Plane className="w-4 h-4 text-purple-400" />;
      case "weather_deficit_telemetry":
        return <CloudRain className="w-4 h-4 text-amber-400" />;
      case "carbon_biomass_allometry":
        return <TreePine className="w-4 h-4 text-emerald-400" />;
      default:
        return <ClipboardList className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="monitoring-task-console">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-blue-950 text-white shadow-xl border border-blue-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Phase 9 • Task 47 — Due & Overdue Tasks
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Work Order & SLA Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Due & Overdue Monitoring Work Orders
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Generates operational tasks from recurring monitoring cadences, enforces SLA grace periods, and triggers supervisor escalations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateDueTasks}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Evaluate & Generate Due Tasks
          </button>
          <button
            onClick={openCreateModal}
            data-testid="dispatch-work-order-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700"
          >
            <PlusCircle className="w-4 h-4" />
            Dispatch Work Order
          </button>
          <button
            onClick={handleCheckSLA}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            title="Check Overdue SLA & Escalations"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-950/80 text-blue-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Due Tasks</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.dueCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Awaiting Dispatch</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">In Progress</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {kpis.inProgressCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Squads in Field</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Overdue (In Grace)</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {kpis.overdueCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Grace Period Active</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Escalated (SLA Breach)</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.escalatedCount}
          </div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Lead Attention</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Completed (Resolved)</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.completedCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Evidence Verified</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">SLA Compliance</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.slaComplianceRate}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">On-Time Completion</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work order, squad, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(["all", "due", "in_progress", "overdue", "escalated", "completed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Work Order & Project</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date / SLA</th>
                <th className="py-3 px-4">Target Quota</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    No monitoring work orders match the selected filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  return (
                    <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {task.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {task.id} • {task.projectName}
                        </div>
                        {task.escalationReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                            ⚠ {task.escalationReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {task.assignedTo}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {task.locationReference}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium font-mono text-zinc-900 dark:text-zinc-100">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                        {task.status === "overdue" || task.status === "escalated" ? (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            +{task.overdueDurationHours}h overdue
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-400">
                            {task.gracePeriodDays}d grace window
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <strong className="text-zinc-900 dark:text-zinc-100">{task.targetQuota}</strong> {task.quotaUnit}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                        {task.status === "due" && (
                          <button
                            onClick={() => handleStartTask(task.id, task.title)}
                            data-testid="start-task-btn"
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
                            title="Start Work Order"
                          >
                            Start
                          </button>
                        )}
                        {(task.status === "in_progress" || task.status === "due" || task.status === "overdue" || task.status === "escalated") && (
                          <button
                            onClick={() => openCompleteModal(task)}
                            data-testid="complete-task-btn"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
                            title="Complete Work Order"
                          >
                            Complete
                          </button>
                        )}
                        {(task.status === "overdue" || task.status === "in_progress") && (
                          <button
                            onClick={() => openEscalateModal(task)}
                            data-testid="escalate-task-btn"
                            className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 text-xs font-semibold"
                            title="Escalate SLA Breach"
                          >
                            Escalate
                          </button>
                        )}
                        <button
                          onClick={() => openReassignModal(task)}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                          title="Reassign / Edit"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TaskAssignmentModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        taskToReassign={taskToReassign}
      />

      <TaskCompletionModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        task={taskToComplete}
      />

      <TaskEscalationModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        task={taskToEscalate}
      />
    </div>
  );
};
