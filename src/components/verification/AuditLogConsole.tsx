import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  FileCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Key,
  Layers,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  Activity,
  Zap,
  Sliders,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  auditLogService,
  AuditLogEntry,
  AuditAction,
  ActorRole,
  AuditSeverity,
  AuditIntegrityResult,
  AuditStats,
} from "../../services/auditLogService";
import { AuditEntryDetailModal } from "./AuditEntryDetailModal";
import { AuditIntegrityReportModal } from "./AuditIntegrityReportModal";

export const AuditLogConsole: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => auditLogService.getAuditLogsSync());
  const [stats, setStats] = useState<AuditStats | null>(() => auditLogService.getAuditStatsSync());
  const [integrity, setIntegrity] = useState<AuditIntegrityResult | null>(() => auditLogService.verifyChainIntegritySync());
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [tamperAlert, setTamperAlert] = useState<string | null>(null);

  const loadData = () => {
    const allLogs = auditLogService.getAuditLogsSync({
      searchQuery,
      action: actionFilter as any,
      actorRole: roleFilter as any,
      severity: severityFilter as any,
    });
    setLogs(allLogs);

    const s = auditLogService.getAuditStatsSync();
    setStats(s);

    const check = auditLogService.verifyChainIntegritySync();
    setIntegrity(check);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = auditLogService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, actionFilter, roleFilter, severityFilter]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      const result = await auditLogService.verifyChainIntegrity();
      setIntegrity(result);
      if (!result.isValid) {
        setTamperAlert(`TAMPER DETECTED: ${result.tamperDetails[0] || "Compromised hash pointer"}`);
      } else {
        setTamperAlert(null);
      }
      setIsVerifying(false);
    }, 400);
  };

  const handleSimulateTamperDrill = () => {
    // Modify the second entry action
    auditLogService.simulateTamperEvent(1, "action", "UNAUTHORIZED_CLAIM_MUTATION");
    setTamperAlert("SIMULATED TAMPER DRILL: Entry #000002 payload was altered to test automated integrity rejection.");
    handleVerifyChain();
  };

  const handleRestoreChain = () => {
    auditLogService.restoreChainIntegrity();
    setTamperAlert(null);
    handleVerifyChain();
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openEntryDetail = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  };

  const getSeverityBadgeClass = (sev: AuditSeverity) => {
    switch (sev) {
      case "security":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
    }
  };

  const getRoleBadgeClass = (role: ActorRole) => {
    switch (role) {
      case "admin_certifier":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "lead_verifier":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "field_auditor":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "system_engine":
        return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phase 8 • Task 44 — Audit Logs & Tamper-Proof Trail
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ISO 14064-3 / Verra VM0047
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cryptographic Audit Trail & Tamper-Evident Ledger
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Monotonically sequenced SHA-256 hash chaining, Four-Eyes dual control signatures, and immutable verification state histories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            {isVerifying ? "Verifying Chain..." : "Verify Chain Integrity"}
          </button>
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold text-xs transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            Compliance Certificate
          </button>
          {integrity?.isValid ? (
            <button
              onClick={handleSimulateTamperDrill}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-semibold text-xs transition-colors"
              title="Simulates unauthorized payload alteration to verify that tamper detection catches it immediately."
            >
              <Zap className="w-3.5 h-3.5" />
              Simulate Tamper Drill
            </button>
          ) : (
            <button
              onClick={handleRestoreChain}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Pristine Chain
            </button>
          )}
        </div>
      </div>

      {/* Tamper Warning Banner if compromised */}
      {tamperAlert && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Security Diagnostic Alert</div>
              <div className="text-xs mt-0.5">{tamperAlert}</div>
            </div>
          </div>
          <button
            onClick={handleRestoreChain}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0"
          >
            Restore Chain
          </button>
        </div>
      )}

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Audit Events</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats?.totalEvents || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" /> Monotonic SHA-256
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">4-Eyes Dual Signatures</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats?.dualControlApprovals || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Lead & Admin Signed</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Critical / Security Actions</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {stats?.criticalSecurityEvents || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">High-Risk Audits</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Active Actors</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {stats?.uniqueActors || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Auditors & AI Engines</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Chain Health</div>
          <div className="flex items-center gap-1.5 mt-1">
            {integrity?.isValid ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">100% Valid</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-base font-bold text-red-700 dark:text-red-400">Tampered</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 truncate mt-1" title={integrity?.merkleRoot}>
            Root: {integrity?.merkleRoot.substring(0, 12)}...
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, entity, hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="CLAIM_SUBMITTED">Claim Submitted</option>
            <option value="CLAIM_AUTO_SCREENED">Claim Auto-Screened</option>
            <option value="DUPLICATE_FLAGGED">Duplicate Flagged</option>
            <option value="SPATIOTEMPORAL_FLAGGED">Spatiotemporal Flagged</option>
            <option value="L1_AUDIT_SUBMITTED">L1 Audit Submitted</option>
            <option value="L2_LEAD_APPROVED">L2 Lead Approved</option>
            <option value="L3_ADMIN_CERTIFIED">L3 Admin Certified</option>
            <option value="CLAIM_REJECTED">Claim Rejected</option>
            <option value="BATCH_CERTIFIED">Batch Certified</option>
            <option value="SYSTEM_INTEGRITY_CHECK">System Integrity Check</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="field_auditor">Field Auditor</option>
            <option value="lead_verifier">Lead Verifier</option>
            <option value="admin_certifier">Admin Certifier</option>
            <option value="system_engine">System AI Engine</option>
            <option value="planter">Planter</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>

      {/* Audit Stream Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Seq</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action & Description</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    No audit records match your query filters.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-600 dark:text-zinc-400">
                          #{entry.sequenceNumber.toString().padStart(4, "0")}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                          {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {entry.action}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {entry.actionDescription}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {entry.actor.name}
                          </div>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-medium mt-0.5 ${getRoleBadgeClass(entry.actor.role)}`}>
                            {entry.actor.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                            {entry.target.entityId}
                          </div>
                          <div className="text-[10px] text-zinc-400 uppercase">
                            {entry.target.entityType} {entry.target.projectId ? `• ${entry.target.projectId}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wider ${getSeverityBadgeClass(entry.severity)}`}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-500">
                          <span className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                            {entry.entryHash.substring(0, 10)}...
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            onClick={() => toggleRowExpanded(entry.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Toggle State Delta Preview"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEntryDetail(entry)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-semibold transition-colors"
                          >
                            Forensics
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row State Delta Preview */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/60 dark:bg-zinc-800/30">
                          <td colSpan={8} className="py-3 px-6 border-y border-zinc-200 dark:border-zinc-800">
                            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                <span>State Mutations & Cryptographic Hash Pointer</span>
                                <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                                  {entry.signature}
                                </span>
                              </div>
                              {entry.stateDelta ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {Object.entries(entry.stateDelta).map(([k, { from, to }]) => (
                                    <div key={k} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800 text-[11px] font-mono">
                                      <div className="text-zinc-400 font-medium">{k}:</div>
                                      <div className="text-red-500 line-through truncate">
                                        {from !== undefined ? JSON.stringify(from) : "null"}
                                      </div>
                                      <div className="text-emerald-500 font-bold truncate">
                                        → {to !== undefined ? JSON.stringify(to) : "null"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400 italic">
                                  No state delta mutations recorded for this event.
                                </div>
                              )}
                              <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                                <span>Previous Hash: {entry.previousHash}</span>
                                <span>Current Hash: {entry.entryHash}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AuditEntryDetailModal
        entry={selectedEntry}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <AuditIntegrityReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        integrity={integrity}
        stats={stats}
      />
    </div>
  );
};
