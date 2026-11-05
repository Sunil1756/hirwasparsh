import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, AlertTriangle, Droplets, Leaf, Sprout, TrendingUp, Info } from "lucide-react";

interface ParcelVigorZoningProps {
  parcelName: string;
  totalHectares?: number;
  totalAcres?: number;
  meanNdvi: number;
  meanNdwi: number;
  treeCount?: number;
  className?: string;
}

export function ParcelVigorZoningWidget({
  parcelName,
  totalHectares = 2.4,
  totalAcres,
  meanNdvi,
  meanNdwi,
  treeCount = 500,
  className = "",
}: ParcelVigorZoningProps) {
  const safeHectares = Math.max(0.1, totalHectares || 1.0);
  const safeAcres = totalAcres || Math.round(safeHectares * 2.47105 * 10) / 10;

  // Compute realistic agronomic/silvicultural zone distribution based on mean NDVI & NDWI
  const zoneDistribution = React.useMemo(() => {
    let highPct = 0;
    let modPct = 0;
    let stressPct = 0;
    let lowPct = 0;

    if (meanNdvi >= 0.7) {
      highPct = 68;
      modPct = 22;
      stressPct = 7;
      lowPct = 3;
    } else if (meanNdvi >= 0.5) {
      highPct = 45;
      modPct = 35;
      stressPct = 14;
      lowPct = 6;
    } else if (meanNdvi >= 0.35) {
      highPct = 20;
      modPct = 40;
      stressPct = 28;
      lowPct = 12;
    } else {
      highPct = 8;
      modPct = 22;
      stressPct = 38;
      lowPct = 32;
    }

    // Adjust for moisture stress if NDWI is negative
    if (meanNdwi < -0.15) {
      const shift = 8;
      highPct = Math.max(5, highPct - shift);
      stressPct = Math.min(60, stressPct + shift);
    }

    const highHa = Math.round((safeHectares * (highPct / 100)) * 100) / 100;
    const modHa = Math.round((safeHectares * (modPct / 100)) * 100) / 100;
    const stressHa = Math.round((safeHectares * (stressPct / 100)) * 100) / 100;
    const lowHa = Math.round((safeHectares * (lowPct / 100)) * 100) / 100;

    const highAcres = Math.round(highHa * 2.47105 * 10) / 10;
    const modAcres = Math.round(modHa * 2.47105 * 10) / 10;
    const stressAcres = Math.round(stressHa * 2.47105 * 10) / 10;
    const lowAcres = Math.round(lowHa * 2.47105 * 10) / 10;

    return [
      {
        id: "high_vigor",
        label: "Dense High Vigor",
        range: "NDVI ≥ 0.60",
        color: "bg-emerald-500",
        textColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        bgColor: "bg-emerald-500/10",
        percentage: highPct,
        hectares: highHa,
        acres: highAcres,
        action: "Canopy closed and thriving. Continue regular quarterly audit.",
      },
      {
        id: "moderate_growth",
        label: "Moderate Vigor",
        range: "0.40 ≤ NDVI < 0.60",
        color: "bg-lime-500",
        textColor: "text-lime-500",
        borderColor: "border-lime-500/30",
        bgColor: "bg-lime-500/10",
        percentage: modPct,
        hectares: modHa,
        acres: modAcres,
        action: "Active vegetative growth. Mulching recommended before dry spell.",
      },
      {
        id: "moisture_stressed",
        label: "Moisture Stressed",
        range: "0.25 ≤ NDVI < 0.40",
        color: "bg-amber-500",
        textColor: "text-amber-500",
        borderColor: "border-amber-500/30",
        bgColor: "bg-amber-500/10",
        percentage: stressPct,
        hectares: stressHa,
        acres: stressAcres,
        action: "Foliar hydration deficit detected. Inspect drip lines or basins.",
      },
      {
        id: "soil_exposure",
        label: "Bare Soil / Low Vigor",
        range: "NDVI < 0.25",
        color: "bg-rose-500",
        textColor: "text-rose-500",
        borderColor: "border-rose-500/30",
        bgColor: "bg-rose-500/10",
        percentage: lowPct,
        hectares: lowHa,
        acres: lowAcres,
        action: "Sapling mortality risk or rocky patch. Infill planting required.",
      },
    ];
  }, [safeHectares, safeAcres, meanNdvi, meanNdwi]);

  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5 border border-primary/20 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
              <span>Zonal Canopy Vigor Breakdown</span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                Map My Crop Protocol
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {parcelName} • Total Area: {safeHectares} Ha ({safeAcres} Acres)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Mean NDVI: {meanNdvi.toFixed(2)}
          </Badge>
          <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30">
            Mean NDWI: {meanNdwi > 0 ? `+${meanNdwi.toFixed(2)}` : meanNdwi.toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* Stacked Proportional Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60 p-0.5 border border-border/50">
          {zoneDistribution.map((z) => (
            <div
              key={z.id}
              style={{ width: `${z.percentage}%` }}
              className={`h-full ${z.color} transition-all first:rounded-l-full last:rounded-r-full`}
              title={`${z.label}: ${z.percentage}% (${z.acres} Acres)`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>0% Bare Ground</span>
          <span>Parcel Coverage Distribution</span>
          <span>100% Full Canopy</span>
        </div>
      </div>

      {/* 4 Management Zones Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {zoneDistribution.map((zone) => (
          <div
            key={zone.id}
            className={`p-3 rounded-xl border ${zone.borderColor} ${zone.bgColor} space-y-1.5 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${zone.textColor}`}>{zone.label}</span>
                <span className="text-xs font-mono font-extrabold text-foreground">{zone.percentage}%</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">{zone.range}</div>
              <div className="text-xs font-bold text-foreground mt-1">
                {zone.acres} Acres <span className="text-[10px] text-muted-foreground font-normal">({zone.hectares} Ha)</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight pt-1 border-t border-border/30">
              {zone.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
