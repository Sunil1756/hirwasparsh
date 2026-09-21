import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IpccCarbonCreditModeler } from "../components/IpccCarbonCreditModeler";

// Mock Toast Hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("IpccCarbonCreditModeler UI Component", () => {
  it("renders header, 4-pillar carbon metrics, and phenological stage", () => {
    render(
      <IpccCarbonCreditModeler
        initialPlantedTrees={2000}
        initialSurvivalRate={92}
        initialAgeYears={3.5}
        initialSpeciesKey="mixed_native"
        projectName="Western Ghats Corridor Parcel"
      />
    );

    expect(screen.getByText(/IPCC Tier-2 Carbon Credit & Biomass Modeler/i)).toBeInTheDocument();
    expect(screen.getByText(/Western Ghats Corridor Parcel/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Phenology:/i)).toBeInTheDocument();
    expect(screen.getByText(/Young Vegetative Growth Phase/i)).toBeInTheDocument();
    expect(screen.getByText(/1,840 \/ 2,000 Trees/i)).toBeInTheDocument();
    expect(screen.getByText(/92% Verified Survival/i)).toBeInTheDocument();

    // 4 KPI Metric Titles
    expect(screen.getByText(/Annual Net Credits/i)).toBeInTheDocument();
    expect(screen.getByText(/10-Yr Certified Sink/i)).toBeInTheDocument();
    expect(screen.getByText(/Standing Dry Biomass/i)).toBeInTheDocument();
    expect(screen.getByText(/Annual Valuation/i)).toBeInTheDocument();
  });

  it("toggles the interactive parameter modeler drawer and shows sliders", () => {
    render(
      <IpccCarbonCreditModeler
        initialPlantedTrees={1000}
        initialSurvivalRate={90}
        initialAgeYears={2.0}
      />
    );

    // Initial state: modeler drawer hidden
    expect(screen.queryByText(/Dominant Tree Species \/ Blend:/i)).not.toBeInTheDocument();

    // Click toggle button
    const toggleBtn = screen.getByRole("button", { name: /Interactive Parameter Modeler/i });
    fireEvent.click(toggleBtn);

    // Now drawer is open
    expect(screen.getByText(/Live IPCC Carbon Credit Modeler Parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/Dominant Tree Species \/ Blend:/i)).toBeInTheDocument();
    expect(screen.getByText(/Planted Cohort Size:/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Survival Rate:/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Stand Age:/i)).toBeInTheDocument();
    expect(screen.getByText(/Verra Buffer Pool Reserve:/i)).toBeInTheDocument();
  });

  it("triggers BRSR audit report export toast on button click", () => {
    render(
      <IpccCarbonCreditModeler
        initialPlantedTrees={1500}
        initialSurvivalRate={95}
        projectName="Vidarbha Bio-Carbon Plot"
      />
    );

    const exportBtn = screen.getByRole("button", { name: /Export BRSR Audit/i });
    fireEvent.click(exportBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("IPCC Carbon Audit Report Generated"),
        description: expect.stringContaining("Vidarbha Bio-Carbon Plot"),
      })
    );
  });
});
