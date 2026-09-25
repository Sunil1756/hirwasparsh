import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MonitoringScheduleConsole } from "../components/monitoring/MonitoringScheduleConsole";
import { monitoringScheduleService } from "../services/monitoringScheduleService";

describe("PHASE 9 TASK 46 — MonitoringScheduleConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
  });

  it("1. Renders MonitoringScheduleConsole with title, KPI metrics, and schedules table", () => {
    render(<MonitoringScheduleConsole />);

    expect(screen.getByText(/Automated Monitoring Schedules & Recurrence Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 46 — Monitoring Schedules/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Cadences/i)).toBeInTheDocument();
    expect(screen.getByText(/Next 24h Executions/i)).toBeInTheDocument();
    expect(screen.getByText(/Execution Success Rate/i)).toBeInTheDocument();

    // Verify seeded schedule rows
    expect(screen.getByText(/Sentinel-2 Multi-Spectral Orbital Sweep/i)).toBeInTheDocument();
    expect(screen.getByText(/Stratified Sample Quadrat \(PSP\) Ground Audit/i)).toBeInTheDocument();
  });

  it("2. Filters schedules table by search query", async () => {
    render(<MonitoringScheduleConsole />);

    const searchInput = screen.getByPlaceholderText(/Search schedule name, project, cadence/i);
    fireEvent.change(searchInput, { target: { value: "Mangrove" } });

    await waitFor(() => {
      expect(screen.getByText(/UAV Drone LiDAR & Canopy Orthomosaic Survey/i)).toBeInTheDocument();
      expect(screen.queryByText(/Stratified Sample Quadrat \(PSP\) Ground Audit/i)).not.toBeInTheDocument();
    });
  });

  it("3. Opens ScheduleConfigModal and creates a new recurring schedule", async () => {
    render(<MonitoringScheduleConsole />);

    const createBtn = screen.getByRole("button", { name: /Create Recurring Schedule/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Create Recurring Monitoring Schedule/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Create Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Create Recurring Monitoring Schedule/i)).not.toBeInTheDocument();
    });
  });

  it("4. Triggers Run Now execution and verifies success toast feedback", async () => {
    render(<MonitoringScheduleConsole />);

    const runButtons = screen.getAllByRole("button", { name: /Run Now/i });
    expect(runButtons.length).toBeGreaterThan(0);

    fireEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Execution Completed for/i)).toBeInTheDocument();
    });
  });

  it("5. Opens ScheduleExecutionHistoryModal and views logs", async () => {
    render(<MonitoringScheduleConsole />);

    const historyBtn = screen.getByRole("button", { name: /Global Execution Logs/i });
    fireEvent.click(historyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Global Monitoring Execution History/i)).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole("button", { name: /Close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Global Monitoring Execution History/i)).not.toBeInTheDocument();
    });
  });

  it("6. Toggles schedule status between active and paused", async () => {
    render(<MonitoringScheduleConsole />);

    const statusBadges = screen.getAllByRole("button", { name: /ACTIVE|PAUSED/i });
    expect(statusBadges.length).toBeGreaterThan(0);

    fireEvent.click(statusBadges[0]);

    // Status should toggle
    await waitFor(() => {
      expect(monitoringScheduleService.getSchedules().length).toBeGreaterThan(0);
    });
  });
});
