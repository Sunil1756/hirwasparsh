import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { MonitoringDashboard } from "../pages/MonitoringDashboard";
import { monitoringDashboardService } from "../services/monitoringDashboardService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";
import { monitoringAlertService } from "../services/monitoringAlertService";
import { monitoringEscalationService } from "../services/monitoringEscalationService";
import { monitoringAnalyticsService } from "../services/monitoringAnalyticsService";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const switchTab = (tabElement: HTMLElement) => {
  fireEvent.pointerDown(tabElement, { button: 0 });
  fireEvent.mouseDown(tabElement, { button: 0 });
  fireEvent.click(tabElement);
  fireEvent.keyDown(tabElement, { key: "Enter", code: "Enter" });
};

describe("TASK 52 — Full Monitoring Dashboard Cross-Tab Integration Suite", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();

    vi.spyOn(monitoringDashboardService, "getMonitoringDashboardData").mockResolvedValue({
      treesRequiringMonitoring: [],
      overdueObservations: [],
      recentObservations: [],
      survivalStatistics: {
        totalTrees: 100,
        aliveCount: 90,
        stressedCount: 5,
        damagedCount: 2,
        deadCount: 3,
        needsReviewCount: 0,
        unknownCount: 0,
        overallSurvivalRate: 90,
        speciesSurvivalRates: [],
      },
      treesNeedingReview: [],
      kpis: {
        requiringMonitoringCount: 0,
        overdueCount: 0,
        criticalOverdueCount: 0,
        totalObservedToday: 0,
        overallSurvivalRate: 90,
        needsReviewCount: 0,
      },
    });
  });

  it("1. Renders MonitoringDashboard with all Phase 9 & Phase 10 tabs", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Automated Schedules/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /Due & Overdue Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Anomaly Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Escalations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Monitoring Analytics/i })).toBeInTheDocument();
  });

  it("2. Navigates to Schedules tab and renders MonitoringScheduleConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Automated Schedules/i })).toBeInTheDocument();
    });

    const schedulesTab = screen.getByRole("tab", { name: /Automated Schedules/i });
    switchTab(schedulesTab);

    await waitFor(() => {
      expect(screen.getByTestId("monitoring-schedule-console")).toBeInTheDocument();
      expect(screen.getByText(/Automated Monitoring Schedules & Recurrence Engine/i)).toBeInTheDocument();
      expect(screen.getByText(/Sentinel-2 Multi-Spectral Orbital Sweep/i)).toBeInTheDocument();
    });
  });

  it("3. Navigates to Work Orders tab and renders MonitoringTaskConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Due & Overdue Tasks/i })).toBeInTheDocument();
    });

    const workOrdersTab = screen.getByRole("tab", { name: /Due & Overdue Tasks/i });
    switchTab(workOrdersTab);

    await waitFor(() => {
      expect(screen.getByText(/Due & Overdue Monitoring Work Orders/i)).toBeInTheDocument();
    });
  });

  it("4. Navigates to Notifications tab and renders NotificationCenterConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Notifications/i })).toBeInTheDocument();
    });

    const notifsTab = screen.getByRole("tab", { name: /Notifications/i });
    switchTab(notifsTab);

    await waitFor(() => {
      expect(screen.getByTestId("notification-center-console")).toBeInTheDocument();
      expect(screen.getByText(/Monitoring Alerts & Notifications Center/i)).toBeInTheDocument();
    });
  });

  it("5. Navigates to Anomaly Alerts tab and renders AlertManagementConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Anomaly Alerts/i })).toBeInTheDocument();
    });

    const alertsTab = screen.getByRole("tab", { name: /Anomaly Alerts/i });
    switchTab(alertsTab);

    await waitFor(() => {
      expect(screen.getByTestId("alert-management-console")).toBeInTheDocument();
      expect(screen.getByText(/Biometric & Satellite Anomaly Alerts/i)).toBeInTheDocument();
    });
  });

  it("6. Navigates to Escalations tab and renders EscalationWorkflowConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Escalations/i })).toBeInTheDocument();
    });

    const escalationsTab = screen.getByRole("tab", { name: /Escalations/i });
    switchTab(escalationsTab);

    await waitFor(() => {
      expect(screen.getByTestId("escalation-workflow-console")).toBeInTheDocument();
      expect(screen.getByText(/Operational Escalations & SLA Management/i)).toBeInTheDocument();
    });
  });

  it("7. Navigates to Analytics tab and renders MonitoringAnalyticsConsole", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MonitoringDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Monitoring Analytics/i })).toBeInTheDocument();
    });

    const analyticsTab = screen.getByRole("tab", { name: /Monitoring Analytics/i });
    switchTab(analyticsTab);

    await waitFor(() => {
      expect(screen.getByTestId("monitoring-analytics-console")).toBeInTheDocument();
      expect(screen.getByText(/MRV Monitoring Analytics & Cadence Intelligence/i)).toBeInTheDocument();
    });
  });
});
