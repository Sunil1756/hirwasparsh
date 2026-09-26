import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiModelSelectionHUD } from "../components/ai/AiModelSelectionHUD";

describe("PHASE 11 TASK 62 — AI Model & Service Selection HUD UI Component", () => {
  it("1. Renders Master Model Selection HUD header, Task 62 badge, and decision gate banner", () => {
    render(<AiModelSelectionHUD />);

    expect(screen.getByTestId("ai-model-selection-hud")).toBeInTheDocument();
    expect(
      screen.getByText(/AI Model & Service Selection Architecture/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Task 62 Validated/i)).toBeInTheDocument();

    expect(screen.getByTestId("custom-training-gate-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/Custom Training Decision Gate Assessment/i)
    ).toBeInTheDocument();
  });

  it("2. Displays Primary Model Card, Secondary Fallback, and Decision Gates Rubric for Species Assistance", () => {
    render(<AiModelSelectionHUD />);

    expect(screen.getByTestId("card-primary-model")).toBeInTheDocument();
    expect(screen.getByTestId("card-secondary-model")).toBeInTheDocument();
    expect(screen.getByTestId("decision-gates-rubric")).toBeInTheDocument();

    // Check Gemini 2.5 Flash as primary for species
    expect(
      screen.getAllByText(/Google Gemini 2.5 Flash \(Multimodal Vision\)/i)[0]
    ).toBeInTheDocument();
    expect(screen.getByText(/Pl@ntNet \/ GBIF Botanical API/i)).toBeInTheDocument();
  });

  it("3. Switches tabs across all 5 AI domains to inspect model selection options", () => {
    render(<AiModelSelectionHUD />);

    // Switch to Image Quality
    fireEvent.click(screen.getByTestId("tab-quality-selection"));
    expect(
      screen.getAllByText(/Client-Side Modified Laplacian & Luminance Kernel/i)[0]
    ).toBeInTheDocument();

    // Switch to Duplicate Detection
    fireEvent.click(screen.getByTestId("tab-duplicate-selection"));
    expect(
      screen.getAllByText(/Cryptographic SHA-256 \+ 64-bit dHash/i)[0]
    ).toBeInTheDocument();

    // Switch to Anomaly Detection
    fireEvent.click(screen.getByTestId("tab-anomaly-selection"));
    expect(
      screen.getAllByText(/Copernicus Sentinel-2 STAC \+ Open-Meteo Telemetry/i)[0]
    ).toBeInTheDocument();
  });

  it("4. Simulates offline mode in the Live Inference Routing Simulator", () => {
    render(<AiModelSelectionHUD />);

    expect(screen.getByTestId("routing-simulator")).toBeInTheDocument();
    expect(screen.getByText(/cloud primary/i)).toBeInTheDocument();

    // Click offline toggle
    const offlineBtn = screen.getByTestId("toggle-offline-btn");
    fireEvent.click(offlineBtn);

    expect(screen.getByText(/edge direct/i)).toBeInTheDocument();
    expect(screen.getByText(/MobileNetV3-Plant-Lite/i)).toBeInTheDocument();
  });
});
