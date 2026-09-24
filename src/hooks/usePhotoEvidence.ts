/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 17
 * React Hook for Photo Evidence Capture, Validation & Upload Pipeline
 */

import { useState, useCallback, useEffect } from "react";
import {
  photoEvidenceService,
  PhotoEvidenceCategory,
  PhotoValidationResult,
  PhotoUploadProgress,
  PhotoEvidenceUploadResult,
  PhotoSourceMode,
} from "@/services/photoEvidenceService";

export interface UsePhotoEvidenceOptions {
  evidenceType?: PhotoEvidenceCategory;
  treeId?: string | null;
  projectId?: string | null;
  uploaderId?: string | null;
  autoValidate?: boolean;
}

export function usePhotoEvidence(options: UsePhotoEvidenceOptions = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<PhotoSourceMode>("camera");
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<PhotoValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress>({
    stage: "idle",
    progressPercent: 0,
    message: "",
  });
  const [uploadResult, setUploadResult] = useState<PhotoEvidenceUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Set file and run validation
  const selectFile = useCallback(
    async (file: File | null, mode: PhotoSourceMode = "camera") => {
      setError(null);
      setUploadResult(null);
      setSourceMode(mode);

      if (!file) {
        setSelectedFile(null);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setValidationResult(null);
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      if (options.autoValidate !== false) {
        setIsValidating(true);
        try {
          const res = await photoEvidenceService.validateImage(file);
          setValidationResult(res);
          if (!res.isValid) {
            setError(res.errors.join("; "));
          }
        } catch (err: any) {
          setError(err?.message || "Failed to validate photo");
        } finally {
          setIsValidating(false);
        }
      }
    },
    [previewUrl, options.autoValidate]
  );

  // Execute upload
  const upload = useCallback(
    async (overrideOptions: {
      treeId?: string | null;
      projectId?: string | null;
      uploaderId?: string | null;
      evidenceType?: PhotoEvidenceCategory;
      caption?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } = {}) => {
      if (!selectedFile) {
        const msg = "No photo selected for upload.";
        setError(msg);
        return { success: false, error: msg };
      }

      setIsUploading(true);
      setError(null);

      const targetEvidenceType =
        overrideOptions.evidenceType || options.evidenceType || "planting_photo";
      const targetTreeId =
        overrideOptions.treeId !== undefined ? overrideOptions.treeId : options.treeId;
      const targetProjectId =
        overrideOptions.projectId !== undefined ? overrideOptions.projectId : options.projectId;
      const targetUploaderId =
        overrideOptions.uploaderId !== undefined ? overrideOptions.uploaderId : options.uploaderId;

      try {
        const res = await photoEvidenceService.uploadPhotoEvidence({
          file: selectedFile,
          evidenceType: targetEvidenceType,
          treeId: targetTreeId,
          projectId: targetProjectId,
          uploaderId: targetUploaderId,
          caption: overrideOptions.caption,
          latitudeOverride: overrideOptions.latitude,
          longitudeOverride: overrideOptions.longitude,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        setUploadResult(res);
        if (!res.success) {
          setError(res.error || "Upload failed");
        }
        return res;
      } catch (err: any) {
        const msg = err?.message || "Upload failed unexpectedly";
        setError(msg);
        setUploadProgress({
          stage: "error",
          progressPercent: 0,
          message: msg,
        });
        return { success: false, error: msg };
      } finally {
        setIsUploading(false);
      }
    },
    [selectedFile, options.evidenceType, options.treeId, options.projectId, options.uploaderId]
  );

  // Reset state
  const reset = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setValidationResult(null);
    setUploadProgress({ stage: "idle", progressPercent: 0, message: "" });
    setUploadResult(null);
    setError(null);
    setIsUploading(false);
    setIsValidating(false);
  }, [previewUrl]);

  return {
    selectedFile,
    previewUrl,
    sourceMode,
    isValidating,
    isUploading,
    validationResult,
    uploadProgress,
    uploadResult,
    error,
    selectFile,
    upload,
    reset,
  };
}
