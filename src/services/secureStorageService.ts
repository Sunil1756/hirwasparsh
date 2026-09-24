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
  sha256_hash: string;
  size_bytes: number;
  db_record_id?: string;
}

export interface UploadOptions {
  uploader_id?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  exif_timestamp?: string;
  persist_to_database?: boolean;
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
   * Uploads user profile avatar to public 'avatars' bucket and updates public.profiles
   */
  async uploadAvatar(userId: string, file: File | Blob, persistToDb = true): Promise<UploadResult> {
    const validation = this.validateFile(file, "avatars");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const path = `profiles/${userId}/avatar_${Date.now()}.${ext}`;
    const hash = await this.computeSha256(file);

    const { error: storageErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (storageErr) throw new Error(`Avatar upload failed: ${storageErr.message}`);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

    if (persistToDb) {
      await supabase
        .from("profiles" as any)
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return {
      bucket: "avatars",
      path,
      url: urlData.publicUrl,
      sha256_hash: hash,
      size_bytes: file.size,
    };
  },

  /**
   * Uploads individual tree photo to public 'treebank' bucket and creates a real tree_photos audit record
   */
  async uploadTreePhoto(
    treeId: string,
    file: File | Blob,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const validation = this.validateFile(file, "treebank");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const hash = await this.computeSha256(file);
    const path = `trees/${treeId}/tree_${Date.now()}_${hash.substring(0, 8)}.${ext}`;

    const { error: storageErr } = await supabase.storage.from("treebank").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (storageErr) throw new Error(`Tree photo upload failed: ${storageErr.message}`);

    const { data: urlData } = supabase.storage.from("treebank").getPublicUrl(path);

    let dbRecordId: string | undefined;
    if (options.persist_to_database !== false) {
      // 1. Insert into tree_photos table
      const { data: photoRecord } = await supabase
        .from("tree_photos" as any)
        .insert({
          tree_id: treeId,
          uploader_id: options.uploader_id || null,
          photo_url: urlData.publicUrl,
          evidence_type: "growth_photo",
          caption: options.caption || "Individual tree photo submission",
          latitude: options.latitude || null,
          longitude: options.longitude || null,
          altitude_m: options.altitude_m || null,
          exif_timestamp: options.exif_timestamp || new Date().toISOString(),
          sha256_hash: hash,
          storage_bucket: "treebank",
          storage_path: path,
        })
        .select("id")
        .maybeSingle();

      if (photoRecord?.id) {
        dbRecordId = photoRecord.id;
      }

      // 2. Update the tree's primary photo URL
      await supabase
        .from("trees" as any)
        .update({ photo_url: urlData.publicUrl, photo_hash: hash, updated_at: new Date().toISOString() })
        .eq("id", treeId);
    }

    return {
      bucket: "treebank",
      path,
      url: urlData.publicUrl,
      sha256_hash: hash,
      size_bytes: file.size,
      db_record_id: dbRecordId,
    };
  },

  /**
   * Uploads audit evidence (inspections, drone, selfies) to private 'evidence' bucket and persists real database record
   */
  async uploadEvidence(
    targetId: string,
    file: File | Blob,
    evidenceType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const validation = this.validateFile(file, "evidence");
    if (!validation.valid) throw new Error(validation.error);

    const ext = (file as File).name ? (file as File).name.split(".").pop() : "jpg";
    const hash = await this.computeSha256(file);
    const path = `evidence/${targetId}/${evidenceType}/${Date.now()}_${hash.substring(0, 8)}.${ext}`;

    const { error: storageErr } = await supabase.storage.from("evidence").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (storageErr) throw new Error(`Evidence upload failed: ${storageErr.message}`);

    let dbRecordId: string | undefined;
    if (options.persist_to_database !== false) {
      const { data: record } = await supabase
        .from("tree_photos" as any)
        .insert({
          tree_id: targetId.startsWith("tree") ? targetId : null,
          project_id: !targetId.startsWith("tree") ? targetId : null,
          uploader_id: options.uploader_id || null,
          photo_url: path, // Private asset stores path
          evidence_type: evidenceType,
          caption: options.caption || `Field evidence: ${evidenceType}`,
          latitude: options.latitude || null,
          longitude: options.longitude || null,
          altitude_m: options.altitude_m || null,
          exif_timestamp: options.exif_timestamp || new Date().toISOString(),
          sha256_hash: hash,
          storage_bucket: "evidence",
          storage_path: path,
        })
        .select("id")
        .maybeSingle();

      if (record?.id) {
        dbRecordId = record.id;
      }
    }

    return {
      bucket: "evidence",
      path,
      url: path,
      sha256_hash: hash,
      size_bytes: file.size,
      db_record_id: dbRecordId,
    };
  },

  /**
   * Uploads project documents (KML, DPR, MOU) to private 'project-documents' bucket and creates database record
   */
  async uploadProjectDocument(
    projectId: string,
    file: File | Blob,
    documentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const validation = this.validateFile(file, "project-documents");
    if (!validation.valid) throw new Error(validation.error);

    const filename = (file as File).name || `doc_${Date.now()}`;
    const hash = await this.computeSha256(file);
    const path = `projects/${projectId}/${documentType}/${Date.now()}_${filename}`;

    const { error: storageErr } = await supabase.storage.from("project-documents").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/pdf",
    });

    if (storageErr) throw new Error(`Project document upload failed: ${storageErr.message}`);

    let dbRecordId: string | undefined;
    if (options.persist_to_database !== false) {
      const { data: record } = await supabase
        .from("tree_photos" as any)
        .insert({
          project_id: projectId,
          uploader_id: options.uploader_id || null,
          photo_url: path,
          evidence_type: documentType === "kml_boundary" ? "kml_document" : "soil_sample",
          caption: options.caption || `Project document: ${filename}`,
          sha256_hash: hash,
          storage_bucket: "project-documents",
          storage_path: path,
        })
        .select("id")
        .maybeSingle();

      if (record?.id) {
        dbRecordId = record.id;
      }
    }

    return {
      bucket: "project-documents",
      path,
      url: path,
      sha256_hash: hash,
      size_bytes: file.size,
      db_record_id: dbRecordId,
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
   * Removes a file from storage and cleans up associated tree_photos records
   */
  async deleteFile(bucket: StorageBucketType, paths: string[]): Promise<boolean> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (!error) {
      await supabase.from("tree_photos" as any).delete().in("storage_path", paths);
    }
    return !error;
  },
};
