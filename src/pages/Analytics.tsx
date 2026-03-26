import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Leaf, TreePine, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Analytics = () => {
  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["analytics-trees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("created_at, species, verification_status");
      if (error) throw error;
      return data;
    },
  });

  // Build monthly data from real trees
  const monthlyMap: Record<string, number> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  trees.forEach((t) => {
    const d = new Date(t.created_at);
    const key = months[d.getMonth()];
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyData = months.map((m) => ({ month: m, trees: monthlyMap[m] || 0 }));

  // CO2 estimation: ~22kg per tree per year
  const co2Data = months.map((m) => ({ month: m, co2: Math.round((monthlyMap[m] || 0) * 22) }));

  // Stats
  const totalTrees = trees.length;
  const verifiedTrees = trees.filter((t) => t.verification_status === "verified").length;
  const totalCO2 = Math.round(totalTrees * 22);
  const speciesSet = new Set(trees.map((t) => t.species));

  const hasData = totalTrees > 0;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <BarChart3 className="h-4 w-4" /> Environmental Analytics
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Environmental Impact Dashboard</h1>
            <p className="text-muted-foreground">Real-time environmental analytics from community data</p>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : !hasData ? (
            <div className="text-center py-20">
              <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No data yet</h3>
              <p className="text-muted-foreground">Plant your first tree to start seeing real analytics here!</p>
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Trees", value: totalTrees, icon: <TreePine className="h-5 w-5" /> },
                  { label: "Verified", value: verifiedTrees, icon: <Leaf className="h-5 w-5" /> },
                  { label: "CO₂ Offset (kg/yr)", value: totalCO2, icon: <TrendingUp className="h-5 w-5" /> },
                  { label: "Species", value: speciesSet.size, icon: <BarChart3 className="h-5 w-5" /> },
                ].map((s, i) => (
                  <div key={i} className="glass-card rounded-xl p-5 flex items-center gap-4">
                    <div className="bg-primary/10 rounded-lg p-3 text-primary">{s.icon}</div>
                    <div>
                      <div className="text-2xl font-heading font-bold">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Trees Planted Over Time */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Trees Planted Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="trees" fill="hsl(125,56%,24%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* CO2 Absorption */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" /> CO₂ Offset Estimate (kg/yr)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={co2Data}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Area type="monotone" dataKey="co2" stroke="hsl(122,39%,49%)" fill="hsl(122,39%,49%,0.2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
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
