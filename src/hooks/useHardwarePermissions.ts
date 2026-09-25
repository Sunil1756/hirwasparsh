/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 36
 * React Hook for Real-Time Hardware Permission States & Sensor Diagnostics
 */

import { useState, useEffect, useCallback } from "react";
import {
  hardwarePermissionService,
  HardwarePermissionsReport,
  HardwarePermissionStatus,
  CameraCapabilitiesReport,
  GpsDiagnosticReport,
  PlatformRecoveryGuide,
  SensorType,
} from "@/services/hardwarePermissionService";
import { toast } from "sonner";

export interface UseHardwarePermissionsReturn {
  report: HardwarePermissionsReport | null;
  gpsStatus: HardwarePermissionStatus;
  cameraStatus: HardwarePermissionStatus;
  motionStatus: HardwarePermissionStatus;
  storageStatus: HardwarePermissionStatus;
  allGranted: boolean;
  anyDenied: boolean;
  isHttps: boolean;
  isChecking: boolean;
  isRequesting: boolean;
  cameraCapabilities: CameraCapabilitiesReport | null;
  gpsDiagnostics: GpsDiagnosticReport | null;
  requestGps: (options?: PositionOptions) => Promise<boolean>;
  requestCamera: (constraints?: MediaStreamConstraints) => Promise<boolean>;
  requestAll: () => Promise<boolean>;
  refresh: () => Promise<HardwarePermissionsReport>;
  getRecoveryGuide: (sensor?: SensorType) => PlatformRecoveryGuide;
}

export function useHardwarePermissions(autoCheck = true): UseHardwarePermissionsReturn {
  const [report, setReport] = useState<HardwarePermissionsReport | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [cameraCapabilities, setCameraCapabilities] = useState<CameraCapabilitiesReport | null>(null);
  const [gpsDiagnostics, setGpsDiagnostics] = useState<GpsDiagnosticReport | null>(null);

  // Unified refresh function
  const refresh = useCallback(async (): Promise<HardwarePermissionsReport> => {
    setIsChecking(true);
    try {
      const rep = await hardwarePermissionService.checkAllPermissions();
      setReport(rep);

      // If camera is granted, asynchronously inspect capabilities
      if (rep.camera.status === "granted") {
        hardwarePermissionService.getCameraCapabilities().then(setCameraCapabilities);
      }

      return rep;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial check & real-time permission change listener
  useEffect(() => {
    if (!autoCheck) return;

    refresh();
    const unsubscribe = hardwarePermissionService.subscribeToPermissionChanges((newReport) => {
      setReport(newReport);
      if (newReport.camera.status === "granted") {
        hardwarePermissionService.getCameraCapabilities().then(setCameraCapabilities);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [autoCheck, refresh]);

  // Request GPS
  const requestGps = useCallback(
    async (options?: PositionOptions): Promise<boolean> => {
      setIsRequesting(true);
      try {
        const res = await hardwarePermissionService.requestGpsPermission(options);
        await refresh();
        if (res.success) {
          toast.success("GPS Location access granted! High precision active.");
          return true;
        } else {
          toast.error(res.error || "Location access was denied or unavailable.");
          return false;
        }
      } finally {
        setIsRequesting(false);
      }
    },
    [refresh]
  );

  // Request Camera
  const requestCamera = useCallback(
    async (constraints?: MediaStreamConstraints): Promise<boolean> => {
      setIsRequesting(true);
      try {
        const res = await hardwarePermissionService.requestCameraPermission(constraints);
        if (res.stream) {
          // Release stream tracks immediately
          res.stream.getTracks().forEach((t) => t.stop());
        }
        await refresh();
        if (res.success) {
          toast.success("Field Camera access granted!");
          return true;
        } else {
          toast.error(res.error || "Camera access was denied.");
          return false;
        }
      } finally {
        setIsRequesting(false);
      }
    },
    [refresh]
  );

  // Request All Essential Field Permissions
  const requestAll = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      const { allGranted, gpsResult, cameraResult } = await hardwarePermissionService.requestAllPermissions();
      await refresh();
      if (allGranted) {
        toast.success("All field hardware sensors (GPS + Camera) are fully approved!");
        return true;
      } else {
        if (!gpsResult.success) toast.error(`GPS: ${gpsResult.error}`);
        if (!cameraResult.success) toast.error(`Camera: ${cameraResult.error}`);
        return false;
      }
    } finally {
      setIsRequesting(false);
    }
  }, [refresh]);

  // Get Recovery Guide for current platform
  const getRecoveryGuide = useCallback(
    (sensor: SensorType = "gps"): PlatformRecoveryGuide => {
      return hardwarePermissionService.getPermissionRecoveryGuide(report?.platform, sensor);
    },
    [report?.platform]
  );

  return {
    report,
    gpsStatus: report?.gps.status || "prompt",
    cameraStatus: report?.camera.status || "prompt",
    motionStatus: report?.motion.status || "prompt",
    storageStatus: report?.storage.status || "granted",
    allGranted: Boolean(report?.allGranted),
    anyDenied: Boolean(report?.anyDenied),
    isHttps: report?.isHttps ?? true,
    isChecking,
    isRequesting,
    cameraCapabilities,
    gpsDiagnostics,
    requestGps,
    requestCamera,
    requestAll,
    refresh,
    getRecoveryGuide,
  };
}
