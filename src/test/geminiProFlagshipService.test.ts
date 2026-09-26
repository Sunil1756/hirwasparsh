import { describe, it, expect, beforeEach } from "vitest";
import {
  geminiProFlagshipService,
  GeminiProFlagshipService,
} from "../services/geminiProFlagshipService";

describe("PHASE 11 — Google Gemini 2.5 Pro Flagship Deep Reasoning Service Suite", () => {
  let service: GeminiProFlagshipService;

  beforeEach(() => {
    service = new GeminiProFlagshipService();
  });

  describe("1. Enterprise License Verification & Endpoint Config", () => {
    it("retrieves the active Gemini 2.5 Pro enterprise license with 1M token context", () => {
      const license = service.getLicense();

      expect(license.licenseKey).toContain("GE-ENT-GEMINI-2.5-PRO");
      expect(license.tier).toBe("gemini_2_5_pro_enterprise");
      expect(license.status).toBe("active");
      expect(license.contextWindowTokens).toBe(1048576);
      expect(license.monthlyQuotaLimit).toBe(100000);
      expect(license.dedicatedVertexEndpointUri).toContain("ep-gemini-2.5-pro-dedicated-tpu-v5e");
      expect(license.verraCertificationNumber).toContain("VERRA-VM0047");
      expect(license.bsiAccreditationCode).toContain("BSI-MRV-AUTH");
    });
  });

  describe("2. Multimodal Deep Reasoning Execution & Chain-of-Thought", () => {
    it("executes deep reasoning inspection and generates 5-stage Chain-of-Botanical-Thought", async () => {
      const report = await service.executeDeepReasoningInspection("mockImageSource", "Teak");

      expect(report.inspectionId).toContain("INSP-GEMINI-PRO");
      expect(report.engine).toBe("Google Gemini 2.5 Pro (Flagship Deep Reasoning)");
      expect(report.confidenceScore).toBe(0.994);
      expect(report.tokenConsumption.reasoningThoughtTokens).toBeGreaterThan(500);

      // Verify 5-step CoT
      expect(report.chainOfBotanicalThought.length).toBe(5);
      expect(report.chainOfBotanicalThought[0]).toContain("APG IV Taxonomy");
      expect(report.chainOfBotanicalThought[1]).toContain("Microscopic Foliar Absorbance");
      expect(report.chainOfBotanicalThought[2]).toContain("In-Ground Root Collar");
      expect(report.chainOfBotanicalThought[3]).toContain("IPCC AFOLU Tier 2");
      expect(report.chainOfBotanicalThought[4]).toContain("Verra VM0047 MRV");

      // Verify taxonomy & species resolution
      expect(report.botanicalTaxonomy.speciesCommon).toBe("Teak");
      expect(report.botanicalTaxonomy.speciesScientific).toBe("Tectona grandis");
      expect(report.botanicalTaxonomy.nativeAgroforestryStatus).toBe("CONFIRMED_NATIVE_WESTERN_GHATS");

      // Verify foliar health and anti-fraud
      expect(report.foliarHealthDiagnostics.crownHealthScore).toBe(96);
      expect(report.foliarHealthDiagnostics.chlorophyllIndexSpad).toBe(48.6);
      expect(report.inGroundAntiFraudGate.isInGroundSoilPit).toBe(true);
      expect(report.inGroundAntiFraudGate.isMovablePolybagOrPot).toBe(false);
      expect(report.ipccCarbonAccretion.verraVm0047AuditDigest).toContain("VERRA-VM0047");
    });

    it("handles vernacular species names and accurately computes allometric accretion", async () => {
      const banyanReport = await service.executeDeepReasoningInspection("mockImage", "Vad");
      expect(banyanReport.botanicalTaxonomy.speciesScientific).toBe("Ficus benghalensis");
      expect(banyanReport.ipccCarbonAccretion.annualCarbonSequestrationTonsCo2e).toBe(0.052);
    });
  });
});
