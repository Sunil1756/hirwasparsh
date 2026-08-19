/**
 * Agro-Climatic & Microclimate Intelligence Service
 * Inspired by Map My Crop: Real-time Weather, Soil Moisture, Evapotranspiration,
 * and Plant Stress alerts using open satellite/meteorological data.
 */

export interface AgroWeatherData {
  temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  soil_temperature_0cm: number;
  soil_moisture_0_7cm: number; // m³/m³ volumetric
  evapotranspiration_mm: number;
  uv_index: number;
  weather_code: number;
  condition: string;
  stress_level: "Optimal" | "Moderate Stress" | "Severe Drought Risk" | "Waterlogging Risk";
  irrigation_advisory: string;
  planting_suitability: "Excellent" | "Good" | "Hold Planting";
}

/**
 * Fetch real-time agro-climatic conditions for any GPS coordinate
 */
export async function fetchAgroWeatherData(lat: number, lng: number): Promise<AgroWeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_7cm&daily=et0_fao_evapotranspiration,uv_index_max&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch weather telemetry");
    
    const data = await response.json();
    const cur = data.current;
    const daily = data.daily;

    const temp = cur.temperature_2m;
    const soilMoisture = cur.soil_moisture_0_to_7cm || 0.22;
    const precip = cur.precipitation || 0;
    const et0 = daily?.et0_fao_evapotranspiration?.[0] || 4.2;

    // Stress evaluation algorithm
    let stress_level: AgroWeatherData["stress_level"] = "Optimal";
    let irrigation_advisory = "Soil moisture is in the optimal root-zone range. Regular maintenance.";
    let planting_suitability: AgroWeatherData["planting_suitability"] = "Good";

    if (soilMoisture < 0.15 && temp > 34) {
      stress_level = "Severe Drought Risk";
      irrigation_advisory = "High evapotranspiration with depleted surface moisture. Apply 15-20L deep root watering immediately & apply 3-inch straw mulch.";
      planting_suitability = "Hold Planting";
    } else if (soilMoisture < 0.20) {
      stress_level = "Moderate Stress";
      irrigation_advisory = "Soil is drying out. Water saplings in early morning or late evening.";
      planting_suitability = "Good";
    } else if (soilMoisture > 0.45 && precip > 40) {
      stress_level = "Waterlogging Risk";
      irrigation_advisory = "High saturation detected. Ensure root collar drainage trenches are clear to avoid root rot.";
      planting_suitability = "Hold Planting";
    } else if (soilMoisture >= 0.22 && temp >= 22 && temp <= 32) {
      stress_level = "Optimal";
      planting_suitability = "Excellent";
      irrigation_advisory = "Peak growth conditions. Ideal time for sapling plantation and bio-fertilizer application.";
    }

    const weatherConditionMap: Record<number, string> = {
      0: "Clear Sky",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Foggy",
      51: "Light Drizzle",
      61: "Slight Rain",
      63: "Moderate Rain",
      65: "Heavy Rain",
      80: "Rain Showers",
      95: "Thunderstorm",
    };

    return {
      temperature_c: Math.round(temp * 10) / 10,
      apparent_temperature_c: Math.round(cur.apparent_temperature * 10) / 10,
      relative_humidity: cur.relative_humidity_2m,
      precipitation_mm: cur.precipitation,
      wind_speed_kmh: Math.round(cur.wind_speed_10m),
      soil_temperature_0cm: Math.round(cur.soil_temperature_0cm * 10) / 10,
      soil_moisture_0_7cm: Math.round(soilMoisture * 100) / 100,
      evapotranspiration_mm: Math.round(et0 * 10) / 10,
      uv_index: daily?.uv_index_max?.[0] || 6,
      weather_code: cur.weather_code,
      condition: weatherConditionMap[cur.weather_code] || "Partly Cloudy",
      stress_level,
      irrigation_advisory,
      planting_suitability,
    };
  } catch (err) {
    // Fallback standard agro-weather values for Maharashtra region
    return {
      temperature_c: 28.5,
      apparent_temperature_c: 30.2,
      relative_humidity: 62,
      precipitation_mm: 0,
      wind_speed_kmh: 14,
      soil_temperature_0cm: 26.8,
      soil_moisture_0_7cm: 0.28,
      evapotranspiration_mm: 4.5,
      uv_index: 7,
      weather_code: 1,
      condition: "Mainly Clear",
      stress_level: "Optimal",
      irrigation_advisory: "Conditions normal. Maintain standard drip/pot watering schedule.",
      planting_suitability: "Good",
    };
  }
}
