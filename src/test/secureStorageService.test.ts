import { describe, it, expect, vi, beforeEach } from "vitest";
import { secureStorageService, STORAGE_LIMITS } from "../services/secureStorageService";
import { supabase } from "../integrations/supabase/client";

// Mock Supabase storage and database
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

describe("Phase 2 — Secure Cloud Storage Engine (Task 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. File Validation & Size Limits", () => {
    it("validates permissible MIME types and file sizes for each bucket", () => {
      expect(STORAGE_LIMITS.avatars.maxBytes).toBe(5 * 1024 * 1024);
      expect(STORAGE_LIMITS.treebank.maxBytes).toBe(15 * 1024 * 1024);
      expect(STORAGE_LIMITS.evidence.maxBytes).toBe(50 * 1024 * 1024);
      expect(STORAGE_LIMITS["project-documents"].maxBytes).toBe(50 * 1024 * 1024);
    });

    it("rejects files exceeding the bucket size limit", () => {
      const oversizedBlob = new Blob(["x".repeat(6 * 1024 * 1024)], { type: "image/jpeg" });
      const validation = secureStorageService.validateFile(oversizedBlob, "avatars");
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("exceeds the 5MB limit");
    });

    it("rejects unauthorized MIME types", () => {
      const exeBlob = new Blob(["binary data"], { type: "application/x-msdownload" });
      const validation = secureStorageService.validateFile(exeBlob, "treebank");
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("is not permitted");
    });
  });

  describe("2. Profile Avatars Upload & Database Synchronization", () => {
    it("uploads profile avatar and updates profiles table in database", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "profiles/user-1/avatar.jpg" }, error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://treebank.hirwasparsh.internal/storage/v1/object/public/avatars/profiles/user-1/avatar.jpg" },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const sampleFile = new File(["dummy avatar content"], "avatar.jpg", { type: "image/jpeg" });
      const result = await secureStorageService.uploadAvatar("user-1", sampleFile, true);

      expect(result.bucket).toBe("avatars");
      expect(result.path).toContain("profiles/user-1/avatar_");
      expect(result.url).toContain("avatars/profiles/user-1");
      expect(mockUpload).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ avatar_url: result.url })
      );
    });
  });

  describe("3. Tree Photos Upload & Audit Evidence Database Persistence", () => {
    it("uploads tree photo, inserts into tree_photos, and updates trees table", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "trees/tree-123/photo.jpg" }, error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://treebank.hirwasparsh.internal/storage/v1/object/public/treebank/trees/tree-123/photo.jpg" },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const mockPhotoInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "photo-rec-999" }, error: null }),
        }),
      });

      const mockTreeUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "tree_photos") {
          return { insert: mockPhotoInsert };
        }
        if (table === "trees") {
          return { update: mockTreeUpdate };
        }
        return { insert: vi.fn(), update: vi.fn() };
      });

      const sampleTreePhoto = new File(["dummy tree content"], "tree.jpg", { type: "image/jpeg" });
      const result = await secureStorageService.uploadTreePhoto("tree-123", sampleTreePhoto, {
        uploader_id: "user-1",
        caption: "Individual sapling geotagged",
        latitude: 18.5204,
        longitude: 73.8567,
      });

      expect(result.bucket).toBe("treebank");
      expect(result.path).toContain("trees/tree-123/tree_");
      expect(result.sha256_hash).toBeDefined();
      expect(result.db_record_id).toBe("photo-rec-999");
      expect(mockUpload).toHaveBeenCalled();
      expect(mockPhotoInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tree_id: "tree-123",
          uploader_id: "user-1",
          latitude: 18.5204,
          longitude: 73.8567,
          storage_bucket: "treebank",
        })
      );
      expect(mockTreeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ photo_url: result.url })
      );
    });
  });

  describe("4. Audit Evidence & Field Reports Persistence", () => {
    it("uploads field audit evidence to private storage bucket and creates database record", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "evidence/tree-123/growth_photo/1.jpg" }, error: null });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "ev-rec-888" }, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const evidenceFile = new File(["audit inspection photo"], "audit.jpg", { type: "image/jpeg" });
      const result = await secureStorageService.uploadEvidence("tree-123", evidenceFile, "growth_photo", {
        uploader_id: "auditor-1",
      });

      expect(result.bucket).toBe("evidence");
      expect(result.db_record_id).toBe("ev-rec-888");
      expect(mockUpload).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tree_id: "tree-123",
          uploader_id: "auditor-1",
          evidence_type: "growth_photo",
          storage_bucket: "evidence",
        })
      );
    });
  });

  describe("5. Project Documents (KML / PDF) Upload", () => {
    it("uploads project boundary KML documents and persists record", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: "projects/p-100/kml_boundary/bounds.kml" }, error: null });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "doc-rec-777" }, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const kmlFile = new File(["<kml>boundary data</kml>"], "bounds.kml", {
        type: "application/vnd.google-earth.kml+xml",
      });
      const result = await secureStorageService.uploadProjectDocument("p-100", kmlFile, "kml_boundary", {
        uploader_id: "manager-1",
      });

      expect(result.bucket).toBe("project-documents");
      expect(result.db_record_id).toBe("doc-rec-777");
      expect(mockUpload).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "p-100",
          uploader_id: "manager-1",
          storage_bucket: "project-documents",
        })
      );
    });
  });

  describe("6. Signed URL Generation & Deletion", () => {
    it("generates time-limited signed URL for private assets", async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.internal/evidence/tree-1/photo.jpg?token=secure_jwt_token" },
        error: null,
      });

      (supabase.storage.from as any).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const signedUrl = await secureStorageService.createSignedUrl("evidence", "evidence/tree-1/photo.jpg", 1800);
      expect(signedUrl).toContain("token=secure_jwt_token");
      expect(mockCreateSignedUrl).toHaveBeenCalledWith("evidence/tree-1/photo.jpg", 1800);
    });

    it("deletes stored files and removes database records upon request", async () => {
      const mockRemove = vi.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.storage.from as any).mockReturnValue({
        remove: mockRemove,
      });

      const mockDelete = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
      });

      const success = await secureStorageService.deleteFile("treebank", ["trees/tree-1/old.jpg"]);
      expect(success).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(["trees/tree-1/old.jpg"]);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
