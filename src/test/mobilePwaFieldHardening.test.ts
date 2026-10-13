import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enqueueOfflineTree,
  getOfflineTreeQueue,
  clearOfflineQueue,
  syncOfflineTreesWithSupabase,
} from "../lib/offlineSyncService";
import {
  offlineSyncManager,
  SyncQueueItem,
} from "../services/offlineSyncManager";
import {
  calculateGroundSurvivalRate,
  validateExifVersusDeviceGps,
  validateFieldReportGeoTagging,
  isPointInPolygon,
} from "../lib/fieldReportBackendService";
import { supabase } from "../integrations/supabase/client";

// Mock Supabase
vi.mock("../integrations/supabase/client", () => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  return {
    supabase: {
      from: vi.fn().mockImplementation((table: string) => ({
        insert: insertMock,
        select: selectMock,
      })),
    },
  };
});

// Polyfill localStorage in test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k in mockStorage) delete mockStorage[k];
  }),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Phase 7: Mobile/PWA Field Hardening & Offline Resilience", () => {
  beforeEach(() => {
    clearOfflineQueue();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("Offline Tree Enqueue & Anti-Hallucination Sync", () => {
    it("enqueues saplings locally when offline with complete spatial metadata", () => {
      const tree = enqueueOfflineTree({
        tree_name: "Sahyadri Teak 01",
        species: "Tectona grandis",
        location: "Plot A, Mahabaleshwar",
        latitude: 17.9234,
        longitude: 73.6582,
        height_cm: 65,
        plantation_date: "2026-10-14",
        notes: "Planted along contour bund",
      });

      expect(tree.localId).toContain("offline-");
      expect(tree.species).toBe("Tectona grandis");

      const queue = getOfflineTreeQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].tree_name).toBe("Sahyadri Teak 01");
    });

    it("syncs offline trees with Supabase strictly marking status as 'pending' with no fake ai_confidence", async () => {
      enqueueOfflineTree({
        tree_name: "Ratnagiri Mango 01",
        species: "Mangifera indica",
        location: "Sindhudurg Orchard",
        latitude: 16.5012,
        longitude: 73.4123,
        height_cm: 50,
        plantation_date: "2026-10-14",
      });

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: insertSpy,
      });

      const res = await syncOfflineTreesWithSupabase("user-ranger-101");

      expect(res.syncedCount).toBe(1);
      expect(res.failedCount).toBe(0);
      expect(insertSpy).toHaveBeenCalledTimes(1);

      const insertedPayload = insertSpy.mock.calls[0][0];
      // Scientific integrity assertions: MUST NOT auto-verify or inject fake scores
      expect(insertedPayload.verification_status).toBe("pending");
      expect(insertedPayload.admin_status).toBe("pending");
      expect(insertedPayload.ai_confidence).toBeNull();
      expect(insertedPayload.notes).toContain("Synced from Rural Offline Queue");
    });
  });

  describe("Unified Multi-Entity Offline Sync Manager", () => {
    it("manages priority queuing and persists multi-entity offline items", () => {
      offlineSyncManager.clearAll();

      const item = offlineSyncManager.enqueueItem({
        entityType: "tree",
        priority: 1,
        title: "Konkan Jamun Sapling",
        subtitle: "District Ratnagiri",
        payload: {
          species: "Syzygium cumini",
          latitude: 16.99,
          longitude: 73.30,
        },
      });

      expect(item.idempotencyKey).toBeTruthy();
      expect(item.syncStatus).toBe("pending");

      const queue = offlineSyncManager.getQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);
    });

    it("syncs unified tree item to Supabase without fake verified status", async () => {
      offlineSyncManager.clearAll();

      const item = offlineSyncManager.enqueueItem({
        entityType: "tree",
        priority: 1,
        title: "Gadchiroli Mahua",
        subtitle: "Eastern Vidarbha Plot",
        payload: {
          species: "Madhuca longifolia",
          latitude: 20.18,
          longitude: 80.00,
        },
      });

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: insertSpy,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const res = await offlineSyncManager.syncItem(item.localId);

      expect(res.success).toBe(true);
      expect(insertSpy).toHaveBeenCalledTimes(1);

      const payload = insertSpy.mock.calls[0][0];
      expect(payload.verification_status).toBe("pending");
      expect(payload.admin_status).toBe("pending");
      expect(payload.ai_confidence).toBeNull();
    });
  });

  describe("Ground-Truth Survival Rate Engine", () => {
    it("returns 0% when no trees are evaluated instead of claiming 100%", () => {
      const survivalRate = calculateGroundSurvivalRate({
        livingCount: 0,
        stressedCount: 0,
        deadCount: 0,
      });

      expect(survivalRate).toBe(0);
    });

    it("accurately weights stressed saplings at 0.5 silvicultural survival factor", () => {
      // 80 living (80) + 20 stressed (10) / 100 = 90%
      const rate = calculateGroundSurvivalRate({
        livingCount: 80,
        stressedCount: 20,
        deadCount: 0,
      });

      expect(rate).toBe(90.0);
    });

    it("accounts for confirmed mortality in observed survival denominator", () => {
      // 60 living (60) + 20 stressed (10) + 20 dead (0) / 100 = 70%
      const rate = calculateGroundSurvivalRate({
        livingCount: 60,
        stressedCount: 20,
        deadCount: 20,
      });

      expect(rate).toBe(70.0);
    });
  });

  describe("EXIF vs Device GPS Geofencing Anti-Spoofing", () => {
    it("accepts photo when EXIF GPS matches device GPS within 100m", () => {
      // Ratnagiri nursery GPS
      const res = validateExifVersusDeviceGps(16.9900, 73.3000, 16.9902, 73.3002);

      expect(res.status).toBe("matched");
      expect(res.isAcceptable).toBe(true);
      expect(res.distanceMeters).toBeLessThan(100);
    });

    it("issues drift warning when EXIF is within canopy margin (< 5000m)", () => {
      const res = validateExifVersusDeviceGps(16.9900, 73.3000, 16.9980, 73.3080);

      expect(res.status).toBe("drift_warning");
      expect(res.isAcceptable).toBe(true);
    });

    it("rejects photo with fraud spoofing error when distance exceeds 5km", () => {
      // Photo in Mumbai (19.0760, 72.8777) but device claimed in Pune (18.5204, 73.8567) ~120km away
      const res = validateExifVersusDeviceGps(19.0760, 72.8777, 18.5204, 73.8567);

      expect(res.status).toBe("fraud_spoofing_rejected");
      expect(res.isAcceptable).toBe(false);
      expect(res.distanceMeters).toBeGreaterThan(5000);
    });
  });

  describe("Geospatial Plot Polygon Containment", () => {
    // 4-point polygon around Mahabaleshwar forest block
    const plotPolygon: [number, number][] = [
      [17.9000, 73.6500],
      [17.9500, 73.6500],
      [17.9500, 73.7000],
      [17.9000, 73.7000],
    ];

    it("verifies point strictly inside plot boundary polygon", () => {
      const isInside = isPointInPolygon([17.9250, 73.6750], plotPolygon);
      expect(isInside).toBe(true);
    });

    it("flags point outside plot boundary polygon", () => {
      const isInside = isPointInPolygon([17.8000, 73.6000], plotPolygon);
      expect(isInside).toBe(false);
    });

    it("rejects Null Island coordinates (0, 0)", () => {
      const res = validateFieldReportGeoTagging({
        latitude: 0,
        longitude: 0,
        gpsAccuracyMeters: 5,
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("Null Island");
    });
  });
});
