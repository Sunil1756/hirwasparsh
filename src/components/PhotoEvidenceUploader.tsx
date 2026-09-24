/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 17
 * Interactive Photo Evidence Uploader Component
 */

import React, { useRef } from "react";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  MapPin,
  Clock,
  ShieldCheck,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PhotoEvidenceCategory,
  PhotoUploadProgress,
  PhotoValidationResult,
  PhotoSourceMode,
} from "@/services/photoEvidenceService";

export interface PhotoEvidenceUploaderProps {
  label: string;
  description?: string;
  evidenceType: PhotoEvidenceCategory;
  previewUrl: string | null;
  selectedFile: File | null;
  isValidating?: boolean;
  isUploading?: boolean;
  validationResult: PhotoValidationResult | null;
  uploadProgress: PhotoUploadProgress;
  error: string | null;
  isCompleted?: boolean;
  cameraFacing?: "user" | "environment";
  onFileSelect: (file: File | null, mode: PhotoSourceMode) => void;
  onUpload?: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const PhotoEvidenceUploader: React.FC<PhotoEvidenceUploaderProps> = ({
  label,
  description,
  evidenceType,
  previewUrl,
  selectedFile,
  isValidating = false,
  isUploading = false,
  validationResult,
  uploadProgress,
  error,
  isCompleted = false,
  cameraFacing = "environment",
  onFileSelect,
  onUpload,
  onClear,
  disabled = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: PhotoSourceMode) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file, mode);
    // Reset file input value so same file can be re-selected if desired
    e.target.value = "";
  };

  const exif = validationResult?.metadata.exif;
  const hasGps = exif?.latitude !== null && exif?.longitude !== null && exif?.latitude !== undefined;

  return (
    <Card className="bg-slate-950/80 border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                {label}
                {isCompleted && (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Uploaded & Indexed
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <CardDescription className="text-xs text-slate-400">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
            {evidenceType.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Hidden inputs for Camera vs Gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={cameraFacing}
          className="hidden"
          onChange={(e) => handleFileChange(e, "camera")}
          disabled={disabled || isUploading}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, "gallery")}
          disabled={disabled || isUploading}
        />

        {/* Preview or Capture Selection */}
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group aspect-video max-h-64 flex items-center justify-center">
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-contain"
              />

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCameraClick}
                  disabled={isUploading || disabled}
                  className="h-8 text-xs gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> Retake
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleGalleryClick}
                  disabled={isUploading || disabled}
                  className="h-8 text-xs gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Change
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={onClear}
                  disabled={isUploading || disabled}
                  className="h-8 text-xs gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>

              {/* Status floating badges */}
              <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                {hasGps && (
                  <Badge className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] gap-1 backdrop-blur-md">
                    <MapPin className="w-3 h-3" /> Geotagged
                  </Badge>
                )}
                {exif?.timestamp && (
                  <Badge className="bg-slate-950/80 text-slate-300 border border-slate-700 text-[10px] gap-1 backdrop-blur-md">
                    <Clock className="w-3 h-3" /> {new Date(exif.timestamp).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>

            {/* Validation & Metadata Badges */}
            {validationResult && (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Size</span>
                    <p className="text-slate-200 font-mono">
                      {(validationResult.metadata.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {validationResult.metadata.width && validationResult.metadata.height && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Resolution</span>
                      <p className="text-slate-200 font-mono">
                        {validationResult.metadata.width} × {validationResult.metadata.height}
                      </p>
                    </div>
                  )}
                  {exif?.make && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Device</span>
                      <p className="text-slate-200 truncate font-mono">
                        {exif.make} {exif.model || ""}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    {validationResult.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-amber-400 text-[11px]">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty State / Photo Selection Trigger */
          <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-4 bg-slate-900/30">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
              <Camera className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-200">
                Capture Camera Photo or Upload from Gallery
              </p>
              <p className="text-[11px] text-slate-500">
                Supports JPEG, PNG, WebP, HEIC up to 15MB. Automatic EXIF & GPS extraction.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleCameraClick}
                disabled={disabled || isValidating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs font-medium"
              >
                <Smartphone className="w-3.5 h-3.5" /> Open Camera
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGalleryClick}
                disabled={disabled || isValidating}
                className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5 text-xs font-medium"
              >
                <Upload className="w-3.5 h-3.5" /> Select from Gallery
              </Button>
            </div>
          </div>
        )}

        {/* Validation Spinner */}
        {isValidating && (
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Verifying photo format, dimensions, and EXIF telemetry...</span>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {uploadProgress.message || "Uploading photo evidence..."}
              </span>
              <span className="font-mono text-slate-400">{uploadProgress.progressPercent}%</span>
            </div>
            <Progress value={uploadProgress.progressPercent} className="h-1.5 bg-slate-800" />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 flex items-start gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Manual Upload Trigger if not auto-uploaded */}
        {selectedFile && !isCompleted && !isUploading && onUpload && (
          <Button
            type="button"
            size="sm"
            onClick={onUpload}
            disabled={disabled || (validationResult && !validationResult.isValid)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Confirm & Upload Evidence
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
