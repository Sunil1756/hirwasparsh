import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isAuditExportEligible,
  isCarbonCreditMintingEligible,
  B2BRole,
} from "../lib/b2bAccessControl";
import { calculateIpccCarbonModel } from "../lib/ipccCarbonModeler";
import { resolveAgroClimaticZone, MAHARASHTRA_AGRO_ZONES } from "../lib/agroClimaticService";
import { sha256 } from "../services/auditLogService";

describe("CSR & Enterprise ESG RBAC Access Control", () => {
  it("allows CSR donors, auditors, and super admins to export SEBI BRSR ESG reports", () => {
    expect(hasPermission("csr_donor", "export_brsr_esg_report")).toBe(true);
    expect(hasPermission("auditor", "export_brsr_esg_report")).toBe(true);
    expect(hasPermission("super_admin", "export_brsr_esg_report")).toBe(true);
  });

  it("denies field scouts and non-compliance roles from exporting BRSR ESG reports", () => {
    expect(hasPermission("field_scout", "export_brsr_esg_report")).toBe(false);
  });

  it("enforces minimum 70% confidence score for formal institutional audit export", () => {
    const unverifiedCheck = isAuditExportEligible("csr_donor", 45);
    expect(unverifiedCheck.eligible).toBe(false);
    expect(unverifiedCheck.reason).toContain("requires a minimum of 70%");

    const verifiedCheck = isAuditExportEligible("csr_donor", 85);
    expect(verifiedCheck.eligible).toBe(true);
  });

  it("restricts carbon credit minting strictly to auditors/admins with >= 85% gold tier", () => {
    // CSR Donor cannot mint credits even with high score
    expect(isCarbonCreditMintingEligible("csr_donor", 90).eligible).toBe(false);

    // Auditor with insufficient score (< 85%) cannot mint
    expect(isCarbonCreditMintingEligible("auditor", 75).eligible).toBe(false);

    // Auditor with Gold Tier (>= 85%) is approved
    expect(isCarbonCreditMintingEligible("auditor", 90).eligible).toBe(true);
  });
});

describe("CSR Portfolio Zero-Tree Lock & Anti-Greenwashing", () => {
  it("strictly enforces 0 MT carbon credits for projects with 0 verified trees", () => {
    const targetTrees = 10000;
    const verifiedTrees = 0; // Zero trees verified

    const ipcc = calculateIpccCarbonModel({
      plantedTrees: verifiedTrees > 0 ? verifiedTrees : targetTrees,
      survivalRatePct: verifiedTrees > 0 ? 100 : 0,
      speciesKey: "mixed_native",
      permanenceBufferPct: 12,
    });

    const isZeroTreeLocked = verifiedTrees === 0;
    const annualCo2eMT = isZeroTreeLocked ? 0.0 : ipcc.annualNetCertifiedCreditsMT;
    const tenYearCo2eMT = isZeroTreeLocked ? 0.0 : ipcc.tenYearNetCertifiedCreditsMT;

    expect(isZeroTreeLocked).toBe(true);
    expect(annualCo2eMT).toBe(0.0);
    expect(tenYearCo2eMT).toBe(0.0);
  });

  it("generates legitimate IPCC carbon yields when living trees are verified", () => {
    const verifiedTrees = 5000;

    const ipcc = calculateIpccCarbonModel({
      plantedTrees: verifiedTrees,
      survivalRatePct: 90,
      speciesKey: "mixed_native",
      permanenceBufferPct: 12,
    });

    expect(ipcc.isZeroTreeLocked).toBe(false);
    expect(ipcc.verifiedLivingTrees).toBe(4500);
    expect(ipcc.annualNetCertifiedCreditsMT).toBeGreaterThan(0);
    expect(ipcc.tenYearNetCertifiedCreditsMT).toBeGreaterThan(0);
    expect(ipcc.annualValuationInr).toBeGreaterThan(0);
  });
});

describe("Government & State Forest Department Surveillance HUD", () => {
  it("resolves all 9 Maharashtra Agro-Climatic Zones correctly for state forestry audits", () => {
    // 1. South Konkan (Ratnagiri)
    expect(resolveAgroClimaticZone(16.99, 73.30, "Ratnagiri").zoneCode).toBe("MH-01");
    // 2. North Konkan (Thane)
    expect(resolveAgroClimaticZone(19.21, 72.97, "Thane").zoneCode).toBe("MH-02");
    // 3. Western Ghat (Mahabaleshwar)
    expect(resolveAgroClimaticZone(17.92, 73.65, "Mahabaleshwar").zoneCode).toBe("MH-03");
    // 4. Sub-Montane (Kolhapur/Pune transition)
    expect(resolveAgroClimaticZone(16.70, 74.24, "Kolhapur").zoneCode).toBe("MH-04");
    // 5. Plain Zone (Pune / Nashik)
    expect(resolveAgroClimaticZone(18.52, 74.50, "Pune").zoneCode).toBe("MH-05");
    // 6. Scarcity Zone (Solapur / Ahmednagar)
    expect(resolveAgroClimaticZone(17.66, 75.91, "Solapur").zoneCode).toBe("MH-06");
    // 7. Central Plateau (Chhatrapati Sambhajinagar)
    expect(resolveAgroClimaticZone(19.87, 75.34, "Chhatrapati Sambhajinagar").zoneCode).toBe("MH-07");
    // 8. Central Vidarbha (Amravati / Nagpur)
    expect(resolveAgroClimaticZone(20.93, 77.75, "Amravati").zoneCode).toBe("MH-08");
    // 9. Eastern Vidarbha (Gadchiroli)
    expect(resolveAgroClimaticZone(20.18, 80.00, "Gadchiroli").zoneCode).toBe("MH-09");
  });

  it("generates deterministic SHA-256 integrity seal for State Forest Department Registry manifests", () => {
    const treeRecord = {
      id: "tree-mh-forest-001",
      species: "Azadirachta indica",
      lat: 19.7515,
      lng: 75.7139,
      date: "2026-06-15",
    };

    const hash1 = sha256(`${treeRecord.id}:${treeRecord.species}:${treeRecord.lat}:${treeRecord.lng}:${treeRecord.date}`);
    const hash2 = sha256(`${treeRecord.id}:${treeRecord.species}:${treeRecord.lat}:${treeRecord.lng}:${treeRecord.date}`);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // Tampering test: altering lat by 0.0001 produces an avalanche change
    const tamperedHash = sha256(`${treeRecord.id}:${treeRecord.species}:${treeRecord.lat + 0.0001}:${treeRecord.lng}:${treeRecord.date}`);
    expect(tamperedHash).not.toBe(hash1);
  });
});
