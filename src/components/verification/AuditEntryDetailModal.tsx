import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Hash,
  User,
  Layers,
  Key,
  Clock,
  ArrowRight,
  Copy,
  Check,
  AlertTriangle,
  Code,
  FileText,
  Activity,
} from "lucide-react";
import { AuditLogEntry } from "../../services/auditLogService";

interface AuditEntryDetailModalProps {
  entry: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditEntryDetailModal: React.FC<AuditEntryDetailModalProps> = ({
  entry,
  isOpen,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "delta" | "json">("overview");

  if (!isOpen || !entry) return null;

  const copyToClipboard = (text: string, type: "hash" | "json") => {
    navigator.clipboard.writeText(text);
    if (type === "hash") {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "security":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "critical":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  #{entry.sequenceNumber.toString().padStart(6, "0")}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase tracking-wider ${getSeverityBadge(entry.severity)}`}>
                  {entry.severity}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {entry.id}
                </span>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {entry.action}
              </h2>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/30 dark:bg-zinc-900/30">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "overview"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Forensic Overview
          </button>
          <button
            onClick={() => setActiveTab("delta")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "delta"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            State Delta Diff
            {entry.stateDelta && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
                {Object.keys(entry.stateDelta).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "json"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw Canonical JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === "overview" && (
            <>
              {/* Action Description */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Event Description
                </div>
                <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {entry.actionDescription}
                </div>
              </div>

              {/* Grid: Actor & Target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Actor Card */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Actor Identity
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Name / ID: </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {entry.actor.name}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">({entry.actor.userId})</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Role: </span>
                      <span className="inline-block font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                        {entry.actor.role}
                      </span>
                    </div>
                    {entry.actor.ipAddress && (
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">IP Address: </span>
                        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {entry.actor.ipAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Entity Card */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Target Entity
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Type: </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase text-xs">
                        {entry.target.entityType}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Entity ID: </span>
                      <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {entry.target.entityId}
                      </span>
                    </div>
                    {entry.target.entityName && (
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Name: </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {entry.target.entityName}
                        </span>
                      </div>
                    )}
                    {entry.target.projectId && (
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Project: </span>
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          {entry.target.projectId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cryptographic Proof Block */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <Key className="w-4 h-4" />
                    Cryptographic Proof & SHA-256 Hash Chain
                  </div>
                  <button
                    onClick={() => copyToClipboard(entry.entryHash, "hash")}
                    className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedHash ? "Hash Copied" : "Copy Hash"}
                  </button>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Current Entry Hash (H_n):
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 break-all font-semibold select-all">
                      {entry.entryHash}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Previous Linked Hash (H_n-1):
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 break-all select-all">
                      {entry.previousHash}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Digital Signatory Proof:
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-purple-700 dark:text-purple-400 font-semibold select-all">
                      {entry.signature}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp & Metadata */}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Logged At: {new Date(entry.timestamp).toUTCString()}
                </span>
                <span className="font-mono">Seq #{entry.sequenceNumber}</span>
              </div>
            </>
          )}

          {activeTab === "delta" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Exact property modifications captured between previous and updated states:
              </div>
              {entry.stateDelta && Object.keys(entry.stateDelta).length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                  {Object.entries(entry.stateDelta).map(([field, { from, to }]) => (
                    <div key={field} className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {field}
                      </div>
                      <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 font-mono text-xs text-red-700 dark:text-red-300 break-all">
                        {from !== undefined ? JSON.stringify(from) : "<empty>"}
                      </div>
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all">
                        {to !== undefined ? JSON.stringify(to) : "<empty>"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl">
                  No property state mutations recorded for this event (Creation, check or query event).
                </div>
              )}
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Canonical SHA-256 Source Payload
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(entry, null, 2), "json")}
                  className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? "JSON Copied" : "Copy JSON"}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto max-h-96 border border-zinc-800">
                {JSON.stringify(entry, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
