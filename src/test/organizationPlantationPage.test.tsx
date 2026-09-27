// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrganizationPlantation from "../pages/OrganizationPlantation";
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";

// Mock leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => <div />,
  Polygon: () => <div />,
  Marker: () => <div />,
}));

vi.mock("@/components/BoundaryDrawMap", () => ({
  default: () => <div>BoundaryDrawMap Mock</div>,
  computeAreas: () => ({ areaHectares: 10, areaAcres: 24.7 }),
}));

describe("Organization Plantation & Public Project Registry Component", () => {
  const queryClient = new QueryClient();

  it("renders OrganizationPlantation without ReferenceError or missing icons", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <BrowserRouter>
              <OrganizationPlantation />
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Large-Scale Plantation Projects/i)).toBeInTheDocument();
  });
});
