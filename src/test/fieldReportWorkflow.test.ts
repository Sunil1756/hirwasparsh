import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processFieldReportSubmissionWorkflow,
  uploadFieldReportPhoto,
  validateExifVersusDeviceGps,
  calculateHaversineDistanceMeters,
  calculateGroundSurvivalRate,
  validateFieldReportGeoTagging,
  isPointInPolygon,
  FieldReportWorkflowInput,
  enqueueOfflineFieldReport,
  getQueuedOfflineFieldReportsCount,
  syncQueuedOfflineFieldReports,
} from "@/lib/fieldReportBackendService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase Client
vi.mock("@/integrations/supabase/client", () => {
  const insertMock = vi.fn();
  const selectMock = vi.fn();
  const singleMock = vi.fn();
  const eqMock = vi.fn();
  const updateMock = vi.fn();
  const orderMock = vi.fn();

  const storageUploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();

  return {
    supabase: {
      from: vi.fn((table: string) => {
        return {
          insert: vi.fn((data: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: `mock-evidence-${Date.now()}` }, error: null })),
            })),
            then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb),
          })),
          update: vi.fn((data: any) => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      }),
      storage: {
        from: vi.fn((bucket: string) => ({
          upload: vi.fn((path: string, file: any) =>
            Promise.resolve({
              data: { path },
              error: null,
            })
          ),
          getPublicUrl: vi.fn((path: string) => ({
            data: { publicUrl: `https://mock-supabase.storage/v1/object/public/${bucket}/${path}` },
          })),
        })),
      },
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-ranger-uuid-123" } } })),
      },
    },
  };
});

describe("Field Report Data Submission Workflow & Geo-Tagged Photo Uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Photo Upload & URL Generation", () => {
    it("successfully uploads photo blob and returns permanent public URL", async () => {
      const mockBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
      const res = await uploadFieldReportPhoto(mockBlob, "proj-western-ghats-01");

      expect(res.success).toBe(true);
      expect(res.storagePath).toContain("projects/proj-western-ghats-01/field-audits/");
      expect(res.publicUrl).toContain("https://mock-supabase.storage/v1/object/public/treebank/");
    });

    it("handles storage upload exceptions gracefully without crashing", async () => {
      const mockStorage = vi.spyOn(supabase.storage, "from").mockReturnValueOnce({
        upload: vi.fn(() => Promise.resolve({ data: null, error: { message: "Bucket quota exceeded" } })),
        getPublicUrl: vi.fn(),
      } as any);

      const mockBlob = new Blob(["bad-bytes"], { type: "image/jpeg" });
      const res = await uploadFieldReportPhoto(mockBlob, "proj-fail-01");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Bucket quota exceeded");
      expect(res.publicUrl).toBeNull();
    });
  });

  describe("2. EXIF vs Device GPS Anti-Spoofing Cross-Verification", () => {
    it("matches when EXIF coordinates and Device GPS coordinates are within 100 meters", () => {
      // 18.5204, 73.8567 vs 18.5206, 73.8568 (~25 meters apart)
      const res = validateExifVersusDeviceGps(18.5204, 73.8567, 18.5206, 73.8568);
      expect(res.status).toBe("matched");
      expect(res.isAcceptable).toBe(true);
      expect(res.distanceMeters).toBeLessThan(100);
      expect(res.message).toContain("High spatial fidelity");
    });

    it("flags drift warning when discrepancy is between 100m and 5km", () => {
      // ~500 meters apart
      const res = validateExifVersusDeviceGps(18.5204, 73.8567, 18.5245, 73.8580);
      expect(res.status).toBe("drift_warning");
      expect(res.isAcceptable).toBe(true);
      expect(res.distanceMeters).toBeGreaterThan(100);
      expect(res.distanceMeters).toBeLessThanOrEqual(5000);
    });

    it("rejects as fraud spoofing when photo EXIF is more than 5km away from device GPS", () => {
      // Pune (18.5204, 73.8567) vs Mumbai (19.0760, 72.8777) (~120km apart)
      const res = validateExifVersusDeviceGps(18.5204, 73.8567, 19.0760, 72.8777);
      expect(res.status).toBe("fraud_spoofing_rejected");
      expect(res.isAcceptable).toBe(false);
      expect(res.distanceMeters).toBeGreaterThan(5000);
      expect(res.message).toContain("Severe distance discrepancy");
    });

    it("falls back cleanly to device GPS when no EXIF tags exist", () => {
      const res = validateExifVersusDeviceGps(null, null, 18.5204, 73.8567);
      expect(res.status).toBe("no_exif");
      expect(res.isAcceptable).toBe(true);
      expect(res.message).toContain("No embedded EXIF GPS tags");
    });
  });

  describe("3. End-to-End Field Report Workflow Orchestration", () => {
    it("processes and submits a complete valid field audit report with photo and sample trees", async () => {
      const polygon: [number, number][] = [
        [18.51, 73.84],
        [18.53, 73.84],
        [18.53, 73.87],
        [18.51, 73.87],
      ];

      const input: FieldReportWorkflowInput = {
        projectId: "proj-maharashtra-native-01",
        projectName: "Western Ghats Native Preserve",
        organizationName: "Sahyadri Nisarga Mitra",
        auditorId: "ranger-uuid-456",
        auditorName: "Ranger Sunil Patil",
        auditorRole: "Senior Beat Forest Guard",
        plotId: "plot-sector-4b",
        latitude: 18.5204,
        longitude: 73.8567,
        gpsAccuracyMeters: 8,
        totalAudited: 20,
        livingCount: 16,
        stressedCount: 2,
        deadCount: 2,
        dominantSpecies: "Neem (Azadirachta indica)",
        averageHeightCm: 85,
        interventions: {
          dripRescue: true,
          bioMulch: true,
        },
        exifData: {
          lat: 18.5205,
          lng: 73.8568,
          hasGps: true,
        },
        photoFile: new Blob(["photo-data"], { type: "image/jpeg" }),
        plotBoundary: polygon,
        notes: "Healthy crown development observed across north-facing slope.",
      };

      const result = await processFieldReportSubmissionWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.savedToDatabase).toBe(true);
      // (16 living + 0.5 * 2 stressed) / 20 = 17 / 20 = 85.0%
      expect(result.survivalRatePct).toBe(85);
      expect(result.uploadedPhotoUrl).toContain("https://mock-supabase.storage/v1/object/public/treebank/");
      expect(result.exifValidation.status).toBe("matched");
      expect(result.validation.isValid).toBe(true);
    });

    it("rejects submission if photo EXIF location has severe spoofing discrepancy (>5km)", async () => {
      const input: FieldReportWorkflowInput = {
        projectId: "proj-maharashtra-native-01",
        auditorName: "Ranger Sunil Patil",
        latitude: 18.5204,
        longitude: 73.8567,
        totalAudited: 10,
        livingCount: 10,
        stressedCount: 0,
        deadCount: 0,
        exifData: {
          lat: 28.6139, // Delhi (~1200km away)
          lng: 77.2090,
          hasGps: true,
        },
      };

      const result = await processFieldReportSubmissionWorkflow(input);

      expect(result.success).toBe(false);
      expect(result.savedToDatabase).toBe(false);
      expect(result.exifValidation.status).toBe("fraud_spoofing_rejected");
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0]).toContain("Severe distance discrepancy");
    });

    it("rejects submission if tree counts do not balance (living + stressed + dead != totalAudited)", async () => {
      const input: FieldReportWorkflowInput = {
        projectId: "proj-maharashtra-native-01",
        auditorName: "Ranger Sunil Patil",
        latitude: 18.5204,
        longitude: 73.8567,
        totalAudited: 20,
        livingCount: 10,
        stressedCount: 2,
        deadCount: 2, // sum is 14, not 20
      };

      const result = await processFieldReportSubmissionWorkflow(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes("Tree count mismatch"))).toBe(true);
    });

    it("rejects Null Island coordinates (0, 0)", async () => {
      const input: FieldReportWorkflowInput = {
        projectId: "proj-maharashtra-native-01",
        auditorName: "Ranger Sunil Patil",
        latitude: 0,
        longitude: 0,
        totalAudited: 5,
        livingCount: 5,
        stressedCount: 0,
        deadCount: 0,
      };

      const result = await processFieldReportSubmissionWorkflow(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes("Null Island"))).toBe(true);
    });
  });

  describe("4. Offline Queue & Sync Replay", () => {
    it("enqueues report and allows counting and batch synchronization", async () => {
      const initialCount = getQueuedOfflineFieldReportsCount();

      enqueueOfflineFieldReport({
        projectId: "proj-offline-01",
        auditorName: "Ranger Offline Scout",
        latitude: 18.5204,
        longitude: 73.8567,
        totalAudited: 10,
        livingCount: 9,
        stressedCount: 1,
        deadCount: 0,
        notes: "Offline survey deep in remote valley.",
      });

      expect(getQueuedOfflineFieldReportsCount()).toBe(initialCount + 1);

      const syncResult = await syncQueuedOfflineFieldReports();
      expect(syncResult.syncedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
