import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  Code,
  ShieldCheck,
} from "lucide-react";
import { monitoringAnalyticsService } from "../../services/monitoringAnalyticsService";

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsExportModal: React.FC<AnalyticsExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const content = monitoringAnalyticsService.exportComplianceReport(format);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv;charset=utf-8;" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `hirwasparsh_mrv_monitoring_analytics_${Date.now()}.${format}`
    );
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Export MRV Compliance & Analytics Manifest
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Verra VM0047 / CDM AR-AM0014 institutional audit export
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormat("csv")}
                data-testid="export-csv-btn"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  format === "csv"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV Format (Spreadsheets)
              </button>
              <button
                onClick={() => setFormat("json")}
                data-testid="export-json-btn"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  format === "json"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <Code className="w-4 h-4" />
                JSON Manifest (APIs & Registries)
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Code"}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-72 border border-zinc-800 leading-relaxed whitespace-pre">
            {content}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="text-[11px] text-zinc-500">
            Compliant with ISO 14064-3 and Gold Standard Afforestation Monitoring Guidelines.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              data-testid="download-export-btn"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm text-xs"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
