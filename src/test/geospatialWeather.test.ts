import { describe, it, expect, vi } from "vitest";
import {
  MAHARASHTRA_AGRO_CLIMATIC_ZONES,
  resolveAgroClimaticZone,
  fetchAgroWeatherData,
} from "../lib/agroClimaticService";
import {
  computeSentinel2SpectralIndices,
  calculateAgroClimaticDroughtRisk,
  WMO_WEATHER_MAP,
} from "../lib/weatherService";
import {
  applySclCloudMask,
  detectNdviDropAnomaly,
} from "../lib/sentinel2PipelineService";

describe("Phase 3: Maharashtra 9 Official Agro-Climatic Zones Engine", () => {
  it("maintains the full ICAR / MPKV registry of 9 Maharashtra agro-climatic zones", () => {
    expect(MAHARASHTRA_AGRO_CLIMATIC_ZONES).toHaveLength(9);

    MAHARASHTRA_AGRO_CLIMATIC_ZONES.forEach((zone, idx) => {
      expect(zone.zoneNumber).toBe(idx + 1);
      expect(zone.name).toBeTruthy();
      expect(zone.marathiName).toBeTruthy();
      expect(zone.districts.length).toBeGreaterThan(0);
      expect(zone.rainfallRangeMm[0]).toBeLessThan(zone.rainfallRangeMm[1]);
      expect(zone.representativeCentroid[0]).toBeGreaterThan(15.0);
      expect(zone.representativeCentroid[0]).toBeLessThan(22.5);
      expect(zone.representativeCentroid[1]).toBeGreaterThan(72.5);
      expect(zone.representativeCentroid[1]).toBeLessThan(81.0);
      expect(zone.recommendedNativeSpecies.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("resolves Ratnagiri (Konkan Coast) to South Konkan Coastal Zone (Zone 1)", () => {
    const zone = resolveAgroClimaticZone(16.99, 73.30, "Ratnagiri, Maharashtra");
    expect(zone.id).toBe("south_konkan");
    expect(zone.zoneNumber).toBe(1);
    expect(zone.annualRainfallAverageMm).toBeGreaterThanOrEqual(3000);
  });

  it("resolves Thane / Palghar to North Konkan Coastal Zone (Zone 2)", () => {
    const zone = resolveAgroClimaticZone(19.22, 72.98, "Thane, Maharashtra");
    expect(zone.id).toBe("north_konkan");
    expect(zone.zoneNumber).toBe(2);
  });

  it("resolves Mahabaleshwar to Western Ghat Zone (Zone 3)", () => {
    const zone = resolveAgroClimaticZone(17.92, 73.66, "Mahabaleshwar, Maharashtra");
    expect(zone.id).toBe("western_ghats");
    expect(zone.zoneNumber).toBe(3);
    expect(zone.annualRainfallAverageMm).toBe(4000);
  });

  it("resolves Kolhapur to Sub-Montane Zone (Zone 4)", () => {
    const zone = resolveAgroClimaticZone(16.70, 74.24, "Kolhapur");
    expect(zone.id).toBe("sub_montane");
    expect(zone.zoneNumber).toBe(4);
  });

  it("resolves Pune to Plain Zone (Transition Zone 2, Zone 5)", () => {
    const zone = resolveAgroClimaticZone(18.52, 74.50, "Pune District, Maharashtra");
    expect(zone.id).toBe("plain_zone");
    expect(zone.zoneNumber).toBe(5);
  });

  it("resolves Solapur to Scarcity Drought-Prone Zone (Zone 6)", () => {
    const zone = resolveAgroClimaticZone(17.66, 75.91, "Solapur");
    expect(zone.id).toBe("scarcity_zone");
    expect(zone.zoneNumber).toBe(6);
    expect(zone.waterStressVulnerability).toBe("Critical");
    expect(zone.annualRainfallAverageMm).toBeLessThanOrEqual(750);
  });

  it("resolves Chhatrapati Sambhajinagar to Central Maharashtra Plateau Zone (Zone 7)", () => {
    const zone = resolveAgroClimaticZone(19.87, 75.34, "Chhatrapati Sambhajinagar");
    expect(zone.id).toBe("central_plateau");
    expect(zone.zoneNumber).toBe(7);
  });

  it("resolves Nagpur to Central Vidarbha Zone (Zone 8)", () => {
    const zone = resolveAgroClimaticZone(21.15, 78.80, "Nagpur, Maharashtra");
    expect(zone.id).toBe("central_vidarbha");
    expect(zone.zoneNumber).toBe(8);
  });

  it("resolves Gadchiroli to Eastern Vidarbha Zone (Zone 9)", () => {
    const zone = resolveAgroClimaticZone(20.18, 79.99, "Gadchiroli");
    expect(zone.id).toBe("eastern_vidarbha");
    expect(zone.zoneNumber).toBe(9);
    expect(zone.annualRainfallAverageMm).toBeGreaterThanOrEqual(1250);
  });
});

describe("Phase 3: Sentinel-2 Multi-Spectral Indices & Spectral Math", () => {
  it("accurately computes NDVI, NDRE, NDWI, EVI, and SAVI from Sentinel-2 bands", () => {
    const bands = {
      b02_blue: 0.04,
      b03_green: 0.08,
      b04_red: 0.10,
      b05_red_edge: 0.20,
      b08_nir: 0.50,
      b11_swir: 0.15,
      cloud_cover_pct: 0,
    };

    const indices = computeSentinel2SpectralIndices(bands, 1.0);

    // NDVI = (0.50 - 0.10) / (0.50 + 0.10) = 0.40 / 0.60 = 0.6667
    expect(indices.ndvi).toBe(0.6667);

    // NDRE = (0.50 - 0.20) / (0.50 + 0.20) = 0.30 / 0.70 = 0.4286
    expect(indices.ndre).toBe(0.4286);

    // NDWI = (0.08 - 0.50) / (0.08 + 0.50) = -0.42 / 0.58 = -0.7241
    expect(indices.ndwi).toBe(-0.7241);

    expect(indices.evi).toBeGreaterThan(0);
    expect(indices.savi).toBeGreaterThan(0);
    expect(indices.estimatedBiomassMtPerHa).toBeGreaterThan(50);
    expect(indices.totalCarbonStockCo2eMt).toBeGreaterThan(0);
  });

  it("handles all-zero bands without dividing by zero or producing NaN", () => {
    const zeroBands = {
      b02_blue: 0,
      b03_green: 0,
      b04_red: 0,
      b05_red_edge: 0,
      b08_nir: 0,
      b11_swir: 0,
      cloud_cover_pct: 0,
    };

    const indices = computeSentinel2SpectralIndices(zeroBands);
    expect(indices.ndvi).toBe(0);
    expect(indices.ndre).toBe(0);
    expect(indices.ndwi).toBe(0);
    expect(indices.evi).toBe(0);
    expect(indices.savi).toBe(0);
    expect(isNaN(indices.ndvi)).toBe(false);
  });
});

describe("Phase 3: Agricultural Microclimate & Drought Risk Modeling", () => {
  it("evaluates drought risk and thermal stress index correctly", () => {
    // Optimal conditions
    const optimal = calculateAgroClimaticDroughtRisk(25, 15, 0.35, 75);
    expect(optimal.droughtRisk).toBeLessThan(0.4);
    expect(optimal.heatStress).toBe(0);

    // Severe drought and heat stress (Solapur summer: 42°C, 0mm rain, 0.10 soil moisture)
    const severe = calculateAgroClimaticDroughtRisk(42, 0, 0.10, 20);
    expect(severe.droughtRisk).toBeGreaterThan(0.7);
    expect(severe.heatStress).toBeGreaterThan(0.7);
  });

  it("maps WMO meteorological codes to human-readable agricultural conditions", () => {
    expect(WMO_WEATHER_MAP[0]).toBe("Clear Sky");
    expect(WMO_WEATHER_MAP[61]).toBe("Slight Rain");
    expect(WMO_WEATHER_MAP[65]).toBe("Heavy Rain");
    expect(WMO_WEATHER_MAP[95]).toBe("Thunderstorm");
  });
});

describe("Phase 3: Sentinel-2 Cloud Masking & Anomaly Detection", () => {
  it("rejects cloud and cloud-shadow saturated Sentinel-2 scenes via SCL", () => {
    // SCL Class 9 (Cloud High Probability) -> Invalid
    const cloudy = applySclCloudMask(9, 65);
    expect(cloudy.isValid).toBe(false);
    expect(cloudy.maskReason).toContain("SCL Class 9");

    // SCL Class 3 (Cloud Shadow) -> Invalid
    const shadow = applySclCloudMask(3, 20);
    expect(shadow.isValid).toBe(false);

    // SCL Class 4 (Vegetation) with clear sky (2% cloud) -> Valid
    const clear = applySclCloudMask(4, 2);
    expect(clear.isValid).toBe(true);
    expect(clear.cloudShadowPct).toBeLessThanOrEqual(5);
  });

  it("detects anomalous vegetation drops (>20%) across consecutive satellite overpasses", () => {
    // Normal growth: 0.65 -> 0.68
    const normal = detectNdviDropAnomaly(0.68, 0.65);
    expect(normal.isAnomaly).toBe(false);

    // Critical sudden drop: 0.70 -> 0.40 (42.9% drop, possible tree felling or wildfire)
    const anomaly = detectNdviDropAnomaly(0.40, 0.70);
    expect(anomaly.isAnomaly).toBe(true);
    expect(anomaly.severity).toBe("critical");
    expect(anomaly.reason).toContain("Critical NDVI Drop Detected");
  });
});

describe("Phase 3: Weather Provenance & Fallback Transparency", () => {
  it("tags offline fallback telemetry with explicit provenance instead of pretending to be live", async () => {
    // Force network fetch failure to verify transparent fallback behavior
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    try {
      const weather = await fetchAgroWeatherData(17.66, 75.91, "Solapur");
      expect(weather.isLive).toBe(false);
      expect(weather.source).toContain("Regional Climate Baseline");
      expect(weather.provenanceNote).toContain("ICAR/State Department of Agriculture baseline");
      expect(weather.agroClimaticZone.id).toBe("scarcity_zone");
      expect(weather.temperature_c).toBe(31.0); // Scarcity baseline
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
