import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MonitoringTaskConsole } from "../components/monitoring/MonitoringTaskConsole";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";

describe("PHASE 9 TASK 47 — MonitoringTaskConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
  });

  it("1. Renders MonitoringTaskConsole with header, KPI cards, and work orders table", () => {
    render(<MonitoringTaskConsole />);

    expect(screen.getByText(/Due & Overdue Monitoring Work Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 47 — Due & Overdue Tasks/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Due Tasks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SLA Compliance/i)).toBeInTheDocument();

    // Verify seeded work order titles
    expect(screen.getByText(/Ground Truth PSP Audit — Stratified Quadrat Batch #09/i)).toBeInTheDocument();
    expect(screen.getByText(/Konkan Mangrove Aerial LiDAR & Orthomosaic Sweep/i)).toBeInTheDocument();
  });

  it("2. Filters work orders by search query and status tabs", async () => {
    render(<MonitoringTaskConsole />);

    const searchInput = screen.getByPlaceholderText(/Search work order, squad, project/i);
    fireEvent.change(searchInput, { target: { value: "Mangrove" } });

    await waitFor(() => {
      expect(screen.getByText(/Konkan Mangrove Aerial LiDAR & Orthomosaic Sweep/i)).toBeInTheDocument();
      expect(screen.queryByText(/Ground Truth PSP Audit — Stratified Quadrat Batch #09/i)).not.toBeInTheDocument();
    });
  });

  it("3. Dispatches new monitoring work order via TaskAssignmentModal", async () => {
    render(<MonitoringTaskConsole />);

    const dispatchBtn = screen.getByTestId("dispatch-work-order-btn");
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Dispatch New Monitoring Work Order/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-dispatch-task-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Dispatch New Monitoring Work Order/i)).not.toBeInTheDocument();
    });
  });

  it("4. Evaluates recurring schedules and triggers due task generation", async () => {
    render(<MonitoringTaskConsole />);

    const evaluateBtn = screen.getByRole("button", { name: /Evaluate & Generate Due Tasks/i });
    fireEvent.click(evaluateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evaluated schedules: Generated/i)).toBeInTheDocument();
    });
  });

  it("5. Completes a work order via TaskCompletionModal", async () => {
    render(<MonitoringTaskConsole />);

    const completeButtons = screen.getAllByTestId("complete-task-btn");
    expect(completeButtons.length).toBeGreaterThan(0);

    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Complete Monitoring Work Order/i)).toBeInTheDocument();
    });

    const submitCompleteBtn = screen.getByRole("button", { name: /Submit & Complete Work Order/i });
    fireEvent.click(submitCompleteBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Complete Monitoring Work Order/i)).not.toBeInTheDocument();
    });
  });

  it("6. Opens escalation modal for overdue task and confirms escalation", async () => {
    render(<MonitoringTaskConsole />);

    const escalateButtons = screen.getAllByTestId("escalate-task-btn");
    expect(escalateButtons.length).toBeGreaterThan(0);

    fireEvent.click(escalateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/SLA Breach & Task Escalation/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /Confirm Escalation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/SLA Breach & Task Escalation/i)).not.toBeInTheDocument();
    });
  });
});
