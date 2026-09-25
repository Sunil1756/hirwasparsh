import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  FileText,
  UserCheck,
  FileSignature,
  Layers,
  ShieldCheck,
  Zap,
  History,
} from "lucide-react";
import {
  monitoringEscalationService,
  EscalationCase,
  EscalationKPIs,
  EscalationTier,
  EscalationStatus,
} from "../../services/monitoringEscalationService";
import { EscalationActionModal } from "./EscalationActionModal";
import { EscalationClosureModal } from "./EscalationClosureModal";

export const EscalationWorkflowConsole: React.FC = () => {
  const [cases, setCases] = useState<EscalationCase[]>(() =>
    monitoringEscalationService.getCases()
  );
  const [kpis, setKpis] = useState<EscalationKPIs>(() =>
    monitoringEscalationService.getEscalationKPIs()
  );
  const [tierFilter, setTierFilter] = useState<EscalationTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EscalationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"advance_tier" | "mitigation_plan">("advance_tier");
  const [selectedCase, setSelectedCase] = useState<EscalationCase | null>(null);

  const [isClosureOpen, setIsClosureOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setCases(
      monitoringEscalationService.getCases({
        searchQuery,
        tier: tierFilter,
        status: statusFilter,
      })
    );
    setKpis(monitoringEscalationService.getEscalationKPIs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = monitoringEscalationService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, tierFilter, statusFilter]);

  const handleScanEscalations = () => {
    const res = monitoringEscalationService.evaluateAndTriggerEscalations();
    setActionSuccessMessage(
      `SLA escalation scan complete: ${res.promotedCount} overdue items promoted to higher operational tiers.`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const openAdvanceTier = (c: EscalationCase) => {
    setSelectedCase(c);
    setActionMode("advance_tier");
    setIsActionModalOpen(true);
  };

  const openMitigation = (c: EscalationCase) => {
    setSelectedCase(c);
    setActionMode("mitigation_plan");
    setIsActionModalOpen(true);
  };

  const openClosure = (c: EscalationCase) => {
    setSelectedCase(c);
    setIsClosureOpen(true);
  };

  const getTierBadge = (tier: EscalationTier) => {
    switch (tier) {
      case "tier4_executive":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "tier3_verifier":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      case "tier2_operations":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "tier1_field":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
    }
  };

  const getStatusBadge = (status: EscalationStatus) => {
    switch (status) {
      case "active_escalation":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "under_investigation":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      case "remediated":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "closed":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="escalation-workflow-console">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-purple-950 text-white shadow-xl border border-purple-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Phase 9 • Task 50 — Multi-Tier Escalation Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SLA Compliance Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Operational Escalations & SLA Management
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Multi-tier escalation pathways for breached work orders and severe ecological anomalies across Field, Operations, Verifier, and Executive levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleScanEscalations}
            data-testid="scan-escalations-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Scan & Auto-Escalate Overdue Breaches
          </button>
        </div>
      </div>

      {/* Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-purple-500/40 bg-purple-950/80 text-purple-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Active Cases</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {kpis.activeEscalations}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Under Escalation</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Tier 4 Critical</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.tier4Critical}
          </div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Board / Registry Level</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Under Investigation</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {kpis.underInvestigation}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Mitigation Active</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Remediated</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.remediatedCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Awaiting Sign-Off</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Avg Escalation Time</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.avgEscalationHours}h
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Triage to Closure</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">SLA Recovery Rate</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.slaRecoveryRatePct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Resolution Compliance</div>
        </div>
      </div>

      {/* Filter and Tier Selector */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search case, officer, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(["all", "tier1_field", "tier2_operations", "tier3_verifier", "tier4_executive"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                  tierFilter === t
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                {t === "all" ? "All Tiers" : t.replace("_", " ")}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active_escalation">Active Escalation</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="remediated">Remediated</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Escalation Cases Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Escalation Case</th>
                <th className="py-3 px-4">Current Tier</th>
                <th className="py-3 px-4">SLA Breach</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    No escalation cases match the selected filters.
                  </td>
                </tr>
              ) : (
                cases.map((esc) => (
                  <tr key={esc.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {esc.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {esc.description}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {esc.id} • {esc.projectName} • Source: {esc.sourceEntity.toUpperCase()} ({esc.sourceEntityId})
                      </div>
                      {esc.mitigationPlan && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 bg-emerald-50 dark:bg-emerald-950/40 p-1 rounded">
                          Mitigation: {esc.mitigationPlan}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTierBadge(esc.currentTier)}`}>
                        {esc.currentTier.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {esc.slaBreachHours > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          +{esc.slaBreachHours}h Overdue
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">On Schedule</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{esc.assignedOfficer}</div>
                      <div className="text-[10px] text-zinc-400">{esc.escalationPath.length} Tiers Logged</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(esc.status)}`}>
                        {esc.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      {esc.status !== "closed" && (
                        <>
                          <button
                            onClick={() => openAdvanceTier(esc)}
                            data-testid="advance-tier-btn"
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-sm"
                            title="Promote Escalation Tier"
                          >
                            Advance Tier
                          </button>
                          <button
                            onClick={() => openMitigation(esc)}
                            data-testid="mitigate-btn"
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm"
                            title="Submit Mitigation Strategy"
                          >
                            Mitigate
                          </button>
                          <button
                            onClick={() => openClosure(esc)}
                            data-testid="close-escalation-btn"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
                            title="Sign-Off & Close"
                          >
                            Sign-Off
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

      {/* Modals */}
      <EscalationActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        escalationCase={selectedCase}
        mode={actionMode}
      />

      <EscalationClosureModal
        isOpen={isClosureOpen}
        onClose={() => setIsClosureOpen(false)}
        escalationCase={selectedCase}
      />
    </div>
  );
};
