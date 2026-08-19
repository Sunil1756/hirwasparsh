import { useState } from "react";
import { SPECTRAL_LAYERS, SpectralIndexLayer } from "@/lib/remoteSensing";
import { Layers, Activity, Eye, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  activeLayerId: string;
  onLayerChange: (layerId: "rgb" | "ndvi" | "ndre" | "ndwi") => void;
  meanNdvi?: number;
}

export function NDVISpectralViewer({ activeLayerId, onLayerChange, meanNdvi = 0.68 }: Props) {
  const activeLayer = SPECTRAL_LAYERS.find((l) => l.id === activeLayerId) || SPECTRAL_LAYERS[0];

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-primary/20 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-base sm:text-lg">Satellite Spectral Index Suite</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          Mean NDVI: <strong className="ml-1 text-primary">{meanNdvi}</strong>
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Multi-spectral remote sensing layers calibrated for tree canopy vigor and drought stress identification.
      </p>

      {/* Layer selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {SPECTRAL_LAYERS.map((layer) => {
          const isSelected = layer.id === activeLayerId;
          return (
            <button
              key={layer.id}
              onClick={() => onLayerChange(layer.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-primary/10 bg-background/50 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-heading font-semibold text-xs">{layer.id.toUpperCase()}</span>
                {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{layer.name.split(" ")[0]}</div>
            </button>
          );
        })}
      </div>

      {/* Active Layer Details */}
      <div className="p-3 rounded-xl bg-background/60 border border-primary/10 text-xs space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-foreground">{activeLayer.name}</div>
            <div className="text-muted-foreground text-[11px]">{activeLayer.shortDescription}</div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
            {activeLayer.formula}
          </Badge>
        </div>

        {/* Color Legend Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Stressed / Bare</span>
            <span>Moderate Growth</span>
            <span>Dense Canopy</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${activeLayer.palette.min}, ${activeLayer.palette.mid}, ${activeLayer.palette.max})`,
            }}
          />
          <div className="text-[10px] text-muted-foreground text-center mt-1">
            Scale: {activeLayer.scaleLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
