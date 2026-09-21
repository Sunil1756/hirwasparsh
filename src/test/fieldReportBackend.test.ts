import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateFieldReportGeoTagging,
  isPointInPolygon,
  calculateGroundSurvivalRate,
  validateFieldReport,
  submitFieldSpotAuditReport,
  FieldReportInput,
} from "@/lib/fieldReportBackendService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-auditor-uuid-123" } },
          error: null,
        }),
      },
      from: vi.fn(),
    },
  };
});

describe("Field Report Backend — Geo-tagging & Coordinate Validation", () => {
  it("validates correct GPS coordinates within standard bounds", () => {
    const res = validateFieldReportGeoTagging({
      latitude: 18.5204,
      longitude: 73.8567,
      gpsAccuracyMeters: 4.5,
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("rejects invalid latitude and longitude out of range", () => {
    const res = validateFieldReportGeoTagging({
      latitude: 125.0, // > 90
      longitude: -195.0, // < -180
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(2);
    expect(res.errors[0]).toContain("latitude");
    expect(res.errors[1]).toContain("longitude");
  });

  it("rejects Null Island (0, 0) coordinates", () => {
    const res = validateFieldReportGeoTagging({
      latitude: 0.0,
      longitude: 0.0,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("Null Island"))).toBe(true);
  });

  it("adds warning for low GPS accuracy (> 50m)", () => {
    const res = validateFieldReportGeoTagging({
      latitude: 19.076,
      longitude: 72.8777,
      gpsAccuracyMeters: 75,
    });
    expect(res.isValid).toBe(true);
    expect(res.warnings.some((w) => w.includes("GPS accuracy is low"))).toBe(true);
  });

  it("verifies if coordinates are inside a plot boundary polygon via Ray-Casting", () => {
    const polygon: [number, number][] = [
      [18.0, 73.0],
      [18.0, 74.0],
      [19.0, 74.0],
      [19.0, 73.0],
    ];

    // Inside point
    expect(isPointInPolygon([18.5, 73.5], polygon)).toBe(true);

    // Outside point
    expect(isPointInPolygon([20.0, 75.0], polygon)).toBe(false);
  });
});

describe("Field Report Backend — Ground Survival Rate Calculation", () => {
  it("calculates 100% survival rate when all trees are living", () => {
    const rate = calculateGroundSurvivalRate({
      livingCount: 50,
      stressedCount: 0,
      deadCount: 0,
    });
    expect(rate).toBe(100);
  });

  it("calculates 0% survival rate when all trees are dead", () => {
    const rate = calculateGroundSurvivalRate({
      livingCount: 0,
      stressedCount: 0,
      deadCount: 20,
    });
    expect(rate).toBe(0);
  });

  it("weights stressed trees with 0.5 factor according to silvicultural standards", () => {
    // 8 living (8.0) + 2 stressed (1.0) = 9.0 out of 10 = 90%
    const rate = calculateGroundSurvivalRate({
      livingCount: 8,
      stressedCount: 2,
      deadCount: 0,
    });
    expect(rate).toBe(90);
  });

  it("handles zero total trees gracefully", () => {
    const rate = calculateGroundSurvivalRate({
      livingCount: 0,
      stressedCount: 0,
      deadCount: 0,
    });
    expect(rate).toBe(0);
  });
});

describe("Field Report Backend — Payload Validation", () => {
  const baseValidInput: FieldReportInput = {
    projectId: "proj-12345",
    projectName: "Sahyadri Afforestation Plot",
    auditorName: "Ranger Sunil Patil",
    latitude: 18.5204,
    longitude: 73.8567,
    totalAudited: 10,
    livingCount: 8,
    stressedCount: 1,
    deadCount: 1,
    notes: "Regular 5% stratified random sample audit conducted under clear weather.",
    capturedAt: new Date().toISOString(),
  };

  it("passes validation for a fully valid field report", () => {
    const res = validateFieldReport(baseValidInput);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.calculatedSurvivalRatePct).toBe(85); // (8 + 0.5) / 10 = 85%
  });

  it("fails validation when tree count sum does not match totalAudited", () => {
    const invalidInput: FieldReportInput = {
      ...baseValidInput,
      totalAudited: 10,
      livingCount: 5,
      stressedCount: 1,
      deadCount: 2, // 5 + 1 + 2 = 8 !== 10
    };
    const res = validateFieldReport(invalidInput);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("Tree count mismatch"))).toBe(true);
  });

  it("fails validation when auditor name is missing", () => {
    const invalidInput: FieldReportInput = {
      ...baseValidInput,
      auditorName: "",
    };
    const res = validateFieldReport(invalidInput);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("Auditor / Forest Ranger name is required"))).toBe(true);
  });

  it("fails validation when timestamp is in the future", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const invalidInput: FieldReportInput = {
      ...baseValidInput,
      capturedAt: futureDate,
    };
    const res = validateFieldReport(invalidInput);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("future"))).toBe(true);
  });
});

describe("Field Report Backend — Supabase Database Persistence & Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully persists field report to Supabase project_evidence and check_ins tables", async () => {
    const mockInsertEvidence = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "evidence-record-999" },
          error: null,
        }),
      }),
    });

    const mockInsertCheckIns = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockUpdateProject = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "project_evidence") {
        return { insert: mockInsertEvidence } as any;
      }
      if (table === "check_ins") {
        return { insert: mockInsertCheckIns } as any;
      }
      if (table === "plantation_projects") {
        return { update: mockUpdateProject } as any;
      }
      return {} as any;
    });

    const input: FieldReportInput = {
      projectId: "proj-abc-789",
      projectName: "Western Ghats Corridor",
      auditorId: "auditor-001",
      auditorName: "Ranger Rohit Patil",
      latitude: 19.1234,
      longitude: 73.5678,
      totalAudited: 2,
      livingCount: 2,
      stressedCount: 0,
      deadCount: 0,
      notes: "Sample verified in good condition.",
      sampleItems: [
        {
          sample_id: "SMP-001",
          tree_id: "tree-uuid-1",
          species: "Neem",
          actual_lat: 19.1234,
          actual_lng: 73.5678,
          status: "alive",
          measured_height_cm: 65,
          measured_dbh_mm: 14,
        },
        {
          sample_id: "SMP-002",
          tree_id: "tree-uuid-2",
          species: "Teak",
          actual_lat: 19.1235,
          actual_lng: 73.5679,
          status: "alive",
          measured_height_cm: 70,
          measured_dbh_mm: 16,
        },
      ],
    };

    const res = await submitFieldSpotAuditReport(input);

    expect(res.success).toBe(true);
    expect(res.evidenceId).toBe("evidence-record-999");
    expect(res.survivalRatePct).toBe(100);
    expect(res.savedToDatabase).toBe(true);
    expect(res.checkInsCreatedCount).toBe(2);
    expect(mockInsertEvidence).toHaveBeenCalled();
    expect(mockInsertCheckIns).toHaveBeenCalled();
  });

  it("handles stressed saplings correctly in database submission with weighted survival rate", async () => {
    const mockInsertEvidence = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "evidence-stressed-555" },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "project_evidence") {
        return { insert: mockInsertEvidence } as any;
      }
      return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) } as any;
    });

    const input: FieldReportInput = {
      projectId: "proj-stressed-123",
      projectName: "Agroforestry Belt",
      auditorName: "Ranger Ananya Deshmukh",
      latitude: 18.5204,
      longitude: 73.8567,
      totalAudited: 10,
      livingCount: 8,
      stressedCount: 2,
      deadCount: 0,
      photoUrl: "https://supabase.co/storage/v1/object/public/treebank/audit-sample-photo.jpg",
      notes: "Moderate moisture stress observed on 2 saplings. Drip irrigation requested.",
    };

    const res = await submitFieldSpotAuditReport(input);

    expect(res.success).toBe(true);
    expect(res.evidenceId).toBe("evidence-stressed-555");
    expect(res.survivalRatePct).toBe(90); // (8 + 0.5 * 2) / 10 = 90%
    expect(res.savedToDatabase).toBe(true);
    expect(mockInsertEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "proj-stressed-123",
        evidence_type: "survival",
        survival_percent: 90,
        photo_url: "https://supabase.co/storage/v1/object/public/treebank/audit-sample-photo.jpg",
      })
    );
  });

  it("safely enqueues report to offline field queue when database call fails", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "project_evidence") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Network connection lost in remote forest" },
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const input: FieldReportInput = {
      projectId: "proj-remote-123",
      auditorName: "Ranger Devendra",
      latitude: 19.5,
      longitude: 74.2,
      totalAudited: 5,
      livingCount: 5,
      stressedCount: 0,
      deadCount: 0,
    };

    const res = await submitFieldSpotAuditReport(input);

    expect(res.success).toBe(true);
    expect(res.savedToDatabase).toBe(false);
    expect(res.queuedForOfflineSync).toBe(true);
    expect(res.message).toContain("offline field queue");
  });

  it("updates public.trees survival_status and public.plots when plotId is provided", async () => {
    const mockInsertEvidence = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "evidence-plot-101" },
          error: null,
        }),
      }),
    });

    const mockInsertCheckIns = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateProject = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const mockUpdateTree = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const mockUpdatePlot = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "project_evidence") return { insert: mockInsertEvidence } as any;
      if (table === "check_ins") return { insert: mockInsertCheckIns } as any;
      if (table === "plantation_projects") return { update: mockUpdateProject } as any;
      if (table === "trees") return { update: mockUpdateTree } as any;
      if (table === "plots") return { update: mockUpdatePlot } as any;
      return {} as any;
    });

    const input: FieldReportInput = {
      projectId: "proj-plot-101",
      plotId: "plot-uuid-777",
      auditorName: "Ranger Vikram",
      latitude: 19.2,
      longitude: 73.6,
      totalAudited: 3,
      livingCount: 2,
      stressedCount: 1,
      deadCount: 0,
      sampleItems: [
        {
          sample_id: "SMP-1",
          tree_id: "tree-1",
          species: "Neem",
          actual_lat: 19.2,
          actual_lng: 73.6,
          status: "alive",
          measured_height_cm: 60,
        },
        {
          sample_id: "SMP-2",
          tree_id: "tree-2",
          species: "Neem",
          actual_lat: 19.21,
          actual_lng: 73.61,
          status: "stressed",
          measured_height_cm: 50,
        },
      ],
    };

    const res = await submitFieldSpotAuditReport(input);

    expect(res.success).toBe(true);
    expect(res.savedToDatabase).toBe(true);
    expect(res.survivalRatePct).toBe(83.3); // (2 + 0.5 * 1) / 3 = 2.5 / 3 = 83.3%
    expect(mockUpdateTree).toHaveBeenCalled();
    expect(mockUpdatePlot).toHaveBeenCalledWith(
      expect.objectContaining({
        verified_survival_rate_pct: 83.3,
      })
    );
  });

  it("drains and synchronizes queued offline field reports when connectivity returns", async () => {
    const {
      enqueueOfflineFieldReport,
      getQueuedOfflineFieldReportsCount,
      syncQueuedOfflineFieldReports,
    } = await import("@/lib/fieldReportBackendService");

    const offlineInput: FieldReportInput = {
      projectId: "proj-offline-sync",
      auditorName: "Ranger Sandeep",
      latitude: 19.0,
      longitude: 73.0,
      totalAudited: 4,
      livingCount: 4,
      stressedCount: 0,
      deadCount: 0,
    };

    enqueueOfflineFieldReport(offlineInput);
    expect(getQueuedOfflineFieldReportsCount()).toBeGreaterThan(0);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "project_evidence") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "evidence-synced-123" },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) } as any;
    });

    const syncResult = await syncQueuedOfflineFieldReports();
    expect(syncResult.syncedCount).toBeGreaterThan(0);
    expect(getQueuedOfflineFieldReportsCount()).toBe(0);
  });
});

