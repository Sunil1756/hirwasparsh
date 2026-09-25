import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertManagementConsole } from "../components/monitoring/AlertManagementConsole";
import { monitoringAlertService } from "../services/monitoringAlertService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";

describe("PHASE 9 TASK 49 — AlertManagementConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
  });

  it("1. Renders AlertManagementConsole with header, KPI cards, and active incidents stream", () => {
    render(<AlertManagementConsole />);

    expect(screen.getByText(/Biometric & Satellite Anomaly Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 49 — Alert Rules & Incident Engine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Active Incidents/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mean TTR/i)).toBeInTheDocument();

    // Verify seeded incident titles
    expect(screen.getByText(/Abrupt Canopy Loss Detected in Western Buffer/i)).toBeInTheDocument();
    expect(screen.getByText(/14-Day Cumulative Drought Threshold Exceeded/i)).toBeInTheDocument();
  });

  it("2. Filters incidents by search query and switches to rules tab", async () => {
    render(<AlertManagementConsole />);

    const searchInput = screen.getByPlaceholderText(/Search incident, location, project/i);
    fireEvent.change(searchInput, { target: { value: "Mangrove" } });

    await waitFor(() => {
      expect(screen.getByText(/Mangrove Estuary Survival Rate at 78.5%/i)).toBeInTheDocument();
      expect(screen.queryByText(/Abrupt Canopy Loss Detected in Western Buffer/i)).not.toBeInTheDocument();
    });

    // Switch to rules tab
    const rulesTabBtn = screen.getByTestId("rules-tab-btn");
    fireEvent.click(rulesTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active Threshold Alert Rules/i)).toBeInTheDocument();
      expect(screen.getByText(/Severe Sentinel-2 NDVI Drop Anomaly/i)).toBeInTheDocument();
    });
  });

  it("3. Executes live telemetry anomaly scan and triggers new incidents", async () => {
    render(<AlertManagementConsole />);

    const scanBtn = screen.getByTestId("run-anomaly-scan-btn");
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(screen.getByText(/Telemetry anomaly scan complete/i)).toBeInTheDocument();
    });
  });

  it("4. Acknowledges an active incident", async () => {
    render(<AlertManagementConsole />);

    const ackButtons = screen.getAllByTestId("ack-incident-btn");
    expect(ackButtons.length).toBeGreaterThan(0);

    fireEvent.click(ackButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/acknowledged/i).length).toBeGreaterThan(0);
    });
  });

  it("5. Opens resolution modal and resolves an incident", async () => {
    render(<AlertManagementConsole />);

    const resolveButtons = screen.getAllByTestId("resolve-incident-btn");
    expect(resolveButtons.length).toBeGreaterThan(0);

    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Resolve Anomaly Incident/i)).toBeInTheDocument();
    });

    const submitResolutionBtn = screen.getByTestId("submit-incident-resolution-btn");
    fireEvent.click(submitResolutionBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Resolve Anomaly Incident/i)).not.toBeInTheDocument();
    });
  });

  it("6. Opens alert rule modal and creates new rule", async () => {
    render(<AlertManagementConsole />);

    const configRulesBtn = screen.getByTestId("configure-rules-btn");
    fireEvent.click(configRulesBtn);

    await waitFor(() => {
      expect(screen.getByText(/Configure New Anomaly Alert Rule/i)).toBeInTheDocument();
    });

    const submitRuleBtn = screen.getByTestId("submit-alert-rule-btn");
    fireEvent.click(submitRuleBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Configure New Anomaly Alert Rule/i)).not.toBeInTheDocument();
    });
  });
});
