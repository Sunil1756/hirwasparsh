/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 37
 * React Hook for Real-Time Network Quality Telemetry & Adaptive Field Throttling
 */

import { useState, useEffect, useCallback } from "react";
import {
  networkQualityService,
  NetworkQualityReport,
  NetworkQualityTier,
  EffectiveConnectionType,
  AdaptiveCompressionConfig,
} from "@/services/networkQualityService";
import { toast } from "sonner";

export interface UseNetworkQualityReturn {
  report: NetworkQualityReport;
  isOnline: boolean;
  qualityTier: NetworkQualityTier;
  effectiveType: EffectiveConnectionType;
  rttMs: number;
  downlinkMbps: number;
  isPoorNetwork: boolean;
  lowBandwidthMode: boolean;
  isFlapping: boolean;
  setLowBandwidthMode: (enabled: boolean) => void;
  getCompressionConfig: () => AdaptiveCompressionConfig;
  compressPhoto: (photo: string | File) => Promise<{ dataUrl: string; compressedSize: number }>;
  probeCloud: () => Promise<{ reachable: boolean; latencyMs: number }>;
  refresh: () => NetworkQualityReport;
}

export function useNetworkQuality(): UseNetworkQualityReturn {
  const [report, setReport] = useState<NetworkQualityReport>(() =>
    networkQualityService.getNetworkReport()
  );

  const refresh = useCallback((): NetworkQualityReport => {
    const updated = networkQualityService.getNetworkReport();
    setReport(updated);
    return updated;
  }, []);

  useEffect(() => {
    const unsubscribe = networkQualityService.subscribeToNetworkChanges((newReport) => {
      setReport(newReport);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSetLowBandwidthMode = useCallback((enabled: boolean) => {
    networkQualityService.setLowBandwidthMode(enabled);
    setReport(networkQualityService.getNetworkReport());
    if (enabled) {
      toast.info("Low Bandwidth Data Saver enabled: Photos will be aggressively compressed.");
    } else {
      toast.info("Standard bandwidth mode active.");
    }
  }, []);

  const getCompressionConfig = useCallback(() => {
    return networkQualityService.getAdaptiveCompressionConfig(report.qualityTier);
  }, [report.qualityTier]);

  const compressPhoto = useCallback(
    async (photo: string | File) => {
      const res = await networkQualityService.adaptivelyCompressImage(photo, report.qualityTier);
      return { dataUrl: res.dataUrl, compressedSize: res.compressedSize };
    },
    [report.qualityTier]
  );

  const probeCloud = useCallback(async () => {
    return networkQualityService.probeCloudReachability();
  }, []);

  const isPoorNetwork = report.qualityTier === "poor" || report.lowBandwidthMode;

  return {
    report,
    isOnline: report.isOnline,
    qualityTier: report.qualityTier,
    effectiveType: report.effectiveType,
    rttMs: report.rttMs,
    downlinkMbps: report.downlinkMbps,
    isPoorNetwork,
    lowBandwidthMode: report.lowBandwidthMode,
    isFlapping: report.isFlapping,
    setLowBandwidthMode: handleSetLowBandwidthMode,
    getCompressionConfig,
    compressPhoto,
    probeCloud,
    refresh,
  };
}
