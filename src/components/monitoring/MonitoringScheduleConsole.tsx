import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Layers,
  Satellite,
  UserCheck,
  Plane,
  CloudRain,
  TreePine,
  ShieldCheck,
  PlusCircle,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  Settings,
  Trash2,
  Zap,
  Bell,
} from "lucide-react";
import {
  monitoringScheduleService,
  MonitoringSchedule,
  ScheduleKPIs,
  CadenceType,
  ScheduleStatus,
} from "../../services/monitoringScheduleService";
import { ScheduleConfigModal } from "./ScheduleConfigModal";
import { ScheduleExecutionHistoryModal } from "./ScheduleExecutionHistoryModal";

export const MonitoringScheduleConsole: React.FC = () => {
  const [schedules, setSchedules] = useState<MonitoringSchedule[]>(() =>
    monitoringScheduleService.getSchedules()
  );
  const [kpis, setKpis] = useState<ScheduleKPIs>(() =>
    monitoringScheduleService.getScheduleKPIs()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<MonitoringSchedule | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySchedule, setHistorySchedule] = useState<MonitoringSchedule | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setSchedules(
      monitoringScheduleService.getSchedules({
        searchQuery,
        cadenceType: cadenceFilter as any,
        status: statusFilter as any,
      })
    );
    setKpis(monitoringScheduleService.getScheduleKPIs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = monitoringScheduleService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, cadenceFilter, statusFilter]);

  const handleTriggerNow = async (id: string, name: string) => {
    setRunningScheduleId(id);
    try {
      const log = await monitoringScheduleService.triggerScheduleExecution(id, "manual_dispatch");
      setActionSuccessMessage(`Execution Completed for "${name}": ${log.executionDetails}`);
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleToggleStatus = (id: string) => {
    monitoringScheduleService.toggleScheduleStatus(id);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete schedule "${name}"?`)) {
      monitoringScheduleService.deleteSchedule(id);
    }
  };

  const openEditModal = (schedule: MonitoringSchedule) => {
    setScheduleToEdit(schedule);
    setIsConfigOpen(true);
  };

  const openCreateModal = () => {
    setScheduleToEdit(null);
    setIsConfigOpen(true);
  };

  const openHistoryModal = (schedule?: MonitoringSchedule) => {
    setHistorySchedule(schedule || null);
    setIsHistoryOpen(true);
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
        return <Layers className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="monitoring-schedule-console">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 text-white shadow-xl border border-emerald-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Phase 9 • Task 46 — Monitoring Schedules
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Automated Recurring Cadences
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Automated Monitoring Schedules & Recurrence Engine
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Coordinates recurring Sentinel-2 5-day overpasses, Cochran ground truth PSP quotas, drone missions, and carbon allometry models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Create Recurring Schedule
          </button>
          <button
            onClick={() => openHistoryModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700"
          >
            <History className="w-3.5 h-3.5" />
            Global Execution Logs
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            title="Refresh Schedules"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/80 text-emerald-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Active Cadences</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {kpis.activeSchedules} <span className="text-xs text-zinc-400 font-normal">/ {kpis.totalSchedules}</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Recurring Active
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Next 24h Executions</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.runsNext24h}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Automated Triggers Due</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Overdue / Delayed</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {kpis.overdueSchedules}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Within Grace Period</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Execution Success Rate</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.overallSuccessRate}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{kpis.totalExecutionsAllTime} Total Executions</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Sentinel-2 5-Day Sync</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <Satellite className="w-4 h-4" /> Orbit Locked
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Copernicus STAC Live</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search schedule name, project, cadence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Cadence Types</option>
            <option value="satellite_sentinel2">Sentinel-2 Satellite</option>
            <option value="ground_sample_psp">Ground Truth PSP</option>
            <option value="drone_lidar_ortho">Drone LiDAR / Ortho</option>
            <option value="weather_deficit_telemetry">Weather Telemetry</option>
            <option value="carbon_biomass_allometry">Carbon Biomass Allometry</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Schedule & Project</th>
                <th className="py-3 px-4">Cadence Type</th>
                <th className="py-3 px-4">Recurrence Rule</th>
                <th className="py-3 px-4">Next Scheduled Run</th>
                <th className="py-3 px-4">Last Execution Summary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    No monitoring schedules match your search filters.
                  </td>
                </tr>
              ) : (
                schedules.map((item) => {
                  const isRunning = runningScheduleId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {item.projectName} • {item.assignedTeam}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-medium">
                          {getCadenceIcon(item.cadenceType)}
                          <span className="capitalize">{item.cadenceType.replace(/_/g, " ")}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div>Every {item.recurrence.intervalDays || 5} days</div>
                        <span className="text-zinc-400 text-[10px]">{item.recurrence.cronExpression || "0 6 * * *"}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-emerald-700 dark:text-emerald-400">
                          {new Date(item.nextScheduledRunAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {new Date(item.nextScheduledRunAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
                        {item.lastExecutionSummary || "Awaiting initial scheduled trigger."}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(item.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => handleTriggerNow(item.id, item.name)}
                          disabled={isRunning}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                          title="Execute Monitoring Job Now"
                        >
                          {isRunning ? "Running..." : "Run Now"}
                        </button>
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          title="View Execution Run Logs"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                          title="Edit Schedule"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          title="Delete Schedule"
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
      <ScheduleConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        scheduleToEdit={scheduleToEdit}
      />

      <ScheduleExecutionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        schedule={historySchedule}
      />
    </div>
  );
};
