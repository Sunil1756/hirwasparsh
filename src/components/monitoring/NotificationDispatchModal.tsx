import React, { useState } from "react";
import {
  X,
  Bell,
  Mail,
  MessageSquare,
  Webhook,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  monitoringNotificationService,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  MonitoringNotification,
} from "../../services/monitoringNotificationService";

interface NotificationDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatched?: (notification: MonitoringNotification) => void;
}

export const NotificationDispatchModal: React.FC<NotificationDispatchModalProps> = ({
  isOpen,
  onClose,
  onDispatched,
}) => {
  const [recipient, setRecipient] = useState("Sahayadri Ranger Squad Alpha");
  const [recipientRole, setRecipientRole] = useState("field_ranger");
  const [channel, setChannel] = useState<NotificationChannel>("in_app");
  const [category, setCategory] = useState<NotificationCategory>("schedule_due");
  const [priority, setPriority] = useState<NotificationPriority>("high");
  const [title, setTitle] = useState("Upcoming 5-Day Copernicus Sentinel-2 Sweep");
  const [body, setBody] = useState(
    "Copernicus Sentinel-2 pass scheduled for Sector 4B. Automated raster ingestion pipeline standing by."
  );
  const [actionUrl, setActionUrl] = useState("/monitoring?tab=schedules");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !recipient.trim()) return;

    const notification = monitoringNotificationService.dispatchNotification({
      recipient,
      recipientRole,
      channel,
      category,
      priority,
      title,
      body,
      actionUrl,
    });

    if (onDispatched) onDispatched(notification);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Dispatch Multi-Channel Alert
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Broadcast real-time operational notifications to field squads & MRV endpoints
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Channel Selector */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Notification Channel
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "in_app", label: "In-App", icon: Bell },
                { id: "email", label: "Email", icon: Mail },
                { id: "sms", label: "SMS", icon: MessageSquare },
                { id: "webhook", label: "Webhook", icon: Webhook },
              ].map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={() => setChannel(ch.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      channel === ch.id
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Recipient (Squad or Address)
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Ranger Squad Alpha"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none"
              >
                <option value="critical">CRITICAL (Immediate Dispatch)</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Alert Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NDVI Biomass Anomaly Detected"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Message Body & Operational Details
            </label>
            <textarea
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide context, required actions, and coordinates..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
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
              data-testid="submit-dispatch-notification-btn"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
