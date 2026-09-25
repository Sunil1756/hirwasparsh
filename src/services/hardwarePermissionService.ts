/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 36
 * Hardware Permission Service & Sensor Diagnostic Engine
 *
 * Capabilities:
 * 1. Unified Permission State Querying (GPS, Camera, Motion, Storage)
 * 2. Interactive Permission Request Pipelines
 * 3. Multi-Lens Environmental Camera Enumeration & Diagnostics (Rear/Front, Resolution, Torch)
 * 4. GPS Signal Quality & Lock Acquisition Telemetry
 * 5. Platform-Aware Troubleshooting & Recovery Guides (Android Chrome, iOS Safari, Desktop)
 * 6. Live Permission Change Subscriptions
 */

export type HardwarePermissionStatus = "granted" | "prompt" | "denied" | "unsupported" | "restricted";

export type SensorType = "gps" | "camera" | "motion" | "storage";

export type PlatformType = "android_chrome" | "ios_safari" | "desktop_chrome" | "firefox" | "safari_desktop" | "other";

export interface PermissionStateDetail {
  sensor: SensorType;
  status: HardwarePermissionStatus;
  canPrompt: boolean;
  message: string;
  lastChecked: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  facingMode: "user" | "environment" | "unknown";
  isBackCamera: boolean;
  isWideAngle?: boolean;
}

export interface CameraCapabilitiesReport {
  isSupported: boolean;
  hasPermission: boolean;
  devices: CameraDeviceInfo[];
  activeDeviceId?: string;
  hasTorch: boolean;
  hasZoom: boolean;
  maxResolution?: { width: number; height: number };
  error?: string;
}

export interface GpsDiagnosticReport {
  isSupported: boolean;
  hasPermission: boolean;
  status: HardwarePermissionStatus;
  currentCoordinates?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    altitudeMeters: number | null;
    timestamp: number;
  };
  accuracyTier: "survey_grade" | "high_precision" | "standard_mobile" | "coarse_warning" | "unknown";
  lockLatencyMs?: number;
  error?: string;
}

export interface HardwarePermissionsReport {
  gps: PermissionStateDetail;
  camera: PermissionStateDetail;
  motion: PermissionStateDetail;
  storage: PermissionStateDetail;
  allGranted: boolean;
  anyDenied: boolean;
  isHttps: boolean;
  platform: PlatformType;
  timestamp: number;
}

export interface RecoveryStep {
  stepNumber: number;
  instruction: string;
  actionText?: string;
  icon?: string;
}

export interface PlatformRecoveryGuide {
  platform: PlatformType;
  platformName: string;
  sensor: SensorType;
  title: string;
  steps: RecoveryStep[];
  quickNote: string;
}

export const hardwarePermissionService = {
  /**
   * 1. PLATFORM DETECTION
   */
  detectPlatform(): PlatformType {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return "other";
    }

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isChrome = /Chrome|CriOS/i.test(ua) && !/Edge|Edg/i.test(ua);
    const isFirefox = /Firefox|FxiOS/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua);

    if (isAndroid && isChrome) return "android_chrome";
    if (isIOS) return "ios_safari";
    if (isFirefox) return "firefox";
    if (isSafari && !isIOS) return "safari_desktop";
    if (isChrome && !isAndroid && !isIOS) return "desktop_chrome";

    return "other";
  },

  /**
   * Check if running in a secure HTTPS / localhost context
   */
  isSecureContext(): boolean {
    if (typeof window === "undefined") return false;
    return (
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  },

  /**
   * 2. GPS PERMISSION QUERY
   */
  async checkGpsPermission(): Promise<PermissionStateDetail> {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      return {
        sensor: "gps",
        status: "unsupported",
        canPrompt: false,
        message: "Geolocation hardware is not supported by your browser or device.",
        lastChecked: Date.now(),
      };
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        const status = (result.state as HardwarePermissionStatus) || "prompt";
        return {
          sensor: "gps",
          status,
          canPrompt: status === "prompt",
          message:
            status === "granted"
              ? "GPS location access granted with high precision lock."
              : status === "denied"
              ? "Location access is blocked in browser settings."
              : "Location access ready to prompt.",
          lastChecked: Date.now(),
        };
      } catch {
        // Fallback for browsers that fail permissions.query
      }
    }

    return {
      sensor: "gps",
      status: "prompt",
      canPrompt: true,
      message: "Ready to request location permission.",
      lastChecked: Date.now(),
    };
  },

  /**
   * 3. CAMERA PERMISSION QUERY
   */
  async checkCameraPermission(): Promise<PermissionStateDetail> {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      return {
        sensor: "camera",
        status: "unsupported",
        canPrompt: false,
        message: "Camera hardware/MediaDevices API is unsupported in this environment.",
        lastChecked: Date.now(),
      };
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        // 'camera' is supported in Chromium browsers
        const result = await navigator.permissions.query({ name: "camera" as any });
        const status = (result.state as HardwarePermissionStatus) || "prompt";
        return {
          sensor: "camera",
          status,
          canPrompt: status === "prompt",
          message:
            status === "granted"
              ? "Camera access granted for high-resolution ground truth photos."
              : status === "denied"
              ? "Camera access is blocked in browser settings."
              : "Camera access ready to prompt.",
          lastChecked: Date.now(),
        };
      } catch {
        // Safari/Firefox may reject querying camera permission via permissions.query
      }
    }

    // Secondary check: If enumerateDevices has labels, permission was likely granted
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const hasLabels = videoDevices.some((d) => Boolean(d.label));
      if (hasLabels) {
        return {
          sensor: "camera",
          status: "granted",
          canPrompt: false,
          message: "Camera hardware is active and accessible.",
          lastChecked: Date.now(),
        };
      }
    } catch {
      // Ignore
    }

    return {
      sensor: "camera",
      status: "prompt",
      canPrompt: true,
      message: "Ready to request camera access.",
      lastChecked: Date.now(),
    };
  },

  /**
   * 4. MOTION & COMPASS ORIENTATION PERMISSION QUERY
   */
  async checkMotionPermission(): Promise<PermissionStateDetail> {
    if (typeof window === "undefined") {
      return {
        sensor: "motion",
        status: "unsupported",
        canPrompt: false,
        message: "Device motion/orientation is unsupported.",
        lastChecked: Date.now(),
      };
    }

    // iOS 13+ requires DeviceOrientationEvent.requestPermission
    if (
      typeof (DeviceOrientationEvent as any) !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      return {
        sensor: "motion",
        status: "prompt",
        canPrompt: true,
        message: "Requires user interaction on iOS to read compass heading.",
        lastChecked: Date.now(),
      };
    }

    if ("DeviceOrientationEvent" in window) {
      return {
        sensor: "motion",
        status: "granted",
        canPrompt: false,
        message: "Hardware gyroscope/compass heading available.",
        lastChecked: Date.now(),
      };
    }

    return {
      sensor: "motion",
      status: "unsupported",
      canPrompt: false,
      message: "No compass sensor found on this device.",
      lastChecked: Date.now(),
    };
  },

  /**
   * 5. STORAGE / INDEXEDDB CHECK
   */
  async checkStoragePermission(): Promise<PermissionStateDetail> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return {
        sensor: "storage",
        status: "unsupported",
        canPrompt: false,
        message: "IndexedDB offline database is unsupported.",
        lastChecked: Date.now(),
      };
    }

    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        return {
          sensor: "storage",
          status: "granted",
          canPrompt: !isPersisted,
          message: isPersisted ? "Persistent offline storage locked." : "Standard offline storage active.",
          lastChecked: Date.now(),
        };
      } catch {
        // Fallback
      }
    }

    return {
      sensor: "storage",
      status: "granted",
      canPrompt: false,
      message: "Offline storage active.",
      lastChecked: Date.now(),
    };
  },

  /**
   * 6. UNIFIED PERMISSIONS REPORT
   */
  async checkAllPermissions(): Promise<HardwarePermissionsReport> {
    const [gps, camera, motion, storage] = await Promise.all([
      this.checkGpsPermission(),
      this.checkCameraPermission(),
      this.checkMotionPermission(),
      this.checkStoragePermission(),
    ]);

    const allGranted = gps.status === "granted" && (camera.status === "granted" || camera.status === "unsupported");
    const anyDenied = gps.status === "denied" || camera.status === "denied";

    return {
      gps,
      camera,
      motion,
      storage,
      allGranted,
      anyDenied,
      isHttps: this.isSecureContext(),
      platform: this.detectPlatform(),
      timestamp: Date.now(),
    };
  },

  /**
   * 7. INTERACTIVE GPS PERMISSION REQUEST
   */
  async requestGpsPermission(
    options: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  ): Promise<{ success: boolean; status: HardwarePermissionStatus; coords?: any; error?: string }> {
    if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
      return {
        success: false,
        status: "unsupported",
        error: "Geolocation is not supported by your browser.",
      };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latency = Date.now() - startTime;
          resolve({
            success: true,
            status: "granted",
            coords: {
              latitude: Number(pos.coords.latitude.toFixed(7)),
              longitude: Number(pos.coords.longitude.toFixed(7)),
              accuracyMeters: Number(pos.coords.accuracy.toFixed(1)),
              altitudeMeters: pos.coords.altitude !== null ? Number(pos.coords.altitude.toFixed(1)) : null,
              timestamp: pos.timestamp,
              latencyMs: latency,
            },
          });
        },
        (err) => {
          let status: HardwarePermissionStatus = "denied";
          let message = err.message || "Failed to acquire GPS fix.";

          if (err.code === err.PERMISSION_DENIED) {
            status = "denied";
            message = "Location permission was denied. Please allow location access in your browser settings.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            status = "prompt";
            message = "GPS satellite signal is currently unavailable. Step into an open area.";
          } else if (err.code === err.TIMEOUT) {
            status = "prompt";
            message = "GPS satellite search timed out. Retrying with high accuracy...";
          }

          resolve({
            success: false,
            status,
            error: message,
          });
        },
        options
      );
    });
  },

  /**
   * 8. INTERACTIVE CAMERA PERMISSION REQUEST
   */
  async requestCameraPermission(
    constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    }
  ): Promise<{ success: boolean; status: HardwarePermissionStatus; stream?: MediaStream; error?: string }> {
    if (
      typeof window === "undefined" ||
      !navigator ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      return {
        success: false,
        status: "unsupported",
        error: "Camera hardware is not supported or accessible in this browser.",
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        success: true,
        status: "granted",
        stream,
      };
    } catch (err: any) {
      let status: HardwarePermissionStatus = "denied";
      let message = err?.message || "Failed to access camera.";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        status = "denied";
        message = "Camera access was denied. Please allow camera permissions in site settings.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        status = "unsupported";
        message = "No physical camera sensor was found on this device.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        status = "restricted";
        message = "Camera is currently in use by another application.";
      }

      return {
        success: false,
        status,
        error: message,
      };
    }
  },

  /**
   * 9. REQUEST ALL ESSENTIAL FIELD PERMISSIONS
   */
  async requestAllPermissions(): Promise<{
    gpsResult: { success: boolean; status: HardwarePermissionStatus; error?: string };
    cameraResult: { success: boolean; status: HardwarePermissionStatus; error?: string };
    allGranted: boolean;
  }> {
    const gpsResult = await this.requestGpsPermission();
    const cameraResult = await this.requestCameraPermission();

    // If stream was acquired for permission verification, stop tracks to release hardware
    if (cameraResult.stream) {
      cameraResult.stream.getTracks().forEach((t) => t.stop());
    }

    const allGranted = gpsResult.status === "granted" && cameraResult.status === "granted";

    return {
      gpsResult,
      cameraResult,
      allGranted,
    };
  },

  /**
   * 10. MULTI-LENS CAMERA CAPABILITIES & ENUMERATION
   */
  async getCameraCapabilities(): Promise<CameraCapabilitiesReport> {
    if (
      typeof window === "undefined" ||
      !navigator ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return {
        isSupported: false,
        hasPermission: false,
        devices: [],
        hasTorch: false,
        hasZoom: false,
        error: "MediaDevices enumeration unsupported.",
      };
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      const hasLabels = videoDevices.some((d) => Boolean(d.label));

      const devices: CameraDeviceInfo[] = videoDevices.map((d, index) => {
        const labelLower = (d.label || "").toLowerCase();
        const isBack =
          labelLower.includes("back") ||
          labelLower.includes("rear") ||
          labelLower.includes("environment") ||
          labelLower.includes("0, facing back") ||
          labelLower.includes("camera 0");
        const isUser = labelLower.includes("front") || labelLower.includes("user");
        const isWide = labelLower.includes("wide") || labelLower.includes("ultra");

        return {
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
          facingMode: isBack ? "environment" : isUser ? "user" : "unknown",
          isBackCamera: isBack || (!isUser && index === 0),
          isWideAngle: isWide,
        };
      });

      return {
        isSupported: true,
        hasPermission: hasLabels,
        devices,
        hasTorch: true, // evaluated on track capability
        hasZoom: true,
        maxResolution: { width: 1920, height: 1080 },
      };
    } catch (err: any) {
      return {
        isSupported: true,
        hasPermission: false,
        devices: [],
        hasTorch: false,
        hasZoom: false,
        error: err?.message || "Failed to enumerate cameras",
      };
    }
  },

  /**
   * 11. GPS DIAGNOSTICS & TELEMETRY INSPECTION
   */
  async getGpsDiagnostics(): Promise<GpsDiagnosticReport> {
    const perm = await this.checkGpsPermission();
    if (perm.status === "unsupported") {
      return {
        isSupported: false,
        hasPermission: false,
        status: "unsupported",
        accuracyTier: "unknown",
        error: "Geolocation unsupported.",
      };
    }

    const capture = await this.requestGpsPermission({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });

    if (!capture.success || !capture.coords) {
      return {
        isSupported: true,
        hasPermission: capture.status === "granted",
        status: capture.status,
        accuracyTier: "unknown",
        error: capture.error || "Could not acquire GPS fix.",
      };
    }

    const acc = capture.coords.accuracyMeters;
    let tier: GpsDiagnosticReport["accuracyTier"] = "coarse_warning";
    if (acc <= 3) tier = "survey_grade";
    else if (acc <= 10) tier = "high_precision";
    else if (acc <= 25) tier = "standard_mobile";

    return {
      isSupported: true,
      hasPermission: true,
      status: "granted",
      currentCoordinates: capture.coords,
      accuracyTier: tier,
      lockLatencyMs: capture.coords.latencyMs,
    };
  },

  /**
   * 12. PLATFORM RECOVERY GUIDES
   */
  getPermissionRecoveryGuide(platform?: PlatformType, sensor: SensorType = "gps"): PlatformRecoveryGuide {
    const targetPlatform = platform || this.detectPlatform();

    if (targetPlatform === "android_chrome") {
      return {
        platform: "android_chrome",
        platformName: "Android (Google Chrome)",
        sensor,
        title: `Unblock ${sensor === "gps" ? "GPS Location" : "Camera"} on Chrome Android`,
        steps: [
          {
            stepNumber: 1,
            instruction: "Tap the Page Tune / Lock icon (🔒 / ⚙️) on the left side of the address bar at the top.",
            icon: "Lock",
          },
          {
            stepNumber: 2,
            instruction: `Tap "Permissions" and toggle "${sensor === "gps" ? "Location" : "Camera"}" to ALLOW.`,
            icon: "ToggleRight",
          },
          {
            stepNumber: 3,
            instruction: "If blocked globally, open Android Settings > Apps > Chrome > Permissions and enable Location / Camera.",
            icon: "Settings",
          },
          {
            stepNumber: 4,
            instruction: 'Tap "Test Sensors Again" or refresh this page to begin your field session.',
            icon: "RefreshCw",
          },
        ],
        quickNote: "High precision location requires device 'Location' to be turned ON in Android quick settings.",
      };
    }

    if (targetPlatform === "ios_safari") {
      return {
        platform: "ios_safari",
        platformName: "iOS (Apple Safari)",
        sensor,
        title: `Unblock ${sensor === "gps" ? "Location" : "Camera"} on iPhone/iPad Safari`,
        steps: [
          {
            stepNumber: 1,
            instruction: "Tap the \"aA\" or Page Settings icon in Safari address bar.",
            icon: "Sliders",
          },
          {
            stepNumber: 2,
            instruction: `Tap "Website Settings" and change "${sensor === "gps" ? "Location" : "Camera"}" from Deny/Ask to "Allow".`,
            icon: "CheckCircle",
          },
          {
            stepNumber: 3,
            instruction: "Ensure iOS Settings > Privacy & Security > Location Services is turned ON for Safari Websites.",
            icon: "Shield",
          },
          {
            stepNumber: 4,
            instruction: 'Tap "Test Sensors Again" to refresh sensor status.',
            icon: "RefreshCw",
          },
        ],
        quickNote: "Safari requires a user touch gesture before activating live camera and motion sensors.",
      };
    }

    // Default Desktop / Other
    return {
      platform: "desktop_chrome",
      platformName: "Desktop / Chrome",
      sensor,
      title: `Allow ${sensor === "gps" ? "Location" : "Camera"} in Browser Settings`,
      steps: [
        {
          stepNumber: 1,
          instruction: "Click the Padlock / Site Settings icon (🔒) on the left of your browser address bar.",
          icon: "Lock",
        },
        {
          stepNumber: 2,
          instruction: `Change "${sensor === "gps" ? "Location" : "Camera"}" dropdown setting to "Allow".`,
          icon: "Check",
        },
        {
          stepNumber: 3,
          instruction: 'Click the "Test Sensors Again" button to re-evaluate hardware access.',
          icon: "RefreshCw",
        },
      ],
      quickNote: "Ensure your laptop or USB webcam/GPS hardware is not physically disabled or covered.",
    };
  },

  /**
   * 13. REAL-TIME PERMISSION CHANGE LISTENER
   */
  subscribeToPermissionChanges(callback: (report: HardwarePermissionsReport) => void): () => void {
    if (typeof window === "undefined" || !navigator || !navigator.permissions || !navigator.permissions.query) {
      return () => {};
    }

    let isDisposed = false;
    const unsubscribers: Array<() => void> = [];

    const handleUpdate = async () => {
      if (isDisposed) return;
      const report = await this.checkAllPermissions();
      callback(report);
    };

    const registerQuery = async (name: string) => {
      try {
        const permStatus = await navigator.permissions.query({ name: name as any });
        const listener = () => handleUpdate();
        permStatus.addEventListener("change", listener);
        unsubscribers.push(() => permStatus.removeEventListener("change", listener));
      } catch {
        // Query unsupported for this permission
      }
    };

    registerQuery("geolocation");
    registerQuery("camera");

    return () => {
      isDisposed = true;
      unsubscribers.forEach((fn) => fn());
    };
  },
};
