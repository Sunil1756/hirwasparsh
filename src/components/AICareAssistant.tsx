import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageProcessing";
import { nearbyNativeSuggestions } from "@/lib/treeIntelligence";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Stethoscope, CalendarDays, Sprout, Loader2, Upload, MapPin, Bot,
  AlertTriangle, ShieldCheck, Droplets, Scissors, Bug, ListChecks, Ban,
} from "lucide-react";

type Mode = "diagnose" | "seasonal" | "recommend";

const MODES: { id: Mode; label: string; icon: typeof Bot; hint: string }[] = [
  { id: "diagnose", label: "Disease Diagnosis", icon: Stethoscope, hint: "Upload a leaf/tree photo for a pathology read" },
  { id: "seasonal", label: "Seasonal Care", icon: CalendarDays, hint: "Month-wise care plan tuned to the monsoon cycle" },
  { id: "recommend", label: "Best Trees Here", icon: Sprout, hint: "Species ranked for your exact location" },
];

const severityTone: Record<string, string> = {
  none: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  mild: "text-lime-600 bg-lime-500/10 border-lime-500/30",
  moderate: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30",
  severe: "text-red-600 bg-red-500/10 border-red-500/30",
};

const Chips = ({ items, icon: Icon, title }: { items?: string[]; icon: typeof Bot; title: string }) => {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AICareAssistant = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("diagnose");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultMode, setResultMode] = useState<Mode>("diagnose");

  // shared inputs
  const [species, setSpecies] = useState("");
  const [location, setLocation] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  // diagnose
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [symptoms, setSymptoms] = useState("");
  // recommend
  const [goal, setGoal] = useState("Maximum environmental impact");
  const [space, setSpace] = useState("Open ground, medium space");

  const onPick = async (f?: File | null) => {
    if (!f) return;
    const compressed = await compressImage(f);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation(`${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)} (Maharashtra, India)`),
      () => toast({ title: "Location unavailable", description: "Type your city or district instead.", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const run = async () => {
    if (mode === "diagnose" && !file) {
      toast({ title: "Photo required", description: "Upload a clear photo of the affected leaves or trunk.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        mode,
        species,
        location,
        ageMonths: ageMonths ? Number(ageMonths) : undefined,
      };
      if (mode === "diagnose") {
        payload.imageBase64 = await toBase64(file!);
        payload.symptoms = symptoms;
      }
      if (mode === "seasonal") payload.month = new Date().toLocaleString("en-IN", { month: "long" });
      if (mode === "recommend") { payload.goal = goal; payload.space = space; }

      const { data, error } = await supabase.functions.invoke("tree-assistant", { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).result);
      setResultMode(mode);
    } catch (e: any) {
      toast({ title: "Assistant unavailable", description: e?.message || "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-primary/15 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors";

  return (
    <section className="glass-card rounded-2xl border border-primary/10 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Bot className="h-5 w-5" /></div>
        <div>
          <h2 className="font-heading text-xl font-bold">AI Tree Care Assistant</h2>
          <p className="text-sm text-muted-foreground">Diagnose disease, plan seasonal care, and find the best species for your location.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mb-5">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }}
            className={`text-left rounded-xl border p-3 transition-all ${
              mode === m.id ? "border-primary/50 bg-primary/10 shadow-sm" : "border-primary/10 bg-background/40 hover:border-primary/30"
            }`}>
            <div className="flex items-center gap-2 font-medium text-sm">
              <m.icon className={`h-4 w-4 ${mode === m.id ? "text-primary" : "text-muted-foreground"}`} /> {m.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {mode === "diagnose" && (
            <>
              <label className="block">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Affected tree photo</div>
                <div className="rounded-xl border border-dashed border-primary/25 bg-background/40 p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
                  {preview ? (
                    <img src={preview} alt="Uploaded tree for AI disease diagnosis" className="mx-auto max-h-40 rounded-lg object-cover" />
                  ) : (
                    <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 py-3">
                      <Upload className="h-5 w-5" /> Tap to upload leaves / trunk close-up
                    </div>
                  )}
                </div>
              </label>
              <textarea className={inputClass} rows={2} placeholder="Symptoms you noticed (yellow spots, curling, wilting...)"
                value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            </>
          )}

          {mode !== "recommend" && (
            <input className={inputClass} placeholder="Species (e.g. Neem, Mango)" value={species} onChange={(e) => setSpecies(e.target.value)} />
          )}
          {mode !== "recommend" && (
            <input className={inputClass} type="number" min={0} placeholder="Tree age in months" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} />
          )}

          {mode === "recommend" && (
            <>
              <input className={inputClass} placeholder="Planting goal (shade, fruit, CO₂, avenue...)" value={goal} onChange={(e) => setGoal(e.target.value)} />
              <input className={inputClass} placeholder="Available space & soil (roadside, campus, black cotton soil...)" value={space} onChange={(e) => setSpace(e.target.value)} />
            </>
          )}

          <div className="flex gap-2">
            <input className={inputClass} placeholder="Your city / district" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Button type="button" variant="outline" size="icon" onClick={useMyLocation} aria-label="Use my location">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>

          {mode === "recommend" && location && (
            <p className="text-xs text-muted-foreground">
              Quick natives nearby: {nearbyNativeSuggestions(location).join(", ")}
            </p>
          )}

          <Button className="w-full" onClick={run} disabled={loading}>
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consulting AI arborist…</>) : (<>Ask the assistant</>)}
          </Button>
        </div>

        <div className="rounded-xl border border-primary/10 bg-background/40 p-4 min-h-[220px]">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-3 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Analysing with the environmental intelligence model…
              </motion.div>
            )}

            {!loading && !result && (
              <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center text-center text-sm text-muted-foreground py-10 px-4">
                Results appear here — diagnosis with treatment steps, a month-wise care plan, or ranked species for your site.
              </motion.div>
            )}

            {!loading && result && resultMode === "diagnose" && (
              <motion.div key="d" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {result.is_plant === false && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    <AlertTriangle className="h-4 w-4" /> This photo doesn't appear to show a plant.
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Likely diagnosis</div>
                    <div className="font-heading text-lg font-bold">{result.diagnosis}</div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full border capitalize ${severityTone[result.severity] || severityTone.mild}`}>
                    {result.severity}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Confidence {Math.round(result.confidence)}%</span>
                  <span>•</span>
                  <span>Act within {result.urgency_days} day{result.urgency_days === 1 ? "" : "s"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${result.confidence}%` }} transition={{ duration: 0.8 }} />
                </div>
                <Chips items={result.symptoms_observed} icon={Bug} title="Symptoms observed" />
                <Chips items={result.likely_causes} icon={AlertTriangle} title="Likely causes" />
                <Chips items={result.treatment_steps} icon={ListChecks} title="Treatment steps" />
                <Chips items={result.organic_remedies} icon={Droplets} title="Organic remedies" />
                <Chips items={result.prevention} icon={ShieldCheck} title="Prevention" />
              </motion.div>
            )}

            {!loading && result && resultMode === "seasonal" && (
              <motion.div key="s" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Current season</div>
                  <div className="font-heading text-lg font-bold">{result.season}</div>
                  <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Droplets, label: "Watering", v: result.watering },
                    { icon: Sprout, label: "Mulching", v: result.mulching },
                    { icon: Sprout, label: "Fertilizing", v: result.fertilizing },
                    { icon: Scissors, label: "Pruning", v: result.pruning },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg border border-primary/10 bg-background/60 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                        <c.icon className="h-3.5 w-3.5" /> {c.label}
                      </div>
                      <p className="text-xs text-foreground/80">{c.v}</p>
                    </div>
                  ))}
                </div>
                <Chips items={result.pest_watch} icon={Bug} title="Pest watch" />
                <Chips items={result.risks} icon={AlertTriangle} title="Seasonal risks" />
                <Chips items={result.monthly_checklist} icon={ListChecks} title="This month's checklist" />
              </motion.div>
            )}

            {!loading && result && resultMode === "recommend" && (
              <motion.div key="r" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Site read</div>
                  <p className="text-sm">{result.location_summary}</p>
                  <p className="text-xs text-primary mt-1">Best planting window: {result.best_planting_window}</p>
                </div>
                <div className="space-y-2">
                  {(result.recommendations || []).map((r: any, i: number) => (
                    <motion.div key={r.common_name + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="rounded-lg border border-primary/10 bg-background/60 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm">
                            {r.common_name}{" "}
                            {r.native && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary align-middle">Native</span>}
                          </div>
                          <div className="text-xs italic text-muted-foreground">{r.scientific_name}</div>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{Math.round(r.suitability)}%</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1.5">{r.why}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2 text-[11px] text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-primary/5">≈{r.co2_kg_per_year} kg CO₂/yr</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/5">{r.water_need} water</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/5">{r.growth_rate} growth</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{r.care_note}</p>
                    </motion.div>
                  ))}
                </div>
                <Chips items={result.avoid} icon={Ban} title="Avoid planting here" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default AICareAssistant;
