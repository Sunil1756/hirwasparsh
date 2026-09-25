import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  hardwarePermissionService,
  PlatformType,
  SensorType,
} from "@/services/hardwarePermissionService";
import { HardwarePermissionSentinel } from "@/components/mobile/HardwarePermissionSentinel";
import { HardwarePermissionModal } from "@/components/mobile/HardwarePermissionModal";
import { FieldCameraViewfinder } from "@/components/mobile/FieldCameraViewfinder";
import { MobileFieldInterface } from "@/components/mobile/MobileFieldInterface";
import { FastTreeRegistrationConsole } from "@/components/mobile/FastTreeRegistrationConsole";
import { FastObservationConsole } from "@/components/mobile/FastObservationConsole";

describe("PHASE 7 TASK 36 — Camera and GPS Permissions Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. HARDWARE PERMISSION SERVICE TESTS
  // ==========================================
  describe("1. Hardware Permission Service & Sensor Diagnostic Engine", () => {
    it("detects platform environments accurately based on User Agent", () => {
      // Default test env
      const platform = hardwarePermissionService.detectPlatform();
      expect(typeof platform).toBe("string");

      const androidGuide = hardwarePermissionService.getPermissionRecoveryGuide("android_chrome", "gps");
      expect(androidGuide.platformName).toContain("Android");
      expect(androidGuide.steps.length).toBeGreaterThanOrEqual(3);

      const iosGuide = hardwarePermissionService.getPermissionRecoveryGuide("ios_safari", "camera");
      expect(iosGuide.platformName).toContain("iOS");
      expect(iosGuide.title).toContain("Camera");

      const desktopGuide = hardwarePermissionService.getPermissionRecoveryGuide("desktop_chrome", "gps");
      expect(desktopGuide.platformName).toContain("Desktop");
    });

    it("evaluates GPS and Camera permission querying gracefully", async () => {
      const gpsState = await hardwarePermissionService.checkGpsPermission();
      expect(["granted", "prompt", "denied", "unsupported"]).toContain(gpsState.status);
      expect(gpsState.sensor).toBe("gps");

      const cameraState = await hardwarePermissionService.checkCameraPermission();
      expect(["granted", "prompt", "denied", "unsupported"]).toContain(cameraState.status);
      expect(cameraState.sensor).toBe("camera");

      const allRep = await hardwarePermissionService.checkAllPermissions();
      expect(allRep.gps).toBeDefined();
      expect(allRep.camera).toBeDefined();
      expect(allRep.storage).toBeDefined();
      expect(typeof allRep.allGranted).toBe("boolean");
    });

    it("requests GPS permission and parses high-precision coordinates", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 18.473521,
            longitude: 73.436102,
            accuracy: 2.4,
            altitude: 620.5,
            altitudeAccuracy: 3.0,
            heading: 90.0,
            speed: 0.0,
          },
          timestamp: Date.now(),
        });
      });

      Object.defineProperty(global.navigator, "geolocation", {
        value: {
          getCurrentPosition: mockGetCurrentPosition,
          watchPosition: vi.fn(),
          clearWatch: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const res = await hardwarePermissionService.requestGpsPermission();
      expect(res.success).toBe(true);
      expect(res.status).toBe("granted");
      expect(res.coords?.latitude).toBe(18.473521);
      expect(res.coords?.accuracyMeters).toBe(2.4);
    });

    it("handles GPS permission denial with appropriate error messaging", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "User denied Geolocation",
        });
      });

      Object.defineProperty(global.navigator, "geolocation", {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
        configurable: true,
      });

      const res = await hardwarePermissionService.requestGpsPermission();
      expect(res.success).toBe(false);
      expect(res.status).toBe("denied");
      expect(res.error).toContain("denied");
    });

    it("requests Camera permission and enumerates multi-lens capabilities", async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ torch: true, zoom: { min: 1, max: 5 } }),
      };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      };

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: "videoinput", deviceId: "cam-back-0", label: "Rear Camera 1x Wide" },
            { kind: "videoinput", deviceId: "cam-back-1", label: "Back Ultra-Wide 0.5x" },
            { kind: "videoinput", deviceId: "cam-front", label: "Front User Camera" },
          ]),
        },
        writable: true,
        configurable: true,
      });

      const camRes = await hardwarePermissionService.requestCameraPermission();
      expect(camRes.success).toBe(true);
      expect(camRes.status).toBe("granted");

      const caps = await hardwarePermissionService.getCameraCapabilities();
      expect(caps.isSupported).toBe(true);
      expect(caps.devices.length).toBe(3);
      expect(caps.devices[0].isBackCamera).toBe(true);
      expect(caps.devices[1].isWideAngle).toBe(true);
    });
  });

  // ==========================================
  // 2. HARDWARE PERMISSION SENTINEL UI TESTS
  // ==========================================
  describe("2. HardwarePermissionSentinel Pill UI", () => {
    it("renders permission status pill and handles click event", async () => {
      const handleOpen = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HardwarePermissionSentinel onOpenModal={handleOpen} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const sentinelBtn = screen.getByRole("button");
        expect(sentinelBtn).toBeInTheDocument();
      });

      const btn = screen.getByRole("button");
      fireEvent.click(btn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 3. HARDWARE PERMISSION MODAL TESTS
  // ==========================================
  describe("3. HardwarePermissionModal Pre-Flight & Troubleshooting", () => {
    it("renders Pre-Flight Checklist with sensor readiness rows and grant buttons", async () => {
      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HardwarePermissionModal isOpen={true} onClose={handleClose} defaultTab="checklist" />
        </QueryClientProvider>
      );

      expect(screen.getByText("Field Sensor Readiness")).toBeInTheDocument();
      expect(screen.getByText(/GPS Geolocation/i)).toBeInTheDocument();
      expect(screen.getByText(/Field Camera/i)).toBeInTheDocument();
      expect(screen.getByText(/Compass Orientation/i)).toBeInTheDocument();
      expect(screen.getByText(/IndexedDB Offline Storage/i)).toBeInTheDocument();
    });

    it("switches to Unblock Guide and toggles platforms and sensor types", async () => {
      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HardwarePermissionModal isOpen={true} onClose={handleClose} defaultTab="troubleshoot" />
        </QueryClientProvider>
      );

      // Verify unblock guide tab is rendered
      expect(screen.getByTestId("troubleshoot-view")).toBeInTheDocument();

      // Switch to iOS Safari
      const iosBtn = screen.getByText(/iOS Safari/i);
      fireEvent.click(iosBtn);
      expect(screen.getByText(/Apple Safari/i)).toBeInTheDocument();

      // Switch to Camera
      const camToggle = screen.getByRole("button", { name: /Camera Access/i });
      fireEvent.click(camToggle);
      expect(screen.getByText(/Unblock Camera/i)).toBeInTheDocument();
    });

    it("switches to Diagnostics tab and views hardware telemetry", async () => {
      const handleClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HardwarePermissionModal isOpen={true} onClose={handleClose} defaultTab="diagnostics" />
        </QueryClientProvider>
      );

      expect(screen.getByTestId("diagnostics-view")).toBeInTheDocument();
      expect(screen.getByText("GPS Hardware Telemetry")).toBeInTheDocument();
      expect(screen.getByText("Camera Sensor Telemetry")).toBeInTheDocument();
    });
  });

  // ==========================================
  // 4. FIELD CAMERA VIEWFINDER TESTS
  // ==========================================
  describe("4. FieldCameraViewfinder In-App Camera", () => {
    it("renders viewfinder, framing reticle, telemetry pill, and captures watermarked photo", async () => {
      const handleClose = vi.fn();
      const handleCapture = vi.fn();

      // Mock media stream
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ torch: true }),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
      };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      };

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
        },
        writable: true,
        configurable: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <FieldCameraViewfinder
            isOpen={true}
            onClose={handleClose}
            onCapture={handleCapture}
            currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.8 }}
            treeCode="GE-2026-000101"
            species="Banyan"
          />
        </QueryClientProvider>
      );

      expect(screen.getByTestId("field-camera-viewfinder")).toBeInTheDocument();
      expect(screen.getByText("±2.8m")).toBeInTheDocument();
      expect(screen.getByText("GE-2026-000101")).toBeInTheDocument();

      // Snap Photo
      const snapBtn = screen.getByTestId("snap-camera-btn");
      fireEvent.click(snapBtn);

      await waitFor(() => {
        expect(screen.getByTestId("confirm-photo-btn")).toBeInTheDocument();
      });

      // Confirm Photo
      const confirmBtn = screen.getByTestId("confirm-photo-btn");
      fireEvent.click(confirmBtn);

      expect(handleCapture).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("renders fallback UI when camera stream encounters an error", async () => {
      const handleClose = vi.fn();
      const handleCapture = vi.fn();
      const handleOpenGuide = vi.fn();

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error("Camera permission denied by user.")),
        },
        writable: true,
        configurable: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <FieldCameraViewfinder
            isOpen={true}
            onClose={handleClose}
            onCapture={handleCapture}
            onOpenPermissionGuide={handleOpenGuide}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("camera-error-fallback")).toBeInTheDocument();
        expect(screen.getByText("Live Camera Blocked")).toBeInTheDocument();
      });

      const guideBtn = screen.getByText("View Permission Unblock Guide");
      fireEvent.click(guideBtn);
      expect(handleOpenGuide).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 5. INTEGRATION IN MOBILE WORKFLOWS
  // ==========================================
  describe("5. Mobile Workflow Permission Integrations", () => {
    it("opens HardwarePermissionModal from MobileFieldInterface", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MobileFieldInterface currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 3.2 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      // Open via Tasks tab sensor inspection card
      const inspectBtn = screen.getByTestId("open-sensor-readiness-btn");
      fireEvent.click(inspectBtn);

      await waitFor(() => {
        expect(screen.getByTestId("hardware-permission-modal")).toBeInTheDocument();
      });
    });

    it("opens FieldCameraViewfinder from FastTreeRegistrationConsole", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <FastTreeRegistrationConsole currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.8 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      const openViewfinderBtn = screen.getByTestId("open-camera-viewfinder-btn");
      fireEvent.click(openViewfinderBtn);

      await waitFor(() => {
        expect(screen.getByTestId("field-camera-viewfinder")).toBeInTheDocument();
      });
    });

    it("opens FieldCameraViewfinder from FastObservationConsole", async () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <FastObservationConsole currentLocation={{ lat: 18.473521, lng: 73.436102, accuracy: 2.8 }} />
          </QueryClientProvider>
        </BrowserRouter>
      );

      const openObsCamBtn = screen.getByTestId("open-obs-viewfinder-btn");
      fireEvent.click(openObsCamBtn);

      await waitFor(() => {
        expect(screen.getByTestId("field-camera-viewfinder")).toBeInTheDocument();
      });
    });
  });
});
