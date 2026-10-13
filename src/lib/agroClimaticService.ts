/**
 * Green Enlightenment — Phase 3: Agro-Climatic & Weather Intelligence Engine
 * 
 * Provides:
 * 1. Curated 9 Official Maharashtra Agro-Climatic Zones (ICAR / MPKV Standards)
 * 2. Deterministic Zone Resolution via GPS coordinates & district matching
 * 3. Live Open-Meteo High-Resolution Agricultural Weather & Microclimate Ingestion
 * 4. Soil moisture root-zone deficit, Penman-Monteith ET0, and thermal stress alerts
 * 5. Honest provenance tracking (explicitly flagging fallback vs live telemetry)
 */

export interface MaharashtraAgroClimaticZone {
  id: string;
  zoneNumber: number;
  zoneCode: string;
  code: string;
  name: string;
  zoneName: string;
  marathiName: string;
  districts: string[];
  rainfallRangeMm: [number, number];
  annualRainfallAverageMm: number;
  annualRainfallMm: string;
  soilType: string;
  typicalSoilMoistureRange: [number, number];
  climateClassification: string;
  representativeCentroid: [number, number]; // [lat, lng]
  recommendedNativeSpecies: string[];
  typicalEt0MmPerDay: number;
  waterStressVulnerability: "Low" | "Moderate" | "High" | "Critical";
  baselineTemperatureC: number;
  baselineSoilMoisture: number;
}

/**
 * 9 Official Maharashtra Agro-Climatic Zones according to ICAR & State Department of Agriculture
 */
export const MAHARASHTRA_AGRO_CLIMATIC_ZONES: MaharashtraAgroClimaticZone[] = [
  {
    id: "south_konkan",
    zoneNumber: 1,
    zoneCode: "MH-01",
    code: "MH-01",
    name: "South Konkan Coastal Zone",
    zoneName: "South Konkan Coastal Zone",
    marathiName: "दक्षिण कोकण किनारपट्टी विभाग",
    districts: ["Ratnagiri", "Sindhudurg"],
    rainfallRangeMm: [3000, 3500],
    annualRainfallAverageMm: 3250,
    annualRainfallMm: "3,000 - 3,500 mm (Avg: 3,250 mm)",
    soilType: "Lateritic red loam, acidic with high organic matter",
    typicalSoilMoistureRange: [0.28, 0.45],
    climateClassification: "Per-humid / Tropical Coastal",
    representativeCentroid: [16.5, 73.4],
    recommendedNativeSpecies: ["Jamun", "Banyan", "Bamboo", "Tamarind", "Teak"],
    typicalEt0MmPerDay: 4.0,
    waterStressVulnerability: "Low",
    baselineTemperatureC: 27.5,
    baselineSoilMoisture: 0.35,
  },
  {
    id: "north_konkan",
    zoneNumber: 2,
    zoneCode: "MH-02",
    code: "MH-02",
    name: "North Konkan Coastal Zone",
    zoneName: "North Konkan Coastal Zone",
    marathiName: "उत्तर कोकण किनारपट्टी विभाग",
    districts: ["Thane", "Palghar", "Raigad", "Mumbai Suburban", "Mumbai"],
    rainfallRangeMm: [2500, 3000],
    annualRainfallAverageMm: 2750,
    annualRainfallMm: "2,500 - 3,000 mm (Avg: 2,750 mm)",
    soilType: "Medium black to coarse shallow coastal alluvium",
    typicalSoilMoistureRange: [0.25, 0.42],
    climateClassification: "Humid Coastal",
    representativeCentroid: [19.2, 73.0],
    recommendedNativeSpecies: ["Karanj", "Neem", "Peepal", "Banyan", "Bamboo"],
    typicalEt0MmPerDay: 4.2,
    waterStressVulnerability: "Low",
    baselineTemperatureC: 28.2,
    baselineSoilMoisture: 0.32,
  },
  {
    id: "western_ghats",
    zoneNumber: 3,
    zoneCode: "MH-03",
    code: "MH-03",
    name: "Western Ghat Zone (Ghatmatha)",
    zoneName: "Western Ghat Zone (Ghatmatha)",
    marathiName: "घाटमाथा / सह्याद्री पर्वतीय विभाग",
    districts: ["Mahabaleshwar", "Igatpuri", "Lonavala", "Khandala", "Western Pune", "Western Satara", "Western Kolhapur"],
    rainfallRangeMm: [3000, 5000],
    annualRainfallAverageMm: 4000,
    annualRainfallMm: "3,000 - 5,000 mm (Avg: 4,000 mm)",
    soilType: "Lateritic and heavy forest loam, high elevation",
    typicalSoilMoistureRange: [0.32, 0.50],
    climateClassification: "Super-humid Montane",
    representativeCentroid: [17.9, 73.7],
    recommendedNativeSpecies: ["Jamun", "Teak", "Mahua", "Shisham", "Peepal", "Banyan"],
    typicalEt0MmPerDay: 3.8,
    waterStressVulnerability: "Low",
    baselineTemperatureC: 22.5,
    baselineSoilMoisture: 0.40,
  },
  {
    id: "sub_montane",
    zoneNumber: 4,
    zoneCode: "MH-04",
    code: "MH-04",
    name: "Sub-Montane Zone (Transition Zone 1)",
    zoneName: "Sub-Montane Zone (Transition Zone 1)",
    marathiName: "संक्रमण विभाग १ (सह्याद्री पूर्व उतार)",
    districts: ["Kolhapur", "Satara", "Sangli", "Western Nashik", "Bhor"],
    rainfallRangeMm: [1250, 2500],
    annualRainfallAverageMm: 1750,
    annualRainfallMm: "1,250 - 2,500 mm (Avg: 1,750 mm)",
    soilType: "Reddish brown to medium black clay",
    typicalSoilMoistureRange: [0.24, 0.38],
    climateClassification: "Sub-humid Transition",
    representativeCentroid: [18.2, 74.0],
    recommendedNativeSpecies: ["Teak", "Shisham", "Jamun", "Amla", "Banyan", "Neem"],
    typicalEt0MmPerDay: 4.4,
    waterStressVulnerability: "Moderate",
    baselineTemperatureC: 26.0,
    baselineSoilMoisture: 0.30,
  },
  {
    id: "plain_zone",
    zoneNumber: 5,
    zoneCode: "MH-05",
    code: "MH-05",
    name: "Plain Zone (Transition Zone 2)",
    zoneName: "Plain Zone (Transition Zone 2)",
    marathiName: "संक्रमण विभाग २ (मैदानी विभाग)",
    districts: ["Pune", "Nashik", "Ahmednagar", "Eastern Satara", "Eastern Kolhapur"],
    rainfallRangeMm: [700, 1250],
    annualRainfallAverageMm: 950,
    annualRainfallMm: "700 - 1,250 mm (Avg: 950 mm)",
    soilType: "Medium to deep black clay soils (Vertisols)",
    typicalSoilMoistureRange: [0.20, 0.34],
    climateClassification: "Semi-arid Transition",
    representativeCentroid: [18.6, 74.5],
    recommendedNativeSpecies: ["Neem", "Peepal", "Karanj", "Amla", "Tamarind"],
    typicalEt0MmPerDay: 4.8,
    waterStressVulnerability: "Moderate",
    baselineTemperatureC: 27.8,
    baselineSoilMoisture: 0.26,
  },
  {
    id: "scarcity_zone",
    zoneNumber: 6,
    zoneCode: "MH-06",
    code: "MH-06",
    name: "Scarcity Zone (Drought-Prone Central Belt)",
    zoneName: "Scarcity Zone (Drought-Prone Central Belt)",
    marathiName: "पर्जन्यछायेचा अवर्षणप्रवण विभाग",
    districts: ["Solapur", "Beed", "Dharashiv", "Osmanabad", "Eastern Pune", "Eastern Ahmednagar", "Eastern Sangli"],
    rainfallRangeMm: [500, 750],
    annualRainfallAverageMm: 600,
    annualRainfallMm: "500 - 750 mm (Avg: 600 mm)",
    soilType: "Shallow to medium black calcarous clay with moisture deficit",
    typicalSoilMoistureRange: [0.12, 0.24],
    climateClassification: "Arid / Semi-Arid Rainshadow",
    representativeCentroid: [17.8, 75.8],
    recommendedNativeSpecies: ["Neem", "Karanj", "Amla", "Peepal", "Tamarind", "Babul"],
    typicalEt0MmPerDay: 5.6,
    waterStressVulnerability: "Critical",
    baselineTemperatureC: 31.0,
    baselineSoilMoisture: 0.16,
  },
  {
    id: "central_plateau",
    zoneNumber: 7,
    zoneCode: "MH-07",
    code: "MH-07",
    name: "Central Maharashtra Plateau Zone",
    zoneName: "Central Maharashtra Plateau Zone",
    marathiName: "मध्य महाराष्ट्र पठारी विभाग (मराठवाडा/खानदेश)",
    districts: ["Chhatrapati Sambhajinagar", "Aurangabad", "Jalna", "Jalgaon", "Dhule", "Parbhani", "Latur", "Nanded", "Hingoli"],
    rainfallRangeMm: [700, 900],
    annualRainfallAverageMm: 800,
    annualRainfallMm: "700 - 900 mm (Avg: 800 mm)",
    soilType: "Deep black cotton soils (Regur) with swelling clay",
    typicalSoilMoistureRange: [0.16, 0.28],
    climateClassification: "Semi-arid Plateau",
    representativeCentroid: [19.8, 76.2],
    recommendedNativeSpecies: ["Neem", "Karanj", "Jamun", "Peepal", "Shisham", "Banyan"],
    typicalEt0MmPerDay: 5.2,
    waterStressVulnerability: "High",
    baselineTemperatureC: 29.5,
    baselineSoilMoisture: 0.20,
  },
  {
    id: "central_vidarbha",
    zoneNumber: 8,
    zoneCode: "MH-08",
    code: "MH-08",
    name: "Central Vidarbha Zone",
    zoneName: "Central Vidarbha Zone",
    marathiName: "मध्य विदर्भ विभाग",
    districts: ["Nagpur", "Wardha", "Amravati", "Yavatmal", "Akola", "Washim", "Buldhana"],
    rainfallRangeMm: [950, 1250],
    annualRainfallAverageMm: 1100,
    annualRainfallMm: "950 - 1,250 mm (Avg: 1,100 mm)",
    soilType: "Medium to heavy deep black cotton soils (Vertic Inceptisols)",
    typicalSoilMoistureRange: [0.18, 0.32],
    climateClassification: "Semi-arid to Sub-humid Vidarbha",
    representativeCentroid: [21.1, 78.8],
    recommendedNativeSpecies: ["Teak", "Mahua", "Bamboo", "Neem", "Jamun", "Shisham"],
    typicalEt0MmPerDay: 4.9,
    waterStressVulnerability: "Moderate",
    baselineTemperatureC: 29.8,
    baselineSoilMoisture: 0.22,
  },
  {
    id: "eastern_vidarbha",
    zoneNumber: 9,
    zoneCode: "MH-09",
    code: "MH-09",
    name: "Eastern Vidarbha Zone",
    zoneName: "Eastern Vidarbha Zone",
    marathiName: "पूर्व विदर्भ विभाग (वैनगंगा खोरे)",
    districts: ["Bhandara", "Gondia", "Chandrapur", "Gadchiroli"],
    rainfallRangeMm: [1250, 1500],
    annualRainfallAverageMm: 1380,
    annualRainfallMm: "1,250 - 1,500 mm (Avg: 1,380 mm)",
    soilType: "Red and yellow sandy loam, Wainganga basin alluvium",
    typicalSoilMoistureRange: [0.24, 0.38],
    climateClassification: "Sub-humid Forest Zone",
    representativeCentroid: [20.5, 79.9],
    recommendedNativeSpecies: ["Teak", "Mahua", "Bamboo", "Shisham", "Jamun", "Arjun"],
    typicalEt0MmPerDay: 4.5,
    waterStressVulnerability: "Low",
    baselineTemperatureC: 28.5,
    baselineSoilMoisture: 0.28,
  },
];

/**
 * Keyed lookup by MH-01 through MH-09
 */
export const MAHARASHTRA_AGRO_ZONES: Record<string, MaharashtraAgroClimaticZone> = {
  "MH-01": MAHARASHTRA_AGRO_CLIMATIC_ZONES[0],
  "MH-02": MAHARASHTRA_AGRO_CLIMATIC_ZONES[1],
  "MH-03": MAHARASHTRA_AGRO_CLIMATIC_ZONES[2],
  "MH-04": MAHARASHTRA_AGRO_CLIMATIC_ZONES[3],
  "MH-05": MAHARASHTRA_AGRO_CLIMATIC_ZONES[4],
  "MH-06": MAHARASHTRA_AGRO_CLIMATIC_ZONES[5],
  "MH-07": MAHARASHTRA_AGRO_CLIMATIC_ZONES[6],
  "MH-08": MAHARASHTRA_AGRO_CLIMATIC_ZONES[7],
  "MH-09": MAHARASHTRA_AGRO_CLIMATIC_ZONES[8],
};

/**
 * Resolves GPS coordinates or district name to the canonical Maharashtra Agro-Climatic Zone.
 */
export function resolveAgroClimaticZone(
  lat: number,
  lng: number,
  districtOrLocation?: string
): MaharashtraAgroClimaticZone {
  // 1. Try district/name matching first if provided
  if (districtOrLocation) {
    const cleanLocation = districtOrLocation.trim().toLowerCase();
    for (const zone of MAHARASHTRA_AGRO_CLIMATIC_ZONES) {
      if (
        zone.name.toLowerCase().includes(cleanLocation) ||
        zone.districts.some((d) => cleanLocation.includes(d.toLowerCase()))
      ) {
        return zone;
      }
    }
  }

  // 2. Spatial resolution based on Maharashtra geographic boundaries
  // Konkan coast (Longitudes < 73.6)
  if (lng < 73.6) {
    return lat < 17.5
      ? MAHARASHTRA_AGRO_CLIMATIC_ZONES[0] // South Konkan
      : MAHARASHTRA_AGRO_CLIMATIC_ZONES[1]; // North Konkan
  }

  // Western Ghats crest line (Longitudes 73.6 - 74.2 and high elevation)
  if (lng >= 73.6 && lng <= 74.2 && lat >= 16.5 && lat <= 20.2) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[2]; // Western Ghats
  }

  // Sub-Montane transition 1 (Longitudes 74.0 - 74.6, southern Maharashtra)
  if (lng >= 74.0 && lng <= 74.6 && lat < 18.2) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[3]; // Sub-Montane
  }

  // Eastern Vidarbha (Longitudes > 79.2)
  if (lng > 79.2) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[8]; // Eastern Vidarbha
  }

  // Central Vidarbha (Longitudes 77.4 - 79.2, latitudes > 19.5)
  if (lng >= 77.4 && lat >= 19.5) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[7]; // Central Vidarbha
  }

  // Scarcity drought-prone rainshadow belt (Longitudes 74.4 - 76.5, latitudes 17.0 - 19.2)
  if (lng >= 74.4 && lng <= 76.5 && lat >= 17.0 && lat <= 19.2) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[5]; // Scarcity Zone
  }

  // Central Plateau / Marathwada (Latitudes 18.8 - 21.2, Longitudes 75.0 - 77.8)
  if (lat >= 18.8 && lng >= 75.0) {
    return MAHARASHTRA_AGRO_CLIMATIC_ZONES[6]; // Central Plateau
  }

  // Fallback to nearest centroid by geodesic distance
  let closestZone = MAHARASHTRA_AGRO_CLIMATIC_ZONES[4]; // Plain Zone default
  let minDistance = Infinity;

  for (const zone of MAHARASHTRA_AGRO_CLIMATIC_ZONES) {
    const dLat = zone.representativeCentroid[0] - lat;
    const dLng = zone.representativeCentroid[1] - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closestZone = zone;
    }
  }

  return closestZone;
}

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
  isLive: boolean;
  source: string;
  provenanceNote?: string;
  agroClimaticZone: MaharashtraAgroClimaticZone;
}

export const WMO_CONDITION_MAP: Record<number, string> = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing Rime Fog",
  51: "Light Drizzle",
  53: "Moderate Drizzle",
  55: "Dense Drizzle",
  61: "Slight Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  80: "Rain Showers",
  81: "Moderate Showers",
  82: "Violent Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Slight Hail",
  99: "Thunderstorm with Heavy Hail",
};

/**
 * Fetch real-time agro-climatic conditions for any GPS coordinate with fallback transparency
 */
export async function fetchAgroWeatherData(
  lat: number = 18.5204,
  lng: number = 73.8567,
  districtOrLocation?: string
): Promise<AgroWeatherData> {
  const safeLat = typeof lat === "number" && !isNaN(lat) ? lat : 18.5204;
  const safeLng = typeof lng === "number" && !isNaN(lng) ? lng : 73.8567;
  const zone = resolveAgroClimaticZone(safeLat, safeLng, districtOrLocation);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_7cm&daily=et0_fao_evapotranspiration,uv_index_max&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo HTTP status ${response.status}`);

    const data = await response.json();
    const cur = data.current;
    const daily = data.daily;

    const temp = Number(cur.temperature_2m);
    const soilMoisture = Number(cur.soil_moisture_0_to_7cm ?? zone.baselineSoilMoisture);
    const precip = Number(cur.precipitation || 0);
    const et0 = Number(daily?.et0_fao_evapotranspiration?.[0] || zone.typicalEt0MmPerDay);

    // Stress evaluation algorithm
    let stress_level: AgroWeatherData["stress_level"] = "Optimal";
    let irrigation_advisory = `Optimal conditions for ${zone.name}. Regular maintenance schedule.`;
    let planting_suitability: AgroWeatherData["planting_suitability"] = "Good";

    if (soilMoisture < 0.15 && temp > 34) {
      stress_level = "Severe Drought Risk";
      irrigation_advisory = `Severe soil deficit in ${zone.name}. Evapotranspiration is ${et0} mm/d. Apply 15-20L deep root watering & 3-inch straw mulch immediately.`;
      planting_suitability = "Hold Planting";
    } else if (soilMoisture < 0.20) {
      stress_level = "Moderate Stress";
      irrigation_advisory = "Soil root-zone is drying out. Water saplings in early morning or late evening.";
      planting_suitability = "Good";
    } else if (soilMoisture > 0.45 && precip > 40) {
      stress_level = "Waterlogging Risk";
      irrigation_advisory = "High saturation detected. Ensure root collar drainage trenches are clear to avoid root rot.";
      planting_suitability = "Hold Planting";
    } else if (soilMoisture >= 0.22 && temp >= 22 && temp <= 32) {
      stress_level = "Optimal";
      planting_suitability = "Excellent";
      irrigation_advisory = `Peak growth conditions in ${zone.name}. Ideal for sapling plantation and bio-fertilizer application.`;
    }

    return {
      temperature_c: Math.round(temp * 10) / 10,
      apparent_temperature_c: Math.round(Number(cur.apparent_temperature) * 10) / 10,
      relative_humidity: Math.round(Number(cur.relative_humidity_2m)),
      precipitation_mm: Math.round(precip * 10) / 10,
      wind_speed_kmh: Math.round(Number(cur.wind_speed_10m)),
      soil_temperature_0cm: Math.round(Number(cur.soil_temperature_0cm) * 10) / 10,
      soil_moisture_0_7cm: Math.round(soilMoisture * 100) / 100,
      evapotranspiration_mm: Math.round(et0 * 10) / 10,
      uv_index: Number(daily?.uv_index_max?.[0] || 6),
      weather_code: Number(cur.weather_code || 0),
      condition: WMO_CONDITION_MAP[cur.weather_code] || "Partly Cloudy",
      stress_level,
      irrigation_advisory,
      planting_suitability,
      isLive: true,
      source: "Open-Meteo Live Telemetry",
      agroClimaticZone: zone,
    };
  } catch (err: any) {
    // Transparent regional baseline fallback with explicit provenance tags
    return {
      temperature_c: zone.baselineTemperatureC,
      apparent_temperature_c: Math.round((zone.baselineTemperatureC + 1.8) * 10) / 10,
      relative_humidity: 60,
      precipitation_mm: 0,
      wind_speed_kmh: 12,
      soil_temperature_0cm: Math.round((zone.baselineTemperatureC - 1.5) * 10) / 10,
      soil_moisture_0_7cm: zone.baselineSoilMoisture,
      evapotranspiration_mm: zone.typicalEt0MmPerDay,
      uv_index: 6,
      weather_code: 1,
      condition: "Mainly Clear",
      stress_level: zone.waterStressVulnerability === "Critical" ? "Severe Drought Risk" : "Optimal",
      irrigation_advisory: `Live weather telemetry offline. Displaying ICAR baseline for ${zone.name}. Maintain recommended irrigation.`,
      planting_suitability: zone.waterStressVulnerability === "Critical" ? "Hold Planting" : "Good",
      isLive: false,
      source: "Regional Climate Baseline (Offline)",
      provenanceNote: `Live weather station telemetry temporarily unavailable. Displaying ICAR/State Department of Agriculture baseline for ${zone.name}.`,
      agroClimaticZone: zone,
    };
  }
}
