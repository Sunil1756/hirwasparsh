import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TreeProfile from "@/pages/TreeProfile";
import { TreeMonitoringHistoryTimeline } from "@/components/TreeMonitoringHistoryTimeline";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn(),
    },
  };
});

// Mock leaflet & react-leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    flyTo: vi.fn(),
    setView: vi.fn(),
  }),
}));

describe("Task 19 — Tree Detail Page and Monitoring History", () => {
  let queryClient: QueryClient;

  const mockTree = {
    id: "770e8400-e29b-41d4-a716-446655440001",
    tree_code: "GE-2026-000001",
    project_id: "proj-123",
    species: "Azadirachta indica",
    tree_name: "Holy Neem #1",
    botanical_name: "Azadirachta indica A. Juss.",
    plantation_date: "2026-01-15T10:00:00Z",
    latitude: 18.52043,
    longitude: 73.856744,
    elevation_m: 560,
    height_cm: 125,
    dbh_cm: 4.5,
    location: "Pune Green Corridor Sector 4",
    photo_url: "https://example.com/photos/neem_initial.jpg",
    before_photo_url: "https://example.com/photos/neem_before.jpg",
    selfie_photo_url: "https://example.com/photos/planter_selfie.jpg",
    status: "thriving",
    verification_status: "verified",
    admin_status: "approved",
    ai_detected_species: "Azadirachta indica (Neem)",
    ai_scientific_name: "Azadirachta indica",
    ai_confidence: 96,
    ai_analysis: "Healthy apical meristem development with uniform leaflet chlorophyl density.",
    created_at: "2026-01-15T10:05:00Z",
    user_id: "user-planter-01",
  };

  const mockPlanter = {
    full_name: "Aarav Deshmukh",
    organization_name: "Sahyadri Agro Forestry",
  };

  const mockProject = {
    id: "proj-123",
    name: "Pune Western Ghats Reforestation Drive",
    location_name: "Pune, Maharashtra",
  };

  const mockObservations = [
    {
      id: "obs-1",
      tree_id: "770e8400-e29b-41d4-a716-446655440001",
      observation_date: "2026-02-15T09:00:00Z",
      height_cm: 140,
      canopy_width_cm: 45,
      dbh_cm: 4.8,
      health_status: "healthy",
      condition_notes: "Strong stem elongation observed post winter dormancy.",
      photo_url: "https://example.com/photos/obs1.jpg",
      ai_health_score: 94,
      created_at: "2026-02-15T09:00:00Z",
    },
  ];

  const mockPhotos = [
    {
      id: "photo-1",
      tree_id: "770e8400-e29b-41d4-a716-446655440001",
      photo_url: "https://example.com/photos/obs1.jpg",
      evidence_type: "growth_photo",
      caption: "Month 1 biometric visual inspection",
      sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      created_at: "2026-02-15T09:00:00Z",
      storage_bucket: "evidence-photos",
      storage_path: "trees/770e8400/obs1.jpg",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "trees") {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
            }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPlanter, error: null }),
            }),
          }),
        };
      }
      if (table === "projects") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
            }),
          }),
        };
      }
      if (table === "tree_observations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockObservations, error: null }),
            }),
          }),
        };
      }
      if (table === "tree_photos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
            }),
          }),
        };
      }
      if (table === "tree_health_updates" || table === "growth_updates") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });
  });

  it("renders Tree Detail Page with all core fields: Tree ID, species, plantation date, location, initial photo, status, and timeline", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/tree/GE-2026-000001"]}>
            <Routes>
              <Route path="/tree/:id" element={<TreeProfile />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>
    );

    // 1. Check Tree ID
    await waitFor(() => {
      expect(screen.getAllByText("GE-2026-000001").length).toBeGreaterThan(0);
    });

    // 2. Check Species and Botanical Name
    expect(screen.getAllByText(/Azadirachta indica/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Holy Neem #1")).toBeDefined();

    // 3. Check Location and Coordinates
    expect(screen.getByText("Pune Green Corridor Sector 4")).toBeDefined();
    expect(screen.getByText(/18.520430°, 73.856744°/i)).toBeDefined();
    expect(screen.getByText(/560m MSL/i)).toBeDefined();

    // 4. Check Planter and Organization (async resolution)
    await waitFor(() => {
      expect(screen.getByText(/Aarav Deshmukh/i)).toBeDefined();
      expect(screen.getByText(/Sahyadri Agro Forestry/i)).toBeDefined();
    });

    // 5. Check Verification and Health Status Badges
    expect(screen.getAllByText(/Thriving/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Verified/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Admin approved/i)).toBeDefined();

    // 6. Check Biometrics (Height & DBH)
    expect(screen.getByText(/125 cm height/i)).toBeDefined();
    expect(screen.getByText(/4.5 cm DBH/i)).toBeDefined();

    // 7. Check AI Health Score & Environmental Impact
    expect(screen.getByText(/AI Tree Health & Vitality Score/i)).toBeDefined();
    expect(screen.getByText(/Verifiable Environmental & Carbon Impact/i)).toBeDefined();
    expect(screen.getByText(/CO₂ absorbed/i)).toBeDefined();

    // 8. Check Digital Tree Passport & QR
    expect(screen.getByText(/Digital Tree Passport/i)).toBeDefined();
    expect(screen.getByText(/Planter Selfie Evidence/i)).toBeDefined();

    // 9. Check Monitoring History Timeline integration
    await waitFor(() => {
      expect(screen.getByText(/Monitoring History & Audit Timeline/i)).toBeDefined();
      expect(screen.getByText(/Initial Tree Plantation & Registration/i)).toBeDefined();
      expect(screen.getByText(/Biometric Field Observation/i)).toBeDefined();
    });
  });

  it("handles copy Tree ID and digital passport sharing interactions gracefully", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/tree/GE-2026-000001"]}>
            <Routes>
              <Route path="/tree/:id" element={<TreeProfile />} />
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("GE-2026-000001").length).toBeGreaterThan(0);
    });

    const copyBtn = screen.getByLabelText("Copy Tree ID");
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("GE-2026-000001");
  });

  it("renders TreeMonitoringHistoryTimeline component with observations, photos, and biometric metrics", () => {
    render(
      <TreeMonitoringHistoryTimeline
        treeId="770e8400-e29b-41d4-a716-446655440001"
        plantationDate="2026-01-15T10:00:00Z"
        initialPhotoUrl="https://example.com/photos/neem_initial.jpg"
        species="Azadirachta indica"
        observations={mockObservations as any}
        photos={mockPhotos as any}
      />
    );

    expect(screen.getByText(/Monitoring History & Audit Timeline/i)).toBeDefined();
    expect(screen.getByText(/Initial Tree Plantation & Registration/i)).toBeDefined();
    expect(screen.getByText(/Biometric Field Observation/i)).toBeDefined();
    expect(screen.getByText(/140 cm/i)).toBeDefined();
    expect(screen.getByText(/45 cm/i)).toBeDefined();
    expect(screen.getByText(/Strong stem elongation observed post winter dormancy./i)).toBeDefined();
  });
});
