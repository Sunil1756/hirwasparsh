import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sliders,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  Droplets,
  TreePine,
  MapPin,
  User,
  Trash2,
  Check,
  X,
  UserCheck,
  ArrowUpRight,
} from "lucide-react";
import {
  monitoringAlertService,
  AlertIncident,
  AlertRule,
  AlertKPIs,
  IncidentStatus,
  AlertSeverity,
  AlertType,
} from "../../services/monitoringAlertService";
import { AlertRuleModal } from "./AlertRuleModal";
import { IncidentResolutionModal } from "./IncidentResolutionModal";

export const AlertManagementConsole: React.FC = () => {
  const [incidents, setIncidents] = useState<AlertIncident[]>(() =>
    monitoringAlertService.getIncidents()
  );
  const [rules, setRules] = useState<AlertRule[]>(() =>
    monitoringAlertService.getRules()
  );
  const [kpis, setKpis] = useState<AlertKPIs>(() =>
    monitoringAlertService.getAlertKPIs()
  );
  const [activeTab, setActiveTab] = useState<"incidents" | "rules">("incidents");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<AlertRule | null>(null);

  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<AlertIncident | null>(null);
  const [resolutionAction, setResolutionAction] = useState<"resolve" | "dismiss">("resolve");

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setIncidents(
      monitoringAlertService.getIncidents({
        searchQuery,
        status: statusFilter,
        severity: severityFilter,
      })
    );
    setRules(monitoringAlertService.getRules());
    setKpis(monitoringAlertService.getAlertKPIs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = monitoringAlertService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, statusFilter, severityFilter]);

  const handleRunAnomalyScan = () => {
    // Simulate live telemetry input across project hectares
    const scanBatch = [
      {
        projectId: "proj-sahayadri",
        projectName: "Sahayadri Tiger Reserve Afforestation",
        locationReference: "Sector 4B (Plots Q12-Q18)",
        metricKey: "delta_ndvi",
        value: -0.18,
      },
      {
        projectId: "proj-sahayadri",
        projectName: "Sahayadri Tiger Reserve Afforestation",
        locationReference: "Ridge Station WX-02",
        metricKey: "soil_moisture_pct",
        value: 12.8,
      },
    ];

    const result = monitoringAlertService.evaluateTelemetryAndTriggerAlerts(scanBatch);
    setActionSuccessMessage(
      `Telemetry anomaly scan complete: ${result.triggeredCount} new alert incidents triggered.`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleAcknowledge = (incident: AlertIncident) => {
    monitoringAlertService.acknowledgeIncident(incident.id, "Regional Lead Auditor");
    setActionSuccessMessage(`Incident ${incident.id} acknowledged.`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleEscalateToWorkOrder = (incident: AlertIncident) => {
    monitoringAlertService.escalateIncidentToWorkOrder(
      incident.id,
      "Sahayadri Ranger Squad Alpha"
    );
    setActionSuccessMessage(
      `Incident ${incident.id} escalated into Task 47 Emergency Work Order.`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const openResolveModal = (incident: AlertIncident) => {
    setSelectedIncident(incident);
    setResolutionAction("resolve");
    setIsResolutionOpen(true);
  };

  const openDismissModal = (incident: AlertIncident) => {
    setSelectedIncident(incident);
    setResolutionAction("dismiss");
    setIsResolutionOpen(true);
  };

  const handleToggleRule = (id: string) => {
    monitoringAlertService.toggleRule(id);
  };

  const openCreateRule = () => {
    setRuleToEdit(null);
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: AlertRule) => {
    setRuleToEdit(rule);
    setIsRuleModalOpen(true);
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
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

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "active":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "acknowledged":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      case "investigating":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      case "resolved":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "dismissed":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const getAlertTypeIcon = (type: AlertType) => {
    switch (type) {
      case "canopy_degradation":
        return <TreePine className="w-4 h-4 text-emerald-500" />;
      case "drought_deficit":
        return <Droplets className="w-4 h-4 text-amber-500" />;
      case "survival_rate_breach":
        return <Activity className="w-4 h-4 text-rose-500" />;
      case "geofence_violation":
        return <MapPin className="w-4 h-4 text-blue-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="alert-management-console">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-rose-950 text-white shadow-xl border border-rose-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Phase 9 • Task 49 — Alert Rules & Incident Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Automated Anomaly Detector
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Biometric & Satellite Anomaly Alerts
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Evaluates canopy loss, drought stress, and survival thresholds. Auto-spawns investigation work orders and manages incident lifecycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAnomalyScan}
            data-testid="run-anomaly-scan-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Run Telemetry Anomaly Scan
          </button>
          <button
            onClick={openCreateRule}
            data-testid="configure-rules-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700"
          >
            <Sliders className="w-4 h-4" />
            Configure Rules
          </button>
        </div>
      </div>

      {/* Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/80 text-rose-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Active Incidents</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.activeCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Action Required</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Critical Priority</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.criticalCount}
          </div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Immediate SLA</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Investigating</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {kpis.investigatingCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Work Orders Linked</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Resolved (30d)</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.resolvedCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Mitigations Applied</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Mean TTR</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.mttrHours}h
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Resolution Time</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">False Positive Rate</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {kpis.falsePositiveRatePct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Sensor Cloud Glitches</div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("incidents")}
            data-testid="incidents-tab-btn"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "incidents"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Active Incidents Stream
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            data-testid="rules-tab-btn"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "rules"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Threshold Alert Rules ({rules.length})
          </button>
        </div>
      </div>

      {activeTab === "incidents" ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search incident, location, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                {(["all", "active", "acknowledged", "investigating", "resolved", "dismissed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      statusFilter === st
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Incident & Anomaly</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Observed vs Threshold</th>
                    <th className="py-3 px-4">Location / Sector</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                        No anomaly alert incidents match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {getAlertTypeIcon(inc.alertType)}
                            {inc.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {inc.description}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {inc.id} • {inc.projectName}
                          </div>
                          {inc.workOrderId && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                              ↗ Work Order: {inc.workOrderId} ({inc.assignedInvestigator})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(inc.severity)}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                          <strong className="text-rose-600 dark:text-rose-400">{inc.observedValue}</strong>
                          <span className="text-zinc-400"> / Limit: {inc.thresholdValue} {inc.unit}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{inc.locationReference}</div>
                          <div className="text-[10px] text-zinc-400">{new Date(inc.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(inc.status)}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                          {inc.status === "active" && (
                            <button
                              onClick={() => handleAcknowledge(inc)}
                              data-testid="ack-incident-btn"
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
                              title="Acknowledge Incident"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(inc.status === "active" || inc.status === "acknowledged") && (
                            <button
                              onClick={() => handleEscalateToWorkOrder(inc)}
                              data-testid="dispatch-investigation-btn"
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-sm"
                              title="Dispatch Investigation Work Order"
                            >
                              Dispatch Squad
                            </button>
                          )}
                          {inc.status !== "resolved" && inc.status !== "dismissed" && (
                            <>
                              <button
                                onClick={() => openResolveModal(inc)}
                                data-testid="resolve-incident-btn"
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
                                title="Resolve Incident"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => openDismissModal(inc)}
                                data-testid="dismiss-incident-btn"
                                className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition-colors"
                                title="Dismiss as False Positive"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Rules Tab */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Active Threshold Alert Rules
              </h3>
              <p className="text-xs text-zinc-500">
                Configure automatic breach conditions, auto-dispatch squad work orders, and severities
              </p>
            </div>
            <button
              onClick={openCreateRule}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Rule
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Rule Name & Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Auto Work Order</th>
                  <th className="py-3 px-4">Trigger Stats</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {getAlertTypeIcon(rule.alertType)}
                        {rule.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {rule.projectName}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(rule.severity)}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {rule.metricKey} {rule.operator} {rule.thresholdValue} {rule.unit}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {rule.autoCreateWorkOrder ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Auto-Dispatch ({rule.targetSquad})
                        </span>
                      ) : (
                        <span className="text-zinc-400">Alert Only</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      <strong>{rule.triggerCount}</strong> breaches
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          rule.enabled
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {rule.enabled ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => openEditRule(rule)}
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                        title="Edit Rule"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AlertRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        ruleToEdit={ruleToEdit}
      />

      <IncidentResolutionModal
        isOpen={isResolutionOpen}
        onClose={() => setIsResolutionOpen(false)}
        incident={selectedIncident}
        actionType={resolutionAction}
      />
    </div>
  );
};
