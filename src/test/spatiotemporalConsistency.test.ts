import { describe, it, expect, beforeEach } from "vitest";
import {
  spatiotemporalConsistencyService,
  calculateGeodesicDistanceMeters,
  calculateSolarEphemeris,
  checkPointInPolygon,
  PlanterTrajectoryPoint,
} from "../services/spatiotemporalConsistencyService";

describe("Spatiotemporal Consistency & Kinematic Verification Subsystem (Task 42)", () => {
  beforeEach(() => {
    spatiotemporalConsistencyService.resetToDefaults();
  });

  it("calculates geodesic Haversine distance accurately between coordinates", () => {
    // Distance between two Pune locations (~1.2 km)
    const dist = calculateGeodesicDistanceMeters(18.52048, 73.85679, 18.53000, 73.86000);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1500);

    // Identical point should be 0 meters
    const zeroDist = calculateGeodesicDistanceMeters(18.52048, 73.85679, 18.52048, 73.85679);
    expect(zeroDist).toBe(0);
  });

  it("calculates astronomical solar ephemeris and detects daylight vs astronomical night", () => {
    // 12:00 PM noon at Pune (Latitude 18.52, Longitude 73.85) -> Daylight (Zenith < 90 deg)
    const noonDate = new Date("2026-09-25T06:30:00.000Z"); // 12:00 PM IST
    const noonSolar = calculateSolarEphemeris(18.52048, 73.85679, noonDate);

    expect(noonSolar.solarZenithAngleDeg).toBeLessThan(50);
    expect(noonSolar.lightingStatus).toBe("daylight");
    expect(noonSolar.isDaylightPlausible).toBe(true);

    // 02:00 AM midnight at Pune -> Astronomical Night (Zenith > 130 deg)
    const nightDate = new Date("2026-09-24T20:30:00.000Z"); // 02:00 AM IST
    const nightSolar = calculateSolarEphemeris(18.52048, 73.85679, nightDate);

    expect(nightSolar.solarZenithAngleDeg).toBeGreaterThan(120);
    expect(nightSolar.lightingStatus).toBe("astronomical_night");
    expect(nightSolar.isDaylightPlausible).toBe(false);
  });

  it("evaluates point-in-polygon ray casting for cadastral geofences", () => {
    const polygon: [number, number][] = [
      [18.518, 73.852],
      [18.528, 73.852],
      [18.528, 73.864],
      [18.518, 73.864],
    ];

    // Inside point
    expect(checkPointInPolygon([18.52048, 73.85679], polygon)).toBe(true);

    // Outside point (far away)
    expect(checkPointInPolygon([18.58000, 73.92000], polygon)).toBe(false);
  });

  it("detects impossible teleportation travel (> 200 km/h) between consecutive planter submissions", () => {
    const prev: PlanterTrajectoryPoint = {
      id: "P1",
      treeId: "TREE-001",
      planterId: "USR-001",
      coords: { latitude: 18.52048, longitude: 73.85679 },
      timestamp: "2026-09-25T08:00:00.000Z",
    };

    // 52 kilometers away in 4 minutes = 780 km/h
    const current: PlanterTrajectoryPoint = {
      id: "P2",
      treeId: "TREE-002",
      planterId: "USR-001",
      coords: { latitude: 18.92200, longitude: 73.85715 },
      timestamp: "2026-09-25T08:04:00.000Z",
    };

    const report = spatiotemporalConsistencyService.evaluateSpatiotemporalConsistency(current, prev);
    expect(report.kinematics.status).toBe("impossible_teleportation");
    expect(report.kinematics.speedKmh).toBeGreaterThan(500);
    expect(report.kinematics.isPlausible).toBe(false);
    expect(report.riskLevel).toBe("critical_spoofing");
    expect(report.activeViolations.some((v) => v.includes("Impossible Teleportation"))).toBe(true);
  });

  it("verifies normal walking speed between closely spaced tree plantings", () => {
    const prev: PlanterTrajectoryPoint = {
      id: "P1",
      treeId: "TREE-001",
      planterId: "USR-001",
      coords: { latitude: 18.52048, longitude: 73.85679 },
      timestamp: "2026-09-25T08:00:00.000Z",
    };

    // 50 meters away in 5 minutes = 0.6 km/h (normal walking speed)
    const current: PlanterTrajectoryPoint = {
      id: "P2",
      treeId: "TREE-002",
      planterId: "USR-001",
      coords: { latitude: 18.52085, longitude: 73.85715 },
      timestamp: "2026-09-25T08:05:00.000Z",
    };

    const report = spatiotemporalConsistencyService.evaluateSpatiotemporalConsistency(current, prev);
    expect(report.kinematics.status).toBe("walking_transit");
    expect(report.kinematics.speedKmh).toBeLessThan(5);
    expect(report.kinematics.isPlausible).toBe(true);
  });

  it("detects EXIF hardware clock drift exceeding 15 minutes", () => {
    const point: PlanterTrajectoryPoint = {
      id: "P3",
      treeId: "TREE-DRIFT",
      planterId: "USR-002",
      coords: { latitude: 18.52048, longitude: 73.85679 },
      timestamp: "2026-09-25T08:00:00.000Z",
      exifTimestamp: "2026-09-25T07:15:00.000Z", // 45 minute clock drift
    };

    const report = spatiotemporalConsistencyService.evaluateSpatiotemporalConsistency(point);
    expect(report.chronology.isClockSynchronized).toBe(false);
    expect(report.chronology.clockDriftSeconds).toBe(45 * 60);
    expect(report.activeViolations.some((v) => v.includes("Clock Drift"))).toBe(true);
  });

  it("allows auditors to adjudicate spatiotemporal reports and update status", () => {
    const reports = spatiotemporalConsistencyService.getAuditReports();
    expect(reports.length).toBeGreaterThan(0);

    const reportToAdjudicate = reports[0];
    const updated = spatiotemporalConsistencyService.adjudicateReport(
      reportToAdjudicate.id,
      "confirmed_spoofing_rejected",
      "Auditor confirmed GPS fake location generator usage.",
      "senior_auditor"
    );

    expect(updated.adjudicationStatus).toBe("confirmed_spoofing_rejected");
    expect(updated.adjudicationNotes).toBe("Auditor confirmed GPS fake location generator usage.");
    expect(updated.adjudicatedBy).toBe("senior_auditor");
  });
});
