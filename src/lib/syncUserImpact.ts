import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes user's total tree plantation count and green points
 * across individual tree plantings and institutional/CSR afforestation projects.
 */
export async function syncUserProfileImpact(userId: string): Promise<{
  totalTrees: number;
  greenPoints: number;
  individualTreesCount: number;
  projectTreesCount: number;
  targetTreesCount: number;
}> {
  if (!userId) {
    return { totalTrees: 0, greenPoints: 0, individualTreesCount: 0, projectTreesCount: 0, targetTreesCount: 0 };
  }

  try {
    // 1. Individual trees (approved)
    const { data: indTrees } = await supabase
      .from("trees")
      .select("id, points_awarded, admin_status")
      .eq("user_id", userId);

    const approvedTrees = (indTrees || []).filter(t => t.admin_status === "approved");
    const individualTreesCount = approvedTrees.length;
    let individualPoints = 0;
    approvedTrees.forEach((t) => {
      individualPoints += t.points_awarded || 10;
    });

    // 2. Organization projects
    const { data: orgProjects } = await supabase
      .from("plantation_projects")
      .select("id, target_trees, verified_trees, bulk_rows, ai_score, status")
      .eq("user_id", userId);

    let projectTreesCount = 0;
    let targetTreesCount = 0;
    let projectPoints = 0;

    (orgProjects || []).forEach((p) => {
      targetTreesCount += (p.target_trees || p.bulk_rows || 0);
      const verified = p.verified_trees || 0;
      projectTreesCount += verified;
      if (verified > 0) {
        projectPoints += verified * 10;
      }
    });

    const totalTrees = individualTreesCount + projectTreesCount;
    const greenPoints = individualPoints + projectPoints;

    // 3. Update profiles table
    await supabase
      .from("profiles")
      .update({
        trees_planted: totalTrees,
        green_points: greenPoints,
        last_activity_date: new Date().toISOString(),
      })
      .eq("id", userId);

    return {
      totalTrees,
      greenPoints,
      individualTreesCount,
      projectTreesCount,
      targetTreesCount,
    };
  } catch (err) {
    console.warn("Could not sync user profile impact:", err);
    return { totalTrees: 0, greenPoints: 0, individualTreesCount: 0, projectTreesCount: 0, targetTreesCount: 0 };
  }
}

