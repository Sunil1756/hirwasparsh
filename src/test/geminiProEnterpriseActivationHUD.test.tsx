import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GeminiProEnterpriseActivationHUD } from "../components/ai/GeminiProEnterpriseActivationHUD";

describe("PHASE 11 — Gemini 2.5 Pro Enterprise Activation HUD UI Component", () => {
  it("1. Renders Gemini Pro Flagship Header, active enterprise license key, and TPU endpoint", () => {
    render(<GeminiProEnterpriseActivationHUD />);

    expect(screen.getByTestId("gemini-pro-activation-hud")).toBeInTheDocument();
    expect(
      screen.getByText(/Google Gemini 2.5 Pro — Enterprise Flagship Edition/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Active Pro License/i)).toBeInTheDocument();

    expect(screen.getByTestId("gemini-pro-license-key")).toBeInTheDocument();
    expect(screen.getByTestId("copy-gemini-pro-key-btn")).toBeInTheDocument();
    expect(screen.getByText(/1,048,576 Tokens/i)).toBeInTheDocument();
    expect(screen.getByTestId("gemini-pro-species-select")).toBeInTheDocument();
    expect(screen.getByTestId("run-gemini-pro-btn")).toBeInTheDocument();
  });

  it("2. Changes species selection to Sandalwood", () => {
    render(<GeminiProEnterpriseActivationHUD />);

    const select = screen.getByTestId("gemini-pro-species-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Sandalwood" } });
    expect(select.value).toBe("Sandalwood");
  });

  it("3. Executes Gemini 2.5 Pro Deep Reasoning and renders live Chain-of-Thought (CoT) stream", async () => {
    render(<GeminiProEnterpriseActivationHUD />);

    const runBtn = screen.getByTestId("run-gemini-pro-btn");
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByTestId("gemini-pro-results-panel")).toBeInTheDocument();
    });

    expect(screen.getByTestId("pro-confidence")).toHaveTextContent("99.4%");
    expect(screen.getByTestId("pro-health")).toHaveTextContent("96 / 100");

    // Verify CoT panel
    expect(screen.getByTestId("cot-thinking-panel")).toBeInTheDocument();
    expect(screen.getByText(/APG IV Taxonomy/i)).toBeInTheDocument();
    expect(screen.getByText(/Microscopic Foliar Absorbance/i)).toBeInTheDocument();
    expect(screen.getByText(/In-Ground Root Collar/i)).toBeInTheDocument();

    // Toggle CoT visibility
    const toggleBtn = screen.getByTestId("toggle-cot-btn");
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/View Reasoning/i)).toBeInTheDocument();
  });
});
