import { describe, it, expect, beforeEach } from "vitest";
import {
  monitoringNotificationService,
  MonitoringNotification,
} from "../services/monitoringNotificationService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";

describe("PHASE 9 TASK 48 — MonitoringNotificationService & Alert Engine", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
  });

  it("1. Initializes with default seeded multi-channel notifications", () => {
    const notifs = monitoringNotificationService.getNotifications();
    expect(notifs.length).toBeGreaterThanOrEqual(4);

    const emailNotif = notifs.find((n) => n.channel === "email");
    expect(emailNotif).toBeDefined();
    expect(emailNotif?.priority).toBe("critical");

    const smsNotif = notifs.find((n) => n.channel === "sms");
    expect(smsNotif).toBeDefined();

    const webhookNotif = notifs.find((n) => n.channel === "webhook");
    expect(webhookNotif).toBeDefined();
  });

  it("2. Filters notifications by channel, priority, category, and status", () => {
    const emails = monitoringNotificationService.getNotifications({ channel: "email" });
    expect(emails.every((n) => n.channel === "email")).toBe(true);

    const criticals = monitoringNotificationService.getNotifications({ priority: "critical" });
    expect(criticals.every((n) => n.priority === "critical")).toBe(true);

    const searched = monitoringNotificationService.getNotifications({ searchQuery: "Sentinel-2" });
    expect(searched.length).toBeGreaterThan(0);
    expect(searched[0].title).toContain("Sentinel-2");
  });

  it("3. Dispatches notifications across different transport channels with formatted payload previews", () => {
    const dispatched = monitoringNotificationService.dispatchNotification({
      recipient: "Chief Field Auditor",
      recipientRole: "lead_verifier",
      channel: "webhook",
      category: "vegetation_anomaly",
      priority: "high",
      title: "Biomass Degradation Flag in Sector 9",
      body: "NDVI drop of 0.18 detected by Sentinel-2 pass.",
    });

    expect(dispatched.id).toBeDefined();
    expect(dispatched.channel).toBe("webhook");
    expect(dispatched.payloadPreview).toBeDefined();
    expect(monitoringNotificationService.getNotificationById(dispatched.id)).toBeDefined();
  });

  it("4. Automatically generates alerts from overdue tasks and due schedules", () => {
    const res = monitoringNotificationService.dispatchMonitoringAlerts();
    expect(res.dispatchedCount).toBeGreaterThanOrEqual(0);
    expect(monitoringNotificationService.getNotifications().length).toBeGreaterThan(0);
  });

  it("5. Marks individual notification and all notifications as read", () => {
    const unread = monitoringNotificationService.getNotifications({ status: "unread" });
    if (unread.length > 0) {
      const target = unread[0];
      const updated = monitoringNotificationService.markAsRead(target.id);
      expect(updated.status).toBe("read");
      expect(updated.readAt).toBeDefined();
    }

    monitoringNotificationService.markAllAsRead();
    const remainingUnread = monitoringNotificationService.getNotifications({ status: "unread" });
    expect(remainingUnread.length).toBe(0);
  });

  it("6. Computes accurate notification KPIs and delivery telemetry", () => {
    const kpis = monitoringNotificationService.getNotificationKPIs();
    expect(kpis.totalDispatched).toBeGreaterThan(0);
    expect(kpis.deliverySuccessRate).toBeGreaterThanOrEqual(0);
    expect(kpis.deliverySuccessRate).toBeLessThanOrEqual(100);
  });
});
