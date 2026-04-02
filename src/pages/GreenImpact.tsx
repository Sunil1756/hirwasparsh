import { motion } from "framer-motion";
import { Leaf, TreePine, Wind, Car, Users, ShieldCheck, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Progress } from "@/components/ui/progress";

const MH_DISTRICTS = [
  "Pune", "Solapur", "Kolhapur", "Sangli", "Satara", "Nagpur", "Nashik",
  "Mumbai", "Thane", "Ahmednagar", "Chhatrapati Sambhajinagar", "Amravati",
  "Ratnagiri", "Sindhudurg", "Raigad", "Latur", "Osmanabad", "Beed",
  "Jalgaon", "Dhule", "Nandurbar", "Buldhana", "Akola", "Washim",
  "Yavatmal", "Wardha", "Chandrapur", "Gadchiroli", "Gondia", "Bhandara",
  "Palghar", "Nanded", "Hingoli", "Parbhani", "Jalna"
];

const CO2_PER_TREE = 21; // kg/year
const O2_PER_TREE = 100; // kg/year
const CO2_PER_CAR = 4600; // kg/year
const SQ_M_PER_TREE = 10;

const GreenImpact = () => {
  const { data: trees = [] } = useQuery({
    queryKey: ["green-impact-trees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["green-impact-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, trees_planted, green_points");
      return data || [];
    },
  });

  const approved = trees.filter(t => t.admin_status === "approved");
  const aiVerified = trees.filter(t => t.verification_status === "verified");
  const totalTrees = approved.length;
  const co2 = totalTrees * CO2_PER_TREE;
  const o2 = totalTrees * O2_PER_TREE;
  const carsRemoved = totalTrees > 0 ? (co2 / CO2_PER_CAR).toFixed(1) : "0";
  const greenCoverSqKm = ((totalTrees * SQ_M_PER_TREE) / 1_000_000).toFixed(3);
  const survivalRate = trees.length > 0 ? Math.round((approved.length / trees.length) * 100) : 0;
  const activeGuardians = profiles.filter(p => p.trees_planted > 0).length;

  // District scores
  const districtScores: { name: string; score: number; trees: number }[] = [];
  const districtMap = new Map<string, { approved: number; total: number }>();
  trees.forEach(t => {
    const loc = t.location || "";
    const district = MH_DISTRICTS.find(d => loc.toLowerCase().includes(d.toLowerCase())) || "Other";
    const cur = districtMap.get(district) || { approved: 0, total: 0 };
    cur.total++;
    if (t.admin_status === "approved") cur.approved++;
    districtMap.set(district, cur);
  });
  districtMap.forEach((v, k) => {
    if (k === "Other") return;
    const survival = v.total > 0 ? v.approved / v.total : 0;
    const score = Math.min(100, Math.round((v.approved * 2 + survival * 50 + Math.min(v.approved, 20))));
    districtScores.push({ name: k, score, trees: v.approved });
  });
  districtScores.sort((a, b) => b.score - a.score);

  const greenIndex = trees.length > 0
    ? Math.min(100, Math.round((totalTrees * 0.4 + survivalRate * 0.4 + Math.min(districtScores.length, 20) * 1)))
    : 0;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Leaf className="h-8 w-8 text-primary" />
              <h1 className="font-heading text-4xl font-bold">Maharashtra Green Impact</h1>
            </div>
            <p className="text-muted-foreground">Real-time environmental impact of verified tree plantations across Maharashtra</p>
          </div>

          {/* Green Index */}
          <div className="glass-card rounded-2xl p-8 mb-8 text-center">
            <h2 className="font-heading text-xl text-muted-foreground mb-2">Maharashtra Green Index</h2>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-40 h-40" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${(greenIndex / 100) * 327} 327`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute font-heading text-4xl font-bold text-primary">{greenIndex}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">out of 100</p>
          </div>

          {/* Impact Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { icon: <TreePine className="h-6 w-6" />, label: "Total Trees Planted", value: totalTrees },
              { icon: <ShieldCheck className="h-6 w-6" />, label: "AI Verified Trees", value: aiVerified.length },
              { icon: <TrendingUp className="h-6 w-6" />, label: "Green Cover Increase", value: `${greenCoverSqKm} sq km` },
              { icon: <Wind className="h-6 w-6" />, label: "CO₂ Absorbed (kg/yr)", value: co2 },
              { icon: <Leaf className="h-6 w-6" />, label: "O₂ Generated (kg/yr)", value: o2 },
              { icon: <Car className="h-6 w-6" />, label: "Cars Removed Equivalent", value: carsRemoved },
              { icon: <Users className="h-6 w-6" />, label: "Active Tree Guardians", value: activeGuardians },
              { icon: <BarChart3 className="h-6 w-6" />, label: "Survival Rate", value: `${survivalRate}%` },
              { icon: <TreePine className="h-6 w-6" />, label: "Top Districts Active", value: districtScores.length },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                  <span className="text-primary">{s.icon}</span>
                </div>
                <div className="font-heading text-2xl font-bold">
                  {typeof s.value === "number" ? <AnimatedCounter end={s.value} /> : s.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* District Rankings */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> District Green Scores
            </h2>
            {districtScores.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No district data yet. Plant trees to see rankings!</p>
            ) : (
              <div className="space-y-3">
                {districtScores.slice(0, 15).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-4">
                    <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-sm">{d.name}</span>
                        <span className="text-sm text-primary font-semibold">{d.score}/100</span>
                      </div>
                      <Progress value={d.score} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{d.trees} trees</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GreenImpact;
