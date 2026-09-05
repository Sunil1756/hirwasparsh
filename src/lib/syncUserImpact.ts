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
}> {
  if (!userId) {
    return { totalTrees: 0, greenPoints: 0, individualTreesCount: 0, projectTreesCount: 0 };
  }

  try {
    // 1. Individual trees
    const { data: indTrees } = await supabase
      .from("trees")
      .select("id, points_awarded, admin_status")
      .eq("user_id", userId);

    const individualTreesCount = (indTrees || []).length;
    let individualPoints = 0;
    (indTrees || []).forEach((t) => {
      individualPoints += t.points_awarded || 50;
    });

    // 2. Organization projects
    const { data: orgProjects } = await supabase
      .from("plantation_projects")
      .select("id, target_trees, verified_trees, bulk_rows, ai_score")
      .eq("user_id", userId);

    let projectTreesCount = 0;
    let projectPoints = 0;

    (orgProjects || []).forEach((p) => {
      const count = p.verified_trees > 0 ? p.verified_trees : (p.target_trees || p.bulk_rows || 0);
      projectTreesCount += count;
      // Award 10 points per tree planted in institutional drives + bonus for trust score
      projectPoints += count * 10 + (p.ai_score || 50);
    });

    const totalTrees = individualTreesCount + projectTreesCount;
    const greenPoints = individualPoints + projectPoints;

    // 3. Update profiles table
    if (totalTrees > 0 || greenPoints > 0) {
      await supabase
        .from("profiles")
        .update({
          trees_planted: totalTrees,
          green_points: greenPoints,
          last_activity_date: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return {
      totalTrees,
      greenPoints,
      individualTreesCount,
      projectTreesCount,
    };
  } catch (err) {
    console.warn("Could not sync user profile impact:", err);
    return { totalTrees: 0, greenPoints: 0, individualTreesCount: 0, projectTreesCount: 0 };
  }
}
