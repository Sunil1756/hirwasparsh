import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiRequirementsSpecificationHUD } from "../components/ai/AiRequirementsSpecificationHUD";

describe("PHASE 11 TASK 61 — AI Requirements Specification HUD UI Component", () => {
  it("1. Renders Master AI Requirements HUD header, Task 61 badge, and 5 application tabs", () => {
    render(<AiRequirementsSpecificationHUD />);

    expect(screen.getByTestId("ai-requirements-specification-hud")).toBeInTheDocument();
    expect(
      screen.getByText(/AI Forestry Intelligence Requirements & Problem Formulation/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Task 61 Validated/i)).toBeInTheDocument();

    expect(screen.getByTestId("tab-species-assistance")).toBeInTheDocument();
    expect(screen.getByTestId("tab-tree-condition")).toBeInTheDocument();
    expect(screen.getByTestId("tab-image-quality")).toBeInTheDocument();
    expect(screen.getByTestId("tab-duplicate-detection")).toBeInTheDocument();
    expect(screen.getByTestId("tab-anomaly-detection")).toBeInTheDocument();
  });

  it("2. Displays Mathematical Formulation, Output Schema, and Confidence Routing for Species Assistance", () => {
    render(<AiRequirementsSpecificationHUD />);

    expect(screen.getByText("REQ-AI-001")).toBeInTheDocument();
    expect(
      screen.getByText(/Botanical Species Assistance & Native Agroforestry Validation/i)
    ).toBeInTheDocument();

    expect(screen.getByTestId("section-math")).toBeInTheDocument();
    expect(screen.getByTestId("section-confidence")).toBeInTheDocument();
    expect(screen.getByTestId("section-failures")).toBeInTheDocument();

    // Check 3-Tier Routing
    expect(screen.getByText(/Tier 1: High Confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2: Medium Confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 3: Low Confidence/i)).toBeInTheDocument();
  });

  it("3. Switches tabs to Tree Condition, Image Quality, and Duplicate Detection", () => {
    render(<AiRequirementsSpecificationHUD />);

    // Switch to Tree Condition
    fireEvent.click(screen.getByTestId("tab-tree-condition"));
    expect(screen.getByText("REQ-AI-002")).toBeInTheDocument();
    expect(
      screen.getByText(/Tree Vitality, Foliar Condition & Growth Stage Classifier/i)
    ).toBeInTheDocument();

    // Switch to Duplicate Detection
    fireEvent.click(screen.getByTestId("tab-duplicate-detection"));
    expect(screen.getByText("REQ-AI-004")).toBeInTheDocument();
    expect(
      screen.getByText(/Perceptual Hashing & Spatiotemporal Anti-Fraud Engine/i)
    ).toBeInTheDocument();

    // Switch to Anomaly Detection
    fireEvent.click(screen.getByTestId("tab-anomaly-detection"));
    expect(screen.getByText("REQ-AI-005")).toBeInTheDocument();
    expect(
      screen.getByText(/Predictive Telemetry, Defoliation Shock & Discrepancy Anomaly Engine/i)
    ).toBeInTheDocument();
  });

  it("4. Interacts with the Image Quality Gate Simulator", () => {
    render(<AiRequirementsSpecificationHUD />);

    expect(screen.getByTestId("sim-quality")).toBeInTheDocument();
    expect(screen.getByText("QUALITY PASS")).toBeInTheDocument();

    // Toggle Screen Re-photography checkbox
    const screenCheckbox = screen.getByLabelText(/Simulate Screen Re-photography/i);
    fireEvent.click(screenCheckbox);

    expect(screen.getByText("QUALITY REJECT")).toBeInTheDocument();
    expect(screen.getByText(/Screen re-photography detected/i)).toBeInTheDocument();
  });

  it("5. Interacts with the Duplicate & Fraud Collision Simulator", () => {
    render(<AiRequirementsSpecificationHUD />);

    expect(screen.getByTestId("sim-duplicate")).toBeInTheDocument();

    // Click "Different Tree" sample button
    const diffTreeBtn = screen.getByText(/Different Tree/i);
    fireEvent.click(diffTreeBtn);

    expect(screen.getByText("SAFE")).toBeInTheDocument();
    expect(screen.getByText(/Unique tree photographic evidence/i)).toBeInTheDocument();
  });
});
