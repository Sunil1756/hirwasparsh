import { describe, it, expect, beforeEach } from "vitest";
import {
  greenEnlightenmentAiModelService,
  GreenEnlightenmentAiModelService,
  MAHARASHTRA_NATIVE_SPECIES_DB,
  ModelExecutionEngine,
} from "../services/greenEnlightenmentAiModelService";

describe("PHASE 11 — Green Enlightenment AI Model & Multimodal Vision Engine Suite", () => {
  let service: GreenEnlightenmentAiModelService;

  beforeEach(() => {
    service = new GreenEnlightenmentAiModelService();
  });

  describe("1. Maharashtra & Western Ghats Native Species Catalog", () => {
    it("contains complete botanical taxonomy, vernacular names, and allometric constants for native species", () => {
      const speciesKeys = Object.keys(MAHARASHTRA_NATIVE_SPECIES_DB);
      expect(speciesKeys.length).toBeGreaterThanOrEqual(7);

      for (const [key, profile] of Object.entries(MAHARASHTRA_NATIVE_SPECIES_DB)) {
        expect(key).toBe(profile.scientificName);
        expect(profile.commonName.length).toBeGreaterThan(2);
        expect(profile.botanicalFamily.length).toBeGreaterThan(2);
        expect(profile.marathiName.length).toBeGreaterThan(2);
        expect(profile.hindiName.length).toBeGreaterThan(2);
        expect(profile.isNativeToWesternGhatsOrDeccan).toBe(true);
        expect(profile.expectedAnnualCo2Kg).toBeGreaterThan(10);
        expect(profile.typicalLifespanYears).toBeGreaterThan(50);
        expect(profile.woodDensityGPerCm3).toBeGreaterThan(0.5);
      }
    });

    it("verifies accurate botanical family assignments under APG IV taxonomy", () => {
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Azadirachta indica"].botanicalFamily).toBe("Meliaceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Tectona grandis"].botanicalFamily).toBe("Lamiaceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Ficus benghalensis"].botanicalFamily).toBe("Moraceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Santalum album"].botanicalFamily).toBe("Santalaceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Madhuca longifolia"].botanicalFamily).toBe("Sapotaceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Dalbergia sissoo"].botanicalFamily).toBe("Fabaceae");
      expect(MAHARASHTRA_NATIVE_SPECIES_DB["Syzygium cumini"].botanicalFamily).toBe("Myrtaceae");
    });
  });

  describe("2. Multimodal Botanical Vision Inspection Execution", () => {
    it("executes full inspection on standard Gemini 2.5 Flash engine", async () => {
      const report = await service.executeFullInspection(
        "data:image/jpeg;base64,mockFieldPhoto001",
        "Neem",
        "gemini-2.5-flash"
      );

      expect(report.inspectionId).toContain("INSP-GE-AI");
      expect(report.engineUsed).toBe("gemini-2.5-flash");
      expect(report.confidenceScore).toBe(0.94);
      expect(report.tokenCostUsd).toBe(0.00015);
      expect(report.species.commonName).toBe("Neem");
      expect(report.species.scientificName).toBe("Azadirachta indica");
      expect(report.vitality.vitalityStatus).toBe("thriving");
      expect(report.vitality.crownHealthScore).toBe(92);
      expect(report.vitality.chlorophyllColorRating).toBe("dense_green");
      expect(report.vitality.stemLignification).toBe("woody");
      expect(report.vitality.activeApicalGrowthDetected).toBe(true);
      expect(report.antiFraud.isGenuineInGroundSoilPit).toBe(true);
      expect(report.antiFraud.isNurseryPolybagOrPot).toBe(false);
      expect(report.antiFraud.fraudRiskLevel).toBe("safe");
      expect(report.verraComplianceDigest).toContain("VERRA-VM0047");
    });

    it("executes deep reasoning inspection on Gemini 2.5 Pro with elevated confidence and cost metrics", async () => {
      const report = await service.executeFullInspection(
        "data:image/jpeg;base64,mockFieldPhoto002",
        "Teak",
        "gemini-2.5-pro"
      );

      expect(report.engineUsed).toBe("gemini-2.5-pro");
      expect(report.confidenceScore).toBe(0.985);
      expect(report.tokenCostUsd).toBe(0.00125);
      expect(report.species.scientificName).toBe("Tectona grandis");
      expect(report.species.marathiName).toContain("सागवान");
      expect(report.speciesCandidates[0].probability).toBe(0.985);
    });

    it("executes custom SFT model inspection on GE-BioVision-SFT v1.0 with ultra-fast latency & native domain precision", async () => {
      const report = await service.executeFullInspection(
        "data:image/jpeg;base64,mockFieldPhoto003",
        "Banyan",
        "ge-biovision-sft-v1"
      );

      expect(report.engineUsed).toBe("ge-biovision-sft-v1");
      expect(report.confidenceScore).toBe(0.992);
      expect(report.tokenCostUsd).toBe(0.00045);
      expect(report.species.scientificName).toBe("Ficus benghalensis");
      expect(report.species.expectedAnnualCo2Kg).toBe(52.0);
    });

    it("gracefully resolves species when search query has partial or case-insensitive string matches", async () => {
      const report1 = await service.executeFullInspection("mockImg", "sandalwood", "gemini-2.5-flash");
      expect(report1.species.scientificName).toBe("Santalum album");

      const report2 = await service.executeFullInspection("mockImg", "Jambhul", "gemini-2.5-flash");
      expect(report2.species.scientificName).toBe("Syzygium cumini");

      const report3 = await service.executeFullInspection("mockImg", "UnknownFlora", "gemini-2.5-flash");
      expect(report3.species.scientificName).toBe("Azadirachta indica"); // Fallback
    });
  });

  describe("3. IPCC AFOLU Tier 2 Allometric Biomass & Carbon Accretion", () => {
    it("calculates aboveground biomass and carbon accretion using species wood density constants", async () => {
      const neemReport = await service.executeFullInspection("mockImg", "Neem", "gemini-2.5-flash");
      expect(neemReport.allometricBiomass.estimatedAboveGroundBiomassKg).toBeGreaterThan(0);
      expect(neemReport.allometricBiomass.annualCarbonAccretionTonsCo2e).toBe(0.0285);
      expect(neemReport.allometricBiomass.ipccMethodologyTier).toBe("Tier 2 Allometric Species Constant");

      const banyanReport = await service.executeFullInspection("mockImg", "Banyan", "gemini-2.5-flash");
      expect(banyanReport.allometricBiomass.annualCarbonAccretionTonsCo2e).toBe(0.052);
    });
  });

  describe("4. Microscopic Pathology Diagnostics & Prescriptions", () => {
    it("returns prophylactic organic remedies (NSKE & dry leaf mulch) for pest resilience", async () => {
      const report = await service.executeFullInspection("mockImg", "Shisham", "gemini-2.5-flash");
      expect(report.pathology.diseaseOrPestDetected).toBe(false);
      expect(report.pathology.organicRemedies.length).toBeGreaterThanOrEqual(2);
      expect(report.pathology.organicRemedies.some((r) => r.includes("NSKE"))).toBe(true);
      expect(report.pathology.preventativeMeasures.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("5. Vertex AI SFT Training Dataset Generator & JSONL Exporter", () => {
    it("generates structured SFT training pairs with verified ground-truth metadata", () => {
      const pairs = service.generateSftDataset(10);
      expect(pairs.length).toBe(10);

      pairs.forEach((pair, idx) => {
        expect(pair.id).toBe(`SFT-PAIR-${(idx + 1).toString().padStart(4, "0")}`);
        expect(pair.imageUrl).toContain("hirwasparsh-sft-vault");
        expect(pair.prompt).toContain("Verra VM0047");
        expect(pair.completionJson.species_scientific).toBeDefined();
        expect(pair.completionJson.is_in_ground_pit).toBe(true);
        expect(pair.completionJson.polybag_fraud_detected).toBe(false);
        expect(pair.groundTruthVerifiedBy).toContain("Botanical Survey of India");
      });
    });

    it("exports valid Gemini-compliant JSONL training stream format", () => {
      const pairs = service.generateSftDataset(3);
      const jsonl = service.exportSftJsonl(pairs);

      const lines = jsonl.split("\n");
      expect(lines.length).toBe(3);

      lines.forEach((line) => {
        const parsed = JSON.parse(line);
        expect(parsed.contents).toBeDefined();
        expect(parsed.contents.length).toBe(2);
        expect(parsed.contents[0].role).toBe("user");
        expect(parsed.contents[0].parts[0].text).toContain("Maharashtra, India");
        expect(parsed.contents[0].parts[1].file_data.file_uri).toContain("hirwasparsh-sft-vault");
        expect(parsed.contents[1].role).toBe("model");

        const modelCompletion = JSON.parse(parsed.contents[1].parts[0].text);
        expect(modelCompletion.verra_compliance).toBe("VERRA_VM0047_ELIGIBLE");
      });
    });
  });
});
