import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationCenterConsole } from "../components/monitoring/NotificationCenterConsole";
import { monitoringNotificationService } from "../services/monitoringNotificationService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";

describe("PHASE 9 TASK 48 — NotificationCenterConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
  });

  it("1. Renders NotificationCenterConsole with header, KPI cards, and alert table", () => {
    render(<NotificationCenterConsole />);

    expect(screen.getByText(/Monitoring Alerts & Notifications Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 48 — Multi-Channel Notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/Unread In-App/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery Rate/i)).toBeInTheDocument();

    // Verify seeded notification titles
    expect(screen.getByText(/SLA Breach Escalation: Konkan Mangrove Drone Survey/i)).toBeInTheDocument();
    expect(screen.getByText(/Copernicus Sentinel-2 Vegetation Anomaly Pushed/i)).toBeInTheDocument();
  });

  it("2. Filters alerts by search query", async () => {
    render(<NotificationCenterConsole />);

    const searchInput = screen.getByPlaceholderText(/Search alert title, recipient, ID/i);
    fireEvent.change(searchInput, { target: { value: "Mangrove" } });

    await waitFor(() => {
      expect(screen.getByText(/SLA Breach Escalation: Konkan Mangrove Drone Survey/i)).toBeInTheDocument();
      expect(screen.queryByText(/Copernicus Sentinel-2 Vegetation Anomaly Pushed/i)).not.toBeInTheDocument();
    });
  });

  it("3. Dispatches test multi-channel notification via NotificationDispatchModal", async () => {
    render(<NotificationCenterConsole />);

    const dispatchBtn = screen.getByTestId("dispatch-test-alert-btn");
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Dispatch Multi-Channel Alert/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-dispatch-notification-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Dispatch Multi-Channel Alert/i)).not.toBeInTheDocument();
    });
  });

  it("4. Opens payload inspector modal for an alert", async () => {
    render(<NotificationCenterConsole />);

    const payloadButtons = screen.getAllByTestId("view-payload-btn");
    expect(payloadButtons.length).toBeGreaterThan(0);

    fireEvent.click(payloadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Dispatched Alert Payload Inspector/i)).toBeInTheDocument();
      expect(screen.getByText(/Formatted Transport Payload/i)).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole("button", { name: /Close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Dispatched Alert Payload Inspector/i)).not.toBeInTheDocument();
    });
  });

  it("5. Marks in-app unread alerts as read", async () => {
    render(<NotificationCenterConsole />);

    const markReadButtons = screen.getAllByTestId("mark-read-btn");
    if (markReadButtons.length > 0) {
      fireEvent.click(markReadButtons[0]);
    }

    const markAllBtn = screen.getByRole("button", { name: /Mark Read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/All in-app alerts marked as read/i)).toBeInTheDocument();
    });
  });
});
