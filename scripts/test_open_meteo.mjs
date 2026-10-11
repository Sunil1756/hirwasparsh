async function testOpenMeteo() {
  const lat = 18.5204;
  const lng = 73.8567;
  
  // Real Open-Meteo Precision Agricultural Weather API endpoint:
  // Includes current weather, hourly forecast, daily forecast, soil moisture at multiple depths, soil temp, ET0 (evapotranspiration)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,soil_temperature_0cm,soil_temperature_6cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,et0_fao_evapotranspiration&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,uv_index_max&timezone=auto&forecast_days=7`;

  console.log("Testing Open-Meteo Agricultural Weather API...");
  const res = await fetch(url);
  console.log("Status:", res.status);
  const data = await res.json();
  
  console.log("Current Weather:");
  console.log(" - Temp:", data.current?.temperature_2m, "°C (Feels like:", data.current?.apparent_temperature, "°C)");
  console.log(" - Humidity:", data.current?.relative_humidity_2m, "%");
  console.log(" - Precipitation:", data.current?.precipitation, "mm");
  console.log(" - Wind:", data.current?.wind_speed_10m, "km/h");
  console.log(" - WMO Weather Code:", data.current?.weather_code);

  console.log("\nSoil & Agricultural Telemetry (from first hourly point):");
  console.log(" - Soil Moisture (0-1cm topsoil):", data.hourly?.soil_moisture_0_to_1cm?.[0], "m³/m³");
  console.log(" - Soil Moisture (3-9cm root zone):", data.hourly?.soil_moisture_3_to_9cm?.[0], "m³/m³");
  console.log(" - Soil Temp (root zone):", data.hourly?.soil_temperature_6cm?.[0], "°C");
  console.log(" - Evapotranspiration (ET0):", data.hourly?.et0_fao_evapotranspiration?.[0], "mm/h");
  
  console.log("\n7-Day Daily Forecast:");
  data.daily?.time?.slice(0, 5).forEach((t, i) => {
    console.log(` - ${t}: Max ${data.daily.temperature_2m_max[i]}°C, Min ${data.daily.temperature_2m_min[i]}°C, Rain: ${data.daily.precipitation_sum[i]}mm, ET0: ${data.daily.et0_fao_evapotranspiration[i]}mm`);
  });
}

testOpenMeteo();
