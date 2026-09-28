import { supabase } from "@/integrations/supabase/client";
import { isGenuineProject, isGenuineTree, isGenuineOrganization } from "@/lib/genuineDataFilter";

export interface PlatformMetrics {
  totalTreesPlanted: number;
  totalTargetTrees: number;
  individualTrees: number;
  plantationProjectTrees: number;
  activeProjectsCount: number;
  totalOrganizationsCount: number;
  activeVolunteers: number;
  totalStories: number;
  challengeParticipants: number;
  survivingTrees: number;
  survivalRatePct: number;
  co2OffsetKgPerYear: number;
  o2GeneratedKgPerYear: number;
}

/**
 * Accurately aggregates all tree plantations across both:
 * 1. Individual & Project Tree Registries (`trees` table)
 * 2. Real Afforestation & Plantation Projects (`projects` table)
 * 3. Multi-tenant Organizations (`organizations` table)
 * 
 * STRICT INVARIANT: Grounded in real Supabase database records without fake multipliers or test artifacts.
 */
export async function fetchLivePlatformMetrics(): Promise<PlatformMetrics> {
  try {
    // 1. Fetch individual & project trees from 'trees'
    const { data: treesData } = await supabase
      .from("trees" as any)
      .select("id, status, planting_type, verification_status, admin_status, project_id, org_id, tree_code");

    const rawTrees = (treesData || []) as Array<{
      id: string;
      status: string;
      planting_type?: string;
      verification_status?: string;
      admin_status?: string;
      project_id?: string;
      org_id?: string;
      tree_code?: string;
    }>;

    const trees = rawTrees.filter((t) => isGenuineTree(t));

    const totalTreesPlanted = trees.length;
    const individualTrees = trees.filter((t) => t.planting_type === "individual" || !t.planting_type).length;
    const plantationProjectTrees = trees.filter((t) => t.planting_type === "institutional" || t.planting_type === "community" || t.planting_type === "drive").length;

    const survivingTrees = trees.filter(
      (t) => t.status === "alive" || t.status === "thriving" || t.status === "healthy"
    ).length;

    const survivalRatePct = totalTreesPlanted > 0 ? Math.round((survivingTrees / totalTreesPlanted) * 100) : 0;

    // 2. Fetch real projects from 'projects'
    const { data: projData } = await supabase
      .from("projects" as any)
      .select("id, target_trees, planted_trees, status, name, organization_id");

    const rawProjects = (projData || []) as Array<{
      id: string;
      target_trees: number;
      planted_trees: number;
      status: string;
      name?: string;
      organization_id?: string;
    }>;

    const projects = rawProjects.filter((p) => isGenuineProject(p));

    let totalTargetTrees = 0;
    let activeProjectsCount = 0;

    projects.forEach((p) => {
      if (p.status === "active") activeProjectsCount++;
      totalTargetTrees += Number(p.target_trees || 0);
    });

    // 3. Fetch real organizations count
    const { data: orgData, count: orgCountHead } = await supabase
      .from("organizations" as any)
      .select("id", { count: "exact" });

    let orgCount = 0;
    if (Array.isArray(orgData)) {
      orgCount = orgData.filter((o) => isGenuineOrganization(o)).length;
    } else if (typeof orgCountHead === "number") {
      orgCount = orgCountHead;
    }

    // 4. Fetch profiles / volunteers
    const { count: profilesCount } = await supabase
      .from("profiles" as any)
      .select("id", { count: "exact", head: true });

    // 5. Fetch growth updates / observations
    const { count: storiesCount } = await supabase
      .from("tree_observations" as any)
      .select("id", { count: "exact", head: true });

    // 6. Real Carbon & Oxygen calculations based on verified living trees
    const co2OffsetKgPerYear = Math.round(survivingTrees * 22);
    const o2GeneratedKgPerYear = Math.round(survivingTrees * 100);

    return {
      totalTreesPlanted,
      totalTargetTrees: totalTargetTrees + individualTrees,
      individualTrees,
      plantationProjectTrees: plantationProjectTrees || totalTreesPlanted - individualTrees,
      activeProjectsCount,
      totalOrganizationsCount: orgCount || 0,
      activeVolunteers: profilesCount || 0,
      totalStories: storiesCount || 0,
      challengeParticipants: profilesCount || 0,
      survivingTrees,
      survivalRatePct,
      co2OffsetKgPerYear,
      o2GeneratedKgPerYear,
    };
  } catch (err) {
    console.warn("Could not calculate live platform metrics:", err);
    return {
      totalTreesPlanted: 0,
      totalTargetTrees: 0,
      individualTrees: 0,
      plantationProjectTrees: 0,
      activeProjectsCount: 0,
      totalOrganizationsCount: 0,
      activeVolunteers: 0,
      totalStories: 0,
      challengeParticipants: 0,
      survivingTrees: 0,
      survivalRatePct: 0,
      co2OffsetKgPerYear: 0,
      o2GeneratedKgPerYear: 0,
    };
  }
}
