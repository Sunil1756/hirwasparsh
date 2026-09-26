import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiModelTrainingAndSubscriptionHUD } from "../components/ai/AiModelTrainingAndSubscriptionHUD";

describe("PHASE 11 — AI Model Training & Subscription HUD UI Component", () => {
  it("1. Renders Master HUD Header, navigation tabs, and active subscription quota", () => {
    render(<AiModelTrainingAndSubscriptionHUD />);

    expect(screen.getByTestId("ai-training-subscription-hud")).toBeInTheDocument();
    expect(
      screen.getByText(/AI Model Training, Subscription & Marketplace Engine/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("tab-nav-subscriptions")).toBeInTheDocument();
    expect(screen.getByTestId("tab-nav-marketplace")).toBeInTheDocument();
    expect(screen.getByTestId("tab-nav-training")).toBeInTheDocument();

    // Check quota and API key
    expect(screen.getByText(/Monthly AI Scan Quota/i)).toBeInTheDocument();
    expect(screen.getByTestId("api-key-input")).toBeInTheDocument();
    expect(screen.getByTestId("copy-api-key-btn")).toBeInTheDocument();
  });

  it("2. Switches subscription plans from Pro to Enterprise Dedicated", async () => {
    render(<AiModelTrainingAndSubscriptionHUD />);

    const enterpriseBtn = screen.getByTestId("btn-select-plan-enterprise_dedicated");
    fireEvent.click(enterpriseBtn);

    await waitFor(() => {
      expect(screen.getByTestId("notification-toast")).toBeInTheDocument();
      expect(screen.getByText(/Subscription successfully changed to: ENTERPRISE DEDICATED/i)).toBeInTheDocument();
    });
  });

  it("3. Navigates to AI Model Marketplace and simulates purchasing a perpetual license", async () => {
    render(<AiModelTrainingAndSubscriptionHUD />);

    const marketTab = screen.getByTestId("tab-nav-marketplace");
    fireEvent.click(marketTab);

    expect(screen.getByTestId("panel-marketplace")).toBeInTheDocument();
    expect(screen.getByText(/Pre-Trained Specialized Forestry AI Models/i)).toBeInTheDocument();

    // Purchase license for PathoScan
    const buyBtn = screen.getByTestId("buy-license-pathoscan_agroforestry");
    fireEvent.click(buyBtn);

    await waitFor(() => {
      expect(screen.getByTestId("notification-toast")).toBeInTheDocument();
      expect(screen.getByText(/Purchase Confirmed! Receipt:/i)).toBeInTheDocument();
    });
  });

  it("4. Navigates to Vertex AI Custom Fine-Tuning Studio and launches a training job", async () => {
    render(<AiModelTrainingAndSubscriptionHUD />);

    const trainingTab = screen.getByTestId("tab-nav-training");
    fireEvent.click(trainingTab);

    expect(screen.getByTestId("panel-training")).toBeInTheDocument();
    expect(
      screen.getByText(/Google Cloud Vertex AI Supervised Fine-Tuning/i)
    ).toBeInTheDocument();

    // Change job name
    const jobInput = screen.getByTestId("input-job-name");
    fireEvent.change(jobInput, { target: { value: "GE-CustomModel-Run-009" } });

    // Launch training job
    const launchBtn = screen.getByTestId("launch-training-btn");
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByTestId("notification-toast")).toBeInTheDocument();
      expect(screen.getByText(/Vertex AI SFT Training Job Launched!/i)).toBeInTheDocument();
    });

    // Check newly added training job
    expect(screen.getByText(/GE-CustomModel-Run-009/i)).toBeInTheDocument();
  });

  it("5. Triggers model weights export to ONNX format", async () => {
    render(<AiModelTrainingAndSubscriptionHUD />);

    const trainingTab = screen.getByTestId("tab-nav-training");
    fireEvent.click(trainingTab);

    const onnxBtn = screen.getAllByText(/ONNX \(84MB\)/i)[0];
    fireEvent.click(onnxBtn);

    await waitFor(() => {
      expect(screen.getByTestId("notification-toast")).toBeInTheDocument();
      expect(screen.getByText(/Export Ready:/i)).toBeInTheDocument();
    });
  });
});
