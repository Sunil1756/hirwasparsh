import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Webhook,
  Send,
  Check,
  CheckCheck,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Code,
  Trash2,
  Clock,
  Zap,
} from "lucide-react";
import {
  monitoringNotificationService,
  MonitoringNotification,
  NotificationKPIs,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "../../services/monitoringNotificationService";
import { NotificationDispatchModal } from "./NotificationDispatchModal";
import { NotificationPayloadModal } from "./NotificationPayloadModal";

export const NotificationCenterConsole: React.FC = () => {
  const [notifications, setNotifications] = useState<MonitoringNotification[]>(() =>
    monitoringNotificationService.getNotifications()
  );
  const [kpis, setKpis] = useState<NotificationKPIs>(() =>
    monitoringNotificationService.getNotificationKPIs()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<MonitoringNotification | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setNotifications(
      monitoringNotificationService.getNotifications({
        searchQuery,
        channel: channelFilter,
        category: categoryFilter,
        status: statusFilter as any,
      })
    );
    setKpis(monitoringNotificationService.getNotificationKPIs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = monitoringNotificationService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [searchQuery, channelFilter, categoryFilter, statusFilter]);

  const handleSyncAlerts = () => {
    const res = monitoringNotificationService.dispatchMonitoringAlerts();
    setActionSuccessMessage(
      `Alert sync complete: ${res.dispatchedCount} automated notifications broadcasted.`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleMarkRead = (id: string) => {
    monitoringNotificationService.markAsRead(id);
  };

  const handleMarkAllRead = () => {
    monitoringNotificationService.markAllAsRead();
    setActionSuccessMessage("All in-app alerts marked as read.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleDelete = (id: string) => {
    monitoringNotificationService.deleteNotification(id);
  };

  const openPayloadModal = (notification: MonitoringNotification) => {
    setSelectedNotification(notification);
    setIsPayloadOpen(true);
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case "in_app":
        return <Bell className="w-4 h-4 text-amber-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "sms":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "webhook":
        return <Webhook className="w-4 h-4 text-purple-500" />;
      case "slack_teams":
        return <Zap className="w-4 h-4 text-pink-500" />;
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="notification-center-console">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-amber-950 text-white shadow-xl border border-amber-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Phase 9 • Task 48 — Multi-Channel Notifications
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Real-Time Alert Dispatcher
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Monitoring Alerts & Notifications Center
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Multi-channel telemetry dispatching In-App, Email, SMS, Webhook, and Teams alerts for recurring sweeps, SLA breaches, and anomalies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsDispatchOpen(true)}
            data-testid="dispatch-test-alert-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            Dispatch Test Alert
          </button>
          <button
            onClick={handleSyncAlerts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Schedule & SLA Alerts
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700"
            title="Mark All In-App Read"
          >
            <CheckCheck className="w-4 h-4" />
            Mark Read
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/80 text-amber-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Dispatched</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {kpis.totalDispatched}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Multi-Channel Alerts</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Unread In-App</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {kpis.unreadInApp}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Bell Queue Active</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Critical Priority</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.criticalAlerts}
          </div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Immediate Action</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Email Delivered</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.emailDelivered}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">SMTP Relays</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">SMS / Webhooks</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {kpis.smsDelivered + kpis.webhookPushed}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Carrier & API Push</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Delivery Rate</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.deliverySuccessRate}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Transport Success</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alert title, recipient, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Channel buttons */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(["all", "in_app", "email", "sms", "webhook"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  channelFilter === ch
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                {ch.replace("_", " ")}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="schedule_due">Schedule Due</option>
            <option value="overdue_sla_breach">SLA Breach</option>
            <option value="escalation_alert">Escalation</option>
            <option value="vegetation_anomaly">Vegetation Anomaly</option>
            <option value="weather_drought_warning">Weather Drought</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Alert & Message</th>
                <th className="py-3 px-4">Channel & Transport</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status & Latency</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                    No monitoring alerts match the selected filters.
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {notif.body}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {notif.id} • {new Date(notif.createdAt).toLocaleTimeString()} ({new Date(notif.createdAt).toLocaleDateString()})
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-medium">
                        {getChannelIcon(notif.channel)}
                        <span className="uppercase text-[10px] font-bold">{notif.channel.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{notif.recipient}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{notif.recipientRole.replace(/_/g, " ")}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(notif.priority)}`}>
                        {notif.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          notif.status === "unread"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {notif.status}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{notif.dispatchLatencyMs}ms</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      {notif.status === "unread" && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          data-testid="mark-read-btn"
                          className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-300 text-xs font-semibold transition-colors"
                          title="Mark Read"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => openPayloadModal(notif)}
                        data-testid="view-payload-btn"
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                        title="Inspect Payload"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NotificationDispatchModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
      />

      <NotificationPayloadModal
        isOpen={isPayloadOpen}
        onClose={() => setIsPayloadOpen(false)}
        notification={selectedNotification}
      />
    </div>
  );
};
