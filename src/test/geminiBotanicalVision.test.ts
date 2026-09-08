import { describe, it, expect } from "vitest";
import { analyzeTreePhotoWithBotanicalAi } from "../lib/geminiBotanicalVision";

describe("Gemini Botanical AI & Anti-Fraud Service", () => {
  it("should evaluate a claimed species and return structured botanical taxonomy", async () => {
    const result = await analyzeTreePhotoWithBotanicalAi("test_image_mock_data", "Neem");
    expect(result.isLivingTree).toBe(true);
    expect(result.speciesCommon).toBe("Neem");
    expect(result.speciesScientific).toContain("Azadirachta indica");
    expect(result.crownHealthScore).toBeGreaterThan(50);
    expect(result.vitalityStatus).toBe("healthy");
    expect(result.fraudRiskScore).toBeLessThan(20);
    expect(result.perceptualHash).toBeDefined();
  });

  it("should handle unspecified species with indigenous flora fallback", async () => {
    const result = await analyzeTreePhotoWithBotanicalAi("test_image_mock_data");
    expect(result.isLivingTree).toBe(true);
    expect(result.speciesScientific).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThan(0.7);
  });
});
