import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isAuditExportEligible,
  isCarbonCreditMintingEligible,
  ROLE_DEFINITIONS,
} from "../lib/b2bAccessControl";

describe("B2B Multi-Tenant RBAC & Governance Service", () => {
  it("should enforce CSR donor read-only audit permissions without manifest creation rights", () => {
    expect(hasPermission("csr_donor", "view_live_satellite_engine")).toBe(true);
    expect(hasPermission("csr_donor", "export_brsr_esg_report")).toBe(true);
    expect(hasPermission("csr_donor", "create_geodetic_project")).toBe(false);
    expect(hasPermission("csr_donor", "submit_field_photo_evidence")).toBe(false);
  });

  it("should grant NGO admins project onboarding and manifest creation rights", () => {
    expect(hasPermission("ngo_admin", "create_geodetic_project")).toBe(true);
    expect(hasPermission("ngo_admin", "upload_tree_manifest")).toBe(true);
    expect(hasPermission("ngo_admin", "upload_drone_survey")).toBe(true);
    expect(hasPermission("ngo_admin", "mint_carbon_credits")).toBe(false);
  });

  it("should restrict carbon credit minting to Third-Party Auditors and Super Admins", () => {
    expect(hasPermission("auditor", "mint_carbon_credits")).toBe(true);
    expect(hasPermission("super_admin", "mint_carbon_credits")).toBe(true);
    expect(hasPermission("ngo_admin", "mint_carbon_credits")).toBe(false);
    expect(hasPermission("csr_donor", "mint_carbon_credits")).toBe(false);
  });

  it("should gate audit report export behind minimum 70% confidence score", () => {
    const unverifiedCheck = isAuditExportEligible("csr_donor", 55);
    expect(unverifiedCheck.eligible).toBe(false);
    expect(unverifiedCheck.reason).toContain("requires a minimum of 70%");

    const verifiedCheck = isAuditExportEligible("csr_donor", 75);
    expect(verifiedCheck.eligible).toBe(true);
  });

  it("should gate carbon credit minting behind Gold Tier (>=85% score)", () => {
    const silverCheck = isCarbonCreditMintingEligible("auditor", 78);
    expect(silverCheck.eligible).toBe(false);
    expect(silverCheck.reason).toContain("Gold Verification Tier (Score >= 85%)");

    const goldCheck = isCarbonCreditMintingEligible("auditor", 88);
    expect(goldCheck.eligible).toBe(true);
  });
});
