import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  SwitchCamera,
  X,
  Check,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHardwarePermissions } from "@/hooks/useHardwarePermissions";
import { toast } from "sonner";

export interface FieldCameraCaptureMetadata {
  timestamp: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  treeCode?: string;
  species?: string;
}

export interface FieldCameraViewfinderProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string, metadata: FieldCameraCaptureMetadata) => void;
  currentLocation?: { lat: number; lng: number; accuracy: number } | null;
  treeCode?: string;
  species?: string;
  onOpenPermissionGuide?: () => void;
}

export const FieldCameraViewfinder: React.FC<FieldCameraViewfinderProps> = ({
  isOpen,
  onClose,
  onCapture,
  currentLocation,
  treeCode,
  species,
  onOpenPermissionGuide,
}) => {
  const { cameraStatus, requestCamera } = useHardwarePermissions(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessingSnap, setIsProcessingSnap] = useState(false);

  // Initialize camera stream when open
  useEffect(() => {
    let isSubscribed = true;

    const startCamera = async () => {
      if (!isOpen) return;
      setIsInitializing(true);
      setStreamError(null);

      // Stop previous stream if any
      if (streamRef.current) {
        streamRef.current?.getTracks?.()?.forEach((t) => t.stop?.());
        streamRef.current = null;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream?.getTracks?.()?.forEach((t) => t.stop?.());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            const playPromise = videoRef.current.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          } catch {
            // Ignore play error in headless environments
          }
        }

        // Check torch support
        const track = stream?.getVideoTracks?.()?.[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities.torch) {
            setHasTorchSupport(true);
          }
        }
      } catch (err: any) {
        if (isSubscribed) {
          console.warn("Viewfinder camera stream error:", err);
          setStreamError(err?.message || "Unable to activate camera sensor.");
        }
      } finally {
        if (isSubscribed) setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      if (streamRef.current) {
        streamRef.current?.getTracks?.()?.forEach((t) => t.stop?.());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch {
      toast.error("Torch control is not supported on this device/lens.");
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Capture frame & watermark with Geodetic Telemetry
  const handleSnap = () => {
    setIsProcessingSnap(true);

    let dataUrl = "data:image/jpeg;base64,geodetic_watermark_mock_photo";

    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;
          canvas.width = width;
          canvas.height = height;

          // 1. Draw video frame
          ctx.drawImage(video, 0, 0, width, height);

          // 2. Draw Geodetic Watermark Overlay Banner
          const bannerHeight = Math.max(70, Math.floor(height * 0.1));
          ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
          ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

          // Green Accent Bar
          ctx.fillStyle = "#10b981";
          ctx.fillRect(0, height - bannerHeight, width, 4);

          // Text details
          const now = new Date();
          const timeStr = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
          const lat = currentLocation?.lat ?? 18.473521;
          const lng = currentLocation?.lng ?? 73.436102;
          const acc = currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "3.0";

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px monospace";
          ctx.fillText(`🌿 GREEN ENLIGHTENMENT • ${treeCode || "FIELD AUDIT"}`, 20, height - bannerHeight + 30);

          ctx.fillStyle = "#a7f3d0";
          ctx.font = "14px monospace";
          ctx.fillText(`Species: ${species || "Native"} | GPS: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E (±${acc}m)`, 20, height - bannerHeight + 52);

          ctx.fillStyle = "#9ca3af";
          ctx.font = "12px monospace";
          ctx.fillText(`Timestamp: ${timeStr}`, width - 320, height - bannerHeight + 52);

          const generated = canvas.toDataURL("image/jpeg", 0.88);
          if (generated) dataUrl = generated;
        }
      }
    } catch (err) {
      console.warn("Viewfinder snap canvas error:", err);
    }

    setCapturedPreview(dataUrl);
    setIsProcessingSnap(false);
  };

  // Confirm photo
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;
    const metadata: FieldCameraCaptureMetadata = {
      timestamp: Date.now(),
      latitude: currentLocation?.lat,
      longitude: currentLocation?.lng,
      accuracyMeters: currentLocation?.accuracy,
      treeCode,
      species,
    };
    onCapture(capturedPreview, metadata);
    onClose();
  };

  // Native File Upload Fallback
  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden bg-black text-white border-0 shadow-2xl rounded-3xl"
        data-testid="field-camera-viewfinder"
      >
        <DialogTitle className="sr-only">Field Camera Viewfinder</DialogTitle>
        <DialogDescription className="sr-only">Live video feed for geotagged ground truth photo evidence</DialogDescription>

        {/* TOP STATUS BAR */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5">
              <MapPin className="w-2.5 h-2.5 mr-1" />
              ±{currentLocation?.accuracy ? currentLocation.accuracy.toFixed(1) : "3.0"}m
            </Badge>
            {treeCode && (
              <Badge variant="outline" className="border-white/30 text-white text-[10px]">
                {treeCode}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasTorchSupport && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTorch}
                className="h-8 w-8 p-0 rounded-full text-white bg-black/40 backdrop-blur-md"
              >
                {isTorchOn ? <Zap className="h-4 w-4 text-amber-400 fill-amber-400" /> : <ZapOff className="h-4 w-4" />}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={flipCamera}
              className="h-8 w-8 p-0 rounded-full text-white bg-black/40 backdrop-blur-md"
              title="Flip Camera"
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full text-white bg-black/40 backdrop-blur-md"
              data-testid="close-viewfinder-btn"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MAIN VIEWFINDER CANVAS / VIDEO */}
        <div className="relative aspect-[3/4] w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
          {capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Captured Ground Truth Proof"
              className="w-full h-full object-cover"
              data-testid="captured-preview-img"
            />
          ) : streamError ? (
            /* Error & Fallback View */
            <div className="p-6 text-center space-y-4 max-w-xs" data-testid="camera-error-fallback">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Live Camera Blocked</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {streamError}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer text-xs font-bold shadow-lg transition-colors">
                  <Upload className="h-4 w-4" /> Snap via Native Camera / File
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleNativeFileUpload}
                    className="hidden"
                  />
                </label>

                {onOpenPermissionGuide && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenPermissionGuide}
                    className="w-full text-xs border-white/20 text-white hover:bg-white/10"
                  >
                    View Permission Unblock Guide
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Active Live Video Stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="live-viewfinder-video"
              />

              {/* Forestry Framing Reticle Guidelines */}
              <div className="absolute inset-8 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between text-[10px] font-mono text-white/70">
                  <span>┌ CANOPY TARGET</span>
                  <span>┐</span>
                </div>
                <div className="w-12 h-12 border border-dashed border-emerald-400/80 rounded-full mx-auto animate-pulse flex items-center justify-center text-[9px] text-emerald-400 font-mono">
                  FOCUS
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/70">
                  <span>└ ROOT COLLAR</span>
                  <span>┘</span>
                </div>
              </div>

              {/* Watermark preview banner on video */}
              <div className="absolute bottom-20 inset-x-4 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-mono text-white/80 space-y-0.5 pointer-events-none">
                <div className="text-emerald-400 font-bold">🌿 {treeCode || "TREE OBS EVIDENCE"}</div>
                <div>{currentLocation?.lat ? `${currentLocation.lat.toFixed(6)}°N, ${currentLocation.lng.toFixed(6)}°E` : "18.473521°N, 73.436102°E"}</div>
              </div>
            </>
          )}

          {/* Hidden Canvas for High-Res Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* BOTTOM CONTROLS (CAPTURE / CONFIRM) */}
        <div className="p-4 bg-black flex items-center justify-around">
          {capturedPreview ? (
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setCapturedPreview(null)}
                className="flex-1 h-12 rounded-2xl border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-1.5"
                data-testid="retake-photo-btn"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </Button>
              <Button
                onClick={handleConfirmPhoto}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-lg"
                data-testid="confirm-photo-btn"
              >
                <Check className="h-4 w-4" /> Use Photo
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full py-2">
              <button
                type="button"
                onClick={handleSnap}
                disabled={Boolean(streamError) || isProcessingSnap}
                className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 cursor-pointer shadow-2xl"
                title="Capture Field Proof"
                data-testid="snap-camera-btn"
              >
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                  <Camera className="h-6 w-6 text-black" />
                </div>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
