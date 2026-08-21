import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
} from "recharts";
import { generateNDVITimeSeries, SPECIES_ALLOMETRY_CATALOG } from "@/lib/carbonBiomassEngine";
import { Activity, TrendingUp, Sparkles, Layers, ShieldCheck, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initialSpeciesKey?: string;
  initialTreeCount?: number;
  plotName?: string;
}

export function CanopyNDVITimeSeriesChart({
  initialSpeciesKey = "mixed_native",
  initialTreeCount = 2500,
  plotName = "Sahyadri Agroforestry Cluster #04",
}: Props) {
  const [speciesKey, setSpeciesKey] = useState(initialSpeciesKey);
  const [treeCount, setTreeCount] = useState(initialTreeCount);
  const [activeMetric, setActiveMetric] = useState<"ndvi" | "biomass" | "combined">("combined");

  const timeSeriesData = generateNDVITimeSeries({
    speciesKey,
    treeCount,
  });

  const latestData = timeSeriesData[timeSeriesData.length - 1];
  const baselineData = timeSeriesData[0];
  const ndviGrowthRate = Math.round(((latestData.ndvi - baselineData.ndvi) / baselineData.ndvi) * 100);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">
              36-Month Satellite Canopy NDVI & Biomass Progression
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-spectral time-series growth telemetry for {plotName} ({treeCount.toLocaleString()} Trees)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
            Map My Crop Telemetry Engine
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            +{ndviGrowthRate}% Canopy Expansion
          </Badge>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-3 rounded-xl bg-background/50 border border-primary/10">
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Dominant Tree Species</label>
          <Select value={speciesKey} onValueChange={setSpeciesKey}>
            <SelectTrigger className="h-8 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SPECIES_ALLOMETRY_CATALOG).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {val.speciesName} ({val.scientificName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Planted Tree Inventory</label>
          <input
            type="number"
            min={100}
            max={100000}
            step={500}
            value={treeCount}
            onChange={(e) => setTreeCount(Math.max(10, Number(e.target.value)))}
            className="w-full h-8 rounded-lg border border-primary/20 bg-background px-2.5 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Chart View Layer</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveMetric("combined")}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                activeMetric === "combined" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveMetric("ndvi")}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                activeMetric === "ndvi" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              NDVI / NDWI
            </button>
            <button
              onClick={() => setActiveMetric("biomass")}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                activeMetric === "biomass" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Biomass / CO₂
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#888888" />
            <YAxis yAxisId="ndviAxis" domain={[0, 1.0]} tick={{ fontSize: 10 }} stroke="#16a34a" />
            <YAxis
              yAxisId="biomassAxis"
              orientation="right"
              tick={{ fontSize: 10 }}
              stroke="#0284c7"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="glass-card rounded-xl p-3 border border-primary/20 text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-primary">{label}</div>
                      <div className="text-emerald-600 dark:text-emerald-400">
                        🛰️ Mean NDVI Vigor: <strong>{p.ndvi}</strong>
                      </div>
                      <div className="text-sky-500">
                        💧 NDWI Moisture: <strong>{p.ndwi}</strong>
                      </div>
                      <div className="text-foreground">
                        🌳 Standing Biomass: <strong>{p.biomassMT} MT</strong>
                      </div>
                      <div className="text-primary font-bold">
                        ☁️ Carbon Sequestered: <strong>{p.co2eMT} MT CO₂e</strong>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Canopy Closure: {p.canopyCoverPercent}% {p.isMonsoonSeason ? "(Monsoon Surge)" : ""}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

            {(activeMetric === "combined" || activeMetric === "biomass") && (
              <Bar
                yAxisId="biomassAxis"
                dataKey="co2eMT"
                name="Cumulative CO₂e (MT)"
                fill="#0284c7"
                opacity={0.35}
                radius={[4, 4, 0, 0]}
              />
            )}

            {(activeMetric === "combined" || activeMetric === "ndvi") && (
              <>
                <Line
                  yAxisId="ndviAxis"
                  type="monotone"
                  dataKey="ndvi"
                  name="NDVI Canopy Vigor"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#16a34a" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="ndviAxis"
                  type="monotone"
                  dataKey="ndwi"
                  name="NDWI Foliar Moisture"
                  stroke="#06b6d4"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-primary/10 text-center">
        <div className="p-2.5 rounded-xl bg-background/50">
          <div className="text-[10px] text-muted-foreground">Initial NDVI (Month 1)</div>
          <div className="font-heading font-bold text-sm text-foreground">{baselineData.ndvi} (Sparse)</div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10">
          <div className="text-[10px] text-muted-foreground">Year 3 Target NDVI</div>
          <div className="font-heading font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {latestData.ndvi} (Dense Canopy)
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-background/50">
          <div className="text-[10px] text-muted-foreground">Year 3 Standing Biomass</div>
          <div className="font-heading font-bold text-sm text-foreground">{latestData.biomassMT} MT</div>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10">
          <div className="text-[10px] text-muted-foreground">Year 3 Total CO₂e</div>
          <div className="font-heading font-bold text-sm text-primary">{latestData.co2eMT} MT CO₂e</div>
        </div>
      </div>
    </div>
  );
}
