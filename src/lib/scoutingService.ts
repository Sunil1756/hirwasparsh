/**
 * Plantation Field Scouting & Anomaly Telemetry Service
 * Inspired by Map My Crop: Geotagged Scouting, Disease/Pest Hotspots,
 * Water Stress alerts, and Remediation Task Management.
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

const DEFAULT_SCOUTING_PINS: ScoutingPin[] = [
  {
    id: "scout-01",
    plotName: "Sahyadri Bio-Reserve Sector A",
    title: "Leaf Blight on Young Teak Saplings",
    category: "pest_disease",
    severity: "moderate",
    status: "open",
    latitude: 18.524,
    longitude: 73.862,
    observedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignedTo: "Ramesh Pawar (Field Ranger)",
    affectedTreeCount: 35,
    affectedSpecies: "Teak (Tectona grandis)",
    notes: "Fungal brown spots spreading on upper leaves after unseasonal humidity.",
    recommendedRemedy: "Apply 0.2% Copper Oxychloride or organic fermented buttermilk spray.",
  },
  {
    id: "scout-02",
    plotName: "Satara Hillside Plantation Cluster",
    title: "Surface Soil Desiccation & Wilting",
    category: "water_stress",
    severity: "critical",
    status: "in_progress",
    latitude: 17.685,
    longitude: 74.025,
    observedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignedTo: "Kavita Shinde (Agronomist)",
    affectedTreeCount: 80,
    affectedSpecies: "Neem & Banyan",
    notes: "Drip pipeline blocked on ridge sector; topsoil moisture below 12%.",
    recommendedRemedy: "Flush drip lines and emergency water bowser dispatch + mulching.",
  },
  {
    id: "scout-03",
    plotName: "Pune Agroforestry Agro-Park",
    title: "Cattle Grazing Incident on Boundary Saplings",
    category: "physical_damage",
    severity: "moderate",
    status: "resolved",
    latitude: 18.512,
    longitude: 73.845,
    observedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignedTo: "Anand Deshmukh",
    affectedTreeCount: 15,
    affectedSpecies: "Subabul & Bamboo",
    notes: "Fence wire damaged by stray cattle.",
    recommendedRemedy: "Repaired thorn bush bio-fencing and staked damaged bamboo culms.",
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  },
];

const LOCAL_STORAGE_KEY = "green_scouting_pins_v1";

export function loadScoutingPins(): ScoutingPin[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading scouting pins:", e);
  }
  return DEFAULT_SCOUTING_PINS;
}

export function saveScoutingPins(pins: ScoutingPin[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pins));
  } catch (e) {
    console.error("Error saving scouting pins:", e);
  }
}

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
