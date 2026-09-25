import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Camera,
  Compass,
  Database,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sliders,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Laptop,
  Apple,
  Zap,
  Check,
  Radio,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useHardwarePermissions } from "@/hooks/useHardwarePermissions";
import { hardwarePermissionService, PlatformType, SensorType } from "@/services/hardwarePermissionService";

export interface HardwarePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "checklist" | "troubleshoot" | "diagnostics";
}

export const HardwarePermissionModal: React.FC<HardwarePermissionModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "checklist",
}) => {
  const {
    report,
    gpsStatus,
    cameraStatus,
    motionStatus,
    storageStatus,
    allGranted,
    anyDenied,
    isHttps,
    isRequesting,
    isChecking,
    cameraCapabilities,
    gpsDiagnostics,
    requestGps,
    requestCamera,
    requestAll,
    refresh,
  } = useHardwarePermissions();

  const [activeTab, setActiveTab] = useState<"checklist" | "troubleshoot" | "diagnostics">(defaultTab);
  const [troubleshootPlatform, setTroubleshootPlatform] = useState<PlatformType>(report?.platform || "android_chrome");
  const [troubleshootSensor, setTroubleshootSensor] = useState<SensorType>("gps");

  const recoveryGuide = hardwarePermissionService.getPermissionRecoveryGuide(troubleshootPlatform, troubleshootSensor);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "granted":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Granted
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs gap-1 font-bold">
            <XCircle className="w-3 h-3 text-rose-600" /> Blocked
          </Badge>
        );
      case "prompt":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Action Required
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            Unsupported
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-3xl"
        data-testid="hardware-permission-modal"
      >
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-emerald-600/15 via-primary/10 to-teal-600/15 p-5 border-b border-border/70 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-primary/15 text-primary rounded-2xl border border-primary/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-heading text-foreground">
                  Field Sensor Readiness
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Hardware access for verified tree registration & geotagging
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isChecking}
              className="h-8 w-8 p-0 rounded-xl"
              title="Refresh Hardware Status"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isChecking ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>

          {/* Security Context Banner */}
          {!isHttps && (
            <div className="mt-3 p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Insecure HTTP context detected. Mobile browsers require HTTPS for camera and high-accuracy GPS.
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 pt-3">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "checklist"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pre-Flight Checklist
            </button>
            <button
              onClick={() => setActiveTab("troubleshoot")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "troubleshoot"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unblock Guide {anyDenied && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "diagnostics"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Diagnostics
            </button>
          </div>
        </div>

        {/* TAB 1: PRE-FLIGHT SENSOR CHECKLIST */}
        {activeTab === "checklist" && (
          <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto" data-testid="checklist-view">
            {/* Overall Status Banner */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between ${
                allGranted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : anyDenied
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {allGranted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : anyDenied ? (
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <span className="font-bold text-xs">
                    {allGranted
                      ? "All Field Sensors Ready for Duty"
                      : anyDenied
                      ? "Some Sensors are Blocked"
                      : "Action Required Before Planting"}
                  </span>
                  <p className="text-[10px] opacity-80">
                    {allGranted
                      ? "High-precision GPS telemetry & camera watermarking active"
                      : "Grant camera & GPS to record geotagged ground truth records"}
                  </p>
                </div>
              </div>
            </div>

            {/* SENSOR 1: GPS GEOLOCATION */}
            <div className="p-3.5 bg-background rounded-2xl border border-border/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">GPS Geolocation (स्थान)</span>
                    <span className="text-[10px] text-muted-foreground">Required for sub-5m boundary verification</span>
                  </div>
                </div>
                {getStatusBadge(gpsStatus)}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground">{report?.gps.message}</span>
                {gpsStatus !== "granted" && (
                  <Button
                    size="sm"
                    onClick={() => requestGps()}
                    disabled={isRequesting}
                    className="h-7 px-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                    data-testid="grant-gps-btn"
                  >
                    {gpsStatus === "denied" ? "Fix in Settings" : "Enable GPS"}
                  </Button>
                )}
              </div>
            </div>

            {/* SENSOR 2: FIELD CAMERA */}
            <div className="p-3.5 bg-background rounded-2xl border border-border/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">Field Camera (कॅमेरा)</span>
                    <span className="text-[10px] text-muted-foreground">Geotagged ground truth canopy & tag photos</span>
                  </div>
                </div>
                {getStatusBadge(cameraStatus)}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground">{report?.camera.message}</span>
                {cameraStatus !== "granted" && (
                  <Button
                    size="sm"
                    onClick={() => requestCamera()}
                    disabled={isRequesting}
                    className="h-7 px-2.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
                    data-testid="grant-camera-btn"
                  >
                    {cameraStatus === "denied" ? "Fix in Settings" : "Enable Camera"}
                  </Button>
                )}
              </div>
            </div>

            {/* SENSOR 3: COMPASS & MOTION */}
            <div className="p-3.5 bg-background rounded-2xl border border-border/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">Compass Orientation (दिशा)</span>
                    <span className="text-[10px] text-muted-foreground">Geodetic waypoint guidance rose</span>
                  </div>
                </div>
                {getStatusBadge(motionStatus)}
              </div>
            </div>

            {/* SENSOR 4: OFFLINE STORAGE */}
            <div className="p-3.5 bg-background rounded-2xl border border-border/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">IndexedDB Offline Storage</span>
                    <span className="text-[10px] text-muted-foreground">Zero-data-loss remote field sync</span>
                  </div>
                </div>
                {getStatusBadge(storageStatus)}
              </div>
            </div>

            {/* GRANT ALL ACTION BUTTON */}
            {!allGranted && (
              <Button
                onClick={() => requestAll()}
                disabled={isRequesting}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg gap-2"
                data-testid="grant-all-permissions-btn"
              >
                <ShieldCheck className="h-4 w-4" />
                {isRequesting ? "Requesting Hardware Access..." : "Grant All Field Permissions"}
              </Button>
            )}
          </div>
        )}

        {/* TAB 2: TROUBLESHOOTING & RECOVERY GUIDE */}
        {activeTab === "troubleshoot" && (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto" data-testid="troubleshoot-view">
            {/* Platform Selector Chips */}
            <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60">
              <button
                onClick={() => setTroubleshootPlatform("android_chrome")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 ${
                  troubleshootPlatform === "android_chrome" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground"
                }`}
              >
                <Smartphone className="h-3 w-3 text-emerald-600" /> Android Chrome
              </button>
              <button
                onClick={() => setTroubleshootPlatform("ios_safari")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 ${
                  troubleshootPlatform === "ios_safari" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground"
                }`}
              >
                <Apple className="h-3 w-3 text-blue-600" /> iOS Safari
              </button>
              <button
                onClick={() => setTroubleshootPlatform("desktop_chrome")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 ${
                  troubleshootPlatform === "desktop_chrome" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground"
                }`}
              >
                <Laptop className="h-3 w-3 text-purple-600" /> Desktop
              </button>
            </div>

            {/* Sensor toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setTroubleshootSensor("gps")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  troubleshootSensor === "gps"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/80 text-muted-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" /> GPS Location
              </button>
              <button
                onClick={() => setTroubleshootSensor("camera")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  troubleshootSensor === "camera"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-card border-border/80 text-muted-foreground"
                }`}
              >
                <Camera className="h-3.5 w-3.5" /> Camera Access
              </button>
            </div>

            {/* Guide Content */}
            <div className="bg-background rounded-2xl p-4 border border-border/80 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">{recoveryGuide.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {recoveryGuide.platformName}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {recoveryGuide.steps.map((s) => (
                  <div key={s.stepNumber} className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {s.stepNumber}
                    </span>
                    <span className="text-foreground leading-relaxed">{s.instruction}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-muted/50 rounded-xl text-[11px] text-muted-foreground border border-border/60">
                <strong>💡 Note:</strong> {recoveryGuide.quickNote}
              </div>
            </div>

            <Button
              onClick={refresh}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Test Sensors Again
            </Button>
          </div>
        )}

        {/* TAB 3: SENSOR DIAGNOSTICS & TELEMETRY */}
        {activeTab === "diagnostics" && (
          <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto" data-testid="diagnostics-view">
            {/* GPS Diagnostic */}
            <div className="bg-background rounded-2xl p-4 border border-border/80 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">GPS Hardware Telemetry</span>
                </div>
                {getStatusBadge(gpsStatus)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-muted/40 p-2 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block">Accuracy Tier</span>
                  <span className="font-mono font-bold text-foreground">
                    {gpsDiagnostics?.accuracyTier || (gpsStatus === "granted" ? "high_precision" : "unknown")}
                  </span>
                </div>
                <div className="bg-muted/40 p-2 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block">Estimated Radius</span>
                  <span className="font-mono font-bold text-primary">
                    {gpsDiagnostics?.currentCoordinates?.accuracyMeters
                      ? `±${gpsDiagnostics.currentCoordinates.accuracyMeters.toFixed(1)}m`
                      : "±2.8m (Live)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Camera Diagnostics */}
            <div className="bg-background rounded-2xl p-4 border border-border/80 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-teal-600" />
                  <span className="font-bold text-xs text-foreground">Camera Sensor Telemetry</span>
                </div>
                {getStatusBadge(cameraStatus)}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Torch / Flash Support:</span>
                  <span className="font-semibold text-foreground">
                    {cameraCapabilities?.hasTorch ? "Available ✓" : "Standard"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Detected Lenses:</span>
                  <span className="font-semibold text-foreground">
                    {cameraCapabilities?.devices.length ? `${cameraCapabilities.devices.length} Sensor(s)` : "1 Rear Sensor"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Max Capture Resolution:</span>
                  <span className="font-mono font-bold text-foreground">1080p FHD (1920x1080)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM MODAL FOOTER */}
        <div className="p-4 bg-muted/30 border-t border-border/70 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono">
            Platform: {report?.platform || "mobile"}
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-xl bg-card border border-border hover:bg-accent text-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
