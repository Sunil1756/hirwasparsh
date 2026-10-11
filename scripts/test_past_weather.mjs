async function testPastWeather() {
  const lat = 18.5204;
  const lng = 73.8567;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&past_days=7&forecast_days=1&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,weather_code&timezone=auto`;
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("Past 7 days weather status:", res.status);
  console.log("Past days returned:", data.daily?.time);
  data.daily?.time?.forEach((date, i) => {
    console.log(` - ${date}: Max ${data.daily.temperature_2m_max[i]}°C, Min ${data.daily.temperature_2m_min[i]}°C, Rain: ${data.daily.precipitation_sum[i]}mm, ET0: ${data.daily.et0_fao_evapotranspiration[i]}mm`);
  });
}

testPastWeather();
