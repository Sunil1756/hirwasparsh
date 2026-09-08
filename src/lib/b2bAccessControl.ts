/**
 * B2B Multi-Tenant Role-Based Access Control (RBAC) & Enterprise Governance
 * Defines permission matrices for paying CSR donors, NGO partners,
 * field surveyors, third-party carbon auditors, and ACIC platform administrators.
 */

export type B2BRole =
  | "csr_donor"
  | "ngo_admin"
  | "field_scout"
  | "auditor"
  | "super_admin";

export type B2BPermission =
  | "view_public_telemetry"
  | "view_live_satellite_engine"
  | "export_brsr_esg_report"
  | "download_carbon_certificate"
  | "mint_carbon_credits"
  | "create_geodetic_project"
  | "upload_tree_manifest"
  | "upload_drone_survey"
  | "submit_field_photo_evidence"
  | "verify_field_audit"
  | "manage_organization_billing"
  | "access_raw_satellite_api";

export interface B2BUserProfile {
  id: string;
  email: string;
  organizationName: string;
  role: B2BRole;
  tier: "free_pilot" | "ngo_starter" | "csr_enterprise" | "government_institutional";
  isSubscriptionActive: boolean;
  maxHectaresAllowed: number;
  maxTreesAllowed: number;
}

export const ROLE_DEFINITIONS: Record<
  B2BRole,
  {
    name: string;
    description: string;
    color: string;
    permissions: B2BPermission[];
  }
> = {
  csr_donor: {
    name: "Corporate CSR / ESG Officer",
    description: "Funder & Corporate Sponsor. Audited access to BRSR Core ESG exports, live satellite vegetation tracking, and carbon certificates.",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    permissions: [
      "view_public_telemetry",
      "view_live_satellite_engine",
      "export_brsr_esg_report",
      "download_carbon_certificate",
    ],
  },
  ngo_admin: {
    name: "NGO / Plantation Operator",
    description: "Project Manager. Can onboard geodetic boundaries (KML/GeoJSON), upload tree planting manifests, assign field scouts, and upload drone data.",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    permissions: [
      "view_public_telemetry",
      "view_live_satellite_engine",
      "create_geodetic_project",
      "upload_tree_manifest",
      "upload_drone_survey",
      "submit_field_photo_evidence",
    ],
  },
  field_scout: {
    name: "Ground Field Surveyor",
    description: "Field Workforce. Captures geotagged mobile photos, on-device GPS audits, tree height, and botanical health updates.",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    permissions: [
      "view_public_telemetry",
      "submit_field_photo_evidence",
    ],
  },
  auditor: {
    name: "Third-Party MRV Verifier",
    description: "Independent Carbon Auditor. Evaluates multi-source confidence scores, inspects spectral anomaly feeds, and signs off verification audits.",
    color: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    permissions: [
      "view_public_telemetry",
      "view_live_satellite_engine",
      "export_brsr_esg_report",
      "download_carbon_certificate",
      "verify_field_audit",
      "mint_carbon_credits",
    ],
  },
  super_admin: {
    name: "ACIC Platform Administrator",
    description: "Startup Organization Admin. Full permissions across billing, API credentials, global project approval, and multi-tenant quotas.",
    color: "bg-red-500/15 text-red-600 border-red-500/30",
    permissions: [
      "view_public_telemetry",
      "view_live_satellite_engine",
      "export_brsr_esg_report",
      "download_carbon_certificate",
      "mint_carbon_credits",
      "create_geodetic_project",
      "upload_tree_manifest",
      "upload_drone_survey",
      "submit_field_photo_evidence",
      "verify_field_audit",
      "manage_organization_billing",
      "access_raw_satellite_api",
    ],
  },
};

/**
 * Checks if a given role has permission to execute an action.
 */
export function hasPermission(role: B2BRole, permission: B2BPermission): boolean {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return false;
  return def.permissions.includes(permission);
}

/**
 * Checks if an organization is eligible to export formal audited reports.
 * Requires: Valid CSR/Auditor/Admin role AND project multi-source confidence score >= 70%.
 */
export function isAuditExportEligible(role: B2BRole, compositeConfidenceScore: number): {
  eligible: boolean;
  reason?: string;
} {
  if (!hasPermission(role, "export_brsr_esg_report")) {
    return {
      eligible: false,
      reason: "Your organization role does not have permission to download formal audit reports.",
    };
  }

  if (compositeConfidenceScore < 70) {
    return {
      eligible: false,
      reason: `Project multi-source confidence score is ${compositeConfidenceScore}%. Institutional ESG/BRSR export requires a minimum of 70% (Field-Verified Tier).`,
    };
  }

  return { eligible: true };
}

/**
 * Checks if an organization is eligible to mint/claim tradeable carbon credits.
 * Requires: Gold Tier Verification (Score >= 85%) and Auditor/SuperAdmin role.
 */
export function isCarbonCreditMintingEligible(role: B2BRole, compositeConfidenceScore: number): {
  eligible: boolean;
  reason?: string;
} {
  if (!hasPermission(role, "mint_carbon_credits")) {
    return {
      eligible: false,
      reason: "Only certified Third-Party Auditors and ACIC Platform Administrators can authorize carbon credit issuance.",
    };
  }

  if (compositeConfidenceScore < 85) {
    return {
      eligible: false,
      reason: `Carbon credit minting requires Gold Verification Tier (Score >= 85%). Current project score is ${compositeConfidenceScore}%.`,
    };
  }

  return { eligible: true };
}
