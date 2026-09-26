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

    expect(screen.getByTestId("tier-standard-btn")).toBeInTheDocument();
    expect(screen.getByTestId("tier-pro-btn")).toBeInTheDocument();
    expect(screen.getByTestId("tier-custom-btn")).toBeInTheDocument();
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

  it("3. Toggles Custom Model Fine-Tuning Blueprint Card and views SFT specification", () => {
    render(<AiModelSelectionHUD />);

    expect(screen.queryByTestId("custom-blueprint-card")).not.toBeInTheDocument();

    // Click blueprint toggle
    const toggleBtn = screen.getByTestId("toggle-blueprint-btn");
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("custom-blueprint-card")).toBeInTheDocument();
    expect(screen.getByText(/Fine-Tuning Specification & Blueprint/i)).toBeInTheDocument();
    expect(screen.getByText(/25,000 photos/i)).toBeInTheDocument();
  });

  it("4. Switches tiers to Advanced Pro and Custom Green Enlightenment", () => {
    render(<AiModelSelectionHUD />);

    // Click Pro Tier
    fireEvent.click(screen.getByTestId("tier-pro-btn"));
    expect(
      screen.getByText(/Google Gemini 2.5 Pro \(Deep Reasoning & Verra Audit\)/i)
    ).toBeInTheDocument();

    // Click Custom Tier
    fireEvent.click(screen.getByTestId("tier-custom-btn"));
    expect(
      screen.getByText(/GreenEnlightenment-BioVision-v1/i)
    ).toBeInTheDocument();
  });

  it("5. Simulates offline mode in the Live Inference Routing Simulator", () => {
    render(<AiModelSelectionHUD />);

    expect(screen.getByTestId("routing-simulator")).toBeInTheDocument();

    // Click offline toggle
    const offlineBtn = screen.getByTestId("toggle-offline-btn");
    fireEvent.click(offlineBtn);

    expect(screen.getByText(/edge direct/i)).toBeInTheDocument();
    expect(screen.getByText(/MobileNetV3-Plant-Lite/i)).toBeInTheDocument();
  });
});
