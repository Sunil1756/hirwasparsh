/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 8 TASK 42
 * Spatiotemporal Consistency & Kinematic Verification Engine
 *
 * Multi-Vector Location & Time Anti-Fraud Verification:
 * 1. Kinematic Velocity & Teleportation Detection (Speed between sequential planter captures)
 * 2. Astronomical Solar Ephemeris (Sunrise/Sunset & Zenith angle daylight plausibility)
 * 3. Geodetic Geofence Boundary & Elevation Plausibility
 * 4. Chronological Sequence & NTP/EXIF Clock Drift
 */

export type KinematicStatus =
  | "walking_transit"
  | "vehicular_transit"
  | "high_speed_warning"
  | "impossible_teleportation";

export type SolarLightingStatus =
  | "daylight"
  | "civil_twilight"
  | "astronomical_night";

export type GeofenceStatus =
  | "inside_boundary"
  | "within_buffer_tolerance"
  | "geofence_breach";

export type SpatiotemporalRiskLevel =
  | "verified_consistent"
  | "minor_warning"
  | "anomalous_flagged"
  | "critical_spoofing";

export type SpatiotemporalAdjudicationStatus =
  | "pending_review"
  | "confirmed_spoofing_rejected"
  | "travel_waiver_granted"
  | "field_re_audit_requested"
  | "dismissed_false_positive";

export interface LatLngPoint {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
}

export interface PlanterTrajectoryPoint {
  id: string;
  treeId: string;
  claimId?: string;
  planterId: string;
  planterName?: string;
  coords: LatLngPoint;
  timestamp: string; // ISO string
  exifTimestamp?: string;
  serverIngestTimestamp?: string;
  photoUrl?: string;
  species?: string;
}

export interface SolarEphemerisResult {
  solarZenithAngleDeg: number;
  solarElevationAngleDeg: number;
  sunriseTime: string; // HH:mm format
  sunsetTime: string;  // HH:mm format
  solarNoonTime: string;
  dayLengthHours: number;
  lightingStatus: SolarLightingStatus;
  isDaylightPlausible: boolean;
  notes: string;
}

export interface KinematicVectorResult {
  distanceMeters: number;
  distanceKm: number;
  elapsedSeconds: number;
  elapsedMinutes: number;
  speedKmh: number;
  status: KinematicStatus;
  isPlausible: boolean;
  notes: string;
  previousPoint?: PlanterTrajectoryPoint;
}

export interface GeofenceCheckResult {
  status: GeofenceStatus;
  isContained: boolean;
  distanceToBoundaryMeters: number;
  boundaryName: string;
  notes: string;
}

export interface ChronologicalCheckResult {
  clockDriftSeconds: number;
  isClockSynchronized: boolean;
  isFutureTimestamp: boolean;
  isRetroactiveViolation: boolean;
  notes: string;
}

export interface SpatiotemporalAuditReport {
  id: string;
  treeId: string;
  planterId: string;
  planterName: string;
  coords: LatLngPoint;
  timestamp: string;
  overallScore: number; // 0 - 100%
  riskLevel: SpatiotemporalRiskLevel;
  kinematics: KinematicVectorResult;
  solarEphemeris: SolarEphemerisResult;
  geofence: GeofenceCheckResult;
  chronology: ChronologicalCheckResult;
  activeViolations: string[];
  adjudicationStatus: SpatiotemporalAdjudicationStatus;
  adjudicationNotes?: string;
  adjudicatedBy?: string;
  adjudicatedAt?: string;
}

// Haversine Distance
export function calculateGeodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

/**
 * Astronomical Solar Ephemeris & Day/Night Solar Zenith Angle Engine
 */
export function calculateSolarEphemeris(
  latitude: number,
  longitude: number,
  date: Date
): SolarEphemerisResult {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 3600 * 1000)) + 1;

  // Fractional year in radians
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);

  // Equation of time in minutes
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination in radians
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Local solar time in minutes
  const timeOffset = eqtime + 4 * longitude;
  const trueSolarTime =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    timeOffset;

  // Solar hour angle in degrees
  let ha = trueSolarTime / 4 - 180;
  if (ha < -180) ha += 360;
  const haRad = (ha * Math.PI) / 180;

  const latRad = (latitude * Math.PI) / 180;

  // Cosine of Solar Zenith Angle
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);

  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const zenithDeg = Math.round(((zenithRad * 180) / Math.PI) * 10) / 10;
  const elevationDeg = Math.round((90 - zenithDeg) * 10) / 10;

  // Sunrise / Sunset Hour Angle for standard refraction (90.833 degrees)
  const cosHourAngle =
    (Math.cos((90.833 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  let sunriseMinutes = 360; // default 6:00
  let sunsetMinutes = 1080; // default 18:00

  if (cosHourAngle >= -1 && cosHourAngle <= 1) {
    const haSun = (Math.acos(cosHourAngle) * 180) / Math.PI;
    sunriseMinutes = 720 - 4 * (longitude + haSun) - eqtime;
    sunsetMinutes = 720 - 4 * (longitude - haSun) - eqtime;

    // Convert from UTC to local timezone offset of date
    const tzOffsetMinutes = -date.getTimezoneOffset();
    sunriseMinutes = (sunriseMinutes + tzOffsetMinutes + 1440) % 1440;
    sunsetMinutes = (sunsetMinutes + tzOffsetMinutes + 1440) % 1440;
  }

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  };

  const dayLengthHours =
    Math.round((((sunsetMinutes - sunriseMinutes + 1440) % 1440) / 60) * 10) / 10;

  let lightingStatus: SolarLightingStatus = "daylight";
  let isDaylightPlausible = true;
  let notes = "Capture timestamp aligns with daytime natural sunlight.";

  if (zenithDeg <= 90) {
    lightingStatus = "daylight";
    isDaylightPlausible = true;
    notes = "Astronomical Solar Zenith " + zenithDeg + "°: Daylight illumination.";
  } else if (zenithDeg <= 96) {
    lightingStatus = "civil_twilight";
    isDaylightPlausible = true;
    notes = "Astronomical Solar Zenith " + zenithDeg + "°: Civil twilight (dawn/dusk).";
  } else {
    lightingStatus = "astronomical_night";
    isDaylightPlausible = false;
    notes = "Astronomical Solar Zenith " + zenithDeg + "°: Pitch-black night. Natural daylight is physically impossible without artificial floodlights.";
  }

  return {
    solarZenithAngleDeg: zenithDeg,
    solarElevationAngleDeg: elevationDeg,
    sunriseTime: formatTime(sunriseMinutes),
    sunsetTime: formatTime(sunsetMinutes),
    solarNoonTime: formatTime((sunriseMinutes + sunsetMinutes) / 2),
    dayLengthHours,
    lightingStatus,
    isDaylightPlausible,
    notes,
  };
}

/**
 * Point-in-Polygon Ray Casting Geofence Checker
 */
export function checkPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [lat, lon] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lon !== yj > lon &&
      lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Standard Pune Agroforestry Project Polygon Boundary
const DEFAULT_PROJECT_POLYGON: [number, number][] = [
  [18.518, 73.852],
  [18.528, 73.852],
  [18.528, 73.864],
  [18.518, 73.864],
];

// Seed Historical Trajectory Points for Planters
const SEED_TRAJECTORY_POINTS: PlanterTrajectoryPoint[] = [
  {
    id: "TRAJ-PUNE-001",
    treeId: "TREE-BANYAN-7701",
    claimId: "CLM-2026-001",
    planterId: "USR-PUNE-101",
    planterName: "Ramesh Shinde",
    coords: { latitude: 18.52048, longitude: 73.85679, altitudeMeters: 560 },
    timestamp: "2026-09-20T08:30:00.000Z",
    exifTimestamp: "2026-09-20T08:30:00.000Z",
    serverIngestTimestamp: "2026-09-20T08:30:12.000Z",
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    species: "Ficus Religiosa (Sacred Fig)",
  },
  {
    id: "TRAJ-PUNE-002",
    treeId: "TREE-BANYAN-7702",
    claimId: "CLM-2026-006",
    planterId: "USR-PUNE-101",
    planterName: "Ramesh Shinde",
    coords: { latitude: 18.52085, longitude: 73.85715, altitudeMeters: 562 },
    timestamp: "2026-09-20T08:42:00.000Z", // 12 mins later, 58m away -> 0.29 km/h (walking)
    exifTimestamp: "2026-09-20T08:42:00.000Z",
    serverIngestTimestamp: "2026-09-20T08:42:15.000Z",
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop",
    species: "Ficus Religiosa (Sacred Fig)",
  },
  {
    id: "TRAJ-PUNE-003",
    treeId: "TREE-TELEPORT-99",
    claimId: "CLM-2026-007",
    planterId: "USR-PUNE-101",
    planterName: "Ramesh Shinde",
    // 52 kilometers away in Mumbai direction, logged only 4 minutes later!
    // 52 km / (4/60) hr = 780 km/h (impossible travel / spoofing)
    coords: { latitude: 18.92200, longitude: 73.85715, altitudeMeters: 550 },
    timestamp: "2026-09-20T08:46:00.000Z",
    exifTimestamp: "2026-09-20T08:46:00.000Z",
    serverIngestTimestamp: "2026-09-20T08:46:05.000Z",
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop",
    species: "Tectona Grandis (Teak)",
  },
  {
    id: "TRAJ-PUNE-004",
    treeId: "TREE-NIGHT-001",
    claimId: "CLM-2026-008",
    planterId: "USR-MAHA-402",
    planterName: "Kavita Patil",
    coords: { latitude: 18.52115, longitude: 73.85760, altitudeMeters: 558 },
    // Timestamp set to 02:15 AM midnight (solar zenith > 140 degrees)
    timestamp: "2026-09-24T20:45:00.000Z", // 02:15 AM IST
    exifTimestamp: "2026-09-24T20:45:00.000Z",
    serverIngestTimestamp: "2026-09-24T20:45:10.000Z",
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    species: "Swietenia Mahagoni",
  },
  {
    id: "TRAJ-PUNE-005",
    treeId: "TREE-GEOFENCE-OUT",
    claimId: "CLM-2026-009",
    planterId: "USR-PUNE-333",
    planterName: "Anil Deshmukh",
    // 5 km outside project boundaries
    coords: { latitude: 18.58000, longitude: 73.92000, altitudeMeters: 590 },
    timestamp: "2026-09-25T09:10:00.000Z",
    exifTimestamp: "2026-09-25T09:10:00.000Z",
    serverIngestTimestamp: "2026-09-25T09:10:14.000Z",
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop",
    species: "Azadirachta Indica (Neem)",
  }
];

export class SpatiotemporalConsistencyService {
  private trajectoryPoints: PlanterTrajectoryPoint[] = [];
  private projectGeofence: [number, number][] = DEFAULT_PROJECT_POLYGON;
  private auditReports: Map<string, SpatiotemporalAuditReport> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.trajectoryPoints = [...SEED_TRAJECTORY_POINTS];
    this.projectGeofence = [...DEFAULT_PROJECT_POLYGON];
    this.auditReports.clear();
    this.rebuildAllAuditReports();
    this.notify();
  }

  public getTrajectoryPoints(): PlanterTrajectoryPoint[] {
    return [...this.trajectoryPoints];
  }

  public getPlanterTrajectory(planterId: string): PlanterTrajectoryPoint[] {
    return this.trajectoryPoints
      .filter((p) => p.planterId === planterId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getProjectGeofence(): [number, number][] {
    return [...this.projectGeofence];
  }

  public setProjectGeofence(polygon: [number, number][]): void {
    this.projectGeofence = polygon;
    this.rebuildAllAuditReports();
    this.notify();
  }

  public getAuditReports(): SpatiotemporalAuditReport[] {
    return Array.from(this.auditReports.values());
  }

  public getReportByTreeId(treeId: string): SpatiotemporalAuditReport | undefined {
    return Array.from(this.auditReports.values()).find((r) => r.treeId === treeId);
  }

  public getReportById(reportId: string): SpatiotemporalAuditReport | undefined {
    return this.auditReports.get(reportId);
  }

  /**
   * Evaluates Spatiotemporal Physics & Kinematics for a given candidate point.
   */
  public evaluateSpatiotemporalConsistency(
    point: PlanterTrajectoryPoint,
    previousPoint?: PlanterTrajectoryPoint
  ): SpatiotemporalAuditReport {
    const activeViolations: string[] = [];
    let score = 100;

    // 1. Kinematic Velocity Check
    let kinematics: KinematicVectorResult;
    if (previousPoint) {
      const distMeters = calculateGeodesicDistanceMeters(
        previousPoint.coords.latitude,
        previousPoint.coords.longitude,
        point.coords.latitude,
        point.coords.longitude
      );
      const distKm = distMeters / 1000;
      const t1 = new Date(previousPoint.timestamp).getTime();
      const t2 = new Date(point.timestamp).getTime();
      const elapsedSec = Math.max(1, Math.abs(t2 - t1) / 1000);
      const elapsedMin = elapsedSec / 60;
      const speedKmh = Math.round((distKm / (elapsedSec / 3600)) * 10) / 10;

      let status: KinematicStatus = "walking_transit";
      let isPlausible = true;
      let notes = "Transit speed " + speedKmh + " km/h (" + distMeters + "m in " + elapsedMin.toFixed(1) + "m) is normal walking pace.";

      if (speedKmh <= 15) {
        status = "walking_transit";
      } else if (speedKmh <= 80) {
        status = "vehicular_transit";
        notes = "Transit speed " + speedKmh + " km/h aligns with field vehicle / bike transit.";
      } else if (speedKmh <= 200) {
        status = "high_speed_warning";
        isPlausible = false;
        score -= 25;
        notes = "High speed warning: " + speedKmh + " km/h exceeds off-road limits.";
        activeViolations.push("High-Speed Travel Warning (" + speedKmh + " km/h)");
      } else {
        status = "impossible_teleportation";
        isPlausible = false;
        score -= 55;
        notes = "Critical impossible travel: " + speedKmh + " km/h (" + distKm.toFixed(1) + " km in " + elapsedMin.toFixed(1) + " mins) indicates GPS spoofing or teleportation fraud.";
        activeViolations.push("Impossible Teleportation Fraud (" + speedKmh + " km/h across " + distKm.toFixed(1) + "km)");
      }

      kinematics = {
        distanceMeters: distMeters,
        distanceKm: distKm,
        elapsedSeconds: elapsedSec,
        elapsedMinutes: elapsedMin,
        speedKmh,
        status,
        isPlausible,
        notes,
        previousPoint,
      };
    } else {
      kinematics = {
        distanceMeters: 0,
        distanceKm: 0,
        elapsedSeconds: 0,
        elapsedMinutes: 0,
        speedKmh: 0,
        status: "walking_transit",
        isPlausible: true,
        notes: "Initial check-in point for planter.",
      };
    }

    // 2. Astronomical Solar Ephemeris Check
    const captureDate = new Date(point.timestamp);
    const solar = calculateSolarEphemeris(
      point.coords.latitude,
      point.coords.longitude,
      captureDate
    );
    if (!solar.isDaylightPlausible) {
      score -= 35;
      activeViolations.push("Astronomical Solar Night Anomaly (Capture at " + solar.lightingStatus + ", Zenith: " + solar.solarZenithAngleDeg + "°)");
    }

    // 3. Geodetic Geofence Check
    const isInside = checkPointInPolygon(
      [point.coords.latitude, point.coords.longitude],
      this.projectGeofence
    );

    let geofenceStatus: GeofenceStatus = "inside_boundary";
    let distToBoundary = 0;
    let geofenceNotes = "Coordinates lie securely inside project cadastral parcel boundary.";

    if (!isInside) {
      // Calculate min distance to polygon vertex
      let minDist = Infinity;
      for (const vertex of this.projectGeofence) {
        const d = calculateGeodesicDistanceMeters(
          point.coords.latitude,
          point.coords.longitude,
          vertex[0],
          vertex[1]
        );
        if (d < minDist) minDist = d;
      }
      distToBoundary = minDist;

      if (distToBoundary <= 15) {
        geofenceStatus = "within_buffer_tolerance";
        geofenceNotes = "Point is " + distToBoundary.toFixed(1) + "m outside parcel, within acceptable GPS drift buffer (15m).";
      } else {
        geofenceStatus = "geofence_breach";
        score -= 30;
        geofenceNotes = "Geofence breach: Coordinates are " + distToBoundary.toFixed(0) + "m outside registered project perimeter.";
        activeViolations.push("Project Geofence Boundary Breach (" + distToBoundary.toFixed(0) + "m outside)");
      }
    }

    const geofence: GeofenceCheckResult = {
      status: geofenceStatus,
      isContained: isInside,
      distanceToBoundaryMeters: distToBoundary,
      boundaryName: "Pune Agroforestry Parcel #1",
      notes: geofenceNotes,
    };

    // 4. Chronological Sequence & Clock Drift
    const now = Date.now();
    const tCapture = captureDate.getTime();
    const isFuture = tCapture > now + 5 * 60 * 1000; // 5 min future tolerance
    if (isFuture) {
      score -= 40;
      activeViolations.push("Future Capture Timestamp Anomaly");
    }

    let clockDriftSec = 0;
    if (point.exifTimestamp) {
      const tExif = new Date(point.exifTimestamp).getTime();
      clockDriftSec = Math.abs(tCapture - tExif) / 1000;
      if (clockDriftSec > 15 * 60) {
        score -= 15;
        activeViolations.push("EXIF / GPS Clock Drift (" + (clockDriftSec / 60).toFixed(0) + " mins)");
      }
    }

    const chronology: ChronologicalCheckResult = {
      clockDriftSeconds: clockDriftSec,
      isClockSynchronized: clockDriftSec <= 15 * 60,
      isFutureTimestamp: isFuture,
      isRetroactiveViolation: false,
      notes: isFuture
        ? "Timestamp is set in the future!"
        : clockDriftSec > 15 * 60
        ? "Clock drift between EXIF and GPS time exceeds 15 minutes."
        : "Timestamp and hardware clocks are synchronized.",
    };

    // Final Risk Classification
    score = Math.max(0, Math.min(100, score));
    let riskLevel: SpatiotemporalRiskLevel = "verified_consistent";
    if (score < 50 || kinematics.status === "impossible_teleportation") {
      riskLevel = "critical_spoofing";
    } else if (score < 75 || activeViolations.length > 0) {
      riskLevel = "anomalous_flagged";
    } else if (score < 90) {
      riskLevel = "minor_warning";
    }

    return {
      id: "ST-REP-" + point.id,
      treeId: point.treeId,
      planterId: point.planterId,
      planterName: point.planterName || "Registered Farmer",
      coords: point.coords,
      timestamp: point.timestamp,
      overallScore: score,
      riskLevel,
      kinematics,
      solarEphemeris: solar,
      geofence,
      chronology,
      activeViolations,
      adjudicationStatus: "pending_review",
    };
  }

  public rebuildAllAuditReports(): void {
    const sorted = [...this.trajectoryPoints].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const planterLastMap = new Map<string, PlanterTrajectoryPoint>();

    for (const pt of sorted) {
      const prev = planterLastMap.get(pt.planterId);
      const existingReport = this.auditReports.get("ST-REP-" + pt.id);
      const report = this.evaluateSpatiotemporalConsistency(pt, prev);

      // Preserve existing adjudication if any
      if (existingReport && existingReport.adjudicationStatus !== "pending_review") {
        report.adjudicationStatus = existingReport.adjudicationStatus;
        report.adjudicationNotes = existingReport.adjudicationNotes;
        report.adjudicatedBy = existingReport.adjudicatedBy;
        report.adjudicatedAt = existingReport.adjudicatedAt;
      }

      this.auditReports.set(report.id, report);
      planterLastMap.set(pt.planterId, pt);
    }
  }

  /**
   * Adjudicate Spatiotemporal Report with auditor decision
   */
  public adjudicateReport(
    reportId: string,
    status: SpatiotemporalAdjudicationStatus,
    notes: string,
    auditorId: string
  ): SpatiotemporalAuditReport {
    let report = this.auditReports.get(reportId);
    if (!report) {
      // Create fallback dynamic report
      report = {
        id: reportId,
        treeId: "TREE-DYNAMIC",
        planterId: "USR-DYNAMIC",
        planterName: "Dynamic Planter",
        coords: { latitude: 18.52, longitude: 73.85 },
        timestamp: new Date().toISOString(),
        overallScore: 50,
        riskLevel: "anomalous_flagged",
        kinematics: {
          distanceMeters: 0,
          distanceKm: 0,
          elapsedSeconds: 0,
          elapsedMinutes: 0,
          speedKmh: 0,
          status: "walking_transit",
          isPlausible: true,
          notes: "Dynamic report",
        },
        solarEphemeris: calculateSolarEphemeris(18.52, 73.85, new Date()),
        geofence: {
          status: "inside_boundary",
          isContained: true,
          distanceToBoundaryMeters: 0,
          boundaryName: "Dynamic Boundary",
          notes: "Dynamic report",
        },
        chronology: {
          clockDriftSeconds: 0,
          isClockSynchronized: true,
          isFutureTimestamp: false,
          isRetroactiveViolation: false,
          notes: "Synchronized",
        },
        activeViolations: [],
        adjudicationStatus: status,
      };
      this.auditReports.set(reportId, report);
    }

    report.adjudicationStatus = status;
    report.adjudicationNotes = notes;
    report.adjudicatedBy = auditorId;
    report.adjudicatedAt = new Date().toISOString();

    this.notify();
    return report;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("SpatiotemporalConsistencyService listener error:", err);
      }
    });
  }
}

export const spatiotemporalConsistencyService = new SpatiotemporalConsistencyService();
