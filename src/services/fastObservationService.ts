/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 35
 * Fast Observation Service & Proximity Health Audit Engine
 * 
 * Features:
 * 1. Sub-3-second 1-tap field health observations & MRV check-ins
 * 2. Proximity-based nearest tree auto-detection & rangefinder
 * 3. 4 tactical health states with dynamic Next Monitoring schedule calculation
 * 4. Multi-select threat/stress tags & biometric growth delta tracking
 * 5. 1-Tap "Quick Confirm Healthy" all-clear shortcut
 * 6. Continuous inspection streak & session survival analytics
 * 7. Zero-lag offline queue persistence
 */

import { supabase } from "@/integrations/supabase/client";
import { TreeHealthStatus, TreeStatus } from "@/types/coreDatabase";
import { monitoringEventService } from "./monitoringEventService";
import { calculateHaversineDistance, LatLngTuple } from "@/lib/gisMapFoundation";
import { calculateBearing } from "@/components/mobile/FieldWaypointCompass";
import { enqueueOfflineFieldReport } from "@/lib/fieldReportBackendService";

export interface FastObservationSession {
  sessionId: string;
  projectId: string;
  projectName?: string;
  inspectorId: string;
  inspectorName?: string;
  startTime: string;
  streakCount: number;
  totalInspected: number;
  healthyCount: number;
  stressedCount: number;
  damagedCount: number;
  deadCount: number;
  flagsRaisedCount: number;
  survivalRatePct: number;
  lastInspectedTreeCode?: string;
  lastInspectedTime?: string;
}

export interface TreeInspectionCandidate {
  id: string;
  treeCode: string;
  species: string;
  vernacularName?: string;
  plantationDate: string;
  currentHeightCm?: number;
  lastStatus?: TreeHealthStatus | TreeStatus;
  latitude: number;
  longitude: number;
  compartmentName?: string;
}

export interface ProximityTargetTree {
  tree: TreeInspectionCandidate;
  distanceMeters: number;
  bearingDegrees: number;
  isAutoLocked: boolean; // true if <= 10m
}

export interface FastObservationInput {
  treeId: string;
  treeCode?: string;
  species: string;
  healthStatus: "healthy" | "stressed" | "damaged" | "dead";
  heightDeltaCm?: number;
  currentHeightCm?: number;
  foliageDensityPct?: number; // 0 - 100
  threatTags?: string[];
  notes?: string;
  photoUrl?: string;
  photoDataUrl?: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  projectId?: string;
  inspectorId?: string;
  inspectorName?: string;
}

export interface FastObservationResult {
  success: boolean;
  observationId: string;
  treeCode: string;
  healthStatus: TreeHealthStatus;
  nextMonitoringDate: string;
  intervalDays: number;
  isOffline: boolean;
  streakCount: number;
  totalInspected: number;
  survivalRatePct: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * Standard Maharashtra Field Threat / Stress Tags
 */
export const FIELD_THREAT_TAGS = [
  { id: "pest", label: "🐛 Pest Infestation (कीड)", severity: "high" },
  { id: "drought", label: "💧 Water Stress / Drought (पाणी टंचाई)", severity: "high" },
  { id: "grazing", label: "🐐 Animal Grazing (जनावरांचा त्रास)", severity: "medium" },
  { id: "fire", label: "🔥 Fire Scorch (वन्ही/आग)", severity: "critical" },
  { id: "weeds", label: "🌿 Weed Choking (तण/वेलींचा विळखा)", severity: "medium" },
  { id: "erosion", label: "⛏️ Soil Erosion (मातीची धूप)", severity: "medium" },
  { id: "wind", label: "🌪️ Wind Damage (वादळाने मोडतोड)", severity: "medium" },
  { id: "vandalism", label: "🪓 Vandalism / Theft (तोडफोड/चोरी)", severity: "critical" },
];

/**
 * Height delta preset buttons (in cm)
 */
export const HEIGHT_DELTA_PRESETS = [0, 5, 10, 15, 25, 40];

/**
 * Foliage density preset buttons (in %)
 */
export const FOLIAGE_DENSITY_PRESETS = [100, 75, 50, 25, 0];

class FastObservationService {
  private activeSession: FastObservationSession | null = null;

  /**
   * Initializes or gets the active field inspection session
   */
  public startSession(
    projectId: string = "demo-project-dev-001",
    projectName: string = "Western Ghats Sahyadri Reforestation",
    inspectorId: string = "field-ranger-01",
    inspectorName: string = "Ranger Sanjay Patil"
  ): FastObservationSession {
    this.activeSession = {
      sessionId: "obs-ses-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      projectId,
      projectName,
      inspectorId,
      inspectorName,
      startTime: new Date().toISOString(),
      streakCount: 0,
      totalInspected: 0,
      healthyCount: 0,
      stressedCount: 0,
      damagedCount: 0,
      deadCount: 0,
      flagsRaisedCount: 0,
      survivalRatePct: 100.0,
    };
    return this.activeSession;
  }

  public getSession(): FastObservationSession {
    if (!this.activeSession) {
      return this.startSession();
    }
    return this.activeSession;
  }

  public resetStreak(): void {
    if (this.activeSession) {
      this.activeSession.streakCount = 0;
    }
  }

  /**
   * Finds and ranks candidate trees by geodesic proximity to worker's location
   */
  public findNearestTrees(
    currentLocation: { lat: number; lng: number },
    candidates: TreeInspectionCandidate[],
    maxDistanceMeters: number = 200
  ): ProximityTargetTree[] {
    const origin: LatLngTuple = [currentLocation.lat, currentLocation.lng];

    return candidates
      .map((tree) => {
        const dest: LatLngTuple = [tree.latitude, tree.longitude];
        const distanceMeters = Math.round(calculateHaversineDistance(origin, dest) * 10) / 10;
        const bearingDegrees = Math.round(calculateBearing(origin, dest));
        return {
          tree,
          distanceMeters,
          bearingDegrees,
          isAutoLocked: distanceMeters <= 10.0,
        };
      })
      .filter((target) => target.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  /**
   * Finds next uninspected tree in sequence/transect
   */
  public getNextTreeInSequence(
    currentTreeId: string,
    candidates: TreeInspectionCandidate[],
    inspectedIds: Set<string>
  ): TreeInspectionCandidate | null {
    const uninspected = candidates.filter((c) => !inspectedIds.has(c.id) && c.id !== currentTreeId);
    return uninspected.length > 0 ? uninspected[0] : null;
  }

  /**
   * Rapid-fire atomic observation submission executing in < 50ms locally
   */
  public async fastRecordObservation(input: FastObservationInput): Promise<FastObservationResult> {
    const startTime = performance.now();
    const session = this.getSession();

    const observationId = "obs-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    const treeCode = input.treeCode || "GE-2026-TREE";

    // Map health status to TreeHealthStatus
    const mappedHealthStatus: TreeHealthStatus =
      input.healthStatus === "dead"
        ? "dead"
        : input.healthStatus === "damaged"
        ? "diseased"
        : input.healthStatus === "stressed"
        ? "stressed"
        : "healthy";

    // Compute dynamic next monitoring interval
    const scheduleCalc = monitoringEventService.calculateNextMonitoringDate(
      new Date().toISOString(),
      mappedHealthStatus,
      new Date().toISOString()
    );

    const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

    const observationRecord: any = {
      id: observationId,
      tree_id: input.treeId,
      observer_id: input.inspectorId || session.inspectorId,
      observer_name: input.inspectorName || session.inspectorName,
      observation_date: new Date().toISOString(),
      health_status: mappedHealthStatus,
      height_cm: input.currentHeightCm || (input.heightDeltaCm ? 120 + input.heightDeltaCm : 120),
      foliage_density_pct: input.foliageDensityPct ?? 90,
      pest_disease_detected: (input.threatTags && input.threatTags.length > 0) || false,
      pest_types: input.threatTags || [],
      condition_notes: input.notes || "Fast field observation recorded. Threats: " + (input.threatTags?.join(", ") || "None"),
      photo_url: input.photoUrl || input.photoDataUrl,
      latitude: input.coordinates.latitude,
      longitude: input.coordinates.longitude,
      gps_accuracy_meters: input.coordinates.accuracyMeters || 3.0,
      verification_status: "verified",
      created_at: new Date().toISOString(),
    };

    if (isOffline) {
      // Enqueue to offline field reports / observations
      enqueueOfflineFieldReport({
        projectId: input.projectId || session.projectId,
        title: "Fast Tree Observation: " + treeCode,
        description: observationRecord.condition_notes,
        observedAt: observationRecord.observation_date,
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        treesObserved: 1,
        treesHealthy: input.healthStatus === "healthy" ? 1 : 0,
        treesStressed: input.healthStatus === "stressed" ? 1 : 0,
        treesDead: input.healthStatus === "dead" ? 1 : 0,
        threats: input.threatTags || [],
      });
    } else {
      // Save to Supabase
      try {
        await supabase.from("tree_observations" as any).insert(observationRecord);
        // Update tree parent record
        await supabase
          .from("trees")
          .update({
            status: mappedHealthStatus === "dead" ? "dead" : "alive",
            last_monitored_at: new Date().toISOString(),
            next_monitoring_date: scheduleCalc.nextMonitoringDate,
          } as any)
          .eq("id", input.treeId);
      } catch (err) {
        console.warn("Direct Supabase observation insert failed, falling back to offline:", err);
        enqueueOfflineFieldReport({
          projectId: input.projectId || session.projectId,
          title: "Fast Tree Observation: " + treeCode,
          description: observationRecord.condition_notes,
          observedAt: observationRecord.observation_date,
          latitude: input.coordinates.latitude,
          longitude: input.coordinates.longitude,
          treesObserved: 1,
          treesHealthy: input.healthStatus === "healthy" ? 1 : 0,
          treesStressed: input.healthStatus === "stressed" ? 1 : 0,
          treesDead: input.healthStatus === "dead" ? 1 : 0,
          threats: input.threatTags || [],
        });
      }
    }

    // Update Session Telemetry
    session.streakCount += 1;
    session.totalInspected += 1;
    if (input.healthStatus === "healthy") session.healthyCount += 1;
    else if (input.healthStatus === "stressed") session.stressedCount += 1;
    else if (input.healthStatus === "damaged") session.damagedCount += 1;
    else if (input.healthStatus === "dead") session.deadCount += 1;

    if (input.threatTags && input.threatTags.length > 0) {
      session.flagsRaisedCount += input.threatTags.length;
    }

    const viableTrees = session.healthyCount + session.stressedCount;
    session.survivalRatePct = session.totalInspected > 0
      ? Math.round((viableTrees / session.totalInspected) * 1000) / 10
      : 100.0;

    session.lastInspectedTreeCode = treeCode;
    session.lastInspectedTime = new Date().toISOString();

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      observationId,
      treeCode,
      healthStatus: mappedHealthStatus,
      nextMonitoringDate: scheduleCalc.nextMonitoringDate,
      intervalDays: scheduleCalc.intervalDays,
      isOffline,
      streakCount: session.streakCount,
      totalInspected: session.totalInspected,
      survivalRatePct: session.survivalRatePct,
      executionTimeMs,
    };
  }

  /**
   * 1-Tap "Quick Confirm Healthy (सर्व ठीक आहे)" all-clear shortcut
   */
  public async quickConfirmHealthy(
    tree: TreeInspectionCandidate,
    coordinates: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<FastObservationResult> {
    return this.fastRecordObservation({
      treeId: tree.id,
      treeCode: tree.treeCode,
      species: tree.species,
      healthStatus: "healthy",
      heightDeltaCm: 0,
      foliageDensityPct: 100,
      threatTags: [],
      notes: "Quick 1-tap health confirmation. All vital signs healthy (सर्व ठीक आहे).",
      coordinates,
    });
  }
}

export const fastObservationService = new FastObservationService();
