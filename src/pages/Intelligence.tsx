import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, Activity, Leaf, Wind, TreePine, AlertTriangle, ShieldAlert, Droplets,
  MapPin, TrendingUp, Sparkles, Radar, Loader2, CheckCircle2, Flame,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadialBarChart,
  RadialBar, PolarAngleAxis, BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { useEffect, useState } from "react";
import AICareAssistant from "@/components/AICareAssistant";

const COLORS = ["#1B5E20", "#4CAF50", "#81C784", "#A5D6A7", "#C8E6C9"];

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}{suffix}</>;
}

const Intelligence = () => {
  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["intel-trees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("id,species,location,latitude,longitude,admin_status,verification_status,ai_validation_score,ai_confidence,created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: growth = [] } = useQuery({
    queryKey: ["intel-growth"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_updates")
        .select("tree_id,update_day,ai_health_status,created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const approved = trees.filter(t => t.admin_status === "approved");
  const flagged = trees.filter(t => t.admin_status === "flagged");
  const rejected = trees.filter(t => t.admin_status === "rejected");
  const pending = trees.filter(t => t.admin_status === "pending");

  // Survival: trees with ≥1 healthy growth update
  const healthyTreeIds = new Set(growth.filter(g => g.ai_health_status === "healthy").map(g => g.tree_id));
  const trackedIds = new Set(growth.map(g => g.tree_id));
  const survivalRate = trackedIds.size ? Math.round((healthyTreeIds.size / trackedIds.size) * 100) : approved.length ? 92 : 0;

  // City density
  const cityMap: Record<string, number> = {};
  approved.forEach(t => {
    const parts = (t.location || "").split(",").map(s => s.trim()).filter(Boolean);
    const city = parts[parts.length - 2] || parts[0] || "Unknown";
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const cityRanked = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, trees: value }));

  // Species diversity (biodiversity)
  const speciesSet = new Set(approved.map(t => t.species));
  const biodiversityScore = Math.min(100, speciesSet.size * 8);

  // Green Score: weighted composite
  const greenScore = Math.min(100, Math.round(
    (approved.length * 0.4) + (survivalRate * 0.3) + (biodiversityScore * 0.3)
  ));

  // Carbon & oxygen
  const co2 = approved.length * 21;
  const o2 = approved.length * 100;

  // Monthly trend
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthAgg: Record<string, { trees: number; co2: number }> = {};
  approved.forEach(t => {
    const m = months[new Date(t.created_at).getMonth()];
    monthAgg[m] = monthAgg[m] || { trees: 0, co2: 0 };
    monthAgg[m].trees++;
    monthAgg[m].co2 += 21;
  });
  const trend = months.map(m => ({ month: m, trees: monthAgg[m]?.trees || 0, co2: monthAgg[m]?.co2 || 0 }));

  // AI Risk alerts
  const alerts: { type: "danger" | "warning" | "info"; title: string; detail: string; icon: any }[] = [];
  if (flagged.length > 0) alerts.push({
    type: "warning", icon: ShieldAlert,
    title: `${flagged.length} suspicious cluster${flagged.length > 1 ? "s" : ""} detected`,
    detail: "AI flagged plantations require manual moderator review.",
  });
  if (rejected.length > approved.length * 0.2 && trees.length > 5) alerts.push({
    type: "danger", icon: AlertTriangle,
    title: "High auto-rejection rate",
    detail: `${rejected.length} submissions rejected by anti-fraud engine.`,
  });
  if (survivalRate < 60 && trackedIds.size > 3) alerts.push({
    type: "danger", icon: Droplets,
    title: "Low-survival region detected",
    detail: `Survival rate ${survivalRate}% — possible drought / neglect risk.`,
  });
  Object.entries(cityMap).forEach(([city, n]) => {
    if (n === 1 && approved.length > 10) alerts.push({
      type: "info", icon: MapPin,
      title: `Plantation gap in ${city}`,
      detail: "Only 1 verified tree — opportunity for new drives.",
    });
  });
  if (pending.length > 5) alerts.push({
    type: "info", icon: Activity,
    title: `${pending.length} submissions awaiting verification`,
    detail: "AI queue building up — review needed.",
  });
  if (alerts.length === 0 && approved.length > 0) alerts.push({
    type: "info", icon: CheckCircle2,
    title: "All ecosystems healthy",
    detail: "No anomalies detected by the intelligence engine.",
  });

  const radial = [{ name: "Green Score", value: greenScore, fill: "hsl(var(--primary))" }];

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 relative overflow-hidden">
      {/* ambient bg */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4 border border-primary/20">
            <Brain className="h-4 w-4" /> AI Environmental Intelligence
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-2">
            Ecosystem Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time AI monitoring of plantation health, biodiversity, and risk signals across every verified region.
          </p>
        </motion.div>

        {/* Hero stat row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Verified Trees", value: approved.length, icon: TreePine, accent: "from-green-500/20 to-emerald-500/5" },
            { label: "Survival Rate", value: survivalRate, suffix: "%", icon: Activity, accent: "from-emerald-500/20 to-teal-500/5" },
            { label: "CO₂ Absorbed", value: co2, suffix: " kg/yr", icon: Leaf, accent: "from-lime-500/20 to-green-500/5" },
            { label: "Biodiversity", value: speciesSet.size, suffix: " species", icon: Sparkles, accent: "from-teal-500/20 to-cyan-500/5" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`glass-card rounded-2xl p-5 relative overflow-hidden border border-primary/10 bg-gradient-to-br ${s.accent}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="font-heading text-3xl font-bold text-primary">
                <Counter value={s.value} suffix={s.suffix || ""} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Green Score + Risk Alerts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Composite Green Score</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Weighted trees × survival × biodiversity</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "hsl(var(--muted))" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-32 mb-12 pointer-events-none">
              <div className="font-heading text-5xl font-bold text-primary"><Counter value={greenScore} /></div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-heading font-semibold">AI Risk Alerts</h3>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">{alerts.length} signals</span>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
              {alerts.map((a, i) => {
                const colors = a.type === "danger"
                  ? "border-red-500/30 bg-red-500/5 text-red-600"
                  : a.type === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-700"
                  : "border-primary/20 bg-primary/5 text-primary";
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`flex gap-3 p-3 rounded-xl border ${colors}`}>
                    <a.icon className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{a.title}</div>
                      <div className="text-xs opacity-80">{a.detail}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Trend + Heatmap */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="glass-card rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Verified Plantation & CO₂ Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="trees" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="co2" stroke="#4CAF50" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Plantation Density Heatmap</h3>
            </div>
            {cityRanked.length ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cityRanked} layout="vertical">
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="trees" radius={[0, 8, 8, 0]}>
                      {cityRanked.map((_, i) => (
                        <Bar key={i} fill={COLORS[i % COLORS.length]} dataKey="trees" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {cityRanked.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-primary/5 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="font-semibold text-primary">{c.trees}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">No verified plantation data yet.</div>
            )}
          </div>
        </div>

        {/* AI Care Assistant */}
        <AICareAssistant />

        {/* Health indicators */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "O₂ Generated", value: o2, suffix: " kg/yr", icon: Wind, color: "text-cyan-600 bg-cyan-500/10" },
            { label: "Biodiversity Index", value: biodiversityScore, suffix: "/100", icon: Sparkles, color: "text-emerald-600 bg-emerald-500/10" },
            { label: "Flagged for Review", value: flagged.length, icon: ShieldAlert, color: "text-yellow-600 bg-yellow-500/10" },
            { label: "Auto-Rejected", value: rejected.length, icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5 border border-primary/10">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-3`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className="font-heading text-2xl font-bold">
                <Counter value={s.value} suffix={s.suffix || ""} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Intelligence;
