import { supabase } from "@/integrations/supabase/client";

export interface PlatformMetrics {
  totalTreesPlanted: number;
  totalTargetTrees: number;
  individualTrees: number;
  plantationProjectTrees: number;
  activeProjectsCount: number;
  activeVolunteers: number;
  totalStories: number;
  challengeParticipants: number;
  co2OffsetKgPerYear: number;
  o2GeneratedKgPerYear: number;
}

/**
 * Accurately aggregates all tree plantations across both:
 * 1. Individual Tree Plantations (`trees` table)
 * 2. Large-Scale Institutional & CSR Agroforestry Drives (`plantation_projects` table)
 */
export async function fetchLivePlatformMetrics(): Promise<PlatformMetrics> {
  try {
    // 1. Fetch individual trees from 'trees'
    const { data: treesData } = await supabase
      .from("trees")
      .select("id, admin_status, verification_status");

    const individualTrees = (treesData || []).filter(t => t.admin_status === "approved").length;

    // 2. Fetch large-scale plantation projects from 'plantation_projects'
    const { data: projData } = await supabase
      .from("plantation_projects")
      .select("id, target_trees, verified_trees, bulk_rows, status");

    let verifiedProjectTrees = 0;
    let totalTargetTrees = 0;
    let activeProjectsCount = 0;

    (projData || []).forEach((p) => {
      activeProjectsCount++;
      totalTargetTrees += (p.target_trees || p.bulk_rows || 0);
      verifiedProjectTrees += (p.verified_trees || 0);
    });

    // 3. Fetch profiles / volunteers
    const { count: profilesCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // 4. Fetch stories (growth updates)
    const { count: storiesCount } = await supabase
      .from("growth_updates")
      .select("id", { count: "exact", head: true });

    // 5. Fetch challenge participants
    const { count: challengeCount } = await supabase
      .from("challenge_participants")
      .select("id", { count: "exact", head: true });

    // Verified living trees on ground
    const totalTreesPlanted = individualTrees + verifiedProjectTrees;
    const co2OffsetKgPerYear = Math.round(totalTreesPlanted * 22);
    const o2GeneratedKgPerYear = Math.round(totalTreesPlanted * 100);

    return {
      totalTreesPlanted,
      totalTargetTrees: totalTargetTrees + individualTrees,
      individualTrees,
      plantationProjectTrees: verifiedProjectTrees,
      activeProjectsCount,
      activeVolunteers: profilesCount || 1,
      totalStories: storiesCount || 0,
      challengeParticipants: challengeCount || 0,
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
      activeVolunteers: 0,
      totalStories: 0,
      challengeParticipants: 0,
      co2OffsetKgPerYear: 0,
      o2GeneratedKgPerYear: 0,
    };
  }
}

