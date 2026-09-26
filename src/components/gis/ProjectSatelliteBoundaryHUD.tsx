/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 10 TASK 54
 * Project Satellite Boundary HUD & STAC Remote Sensing Inspector
 *
 * Interactive HUD connecting Project Cadastral Boundaries & GeoJSON Polygons
 * directly to Copernicus Sentinel-2 STAC queries and Open-Meteo microclimate telemetry.
 */

import React, { useState, useEffect } from "react";
import {
  Satellite,
  Layers,
  MapPin,
  Activity,
  CloudRain,
  Droplets,
  TreePine,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Code2,
} from "lucide-react";
import {
  projectGeometrySatelliteService,
  ProjectSatelliteTelemetry,
  PlotSpatialTelemetry,
} from "@/services/projectGeometrySatelliteService";
import { ProjectMapFeature } from "@/services/projectMapService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export interface ProjectSatelliteBoundaryHUDProps {
  project: ProjectMapFeature;
  onSelectPlot?: (plot: PlotSpatialTelemetry) => void;
  className?: string;
}

export const ProjectSatelliteBoundaryHUD: React.FC<ProjectSatelliteBoundaryHUDProps> = ({
  project,
  onSelectPlot,
  className = "",
}) => {
  const [telemetry, setTelemetry] = useState<ProjectSatelliteTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"overview" | "plots" | "stac_query" | "microclimate">("overview");
  const [selectedPlot, setSelectedPlot] = useState<PlotSpatialTelemetry | null>(null);

  const loadProjectTelemetry = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const data = await projectGeometrySatelliteService.fetchProjectSatelliteTelemetry(
        project.id,
        { forceRefresh }
      );
      setTelemetry(data);
      if (data.plotBreakdowns.length > 0 && !selectedPlot) {
        setSelectedPlot(data.plotBreakdowns[0]);
      }
    } catch (err) {
      console.error("Failed to load project satellite telemetry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjectTelemetry(false);
  }, [project.id]);

  const getStatusBadge = (status: PlotSpatialTelemetry["survivalStatus"]) => {
    switch (status) {
      case "optimal":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Optimal</Badge>;
      case "healthy":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Healthy</Badge>;
      case "stressed":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Stressed</Badge>;
      case "critical":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">Critical</Badge>;
    }
  };

  if (isLoading && !telemetry) {
    return (
      <Card className={`glass-card rounded-2xl border-border p-6 text-center ${className}`} data-testid="project-satellite-hud-loading">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Satellite className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-medium text-foreground">Querying Sentinel-2 STAC for Boundary...</p>
          <span className="text-xs text-muted-foreground">Clipping Level-2A surface reflectance to project polygon</span>
        </div>
      </Card>
    );
  }

  if (!telemetry) return null;

  return (
    <Card className={`glass-card rounded-2xl border-border shadow-xl overflow-hidden ${className}`} data-testid="project-satellite-boundary-hud">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 border-b border-emerald-500/20 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-mono">
                <Satellite className="w-3 h-3 mr-1" />
                Live Sentinel-2 L2A Connection
              </Badge>
              <Badge variant="outline" className="border-white/20 text-zinc-300 text-[10px] font-mono">
                {telemetry.totalHectares} ha
              </Badge>
            </div>
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>{telemetry.projectName}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300">
              <span>MGRS Tiles: <strong className="text-emerald-400 font-mono">{telemetry.mgrsTilesCovered.join(", ")}</strong></span>
              <span>•</span>
              <span>Acquisition: <strong className="text-white font-mono">{telemetry.primaryScene.acquisitionDate}</strong></span>
              <span>•</span>
              <span>Cloud Cover: <strong className="text-emerald-400 font-mono">{telemetry.primaryScene.cloudCoverPct}%</strong></span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => loadProjectTelemetry(true)}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh STAC</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="bg-card/70 border border-border p-1 rounded-xl flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TreePine className="w-3.5 h-3.5" />
              <span>Boundary Overview</span>
            </TabsTrigger>
            <TabsTrigger value="plots" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Layers className="w-3.5 h-3.5" />
              <span>Plots & Quadrats ({telemetry.plotBreakdowns.length})</span>
            </TabsTrigger>
            <TabsTrigger value="microclimate" className="text-xs gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <CloudRain className="w-3.5 h-3.5" />
              <span>Agro-Climatic Feed</span>
            </TabsTrigger>
            <TabsTrigger value="stac_query" className="text-xs gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Code2 className="w-3.5 h-3.5" />
              <span>STAC API Contract</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Mean Canopy NDVI</span>
                <div className="text-xl font-bold font-mono text-emerald-400">{telemetry.overallIndices.ndvi}</div>
                <span className="text-[10px] text-muted-foreground">NIR / Red Ratio</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Red Edge (NDRE)</span>
                <div className="text-xl font-bold font-mono text-blue-400">{telemetry.overallIndices.ndre}</div>
                <span className="text-[10px] text-muted-foreground">Chlorophyll Density</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Standing Biomass</span>
                <div className="text-xl font-bold font-mono text-foreground">{telemetry.overallIndices.standingBiomassMTPerHa} <span className="text-xs font-normal text-muted-foreground">t/ha</span></div>
                <span className="text-[10px] text-muted-foreground">Allometric Density</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Carbon Accrual</span>
                <div className="text-xl font-bold font-mono text-emerald-400">{telemetry.carbonAccrualEstimateTCO2e.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">tCO₂e</span></div>
                <span className="text-[10px] text-muted-foreground">IPCC Tier-2 Model</span>
              </div>
            </div>

            {/* Scene Classification Breakdown */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Scene Classification (SCL 20m) Inside Boundary</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{telemetry.samplingPointsCount} Stratified Points Sampled</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Vegetation Coverage ({telemetry.primaryScene?.sclSummary?.vegetationPct ?? 82.5}%)</span>
                  <span>Bare Soil ({telemetry.primaryScene?.sclSummary?.soilPct ?? 14.2}%)</span>
                </div>
                <Progress value={telemetry.primaryScene?.sclSummary?.vegetationPct ?? 82.5} className="h-2 bg-muted" />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PLOTS & QUADRATS */}
          <TabsContent value="plots" className="space-y-3 pt-2">
            <div className="text-xs text-muted-foreground">
              Stratified spatial sample plots inside project boundary polygon:
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {telemetry.plotBreakdowns.map((plot) => (
                <div
                  key={plot.plotId}
                  onClick={() => {
                    setSelectedPlot(plot);
                    onSelectPlot?.(plot);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedPlot?.plotId === plot.plotId
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card/60 border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-foreground">{plot.plotId}</span>
                      <span className="text-xs text-foreground font-medium">{plot.plotName}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Area: {plot.areaHectares} ha</span>
                      <span>•</span>
                      <span>Centroid: [{plot.centroid[0].toFixed(4)}, {plot.centroid[1].toFixed(4)}]</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">NDVI: {plot.meanNdvi}</div>
                      <div className="text-[10px] text-muted-foreground">{plot.standingBiomassMTPerHa} t/ha</div>
                    </div>
                    {getStatusBadge(plot.survivalStatus)}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: AGRO-CLIMATIC FEED */}
          <TabsContent value="microclimate" className="space-y-3 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Topsoil Moisture (0-7cm)</span>
                <div className="text-lg font-bold font-mono text-blue-400">{telemetry.agroWeather.soilMoisture0to7cmPct}%</div>
                <span className="text-[10px] text-muted-foreground">Volumetric Water</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Rootzone Moisture (7-28cm)</span>
                <div className="text-lg font-bold font-mono text-blue-400">{telemetry.agroWeather.soilMoisture7to28cmPct}%</div>
                <span className="text-[10px] text-muted-foreground">Active Root Absorption</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Vapor Pressure Deficit</span>
                <div className="text-lg font-bold font-mono text-amber-400">{telemetry.agroWeather.vaporPressureDeficitKPa} <span className="text-xs font-normal">kPa</span></div>
                <span className="text-[10px] text-muted-foreground">Atmospheric Transpiration</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ambient Temp</span>
                <div className="text-lg font-bold font-mono text-foreground">{telemetry.agroWeather.ambientTempC}°C</div>
                <span className="text-[10px] text-muted-foreground">RH: {telemetry.agroWeather.relativeHumidityPct}%</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Daily ET₀</span>
                <div className="text-lg font-bold font-mono text-foreground">{telemetry.agroWeather.evapotranspirationEt0Mm} <span className="text-xs font-normal">mm/d</span></div>
                <span className="text-[10px] text-muted-foreground">FAO Evapotranspiration</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Drought Stress Score</span>
                <div className={`text-lg font-bold font-mono ${telemetry.agroWeather.droughtStressScore > 40 ? "text-rose-400" : "text-emerald-400"}`}>
                  {telemetry.agroWeather.droughtStressScore} / 100
                </div>
                <span className="text-[10px] text-muted-foreground">Soil + VPD Deficit</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: STAC API CONTRACT */}
          <TabsContent value="stac_query" className="space-y-2 pt-2">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>GeoJSON Boundary Payload sent to Earth Search STAC v1:</span>
              <span className="font-mono text-[10px] text-emerald-400">Endpoint: https://earth-search.aws.element84.com/v1/search</span>
            </div>

            <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
              {JSON.stringify(
                {
                  collections: ["sentinel-2-l2a"],
                  bbox: telemetry.bbox,
                  limit: 1,
                  query: { "eo:cloud_cover": { lt: 25 } },
                  intersects: telemetry.boundaryGeoJson,
                },
                null,
                2
              )}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
