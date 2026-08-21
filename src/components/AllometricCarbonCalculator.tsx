import { useState } from "react";
import {
  calculateAllometricCarbon,
  SPECIES_ALLOMETRY_CATALOG,
  CarbonBiomassResult,
} from "@/lib/carbonBiomassEngine";
import { Trees, Calculator, Sparkles, Award, IndianRupee, DollarSign, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AllometricCarbonCalculator() {
  const [speciesKey, setSpeciesKey] = useState("teak");
  const [treeCount, setTreeCount] = useState(5000);
  const [ageMonths, setAgeMonths] = useState(24);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [customDbh, setCustomDbh] = useState<number | undefined>(undefined);
  const [customHeight, setCustomHeight] = useState<number | undefined>(undefined);

  const result: CarbonBiomassResult = calculateAllometricCarbon({
    speciesKey,
    treeCount,
    ageMonths,
    customDbhCm: customDbh,
    customHeightM: customHeight,
  });

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">
              Scientific Allometric Carbon & Biomass Modeler
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on Chave Pantropical Forestry Allometry & IPCC 2006/2019 Carbon Accounting Guidelines.
          </p>
        </div>

        <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          IPCC Tier-2 Compliant
        </Badge>
      </div>

      {/* Input Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 rounded-xl bg-background/50 border border-primary/10">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Target Species</label>
          <Select value={speciesKey} onValueChange={setSpeciesKey}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
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
          <label className="text-xs text-muted-foreground block mb-1">Total Tree Inventory</label>
          <input
            type="number"
            min={10}
            max={500000}
            step={500}
            value={treeCount}
            onChange={(e) => setTreeCount(Math.max(1, Number(e.target.value)))}
            className="w-full h-9 rounded-xl border border-primary/20 bg-background px-3 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Plantation Age: <strong className="text-primary">{ageMonths} Months</strong> ({(ageMonths / 12).toFixed(1)} Yrs)
          </label>
          <input
            type="range"
            min={3}
            max={120}
            step={3}
            value={ageMonths}
            onChange={(e) => setAgeMonths(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
        </div>
      </div>

      {/* Advanced Measurement Override (DBH & Height) */}
      <div className="mb-4">
        <button
          onClick={() => setIsAdvanced(!isAdvanced)}
          className="text-xs text-primary hover:underline flex items-center gap-1 mb-2 font-medium"
        >
          {isAdvanced ? "− Hide Manual Tree Measurements" : "+ Override DBH & Height (Field Caliper Measurements)"}
        </button>

        {isAdvanced && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-primary/10 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Diameter at Breast Height (DBH in cm)</label>
              <input
                type="number"
                placeholder={`Est: ${result.dbhCm} cm`}
                value={customDbh || ""}
                onChange={(e) => setCustomDbh(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-8 rounded-lg border border-primary/20 bg-background px-2.5 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Tree Height (meters)</label>
              <input
                type="number"
                placeholder={`Est: ${result.heightM} m`}
                value={customHeight || ""}
                onChange={(e) => setCustomHeight(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-8 rounded-lg border border-primary/20 bg-background px-2.5 text-xs focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Telemetry Output Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Mean Tree DBH / Ht</div>
          <div className="font-heading font-bold text-lg text-foreground">
            {result.dbhCm} cm <span className="text-xs text-muted-foreground">/ {result.heightM}m</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Wood Density: {result.speciesDetails.woodDensity} g/cm³</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Total Standing Biomass</div>
          <div className="font-heading font-bold text-lg text-primary">
            {result.totalPlotDryBiomassMetricTons} MT
          </div>
          <div className="text-[10px] text-muted-foreground">{result.totalDryBiomassKgPerTree} kg / tree</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[11px] text-muted-foreground">Annual CO₂e Rate</div>
          <div className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
            {result.annualPlotCo2eMetricTons} MT/yr
          </div>
          <div className="text-[10px] text-muted-foreground">{result.co2eSequesteredKgPerTree} kg CO₂ / tree</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[11px] text-muted-foreground">10-Yr Carbon Yield</div>
          <div className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
            {result.tenYearPlotCo2eMetricTons} MT
          </div>
          <div className="text-[10px] text-muted-foreground">Verifiable Carbon Credits</div>
        </div>
      </div>

      {/* Financial Carbon Offset Valuation Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-emerald-500/10 border border-emerald-500/30 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-bold text-base text-foreground">
              Estimated 10-Year Carbon Credit Valuation
            </div>
            <div className="text-muted-foreground">
              Benchmarked at global voluntary market rates ($15 USD / ₹1,250 INR per MT CO₂e)
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-heading font-bold text-xl text-emerald-600 dark:text-emerald-400">
            ₹{result.carbonCreditValuationInr.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            (${result.carbonCreditValuationUsd.toLocaleString("en-US")} USD)
          </div>
        </div>
      </div>

      {/* Formula & Ecological Note */}
      <div className="p-3 rounded-xl bg-background/50 border border-primary/10 text-[11px] text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Species Ecological Impact: </span>
          {result.speciesDetails.ecologicalBenefit}.
          <span className="block mt-0.5 font-mono text-[10px]">
            Formula: AGB = 0.0673 × (ρ × DBH² × H)^0.976 | BGB = AGB × {result.speciesDetails.rootToShootRatio} | C = TB × {result.speciesDetails.carbonFraction} | CO₂e = C × 3.667
          </span>
        </div>
      </div>
    </div>
  );
}
