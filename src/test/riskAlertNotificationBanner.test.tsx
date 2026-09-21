import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RiskAlertNotificationBanner } from "@/components/RiskAlertNotificationBanner";

// Mock AuthContext
const mockUser = { id: "test-user-001", email: "adopter@example.com" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock Toast Hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [
          {
            id: "notif-001",
            type: "tree_health_advisory",
            title: "💧 Care Update: Active Hydration Monitoring for Your Neem",
            body: "Our Sentinel-2 AI satellite noticed a brief dry spell in your tree's sector. A ground ranger has already been dispatched with organic bio-mulch. Your tree is actively safeguarded!",
            read: false,
            created_at: new Date().toISOString(),
            data: {
              threat_type: "DROUGHT_SHOCK",
              severity: "HIGH",
              tree_name: "Western Ghats Neem Protector",
              species: "Azadirachta indica",
            },
          },
        ],
        error: null,
      }),
    })),
  },
}));

describe("RiskAlertNotificationBanner UI Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders AI health advisory copy for Tree Adopter role", async () => {
    render(<RiskAlertNotificationBanner role="adopter" />);

    expect(await screen.findByText(/AI Health Advisory/i)).toBeInTheDocument();
    expect(await screen.findByText(/Care Update: Active Hydration Monitoring for Your Neem/i)).toBeInTheDocument();
    expect(await screen.findByText(/Azadirachta indica/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sentinel-2 AI satellite noticed a brief dry spell/i)).toBeInTheDocument();
  });

  it("renders tactical waypoint dispatch banner for Field Worker role", async () => {
    const handleAction = vi.fn();
    render(<RiskAlertNotificationBanner role="field_worker" onSelectAction={handleAction} />);

    expect(await screen.findByText(/Urgent Dispatch Task/i)).toBeInTheDocument();
    expect(await screen.findByText(/Severe Soil Moisture Deficit/i)).toBeInTheDocument();
    expect(await screen.findByText(/Navigate to Waypoint/i)).toBeInTheDocument();

    const navigateBtn = screen.getByRole("button", { name: /Navigate to Waypoint/i });
    fireEvent.click(navigateBtn);

    expect(handleAction).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Waypoint Navigation Active"),
      })
    );
  });

  it("dismisses the alert when the close button is clicked", async () => {
    render(<RiskAlertNotificationBanner role="adopter" />);

    const dismissBtn = await screen.findByRole("button", { name: /Dismiss alert/i });
    fireEvent.click(dismissBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Alert Acknowledged",
      })
    );
  });
});
