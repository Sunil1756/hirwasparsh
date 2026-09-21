/**
 * Green Enlightenment — Weather & Agro-Meteorological Telemetry Service
 * Integrates with Map My Crop API & Supabase Edge Functions for automated agro-climatic checks.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PlotWeatherRecord {
  id: string;
  plot_id?: string | null;
  project_id?: string | null;
  latitude: number;
  longitude: number;
  temperature_celsius: number;
  feels_like_celsius?: number;
  humidity_pct: number;
  precipitation_mm: number;
  precipitation_probability_pct?: number;
  soil_moisture_index: number;
  soil_temp_celsius?: number;
  solar_radiation_wm2?: number;
  wind_speed_kmh: number;
  wind_gust_kmh?: number;
  uv_index?: number;
  weather_condition: string;
  drought_risk_index: number;
  heat_stress_index: number;
  source: string;
  recorded_at: string;
}

export interface RegionalWeatherSummary {
  project_id: string;
  avg_temperature_c: number;
  avg_humidity_pct: number;
  total_precipitation_24h_mm: number;
  avg_soil_moisture: number;
  max_drought_risk: number;
  plots_monitored_count: number;
  latest_observation: string;
}

export interface Sentinel2SpectralBands {
  b02_blue: number;
  b03_green: number;
  b04_red: number;
  b05_red_edge: number;
  b08_nir: number;
  b11_swir: number;
  cloud_cover_pct: number;
}

export interface ComputedSpectralIndices {
  ndvi: number;
  ndre: number;
  ndwi: number;
  evi: number;
  savi: number;
  estimatedBiomassMtPerHa: number;
  totalCarbonStockCo2eMt: number;
}

/**
 * Computes multi-spectral indices (NDVI, NDRE, NDWI, EVI, SAVI) and biomass/carbon stocks
 */
export function computeSentinel2SpectralIndices(
  bands: Sentinel2SpectralBands,
  areaHa: number = 1.0
): ComputedSpectralIndices {
  const { b02_blue, b03_green, b04_red, b05_red_edge, b08_nir } = bands;

  const ndviDenom = b08_nir + b04_red;
  const ndvi = ndviDenom !== 0 ? (b08_nir - b04_red) / ndviDenom : 0;

  const ndreDenom = b08_nir + b05_red_edge;
  const ndre = ndreDenom !== 0 ? (b08_nir - b05_red_edge) / ndreDenom : 0;

  const ndwiDenom = b03_green + b08_nir;
  const ndwi = ndwiDenom !== 0 ? (b03_green - b08_nir) / ndwiDenom : 0;

  const eviDenom = b08_nir + 6.0 * b04_red - 7.5 * b02_blue + 1.0;
  const evi = eviDenom !== 0 ? (2.5 * (b08_nir - b04_red)) / eviDenom : 0;

  const saviDenom = b08_nir + b04_red + 0.5;
  const savi = saviDenom !== 0 ? (1.5 * (b08_nir - b04_red)) / saviDenom : 0;

  const clampedNdvi = Math.max(0, Math.min(1, ndvi));
  const estimatedBiomassMtPerHa = Number((clampedNdvi * 118.5 + Math.max(0, evi) * 38.0).toFixed(2));
  const totalCarbonStockCo2eMt = Number(
    (estimatedBiomassMtPerHa * 0.47 * (44 / 12) * areaHa).toFixed(3)
  );

  return {
    ndvi: Number(ndvi.toFixed(4)),
    ndre: Number(ndre.toFixed(4)),
    ndwi: Number(ndwi.toFixed(4)),
    evi: Number(evi.toFixed(4)),
    savi: Number(savi.toFixed(4)),
    estimatedBiomassMtPerHa,
    totalCarbonStockCo2eMt,
  };
}

/**
 * Calculates standardized agricultural drought risk and thermal stress indices
 */
export function calculateAgroClimaticDroughtRisk(
  temperature: number,
  precipitationMm: number,
  soilMoisture: number,
  humidity: number
): { droughtRisk: number; heatStress: number } {
  const soilDeficit = Math.max(0, Math.min(1, 1 - soilMoisture));
  const thermalFactor = Math.max(0, Math.min(1, (temperature - 26) / 18));
  const precipFactor = Math.max(0, Math.min(1, 1 - precipitationMm / 15));
  const atmosphericVaporDeficit = Math.max(0, Math.min(1, (100 - humidity) / 80));

  const droughtRisk = Number(
    (soilDeficit * 0.35 + thermalFactor * 0.25 + precipFactor * 0.25 + atmosphericVaporDeficit * 0.15).toFixed(3)
  );

  const heatStress = Number(
    Math.max(0, Math.min(1, (temperature - 30) / 15)).toFixed(3)
  );

  return { droughtRisk, heatStress };
}

/**
 * Parses raw Map My Crop / Agro weather API JSON payload
 */
export function parseMapMyCropWeatherPayload(data: any): Partial<PlotWeatherRecord> {
  if (!data) return {};

  const temp = data.temperature_celsius ?? (data.main?.temp ? data.main.temp - 273.15 : 28.0);
  const humidity = data.humidity_pct ?? data.main?.humidity ?? 60;
  const precip = data.precipitation_mm ?? (data.rain?.["1h"] ? data.rain["1h"] * 24 : (data.rain?.["24h"] ?? 0));
  const soilMoist = data.soil_moisture_index ?? data.soil?.moisture ?? 0.45;

  const { droughtRisk, heatStress } = calculateAgroClimaticDroughtRisk(temp, precip, soilMoist, humidity);

  return {
    temperature_celsius: Number(temp.toFixed(1)),
    humidity_pct: Number(humidity.toFixed(1)),
    precipitation_mm: Number(precip.toFixed(1)),
    soil_moisture_index: Number(soilMoist.toFixed(3)),
    weather_condition: data.weather_condition ?? data.weather?.[0]?.main ?? "Clear",
    drought_risk_index: droughtRisk,
    heat_stress_index: heatStress,
    source: "MapMyCrop_API",
  };
}

/**
 * Generates calibrated agro-meteorological simulation for local testing or offline use
 */
export function generateSimulatedWeather(lat: number, lng: number): PlotWeatherRecord {
  const hour = new Date().getUTCHours();
  const diurnalCycle = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
  const temp = Number((27.5 + diurnalCycle * 6.0 + (lat % 2) * 1.2).toFixed(1));
  const humidity = Number((65.0 - diurnalCycle * 16.0).toFixed(1));
  const precip = lat > 19.5 ? 0.0 : 1.5;
  const soilMoist = Number((0.46 - (temp > 32 ? 0.12 : 0) + (precip > 0 ? 0.1 : 0)).toFixed(3));

  const { droughtRisk, heatStress } = calculateAgroClimaticDroughtRisk(temp, precip, soilMoist, humidity);

  return {
    id: `weather-sim-${Date.now()}`,
    latitude: lat,
    longitude: lng,
    temperature_celsius: temp,
    feels_like_celsius: Number((temp + 1.5).toFixed(1)),
    humidity_pct: humidity,
    precipitation_mm: precip,
    soil_moisture_index: soilMoist,
    wind_speed_kmh: 12.5,
    weather_condition: precip > 2 ? "Rain" : temp > 33 ? "Hot" : "Clear",
    drought_risk_index: droughtRisk,
    heat_stress_index: heatStress,
    source: "Calibrated_Agro_Simulation",
    recorded_at: new Date().toISOString(),
  };
}

/**
 * Fetches latest weather observation for a specific plot from Supabase
 */
export async function fetchLatestPlotWeather(plotId: string): Promise<PlotWeatherRecord | null> {
  try {
    const { data, error } = await supabase
      .from("weather_telemetry" as any)
      .select("*")
      .eq("plot_id", plotId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as PlotWeatherRecord;
    }
  } catch (err) {
    console.warn("fetchLatestPlotWeather notice:", err);
  }

  return generateSimulatedWeather(19.9975, 73.7898);
}

/**
 * Fetches historical weather observations for trend visualization
 */
export async function fetchPlotWeatherHistory(
  plotId: string,
  limit: number = 14
): Promise<PlotWeatherRecord[]> {
  try {
    const { data, error } = await supabase
      .from("weather_telemetry" as any)
      .select("*")
      .eq("plot_id", plotId)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as unknown as PlotWeatherRecord[];
    }
  } catch (err) {
    console.warn("fetchPlotWeatherHistory notice:", err);
  }

  // Fallback 7-day trend series
  const fallbackSeries: PlotWeatherRecord[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const item = generateSimulatedWeather(19.9975, 73.7898);
    item.recorded_at = d.toISOString();
    fallbackSeries.push(item);
  }
  return fallbackSeries;
}

/**
 * Invokes the daily-weather-check Supabase Edge Function on demand
 */
export async function triggerManualWeatherSync(): Promise<{
  success: boolean;
  message?: string;
  results?: any;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("daily-weather-check", {
      body: { triggerSource: "manual_dashboard_invocation" },
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, message: err?.message || "Sync failed" };
  }
}

/**
 * Invokes the bulk-satellite-telemetry Supabase Edge Function on demand
 */
export async function triggerBulkSatelliteSync(cloudMaxPct: number = 25): Promise<{
  success: boolean;
  message?: string;
  results?: any;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("bulk-satellite-telemetry", {
      body: { cloud_filter_max_pct: cloudMaxPct, triggerSource: "manual_dashboard_invocation" },
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, message: err?.message || "Sync failed" };
  }
}
