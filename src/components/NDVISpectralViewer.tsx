import { useState } from "react";
import { SPECTRAL_LAYERS } from "@/lib/remoteSensing";
import {
  Layers,
  Eye,
  Activity,
  Leaf,
  Droplets,
  Sparkles,
  Thermometer,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  activeLayerId?: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal";
  onLayerChange?: (layerId: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal") => void;
  meanNdvi?: number;
}

const LAYER_ICONS: Record<string, any> = {
  rgb: Eye,
  ndvi: Activity,
  ndre: Leaf,
  ndwi: Droplets,
  evi: Sparkles,
  thermal: Thermometer,
};

const LAYER_SHORT_NAMES: Record<string, string> = {
  rgb: "RGB Optical",
  ndvi: "NDVI Biomass",
  ndre: "NDRE Nitrogen",
  ndwi: "NDWI Hydration",
  evi: "EVI High-Biomass",
  thermal: "Thermal LST",
};

export function NDVISpectralViewer({
  activeLayerId = "ndvi",
  onLayerChange,
  meanNdvi = 0.76,
}: Props) {
  const [selectedLayer, setSelectedLayer] = useState<"rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal">(
    activeLayerId || "ndvi"
  );
  const [showDetails, setShowDetails] = useState(false);

  const currentLayerId = onLayerChange ? activeLayerId || selectedLayer : selectedLayer;
  const activeLayer = SPECTRAL_LAYERS.find((l) => l.id === currentLayerId) || SPECTRAL_LAYERS[1];

  const handleSelect = (layerId: "rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal") => {
    setSelectedLayer(layerId);
    if (onLayerChange) {
      onLayerChange(layerId);
    }
  };

  const safeMeanNdvi = typeof meanNdvi === "number" && !isNaN(meanNdvi) ? meanNdvi : 0.74;

  return (
    <div className="glass-card rounded-2xl p-3 sm:p-4 border border-primary/20 shadow-sm space-y-3">
      {/* Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="font-heading font-bold text-sm text-foreground">
            Multi-Spectral Sentinel-2 Bands
          </span>
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex bg-primary/5 text-primary border-primary/20">
            10m Ground Resolution
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-primary/10 border-primary/20 text-primary font-medium">
            Mean Plot NDVI: <strong className="ml-1 text-primary">{safeMeanNdvi.toFixed(2)}</strong>
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold">
            {safeMeanNdvi >= 0.7 ? "Vigorous Canopy" : safeMeanNdvi >= 0.5 ? "Moderate Growth" : "Sapling Stage"}
          </Badge>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{showDetails ? "Hide Scale" : "Scale & Formula"}</span>
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Sleek Pill Button Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {SPECTRAL_LAYERS.map((layer) => {
          const isSelected = layer.id === currentLayerId;
          const Icon = LAYER_ICONS[layer.id] || Activity;
          const shortName = LAYER_SHORT_NAMES[layer.id] || layer.name;

          return (
            <button
              type="button"
              key={layer.id}
              onClick={() => handleSelect(layer.id as any)}
              className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                  : "bg-background/60 text-muted-foreground border-border/50 hover:text-foreground hover:bg-background hover:border-primary/30"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
              <span className="truncate">{shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Collapsible Scientific Details & Color Ramp */}
      {showDetails && (
        <div className="p-3.5 rounded-xl bg-background/90 border border-primary/20 text-xs space-y-2.5 animate-in fade-in-50 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-foreground text-xs">{activeLayer.name}</span>
              <span className="text-muted-foreground text-[11px] ml-2">({activeLayer.bandsUsed})</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 border-primary/25 text-primary">
              Formula: {activeLayer.formula}
            </Badge>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {activeLayer.shortDescription}
          </p>

          {/* Color Gradient Scale */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-medium">
              <span className="text-rose-500 font-semibold">Low / Stressed ({activeLayer.minVal})</span>
              <span className="text-amber-500">Moderate</span>
              <span className="text-emerald-500 font-bold">Optimal: {activeLayer.optimalRange}</span>
            </div>
            <div
              className="h-2.5 w-full rounded-full border border-border/40 shadow-inner"
              style={{
                background: `linear-gradient(to right, ${activeLayer.palette.min}, ${activeLayer.palette.mid}, ${activeLayer.palette.max})`,
              }}
            />
            <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1 font-mono">
              <span>Min: {activeLayer.minVal}</span>
              <span>{activeLayer.scaleLabel}</span>
              <span>Max: {activeLayer.maxVal}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

