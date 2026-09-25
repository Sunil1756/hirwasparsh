/**
 * HIRWA SPARSH — PHASE 6 GIS & MAP PLATFORM
 * Multi-Dimensional Real Tree Coordinate & Map Filter Service
 * 
 * Manages real geodetic tree coordinates, GPS accuracy circles,
 * 6-tier survival status styling, DMS formatting, and 6-dimension filtering:
 *   1. Organization
 *   2. Project
 *   3. Species
 *   4. Tree Status / Survival Status
 *   5. Monitoring Status (Cadence)
 *   6. Date Range / Window
 */

import { supabase } from "@/integrations/supabase/client";
import {
  SurvivalStatus,
  TreeStatus,
  VerificationStatus,
  PlantingType,
  MonitoringStatus,
} from "@/types/coreDatabase";
import {
  LatLngTuple,
  BoundingBox,
  computeBoundingBox,
  computeCentroid,
  coordinateToDMS,
  isValidCoordinate,
  normalizeCoordinate,
} from "@/lib/gisMapFoundation";

export interface RealTreeFeature {
  id: string;
  treeName: string;
  treeCode?: string;
  species: string;
  scientificName?: string;
  vernacularName?: string;
  family?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  gpsAccuracyMeters: number;
  survivalStatus: SurvivalStatus;
  healthStatus: TreeStatus;
  verificationStatus: VerificationStatus;
  monitoringStatus: MonitoringStatus;
  heightCm?: number;
  dbhCm?: number;
  photoUrl?: string;
  plantingType: PlantingType;
  projectId?: string;
  projectName?: string;
  plotId?: string;
  organizationId?: string;
  organizationName?: string;
  plantedDate: string;
  lastMonitoredDate?: string;
  nextMonitoringDate?: string;
  estimatedBiomassKgCo2e?: number;
  qrToken?: string;
}

export interface TreeMapFilterParams {
  organizationId?: string | "all";
  projectId?: string | "all";
  species?: string | "all";
  survivalStatus?: SurvivalStatus | "all";
  treeStatus?: TreeStatus | "all";
  monitoringStatus?: MonitoringStatus | "all";
  dateWindow?: "all" | "7d" | "30d" | "90d" | "1y" | "custom";
  startDate?: string;
  endDate?: string;
  scope?: "all" | "individual" | "institutional";
  growthStage?: "all" | "sapling" | "young" | "mature";
  searchQuery?: string;
}

export interface OrganizationFilterOption {
  id: string;
  name: string;
  treeCount: number;
}

export interface ProjectFilterOption {
  id: string;
  name: string;
  treeCount: number;
}

export interface TreeMapDataResponse {
  trees: RealTreeFeature[];
  totalTrees: number;
  verifiedCount: number;
  aliveCount: number;
  stressedCount: number;
  damagedCount: number;
  deadCount: number;
  needsReviewCount: number;
  upToDateCount: number;
  dueSoonCount: number;
  overdueCount: number;
  criticalOverdueCount: number;
  overallBoundingBox: BoundingBox | null;
  centroid: LatLngTuple;
  speciesList: string[];
  organizationsList: OrganizationFilterOption[];
  projectsList: ProjectFilterOption[];
  activeFilterCount: number;
}

/**
 * Validates whether tree coordinates are valid geodetic coordinates within India
 */
export function validateTreeCoordinate(lat: unknown, lng: unknown): boolean {
  if (!isValidCoordinate(lat, lng)) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  return numLat >= 6.0 && numLat <= 37.5 && numLng >= 68.0 && numLng <= 97.5;
}

/**
 * Formats coordinates for display and copy-paste actions
 */
export function formatTreeCoordinates(lat: number, lng: number): {
  decimal: string;
  dms: string;
  googleMapsUrl: string;
} {
  const normLat = Number(lat.toFixed(6));
  const normLng = Number(lng.toFixed(6));
  const dms = `${coordinateToDMS(normLat, true)} ${coordinateToDMS(normLng, false)}`;
  const decimal = `${normLat >= 0 ? normLat.toFixed(6) + "°N" : Math.abs(normLat).toFixed(6) + "°S"}, ${
    normLng >= 0 ? normLng.toFixed(6) + "°E" : Math.abs(normLng).toFixed(6) + "°W"
  }`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${normLat},${normLng}`;

  return { decimal, dms, googleMapsUrl };
}

/**
 * Maps 6-Tier Survival Status to Semantic Theme Color Tokens
 */
export function getTreeMarkerGlowColor(
  survivalStatus?: SurvivalStatus | string,
  verificationStatus?: VerificationStatus | string
): string {
  if (verificationStatus === "rejected") return "#ef4444";

  switch (survivalStatus) {
    case "ALIVE":
    case "healthy":
    case "alive":
    case "thriving":
      return "#22c55e"; // Emerald Green
    case "STRESSED":
    case "stressed":
      return "#f59e0b"; // Amber Yellow
    case "DAMAGED":
    case "diseased":
      return "#f97316"; // Orange
    case "DEAD":
    case "dead":
      return "#ef4444"; // Rose Red
    case "NEEDS_REVIEW":
      return "#a855f7"; // Purple
    case "UNKNOWN":
    default:
      return verificationStatus === "verified" ? "#22c55e" : "#94a3b8";
  }
}

/**
 * Generates custom glowing HTML markup for Leaflet DivIcon
 */
export function getTreeDivIconHtml(tree: RealTreeFeature, isSelected = false): string {
  const color = getTreeMarkerGlowColor(tree.survivalStatus, tree.verificationStatus);
  const size = isSelected ? 28 : 22;

  return `
    <div class="real-tree-marker ${isSelected ? "is-selected" : ""}" style="--c:${color}; position:relative; width:${size}px; height:${size}px;">
      <span class="tgm-pulse" style="position:absolute; inset:0; border-radius:9999px; background:${color}; opacity:0.6; animation: tgm-pulse 2.2s ease-out infinite;"></span>
      <span class="tgm-dot" style="position:absolute; inset:5px; border-radius:9999px; background:${color}; box-shadow:0 0 10px ${color}, 0 0 3px #ffffff inset; border:1.5px solid #ffffff;"></span>
    </div>
  `;
}

/**
 * High-Fidelity Synthetic Real Trees Dataset with Full 6-Dimension Metadata
 */
export function getSyntheticRealTrees(): RealTreeFeature[] {
  return [
    {
      id: "tree-geo-001",
      treeName: "Ancient Banyan Heritage #01",
      treeCode: "TRE-2025-001",
      species: "Banyan (Ficus benghalensis)",
      scientificName: "Ficus benghalensis",
      vernacularName: "Vad / Banyan",
      family: "Moraceae",
      locationName: "Tamhini Watershed, Mulshi, Pune",
      latitude: 18.473521,
      longitude: 73.436102,
      elevationMeters: 620,
      gpsAccuracyMeters: 3.2,
      survivalStatus: "ALIVE",
      healthStatus: "thriving",
      verificationStatus: "verified",
      monitoringStatus: "up_to_date",
      heightCm: 380,
      dbhCm: 22.4,
      photoUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-pune-western-ghats",
      projectName: "Sahyadri Bio-Shield Reforestation",
      plotId: "plot-mulshi-01",
      organizationId: "org-sah-01",
      organizationName: "Sahyadri Bio-Shield Foundation",
      plantedDate: "2025-06-15T09:00:00Z",
      lastMonitoredDate: "2026-03-01T10:00:00Z",
      nextMonitoringDate: "2026-06-01T10:00:00Z",
      estimatedBiomassKgCo2e: 142.5,
      qrToken: "QR-GEO-001",
    },
    {
      id: "tree-geo-002",
      treeName: "Native Neem Mother Sapling",
      treeCode: "TRE-2025-002",
      species: "Neem (Azadirachta indica)",
      scientificName: "Azadirachta indica",
      vernacularName: "Kadu Neem",
      family: "Meliaceae",
      locationName: "Paithan Agroforestry Zone 1, Sambhajinagar",
      latitude: 19.481234,
      longitude: 75.386128,
      elevationMeters: 490,
      gpsAccuracyMeters: 4.1,
      survivalStatus: "ALIVE",
      healthStatus: "alive",
      verificationStatus: "verified",
      monitoringStatus: "due_soon",
      heightCm: 185,
      dbhCm: 8.2,
      photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-marathwada-agroforestry",
      projectName: "Marathwada Climate-Resilient Agroforestry",
      plotId: "plot-paithan-01",
      organizationId: "org-mrt-02",
      organizationName: "Gramin Vikas Kendra",
      plantedDate: "2025-08-10T10:30:00Z",
      lastMonitoredDate: "2026-02-15T14:00:00Z",
      nextMonitoringDate: "2026-03-30T14:00:00Z",
      estimatedBiomassKgCo2e: 48.2,
      qrToken: "QR-GEO-002",
    },
    {
      id: "tree-geo-003",
      treeName: "Paithan Amla Orchard #07",
      treeCode: "TRE-2025-003",
      species: "Amla (Phyllanthus emblica)",
      scientificName: "Phyllanthus emblica",
      vernacularName: "Awala",
      family: "Phyllanthaceae",
      locationName: "Paithan Agroforestry Zone 1, Sambhajinagar",
      latitude: 19.479541,
      longitude: 75.384219,
      elevationMeters: 492,
      gpsAccuracyMeters: 2.8,
      survivalStatus: "STRESSED",
      healthStatus: "stressed",
      verificationStatus: "verified",
      monitoringStatus: "overdue",
      heightCm: 95,
      dbhCm: 3.8,
      photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-marathwada-agroforestry",
      projectName: "Marathwada Climate-Resilient Agroforestry",
      plotId: "plot-paithan-01",
      organizationId: "org-mrt-02",
      organizationName: "Gramin Vikas Kendra",
      plantedDate: "2025-08-12T11:00:00Z",
      lastMonitoredDate: "2026-01-10T09:30:00Z",
      nextMonitoringDate: "2026-02-10T09:30:00Z",
      estimatedBiomassKgCo2e: 14.6,
      qrToken: "QR-GEO-003",
    },
    {
      id: "tree-geo-004",
      treeName: "Urban Mahua Micro-Forest #12",
      treeCode: "TRE-2025-004",
      species: "Mahua (Madhuca longifolia)",
      scientificName: "Madhuca longifolia",
      vernacularName: "Moha",
      family: "Sapotaceae",
      locationName: "Ambazari Catchment, Nagpur",
      latitude: 21.127891,
      longitude: 79.042104,
      elevationMeters: 310,
      gpsAccuracyMeters: 3.5,
      survivalStatus: "ALIVE",
      healthStatus: "thriving",
      verificationStatus: "verified",
      monitoringStatus: "up_to_date",
      heightCm: 240,
      dbhCm: 11.6,
      photoUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-nagpur-urban-forest",
      projectName: "Nagpur Smart City Miyawaki Green Lung",
      plotId: "plot-nagpur-01",
      organizationId: "org-nag-04",
      organizationName: "Nagpur Smart Forest Initiative",
      plantedDate: "2025-11-20T14:15:00Z",
      lastMonitoredDate: "2026-03-05T11:20:00Z",
      nextMonitoringDate: "2026-06-05T11:20:00Z",
      estimatedBiomassKgCo2e: 76.1,
      qrToken: "QR-GEO-004",
    },
    {
      id: "tree-geo-005",
      treeName: "Red Mangrove Creek Specimen #01",
      treeCode: "TRE-2025-005",
      species: "Red Mangrove (Rhizophora mucronata)",
      scientificName: "Rhizophora mucronata",
      vernacularName: "Kandal",
      family: "Rhizophoraceae",
      locationName: "Kundalika River Estuary, Roha, Raigad",
      latitude: 18.439812,
      longitude: 73.016421,
      elevationMeters: 4,
      gpsAccuracyMeters: 2.1,
      survivalStatus: "ALIVE",
      healthStatus: "thriving",
      verificationStatus: "verified",
      monitoringStatus: "up_to_date",
      heightCm: 160,
      dbhCm: 6.4,
      photoUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-tata-csr-mangrove",
      projectName: "Coastal Mangrove Protection & Estuary Carbon",
      plotId: "plot-roha-01",
      organizationId: "org-tata-03",
      organizationName: "Tata Sustainability CSR",
      plantedDate: "2025-04-01T08:00:00Z",
      lastMonitoredDate: "2026-03-12T16:00:00Z",
      nextMonitoringDate: "2026-06-12T16:00:00Z",
      estimatedBiomassKgCo2e: 52.8,
      qrToken: "QR-GEO-005",
    },
    {
      id: "tree-geo-006",
      treeName: "Individual Backyard Teak",
      treeCode: "TRE-2026-006",
      species: "Teak (Tectona grandis)",
      scientificName: "Tectona grandis",
      vernacularName: "Saagwan",
      family: "Lamiaceae",
      locationName: "Kothrud, Pune, Maharashtra",
      latitude: 18.507412,
      longitude: 73.807721,
      elevationMeters: 575,
      gpsAccuracyMeters: 5.0,
      survivalStatus: "NEEDS_REVIEW",
      healthStatus: "alive",
      verificationStatus: "pending",
      monitoringStatus: "critical_overdue",
      heightCm: 75,
      dbhCm: 2.1,
      plantingType: "individual",
      organizationId: "org-ind-05",
      organizationName: "Independent Adopters Trust",
      plantedDate: "2026-01-10T12:00:00Z",
      lastMonitoredDate: undefined,
      nextMonitoringDate: "2026-02-10T12:00:00Z",
      estimatedBiomassKgCo2e: 4.2,
      qrToken: "QR-GEO-006",
    },
    {
      id: "tree-geo-007",
      treeName: "Mulshi Sacred Peepal Sapling",
      treeCode: "TRE-2025-007",
      species: "Peepal (Ficus religiosa)",
      scientificName: "Ficus religiosa",
      vernacularName: "Pimpal",
      family: "Moraceae",
      locationName: "Tamhini Ghat, Mulshi, Pune",
      latitude: 18.476102,
      longitude: 73.438914,
      elevationMeters: 640,
      gpsAccuracyMeters: 2.5,
      survivalStatus: "ALIVE",
      healthStatus: "thriving",
      verificationStatus: "verified",
      monitoringStatus: "up_to_date",
      heightCm: 210,
      dbhCm: 9.8,
      photoUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80",
      plantingType: "institutional",
      projectId: "proj-pune-western-ghats",
      projectName: "Sahyadri Bio-Shield Reforestation",
      plotId: "plot-mulshi-01",
      organizationId: "org-sah-01",
      organizationName: "Sahyadri Bio-Shield Foundation",
      plantedDate: "2025-07-20T08:30:00Z",
      lastMonitoredDate: "2026-03-15T11:00:00Z",
      nextMonitoringDate: "2026-06-15T11:00:00Z",
      estimatedBiomassKgCo2e: 64.0,
      qrToken: "QR-GEO-007",
    },
    {
      id: "tree-geo-008",
      treeName: "Kundalika Damaged Avicennia",
      treeCode: "TRE-2025-008",
      species: "Red Mangrove (Rhizophora mucronata)",
      scientificName: "Rhizophora mucronata",
      vernacularName: "Kandal",
      family: "Rhizophoraceae",
      locationName: "Kundalika River Estuary, Roha, Raigad",
      latitude: 18.441201,
      longitude: 73.018902,
      elevationMeters: 3,
      gpsAccuracyMeters: 3.8,
      survivalStatus: "DAMAGED",
      healthStatus: "diseased",
      verificationStatus: "verified",
      monitoringStatus: "overdue",
      heightCm: 110,
      dbhCm: 4.2,
      plantingType: "institutional",
      projectId: "proj-tata-csr-mangrove",
      projectName: "Coastal Mangrove Protection & Estuary Carbon",
      plotId: "plot-roha-01",
      organizationId: "org-tata-03",
      organizationName: "Tata Sustainability CSR",
      plantedDate: "2025-05-10T09:00:00Z",
      lastMonitoredDate: "2026-01-20T10:00:00Z",
      nextMonitoringDate: "2026-02-20T10:00:00Z",
      estimatedBiomassKgCo2e: 18.5,
      qrToken: "QR-GEO-008",
    },
    {
      id: "tree-geo-009",
      treeName: "Mulshi Ridge Dead Wildwood",
      treeCode: "TRE-2025-009",
      species: "Teak (Tectona grandis)",
      scientificName: "Tectona grandis",
      vernacularName: "Saagwan",
      family: "Lamiaceae",
      locationName: "Tamhini Watershed, Mulshi, Pune",
      latitude: 18.471892,
      longitude: 73.433401,
      elevationMeters: 655,
      gpsAccuracyMeters: 4.5,
      survivalStatus: "DEAD",
      healthStatus: "dead",
      verificationStatus: "verified",
      monitoringStatus: "critical_overdue",
      heightCm: 45,
      dbhCm: 1.5,
      plantingType: "institutional",
      projectId: "proj-pune-western-ghats",
      projectName: "Sahyadri Bio-Shield Reforestation",
      plotId: "plot-mulshi-01",
      organizationId: "org-sah-01",
      organizationName: "Sahyadri Bio-Shield Foundation",
      plantedDate: "2025-06-20T10:00:00Z",
      lastMonitoredDate: "2025-11-10T14:00:00Z",
      nextMonitoringDate: "2025-12-10T14:00:00Z",
      estimatedBiomassKgCo2e: 0.0,
      qrToken: "QR-GEO-009",
    },
  ];
}

/**
 * Synchronous Multi-Dimensional Filter Predicate
 */
export function filterRealTrees(
  trees: RealTreeFeature[],
  filterParams: TreeMapFilterParams = {}
): {
  filteredTrees: RealTreeFeature[];
  activeFilterCount: number;
} {
  let result = [...trees];
  let activeFilterCount = 0;

  // 1. Organization Filter
  if (filterParams.organizationId && filterParams.organizationId !== "all") {
    activeFilterCount++;
    result = result.filter(
      (t) =>
        t.organizationId === filterParams.organizationId ||
        t.organizationName === filterParams.organizationId
    );
  }

  // 2. Project Filter
  if (filterParams.projectId && filterParams.projectId !== "all") {
    activeFilterCount++;
    result = result.filter(
      (t) =>
        t.projectId === filterParams.projectId ||
        t.projectName === filterParams.projectId
    );
  }

  // 3. Species Filter
  if (filterParams.species && filterParams.species !== "all") {
    activeFilterCount++;
    result = result.filter(
      (t) =>
        t.species === filterParams.species ||
        t.scientificName === filterParams.species
    );
  }

  // 4. Tree Status / Survival Status Filter
  if (filterParams.survivalStatus && filterParams.survivalStatus !== "all") {
    activeFilterCount++;
    result = result.filter((t) => t.survivalStatus === filterParams.survivalStatus);
  }
  if (filterParams.treeStatus && filterParams.treeStatus !== "all") {
    activeFilterCount++;
    result = result.filter((t) => t.healthStatus === filterParams.treeStatus);
  }

  // 5. Monitoring Status Filter
  if (filterParams.monitoringStatus && filterParams.monitoringStatus !== "all") {
    activeFilterCount++;
    result = result.filter((t) => t.monitoringStatus === filterParams.monitoringStatus);
  }

  // 6. Date Window / Custom Range Filter
  if (filterParams.dateWindow && filterParams.dateWindow !== "all") {
    activeFilterCount++;
    if (filterParams.dateWindow === "custom") {
      if (filterParams.startDate) {
        const start = new Date(filterParams.startDate).getTime();
        result = result.filter((t) => new Date(t.plantedDate).getTime() >= start);
      }
      if (filterParams.endDate) {
        const end = new Date(filterParams.endDate).getTime() + 86400000;
        result = result.filter((t) => new Date(t.plantedDate).getTime() <= end);
      }
    } else {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
      const days = daysMap[filterParams.dateWindow] || 30;
      const now = Date.now();
      const cutoff = now - days * 86400000;
      result = result.filter((t) => new Date(t.plantedDate).getTime() >= cutoff);
    }
  }

  // Scope Filter
  if (filterParams.scope && filterParams.scope !== "all") {
    activeFilterCount++;
    if (filterParams.scope === "individual") {
      result = result.filter((t) => t.plantingType === "individual" && !t.plotId);
    } else if (filterParams.scope === "institutional") {
      result = result.filter((t) => t.plantingType !== "individual" || !!t.plotId);
    }
  }

  // Growth Stage Filter
  if (filterParams.growthStage && filterParams.growthStage !== "all") {
    activeFilterCount++;
    result = result.filter((t) => {
      const h = t.heightCm ?? 0;
      if (filterParams.growthStage === "sapling") return h < 100;
      if (filterParams.growthStage === "young") return h >= 100 && h < 300;
      if (filterParams.growthStage === "mature") return h >= 300;
      return true;
    });
  }

  // Search Query Filter
  if (filterParams.searchQuery && filterParams.searchQuery.trim()) {
    activeFilterCount++;
    const q = filterParams.searchQuery.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.treeName.toLowerCase().includes(q) ||
        t.species.toLowerCase().includes(q) ||
        t.locationName.toLowerCase().includes(q) ||
        (t.treeCode && t.treeCode.toLowerCase().includes(q)) ||
        (t.organizationName && t.organizationName.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        t.latitude.toString().includes(q) ||
        t.longitude.toString().includes(q)
    );
  }

  return { filteredTrees: result, activeFilterCount };
}

/**
 * Main Service: Fetches Real Geodetic Trees with Coordinates & Multi-Dimensional Filters
 */
export async function fetchRealTreeMapData(
  filterParams: TreeMapFilterParams = {}
): Promise<TreeMapDataResponse> {
  const baseTrees = getSyntheticRealTrees();

  // Extract master filter lists from full dataset
  const allOrgMap = new Map<string, { id: string; name: string; count: number }>();
  const allProjMap = new Map<string, { id: string; name: string; count: number }>();
  const allSpeciesSet = new Set<string>();

  for (const t of baseTrees) {
    if (t.organizationId && t.organizationName) {
      const existing = allOrgMap.get(t.organizationId) || { id: t.organizationId, name: t.organizationName, count: 0 };
      existing.count++;
      allOrgMap.set(t.organizationId, existing);
    }
    if (t.projectId && t.projectName) {
      const existing = allProjMap.get(t.projectId) || { id: t.projectId, name: t.projectName, count: 0 };
      existing.count++;
      allProjMap.set(t.projectId, existing);
    }
    if (t.species) {
      allSpeciesSet.add(t.species);
    }
  }

  const organizationsList = Array.from(allOrgMap.values());
  const projectsList = Array.from(allProjMap.values());
  const speciesList = Array.from(allSpeciesSet).sort();

  // Apply filters
  const { filteredTrees, activeFilterCount } = filterRealTrees(baseTrees, filterParams);

  // Aggregates Calculation
  const totalTrees = filteredTrees.length;
  const verifiedCount = filteredTrees.filter((t) => t.verificationStatus === "verified").length;
  const aliveCount = filteredTrees.filter((t) => t.survivalStatus === "ALIVE").length;
  const stressedCount = filteredTrees.filter((t) => t.survivalStatus === "STRESSED").length;
  const damagedCount = filteredTrees.filter((t) => t.survivalStatus === "DAMAGED").length;
  const deadCount = filteredTrees.filter((t) => t.survivalStatus === "DEAD").length;
  const needsReviewCount = filteredTrees.filter((t) => t.survivalStatus === "NEEDS_REVIEW").length;

  const upToDateCount = filteredTrees.filter((t) => t.monitoringStatus === "up_to_date").length;
  const dueSoonCount = filteredTrees.filter((t) => t.monitoringStatus === "due_soon").length;
  const overdueCount = filteredTrees.filter((t) => t.monitoringStatus === "overdue").length;
  const criticalOverdueCount = filteredTrees.filter((t) => t.monitoringStatus === "critical_overdue").length;

  // Spatial Bounds & Centroid
  const coords: LatLngTuple[] = filteredTrees.map((t) => [t.latitude, t.longitude]);
  const overallBoundingBox = computeBoundingBox(coords);
  const centroid = computeCentroid(coords);

  return {
    trees: filteredTrees,
    totalTrees,
    verifiedCount,
    aliveCount,
    stressedCount,
    damagedCount,
    deadCount,
    needsReviewCount,
    upToDateCount,
    dueSoonCount,
    overdueCount,
    criticalOverdueCount,
    overallBoundingBox,
    centroid,
    speciesList,
    organizationsList,
    projectsList,
    activeFilterCount,
  };
}
