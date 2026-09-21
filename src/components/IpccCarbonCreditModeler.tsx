import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trees,
  TrendingUp,
  Award,
  ShieldCheck,
  Download,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  Sprout,
  TreePine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  calculateIpccCarbonModel,
  IpccCarbonModelResult,
  IPCC_SPECIES_PROFILES,
  TreeGrowthStage,
} from "@/lib/ipccCarbonModeler";
import { useToast } from "@/hooks/use-toast";

interface Props {
  initialPlantedTrees?: number;
  initialSurvivalRate?: number;
  initialAgeYears?: number;
  initialSpeciesKey?: string;
  projectName?: string;
  organizationName?: string;
  className?: string;
}

export function IpccCarbonCreditModeler({
  initialPlantedTrees = 1000,
  initialSurvivalRate = 94,
  initialAgeYears = 3.0,
  initialSpeciesKey = "mixed_native",
  projectName = "Maharashtra Agroforestry Sector 4",
  organizationName = "Institutional ESG Partner",
  className = "",
}: Props) {
  const { toast } = useToast();
  const [plantedTrees, setPlantedTrees] = useState(initialPlantedTrees);
  const [survivalRate, setSurvivalRate] = useState(initialSurvivalRate);
  const [ageYears, setAgeYears] = useState(initialAgeYears);
  const [speciesKey, setSpeciesKey] = useState(initialSpeciesKey);
  const [bufferPct, setBufferPct] = useState(12);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Compute live IPCC Carbon Model Result
  const modelResult: IpccCarbonModelResult = useMemo(() => {
    return calculateIpccCarbonModel({
      plantedTrees,
      survivalRatePct: survivalRate,
      ageYears,
      speciesKey,
      permanenceBufferPct: bufferPct,
    });
  }, [plantedTrees, survivalRate, ageYears, speciesKey, bufferPct]);

  const {
    verifiedLivingTrees,
    currentGrowthStage,
    speciesProfile,
    totalPlotBiomassMT,
    annualGrossPlotCo2eMT,
    permanenceBufferMT,
    annualNetCertifiedCreditsMT,
    tenYearNetCertifiedCreditsMT,
    twentyYearNetCertifiedCreditsMT,
    annualValuationInr,
    tenYearValuationInr,
    projections20Years,
    methodologyStandard,
    esgBrsrClassification,
  } = modelResult;

  // Prepare chart data for 20-Year Carbon Accretion Curve
  const chartData = useMemo(() => {
    return projections20Years.map((p) => ({
      year: `Yr ${p.year}`,
      netCredits: p.netCertifiedCreditsIssuedMT,
      bufferMT: p.bufferDeductionMT,
      cumulativeCredits: p.cumulativeNetCreditsMT,
      stage: p.growthStageLabel,
    }));
  }, [projections20Years]);

  const handleExportAuditSummary = () => {
    toast({
      title: "📄 IPCC Carbon Audit Report Generated!",
      description: `SEBI BRSR Scope 1/3 Certificate for ${projectName}: ${annualNetCertifiedCreditsMT} MT CO₂e/yr verified.`,
    });
  };

  return (
    <div
      className={`glass-card rounded-3xl p-6 sm:p-8 border border-primary/25 shadow-xl relative overflow-hidden space-y-6 ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trees className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">
              IPCC Tier-2 Carbon Credit &amp; Biomass Modeler
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Allometric pantropical sequestration modeling &amp; Verra VM0047 buffer accounting for{" "}
            <span className="font-semibold text-foreground">{projectName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className="text-xs gap-1.5 rounded-xl border-primary/30 hover:bg-primary/10"
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            {isSimulatorOpen ? "Hide Modeler Sliders" : "Interactive Parameter Modeler"}
          </Button>

          <Button
            size="sm"
            onClick={handleExportAuditSummary}
            className="text-xs gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md"
          >
            <Download className="h-3.5 w-3.5" /> Export BRSR Audit
          </Button>
        </div>
      </div>

      {/* Stand Lifecycle & Growth Stage Indicator */}
      <div className="p-4 rounded-2xl bg-muted/40 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            {currentGrowthStage.stage === "sapling_establishment" ? (
              <Sprout className="h-6 w-6 text-amber-500" />
            ) : currentGrowthStage.stage === "young_vegetative" ? (
              <TreePine className="h-6 w-6 text-emerald-500" />
            ) : (
              <Trees className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-foreground">
                Current Phenology: {currentGrowthStage.stageLabel}
              </h3>
              <Badge className={`text-[10px] font-bold border ${currentGrowthStage.badgeColor}`}>
                {currentGrowthStage.ageRangeYears}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentGrowthStage.description} (Dominant:{" "}
              <strong>{speciesProfile.speciesName}</strong>, Wood Density ρ ={" "}
              {speciesProfile.woodDensityRho} g/cm³)
            </p>
          </div>
        </div>

        <div className="text-right sm:self-center shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Verified Living Stand
          </div>
          <div className="font-heading text-xl font-bold text-foreground">
            {verifiedLivingTrees.toLocaleString()} / {plantedTrees.toLocaleString()} Trees
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {survivalRate}% Verified Survival
          </div>
        </div>
      </div>

      {/* 4-Pillar Carbon Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Annual Net Certified Credits */}
        <div className="p-4 rounded-2xl bg-background/60 border border-primary/20 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Annual Net Credits</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {annualNetCertifiedCreditsMT.toFixed(1)} MT
          </div>
          <div className="text-[11px] text-muted-foreground">
            Net tCO₂e / yr (after {bufferPct}% buffer)
          </div>
        </div>

        {/* Metric 2: 10-Year Cumulative Carbon Sink */}
        <div className="p-4 rounded-2xl bg-background/60 border border-primary/20 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>10-Yr Certified Sink</span>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400">
            {tenYearNetCertifiedCreditsMT.toFixed(1)} MT
          </div>
          <div className="text-[11px] text-muted-foreground">
            Cumulative 10-Year Issued Offset
          </div>
        </div>

        {/* Metric 3: Total Standing Living Biomass */}
        <div className="p-4 rounded-2xl bg-background/60 border border-primary/20 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Standing Dry Biomass</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {totalPlotBiomassMT.toFixed(1)} MT
          </div>
          <div className="text-[11px] text-muted-foreground">
            Above &amp; Below-Ground Biomass
          </div>
        </div>

        {/* Metric 4: Market Credit Valuation */}
        <div className="p-4 rounded-2xl bg-background/60 border border-primary/20 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Annual Valuation</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
            ₹{annualValuationInr.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            (@ $15 / MT · 10-Yr: ₹{tenYearValuationInr.toLocaleString("en-IN")})
          </div>
        </div>
      </div>

      {/* 20-Year Carbon Accretion Timeline Chart (Recharts) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              20-Year IPCC Biomass Accretion &amp; Certified Carbon Credit Issuance Timeline
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-emerald-500 rounded-sm inline-block" /> Net Credits Issued
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-amber-500/50 rounded-sm inline-block" /> Verra Buffer Reserve
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 bg-sky-500 rounded-sm inline-block" /> Cumulative Sink
            </span>
          </div>
        </div>

        <div className="h-64 w-full p-2 rounded-2xl bg-background/60 border border-primary/15">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netCreditsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cumulativeCreditsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background) / 0.95)",
                  borderColor: "hsl(var(--primary) / 0.3)",
                  borderRadius: "12px",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCredits"
                stroke="#0284c7"
                strokeWidth={2}
                fill="url(#cumulativeCreditsGradient)"
                name="Cumulative Credits (tCO₂e)"
              />
              <Area
                type="monotone"
                dataKey="netCredits"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#netCreditsGradient)"
                name="Annual Net Issued (tCO₂e/yr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Parameter Simulator Drawer */}
      {isSimulatorOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-5 text-xs"
        >
          <div className="flex items-center justify-between border-b border-primary/15 pb-2">
            <h4 className="font-heading text-sm font-bold flex items-center gap-2 text-primary">
              <Sliders className="h-4 w-4" /> Live IPCC Carbon Credit Modeler Parameters
            </h4>
            <span className="text-[11px] text-muted-foreground">Adjust silvicultural inputs in real-time</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Species Selector */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Dominant Tree Species / Blend:</label>
              <Select value={speciesKey} onValueChange={setSpeciesKey}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(IPCC_SPECIES_PROFILES).map((sp) => (
                    <SelectItem key={sp.speciesKey} value={sp.speciesKey}>
                      {sp.speciesName} ({sp.woodDensityRho} g/cm³)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Planted Trees Slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Planted Cohort Size:</span>
                <span className="font-bold text-primary">{plantedTrees.toLocaleString()} trees</span>
              </div>
              <Slider
                min={100}
                max={5000}
                step={50}
                value={[plantedTrees]}
                onValueChange={([val]) => setPlantedTrees(val)}
              />
            </div>

            {/* Survival Rate % */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Verified Survival Rate:</span>
                <span className="font-bold text-emerald-600">{survivalRate}%</span>
              </div>
              <Slider
                min={40}
                max={100}
                step={1}
                value={[survivalRate]}
                onValueChange={([val]) => setSurvivalRate(val)}
              />
            </div>

            {/* Stand Age Years */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Current Stand Age:</span>
                <span className="font-bold text-sky-600">{ageYears.toFixed(1)} years</span>
              </div>
              <Slider
                min={0.5}
                max={15.0}
                step={0.5}
                value={[ageYears]}
                onValueChange={([val]) => setAgeYears(val)}
              />
            </div>

            {/* Permanence Buffer Reserve % */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Verra Buffer Pool Reserve:</span>
                <span className="font-bold text-amber-500">{bufferPct}% deduction</span>
              </div>
              <Slider
                min={5}
                max={25}
                step={1}
                value={[bufferPct]}
                onValueChange={([val]) => setBufferPct(val)}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Compliance & Methodology Footer */}
      <div className="p-3 rounded-xl bg-background/50 border text-[11px] text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Methodology Standard: </strong>
            {methodologyStandard}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
          {esgBrsrClassification}
        </Badge>
      </div>
    </div>
  );
}
