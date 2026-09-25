import React from "react";
import {
  X,
  Code,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  MonitoringNotification,
} from "../../services/monitoringNotificationService";

interface NotificationPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification?: MonitoringNotification | null;
}

export const NotificationPayloadModal: React.FC<NotificationPayloadModalProps> = ({
  isOpen,
  onClose,
  notification,
}) => {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Dispatched Alert Payload Inspector
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {notification.id} • {notification.channel.toUpperCase()} Transport
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
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-zinc-500">Recipient:</span>{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">{notification.recipient}</strong>
            </div>
            <div>
              <span className="text-zinc-500">Dispatch Latency:</span>{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{notification.dispatchLatencyMs}ms</strong>
            </div>
            <div>
              <span className="text-zinc-500">Category:</span>{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">{notification.category}</strong>
            </div>
            <div>
              <span className="text-zinc-500">Timestamp:</span>{" "}
              <span className="text-zinc-400 font-mono text-[11px]">{new Date(notification.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Formatted Transport Payload (JSON / Protocol)
            </label>
            <pre className="p-4 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
              {JSON.stringify(notification.payloadPreview || notification, null, 2)}
            </pre>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Raw Message Body
            </label>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
              {notification.body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
