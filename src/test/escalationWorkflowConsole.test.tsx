import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EscalationWorkflowConsole } from "../components/monitoring/EscalationWorkflowConsole";
import { monitoringEscalationService } from "../services/monitoringEscalationService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringNotificationService } from "../services/monitoringNotificationService";
import { monitoringAlertService } from "../services/monitoringAlertService";

describe("PHASE 9 TASK 50 — EscalationWorkflowConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringNotificationService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();
  });

  it("1. Renders EscalationWorkflowConsole with header, KPI cards, and escalation table", () => {
    render(<EscalationWorkflowConsole />);

    expect(screen.getByText(/Operational Escalations & SLA Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 50 — Multi-Tier Escalation Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Cases/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA Recovery Rate/i)).toBeInTheDocument();

    // Verify seeded escalation titles
    expect(screen.getByText(/Konkan Mangrove Aerial LiDAR Overdue Breach/i)).toBeInTheDocument();
    expect(screen.getByText(/Severe Sentinel-2 NDVI Drop Anomaly in Sector 4B/i)).toBeInTheDocument();
  });

  it("2. Filters escalation cases by search query", async () => {
    render(<EscalationWorkflowConsole />);

    const searchInput = screen.getByPlaceholderText(/Search case, officer, project/i);
    fireEvent.change(searchInput, { target: { value: "Mangrove" } });

    await waitFor(() => {
      expect(screen.getByText(/Konkan Mangrove Aerial LiDAR Overdue Breach/i)).toBeInTheDocument();
      expect(screen.queryByText(/Severe Sentinel-2 NDVI Drop Anomaly in Sector 4B/i)).not.toBeInTheDocument();
    });
  });

  it("3. Executes SLA breach scan and auto-escalates overdue items", async () => {
    render(<EscalationWorkflowConsole />);

    const scanBtn = screen.getByTestId("scan-escalations-btn");
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(screen.getByText(/SLA escalation scan complete/i)).toBeInTheDocument();
    });
  });

  it("4. Opens action modal to advance operational tier", async () => {
    render(<EscalationWorkflowConsole />);

    const advanceBtns = screen.getAllByTestId("advance-tier-btn");
    expect(advanceBtns.length).toBeGreaterThan(0);

    fireEvent.click(advanceBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Promote Escalation Tier/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-escalation-action-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Promote Escalation Tier/i)).not.toBeInTheDocument();
    });
  });

  it("5. Opens action modal to submit SLA mitigation strategy", async () => {
    render(<EscalationWorkflowConsole />);

    const mitigateBtns = screen.getAllByTestId("mitigate-btn");
    expect(mitigateBtns.length).toBeGreaterThan(0);

    fireEvent.click(mitigateBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Submit SLA Mitigation Plan/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-escalation-action-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Submit SLA Mitigation Plan/i)).not.toBeInTheDocument();
    });
  });

  it("6. Opens formal closure modal and signs off on case resolution", async () => {
    render(<EscalationWorkflowConsole />);

    const closeBtns = screen.getAllByTestId("close-escalation-btn");
    expect(closeBtns.length).toBeGreaterThan(0);

    fireEvent.click(closeBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Formal Compliance Sign-Off & Closure/i)).toBeInTheDocument();
    });

    const submitClosureBtn = screen.getByTestId("submit-escalation-closure-btn");
    fireEvent.click(submitClosureBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Formal Compliance Sign-Off & Closure/i)).not.toBeInTheDocument();
    });
  });
});
