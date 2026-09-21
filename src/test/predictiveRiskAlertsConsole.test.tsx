import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PredictiveRiskAlertsConsole } from "../components/PredictiveRiskAlertsConsole";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "mock-dispatched-task-99" },
            error: null,
          }),
        }),
      }),
    })),
  },
}));

// Mock riskAlertNotificationService
vi.mock("@/lib/riskAlertNotificationService", () => ({
  triggerAiRiskAlertPipeline: vi.fn().mockResolvedValue({
    success: true,
    taskId: "task-test-12345",
    adoptersNotified: 12,
  }),
}));

describe("PredictiveRiskAlertsConsole UI Component", () => {
  it("renders ML predictive radar, threat title, and 6-feature matrix", () => {
    render(
      <PredictiveRiskAlertsConsole
        plotName="Kolhapur Agroforestry Sector 2"
        timeSeries={[
          { date: "2026-01-01", ndvi: 0.74, ndre: 0.60, ndwi: 0.28, lstTempC: 26.0 },
          { date: "2026-02-01", ndvi: 0.65, ndre: 0.50, ndwi: 0.08, lstTempC: 30.0 },
          { date: "2026-03-01", ndvi: 0.50, ndre: 0.35, ndwi: -0.05, lstTempC: 34.0 },
        ]}
      />
    );

    expect(screen.getByText(/ML Predictive Risk & Threat Forecasting Radar/i)).toBeInTheDocument();
    expect(screen.getByText(/Kolhapur Agroforestry Sector 2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Velocity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Foliar NDWI/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/RedEdge/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Thermal Anomaly/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Z-Score Metric/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Index/i)).toBeInTheDocument();
  });

  it("switches scenarios dynamically (Drought -> Pest -> Encroachment -> Waterlogging -> Fire -> Healthy)", async () => {
    render(<PredictiveRiskAlertsConsole plotName="Pune Field Sector" />);

    // Default is drought
    expect(screen.getByText(/Drought Shock/i)).toBeInTheDocument();

    // Switch to Pest scenario
    const pestButton = screen.getByRole("button", { name: "pest" });
    fireEvent.click(pestButton);
    expect(screen.getByText(/Biological Pest/i)).toBeInTheDocument();

    // Switch to Encroachment
    const encroachmentButton = screen.getByRole("button", { name: /Encroachment/i });
    fireEvent.click(encroachmentButton);
    expect(screen.getByText(/Canopy Clearing \/ Encroachment/i)).toBeInTheDocument();

    // Switch to Waterlog
    const waterlogButton = screen.getByRole("button", { name: /Waterlog/i });
    fireEvent.click(waterlogButton);
    expect(screen.getByText(/Waterlogging & Salinity/i)).toBeInTheDocument();

    // Switch to Fire
    const fireButton = screen.getByRole("button", { name: "fire" });
    fireEvent.click(fireButton);
    expect(screen.getByText(/Wildfire & Thermal Stress/i)).toBeInTheDocument();

    // Switch to Healthy
    const healthyButton = screen.getByRole("button", { name: "healthy" });
    fireEvent.click(healthyButton);
    expect(screen.getByText(/Robust Canopy Accretion/i)).toBeInTheDocument();
  });

  it("triggers automated ranger remediation task dispatch on button click", async () => {
    render(<PredictiveRiskAlertsConsole plotName="Nashik Vineyard Agro" />);

    const dispatchBtn = screen.getByRole("button", {
      name: /Dispatch Automated Ranger Remediation Task/i,
    });
    expect(dispatchBtn).toBeInTheDocument();

    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Task Dispatched/i)).toBeInTheDocument();
    });
  });
});
