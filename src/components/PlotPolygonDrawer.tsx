import { useState } from "react";
import { MapPin, Sparkles, ShieldCheck, FileText, Trees, PieChart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculatePlotMetrics } from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { toast } from "sonner";

interface Props {
  onPlotSaved?: (plotData: any) => void;
}

export function PlotPolygonDrawer({ onPlotSaved }: Props) {
  const [plotName, setPlotName] = useState("Sahyadri Biodiversity Agro-Plot");
  const [district, setDistrict] = useState("Satara");
  const [areaSqM, setAreaSqM] = useState(16187); // ~4 acres
  const [treeCount, setTreeCount] = useState(650);
  const [avgAgeMonths, setAvgAgeMonths] = useState(18);

  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const metrics = calculatePlotMetrics({
    areaSquareMeters: areaSqM,
    treeCount,
    averageAgeMonths: avgAgeMonths,
  });

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeCanopyWithAI({
        plotName,
        areaAcres: metrics.acres,
        district,
        treeCount,
        ndviScore: metrics.ndviScore,
      });
      setAiReport(res);
      toast.success("AI Parcel Analysis Complete!");
    } catch (e: any) {
      toast.error("Failed to run analysis: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-lg">Agroforestry Parcel Boundary & Carbon Estimator</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Geo-fenced plot boundary calculator & carbon credit yield simulator (Map My Crop model).
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
          Turf.js Powered
        </Badge>
      </div>

      {/* Plot Configuration Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Plot Name</label>
          <input
            type="text"
            value={plotName}
            onChange={(e) => setPlotName(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">District / Region</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Planted Tree Count</label>
          <input
            type="number"
            value={treeCount}
            onChange={(e) => setTreeCount(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-primary/20 bg-background/60 px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Area Sliders */}
      <div className="p-3 rounded-xl bg-background/50 border border-primary/10 mb-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Plot Size:</span>
          <span className="font-semibold text-primary">
            {metrics.acres} Acres ({metrics.hectares} Hectares / {areaSqM.toLocaleString()} m²)
          </span>
        </div>
        <input
          type="range"
          min={2000}
          max={100000}
          step={1000}
          value={areaSqM}
          onChange={(e) => setAreaSqM(Number(e.target.value))}
          className="w-full accent-primary"
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Average Plantation Age:</span>
          <span className="font-semibold text-primary">{avgAgeMonths} Months</span>
        </div>
        <input
          type="range"
          min={3}
          max={60}
          step={3}
          value={avgAgeMonths}
          onChange={(e) => setAvgAgeMonths(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Tree Density</div>
          <div className="font-heading font-bold text-lg text-primary">{metrics.densityPerHectare}</div>
          <div className="text-[10px] text-muted-foreground">Trees / Hectare</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
          <div className="text-[11px] text-muted-foreground">Canopy Cover</div>
          <div className="font-heading font-bold text-lg text-primary">{metrics.canopyCoveragePercent}%</div>
          <div className="text-[10px] text-muted-foreground">Canopy Closure</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[11px] text-muted-foreground">Annual CO₂ Offset</div>
          <div className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
            {metrics.annualCo2MetricTons} MT
          </div>
          <div className="text-[10px] text-muted-foreground">CO₂e / Year</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[11px] text-muted-foreground">10-Yr Carbon Yield</div>
          <div className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
            {metrics.tenYearOffsetTons} MT
          </div>
          <div className="text-[10px] text-muted-foreground">Carbon Credits</div>
        </div>
      </div>

      {/* AI Interpretation Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          onClick={handleRunAiAnalysis}
          disabled={analyzing}
          className="rounded-xl flex items-center gap-2"
        >
          {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzing ? "Analyzing Remote Sensing..." : "Run AI Agroforestry Satellite Analysis"}
        </Button>
      </div>

      {/* AI Satellite Report Output */}
      {aiReport && (
        <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-2">
          <div className="font-semibold text-primary flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> AI Remote Sensing Health Assessment
          </div>
          <p className="text-foreground/90">{aiReport.canopy_health_summary}</p>
          <p className="text-muted-foreground"><strong>Biomass:</strong> {aiReport.biomass_assessment}</p>
          
          <div className="pt-2 border-t border-primary/10">
            <div className="font-semibold mb-1">Agroforestry Action Recommendations:</div>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              {aiReport.recommendations?.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
