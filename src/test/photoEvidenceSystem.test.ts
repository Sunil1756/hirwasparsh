/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 17
 * Automated Unit & Integration Test Suite for Photo Evidence Subsystem
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  photoEvidenceService,
  PhotoEvidenceService,
} from "../services/photoEvidenceService";
import { supabase } from "../integrations/supabase/client";
import exifr from "exifr";

// Mock Supabase client
vi.mock("../integrations/supabase/client", () => {
  return {
    supabase: {
      storage: {
        from: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

// Mock exifr
vi.mock("exifr", () => {
  return {
    default: {
      parse: vi.fn(),
      gps: vi.fn(),
    },
  };
});

// Mock image processing utilities
vi.mock("../lib/imageProcessing", () => {
  return {
    compressImage: vi.fn().mockImplementation(async (file: File) => file),
    sha256File: vi.fn().mockResolvedValue("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
  };
});

// Mock perceptual hash
vi.mock("../lib/perceptualHash", () => {
  return {
    computeImageDHash: vi.fn().mockResolvedValue("dhash_8a9b7c6d5e4f3a2b"),
  };
});

describe("Phase 4 Task 17 — Photo Evidence System Test Suite", () => {
  let service: PhotoEvidenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PhotoEvidenceService();
  });

  describe("1. Image Validation & Payload Constraints", () => {
    it("accepts a standard valid JPEG photo within size limits", async () => {
      (exifr.parse as any).mockResolvedValue({
        DateTimeOriginal: new Date().toISOString(),
        Make: "Samsung",
        Model: "Galaxy S24",
      });

      const validBlob = new File([new ArrayBuffer(50 * 1024)], "tree.jpg", {
        type: "image/jpeg",
      });

      const result = await service.validateImage(validBlob);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.mimeType).toBe("image/jpeg");
      expect(result.metadata.fileSizeBytes).toBe(50 * 1024);
      expect(result.metadata.exif.make).toBe("Samsung");
    });

    it("rejects files exceeding the 15MB max size limit", async () => {
      const oversizedBlob = new File([new ArrayBuffer(16 * 1024 * 1024)], "giant_photo.jpg", {
        type: "image/jpeg",
      });

      const result = await service.validateImage(oversizedBlob);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum limit of 15MB");
    });

    it("rejects corrupt or empty files below 5KB", async () => {
      const tinyBlob = new File([new ArrayBuffer(1024)], "corrupt.jpg", {
        type: "image/jpeg",
      });

      const result = await service.validateImage(tinyBlob);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("is too small or corrupt");
    });

    it("rejects unauthorized and dangerous MIME types", async () => {
      const execBlob = new File([new ArrayBuffer(20 * 1024)], "script.exe", {
        type: "application/x-msdownload",
      });

      const result = await service.validateImage(execBlob);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("is unsupported");
    });
  });

  describe("2. EXIF Metadata & Geotag Extraction", () => {
    it("extracts GPS coordinates, altitude, and capture timestamp", async () => {
      const sampleDate = new Date(Date.now() - 3600 * 1000).toISOString();
      (exifr.parse as any).mockResolvedValue({
        DateTimeOriginal: sampleDate,
        latitude: 18.52043,
        longitude: 73.85674,
        altitude: 560,
        Make: "Apple",
        Model: "iPhone 15 Pro",
      });

      const photoFile = new File([new ArrayBuffer(30 * 1024)], "planted_tree.jpg", {
        type: "image/jpeg",
      });

      const result = await service.validateImage(photoFile);
      expect(result.isValid).toBe(true);
      expect(result.metadata.exif.latitude).toBeCloseTo(18.52043, 4);
      expect(result.metadata.exif.longitude).toBeCloseTo(73.85674, 4);
      expect(result.metadata.exif.altitudeMeters).toBe(560);
      expect(result.metadata.exif.make).toBe("Apple");
      expect(result.metadata.exif.model).toBe("iPhone 15 Pro");
    });

    it("generates warning when photo capture timestamp is older than threshold", async () => {
      const oldDate = new Date(Date.now() - 100 * 3600 * 1000).toISOString(); // 100 hours old
      (exifr.parse as any).mockResolvedValue({
        DateTimeOriginal: oldDate,
      });

      const photoFile = new File([new ArrayBuffer(30 * 1024)], "old_photo.jpg", {
        type: "image/jpeg",
      });

      const result = await service.validateImage(photoFile, { maxExifAgeHours: 72 });
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes("hours ago"))).toBe(true);
    });
  });

  describe("3. Cryptographic and Perceptual Fingerprinting", () => {
    it("computes SHA-256 and perceptual dHash fingerprints", async () => {
      const photoFile = new File([new ArrayBuffer(20 * 1024)], "tree.jpg", {
        type: "image/jpeg",
      });

      const fingerprints = await service.computeFingerprints(photoFile);
      expect(fingerprints.sha256).toBeDefined();
      expect(fingerprints.sha256.length).toBe(64);
      expect(fingerprints.phash).toBeDefined();
    });
  });

  describe("4. Secure Cloud Storage Upload & Path Hierarchy", () => {
    it("routes tree photos to public 'treebank' bucket with structured hierarchy", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "trees/tree-001/after_photo_123.jpg" }, error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://treebank.hirwasparsh.internal/storage/v1/object/public/treebank/trees/tree-001/after_photo_123.jpg" },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "tree_photos") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "photo-uuid-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "trees") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return { insert: vi.fn(), update: vi.fn() };
      });

      (exifr.parse as any).mockResolvedValue({
        DateTimeOriginal: new Date().toISOString(),
      });

      const file = new File([new ArrayBuffer(25 * 1024)], "tree.jpg", { type: "image/jpeg" });
      const result = await service.uploadPhotoEvidence({
        file,
        evidenceType: "after_photo",
        treeId: "tree-001",
        uploaderId: "user-999",
      });

      expect(result.success).toBe(true);
      expect(result.storageBucket).toBe("treebank");
      expect(result.storagePath).toContain("trees/tree-001/after_photo_");
      expect(result.publicUrl).toContain("treebank/trees/tree-001");
      expect(mockUpload).toHaveBeenCalled();
    });

    it("routes selfie verification photos to private 'selfies' bucket", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "trees/tree-002/selfie_123.jpg" }, error: null });
      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      (supabase.from as any).mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "photo-selfie-1" }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      (exifr.parse as any).mockResolvedValue(null);

      const file = new File([new ArrayBuffer(25 * 1024)], "selfie.jpg", { type: "image/jpeg" });
      const result = await service.uploadPhotoEvidence({
        file,
        evidenceType: "selfie",
        treeId: "tree-002",
        uploaderId: "user-999",
      });

      expect(result.success).toBe(true);
      expect(result.storageBucket).toBe("selfies");
      expect(result.storagePath).toContain("trees/tree-002/selfie_");
    });
  });

  describe("5. Database Reference Indexing & Tree Synchronization", () => {
    it("persists record in tree_photos and updates trees primary photo fields", async () => {
      const mockPhotoInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "photo-db-rec" }, error: null }),
        }),
      });

      const mockTreeUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "path.jpg" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://treebank.hirwasparsh/photo.jpg" } }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "tree_photos") return { insert: mockPhotoInsert };
        if (table === "trees") return { update: mockTreeUpdate };
        return {};
      });

      (exifr.parse as any).mockResolvedValue({
        latitude: 19.0760,
        longitude: 72.8777,
      });

      const file = new File([new ArrayBuffer(30 * 1024)], "sapling.jpg", { type: "image/jpeg" });
      const result = await service.uploadPhotoEvidence({
        file,
        evidenceType: "planting_photo",
        treeId: "tree-777",
        uploaderId: "user-100",
        caption: "Planted under CSR project",
      });

      expect(result.success).toBe(true);
      expect(mockPhotoInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tree_id: "tree-777",
          uploader_id: "user-100",
          evidence_type: "planting_photo",
          caption: "Planted under CSR project",
          latitude: 19.0760,
          longitude: 72.8777,
          sha256_hash: expect.any(String),
          storage_bucket: "treebank",
        })
      );
      expect(mockTreeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_url: "https://treebank.hirwasparsh/photo.jpg",
          photo_hash: expect.any(String),
        })
      );
    });
  });

  describe("6. Real-Time Upload Progress Pipeline", () => {
    it("reports sequence of progress stages from 10% to 100%", async () => {
      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "path.jpg" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://treebank.url/p.jpg" } }),
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      const progressHistory: number[] = [];
      const stagesHistory: string[] = [];

      const file = new File([new ArrayBuffer(20 * 1024)], "progress_test.jpg", { type: "image/jpeg" });

      await service.uploadPhotoEvidence({
        file,
        evidenceType: "growth_photo",
        treeId: "tree-1",
        onProgress: (p) => {
          progressHistory.push(p.progressPercent);
          stagesHistory.push(p.stage);
        },
      });

      expect(progressHistory).toContain(10); // validating
      expect(progressHistory).toContain(25); // extracting_exif
      expect(progressHistory).toContain(45); // compressing
      expect(progressHistory).toContain(60); // hashing
      expect(progressHistory).toContain(85); // uploading
      expect(progressHistory).toContain(95); // persisting
      expect(progressHistory).toContain(100); // completed
      expect(stagesHistory).toContain("completed");
    });
  });

  describe("7. Error Handling & Storage Quota / Network Fault Resilience", () => {
    it("catches storage network exceptions and returns formatted error object", async () => {
      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: "Storage quota exceeded or network lost" } }),
      });

      const file = new File([new ArrayBuffer(20 * 1024)], "test.jpg", { type: "image/jpeg" });

      const result = await service.uploadPhotoEvidence({
        file,
        evidenceType: "growth_photo",
        treeId: "tree-error-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Storage bucket upload failed: Storage quota exceeded");
    });

    it("fetches tree photos and project evidence", async () => {
      const mockPhotos = [
        { id: "p1", tree_id: "t1", photo_url: "url1", evidence_type: "planting_photo" },
        { id: "p2", tree_id: "t1", photo_url: "url2", evidence_type: "growth_photo" },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
          }),
        }),
      });

      const treePhotos = await service.getTreePhotos("t1");
      expect(treePhotos).toHaveLength(2);
      expect(treePhotos[0].id).toBe("p1");

      const projectEvidence = await service.getProjectEvidence("p1");
      expect(projectEvidence).toHaveLength(2);
    });

    it("deletes photo evidence from storage and database", async () => {
      const mockRemove = vi.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.storage.from as any).mockReturnValue({
        remove: mockRemove,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { storage_bucket: "treebank", storage_path: "trees/t1/photo.jpg" },
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const deleted = await service.deletePhotoEvidence("photo-123");
      expect(deleted).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(["trees/t1/photo.jpg"]);
    });
  });
});
