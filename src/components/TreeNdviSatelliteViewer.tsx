import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Satellite,
  Activity,
  Leaf,
  Droplets,
  Sun,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Info,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchTreeCoordinateNdvi,
  TreeNdviTelemetryResult,
} from "@/lib/sentinel2RealService";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TreeNdviSatelliteViewerProps {
  treeId?: string;
  latitude: number;
  longitude: number;
  treeName?: string;
  species?: string;
  compact?: boolean;
}

export function TreeNdviSatelliteViewer({
  treeId,
  latitude,
  longitude,
  treeName,
  species,
  compact = false,
}: TreeNdviSatelliteViewerProps) {
  const [telemetry, setTelemetry] = useState<TreeNdviTelemetryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpectral, setSelectedSpectral] = useState<"ndvi" | "ndre" | "ndwi" | "evi">("ndvi");

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const data = await fetchTreeCoordinateNdvi({
        treeId,
        latitude,
        longitude,
        treeName,
        species,
      });
      setTelemetry(data);
    } catch (err) {
      console.error("Failed to load Sentinel-2 NDVI telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      loadTelemetry();
    }
  }, [latitude, longitude, treeId]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-muted/40 border border-primary/20 text-center space-y-3 animate-pulse">
        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto">
          <Satellite className="h-4 w-4 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-foreground">
          Querying Copernicus Sentinel-2 L2A STAC Telemetry...
        </p>
        <p className="text-[11px] text-muted-foreground font-mono">
          Calculating BOA Reflectance & NDVI for ({latitude.toFixed(4)}, {longitude.toFixed(4)})
        </p>
      </div>
    );
  }

  if (!telemetry) {
    return null;
  }

  const getVigorColor = (status: string) => {
    switch (status) {
      case "Dense Thriving Canopy":
        return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
      case "Vigorous Foliage":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Moderate Vitality":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Sparse Canopy / Moisture Stressed":
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getSpectralValue = () => {
    switch (selectedSpectral) {
      case "ndre":
        return {
          val: telemetry.ndre,
          label: "NDRE Chlorophyll",
          desc: "Red-Edge (705nm) chlorophyll absorbance",
          color: "#059669",
        };
      case "ndwi":
        return {
          val: telemetry.ndwi,
          label: "NDWI Foliar Hydration",
          desc: "SWIR-NIR foliar water absorption index",
          color: "#0284c7",
        };
      case "evi":
        return {
          val: telemetry.evi,
          label: "EVI Structural Biomass",
          desc: "Atmospherically-corrected structural greenness",
          color: "#9333ea",
        };
      case "ndvi":
      default:
        return {
          val: telemetry.ndvi,
          label: "NDVI Vegetation Index",
          desc: "NIR (842nm) vs Red (665nm) photosynthetic reflectance",
          color: "#16a34a",
        };
    }
  };

  const activeSpec = getSpectralValue();

  return (
    <div className="rounded-2xl glass-card border border-primary/20 p-5 space-y-5">
      {/* Header with Sentinel-2 Satellite Overpass Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-foreground">
                Copernicus Sentinel-2 L2A Telemetry
              </h3>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                10m GSD Optical
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tile ID: <span className="font-mono font-medium">{telemetry.tileId}</span> • Overpass:{" "}
              <span className="font-medium">{telemetry.acquisitionDate}</span> • Cloud:{" "}
              <span className="font-medium">{telemetry.cloudCoverPct}%</span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTelemetry}
          className="h-7 text-xs rounded-xl gap-1.5 border-primary/30"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: NDVI Primary Score */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-emerald-600" /> Mean NDVI
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +{telemetry.deltaNdvi6MonthsPct}% (6mo)
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-heading font-black text-foreground">
              {telemetry.ndvi.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">/ 1.00</span>
          </div>
          <Badge className={`text-[10px] font-semibold border ${getVigorColor(telemetry.vegetationVigorStatus)}`}>
            {telemetry.vegetationVigorStatus}
          </Badge>
        </div>

        {/* Card 2: Canopy & Thermal Metrics */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" /> Canopy & Microclimate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-heading font-black text-foreground">
              {telemetry.canopyCoveragePct}%
            </span>
            <span className="text-xs text-muted-foreground">Coverage</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>🌡️ LST: <strong>{telemetry.surfaceTempC}°C</strong></span>
            <span>💧 Moisture: <strong>{telemetry.soilMoisturePct}%</strong></span>
          </div>
        </div>

        {/* Card 3: Chlorophyll Density & Carbon Stock */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Standing Biomass
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-heading font-black text-foreground">
              {telemetry.biomassCarbonMTPerHa}
            </span>
            <span className="text-xs text-muted-foreground">MT/Ha</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Chlorophyll: <strong>{telemetry.chlorophyllDensityUgCm2} μg/cm²</strong>
          </div>
        </div>
      </div>

      {/* Spectral Index Switcher Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" /> Multi-Spectral Index Breakdown
          </span>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
            {(["ndvi", "ndre", "ndwi", "evi"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedSpectral(key)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedSpectral === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-foreground">{activeSpec.label}: </span>
            <span className="font-mono font-bold text-primary">{activeSpec.val}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">{activeSpec.desc}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
              10m Pixel Value
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Active Signal
            </Badge>
          </div>
        </div>
      </div>

      {/* 6-Month Historical NDVI Vegetation Trend Chart */}
      {!compact && telemetry.historicalTimeSeries && telemetry.historicalTimeSeries.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> 6-Month Vegetation Accretion Trajectory
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Orbital Revisit Cycle: 5 Days
            </span>
          </div>

          <div className="h-36 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry.historicalTimeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeSpec.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={activeSpec.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1.0]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2 rounded-lg bg-background/95 border border-border shadow-md text-xs space-y-0.5">
                          <p className="font-bold text-foreground">{data.month} ({data.date})</p>
                          <p className="text-emerald-600 font-semibold font-mono">NDVI: {data.ndvi}</p>
                          <p className="text-[10px] text-muted-foreground">{data.phenologyStage}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedSpectral}
                  stroke={activeSpec.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#ndviGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forestry Recommendation Footer */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          <strong className="text-foreground">AI Remote Sensing Insight: </strong>
          {telemetry.healthDiagnosis} {telemetry.recommendation}
        </p>
      </div>
    </div>
  );
}

export default TreeNdviSatelliteViewer;
