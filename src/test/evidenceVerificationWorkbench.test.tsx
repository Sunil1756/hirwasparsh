import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { EvidenceVerificationWorkbench } from "../components/verification/EvidenceVerificationWorkbench";
import { ClaimVerificationReceiptModal } from "../components/verification/ClaimVerificationReceiptModal";
import { evidenceVerificationService } from "../services/evidenceVerificationService";

describe("Evidence Verification Workbench Component (Task 40)", () => {
  beforeEach(() => {
    evidenceVerificationService.resetToDefaults();
    vi.clearAllMocks();
  });

  it("renders workbench header, summary stats counters, and queue cards", () => {
    render(<EvidenceVerificationWorkbench />);

    expect(screen.getByText("Evidence Verification Workbench")).toBeDefined();
    expect(screen.getByText("Task 40 • Phase 8")).toBeDefined();
    expect(screen.getByText("Queue Total")).toBeDefined();
    expect(screen.getByText("Verified & Sealed")).toBeDefined();
    expect(screen.getByText("High-Trust Ready")).toBeDefined();

    expect(screen.getAllByText("TREE-BANYAN-7701").length).toBeGreaterThan(0);
  });

  it("allows filtering claims by status tab and trust tier", () => {
    render(<EvidenceVerificationWorkbench />);

    const verifiedTabs = screen.getAllByRole("button", { name: /^verified$/i });
    if (verifiedTabs.length > 0) {
      fireEvent.click(verifiedTabs[0]);
    }

    const allTabs = screen.getAllByRole("button", { name: /^all$/i });
    if (allTabs.length > 0) {
      fireEvent.click(allTabs[0]);
    }
    expect(screen.getAllByText("TREE-BANYAN-7701").length).toBeGreaterThan(0);
  });

  it("allows searching claims by text", () => {
    render(<EvidenceVerificationWorkbench />);

    const searchInput = screen.getByPlaceholderText(/Search Tree, Planter, Species/i);
    fireEvent.change(searchInput, { target: { value: "Teak" } });

    expect(screen.getByText("TREE-TEAK-2104")).toBeDefined();
  });

  it("displays 5W metadata and multi-check screening matrix for selected claim", () => {
    render(<EvidenceVerificationWorkbench />);

    expect(screen.getByText("5W Context & Evidence Provenance")).toBeDefined();
    expect(screen.getByText("Automated Multi-Check Screening Matrix")).toBeDefined();
    expect(screen.getByText("Geodetic Geofence Boundary")).toBeDefined();
    expect(screen.getByText("EXIF & Geodetic Watermark Authenticity")).toBeDefined();
    expect(screen.getByText("SHA-256 Photo Deduplication")).toBeDefined();
    expect(screen.getByText("Silvicultural Growth Physics Delta")).toBeDefined();
    expect(screen.getByText("Botanical AI Species & Canopy Matching")).toBeDefined();
  });

  it("verifies and seals a claim when clicking Approve & Seal Proof", async () => {
    render(<EvidenceVerificationWorkbench />);

    const approveBtn = screen.getByRole("button", { name: /Approve & Seal Proof/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/successfully verified and cryptographically sealed/i)).toBeDefined();
    });
  });

  it("opens re-audit dialog and submits request notes", async () => {
    render(<EvidenceVerificationWorkbench />);

    const reAuditBtn = screen.getByRole("button", { name: /Request Re-Audit/i });
    fireEvent.click(reAuditBtn);

    expect(screen.getByText("Request Field Re-Audit")).toBeDefined();

    const submitReAuditBtn = screen.getByRole("button", { name: /Dispatch Re-Audit Request/i });
    fireEvent.click(submitReAuditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Re-audit requested for claim/i)).toBeDefined();
    });
  });

  it("opens reject dialog and confirms rejection", async () => {
    render(<EvidenceVerificationWorkbench />);

    const rejectBtn = screen.getByRole("button", { name: /Reject Claim/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText("Reject Plantation Claim")).toBeDefined();

    const confirmRejectBtn = screen.getByRole("button", { name: /Confirm Rejection/i });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(screen.getByText(/rejected\./i)).toBeDefined();
    });
  });

  it("renders ClaimVerificationReceiptModal with seal, copy action and QR payload", () => {
    const mockReceipt = {
      receiptId: "RCP-2026-TEST-01",
      claimId: "CLM-TEST-01",
      treeId: "TREE-NEEM-01",
      species: "Azadirachta indica",
      planterId: "USR-001",
      verifiedAt: new Date().toISOString(),
      verifierId: "verifier_alice",
      confidenceScore: 98,
      trustTier: "high_trust" as const,
      sha256Seal: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      qrPayload: "https://hirwasparsh.org/verify/receipt/RCP-2026-TEST-01",
      gpsLocation: { latitude: 18.52043, longitude: 73.856743 },
    };

    const onClose = vi.fn();
    render(<ClaimVerificationReceiptModal receipt={mockReceipt} onClose={onClose} />);

    expect(screen.getByText("Cryptographic Proof Receipt")).toBeDefined();
    expect(screen.getByText("RCP-2026-TEST-01")).toBeDefined();
    expect(screen.getByText("TREE-NEEM-01")).toBeDefined();
    expect(screen.getByText("98% Score")).toBeDefined();
    expect(screen.getByText(mockReceipt.sha256Seal)).toBeDefined();

    const copyBtn = screen.getByRole("button", { name: /Copy Seal/i });
    fireEvent.click(copyBtn);

    const closeBtn = screen.getByText("Close Receipt");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});