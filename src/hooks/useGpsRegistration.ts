/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 16
 * React Hook for Device GPS Registration & Boundary Validation
 */

import { useState, useEffect, useCallback } from "react";
import {
  gpsRegistrationService,
  GpsCoordinates,
  GpsPermissionStatus,
  GpsAccuracyTier,
  BoundaryValidationResult,
  GpsValidationReport,
} from "@/services/gpsRegistrationService";

export interface UseGpsRegistrationOptions {
  projectId?: string | null;
  autoAcquire?: boolean;
  enableHighAccuracy?: boolean;
}

export function useGpsRegistration(options: UseGpsRegistrationOptions = {}) {
  const [coordinates, setCoordinates] = useState<GpsCoordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<GpsPermissionStatus>("prompt");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryValidation, setBoundaryValidation] = useState<BoundaryValidationResult | null>(null);
  const [validationReport, setValidationReport] = useState<GpsValidationReport | null>(null);

  // Check initial permission status
  useEffect(() => {
    gpsRegistrationService.checkLocationPermission().then((status) => {
      setPermissionStatus(status);
    });
  }, []);

  // Acquire high accuracy GPS location lock
  const acquireGpsLock = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await gpsRegistrationService.captureCurrentGpsPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: 15000,
      maximumAge: 0,
    });

    if (result.permissionStatus) {
      setPermissionStatus(result.permissionStatus);
    }

    if (!result.success || !result.coordinates) {
      setIsLoading(false);
      setError(result.error || "Failed to acquire GPS fix");
      return null;
    }

    const coords = result.coordinates;
    setCoordinates(coords);

    // Validate location and check boundary if projectId provided
    const report = await gpsRegistrationService.validateGpsRegistration({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters,
      projectId: options.projectId,
    });

    setValidationReport(report);
    if (report.boundaryResult) {
      setBoundaryValidation(report.boundaryResult);
    }

    setIsLoading(false);
    return coords;
  }, [options.projectId, options.enableHighAccuracy]);

  // Auto-acquire on mount if requested
  useEffect(() => {
    if (options.autoAcquire) {
      acquireGpsLock();
    }
  }, [options.autoAcquire, acquireGpsLock]);

  // Manual coordinate override / map drag point validation
  const setManualCoordinates = useCallback(
    async (lat: number, lng: number, accuracyMeters: number = 5) => {
      const tier = gpsRegistrationService.classifyAccuracyTier(accuracyMeters);
      const coords: GpsCoordinates = {
        latitude: lat,
        longitude: lng,
        accuracyMeters,
        altitudeMeters: null,
        altitudeAccuracyMeters: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
        accuracyTier: tier,
      };

      setCoordinates(coords);
      setError(null);

      const report = await gpsRegistrationService.validateGpsRegistration({
        latitude: lat,
        longitude: lng,
        accuracyMeters,
        projectId: options.projectId,
      });

      setValidationReport(report);
      if (report.boundaryResult) {
        setBoundaryValidation(report.boundaryResult);
      }

      return coords;
    },
    [options.projectId]
  );

  return {
    coordinates,
    permissionStatus,
    isLoading,
    error,
    accuracyTier: coordinates?.accuracyTier || null,
    boundaryValidation,
    validationReport,
    acquireGpsLock,
    setManualCoordinates,
    isInsideBoundary: boundaryValidation ? boundaryValidation.isInside : true,
  };
}
