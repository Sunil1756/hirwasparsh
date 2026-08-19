import { useState, useEffect } from "react";
import { Cloud, Droplets, Thermometer, Wind, Sun, Compass, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { fetchAgroWeatherData, AgroWeatherData } from "@/lib/agroClimaticService";
import { Badge } from "@/components/ui/badge";

interface Props {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export function AgroWeatherWidget({ latitude = 18.5204, longitude = 73.8567, locationName = "Pune, Maharashtra" }: Props) {
  const [data, setData] = useState<AgroWeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchAgroWeatherData(latitude, longitude)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-primary/15 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">Agro-Climatic Intelligence</h3>
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
              Map My Crop Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time telemetry for {locationName} ({latitude.toFixed(3)}°N, {longitude.toFixed(3)}°E)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.stress_level === "Optimal" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Optimal Conditions
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> {data.stress_level}
            </Badge>
          )}
        </div>
      </div>

      {/* Weather telemetry grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Temperature */}
        <div className="p-3 rounded-xl bg-background/50 border border-primary/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Air Temp</div>
            <div className="font-heading font-bold text-lg">{data.temperature_c}°C</div>
            <div className="text-[10px] text-muted-foreground">Feels {data.apparent_temperature_c}°C</div>
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="p-3 rounded-xl bg-background/50 border border-primary/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Soil Moisture (0-7cm)</div>
            <div className="font-heading font-bold text-lg">{Math.round(data.soil_moisture_0_7cm * 100)}%</div>
            <div className="text-[10px] text-muted-foreground">{data.soil_moisture_0_7cm} m³/m³</div>
          </div>
        </div>

        {/* Evapotranspiration */}
        <div className="p-3 rounded-xl bg-background/50 border border-primary/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Evapotranspiration</div>
            <div className="font-heading font-bold text-lg">{data.evapotranspiration_mm} mm/d</div>
            <div className="text-[10px] text-muted-foreground">UV Index: {data.uv_index}</div>
          </div>
        </div>

        {/* Wind & Humidity */}
        <div className="p-3 rounded-xl bg-background/50 border border-primary/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Wind / Humidity</div>
            <div className="font-heading font-bold text-lg">{data.wind_speed_kmh} km/h</div>
            <div className="text-[10px] text-muted-foreground">RH: {data.relative_humidity}%</div>
          </div>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-3 text-xs">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary">Agro-Forestry Advisory: </span>
          <span className="text-foreground/90">{data.irrigation_advisory}</span>
          <span className="block mt-1 text-muted-foreground">
            Plantation Suitability: <strong className="text-foreground">{data.planting_suitability}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
