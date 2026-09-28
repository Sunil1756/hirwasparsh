import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  auditBiologicalFeasibility,
  auditGeospatialLandSanity,
  auditCadastralBoundaryOverlap,
  auditBaselineNdviSpectral,
  evaluateProjectVerification,
} from "@/lib/projectVerification";
import { ProjectVerificationCard } from "@/components/ProjectVerificationCard";

describe("Automated AI Project Verification & Anti-Fraud Engine", () => {
  const samplePuneBoundary: [number, number][] = [
    [18.5204, 73.8567],
    [18.5244, 73.8567],
    [18.5244, 73.8617],
    [18.5204, 73.8617],
  ];

  describe("1. Biological Sapling Density Feasibility", () => {
    it("passes feasible density for standard native agroforestry", () => {
      const result = auditBiologicalFeasibility({
        targetTrees: 250,
        acres: 2.5,
        speciesList: ["Neem", "Banyan"],
      });
      expect(result.status).toBe("pass");
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.id).toBe("biological_density");
    });

    it("fails physically impossible sapling densities (anti-fraud protection)", () => {
      const result = auditBiologicalFeasibility({
        targetTrees: 50000,
        acres: 0.5,
        speciesList: ["Neem"],
      });
      expect(result.status).toBe("fail");
      expect(result.score).toBeLessThan(30);
      expect(result.title).toContain("Physically Infeasible");
    });

    it("allows higher density for specialized Miyawaki micro-forests", () => {
      const result = auditBiologicalFeasibility({
        targetTrees: 2000,
        acres: 1.0,
        speciesList: ["Miyawaki Native Mix", "Dense Canopy"],
      });
      expect(result.status).toBe("pass");
      expect(result.score).toBeGreaterThanOrEqual(85);
    });
  });

  describe("2. Geospatial Land Sanity & Boundary Integrity", () => {
    it("passes valid Maharashtra coordinates and enclosed polygon", () => {
      const result = auditGeospatialLandSanity({
        boundary: samplePuneBoundary,
        locationName: "Pune District, Maharashtra",
      });
      expect(result.status).toBe("pass");
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("fails when boundary has fewer than 3 coordinates", () => {
      const result = auditGeospatialLandSanity({
        boundary: [[18.5204, 73.8567]],
        locationName: "Invalid Plot",
      });
      expect(result.status).toBe("fail");
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it("fails when coordinates are invalid or out of global range", () => {
      const result = auditGeospatialLandSanity({
        boundary: [
          [100, 200],
          [110, 200],
          [110, 210],
        ],
        locationName: "Off Planet",
      });
      expect(result.status).toBe("fail");
    });
  });

  describe("3. Cadastral Duplicate Boundary & Overlap Detection", () => {
    it("passes when no overlapping project parcels exist", () => {
      const existingProjects = [
        {
          id: "proj-1",
          project_name: "Solapur Solar Buffer",
          boundary: [
            [17.6599, 75.9064],
            [17.6639, 75.9064],
            [17.6639, 75.9104],
            [17.6599, 75.9104],
          ],
        },
      ];

      const result = auditCadastralBoundaryOverlap({
        currentBoundary: samplePuneBoundary,
        existingProjects,
      });

      expect(result.status).toBe("pass");
      expect(result.score).toBe(100);
    });

    it("detects and flags exact or highly overlapping cadastral plots to prevent duplicate claims", () => {
      const duplicateProject = [
        {
          id: "proj-dup",
          project_name: "Duplicate Claimed Plot",
          boundary: samplePuneBoundary.map(([lat, lng]) => ({ lat, lng })),
        },
      ];

      const result = auditCadastralBoundaryOverlap({
        currentBoundary: samplePuneBoundary,
        existingProjects: duplicateProject,
      });

      expect(result.status).toBe("fail");
      expect(result.title).toContain("Duplicate");
    });
  });

  describe("4. Pre-Planting Baseline NDVI & Remote Sensing Analysis", () => {
    it("evaluates degraded / barren plot as optimal carbon additionality", () => {
      const { check, baselineNdvi, carbonEligibility } = auditBaselineNdviSpectral({
        boundary: samplePuneBoundary,
        speciesList: ["Neem", "Peepal"],
      });

      expect(check).toBeDefined();
      expect(baselineNdvi).toBeGreaterThan(0);
      expect(["High (Prime)", "Moderate (Verified)"]).toContain(carbonEligibility);
    });
  });

  describe("5. Master Project Evaluation & Anti-Fraud Scorecard", () => {
    it("computes comprehensive trust score and audit status for valid plantation", () => {
      const audit = evaluateProjectVerification({
        projectName: "Western Ghats Watershed Restoration",
        organizationName: "Sahyadri Bio Foundation",
        organizationType: "ngo",
        locationName: "Mahabaleshwar, Maharashtra",
        boundary: samplePuneBoundary,
        targetTrees: 500,
        speciesList: ["Neem", "Jamun", "Banyan"],
        evidenceCount: 1,
      });

      expect(audit.overallScore).toBeGreaterThanOrEqual(75);
      expect(audit.status).toBe("verified_active");
      expect(audit.checks.length).toBe(4);
      expect(audit.formattedReport).toContain("OVERALL TRUST SCORE");
    });

    it("requires evidence when evidenceCount is 0", () => {
      const audit = evaluateProjectVerification({
        projectName: "Nashik Green Corridor",
        organizationName: "Nashik Agro FPO",
        organizationType: "farmer_fpo",
        locationName: "Nashik, Maharashtra",
        boundary: samplePuneBoundary,
        targetTrees: 300,
        speciesList: ["Mango", "Teak"],
        evidenceCount: 0,
      });

      expect(audit.status).toBe("evidence_required");
    });
  });

  describe("6. ProjectVerificationCard UI Component", () => {
    it("renders score, badges, and checks correctly", () => {
      const audit = evaluateProjectVerification({
        projectName: "Test Agro Forestry",
        organizationName: "Sahyadri Trust",
        organizationType: "ngo",
        locationName: "Pune, MH",
        boundary: samplePuneBoundary,
        targetTrees: 200,
        speciesList: ["Neem"],
        evidenceCount: 1,
      });

      const onReauditMock = vi.fn();

      render(
        <ProjectVerificationCard
          auditReport={audit}
          onReaudit={onReauditMock}
        />
      );

      expect(screen.getByText(/Automated AI Verification & Anti-Fraud Audit/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Biological Sapling Density/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Geospatial Polygon Sanity/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cadastral Duplicate Audit/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pre-Planting Baseline NDVI/i).length).toBeGreaterThan(0);

      const reauditBtn = screen.getByRole("button", { name: /Re-Audit/i });
      fireEvent.click(reauditBtn);
      expect(onReauditMock).toHaveBeenCalled();
    });
  });
});
