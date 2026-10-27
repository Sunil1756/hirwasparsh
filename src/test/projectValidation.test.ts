import { describe, it, expect } from "vitest";
import {
  validateProjectCreation,
  validateBoundaryCoordinates,
  checkDuplicateProject,
  haversineDistanceMeters,
  detectGibberishText,
  validateTerrestrialCoordinates,
} from "../lib/projectValidation";
import { auditBaselineNdviSpectral, evaluateProjectVerification } from "../lib/projectVerification";

describe("Phase 1: Project Creation Validation Engine", () => {
  const validBase = {
    name: "Sahyadri Native Reforestation",
    target_trees: 500,
    project_type: "reforestation",
    location_name: "Pune, Maharashtra",
    centroid_latitude: 18.5204,
    centroid_longitude: 73.8567,
    species_list: ["Neem", "Jamun", "Peepal"],
    start_date: "2026-06-01",
  };

  it("approves valid canonical project creation input", () => {
    const res = validateProjectCreation(validBase);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.sanitized?.name).toBe("Sahyadri Native Reforestation");
    expect(res.sanitized?.target_trees).toBe(500);
  });

  it("strictly rejects 0 target trees (zero-tree project creation blocked)", () => {
    const res = validateProjectCreation({
      ...validBase,
      target_trees: 0,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("at least 10"))).toBe(true);
  });

  it("strictly rejects negative target trees", () => {
    const res = validateProjectCreation({
      ...validBase,
      target_trees: -150,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("at least 10"))).toBe(true);
  });

  it("rejects non-integer target tree counts", () => {
    const res = validateProjectCreation({
      ...validBase,
      target_trees: 100.5,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("integer"))).toBe(true);
  });

  it("rejects impossibly large tree counts (> 10,000,000)", () => {
    const res = validateProjectCreation({
      ...validBase,
      target_trees: 50_000_000,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("maximum allowable limit"))).toBe(true);
  });

  it("rejects project names shorter than 3 characters or whitespace-only", () => {
    const res1 = validateProjectCreation({ ...validBase, name: "  " });
    expect(res1.isValid).toBe(false);

    const res2 = validateProjectCreation({ ...validBase, name: "AB" });
    expect(res2.isValid).toBe(false);
  });

  it("rejects invalid coordinate ranges", () => {
    const badLat = validateProjectCreation({
      ...validBase,
      centroid_latitude: 95.0, // Invalid latitude
    });
    expect(badLat.isValid).toBe(false);

    const badLng = validateProjectCreation({
      ...validBase,
      centroid_longitude: 195.0, // Invalid longitude
    });
    expect(badLng.isValid).toBe(false);
  });

  it("rejects impossible start dates (before 1900 or far in the future)", () => {
    const ancient = validateProjectCreation({
      ...validBase,
      start_date: "1850-01-01",
    });
    expect(ancient.isValid).toBe(false);

    const farFuture = validateProjectCreation({
      ...validBase,
      start_date: "2099-01-01",
    });
    expect(farFuture.isValid).toBe(false);
  });
});

describe("Phase 1: Geospatial Boundary Validation", () => {
  it("approves valid polygon boundary with >= 3 distinct coordinates", () => {
    const boundary = [
      { lat: 18.5204, lng: 73.8567 },
      { lat: 18.5220, lng: 73.8580 },
      { lat: 18.5210, lng: 73.8610 },
      { lat: 18.5190, lng: 73.8590 },
    ];
    const res = validateBoundaryCoordinates(boundary);
    expect(res.isValid).toBe(true);
    expect(res.centroid).toBeDefined();
    expect(res.centroid?.[0]).toBeCloseTo(18.52, 1);
  });

  it("rejects boundaries with fewer than 3 vertices", () => {
    const line = [
      { lat: 18.5204, lng: 73.8567 },
      { lat: 18.5220, lng: 73.8580 },
    ];
    const res = validateBoundaryCoordinates(line);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("at least 3");
  });

  it("rejects degenerate polygons where all vertices are the same point", () => {
    const degenerate = [
      { lat: 18.5204, lng: 73.8567 },
      { lat: 18.5204, lng: 73.8567 },
      { lat: 18.5204, lng: 73.8567 },
    ];
    const res = validateBoundaryCoordinates(degenerate);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("identical points"))).toBe(true);
  });
});

describe("Phase 1: Duplicate Project Prevention", () => {
  const existingList = [
    {
      id: "proj-1",
      name: "Mahabaleshwar Native Grove",
      centroid_latitude: 17.9237,
      centroid_longitude: 73.6586,
    },
    {
      id: "proj-2",
      name: "Nashik Vineyard Agroforestry",
      centroid_latitude: 20.0,
      centroid_longitude: 73.78,
    },
  ];

  it("detects exact duplicate project names", () => {
    const dup = checkDuplicateProject({
      projectName: "Mahabaleshwar Native Grove",
      existingProjects: existingList,
    });
    expect(dup.isDuplicate).toBe(true);
    expect(dup.duplicateReason).toContain("already exists");
  });

  it("detects duplicate project with normalized case and whitespace", () => {
    const dup = checkDuplicateProject({
      projectName: "  mahabaleshwar native grove  ",
      existingProjects: existingList,
    });
    expect(dup.isDuplicate).toBe(true);
  });

  it("allows distinct project names with separate coordinates", () => {
    const distinct = checkDuplicateProject({
      projectName: "Ratnagiri Coastal Mangrove Belt",
      centroidLat: 16.99,
      centroidLng: 73.30,
      existingProjects: existingList,
    });
    expect(distinct.isDuplicate).toBe(false);
  });

  it("calculates accurate Haversine spatial distance between coordinates", () => {
    // Distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567) is approx 118-120 km
    const dist = haversineDistanceMeters(19.076, 72.8777, 18.5204, 73.8567);
    expect(dist / 1000).toBeGreaterThan(110);
    expect(dist / 1000).toBeLessThan(130);
  });
});

describe("Phase 1: Purge of Simulated NDVI & Truth-in-Reporting", () => {
  const boundary: [number, number][] = [
    [18.5204, 73.8567],
    [18.5220, 73.8580],
    [18.5210, 73.8610],
  ];

  it("never synthesizes fake Math.sin NDVI hash when satellite data is missing", () => {
    const res = auditBaselineNdviSpectral({
      boundary,
      speciesList: ["Neem"],
      realBaselineNdvi: undefined, // Satellite not yet ingested
    });

    expect(res.isSatelliteVerified).toBe(false);
    expect(res.baselineNdvi).toBe(0);
    expect(res.carbonEligibility).toBe("Pending Overpass");
    expect(res.check.metric).toContain("Pending Satellite Ingestion");
    expect(res.check.title).toContain("Pending");
  });

  it("strictly uses real satellite telemetry when provided", () => {
    const res = auditBaselineNdviSpectral({
      boundary,
      speciesList: ["Neem"],
      realBaselineNdvi: 0.28,
    });

    expect(res.isSatelliteVerified).toBe(true);
    expect(res.baselineNdvi).toBe(0.28);
    expect(res.carbonEligibility).toBe("Moderate (Verified)");
    expect(res.check.metric).toContain("0.28 (Satellite Verified)");
    expect(res.check.details).not.toContain("Gold Standard / Verra"); // Purged unverified marketing claims
  });

  it("includes honest provenance badge in master project evaluation report", () => {
    const report = evaluateProjectVerification({
      projectName: "Kolhapur Afforestation",
      organizationName: "Sahyadri Bio Org",
      organizationType: "ngo",
      locationName: "Kolhapur",
      boundary,
      targetTrees: 300,
      speciesList: ["Neem"],
      realBaselineNdvi: null, // Pending satellite ingest
    });

    expect(report.isSatelliteVerified).toBe(false);
    expect(report.provenanceBadge).toContain("Pending Satellite Overpass");
    expect(report.metricName).toBe("Pre-Planting Readiness Score");
    expect(report.overallScore).toBeLessThanOrEqual(40); // Honest pre-planting cap
  });
});

describe("Gate 1: Anti-Gibberish & Land Sanity Validator", () => {
  it("strictly rejects repeating cyclical gibberish like 'dwedwedw'", () => {
    const res = detectGibberishText("dwedwedw", "Project Name");
    expect(res.isValid).toBe(false);
    expect(res.error).toBeDefined();

    const projRes = validateProjectCreation({
      name: "dwedwedw",
      target_trees: 500,
      location_name: "Pune",
      centroid_latitude: 18.5204,
      centroid_longitude: 73.8567,
    });
    expect(projRes.isValid).toBe(false);
    expect(projRes.errors.some((e) => e.toLowerCase().includes("repeating") || e.toLowerCase().includes("keyboard") || e.toLowerCase().includes("gibberish") || e.toLowerCase().includes("diversity"))).toBe(true);
  });

  it("strictly rejects keyboard quadrant smash locations like 'ddefdewfwf'", () => {
    const res = detectGibberishText("ddefdewfwf", "Location Name");
    expect(res.isValid).toBe(false);

    const projRes = validateProjectCreation({
      name: "Solapur Agroforestry Initiative",
      target_trees: 500,
      location_name: "ddefdewfwf",
      centroid_latitude: 17.674,
      centroid_longitude: 75.927,
    });
    expect(projRes.isValid).toBe(false);
    expect(projRes.errors.some((e) => e.toLowerCase().includes("location"))).toBe(true);
  });

  it("rejects horizontal keyboard row mash patterns ('asdfghjk', 'zxcvbnm')", () => {
    expect(detectGibberishText("asdfghjk").isValid).toBe(false);
    expect(detectGibberishText("zxcvbnm").isValid).toBe(false);
    expect(detectGibberishText("qwertyui").isValid).toBe(false);
  });

  it("rejects synthetic mock and test keywords ('test project', 'dummy plot', 'fake demo')", () => {
    expect(detectGibberishText("test project").isValid).toBe(false);
    expect(detectGibberishText("dummy plantation").isValid).toBe(false);
    expect(detectGibberishText("fake woodland").isValid).toBe(false);
  });

  it("approves genuine projects and authentic location names", () => {
    expect(detectGibberishText("Sahyadri Bio-Reserve Afforestation").isValid).toBe(true);
    expect(detectGibberishText("Solapur Agroforestry Project").isValid).toBe(true);
    expect(detectGibberishText("Pune Eco Research Site").isValid).toBe(true);
    expect(detectGibberishText("Nashik Green Belt").isValid).toBe(true);
    expect(detectGibberishText("Nagpur Citrus Agroforestry").isValid).toBe(true);
  });

  it("strictly rejects coordinates at Null Island (0, 0)", () => {
    const terr = validateTerrestrialCoordinates(0, 0);
    expect(terr.isValid).toBe(false);
    expect(terr.error).toContain("Null Island");
  });

  it("strictly rejects coordinates outside India sovereign territory", () => {
    // London: 51.5074° N, 0.1278° W
    const london = validateTerrestrialCoordinates(51.5074, -0.1278);
    expect(london.isValid).toBe(false);
    expect(london.error).toContain("outside India");

    // Indian Ocean south of tip: 2.0° N, 77.0° E
    const ocean = validateTerrestrialCoordinates(2.0, 77.0);
    expect(ocean.isValid).toBe(false);
    expect(ocean.error).toContain("Indian Ocean");
  });

  it("approves valid Maharashtra and Indian terrestrial coordinates", () => {
    // Solapur: 17.6740, 75.9270
    const solapur = validateTerrestrialCoordinates(17.674, 75.927);
    expect(solapur.isValid).toBe(true);
    expect(solapur.isPrimaryRegion).toBe(true);

    // Pune: 18.5204, 73.8567
    const pune = validateTerrestrialCoordinates(18.5204, 73.8567);
    expect(pune.isValid).toBe(true);
    expect(pune.isPrimaryRegion).toBe(true);
  });
});

describe("Gate 2: Mandatory Cadastral Boundary & Pre-Audit State Machine", () => {
  it("rejects project creation without boundary when required for agroforestry/reforestation", () => {
    const boundaryCheck = validateBoundaryCoordinates([]);
    expect(boundaryCheck.isValid).toBe(false);
    expect(boundaryCheck.errors[0]).toContain("at least 3");
  });

  it("calculates exact area and centroid for valid cadastral plot", () => {
    // Solapur parcel
    const boundary = [
      { lat: 17.6745, lng: 75.9262 },
      { lat: 17.6744, lng: 75.9277 },
      { lat: 17.6736, lng: 75.9276 },
      { lat: 17.6736, lng: 75.9264 },
    ];
    const res = validateBoundaryCoordinates(boundary);
    expect(res.isValid).toBe(true);
    expect(res.centroid).toBeDefined();
    expect(res.centroid?.[0]).toBeCloseTo(17.674, 2);
    expect(res.centroid?.[1]).toBeCloseTo(75.927, 2);
  });
});
