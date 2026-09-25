import { describe, it, expect, beforeEach } from "vitest";
import {
  auditLogService,
  sha256,
  GENESIS_HASH,
  AuditLogEntry,
} from "../services/auditLogService";

describe("PHASE 8 TASK 44 — Cryptographic Audit Trail & Tamper-Evident Ledger Service", () => {
  beforeEach(() => {
    auditLogService.resetLedger();
  });

  it("1. Initializes baseline ledger with monotonic sequence numbers and valid SHA-256 hash chains", async () => {
    const logs = await auditLogService.getAuditLogs();
    expect(logs.length).toBeGreaterThanOrEqual(8);

    // Verify monotonic sequence: 1, 2, 3...
    logs.forEach((entry, idx) => {
      expect(entry.sequenceNumber).toBe(idx + 1);
      expect(entry.id).toContain("LOG-" + (idx + 1).toString().padStart(6, "0"));
      expect(entry.entryHash).toBeDefined();
      expect(entry.entryHash.length).toBe(64);
    });

    // Verify first entry has GENESIS_HASH as previousHash
    expect(logs[0].previousHash).toBe(GENESIS_HASH);

    // Verify hash chain pointers: previousHash equals predecessor's entryHash
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i].previousHash).toBe(logs[i - 1].entryHash);
    }
  });

  it("2. Appends new audit log events and computes valid hash pointers", async () => {
    const initialLogs = await auditLogService.getAuditLogs();
    const prevTail = initialLogs[initialLogs.length - 1];

    const newEntry = await auditLogService.logEvent({
      action: "MANUAL_OVERRIDE",
      actionDescription: "Auditor manually adjusted confidence weighting post-ground truth reconciliation",
      actor: {
        userId: "USR-002",
        name: "Sunita Deshmukh",
        role: "lead_verifier",
        ipAddress: "103.21.124.18",
      },
      target: {
        entityType: "claim",
        entityId: "claim-008",
        entityName: "Mahogany Specimen #12",
        projectId: "proj-sahayadri",
      },
      previousState: { confidenceScore: 68 },
      newState: { confidenceScore: 84 },
      metadata: { justification: "Field botanist re-validated specimen in person" },
      severity: "warning",
    });

    expect(newEntry.sequenceNumber).toBe(initialLogs.length + 1);
    expect(newEntry.previousHash).toBe(prevTail.entryHash);
    expect(newEntry.signature).toContain("SIG_LEAD_VERIFIER_");
    expect(newEntry.stateDelta).toBeDefined();
    expect(newEntry.stateDelta?.confidenceScore).toEqual({ from: 68, to: 84 });

    const updatedLogs = await auditLogService.getAuditLogs();
    expect(updatedLogs.length).toBe(initialLogs.length + 1);
  });

  it("3. Recomputes and verifies SHA-256 deterministic hashes", async () => {
    const text = "Hirwasparsh-Audit-2026-FIPS180";
    const hash1 = sha256(text);
    const hash2 = sha256(text);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

    // Verify that changing one character produces an entirely different hash (avalanche effect)
    const alteredHash = sha256(text + "!");
    expect(alteredHash).not.toBe(hash1);
  });

  it("4. Accurately computes state delta diffs between mutations", () => {
    const delta = auditLogService.computeStateDelta(
      { stage: "pending_l1_review", trustScore: 65, verified: false },
      { stage: "approved_certified", trustScore: 92, verified: true }
    );

    expect(delta).toBeDefined();
    expect(delta?.stage).toEqual({ from: "pending_l1_review", to: "approved_certified" });
    expect(delta?.trustScore).toEqual({ from: 65, to: 92 });
    expect(delta?.verified).toEqual({ from: false, to: true });
  });

  it("5. Full verification engine validates pristine untampered chain with 100% accuracy", async () => {
    const integrity = await auditLogService.verifyChainIntegrity();
    expect(integrity.isValid).toBe(true);
    expect(integrity.compromisedIndices.length).toBe(0);
    expect(integrity.validEntries).toBe(integrity.totalEntries);
    expect(integrity.merkleRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(integrity.tamperDetails.length).toBe(0);
  });

  it("6. Accurately detects and pinpoints unauthorized data tampering", async () => {
    // Simulate unauthorized modification of entry at index 2
    auditLogService.simulateTamperEvent(2, "action", "UNAUTHORIZED_TAMPER_ACTION");

    const compromisedIntegrity = await auditLogService.verifyChainIntegrity();
    expect(compromisedIntegrity.isValid).toBe(false);
    expect(compromisedIntegrity.compromisedIndices).toContain(2);
    expect(compromisedIntegrity.tamperDetails.length).toBeGreaterThan(0);
    expect(compromisedIntegrity.tamperDetails[0]).toContain("tampering detected");

    // Restore chain and verify it becomes valid again
    auditLogService.restoreChainIntegrity();
    const restoredIntegrity = await auditLogService.verifyChainIntegrity();
    expect(restoredIntegrity.isValid).toBe(true);
  });

  it("7. Computes deterministic binary Merkle tree root hash", async () => {
    const logs = await auditLogService.getAuditLogs();
    const root1 = auditLogService.computeMerkleRoot(logs);
    const root2 = auditLogService.computeMerkleRoot(logs);

    expect(root1).toBe(root2);
    expect(root1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("8. Generates RFC-4180 CSV, Signed JSON Package, and ISO 14064-3 Compliance Reports", async () => {
    const logs = await auditLogService.getAuditLogs();

    // CSV export
    const csv = auditLogService.exportAuditLogsToCsv(logs);
    expect(csv).toContain("Sequence,Timestamp_UTC,Action,Description");
    expect(csv).toContain("CLAIM_SUBMITTED");
    expect(csv).toContain("L3_ADMIN_CERTIFIED");

    // JSON Package export
    const jsonPkg = auditLogService.exportAuditPackageJson(logs);
    const parsed = JSON.parse(jsonPkg);
    expect(parsed.standard).toContain("ISO 14064-3");
    expect(parsed.merkleRoot).toBeDefined();
    expect(parsed.entries.length).toBe(logs.length);

    // ISO 14064-3 Report
    const report = await auditLogService.generateIso14064AuditReport();
    expect(report).toContain("ISO 14064-3 / VERRA VM0047 MRV AUDIT TRAIL COMPLIANCE CERTIFICATE");
    expect(report).toContain("CRYPTOGRAPHIC LEDGER SUMMARY");
  });

  it("9. Filters audit logs by query, action, role, severity, and project", async () => {
    const allLogs = await auditLogService.getAuditLogs();

    const auditorLogs = await auditLogService.getAuditLogs({ actorRole: "field_auditor" });
    expect(auditorLogs.every((e) => e.actor.role === "field_auditor")).toBe(true);

    const securityLogs = await auditLogService.getAuditLogs({ severity: "security" });
    expect(securityLogs.every((e) => e.severity === "security")).toBe(true);

    const sahayadriLogs = await auditLogService.getAuditLogs({ projectId: "proj-sahayadri" });
    expect(sahayadriLogs.every((e) => e.target.projectId === "proj-sahayadri")).toBe(true);

    const searchResults = await auditLogService.getAuditLogs({ searchQuery: "teleportation" });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults[0].actionDescription.toLowerCase()).toContain("teleportation");
  });
});
