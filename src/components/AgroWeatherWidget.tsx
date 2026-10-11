import { useState, useEffect } from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  Calendar,
  CloudRain,
  Compass,
} from "lucide-react";
import { fetchAgroWeatherData, AgroWeatherData } from "@/lib/agroClimaticService";
import { fetchPlotWeatherHistory, PlotWeatherRecord } from "@/lib/weatherService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  className?: string;
}

export function AgroWeatherWidget({
  latitude = 18.5204,
  longitude = 73.8567,
  locationName = "Pune, Maharashtra",
  className = "",
}: Props) {
  const [data, setData] = useState<AgroWeatherData | null>(null);
  const [history, setHistory] = useState<PlotWeatherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const res = await fetchAgroWeatherData(latitude, longitude);
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Failed to fetch live agro-weather:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    if (showHistory) {
      await loadHistory();
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const hist = await fetchPlotWeatherHistory(undefined, 7, latitude, longitude);
      setHistory(hist);
    } catch (err) {
      console.warn("Failed to fetch historical weather:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history.length === 0) {
      loadHistory();
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className={`glass-card rounded-2xl p-5 border border-primary/15 animate-pulse ${className}`}>
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
    <div className={`glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">Agro-Climatic Intelligence</h3>
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
              Open-Meteo & Map My Crop
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time telemetry for {locationName} ({latitude.toFixed(3)}°N, {longitude.toFixed(3)}°E) • Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-primary/10"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh live telemetry"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button
            variant={showHistory ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={toggleHistory}
          >
            <Calendar className="h-3.5 w-3.5" />
            {showHistory ? "Hide 7-Day Trend" : "7-Day History"}
          </Button>
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
            <div className="text-[10px] text-muted-foreground">Feels {data.apparent_temperature_c}°C • {data.condition}</div>
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
            <div className="text-[10px] text-muted-foreground">{data.soil_moisture_0_7cm} m³/m³ (Volumetric)</div>
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
            <div className="text-[10px] text-muted-foreground">FAO-56 ET0 • UV: {data.uv_index}</div>
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
            <div className="text-[10px] text-muted-foreground">RH: {data.relative_humidity}% • Soil: {data.soil_temperature_0cm}°C</div>
          </div>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-3 text-xs mb-3">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary">Agro-Forestry Advisory: </span>
          <span className="text-foreground/90">{data.irrigation_advisory}</span>
          <span className="block mt-1 text-muted-foreground">
            Plantation Suitability: <strong className="text-foreground">{data.planting_suitability}</strong>
          </span>
        </div>
      </div>

      {/* 7-Day Historical Trend Table */}
      {showHistory && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> 7-Day Past Meteorological Trend (Open-Meteo High-Res)
            </h4>
          </div>

          {historyLoading ? (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading past 7 days telemetry...
            </div>
          ) : history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Date</th>
                    <th className="py-1.5 px-2 font-medium">Condition</th>
                    <th className="py-1.5 px-2 font-medium">Avg Temp</th>
                    <th className="py-1.5 px-2 font-medium">Rainfall</th>
                    <th className="py-1.5 px-2 font-medium">ET0</th>
                    <th className="py-1.5 pl-2 font-medium">Drought Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {history.map((h) => {
                    const dateStr = h.recorded_at ? new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A";
                    return (
                      <tr key={h.id} className="hover:bg-primary/5 transition-colors">
                        <td className="py-1.5 pr-2 font-medium text-foreground">{dateStr}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{h.weather_condition}</td>
                        <td className="py-1.5 px-2 font-semibold text-foreground">{h.temperature_celsius}°C</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{h.precipitation_mm > 0 ? `${h.precipitation_mm} mm` : "0.0 mm"}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{h.evapotranspiration_mm ? `${h.evapotranspiration_mm} mm` : "—"}</td>
                        <td className="py-1.5 pl-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            h.drought_risk_index < 0.3
                              ? "bg-emerald-500/10 text-emerald-600"
                              : h.drought_risk_index < 0.6
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-red-500/10 text-red-600"
                          }`}>
                            {Math.round(h.drought_risk_index * 100)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-2">No historical telemetry recorded.</div>
          )}
        </div>
      )}
    </div>
  );
}
