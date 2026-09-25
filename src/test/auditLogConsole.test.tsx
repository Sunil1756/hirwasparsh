import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuditLogConsole } from "../components/verification/AuditLogConsole";
import { auditLogService } from "../services/auditLogService";

describe("PHASE 8 TASK 44 — AuditLogConsole UI Component", () => {
  beforeEach(() => {
    auditLogService.resetLedger();
  });

  it("1. Renders AuditLogConsole with KPI metric cards, filters, and audit table", async () => {
    render(<AuditLogConsole />);

    await waitFor(() => {
      expect(screen.getByText(/Cryptographic Audit Trail & Tamper-Evident Ledger/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Phase 8 • Task 44 — Audit Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Audit Events/i)).toBeInTheDocument();
    expect(screen.getByText(/4-Eyes Dual Signatures/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical \/ Security Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Valid/i)).toBeInTheDocument();

    // Verify initial rows are rendered
    expect(screen.getAllByText(/CLAIM_SUBMITTED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/L3_ADMIN_CERTIFIED/i).length).toBeGreaterThanOrEqual(1);
  });

  it("2. Filters audit stream by search query", async () => {
    render(<AuditLogConsole />);

    const searchInput = screen.getByPlaceholderText(/Search action, actor, entity, hash/i);
    fireEvent.change(searchInput, { target: { value: "teleportation" } });

    await waitFor(() => {
      expect(screen.getByText(/SPATIOTEMPORAL_FLAGGED/i)).toBeInTheDocument();
      expect(screen.queryByText(/BATCH_CERTIFIED/i)).not.toBeInTheDocument();
    });
  });

  it("3. Executes Chain Integrity Verification", async () => {
    render(<AuditLogConsole />);

    const verifyBtn = screen.getByRole("button", { name: /Verify Chain Integrity/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/100% Valid/i)).toBeInTheDocument();
    });
  });

  it("4. Toggles inline state delta row expansion", async () => {
    render(<AuditLogConsole />);

    const expandButtons = screen.getAllByTitle(/Toggle State Delta Preview/i);
    expect(expandButtons.length).toBeGreaterThan(0);

    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/State Mutations & Cryptographic Hash Pointer/i)).toBeInTheDocument();
    });
  });

  it("5. Opens AuditEntryDetailModal with cryptographic proofs", async () => {
    render(<AuditLogConsole />);

    const forensicButtons = screen.getAllByRole("button", { name: /Forensics/i });
    expect(forensicButtons.length).toBeGreaterThan(0);

    fireEvent.click(forensicButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Forensic Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Cryptographic Proof & SHA-256 Hash Chain/i)).toBeInTheDocument();
      expect(screen.getByText(/Raw Canonical JSON/i)).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close Inspector/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Forensic Overview/i)).not.toBeInTheDocument();
    });
  });

  it("6. Simulates Tamper Drill and displays Security Diagnostic Alert with Restore button", async () => {
    render(<AuditLogConsole />);

    const drillBtn = screen.getByRole("button", { name: /Simulate Tamper Drill/i });
    fireEvent.click(drillBtn);

    await waitFor(() => {
      expect(screen.getByText(/SIMULATED TAMPER DRILL/i)).toBeInTheDocument();
      expect(screen.getByText(/Tampered/i)).toBeInTheDocument();
    });

    // Click Restore button
    const restoreBtn = screen.getAllByRole("button", { name: /Restore/i })[0];
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/100% Valid/i)).toBeInTheDocument();
      expect(screen.queryByText(/SIMULATED TAMPER DRILL/i)).not.toBeInTheDocument();
    });
  });

  it("7. Opens Compliance Certificate modal and presents download options", async () => {
    render(<AuditLogConsole />);

    const certBtn = screen.getByRole("button", { name: /Compliance Certificate/i });
    fireEvent.click(certBtn);

    await waitFor(() => {
      expect(screen.getByText(/ISO 14064-3 \/ Verra VM0047 Audit Compliance/i)).toBeInTheDocument();
      expect(screen.getByText(/Binary Merkle Tree Root Hash/i)).toBeInTheDocument();
      expect(screen.getByText(/ISO Certificate \(\.txt\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Signed JSON Bundle/i)).toBeInTheDocument();
      expect(screen.getByText(/RFC-4180 CSV Ledger/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: /Close Report/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/ISO 14064-3 \/ Verra VM0047 Audit Compliance/i)).not.toBeInTheDocument();
    });
  });
});
