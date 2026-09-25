/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 34
 * Fast Tree Registration Service & Field Streak Engine
 * 
 * Features:
 * 1. High-velocity sub-5-second registration per sapling
 * 2. Continuous planting streak tracking & session analytics
 * 3. Geodesic Spacing Radar for forestry grid density optimization
 * 4. Physical Nursery QR / NFC tag binding
 * 5. Batch Transect coordinate generator for afforestation lines
 * 6. Zero-lag local queue fallback for offline forest environments
 */

import { supabase } from "@/integrations/supabase/client";
import { Tree, TreeStatus } from "@/types/coreDatabase";
import { enqueueOfflineTree } from "@/lib/offlineSyncService";
import { calculateHaversineDistance, LatLngTuple } from "@/lib/gisMapFoundation";

export interface FastRegistrationSession {
  sessionId: string;
  projectId: string;
  projectName?: string;
  compartmentId?: string;
  compartmentName?: string;
  planterId: string;
  planterName?: string;
  startTime: string;
  streakCount: number;
  totalPlanted: number;
  speciesCounts: Record<string, number>;
  lastPlantedCoord?: { latitude: number; longitude: number };
  lastPlantedTime?: string;
  lastTreeCode?: string;
  estimatedCarbonOffsetKg: number;
}

export interface FastTreeInput {
  species: string;
  vernacularName?: string;
  heightCm: number;
  dbhCm: number;
  healthStatus?: "healthy" | "moderate" | "fragile";
  tagId?: string; // Physical nursery plastic tag / QR barcode ID
  photoUrl?: string;
  photoDataUrl?: string;
  notes?: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  projectId?: string;
  compartmentId?: string;
  planterId?: string;
}

export type SpacingStatus = "initial" | "too_dense" | "optimal" | "sparse";

export interface SpacingRadarResult {
  distanceMeters: number | null;
  status: SpacingStatus;
  message: string;
}

export interface FastTreeRegistrationResult {
  success: boolean;
  treeCode: string;
  qrPayload: string;
  tree?: Partial<Tree>;
  spacing: SpacingRadarResult;
  isOffline: boolean;
  streakCount: number;
  totalPlanted: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * Common Maharashtra & Western Ghats native species with rapid defaults
 */
export const FAST_SPECIES_PRESETS = [
  { name: "Neem", scientific: "Azadirachta indica", vernacular: "कडूलिंब", defaultHeight: 120, defaultDbh: 4.5, carbonCoeff: 18.5 },
  { name: "Banyan", scientific: "Ficus benghalensis", vernacular: "वड", defaultHeight: 150, defaultDbh: 6.0, carbonCoeff: 35.0 },
  { name: "Peepal", scientific: "Ficus religiosa", vernacular: "पिंपळ", defaultHeight: 140, defaultDbh: 5.5, carbonCoeff: 32.0 },
  { name: "Teak", scientific: "Tectona grandis", vernacular: "सागवान", defaultHeight: 110, defaultDbh: 4.0, carbonCoeff: 22.0 },
  { name: "Mahua", scientific: "Madhuca longifolia", vernacular: "मोह", defaultHeight: 100, defaultDbh: 3.5, carbonCoeff: 20.0 },
  { name: "Karanj", scientific: "Millettia pinnata", vernacular: "करंज", defaultHeight: 90, defaultDbh: 3.0, carbonCoeff: 16.0 },
  { name: "Amla", scientific: "Phyllanthus emblica", vernacular: "आवळा", defaultHeight: 80, defaultDbh: 2.5, carbonCoeff: 14.0 },
  { name: "Jamun", scientific: "Syzygium cumini", vernacular: "जांभूळ", defaultHeight: 130, defaultDbh: 5.0, carbonCoeff: 24.0 },
  { name: "Bamboo", scientific: "Dendrocalamus strictus", vernacular: "बांबू", defaultHeight: 200, defaultDbh: 5.0, carbonCoeff: 28.0 },
  { name: "Red Mangrove", scientific: "Rhizophora mucronata", vernacular: "कांदळ", defaultHeight: 75, defaultDbh: 2.0, carbonCoeff: 30.0 },
  { name: "Sandalwood", scientific: "Santalum album", vernacular: "चंदन", defaultHeight: 95, defaultDbh: 3.0, carbonCoeff: 19.0 },
];

/**
 * Standard nursery height preset buttons (in cm)
 */
export const STANDARD_HEIGHT_PRESETS = [45, 60, 90, 120, 150, 180, 200];

/**
 * Standard stem DBH preset buttons (in cm)
 */
export const STANDARD_DBH_PRESETS = [1.5, 2.5, 4.0, 5.5, 7.0];

class FastTreeRegistrationService {
  private activeSession: FastRegistrationSession | null = null;

  /**
   * Initializes or gets the active planting session
   */
  public startSession(
    projectId: string = "demo-project-dev-001",
    projectName: string = "Western Ghats Sahyadri Reforestation",
    planterId: string = "field-worker-01",
    planterName: string = "Field Ranger",
    compartmentId?: string,
    compartmentName?: string
  ): FastRegistrationSession {
    this.activeSession = {
      sessionId: `ses-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      projectName,
      compartmentId,
      compartmentName,
      planterId,
      planterName,
      startTime: new Date().toISOString(),
      streakCount: 0,
      totalPlanted: 0,
      speciesCounts: {},
      estimatedCarbonOffsetKg: 0,
    };
    return this.activeSession;
  }

  /**
   * Retrieves current session or starts a default one
   */
  public getSession(): FastRegistrationSession {
    if (!this.activeSession) {
      return this.startSession();
    }
    return this.activeSession;
  }

  /**
   * Resets active streak counter (e.g. after a break or sector change)
   */
  public resetStreak(): void {
    if (this.activeSession) {
      this.activeSession.streakCount = 0;
    }
  }

  /**
   * Computes geodesic distance and spacing quality from previous sapling
   */
  public calculateGridSpacing(
    currentCoord: { latitude: number; longitude: number },
    previousCoord?: { latitude: number; longitude: number }
  ): SpacingRadarResult {
    if (!previousCoord) {
      return {
        distanceMeters: null,
        status: "initial",
        message: "First sapling in streak (Anchor Point)",
      };
    }

    const p1: LatLngTuple = [previousCoord.latitude, previousCoord.longitude];
    const p2: LatLngTuple = [currentCoord.latitude, currentCoord.longitude];
    const distanceMeters = Math.round(calculateHaversineDistance(p1, p2) * 10) / 10;

    if (distanceMeters < 2.0) {
      return {
        distanceMeters,
        status: "too_dense",
        message: `Too dense (${distanceMeters}m < 2.0m). Risk of root competition.`,
      };
    } else if (distanceMeters <= 5.5) {
      return {
        distanceMeters,
        status: "optimal",
        message: `Optimal grid spacing (${distanceMeters}m). Ideal for canopy development.`,
      };
    } else {
      return {
        distanceMeters,
        status: "sparse",
        message: `Wide spacing (${distanceMeters}m > 5.5m). Open grove pattern.`,
      };
    }
  }

  /**
   * Generates a unique Green Enlightenment tree code: GE-YYYY-NNNNNN
   */
  public generateUniqueTreeCode(year?: number): string {
    const yr = year || new Date().getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    return `GE-${yr}-${seq}`;
  }

  /**
   * Rapid-fire atomic tree registration executing in < 50ms locally
   */
  public async fastRegisterTree(input: FastTreeInput): Promise<FastTreeRegistrationResult> {
    const startTime = performance.now();
    const session = this.getSession();

    const treeCode = input.tagId && input.tagId.startsWith("GE-")
      ? input.tagId
      : this.generateUniqueTreeCode();

    const qrPayload = JSON.stringify({
      code: treeCode,
      species: input.species,
      project: input.projectId || session.projectId,
      plantedAt: new Date().toISOString(),
      lat: input.coordinates.latitude,
      lng: input.coordinates.longitude,
      tag: input.tagId || null,
    });

    const spacing = this.calculateGridSpacing(
      input.coordinates,
      session.lastPlantedCoord
    );

    const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

    const matchedSpeciesPreset = FAST_SPECIES_PRESETS.find(
      (s) => s.name.toLowerCase() === input.species.toLowerCase()
    );
    const carbonCoeff = matchedSpeciesPreset?.carbonCoeff || 20.0;

    const treeRecord: any = {
      id: `tree-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tree_name: `${input.species} Sapling #${session.totalPlanted + 1}`,
      species: input.species,
      latitude: input.coordinates.latitude,
      longitude: input.coordinates.longitude,
      height_cm: input.heightCm,
      dbh_cm: input.dbhCm,
      project_id: input.projectId || session.projectId,
      plantation_date: new Date().toISOString().split("T")[0],
      status: "alive" as TreeStatus,
      description: input.notes || `Fast-registered sapling via mobile field console. Tag: ${input.tagId || "N/A"}`,
      photo_url: input.photoUrl || input.photoDataUrl,
      created_at: new Date().toISOString(),
    };

    if (isOffline) {
      // Save directly to local offline queue
      enqueueOfflineTree({
        tree_name: treeRecord.tree_name,
        species: treeRecord.species,
        location: `${input.coordinates.latitude.toFixed(6)}, ${input.coordinates.longitude.toFixed(6)}`,
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        height_cm: input.heightCm,
        plantation_date: treeRecord.plantation_date,
        notes: treeRecord.description,
        photo_data_url: input.photoDataUrl,
      });
    } else {
      // Attempt fast persistence to Supabase
      try {
        const { error } = await supabase.from("trees").insert({
          tree_name: treeRecord.tree_name,
          species: treeRecord.species,
          latitude: treeRecord.latitude,
          longitude: treeRecord.longitude,
          height_cm: treeRecord.height_cm,
          dbh_cm: treeRecord.dbh_cm,
          project_id: treeRecord.project_id,
          plantation_date: treeRecord.plantation_date,
          status: treeRecord.status,
          description: treeRecord.description,
          photo_url: treeRecord.photo_url,
        });

        if (error) {
          console.warn("Direct Supabase insert failed, enqueuing offline:", error.message);
          enqueueOfflineTree({
            tree_name: treeRecord.tree_name,
            species: treeRecord.species,
            location: `${input.coordinates.latitude.toFixed(6)}, ${input.coordinates.longitude.toFixed(6)}`,
            latitude: input.coordinates.latitude,
            longitude: input.coordinates.longitude,
            height_cm: input.heightCm,
            plantation_date: treeRecord.plantation_date,
            notes: treeRecord.description,
          });
        }
      } catch (err) {
        console.warn("Network error during tree insert, falling back to offline queue:", err);
        enqueueOfflineTree({
          tree_name: treeRecord.tree_name,
          species: treeRecord.species,
          location: `${input.coordinates.latitude.toFixed(6)}, ${input.coordinates.longitude.toFixed(6)}`,
          latitude: input.coordinates.latitude,
          longitude: input.coordinates.longitude,
          height_cm: input.heightCm,
          plantation_date: treeRecord.plantation_date,
          notes: treeRecord.description,
        });
      }
    }

    // Update Session Telemetry
    session.streakCount += 1;
    session.totalPlanted += 1;
    session.speciesCounts[input.species] = (session.speciesCounts[input.species] || 0) + 1;
    session.lastPlantedCoord = input.coordinates;
    session.lastPlantedTime = new Date().toISOString();
    session.lastTreeCode = treeCode;
    session.estimatedCarbonOffsetKg += carbonCoeff;

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      treeCode,
      qrPayload,
      tree: treeRecord,
      spacing,
      isOffline,
      streakCount: session.streakCount,
      totalPlanted: session.totalPlanted,
      executionTimeMs,
    };
  }

  /**
   * Generates transect coordinates for a planting grid/row along a compass bearing
   */
  public generateTransectCoordinates(
    startCoord: { latitude: number; longitude: number },
    count: number,
    spacingMeters: number = 3.5,
    bearingDegrees: number = 90
  ): Array<{ index: number; latitude: number; longitude: number }> {
    const coords: Array<{ index: number; latitude: number; longitude: number }> = [];
    const earthRadiusMeters = 6371000;
    const bearingRad = (bearingDegrees * Math.PI) / 180;
    const lat1Rad = (startCoord.latitude * Math.PI) / 180;
    const lon1Rad = (startCoord.longitude * Math.PI) / 180;

    for (let i = 0; i < count; i++) {
      const distMeters = i * spacingMeters;
      const distRatio = distMeters / earthRadiusMeters;

      const lat2Rad = Math.asin(
        Math.sin(lat1Rad) * Math.cos(distRatio) +
        Math.cos(lat1Rad) * Math.sin(distRatio) * Math.cos(bearingRad)
      );

      const lon2Rad = lon1Rad + Math.atan2(
        Math.sin(bearingRad) * Math.sin(distRatio) * Math.cos(lat1Rad),
        Math.cos(distRatio) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
      );

      coords.push({
        index: i + 1,
        latitude: Number(((lat2Rad * 180) / Math.PI).toFixed(6)),
        longitude: Number(((lon2Rad * 180) / Math.PI).toFixed(6)),
      });
    }

    return coords;
  }
}

export const fastTreeRegistrationService = new FastTreeRegistrationService();
