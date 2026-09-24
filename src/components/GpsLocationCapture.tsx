/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 16
 * Interactive GPS Location Capture & Boundary Validator Component
 */

import React from "react";
import {
  MapPin,
  Navigation,
  Crosshair,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Signal,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  GpsCoordinates,
  GpsAccuracyTier,
  BoundaryValidationResult,
  GpsPermissionStatus,
} from "@/services/gpsRegistrationService";

export interface GpsLocationCaptureProps {
  coordinates: GpsCoordinates | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: GpsPermissionStatus;
  boundaryValidation: BoundaryValidationResult | null;
  projectName?: string;
  onAcquireLock: () => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number; accuracy: number }) => void;
  disabled?: boolean;
}

export const GpsLocationCapture: React.FC<GpsLocationCaptureProps> = ({
  coordinates,
  isLoading,
  error,
  permissionStatus,
  boundaryValidation,
  projectName,
  onAcquireLock,
  disabled = false,
}) => {
  const getAccuracyBadge = (tier: GpsAccuracyTier, accuracyMeters: number) => {
    switch (tier) {
      case "survey_grade":
        return (
          <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 gap-1 font-mono text-xs">
            <Signal className="w-3 h-3 text-emerald-400 animate-pulse" />
            Survey-Grade (±{accuracyMeters}m)
          </Badge>
        );
      case "high_precision":
        return (
          <Badge className="bg-green-600/20 text-green-400 border border-green-500/40 gap-1 font-mono text-xs">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            High Precision (±{accuracyMeters}m)
          </Badge>
        );
      case "standard_mobile":
        return (
          <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/40 gap-1 font-mono text-xs">
            <Navigation className="w-3 h-3 text-blue-400" />
            Standard GPS (±{accuracyMeters}m)
          </Badge>
        );
      case "coarse_warning":
      default:
        return (
          <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/40 gap-1 font-mono text-xs">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Coarse Fix (±{accuracyMeters}m)
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-slate-950/80 border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
                GPS Geolocation & Cadastral Lock
                {coordinates && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                WGS84 High-Precision Coordinate Registration
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAcquireLock}
            disabled={isLoading || disabled}
            className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 gap-1.5 h-8 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Acquiring Fix..." : coordinates ? "Refresh Lock" : "Capture Location"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Error / Permission Banner */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">Geolocation Fix Notice</p>
              <p className="text-slate-300 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Permission Denied Recovery Banner */}
        {permissionStatus === "denied" && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">Location Permission Blocked</p>
              <p className="text-slate-300">
                Please click the lock icon in your browser URL bar and allow Location access, then click Refresh Lock.
              </p>
            </div>
          </div>
        )}

        {/* Coordinate Display Grid */}
        {coordinates ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Latitude</span>
                <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                  {coordinates.latitude.toFixed(6)}°
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Longitude</span>
                <p className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                  {coordinates.longitude.toFixed(6)}°
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Accuracy</span>
                <div className="mt-0.5">
                  {getAccuracyBadge(coordinates.accuracyTier, coordinates.accuracyMeters)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Elevation</span>
                <p className="text-sm font-mono font-medium text-slate-300 mt-0.5">
                  {coordinates.altitudeMeters !== null ? `${coordinates.altitudeMeters} m MSL` : "N/A"}
                </p>
              </div>
            </div>

            {/* Boundary Validation Banner */}
            {boundaryValidation && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  boundaryValidation.isInside
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                    : "bg-amber-950/20 border-amber-800/40 text-amber-300"
                }`}
              >
                {boundaryValidation.isInside ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {boundaryValidation.isInside
                        ? "Inside Project Boundary"
                        : "Outside Project Boundary"}
                    </span>
                    {projectName && (
                      <span className="text-slate-400 text-[11px]">({projectName})</span>
                    )}
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {boundaryValidation.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center space-y-2 bg-slate-900/30">
            <Crosshair className="w-8 h-8 mx-auto text-slate-500 animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-300">No GPS Coordinates Captured</p>
              <p className="text-[11px] text-slate-500">
                Click "Capture Location" to lock high-precision satellite coordinates for this tree.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
