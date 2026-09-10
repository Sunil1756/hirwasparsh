/**
 * Individual Agroforestry Data Service (B2C Data Spine)
 * Exclusively handles personal tree planting, individual growth check-ins,
 * personal eco-points, certificates, and community story feeds.
 * Strictly partitioned from NGO/CSR multi-acre institutional datasets.
 */

import { supabase } from "@/integrations/supabase/client";

export interface IndividualTreeRecord {
  id: string;
  user_id: string;
  tree_name: string;
  species: string;
  scientific_name?: string | null;
  plantation_date: string;
  height_cm: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description?: string | null;
  photo_url?: string | null;
  before_photo_url?: string | null;
  selfie_photo_url?: string | null;
  phash?: string | null;
  health_status: "healthy" | "moderate" | "stressed" | "dead";
  verification_status: "verified" | "pending" | "rejected";
  admin_status: "approved" | "pending" | "rejected";
  ai_confidence?: number | null;
  points_awarded: number;
  qr_token?: string | null;
  planting_type: "individual";
  created_at: string;
  updated_at?: string;
}

export interface CreateIndividualTreePayload {
  treeName: string;
  species: string;
  scientificName?: string | null;
  plantationDate: string;
  heightCm: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description?: string | null;
  photoUrl?: string | null;
  beforePhotoUrl?: string | null;
  selfiePhotoUrl?: string | null;
  phash?: string | null;
  photoHash?: string | null;
  userId: string;
  driveId?: string | null;
  aiConfidence?: number | null;
  aiDetectedSpecies?: string | null;
  aiScientificName?: string | null;
}

export interface IndividualGrowthUpdatePayload {
  treeId: string;
  userId: string;
  dayNumber: number; // 7, 30, 90, 180, 365
  notes?: string;
  photoUrl: string;
  photoHash?: string;
  heightCm?: number;
  latitude?: number | null;
  longitude?: number | null;
  distanceFromTreeMeters?: number | null;
}

export interface IndividualUserStats {
  userId: string;
  totalTreesPlanted: number;
  verifiedTrees: number;
  pendingTrees: number;
  ecoPoints: number;
  co2OffsetKgPerYear: number;
  o2GeneratedKgPerYear: number;
  growthUpdatesCount: number;
  streakDays: number;
  badgesEarned: string[];
}

/**
 * 1. Create a single individual personal tree in Supabase
 */
export async function createIndividualTree(
  payload: CreateIndividualTreePayload
): Promise<{ success: boolean; tree?: IndividualTreeRecord; error?: string }> {
  try {
    const record = {
      user_id: payload.userId,
      tree_name: payload.treeName,
      species: payload.species,
      scientific_name: payload.scientificName || payload.aiScientificName || null,
      plantation_date: payload.plantationDate,
      height_cm: payload.heightCm,
      location: payload.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
      description: payload.description || null,
      photo_url: payload.photoUrl || null,
      before_photo_url: payload.beforePhotoUrl || null,
      selfie_photo_url: payload.selfiePhotoUrl || null,
      photo_hash: payload.photoHash || null,
      phash: payload.phash || null,
      planting_type: "individual",
      plot_id: null, // Strictly individual (no plot linkage)
      org_id: null,  // Strictly individual (no organization linkage)
      drive_id: payload.driveId || null,
      verification_status: "pending",
      admin_status: "pending",
      points_awarded: 0,
      health_status: "healthy",
      ai_confidence: payload.aiConfidence || null,
      ai_detected_species: payload.aiDetectedSpecies || null,
      ai_scientific_name: payload.aiScientificName || null,
    };

    const { data, error } = await supabase
      .from("trees")
      .insert(record as any)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      tree: data as unknown as IndividualTreeRecord,
    };
  } catch (err: any) {
    console.error("createIndividualTree failed:", err);
    return {
      success: false,
      error: err.message || "Failed to create individual tree.",
    };
  }
}

/**
 * 2. Fetch all individual trees belonging to a specific user (My Trees / Timeline)
 */
export async function fetchMyIndividualTrees(
  userId: string
): Promise<IndividualTreeRecord[]> {
  try {
    const { data, error } = await supabase
      .from("trees")
      .select("*")
      .eq("user_id", userId)
      .eq("planting_type", "individual")
      .is("plot_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as IndividualTreeRecord[];
  } catch (err) {
    console.warn("fetchMyIndividualTrees query error:", err);
    return [];
  }
}

/**
 * 3. Fetch single individual tree by ID with full verification details
 */
export async function fetchIndividualTreeById(
  treeId: string
): Promise<IndividualTreeRecord | null> {
  try {
    const { data, error } = await supabase
      .from("trees")
      .select("*")
      .eq("id", treeId)
      .eq("planting_type", "individual")
      .maybeSingle();

    if (error) throw error;
    return data as unknown as IndividualTreeRecord | null;
  } catch (err) {
    console.warn("fetchIndividualTreeById query error:", err);
    return null;
  }
}

/**
 * 4. Submit an individual survival & growth check-in log (Week 1, Month 1, Month 3, etc.)
 */
export async function submitIndividualGrowthUpdate(
  payload: IndividualGrowthUpdatePayload
): Promise<{ success: boolean; error?: string; pointsEarned: number }> {
  try {
    const pointsMap: Record<number, number> = {
      7: 10,
      30: 20,
      90: 35,
      180: 50,
      365: 100,
    };
    const pointsEarned = pointsMap[payload.dayNumber] || 15;

    const { error: logError } = await supabase
      .from("growth_updates")
      .insert({
        tree_id: payload.treeId,
        user_id: payload.userId,
        update_day: payload.dayNumber,
        notes: payload.notes || null,
        photo_url: payload.photoUrl,
        photo_hash: payload.photoHash || null,
        height_cm: payload.heightCm || null,
        distance_meters: payload.distanceFromTreeMeters || null,
        points_awarded: pointsEarned,
      } as any);

    if (logError) throw logError;

    // Credit eco-points to the user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("eco_points, green_points")
      .eq("id", payload.userId)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          eco_points: (profile.eco_points || 0) + pointsEarned,
          green_points: (profile.green_points || 0) + pointsEarned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.userId);
    }

    return { success: true, pointsEarned };
  } catch (err: any) {
    console.error("submitIndividualGrowthUpdate failed:", err);
    return {
      success: false,
      error: err.message || "Failed to submit growth update.",
      pointsEarned: 0,
    };
  }
}

/**
 * 5. Fetch comprehensive personal impact metrics for an individual
 */
export async function fetchIndividualUserStats(
  userId: string
): Promise<IndividualUserStats> {
  try {
    const [treesRes, updatesRes, profileRes] = await Promise.all([
      supabase
        .from("trees")
        .select("id, admin_status, verification_status")
        .eq("user_id", userId)
        .eq("planting_type", "individual")
        .is("plot_id", null),
      supabase
        .from("growth_updates")
        .select("id")
        .eq("user_id", userId),
      supabase
        .from("profiles")
        .select("eco_points, green_points, trees_planted")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const trees = treesRes.data || [];
    const verified = trees.filter(
      (t) => t.admin_status === "approved" || t.verification_status === "verified"
    ).length;
    const pending = trees.length - verified;
    const updatesCount = updatesRes.data?.length || 0;
    const totalPlanted = trees.length || profileRes.data?.trees_planted || 0;
    const ecoPoints = profileRes.data?.eco_points || profileRes.data?.green_points || 0;

    // Badges calculation
    const badges: string[] = ["Seed Sower 🌱"];
    if (totalPlanted >= 5) badges.push("Green Guardian 🛡️");
    if (totalPlanted >= 10) badges.push("Forest Builder 🌲");
    if (updatesCount >= 3) badges.push("Survival Steward ⭐");
    if (verified >= 5) badges.push("Verified Planter 🏅");

    return {
      userId,
      totalTreesPlanted: totalPlanted,
      verifiedTrees: verified,
      pendingTrees: pending,
      ecoPoints,
      co2OffsetKgPerYear: Math.round(verified * 22),
      o2GeneratedKgPerYear: Math.round(verified * 100),
      growthUpdatesCount: updatesCount,
      streakDays: Math.min(updatesCount * 7 + 1, 90),
      badgesEarned: badges,
    };
  } catch (err) {
    console.warn("fetchIndividualUserStats query error:", err);
    return {
      userId,
      totalTreesPlanted: 0,
      verifiedTrees: 0,
      pendingTrees: 0,
      ecoPoints: 0,
      co2OffsetKgPerYear: 0,
      o2GeneratedKgPerYear: 0,
      growthUpdatesCount: 0,
      streakDays: 1,
      badgesEarned: ["Seed Sower 🌱"],
    };
  }
}

/**
 * 6. Fetch public individual community trees for discovery & map
 */
export async function fetchCommunityIndividualTrees(
  limit = 200
): Promise<IndividualTreeRecord[]> {
  try {
    const { data, error } = await supabase
      .from("trees")
      .select("*")
      .eq("planting_type", "individual")
      .is("plot_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as unknown as IndividualTreeRecord[];
  } catch (err) {
    console.warn("fetchCommunityIndividualTrees query error:", err);
    return [];
  }
}
