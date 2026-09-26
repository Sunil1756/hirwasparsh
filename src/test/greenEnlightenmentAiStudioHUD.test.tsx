import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GreenEnlightenmentAiStudioHUD } from "../components/ai/GreenEnlightenmentAiStudioHUD";

describe("PHASE 11 — Green Enlightenment AI Model Studio HUD UI Component", () => {
  it("1. Renders Master AI Studio HUD header, engine controls, and specimen selector", () => {
    render(<GreenEnlightenmentAiStudioHUD />);

    expect(screen.getByTestId("ge-ai-studio-hud")).toBeInTheDocument();
    expect(
      screen.getByText(/Green Enlightenment AI Model Studio & Botanical Vision Engine/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Phase 11 Active/i)).toBeInTheDocument();

    expect(screen.getByTestId("engine-flash-btn")).toBeInTheDocument();
    expect(screen.getByTestId("engine-pro-btn")).toBeInTheDocument();
    expect(screen.getByTestId("engine-custom-btn")).toBeInTheDocument();
    expect(screen.getByTestId("species-select")).toBeInTheDocument();
    expect(screen.getByTestId("run-inspection-btn")).toBeInTheDocument();
  });

  it("2. Switches execution engines between Gemini 2.5 Flash, Gemini 2.5 Pro, and Custom SFT", () => {
    render(<GreenEnlightenmentAiStudioHUD />);

    const proBtn = screen.getByTestId("engine-pro-btn");
    fireEvent.click(proBtn);
    expect(proBtn.className).toContain("bg-purple-950");

    const customBtn = screen.getByTestId("engine-custom-btn");
    fireEvent.click(customBtn);
    expect(customBtn.className).toContain("bg-emerald-950");

    const flashBtn = screen.getByTestId("engine-flash-btn");
    fireEvent.click(flashBtn);
    expect(flashBtn.className).toContain("bg-indigo-950");
  });

  it("3. Changes selected species target", () => {
    render(<GreenEnlightenmentAiStudioHUD />);

    const select = screen.getByTestId("species-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Teak" } });
    expect(select.value).toBe("Teak");
  });

  it("4. Executes multimodal inspection and navigates across all 5 analysis tabs", async () => {
    render(<GreenEnlightenmentAiStudioHUD />);

    const runBtn = screen.getByTestId("run-inspection-btn");
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByTestId("inspection-results-panel")).toBeInTheDocument();
    });

    expect(screen.getByTestId("report-confidence")).toHaveTextContent("94.0%");
    expect(screen.getByTestId("report-health")).toHaveTextContent("92 / 100");

    // Tab 1: Taxonomy (default active)
    expect(screen.getByTestId("panel-taxonomy")).toBeInTheDocument();
    expect(screen.getByText(/Primary Botanical Classification/i)).toBeInTheDocument();

    // Tab 2: Vitality & Biomass
    fireEvent.click(screen.getByTestId("tab-res-vitality"));
    expect(screen.getByTestId("panel-vitality")).toBeInTheDocument();
    expect(screen.getByText(/Allometric Biomass & IPCC Carbon Accretion/i)).toBeInTheDocument();

    // Tab 3: Pathology & Bio-Prescription
    fireEvent.click(screen.getByTestId("tab-res-pathology"));
    expect(screen.getByTestId("panel-pathology")).toBeInTheDocument();
    expect(screen.getByText(/Microscopic Foliar Pathology/i)).toBeInTheDocument();
    expect(screen.getByText(/NSKE/i)).toBeInTheDocument();

    // Tab 4: Anti-Fraud & In-Ground Pit
    fireEvent.click(screen.getByTestId("tab-res-antifraud"));
    expect(screen.getByTestId("panel-antifraud")).toBeInTheDocument();
    expect(screen.getByText(/Anti-Fraud & In-Ground Plantation Authenticity Gate/i)).toBeInTheDocument();
    expect(screen.getByText(/NOT DETECTED/i)).toBeInTheDocument();

    // Tab 5: SFT Dataset Vault & JSONL Export
    fireEvent.click(screen.getByTestId("tab-res-sft"));
    expect(screen.getByTestId("panel-sft")).toBeInTheDocument();
    expect(screen.getByText(/Vertex AI Supervised Fine-Tuning/i)).toBeInTheDocument();

    // Click Export JSONL
    const exportBtn = screen.getByTestId("export-jsonl-btn");
    fireEvent.click(exportBtn);
    expect(screen.getByText(/Generated Gemini SFT JSONL Training Stream:/i)).toBeInTheDocument();
  });
});
