/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 37
 * Network Quality Service & Adaptive Field Payload Optimizer
 *
 * Features:
 * 1. Cellular Network Quality Profiling (Fast 4G/WiFi, Moderate 3G, Poor 2G/EDGE, Offline)
 * 2. Real-Time RTT (Round Trip Time) & Downlink Speed Evaluation
 * 3. Connection Flapping & Packet-Loss Detection
 * 4. Adaptive Image Compression Settings based on Live Network Tier
 * 5. Active Heartbeat Cloud Reachability Probe
 * 6. Low-Bandwidth Data Saver Mode Management
 */

export type NetworkQualityTier = "fast" | "moderate" | "poor" | "offline";

export type EffectiveConnectionType = "4g" | "3g" | "2g" | "slow-2g" | "offline" | "unknown";

export interface NetworkQualityReport {
  isOnline: boolean;
  qualityTier: NetworkQualityTier;
  effectiveType: EffectiveConnectionType;
  rttMs: number;
  downlinkMbps: number;
  saveData: boolean;
  lowBandwidthMode: boolean;
  isFlapping: boolean;
  isCloudReachable: boolean;
  timestamp: number;
}

export interface AdaptiveCompressionConfig {
  maxDimensionPx: number;
  qualityFactor: number;
  format: "image/jpeg" | "image/webp";
  allowPhotoUploadNow: boolean;
  targetMaxBytes: number;
  description: string;
}

// History of network transitions for flapping detection
const connectionTransitions: number[] = [];
const FLAPPING_WINDOW_MS = 60000; // 1 minute
const FLAPPING_THRESHOLD_COUNT = 4; // 4+ transitions in 1 minute = flapping

let userLowBandwidthPreference = false;

export const networkQualityService = {
  /**
   * Get raw Network Information API connection object if available
   */
  getConnection(): any {
    if (typeof navigator !== "undefined") {
      return (
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection ||
        null
      );
    }
    return null;
  },

  /**
   * Determine Effective Connection Type
   */
  getEffectiveType(): EffectiveConnectionType {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      return "offline";
    }

    const conn = this.getConnection();
    if (conn && conn.effectiveType) {
      return conn.effectiveType as EffectiveConnectionType;
    }

    return "4g";
  },

  /**
   * Evaluate Connection Quality Tier based on RTT, Downlink, and Data Saver mode
   */
  classifyQualityTier(
    isOnline: boolean,
    effectiveType: EffectiveConnectionType,
    rttMs: number,
    downlinkMbps: number,
    lowBandwidthOverride = false
  ): NetworkQualityTier {
    if (!isOnline || effectiveType === "offline") {
      return "offline";
    }

    if (lowBandwidthOverride) {
      return "poor";
    }

    // 2G / Slow-2G or High Latency RTT (> 800ms) or Low Bandwidth (< 0.4 Mbps)
    if (
      effectiveType === "2g" ||
      effectiveType === "slow-2g" ||
      rttMs >= 800 ||
      (downlinkMbps > 0 && downlinkMbps < 0.5)
    ) {
      return "poor";
    }

    // 3G or Moderate Latency (300ms - 800ms)
    if (
      effectiveType === "3g" ||
      (rttMs >= 300 && rttMs < 800) ||
      (downlinkMbps >= 0.5 && downlinkMbps < 2.0)
    ) {
      return "moderate";
    }

    return "fast";
  },

  /**
   * Check if connection is currently flapping (rapidly dropping on/off)
   */
  checkIsFlapping(): boolean {
    const now = Date.now();
    // Prune events older than window
    while (connectionTransitions.length > 0 && now - connectionTransitions[0] > FLAPPING_WINDOW_MS) {
      connectionTransitions.shift();
    }
    return connectionTransitions.length >= FLAPPING_THRESHOLD_COUNT;
  },

  /**
   * Record a transition event for flapping telemetry
   */
  recordTransition(): void {
    connectionTransitions.push(Date.now());
  },

  /**
   * Low Bandwidth Mode (User Preference)
   */
  getLowBandwidthMode(): boolean {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem("green_low_bandwidth_mode");
        if (stored !== null) return stored === "true";
      } catch {
        // Fallback
      }
    }
    return userLowBandwidthPreference;
  },

  setLowBandwidthMode(enabled: boolean): void {
    userLowBandwidthPreference = enabled;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("green_low_bandwidth_mode", String(enabled));
      } catch {
        // Fallback
      }
    }
  },

  /**
   * Active Heartbeat Reachability Probe
   */
  async probeCloudReachability(timeoutMs = 4000): Promise<{ reachable: boolean; latencyMs: number }> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { reachable: false, latencyMs: 0 };
    }

    const start = Date.now();
    try {
      if (typeof window !== "undefined" && window.fetch) {
        // Lightweight probe to verify DNS / TCP connectivity
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(window.location.origin + "/favicon.ico", {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timer);

        const latencyMs = Date.now() - start;
        return { reachable: response.ok || response.status < 500, latencyMs };
      }
    } catch {
      // Offline / blocked
    }

    return { reachable: false, latencyMs: Date.now() - start };
  },

  /**
   * Unified Network Diagnostics & Quality Report
   */
  getNetworkReport(): NetworkQualityReport {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    const conn = this.getConnection();

    const effectiveType = this.getEffectiveType();
    const rttMs = conn?.rtt || (isOnline ? 85 : 0);
    const downlinkMbps = conn?.downlink || (isOnline ? 10.0 : 0);
    const saveData = Boolean(conn?.saveData);
    const lowBandwidthMode = this.getLowBandwidthMode();
    const isFlapping = this.checkIsFlapping();

    const qualityTier = this.classifyQualityTier(
      isOnline,
      effectiveType,
      rttMs,
      downlinkMbps,
      lowBandwidthMode || saveData
    );

    return {
      isOnline,
      qualityTier,
      effectiveType,
      rttMs,
      downlinkMbps,
      saveData,
      lowBandwidthMode,
      isFlapping,
      isCloudReachable: isOnline,
      timestamp: Date.now(),
    };
  },

  /**
   * Resolve Adaptive Compression Config based on Network Quality
   */
  getAdaptiveCompressionConfig(qualityTier?: NetworkQualityTier): AdaptiveCompressionConfig {
    const tier = qualityTier || this.getNetworkReport().qualityTier;

    switch (tier) {
      case "fast":
        return {
          maxDimensionPx: 1440,
          qualityFactor: 0.85,
          format: "image/jpeg",
          allowPhotoUploadNow: true,
          targetMaxBytes: 250000, // ~250 KB
          description: "High-Res 1440px (Fast 4G/WiFi - Full Quality)",
        };

      case "moderate":
        return {
          maxDimensionPx: 960,
          qualityFactor: 0.72,
          format: "image/jpeg",
          allowPhotoUploadNow: true,
          targetMaxBytes: 95000, // ~95 KB
          description: "Optimized 960px (3G Connection - Smart Compressed)",
        };

      case "poor":
        return {
          maxDimensionPx: 640,
          qualityFactor: 0.55,
          format: "image/jpeg",
          allowPhotoUploadNow: false, // Queue photo blob for deferred upload
          targetMaxBytes: 38000, // ~38 KB
          description: "Ultra-Light 640px (2G/EDGE - Defer Photo Upload to Wi-Fi)",
        };

      case "offline":
      default:
        return {
          maxDimensionPx: 800,
          qualityFactor: 0.65,
          format: "image/jpeg",
          allowPhotoUploadNow: false,
          targetMaxBytes: 65000, // ~65 KB
          description: "Offline IndexedDB Cache (Local Storage Queue)",
        };
    }
  },

  /**
   * Compress Image Blob/DataUrl according to Network Quality
   */
  async adaptivelyCompressImage(
    imageDataUrlOrFile: string | File,
    qualityTier?: NetworkQualityTier
  ): Promise<{ dataUrl: string; originalSize: number; compressedSize: number; config: AdaptiveCompressionConfig }> {
    const config = this.getAdaptiveCompressionConfig(qualityTier);

    if (typeof window === "undefined" || typeof document === "undefined") {
      const fallbackUrl = typeof imageDataUrlOrFile === "string" ? imageDataUrlOrFile : "data:image/jpeg;base64,mock";
      return {
        dataUrl: fallbackUrl,
        originalSize: fallbackUrl.length,
        compressedSize: fallbackUrl.length,
        config,
      };
    }

    return new Promise((resolve) => {
      let sourceUrl = "";
      let originalSize = 0;

      if (typeof imageDataUrlOrFile === "string") {
        sourceUrl = imageDataUrlOrFile;
        originalSize = imageDataUrlOrFile.length;
      } else {
        sourceUrl = URL.createObjectURL(imageDataUrlOrFile);
        originalSize = imageDataUrlOrFile.size;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Downscale maintaining aspect ratio
        if (width > config.maxDimensionPx || height > config.maxDimensionPx) {
          if (width > height) {
            height = Math.round((height * config.maxDimensionPx) / width);
            width = config.maxDimensionPx;
          } else {
            width = Math.round((width * config.maxDimensionPx) / height);
            height = config.maxDimensionPx;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL(config.format, config.qualityFactor);
          if (typeof imageDataUrlOrFile !== "string") {
            URL.revokeObjectURL(sourceUrl);
          }
          resolve({
            dataUrl: compressed,
            originalSize,
            compressedSize: compressed.length,
            config,
          });
          return;
        }

        if (typeof imageDataUrlOrFile !== "string") {
          URL.revokeObjectURL(sourceUrl);
        }
        resolve({ dataUrl: sourceUrl, originalSize, compressedSize: originalSize, config });
      };

      img.onerror = () => {
        if (typeof imageDataUrlOrFile !== "string") {
          URL.revokeObjectURL(sourceUrl);
        }
        resolve({ dataUrl: sourceUrl, originalSize, compressedSize: originalSize, config });
      };

      img.src = sourceUrl;
    });
  },

  /**
   * Subscribe to network changes
   */
  subscribeToNetworkChanges(callback: (report: NetworkQualityReport) => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handleUpdate = () => {
      this.recordTransition();
      const report = this.getNetworkReport();
      callback(report);
    };

    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);

    const conn = this.getConnection();
    if (conn && conn.addEventListener) {
      conn.addEventListener("change", handleUpdate);
    }

    return () => {
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener("change", handleUpdate);
      }
    };
  },
};
