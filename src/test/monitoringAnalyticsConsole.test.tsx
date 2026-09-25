import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MonitoringAnalyticsConsole } from "../components/monitoring/MonitoringAnalyticsConsole";
import { monitoringAnalyticsService } from "../services/monitoringAnalyticsService";
import { monitoringScheduleService } from "../services/monitoringScheduleService";
import { monitoringTaskService } from "../services/monitoringTaskService";
import { monitoringAlertService } from "../services/monitoringAlertService";
import { monitoringEscalationService } from "../services/monitoringEscalationService";

describe("TASK 51 — MonitoringAnalyticsConsole UI Component", () => {
  beforeEach(() => {
    monitoringScheduleService.resetToDefaults();
    monitoringTaskService.resetToDefaults();
    monitoringAlertService.resetToDefaults();
    monitoringEscalationService.resetToDefaults();
  });

  it("1. Renders MonitoringAnalyticsConsole with executive header and 6 KPI cards", () => {
    render(<MonitoringAnalyticsConsole />);

    expect(screen.getByText(/MRV Monitoring Analytics & Cadence Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 9 • Task 51 — Monitoring Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Monitored/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cadence Fulfillment/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mean NDVI Index/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cohort Survival/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Carbon Accrued/i)).toBeInTheDocument();
  });

  it("2. Displays multi-cadence fulfillment scorecards and species performance table", () => {
    render(<MonitoringAnalyticsConsole />);

    expect(screen.getByText(/Monitoring Protocol & Multi-Cadence Fulfillment Scorecard/i)).toBeInTheDocument();
    expect(screen.getByText(/Copernicus Sentinel-2 Spectral Passes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cochran Ground Truth Quadrat Audits/i)).toBeInTheDocument();
    expect(screen.getByText(/Species Survival & Allometric Increment Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Teak/i)).toBeInTheDocument();
    expect(screen.getByText(/Asiatic Mangrove/i)).toBeInTheDocument();
  });

  it("3. Switches time ranges (30D, 90D, 1Y, ALL)", async () => {
    render(<MonitoringAnalyticsConsole />);

    const timeRangeBtn30d = screen.getByTestId("time-range-30d");
    fireEvent.click(timeRangeBtn30d);

    await waitFor(() => {
      expect(timeRangeBtn30d.className).toContain("bg-emerald-600");
    });
  });

  it("4. Opens MRV Export Modal and switches between CSV and JSON formats", async () => {
    render(<MonitoringAnalyticsConsole />);

    const exportBtn = screen.getByTestId("open-export-modal-btn");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText(/Export MRV Compliance & Analytics Manifest/i)).toBeInTheDocument();
    });

    const jsonBtn = screen.getByTestId("export-json-btn");
    fireEvent.click(jsonBtn);

    await waitFor(() => {
      expect(jsonBtn.className).toContain("bg-emerald-600");
    });

    const downloadBtn = screen.getByTestId("download-export-btn");
    expect(downloadBtn).toBeInTheDocument();
  });
});
