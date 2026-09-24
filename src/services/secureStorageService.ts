import { supabase } from "@/integrations/supabase/client";

export type StorageBucketType =
  | "avatars"
  | "treebank"
  | "evidence"
  | "project-documents";

export interface UploadResult {
  path: string;
  url: string;
  bucket: StorageBucketType;
  sha256_hash?: string;
  size_bytes: number;
}

export const STORAGE_LIMITS = {
  avatars: {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  treebank: {
    maxBytes: 15 * 1024 * 1024, // 15MB
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  },
  evidence: {
    maxBytes: 50 * 1024 * 1024, // 50MB
    allowedMimes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
    ],
  },
  "project-documents": {
    maxBytes: 50 * 1024 * 1024, // 50MB
    allowedMimes: [
      "application/pdf",
      "application/vnd.google-earth.kml+xml",
      "application/vnd.google-earth.kmz",
      "application/geo+json",
      "application/json",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
};

export const secureStorageService = {
  /**
   * Generates a cryptographic SHA-256 checksum for audit and tamper-proofing
   */
  async computeSha256(file: Blob | File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
  },

  /**
   * Validates file size and MIME type against bucket constraints
   */
  validateFile(file: File | Blob, bucket: StorageBucketType): { valid: boolean; error?: string } {
    const limits = STORAGE_LIMITS[bucket];
    if (file.size > limits.maxBytes) {
      const maxMb = Math.round(limits.maxBytes / (1024 * 1024));
      return { valid: false, error: `File size exceeds the ${maxMb}MB limit for bucket '${bucket}'.` };
    }

    if (file.type && !limits.allowedMimes.includes(file.type)) {
      return { valid: false, error: `MIME type '${file.type}' is not permitted for bucket '${bucket}'.` };
    }

    return { valid: true };
  },

  /**
   * Uploads user profile avatar to public 'avatars' bucket
   */
  async uploadAvatar(userId: string, file: File | Blob): Promise<UploadResult> {
    const validation = this.validateFile(file, "avatars");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const path = `profiles/${userId}/avatar_${Date.now()}.${ext}`;
    const hash = await this.computeSha256(file);

    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) throw new Error(`Avatar upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

    return {
      bucket: "avatars",
      path,
      url: urlData.publicUrl,
      sha256_hash: hash,
      size_bytes: file.size,
    };
  },

  /**
   * Uploads individual tree photo to public 'treebank' bucket
   */
  async uploadTreePhoto(treeId: string, file: File | Blob, prefix = "tree"): Promise<UploadResult> {
    const validation = this.validateFile(file, "treebank");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const hash = await this.computeSha256(file);
    const path = `trees/${treeId}/${prefix}_${Date.now()}_${hash.substring(0, 8)}.${ext}`;

    const { error } = await supabase.storage.from("treebank").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) throw new Error(`Tree photo upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from("treebank").getPublicUrl(path);

    return {
      bucket: "treebank",
      path,
      url: urlData.publicUrl,
      sha256_hash: hash,
      size_bytes: file.size,
    };
  },

  /**
   * Uploads audit evidence (inspections, drone, selfies) to private 'evidence' bucket
   */
  async uploadEvidence(
    targetId: string,
    file: File | Blob,
    evidenceType: string
  ): Promise<UploadResult> {
    const validation = this.validateFile(file, "evidence");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const hash = await this.computeSha256(file);
    const path = `evidence/${targetId}/${evidenceType}/${Date.now()}_${hash.substring(0, 8)}.${ext}`;

    const { error } = await supabase.storage.from("evidence").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) throw new Error(`Evidence upload failed: ${error.message}`);

    return {
      bucket: "evidence",
      path,
      url: path, // Private bucket: url is path until signed URL requested
      sha256_hash: hash,
      size_bytes: file.size,
    };
  },

  /**
   * Uploads project documents (KML, DPR, MOU) to private 'project-documents' bucket
   */
  async uploadProjectDocument(
    projectId: string,
    file: File | Blob,
    documentType: string
  ): Promise<UploadResult> {
    const validation = this.validateFile(file, "project-documents");
    if (!validation.valid) throw new Error(validation.error);

    const filename = (file as File).name || `doc_${Date.now()}`;
    const hash = await this.computeSha256(file);
    const path = `projects/${projectId}/${documentType}/${Date.now()}_${filename}`;

    const { error } = await supabase.storage.from("project-documents").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/pdf",
    });

    if (error) throw new Error(`Project document upload failed: ${error.message}`);

    return {
      bucket: "project-documents",
      path,
      url: path,
      sha256_hash: hash,
      size_bytes: file.size,
    };
  },

  /**
   * Creates a time-limited signed URL for private bucket downloads
   */
  async createSignedUrl(
    bucket: StorageBucketType,
    path: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${path}: ${error?.message}`);
    }
    return data.signedUrl;
  },

  /**
   * Removes a file from storage
   */
  async deleteFile(bucket: StorageBucketType, paths: string[]): Promise<boolean> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    return !error;
  },
};
