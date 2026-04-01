import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Leaf, TreePine, Loader2, Car, Wind, Users, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";


const Analytics = () => {
  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["analytics-trees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("created_at, species, verification_status, admin_status, location");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["analytics-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, trees_planted").gt("trees_planted", 0);
      if (error) throw error;
      return data || [];
    },
  });

  // Only approved trees count
  const approvedTrees = trees.filter(t => t.admin_status === "approved");

  // Build monthly data
  const monthlyMap: Record<string, number> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  approvedTrees.forEach(t => {
    const d = new Date(t.created_at);
    const key = months[d.getMonth()];
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyData = months.map(m => ({ month: m, trees: monthlyMap[m] || 0 }));
  const co2Data = months.map(m => ({ month: m, co2: Math.round((monthlyMap[m] || 0) * 21) }));

  // Stats from verified/approved data only
  const totalApproved = approvedTrees.length;
  const totalCO2 = totalApproved * 21;
  const totalO2 = totalApproved * 100;
  const carsRemoved = (totalCO2 / 4600).toFixed(1);
  const speciesSet = new Set(approvedTrees.map(t => t.species));
  const activePlanters = profiles.length;

  // Cities
  const citySet = new Set<string>();
  approvedTrees.forEach(t => {
    const parts = t.location?.split(",") || [];
    if (parts.length > 1) citySet.add(parts[parts.length - 2]?.trim() || "");
  });

  const hasData = totalApproved > 0;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <BarChart3 className="h-4 w-4" /> Environmental Analytics
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Environmental Impact Dashboard</h1>
            <p className="text-muted-foreground">Real-time analytics from verified community data only</p>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : !hasData ? (
            <div className="text-center py-20">
              <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No verified data yet</h3>
              <p className="text-muted-foreground">Analytics will appear once trees are verified and approved by admins.</p>
            </div>
          ) : (
            <>
              {/* Animated counter stats */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {[
                  { label: "Trees Registered", value: totalApproved, icon: <TreePine className="h-5 w-5" />, suffix: "" },
                  { label: "CO₂ Absorbed (kg/yr)", value: totalCO2, icon: <Leaf className="h-5 w-5" />, suffix: " kg" },
                  { label: "O₂ Generated (kg/yr)", value: totalO2, icon: <Wind className="h-5 w-5" />, suffix: " kg" },
                  { label: "Cars Removed", value: parseFloat(carsRemoved), icon: <Car className="h-5 w-5" />, suffix: "" },
                  { label: "Active Planters", value: activePlanters, icon: <Users className="h-5 w-5" />, suffix: "" },
                  { label: "Cities", value: citySet.size, icon: <MapPin className="h-5 w-5" />, suffix: "" },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="glass-card rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-xs">{s.label}</span>
                      <span className="text-primary">{s.icon}</span>
                    </div>
                    <div className="font-heading text-2xl font-bold">
                      {typeof s.value === "number" ? s.value.toLocaleString() : s.value}{s.suffix}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Verified Trees Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="trees" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" /> CO₂ Offset (kg/yr)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={co2Data}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Area type="monotone" dataKey="co2" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Species breakdown */}
              <div className="glass-card rounded-2xl p-6 mt-8">
                <h3 className="font-heading font-semibold mb-4">Species Diversity ({speciesSet.size} species)</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(speciesSet).map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{s}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
