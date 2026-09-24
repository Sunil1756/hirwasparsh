/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 3 TASK 14
 * Multi-User & Multi-Organization Isolation Test Suite
 * 
 * Acceptance Criteria:
 * Two organizations can exist independently without data leakage across:
 * 1. Organization & Member Provisioning
 * 2. Project Hierarchy & Directory Queries
 * 3. Cross-Organization Mutation & State Transition Prevention
 * 4. Multi-Plot Cadastral Boundaries & Compartments
 * 5. Dashboard Telemetry & KPI Aggregations
 * 6. Membership, Role Modifications & Invitations
 * 7. Row Level Security (RLS) Policy Engine
 * 8. Multi-Tenant Storage Hierarchy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationService } from "@/services/organizationService";
import { projectService, CreateProjectPayload, ProjectBoundaryInput } from "@/services/projectService";
import { dashboardDataService } from "@/services/dashboardDataService";
import { rlsPolicyService, SecurityContext } from "@/lib/rlsPolicyService";
import { supabase } from "@/integrations/supabase/client";
import { Organization, Project, Tree, Notification } from "@/types/coreDatabase";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe("Phase 3 Task 14 — Multi-User & Multi-Organization Isolation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- TENANT SETUP DATA ---
  const orgAlphaId = "org-alpha-sahyadri-111";
  const orgBetaId = "org-beta-vidarbha-222";

  const userAlphaOwnerId = "usr-alpha-owner-1";
  const userAlphaWorkerId = "usr-alpha-worker-2";
  const userBetaOwnerId = "usr-beta-owner-3";
  const userBetaWorkerId = "usr-beta-worker-4";
  const superAdminId = "usr-superadmin-99";

  const contextAlphaOwner: SecurityContext = {
    user: { id: userAlphaOwnerId, role: "ngo", email: "owner@sahyadri.org" },
    orgMemberships: [
      {
        id: "mem-a1",
        organization_id: orgAlphaId,
        user_id: userAlphaOwnerId,
        member_role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const contextAlphaWorker: SecurityContext = {
    user: { id: userAlphaWorkerId, role: "field_worker", email: "worker@sahyadri.org" },
    orgMemberships: [
      {
        id: "mem-a2",
        organization_id: orgAlphaId,
        user_id: userAlphaWorkerId,
        member_role: "field_worker",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const contextBetaOwner: SecurityContext = {
    user: { id: userBetaOwnerId, role: "ngo", email: "owner@vidarbha.org" },
    orgMemberships: [
      {
        id: "mem-b1",
        organization_id: orgBetaId,
        user_id: userBetaOwnerId,
        member_role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const contextBetaWorker: SecurityContext = {
    user: { id: userBetaWorkerId, role: "field_worker", email: "worker@vidarbha.org" },
    orgMemberships: [
      {
        id: "mem-b2",
        organization_id: orgBetaId,
        user_id: userBetaWorkerId,
        member_role: "field_worker",
        status: "active",
        joined_at: "2026-01-01",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  };

  const contextSuperAdmin: SecurityContext = {
    user: { id: superAdminId, role: "admin", email: "admin@hirwasparsh.org" },
  };

  const orgAlpha: Organization = {
    id: orgAlphaId,
    name: "Sahyadri Bio-Shield Foundation",
    type: "ngo",
    registration_number: "NGO-MH-PUN-001",
    contact_email: "contact@sahyadri.org",
    is_verified: true,
    created_by: userAlphaOwnerId,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  const orgBeta: Organization = {
    id: orgBetaId,
    name: "Vidarbha Afforestation Society",
    type: "community_group",
    registration_number: "NGO-MH-NGP-002",
    contact_email: "contact@vidarbha.org",
    is_verified: false,
    created_by: userBetaOwnerId,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  const projectAlphaActive: Project = {
    id: "proj-alpha-active-1",
    organization_id: orgAlphaId,
    name: "Western Ghats Corridor Initiative",
    project_type: "reforestation",
    status: "active",
    target_trees: 5000,
    planted_trees: 2500,
    target_area_hectares: 12.5,
    location_name: "Mahabaleshwar, Maharashtra",
    species_list: ["Jamun", "Anjani", "Ficus"],
    created_by: userAlphaOwnerId,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  };

  const projectAlphaDraft: Project = {
    id: "proj-alpha-draft-2",
    organization_id: orgAlphaId,
    name: "Konkan Mangrove Bioshield (Draft)",
    project_type: "agroforestry",
    status: "draft",
    target_trees: 3000,
    planted_trees: 0,
    target_area_hectares: 8.0,
    location_name: "Ratnagiri, Maharashtra",
    species_list: ["Avicennia", "Rhizophora"],
    created_by: userAlphaOwnerId,
    created_at: "2026-02-10T00:00:00Z",
    updated_at: "2026-02-10T00:00:00Z",
  };

  const projectBetaActive: Project = {
    id: "proj-beta-active-1",
    organization_id: orgBetaId,
    name: "Nagpur Urban Miyawaki Park",
    project_type: "urban_greenery",
    status: "active",
    target_trees: 2000,
    planted_trees: 1800,
    target_area_hectares: 3.2,
    location_name: "Nagpur, Maharashtra",
    species_list: ["Neem", "Karanj", "Peepal"],
    created_by: userBetaOwnerId,
    created_at: "2026-02-05T00:00:00Z",
    updated_at: "2026-02-05T00:00:00Z",
  };

  const projectBetaDraft: Project = {
    id: "proj-beta-draft-2",
    organization_id: orgBetaId,
    name: "Melghat Teak Conservation (Internal Draft)",
    project_type: "reforestation",
    status: "draft",
    target_trees: 10000,
    planted_trees: 0,
    target_area_hectares: 25.0,
    location_name: "Amravati, Maharashtra",
    species_list: ["Teak", "Mahua", "Ain"],
    created_by: userBetaOwnerId,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  };

  // =========================================================================
  // 1. INDEPENDENT ORGANIZATION PROVISIONING & MEMBERSHIPS
  // =========================================================================
  describe("1. Independent Organization Provisioning & Coexistence", () => {
    it("provisions two distinct organizations with separated owners and profiles", async () => {
      // Create Org Alpha
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: orgAlpha, error: null }),
              }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "m-a", organization_id: orgAlphaId, user_id: userAlphaOwnerId, member_role: "owner" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      });

      const resAlpha = await organizationService.createOrganization(userAlphaOwnerId, {
        name: "Sahyadri Bio-Shield Foundation",
        type: "ngo",
        registration_number: "NGO-MH-PUN-001",
      });

      expect(resAlpha.organization.id).toBe(orgAlphaId);
      expect(resAlpha.member.organization_id).toBe(orgAlphaId);
      expect(resAlpha.member.user_id).toBe(userAlphaOwnerId);

      // Create Org Beta
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: orgBeta, error: null }),
              }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "m-b", organization_id: orgBetaId, user_id: userBetaOwnerId, member_role: "owner" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      });

      const resBeta = await organizationService.createOrganization(userBetaOwnerId, {
        name: "Vidarbha Afforestation Society",
        type: "community_group",
        registration_number: "NGO-MH-NGP-002",
      });

      expect(resBeta.organization.id).toBe(orgBetaId);
      expect(resBeta.member.organization_id).toBe(orgBetaId);
      expect(resBeta.member.user_id).toBe(userBetaOwnerId);

      // Verify zero overlap in IDs
      expect(resAlpha.organization.id).not.toBe(resBeta.organization.id);
      expect(resAlpha.member.user_id).not.toBe(resBeta.member.user_id);
    });

    it("ensures getUserOrganizations returns strictly tenant-scoped organizations for each user", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === userAlphaOwnerId) {
                  return {
                    eq: vi.fn().mockResolvedValue({
                      data: [{ id: "m-a1", organization_id: orgAlphaId, user_id: userAlphaOwnerId, member_role: "owner", status: "active" }],
                      error: null,
                    }),
                  };
                }
                if (val === userBetaOwnerId) {
                  return {
                    eq: vi.fn().mockResolvedValue({
                      data: [{ id: "m-b1", organization_id: orgBetaId, user_id: userBetaOwnerId, member_role: "owner", status: "active" }],
                      error: null,
                    }),
                  };
                }
                return { eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
              }),
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((col: string, ids: string[]) => {
                if (ids.includes(orgAlphaId)) return { data: [orgAlpha] };
                if (ids.includes(orgBetaId)) return { data: [orgBeta] };
                return { data: [] };
              }),
            }),
          };
        }
        return {};
      });

      const alphaOrgs = await organizationService.getUserOrganizations(userAlphaOwnerId);
      const betaOrgs = await organizationService.getUserOrganizations(userBetaOwnerId);

      expect(alphaOrgs.length).toBe(1);
      expect(alphaOrgs[0].organization.id).toBe(orgAlphaId);
      expect(alphaOrgs[0].organization.name).toBe("Sahyadri Bio-Shield Foundation");

      expect(betaOrgs.length).toBe(1);
      expect(betaOrgs[0].organization.id).toBe(orgBetaId);
      expect(betaOrgs[0].organization.name).toBe("Vidarbha Afforestation Society");

      // Verify no cross-tenant leakage
      expect(alphaOrgs.some((o) => o.organization.id === orgBetaId)).toBe(false);
      expect(betaOrgs.some((o) => o.organization.id === orgAlphaId)).toBe(false);
    });
  });

  // =========================================================================
  // 2. PROJECT DIRECTORY & QUERY ISOLATION
  // =========================================================================
  describe("2. Project Directory & Query Isolation", () => {
    it("filters projects strictly by organization_id without leaking neighbor projects", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "organization_id") {
                  if (val === orgAlphaId) {
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: [projectAlphaActive, projectAlphaDraft],
                        count: 2,
                        error: null,
                      }),
                    };
                  }
                  if (val === orgBetaId) {
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: [projectBetaActive, projectBetaDraft],
                        count: 2,
                        error: null,
                      }),
                    };
                  }
                }
                return { order: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }) };
              }),
            }),
          };
        }
        return {};
      });

      const alphaProjects = await projectService.getProjects({ organization_id: orgAlphaId });
      const betaProjects = await projectService.getProjects({ organization_id: orgBetaId });

      expect(alphaProjects.projects.length).toBe(2);
      expect(alphaProjects.projects.every((p) => p.organization_id === orgAlphaId)).toBe(true);
      expect(alphaProjects.projects.some((p) => p.organization_id === orgBetaId)).toBe(false);

      expect(betaProjects.projects.length).toBe(2);
      expect(betaProjects.projects.every((p) => p.organization_id === orgBetaId)).toBe(true);
      expect(betaProjects.projects.some((p) => p.organization_id === orgAlphaId)).toBe(false);
    });
  });

  // =========================================================================
  // 3. CROSS-ORGANIZATION MUTATION & ACTION BLOCKING
  // =========================================================================
  describe("3. Cross-Organization Mutation & Action Blocking", () => {
    it("blocks Org Alpha owner from updating Org Beta project profile", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: projectBetaActive, error: null }),
              }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // UserAlpha not in Org Beta!
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: "ngo" }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      // UserAlpha tries to manage Org Beta's project
      const canManage = await projectService.checkCanManageProject(projectBetaActive.id, userAlphaOwnerId);
      expect(canManage).toBe(false);
    });

    it("allows Org Beta owner and platform superadmins to manage Org Beta project", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: projectBetaActive, error: null }),
              }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    return Promise.resolve({ data: { member_role: "owner", status: "active" }, error: null });
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation((col: string, val: string) => {
                  if (val === superAdminId) return Promise.resolve({ data: { role: "admin" }, error: null });
                  return Promise.resolve({ data: { role: "ngo" }, error: null });
                }),
              }),
            }),
          };
        }
        return {};
      });

      const canBetaOwnerManage = await projectService.checkCanManageProject(projectBetaActive.id, userBetaOwnerId);
      expect(canBetaOwnerManage).toBe(true);

      const canSuperAdminManage = await projectService.checkCanManageProject(projectBetaActive.id, superAdminId);
      expect(canSuperAdminManage).toBe(true);
    });
  });

  // =========================================================================
  // 4. MULTI-PLOT CADASTRAL BOUNDARY ISOLATION
  // =========================================================================
  describe("4. Multi-Plot Cadastral Boundary Isolation", () => {
    it("returns strictly project-specific boundaries and zero cross-tenant geometries", async () => {
      const boundaryAlpha = [
        { id: "b-alpha-1", project_id: projectAlphaActive.id, boundary_name: "Mahabaleshwar Grove A", area_hectares: 12.5, area_acres: 30.88 },
      ];
      const boundaryBeta = [
        { id: "b-beta-1", project_id: projectBetaActive.id, boundary_name: "Nagpur Zone 1", area_hectares: 3.2, area_acres: 7.9 },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === projectAlphaActive.id) return { maybeSingle: vi.fn().mockResolvedValue({ data: projectAlphaActive, error: null }) };
                if (val === projectBetaActive.id) return { maybeSingle: vi.fn().mockResolvedValue({ data: projectBetaActive, error: null }) };
                return { maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
              }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === projectAlphaActive.id) return { order: vi.fn().mockResolvedValue({ data: boundaryAlpha, error: null }) };
                if (val === projectBetaActive.id) return { order: vi.fn().mockResolvedValue({ data: boundaryBeta, error: null }) };
                return { order: vi.fn().mockResolvedValue({ data: [], error: null }) };
              }),
            }),
          };
        }
        if (table === "trees") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        if (table === "audit_logs") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }) };
        }
        return {};
      });

      const detailsAlpha = await projectService.getProjectDetails(projectAlphaActive.id);
      const detailsBeta = await projectService.getProjectDetails(projectBetaActive.id);

      expect(detailsAlpha?.boundaries.length).toBe(1);
      expect(detailsAlpha?.boundaries[0].id).toBe("b-alpha-1");
      expect(detailsAlpha?.boundaries[0].boundary_name).toBe("Mahabaleshwar Grove A");
      expect(detailsAlpha?.total_hectares).toBe(12.5);

      expect(detailsBeta?.boundaries.length).toBe(1);
      expect(detailsBeta?.boundaries[0].id).toBe("b-beta-1");
      expect(detailsBeta?.boundaries[0].boundary_name).toBe("Nagpur Zone 1");
      expect(detailsBeta?.total_hectares).toBe(3.2);

      // Verify no shared boundary records
      expect(detailsAlpha?.boundaries.some((b) => b.id === "b-beta-1")).toBe(false);
      expect(detailsBeta?.boundaries.some((b) => b.id === "b-alpha-1")).toBe(false);
    });
  });

  // =========================================================================
  // 5. DASHBOARD TELEMETRY ZERO-LEAKAGE GUARANTEE
  // =========================================================================
  describe("5. Dashboard Telemetry Zero-Leakage Guarantee", () => {
    it("computes organization metrics strictly from isolated tenant records", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === orgAlphaId) return { maybeSingle: vi.fn().mockResolvedValue({ data: orgAlpha, error: null }) };
                if (val === orgBetaId) return { maybeSingle: vi.fn().mockResolvedValue({ data: orgBeta, error: null }) };
                return { maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
              }),
            }),
          };
        }
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === orgAlphaId) return Promise.resolve({ data: [projectAlphaActive, projectAlphaDraft], error: null });
                if (val === orgBetaId) return Promise.resolve({ data: [projectBetaActive, projectBetaDraft], error: null });
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === orgAlphaId) return Promise.resolve({ data: [{ id: "m-a1" }, { id: "m-a2" }], error: null });
                if (val === orgBetaId) return Promise.resolve({ data: [{ id: "m-b1" }], error: null });
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }
        if (table === "trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === orgAlphaId) return Promise.resolve({ data: [{ id: "t1", status: "alive" }, { id: "t2", status: "thriving" }], error: null });
                if (val === orgBetaId) return Promise.resolve({ data: [{ id: "t3", status: "alive" }], error: null });
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }
        if (table === "project_boundaries") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((col: string, ids: string[]) => {
                if (ids.includes(projectAlphaActive.id)) return Promise.resolve({ data: [{ id: "ba1", area_hectares: 12.5 }, { id: "ba2", area_hectares: 8.0 }], error: null });
                if (ids.includes(projectBetaActive.id)) return Promise.resolve({ data: [{ id: "bb1", area_hectares: 3.2 }, { id: "bb2", area_hectares: 25.0 }], error: null });
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }
        return {};
      });

      const metricsAlpha = await dashboardDataService.getOrganizationDashboardMetrics(orgAlphaId);
      const metricsBeta = await dashboardDataService.getOrganizationDashboardMetrics(orgBetaId);

      expect(metricsAlpha).toBeDefined();
      if (metricsAlpha) {
        expect(metricsAlpha.organizationId).toBe(orgAlphaId);
        expect(metricsAlpha.name).toBe("Sahyadri Bio-Shield Foundation");
        expect(metricsAlpha.totalProjects).toBe(2);
        expect(metricsAlpha.activeProjects).toBe(1);
        expect(metricsAlpha.totalTargetTrees).toBe(8000); // 5000 + 3000
        expect(metricsAlpha.totalPlantedTrees).toBe(2);
        expect(metricsAlpha.totalHectares).toBe(20.5); // 12.5 + 8.0
        expect(metricsAlpha.membersCount).toBe(2);
      }

      expect(metricsBeta).toBeDefined();
      if (metricsBeta) {
        expect(metricsBeta.organizationId).toBe(orgBetaId);
        expect(metricsBeta.name).toBe("Vidarbha Afforestation Society");
        expect(metricsBeta.totalProjects).toBe(2);
        expect(metricsBeta.activeProjects).toBe(1);
        expect(metricsBeta.totalTargetTrees).toBe(12000); // 2000 + 10000
        expect(metricsBeta.totalPlantedTrees).toBe(1);
        expect(metricsBeta.totalHectares).toBe(28.2); // 3.2 + 25.0
        expect(metricsBeta.membersCount).toBe(1);
      }
    });
  });

  // =========================================================================
  // 6. MEMBERSHIP, ROLE MODIFICATIONS & INVITATION ISOLATION
  // =========================================================================
  describe("6. Membership & Invitation Management Isolation", () => {
    it("prevents Org Alpha admin from inviting members into Org Beta", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // Alpha user NOT in Org Beta
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        organizationService.inviteMember(orgBetaId, userAlphaOwnerId, {
          invited_email: "intruder@domain.com",
          member_role: "field_worker",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents Org Alpha admin from updating member roles in Org Beta", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        organizationService.updateMemberRole(orgBetaId, userBetaWorkerId, "manager", userAlphaOwnerId)
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents Org Alpha admin from removing members in Org Beta", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "organization_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        organizationService.removeMember(orgBetaId, userBetaWorkerId, userAlphaOwnerId)
      ).rejects.toThrow("Unauthorized");
    });
  });

  // =========================================================================
  // 7. ROW LEVEL SECURITY (RLS) POLICY ENGINE ENFORCEMENT
  // =========================================================================
  describe("7. Row Level Security (RLS) Policy Engine Multi-Tenant Enforcement", () => {
    it("restricts reading unverified/draft projects across tenants", () => {
      // Alice cannot read Beta draft project
      expect(rlsPolicyService.canReadProject(projectBetaDraft, contextAlphaOwner)).toBe(false);
      expect(rlsPolicyService.canReadProject(projectBetaDraft, contextAlphaWorker)).toBe(false);

      // Bob can read Beta draft project
      expect(rlsPolicyService.canReadProject(projectBetaDraft, contextBetaOwner)).toBe(true);
      expect(rlsPolicyService.canReadProject(projectBetaDraft, contextBetaWorker)).toBe(true);

      // Platform admin can read all
      expect(rlsPolicyService.canReadProject(projectBetaDraft, contextSuperAdmin)).toBe(true);
    });

    it("restricts managing active and draft projects to tenant administrators only", () => {
      // Alice cannot manage Beta active project
      expect(rlsPolicyService.canManageProject(projectBetaActive, contextAlphaOwner)).toBe(false);
      expect(rlsPolicyService.canManageProject(projectBetaActive, contextAlphaWorker)).toBe(false);

      // Bob cannot manage Alpha active project
      expect(rlsPolicyService.canManageProject(projectAlphaActive, contextBetaOwner)).toBe(false);

      // Alice can manage Alpha active project
      expect(rlsPolicyService.canManageProject(projectAlphaActive, contextAlphaOwner)).toBe(true);
      // Beta owner can manage Beta active project
      expect(rlsPolicyService.canManageProject(projectBetaActive, contextBetaOwner)).toBe(true);
    });

    it("protects unverified trees and biometrics from cross-tenant observation", () => {
      const privateBetaTree: Tree = {
        id: "tree-beta-private-1",
        project_id: projectBetaDraft.id,
        user_id: userBetaWorkerId,
        tree_name: "Melghat Sapling #1",
        species: "Tectona grandis",
        plantation_date: "2026-03-01",
        height_cm: 30,
        location: "Melghat Core",
        latitude: 21.45,
        longitude: 77.35,
        status: "alive",
        verification_status: "pending",
        admin_status: "pending",
        planting_type: "institutional",
        points_awarded: 0,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      };

      // Alpha worker cannot see Beta unverified tree
      expect(rlsPolicyService.canReadTree(privateBetaTree, projectBetaDraft, contextAlphaWorker)).toBe(false);
      // Beta worker (creator/member) can see it
      expect(rlsPolicyService.canReadTree(privateBetaTree, projectBetaDraft, contextBetaWorker)).toBe(true);
      // Super admin can see it
      expect(rlsPolicyService.canReadTree(privateBetaTree, projectBetaDraft, contextSuperAdmin)).toBe(true);
    });

    it("enforces personal notification data privacy across users", () => {
      const notifAlpha: Notification = {
        id: "notif-alpha-1",
        user_id: userAlphaOwnerId,
        title: "Sahyadri Grant Approved",
        message: "Your carbon project grant has been approved.",
        type: "system",
        is_read: false,
        created_at: "2026-01-20T00:00:00Z",
      };

      expect(rlsPolicyService.canAccessNotification(notifAlpha, contextAlphaOwner)).toBe(true);
      expect(rlsPolicyService.canAccessNotification(notifAlpha, contextBetaOwner)).toBe(false);
      expect(rlsPolicyService.canAccessNotification(notifAlpha, contextBetaWorker)).toBe(false);
    });
  });

  // =========================================================================
  // 8. MULTI-TENANT STORAGE HIERARCHY ISOLATION
  // =========================================================================
  describe("8. Multi-Tenant Storage Hierarchy Isolation", () => {
    it("blocks cross-tenant access to private organizational storage paths", () => {
      const orgBetaStoragePath = `organizations/${orgBetaId}/financial_audits/fy26_report.pdf`;
      const orgAlphaStoragePath = `organizations/${orgAlphaId}/species_manifesto.pdf`;

      // Alpha owner cannot access Beta organization files
      expect(
        rlsPolicyService.canAccessStoragePath("project-documents", orgBetaStoragePath, contextAlphaOwner, {
          organization_id: orgBetaId,
          is_public: false,
        })
      ).toBe(false);

      // Beta owner can access Beta organization files
      expect(
        rlsPolicyService.canAccessStoragePath("project-documents", orgBetaStoragePath, contextBetaOwner, {
          organization_id: orgBetaId,
          is_public: false,
        })
      ).toBe(true);

      // Alpha owner can access Alpha organization files
      expect(
        rlsPolicyService.canAccessStoragePath("project-documents", orgAlphaStoragePath, contextAlphaOwner, {
          organization_id: orgAlphaId,
          is_public: false,
        })
      ).toBe(true);

      // SuperAdmin can access any path for system maintenance
      expect(
        rlsPolicyService.canAccessStoragePath("project-documents", orgBetaStoragePath, contextSuperAdmin, {
          organization_id: orgBetaId,
          is_public: false,
        })
      ).toBe(true);
    });

    it("allows public access for verified public assets while shielding private docs", () => {
      const publicEvidencePath = "trees/verified_tree_123.jpg";
      expect(
        rlsPolicyService.canAccessStoragePath("tree-photos", publicEvidencePath, contextAlphaWorker, {
          is_public: true,
        })
      ).toBe(true);
    });
  });
});
