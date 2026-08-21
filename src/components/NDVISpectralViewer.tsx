import { useState } from "react";
import { SPECTRAL_LAYERS } from "@/lib/remoteSensing";
import { Activity, Layers, Eye, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  activeLayerId?: string;
  onLayerChange?: (layerId: "rgb" | "ndvi" | "ndre" | "ndwi") => void;
  meanNdvi?: number;
}

export function NDVISpectralViewer({
  activeLayerId = "ndvi",
  onLayerChange,
  meanNdvi = 0.72,
}: Props) {
  const [selectedLayer, setSelectedLayer] = useState<"rgb" | "ndvi" | "ndre" | "ndwi">(
    (activeLayerId as any) || "ndvi"
  );

  const currentLayerId = onLayerChange ? activeLayerId || selectedLayer : selectedLayer;
  const activeLayer = SPECTRAL_LAYERS.find((l) => l.id === currentLayerId) || SPECTRAL_LAYERS[1];

  const handleSelect = (layerId: "rgb" | "ndvi" | "ndre" | "ndwi") => {
    setSelectedLayer(layerId);
    if (onLayerChange) {
      onLayerChange(layerId);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-base sm:text-lg">
            Satellite Multi-Spectral Remote Sensing Suite
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-primary/10 border-primary/20 text-primary">
            Mean Parcel NDVI: <strong className="ml-1 text-primary">{meanNdvi}</strong>
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
            Healthy Canopy
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Select multi-spectral satellite reflectance indices to assess chlorophyll absorption, cellular moisture, and canopy density (Map My Crop model).
      </p>

      {/* Layer selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SPECTRAL_LAYERS.map((layer) => {
          const isSelected = layer.id === currentLayerId;
          return (
            <button
              type="button"
              key={layer.id}
              onClick={() => handleSelect(layer.id as any)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-primary/10 bg-background/50 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-heading font-bold text-xs">{layer.id.toUpperCase()}</span>
                {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="text-[11px] font-medium text-foreground truncate">{layer.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{layer.shortDescription}</div>
            </button>
          );
        })}
      </div>

      {/* Active Layer Details */}
      <div className="p-4 rounded-xl bg-background/60 border border-primary/10 text-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm text-foreground">{activeLayer.name}</div>
            <div className="text-muted-foreground text-xs mt-0.5">{activeLayer.shortDescription}</div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 font-mono bg-primary/5 border-primary/20">
            Formula: {activeLayer.formula}
          </Badge>
        </div>

        {/* Color Legend Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span className="text-rose-500 font-medium">Stressed / Bare Ground</span>
            <span className="text-amber-500 font-medium">Moderate Vigour</span>
            <span className="text-emerald-500 font-medium">Dense Thriving Canopy</span>
          </div>
          <div
            className="h-3 w-full rounded-full shadow-inner"
            style={{
              background: `linear-gradient(to right, ${activeLayer.palette.min}, ${activeLayer.palette.mid}, ${activeLayer.palette.max})`,
            }}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
            <span>Min: -0.2</span>
            <span>Index Range: {activeLayer.scaleLabel}</span>
            <span>Max: +1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
