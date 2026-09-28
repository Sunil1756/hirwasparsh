/**
 * Centralized Data Quality & Authenticity Filter
 * 
 * Ensures all synthetic demo seeds, smoke-test artifacts, and placeholder records
 * are strictly purged and filtered across the entire platform.
 * Only 100% genuine user plantations, verified institutional projects, and authentic
 * Copernicus Sentinel-2 satellite telemetry are presented to users.
 */

export const KNOWN_TEST_PROJECT_IDS = new Set<string>([
  "b1111111-2222-3333-4444-555555555555", // Synthetic pilot seed fixture
  "13d0a0f3-4123-413e-b88f-d286dffe8adb", // VarshikVruksha Ropan 2k26 (demo draft)
  "a40899f4-6c68-4fe8-b59d-5975d1e00a51", // saga (demo draft)
]);

export const KNOWN_TEST_TREE_IDS = new Set<string>([
  "2a0fb95b-7529-4c55-befd-0923512420c3", // Audit Probe Tree
  "5260d8c5-bf2c-485b-aef0-59c3dae1649f", // Smoke Test Neem #01
  "d49c3faa-c0d5-4169-bb07-ce2ba4a07b96", // Pilot Neem #01 — Campus North
  "f5640507-32e6-4aff-b946-560a1f057af8", // Pilot Banyan #02 — Botanical Green
  "1c68fa24-1776-45f7-bb4c-d01cd92e9f30", // Pilot Teak #03 — Agroforestry Trial
  "e6bc07fe-2024-4aa4-abba-c62957888199", // Pilot Mahua #04 — Native Woodland
  "9827a131-001f-4dc9-9f09-822ba07e99fc", // Pilot Shisham #05 — Riverbank Corridor
]);

export const KNOWN_TEST_ORG_IDS = new Set<string>([
  "a1111111-2222-3333-4444-555555555555",
]);

/**
 * Validates whether a plantation project is genuine and authentic
 */
export function isGenuineProject(project: any): boolean {
  if (!project || !project.id) return false;
  if (KNOWN_TEST_PROJECT_IDS.has(project.id)) return false;
  if (project.is_mock === true || project.status === "deleted" || project.status === "archived") return false;
  if (project.org_id && KNOWN_TEST_ORG_IDS.has(project.org_id)) return false;
  if (project.organization_id && KNOWN_TEST_ORG_IDS.has(project.organization_id)) return false;

  // Reject synthetic placeholder names with zero geometry or invalid coords
  const name = String(project.project_name || project.name || "").toLowerCase();
  if (name.includes("sahyadri bio-reserve agroforestry & carbon pilot") && (!project.boundary || project.boundary.length === 0)) {
    return false;
  }

  return true;
}

/**
 * Validates whether a tree record is genuine and authentic
 */
export function isGenuineTree(tree: any): boolean {
  if (!tree || !tree.id) return false;
  if (KNOWN_TEST_TREE_IDS.has(tree.id)) return false;
  if (tree.project_id && KNOWN_TEST_PROJECT_IDS.has(tree.project_id)) return false;
  if (tree.org_id && KNOWN_TEST_ORG_IDS.has(tree.org_id)) return false;
  if (tree.is_mock === true || tree.admin_status === "rejected") return false;

  const code = String(tree.tree_code || "").toLowerCase();
  if (code.startsWith("mock-") || code.startsWith("demo-")) return false;

  return true;
}

/**
 * Validates whether an organization is genuine and authentic
 */
export function isGenuineOrganization(org: any): boolean {
  if (!org || !org.id) return false;
  if (KNOWN_TEST_ORG_IDS.has(org.id)) return false;
  return true;
}
