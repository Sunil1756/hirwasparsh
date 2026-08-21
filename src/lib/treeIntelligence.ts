// Client-side tree intelligence: health score, age, care tips, environmental impact.
// Purely derived from existing data — no schema changes.

export interface TreeLike {
  plantation_date?: string | null;
  height_cm?: number | null;
  species?: string | null;
  verification_status?: string | null;
  admin_status?: string | null;
  ai_confidence?: number | null;
}

export interface HealthUpdate {
  health_status?: string | null;
  created_at?: string | null;
}

export interface GrowthUpdate {
  created_at?: string | null;
  update_day?: number | null;
}

/** Age of the tree in months, based on plantation_date. */
export function treeAgeMonths(tree: TreeLike): number {
  if (!tree.plantation_date) return 0;
  const planted = new Date(tree.plantation_date).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - planted) / (1000 * 60 * 60 * 24 * 30.44)));
}

export function ageLabel(months: number): string {
  if (months < 1) return "New";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} year${years === 1 ? "" : "s"}` : `${years}y ${rem}m`;
}

/**
 * Tree Health Score 0–100.
 * Weights:
 *  - Latest recorded health status (35)
 *  - Growth vs expected height for age (25)
 *  - Care activity (health + growth updates) (20)
 *  - Verification / AI confidence (20)
 */
export function computeHealthScore(
  tree: TreeLike,
  healthUpdates: HealthUpdate[] = [],
  growthUpdates: GrowthUpdate[] = [],
): { score: number; band: "excellent" | "good" | "fair" | "poor"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Latest health status
  const latest = healthUpdates[0]?.health_status?.toLowerCase() ?? "healthy";
  const healthMap: Record<string, number> = { healthy: 35, "needs water": 22, damaged: 12, dead: 0 };
  const hPts = healthMap[latest] ?? 25;
  score += hPts;
  reasons.push(`Latest status: ${latest} (+${hPts})`);

  // 2. Growth vs expected
  const months = treeAgeMonths(tree);
  const expected = 30 + months * 8; // ~8cm/month baseline sapling growth
  const actual = tree.height_cm ?? 0;
  const ratio = expected > 0 ? actual / expected : 1;
  const growthPts = Math.round(Math.max(0, Math.min(1, ratio)) * 25);
  score += growthPts;
  reasons.push(`Growth vs age: ${Math.round(ratio * 100)}% expected (+${growthPts})`);

  // 3. Care activity
  const activity = healthUpdates.length + growthUpdates.length;
  const activityPts = Math.min(20, activity * 4);
  score += activityPts;
  reasons.push(`Care updates: ${activity} (+${activityPts})`);

  // 4. Verification / AI confidence
  const conf = tree.ai_confidence ?? 0;
  const verifPts =
    tree.verification_status === "verified"
      ? 20
      : Math.round((conf / 100) * 15);
  score += verifPts;
  reasons.push(`Verification (+${verifPts})`);

  score = Math.max(0, Math.min(100, score));
  const band = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";
  return { score, band, reasons };
}

export interface EnvironmentalImpact {
  co2KgPerYear: number;
  o2KgPerYear: number;
  carsOffsetPerYear: number;
  shadeM2: number;
  rainwaterLitersPerYear: number;
  biodiversityScore: number; // 0-100
}

/** Rough per-tree environmental impact, scaled by height. */
export function computeImpact(tree: TreeLike): EnvironmentalImpact {
  const heightFactor = Math.max(0.4, Math.min(2, (tree.height_cm ?? 100) / 200));
  const co2 = Math.round(21 * heightFactor);
  const o2 = Math.round(100 * heightFactor);
  return {
    co2KgPerYear: co2,
    o2KgPerYear: o2,
    carsOffsetPerYear: +(co2 / 4600).toFixed(3),
    shadeM2: Math.round(8 * heightFactor),
    rainwaterLitersPerYear: Math.round(400 * heightFactor),
    biodiversityScore: Math.min(100, Math.round(40 + heightFactor * 25)),
  };
}

/** Watering & maintenance tips tuned by species keywords and age. */
export function careTips(tree: TreeLike): { watering: string; tips: string[] } {
  const species = (tree.species || "").toLowerCase();
  const months = treeAgeMonths(tree);
  const isSapling = months < 6;
  const isDrought = /neem|banyan|peepal|acacia|babul|mahogany/i.test(species);
  const isFruit = /mango|guava|jamun|orange|lemon|coconut|banana|papaya/i.test(species);

  const watering = isSapling
    ? "Every 2 days, ~5 L per session"
    : isDrought
      ? "Once a week in summer, skip in monsoon"
      : isFruit
        ? "Every 3–4 days, ~10 L per session"
        : "Every 4–5 days, ~7 L per session";

  const tips: string[] = [
    isSapling ? "Stake the sapling to protect from wind" : "Prune dead branches quarterly",
    "Mulch around the base to retain moisture",
    isFruit ? "Apply organic compost every 2 months" : "Apply organic compost every 3 months",
    "Inspect leaves for spots, curling, or pests weekly",
  ];
  return { watering, tips };
}

/** Native species suggestions by broad Maharashtra location keyword. */
export function nearbyNativeSuggestions(location = ""): string[] {
  const loc = location.toLowerCase();
  const coastal = /mumbai|thane|palghar|raigad|ratnagiri|sindhudurg/.test(loc);
  const arid = /solapur|osmanabad|latur|beed|jalna|ahmednagar/.test(loc);
  const forest = /gadchiroli|chandrapur|gondia|amravati|nagpur|bhandara/.test(loc);
  if (coastal) return ["Coconut", "Kokum", "Jackfruit", "Karanja", "Mangrove Avicennia"];
  if (arid) return ["Neem", "Babul (Acacia nilotica)", "Ber (Ziziphus)", "Khejri", "Custard Apple"];
  if (forest) return ["Teak", "Bamboo", "Mahua", "Bija", "Arjuna"];
  return ["Neem", "Peepal", "Banyan", "Jamun", "Amla"];
}
