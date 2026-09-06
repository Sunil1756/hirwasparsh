import { motion } from "framer-motion";
import {
  Satellite,
  Compass,
  Activity,
  Droplets,
  Thermometer,
  ShieldCheck,
  Sparkles,
  TreePine,
  Layers,
  Maximize2,
  X,
  FileSpreadsheet,
  Bot,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoordinateTelemetryResult, getNdviColor } from "@/lib/remoteSensing";

interface Props {
  telemetry: CoordinateTelemetryResult;
  onClose?: () => void;
  onRunAiDiagnostic?: () => void;
  isAiAnalyzing?: boolean;
}

export function SatellitePixelInspectorHUD({
  telemetry,
  onClose,
  onRunAiDiagnostic,
  isAiAnalyzing = false,
}: Props) {
  const ndviColor = getNdviColor(telemetry.ndvi);

  const handleExportTelemetry = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(telemetry, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Sentinel2_Spectral_Telemetry_${telemetry.latitude}_${telemetry.longitude}.json`);
    dlAnchor.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="glass-card rounded-2xl p-5 border-2 border-primary/30 shadow-xl bg-background/95 backdrop-blur-md space-y-4"
    >
      {/* HUD Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold flex items-center gap-1">
              <Satellite className="h-3 w-3" /> Sentinel-2 MSI Multi-Spectral Telemetry
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">
              Tile: {telemetry.tileId} · 10m Spatial Res
            </span>
          </div>
          <h3 className="font-heading font-bold text-base sm:text-lg text-foreground flex items-center gap-1.5">
            📍 {telemetry.latitude.toFixed(4)}°N, {telemetry.longitude.toFixed(4)}°E
            <span className="text-xs text-muted-foreground font-normal">
              ({telemetry.elevationM}m elev)
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportTelemetry}
            title="Export Spectral Telemetry JSON"
            className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> JSON
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Primary Indicator: Big NDVI Score Gauge & Classification */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>NDVI Canopy Vigor</span>
            <span className="text-[10px] font-mono">(NIR-Red)/(NIR+Red)</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-heading font-extrabold text-3xl" style={{ color: ndviColor }}>
              {telemetry.ndvi.toFixed(2)}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold"
              style={{ borderColor: ndviColor, color: ndviColor }}
            >
              {telemetry.ndvi >= 0.7 ? "Dense Lush" : telemetry.ndvi >= 0.5 ? "Moderate" : "Sparse"}
            </Badge>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, telemetry.ndvi * 100))}%`, backgroundColor: ndviColor }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
              <Droplets className="h-3.5 w-3.5" /> Foliar Hydration (NDWI)
            </span>
            <span className="text-[10px] font-mono">{telemetry.soilMoisturePct}% Moist</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-heading font-extrabold text-3xl text-sky-600 dark:text-sky-400">
              {telemetry.ndwi >= 0 ? `+${telemetry.ndwi.toFixed(2)}` : telemetry.ndwi.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              {telemetry.ndwi >= 0.2 ? "Optimal" : "Low Moisture"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Root-zone moisture: {telemetry.soilMoisturePct}% · No drought stress
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <TreePine className="h-3.5 w-3.5" /> Carbon Density
            </span>
            <span className="text-[10px] font-mono">IPCC Tier-2</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-heading font-extrabold text-3xl text-emerald-600 dark:text-emerald-400">
              {telemetry.biomassCarbonMTPerHa}
            </span>
            <span className="text-xs text-muted-foreground">MT CO₂e / Ha</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Est. Canopy Cover: {telemetry.canopyCoveragePct}% of ground area
          </p>
        </div>
      </div>

      {/* Detailed Multi-Spectral Matrix (6 Index Pills) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">NDRE (Red Edge)</span>
          <strong className="text-foreground text-sm">{telemetry.ndre.toFixed(2)}</strong>
          <span className="text-[9px] text-muted-foreground block">Chlorophyll</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">EVI Biomass</span>
          <strong className="text-foreground text-sm">{telemetry.evi.toFixed(2)}</strong>
          <span className="text-[9px] text-muted-foreground block">Enhanced Veg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">SAVI (Soil-Adj)</span>
          <strong className="text-foreground text-sm">{telemetry.savi.toFixed(2)}</strong>
          <span className="text-[9px] text-muted-foreground block">Sapling Density</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">Surface Temp</span>
          <strong className="text-foreground text-sm">{telemetry.surfaceTempC}°C</strong>
          <span className="text-[9px] text-muted-foreground block">Cool Canopy</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">Chlorophyll</span>
          <strong className="text-foreground text-sm">{telemetry.chlorophyllDensityUgCm2}</strong>
          <span className="text-[9px] text-muted-foreground block">µg/cm² leaf</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">Cloud Cover</span>
          <strong className="text-foreground text-sm">{telemetry.cloudCoverPct}%</strong>
          <span className="text-[9px] text-emerald-600 block">Clear Pass</span>
        </div>
      </div>

      {/* AI Health Diagnosis & Actionable Recommendation */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary flex items-center gap-1.5">
            <Bot className="h-4 w-4" /> AI Agroforestry Diagnosis ({telemetry.classification})
          </span>
          <span className="text-[10px] text-muted-foreground">
            Acquired: {telemetry.overpassDate}
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {telemetry.healthDiagnosis}
        </p>
        <p className="text-foreground font-semibold pt-1 border-t border-primary/10">
          🌱 Recommendation: <span className="font-normal text-muted-foreground">{telemetry.recommendation}</span>
        </p>
      </div>

      {/* Action Footer */}
      {onRunAiDiagnostic && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">
            Want an in-depth computer vision audit for this coordinate?
          </span>
          <Button
            size="sm"
            onClick={onRunAiDiagnostic}
            disabled={isAiAnalyzing}
            className="rounded-xl font-semibold gap-1.5 text-xs shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isAiAnalyzing ? "Analyzing with Gemini Vision..." : "Generate AI Canopy Audit"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
