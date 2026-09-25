import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Download,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Key,
  Copy,
  Check,
} from "lucide-react";
import {
  auditLogService,
  AuditIntegrityResult,
  AuditStats,
} from "../../services/auditLogService";

interface AuditIntegrityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrity: AuditIntegrityResult | null;
  stats: AuditStats | null;
}

export const AuditIntegrityReportModal: React.FC<AuditIntegrityReportModalProps> = ({
  isOpen,
  onClose,
  integrity,
  stats,
}) => {
  const [copiedMerkle, setCopiedMerkle] = useState(false);

  if (!isOpen) return null;

  const copyMerkle = () => {
    if (!integrity?.merkleRoot) return;
    navigator.clipboard.writeText(integrity.merkleRoot);
    setCopiedMerkle(true);
    setTimeout(() => setCopiedMerkle(false), 2000);
  };

  const handleDownloadCsv = async () => {
    const logs = await auditLogService.getAuditLogs();
    const csvData = auditLogService.exportAuditLogsToCsv(logs);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hirwasparsh-audit-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJsonPackage = async () => {
    const logs = await auditLogService.getAuditLogs();
    const jsonPackage = auditLogService.exportAuditPackageJson(logs);
    const blob = new Blob([jsonPackage], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hirwasparsh-cryptographic-audit-package-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadComplianceReport = async () => {
    const reportText = await auditLogService.generateIso14064AuditReport();
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ISO-14064-3-Audit-Certificate-${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ISO 14064-3 / Verra VM0047 Audit Compliance
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cryptographic Trust Ledger Verification & Certification Report
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              integrity?.isValid
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
            }`}
          >
            {integrity?.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm">
                {integrity?.isValid
                  ? "Ledger Integrity 100% Verified & Tamper-Free"
                  : "Ledger Tamper Detected — Chain Compromised"}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {integrity?.isValid
                  ? `All ${integrity.totalEntries} sequential entries match canonical cryptographic SHA-256 hashes and monotonic pointers.`
                  : `Compromised indices detected: ${integrity?.compromisedIndices.join(", ")}. Please review forensic logs.`}
              </div>
            </div>
          </div>

          {/* Merkle Certificate Box */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Binary Merkle Tree Root Hash
              </span>
              <button
                onClick={copyMerkle}
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                {copiedMerkle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedMerkle ? "Copied" : "Copy Merkle Root"}
              </button>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all select-all font-semibold">
              {integrity?.merkleRoot || "0x0"}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Genesis Block: </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate block">
                  {integrity?.genesisHash.substring(0, 16)}...
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Head Block: </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate block">
                  {integrity?.latestHash.substring(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          {/* Metric Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Entries</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{stats.totalEvents}</div>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">4-Eyes Signatures</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.dualControlApprovals}</div>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Verified Actors</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.uniqueActors}</div>
              </div>
            </div>
          )}

          {/* Export Action Center */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Download Compliance Artifacts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                onClick={handleDownloadComplianceReport}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <FileCheck className="w-4 h-4 text-emerald-600" />
                ISO Certificate (.txt)
              </button>
              <button
                onClick={handleDownloadJsonPackage}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                Signed JSON Bundle
              </button>
              <button
                onClick={handleDownloadCsv}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                RFC-4180 CSV Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
