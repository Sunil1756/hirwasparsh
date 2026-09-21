import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import RBACRoleSwitcherBar from "@/components/RBACRoleSwitcherBar";
import FieldWorkerDashboard from "@/pages/FieldWorkerDashboard";
import TreeAdopterDashboard from "@/pages/TreeAdopterDashboard";
import CSRCorporatePortal from "@/pages/CSRCorporatePortal";
import NGOWorkspacePage from "@/pages/NGOWorkspacePage";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

describe("Navigation, RBAC Routing & Multi-Device Responsiveness Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Navbar Desktop & Mobile Navigation", () => {
    it("renders brand logo, primary navigation links and language switcher", () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <Navbar />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText("Green Enlightenment")).toBeDefined();
      expect(screen.getByText("Tree Map")).toBeDefined();
      expect(screen.getByText("AI")).toBeDefined();
    });

    it("has accessible mobile toggle button for mobile/tablet screen sizes", () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <Navbar />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      const toggleButton = screen.getByLabelText("Toggle menu");
      expect(toggleButton).toBeDefined();

      // Click mobile hamburger menu
      fireEvent.click(toggleButton);
      expect(screen.getByText("Main Menu")).toBeDefined();
      expect(screen.getByText("Institutional & B2B Portals")).toBeDefined();
    });
  });

  describe("2. Footer Navigation & ESG Compliance Links", () => {
    it("renders comprehensive footer with B2B, platform, and MRV standards", () => {
      render(
        <BrowserRouter>
          <Footer />
        </BrowserRouter>
      );

      expect(screen.getAllByText("Green Enlightenment").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Platform & Tools/i)).toBeDefined();
      expect(screen.getByText(/Institutional & ESG/i)).toBeDefined();
      expect(screen.getByText(/SEBI BRSR Core Principle 6 & Verra VM0047 Compliant/i)).toBeDefined();
      expect(screen.getByText(/CSR Carbon & ESG Portal/i)).toBeDefined();
      expect(screen.getByText(/NGO Operator Command Center/i)).toBeDefined();
    });
  });

  describe("3. RoleProtectedRoute Gating", () => {
    it("redirects unauthenticated users to login with redirect URL query parameter", async () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <MemoryRouter initialEntries={["/field-worker"]}>
                <Routes>
                  <Route
                    path="/field-worker"
                    element={
                      <RoleProtectedRoute requiredRole="field_worker">
                        <div>Secret Field Worker Content</div>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route path="/login" element={<div>Login Page Redirect Target</div>} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Login Page Redirect Target")).toBeDefined();
      });
    });
  });

  describe("4. Distinct Persona Dashboards Component Integrity", () => {
    it("renders FieldWorkerDashboard without throwing errors", () => {
      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <FieldWorkerDashboard />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(container).toBeDefined();
      expect(screen.getByText("Field Scout & Ranger Console")).toBeDefined();
      expect(screen.getAllByText(/5% Cochran/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Ground Truth Survival Calculator/i)).toBeDefined();
    });

    it("renders TreeAdopterDashboard without throwing errors", () => {
      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <TreeAdopterDashboard />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(container).toBeDefined();
      expect(screen.getByText("Citizen Adopter Sanctuary")).toBeDefined();
      expect(screen.getByText("CO₂e Sequestered")).toBeDefined();
      expect(screen.getByText("My Adopted Canopy Portfolio")).toBeDefined();
    });

    it("renders CSRCorporatePortal without throwing errors", () => {
      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <CSRCorporatePortal />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(container).toBeDefined();
      expect(screen.getByText("CSR & ESG Carbon Intelligence Portal")).toBeDefined();
      expect(screen.getByText(/SEBI BRSR Core Principle 6/i)).toBeDefined();
      expect(screen.getByText("Sponsored Plantation Projects")).toBeDefined();
    });

    it("renders NGOWorkspacePage without throwing errors", () => {
      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <NGOWorkspacePage />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      );

      expect(container).toBeDefined();
      expect(screen.getByText("NGO & Project Operator Command Center")).toBeDefined();
      expect(screen.getByText("Afforestation Parcels & Plots")).toBeDefined();
    });
  });
});
