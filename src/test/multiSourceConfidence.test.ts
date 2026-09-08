import { describe, it, expect } from "vitest";
import {
  computeMultiSourceConfidenceScore,
  calculateTimeDecayPenalty,
} from "../lib/multiSourceConfidenceEngine";
import {
  applySclCloudMask,
  detectNdviDropAnomaly,
  generatePilotOverpasses,
} from "../lib/sentinel2PipelineService";

describe("Multi-Source Fusion & Confidence Scoring Engine", () => {
  it("calculates zero decay penalty within the 30-day grace period", () => {
    const decay0 = calculateTimeDecayPenalty(10);
    expect(decay0.penalty).toBe(0);
    expect(decay0.isDecayed).toBe(false);

    const decay30 = calculateTimeDecayPenalty(30);
    expect(decay30.penalty).toBe(0);
    expect(decay30.isDecayed).toBe(false);
  });

  it("calculates correct time decay penalty past the 30-day threshold", () => {
    // 60 days = 30 overdue days * 0.15 = 4.5 pts
    const decay60 = calculateTimeDecayPenalty(60);
    expect(decay60.penalty).toBe(4.5);
    expect(decay60.isDecayed).toBe(true);

    // 90 days = 60 overdue days * 0.15 = 9.0 pts
    const decay90 = calculateTimeDecayPenalty(90);
    expect(decay90.penalty).toBe(9.0);

    // Cap penalty at max 25.0 pts
    const decay300 = calculateTimeDecayPenalty(300);
    expect(decay300.penalty).toBe(25.0);
  });

  it("computes Gold Tier (80-100%) score for verified plot with satellite, drone, and field photos", () => {
    const today = new Date().toISOString();
    const result = computeMultiSourceConfidenceScore({
      totalPlantedTrees: 50,
      satelliteOverpasses: [
        { acquisition_date: "2026-01-01", ndvi: 0.65 },
        { acquisition_date: "2026-02-01", ndvi: 0.72 },
        { acquisition_date: "2026-03-01", ndvi: 0.78 },
      ],
      droneSurveys: [
        {
          survey_date: today,
          tree_count_detected: 50,
          resolution_cm_per_px: 2.5,
        },
      ],
      fieldPhotos: [
        { checked_at: today, status: "alive", ai_confidence: 96, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 94, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 95, is_verified: true },
        { checked_at: today, status: "healthy", ai_confidence: 98, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 92, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 95, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 96, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 94, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 95, is_verified: true },
        { checked_at: today, status: "alive", ai_confidence: 97, is_verified: true },
      ],
    });

    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.tier).toBe("zero_greenwashing_gold");
    expect(result.isVerifiedForCarbonMRV).toBe(true);
    expect(result.isDemoOrUnverified).toBe(false);
    expect(result.breakdown.satellite.score).toBe(20);
    expect(result.breakdown.drone.score).toBe(30);
    expect(result.breakdown.timeDecay.penaltyPoints).toBe(0);
  });

  it("classifies satellite-only plot as unverified for individual tree carbon credits", () => {
    const result = computeMultiSourceConfidenceScore({
      totalPlantedTrees: 100,
      satelliteOverpasses: [
        { acquisition_date: "2026-02-01", ndvi: 0.72 },
      ],
      fieldPhotos: [],
    });

    expect(result.tier).toBe("satellite_only");
    expect(result.isVerifiedForCarbonMRV).toBe(false);
    expect(result.breakdown.satellite.score).toBe(14);
    expect(result.breakdown.fieldPhoto.score).toBe(0);
  });

  it("applies SCL cloud masking properly to defective/cloud pixels", () => {
    // SCL Class 4 (Vegetation) with low cloud -> Valid
    const validMask = applySclCloudMask(4, 5.0);
    expect(validMask.isValid).toBe(true);

    // SCL Class 3 (Cloud Shadow) -> Invalid
    const shadowMask = applySclCloudMask(3, 10.0);
    expect(shadowMask.isValid).toBe(false);

    // SCL Class 8 (Medium Cloud) -> Invalid
    const cloudMask = applySclCloudMask(8, 20.0);
    expect(cloudMask.isValid).toBe(false);
  });

  it("detects NDVI drop anomaly when vegetation drops > 20%", () => {
    // Drop from 0.80 to 0.58 = -27.5% drop -> High anomaly
    const anomaly = detectNdviDropAnomaly(0.58, 0.80, 20.0);
    expect(anomaly.isAnomaly).toBe(true);
    expect(anomaly.dropPct).toBe(-27.5);
    expect(anomaly.severity).toBe("high");

    // Small drop from 0.80 to 0.76 = -5.0% -> Normal
    const normal = detectNdviDropAnomaly(0.76, 0.80, 20.0);
    expect(normal.isAnomaly).toBe(false);
  });

  it("generates 7 verified pilot overpasses for VarshikVruksha Ropan 2k26", () => {
    const passes = generatePilotOverpasses("varshik-vruksha-2k26");
    expect(passes.length).toBe(7);
    expect(passes[passes.length - 1].ndvi).toBe(0.83);
    expect(passes[0].satellite_source).toBe("copernicus_sentinel2_l2a");
  });
});
