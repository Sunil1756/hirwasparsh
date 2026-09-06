import { useState } from "react";
import { SPECTRAL_LAYERS, SpectralIndexLayer } from "@/lib/remoteSensing";
import { Activity, Layers, Eye, Sparkles, CheckCircle2, ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  activeLayerId?: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal";
  onLayerChange?: (layerId: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal") => void;
  meanNdvi?: number;
}

export function NDVISpectralViewer({
  activeLayerId = "ndvi",
  onLayerChange,
  meanNdvi = 0.76,
}: Props) {
  const [selectedLayer, setSelectedLayer] = useState<"rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal">(
    activeLayerId || "ndvi"
  );

  const currentLayerId = onLayerChange ? activeLayerId || selectedLayer : selectedLayer;
  const activeLayer = SPECTRAL_LAYERS.find((l) => l.id === currentLayerId) || SPECTRAL_LAYERS[1];

  const handleSelect = (layerId: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal") => {
    setSelectedLayer(layerId);
    if (onLayerChange) {
      onLayerChange(layerId);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 border-2 border-primary/25 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
            Multi-Spectral Sentinel-2 Reflectance Indices
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-primary/10 border-primary/25 text-primary font-semibold">
            Mean Plot NDVI: <strong className="ml-1 text-primary">{meanNdvi.toFixed(2)}</strong>
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
            {meanNdvi >= 0.7 ? "Dense Vigorous Canopy" : meanNdvi >= 0.5 ? "Moderate Growth" : "Sapling Stage"}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Select multi-spectral satellite reflectance bands to analyze chlorophyll absorption, leaf nitrogen, foliar hydration, and thermal micro-climates.
      </p>

      {/* Layer selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {SPECTRAL_LAYERS.map((layer) => {
          const isSelected = layer.id === currentLayerId;
          return (
            <button
              type="button"
              key={layer.id}
              onClick={() => handleSelect(layer.id as any)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/40"
                  : "border-border/50 bg-background/60 hover:border-primary/30 hover:bg-background"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-heading font-extrabold text-xs text-primary">{layer.id.toUpperCase()}</span>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="text-[11px] font-bold text-foreground truncate">{layer.name.split("(")[0]}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{layer.shortDescription}</div>
              </div>
              <span className="text-[9px] font-mono text-primary font-semibold mt-2 block">
                {layer.bandsUsed.split("(")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Layer Details */}
      <div className="p-4 rounded-2xl bg-background/80 border border-primary/15 text-xs space-y-3 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
              {activeLayer.name}
              <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary">
                {activeLayer.bandsUsed}
              </Badge>
            </div>
            <div className="text-muted-foreground text-xs mt-0.5">{activeLayer.shortDescription}</div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 font-mono bg-primary/5 border-primary/30 text-primary">
            Formula: {activeLayer.formula}
          </Badge>
        </div>

        {/* Color Legend Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 font-medium">
            <span className="text-rose-500">Low / Stressed ({activeLayer.minVal})</span>
            <span className="text-amber-500">Moderate Index</span>
            <span className="text-emerald-500 font-bold">Optimal: {activeLayer.optimalRange}</span>
          </div>
          <div
            className="h-3.5 w-full rounded-full shadow-inner border border-border/40"
            style={{
              background: `linear-gradient(to right, ${activeLayer.palette.min}, ${activeLayer.palette.mid}, ${activeLayer.palette.max})`,
            }}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
            <span>Scale Min: {activeLayer.minVal}</span>
            <span>Reflectance Range: {activeLayer.scaleLabel}</span>
            <span>Scale Max: {activeLayer.maxVal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
