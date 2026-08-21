/**
 * Plantation Field Scouting & Anomaly Telemetry Service
 * Inspired by Map My Crop: Geotagged Scouting, Disease/Pest Hotspots,
 * Water Stress alerts, and Remediation Task Management.
 * 100% Real User Data (Zero Fake Mock Pins).
 */

export type ScoutingIssueCategory =
  | "pest_disease"
  | "water_stress"
  | "nutrient_deficiency"
  | "physical_damage"
  | "weed_competition";

export type ScoutingSeverity = "low" | "moderate" | "critical";

export type ScoutingStatus = "open" | "in_progress" | "resolved";

export interface ScoutingPin {
  id: string;
  projectId?: string;
  plotName: string;
  title: string;
  category: ScoutingIssueCategory;
  severity: ScoutingSeverity;
  status: ScoutingStatus;
  latitude: number;
  longitude: number;
  observedDate: string;
  assignedTo: string;
  affectedTreeCount: number;
  affectedSpecies: string;
  notes: string;
  recommendedRemedy: string;
  photoUrl?: string;
  resolvedAt?: string;
}

export const SCOUTING_CATEGORY_CONFIG: Record<
  ScoutingIssueCategory,
  { label: string; color: string; icon: string; defaultRemedy: string }
> = {
  pest_disease: {
    label: "Pest / Disease Outbreak",
    color: "#ef4444", // red
    icon: "Bug",
    defaultRemedy: "Spray 5% Neem Seed Kernel Extract (NSKE) or Trichoderma viride bio-fungicide slurry around root base.",
  },
  water_stress: {
    label: "Drought & Moisture Stress",
    color: "#f59e0b", // amber
    icon: "Droplets",
    defaultRemedy: "Apply 15L deep root saturation watering & install 4-inch organic straw/bagasse mulch ring.",
  },
  nutrient_deficiency: {
    label: "Nutrient Chlorosis (N/P/K/Fe)",
    color: "#8b5cf6", // purple
    icon: "Sparkles",
    defaultRemedy: "Apply 2kg vermicompost + fermented Jeevamrit organic microbial wash at drip-line.",
  },
  physical_damage: {
    label: "Grazing / Wind Damage",
    color: "#ea580c", // orange
    icon: "AlertTriangle",
    defaultRemedy: "Erect bamboo tree guard support & prune fractured branches above active node.",
  },
  weed_competition: {
    label: "Weed & Vine Choking",
    color: "#06b6d4", // cyan
    icon: "Scissors",
    defaultRemedy: "Manual ring weeding within 1-meter radius and apply heavy leaf litter mulch.",
  },
};

const LOCAL_STORAGE_KEY = "green_scouting_pins_real_v2";

/**
 * Loads genuinely logged field scouting pins from local storage.
 * Starts strictly at [] (0 pins) to avoid showing fake mock data.
 */
export function loadScoutingPins(): ScoutingPin[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading scouting pins:", e);
  }
  return [];
}

/**
 * Saves field scouting pins.
 */
export function saveScoutingPins(pins: ScoutingPin[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pins));
  } catch (e) {
    console.error("Error saving scouting pins:", e);
  }
}

/**
 * Adds a new genuine field scouting pin.
 */
export function addScoutingPin(pin: Omit<ScoutingPin, "id" | "observedDate">): ScoutingPin {
  const pins = loadScoutingPins();
  const newPin: ScoutingPin = {
    ...pin,
    id: `scout-${Date.now()}`,
    observedDate: new Date().toISOString().split("T")[0],
  };
  const updated = [newPin, ...pins];
  saveScoutingPins(updated);
  return newPin;
}

/**
 * Updates status of a field scouting pin (open -> in_progress -> resolved).
 */
export function updateScoutingPinStatus(id: string, status: ScoutingStatus): ScoutingPin[] {
  const pins = loadScoutingPins();
  const updated = pins.map((p) => {
    if (p.id === id) {
      return {
        ...p,
        status,
        resolvedAt: status === "resolved" ? new Date().toISOString().split("T")[0] : undefined,
      };
    }
    return p;
  });
  saveScoutingPins(updated);
  return updated;
}

/**
 * Deletes a field scouting pin.
 */
export function deleteScoutingPin(id: string): ScoutingPin[] {
  const pins = loadScoutingPins();
  const updated = pins.filter((p) => p.id !== id);
  saveScoutingPins(updated);
  return updated;
}
