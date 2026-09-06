import { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Sparkles,
  Calendar,
  TreePine,
  TrendingUp,
  SlidersHorizontal,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  zoneName?: string;
  baselineYear?: string;
  currentYear?: string;
}

export function SatelliteTimeSliderCompare({
  zoneName = "Nagpur Miyawaki Forest Agro-Zone",
  baselineYear = "2023 (Pre-Plantation Baseline)",
  currentYear = "2026 (Sentinel-2 Multi-Spectral)",
}: Props) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">
              36-Month Satellite Temporal Transformation (Before vs After)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare historical baseline terrain vs current multi-spectral canopy density for {zoneName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
            Sentinel-2 Temporal MRV
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            +320% Canopy Expansion
          </Badge>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-[10px] text-muted-foreground block">Baseline NDVI</span>
          <strong className="text-rose-500 text-lg">0.24</strong>
          <span className="text-[9px] text-muted-foreground block">Barren Degraded Land</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-muted-foreground block">Current 2026 NDVI</span>
          <strong className="text-emerald-600 dark:text-emerald-400 text-lg">0.82</strong>
          <span className="text-[9px] text-emerald-600 block">Dense Lush Canopy</span>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <span className="text-[10px] text-muted-foreground block">Carbon Sequestered</span>
          <strong className="text-sky-600 dark:text-sky-400 text-lg">+110 MT</strong>
          <span className="text-[9px] text-muted-foreground block">Verified Biomass</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-muted-foreground block">Soil Temperature</span>
          <strong className="text-amber-600 dark:text-amber-400 text-lg">-6.4°C</strong>
          <span className="text-[9px] text-muted-foreground block">Canopy Micro-Climate</span>
        </div>
      </div>

      {/* Interactive Visual Slider */}
      <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border-2 border-primary/30 select-none group shadow-inner">
        {/* Right Layer (2026 Lush Canopy) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1511497584788-87676104235f?q=80&w=1200&auto=format&fit=crop')`,
          }}
        >
          {/* NDVI Spectral Green Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/60 via-emerald-600/30 to-transparent mix-blend-color-dodge" />
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-lg text-right">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
              <TreePine className="h-3.5 w-3.5" /> 2026 Multi-Spectral Canopy
            </div>
            <div className="text-[11px] font-mono font-bold text-foreground">NDVI: 0.82 (Lush Forest)</div>
          </div>
        </div>

        {/* Left Layer (Baseline Barren Land) clipped by slider */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden bg-cover bg-center"
          style={{
            width: `${sliderPos}%`,
            backgroundImage: `url('https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop')`,
          }}
        >
          {/* Barren Soil Tint */}
          <div className="absolute inset-0 bg-amber-900/40 mix-blend-multiply" />
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-500/40 shadow-lg text-left">
            <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Baseline Ground (Pre-Planting)
            </div>
            <div className="text-[11px] font-mono font-bold text-foreground">NDVI: 0.24 (Degraded Land)</div>
          </div>
        </div>

        {/* Slider Divider Bar */}
        <div
          className="absolute inset-y-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] cursor-ew-resize flex items-center justify-center z-20"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl border-2 border-white text-xs font-bold transform hover:scale-110 transition-transform">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
        </div>

        {/* Hidden Range Input overlay */}
        <input
          type="range"
          min={0}
          max={100}
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />

        {/* Bottom Helper Bar */}
        <div className="absolute bottom-4 inset-x-4 bg-background/90 backdrop-blur-md p-2.5 rounded-xl border border-primary/20 flex items-center justify-between text-xs z-10">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Drag slider left/right to compare
          </span>
          <span className="text-primary font-bold font-mono">
            {sliderPos}% Baseline / {100 - sliderPos}% 2026 Canopy
          </span>
        </div>
      </div>
    </div>
  );
}
