import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VerificationDashboard } from "../components/verification/VerificationDashboard";
import { evidenceVerificationService } from "../services/evidenceVerificationService";
import { reviewerApprovalService } from "../services/reviewerApprovalService";

describe("PHASE 8 TASK 45 — VerificationDashboard UI Component", () => {
  beforeEach(() => {
    evidenceVerificationService.resetState();
    reviewerApprovalService.resetClaims();
  });

  it("1. Renders VerificationDashboard with title, disclaimer, and KPI metrics", () => {
    render(<VerificationDashboard />);

    expect(screen.getByText(/Verification Pipeline & Trust Command Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 8 • Task 45 — Verification Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-Greenwashing & Probabilistic Screening Principle/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Submissions/i)).toBeInTheDocument();
    expect(screen.getByText(/Screening Passed/i)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer Queue/i)).toBeInTheDocument();
  });

  it("2. Renders 4-Stage Funnel Flow Visualizer", () => {
    render(<VerificationDashboard />);

    expect(screen.getByText(/Stage 1: Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 2: Screening Checks/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 3: Reviewer Triage/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 4: Verification Outcome/i)).toBeInTheDocument();
  });

  it("3. Filters claims table when clicking on pipeline funnel stage", async () => {
    render(<VerificationDashboard />);

    const stage4Card = screen.getByText(/Stage 4: Verification Outcome/i).closest("div");
    if (stage4Card) {
      fireEvent.click(stage4Card);
    }

    await waitFor(() => {
      expect(screen.getByText(/Clear Stage Filter/i)).toBeInTheDocument();
    });

    const clearBtn = screen.getByText(/Clear Stage Filter/i);
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Clear Stage Filter/i)).not.toBeInTheDocument();
    });
  });

  it("4. Filters claims table by search query", async () => {
    render(<VerificationDashboard />);

    const searchInput = screen.getByPlaceholderText(/Search specimen, planter, project/i);
    fireEvent.change(searchInput, { target: { value: "Teak" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Teak/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("5. Executes Simulate End-to-End Pipeline action and renders toast", async () => {
    render(<VerificationDashboard />);

    const simBtn = screen.getByRole("button", { name: /Simulate End-to-End Pipeline/i });
    fireEvent.click(simBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pipeline Simulation Passed/i)).toBeInTheDocument();
    });
  });

  it("6. Switches view to full Workbench and navigates back to Dashboard", async () => {
    render(<VerificationDashboard />);

    const openWorkbenchBtn = screen.getByRole("button", { name: /Open Full Workbench/i });
    fireEvent.click(openWorkbenchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evidence Verification Workbench/i)).toBeInTheDocument();
      expect(screen.getByText(/Back to Main Verification Dashboard/i)).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /Back to Main Verification Dashboard/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/Verification Pipeline & Trust Command Center/i)).toBeInTheDocument();
    });
  });
});
