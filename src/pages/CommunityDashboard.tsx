import { motion } from "framer-motion";
import { TreePine, Award, Leaf, TrendingUp, Star, Shield, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const badges = [
  { name: "Tree Guardian", icon: <Shield className="h-8 w-8" />, earned: true, desc: "Plant 5 trees" },
  { name: "Green Hero", icon: <Star className="h-8 w-8" />, earned: true, desc: "Plant 10 trees" },
  { name: "Eco Warrior", icon: <Award className="h-8 w-8" />, earned: false, desc: "Plant 25 trees" },
  { name: "Forest Champion", icon: <Target className="h-8 w-8" />, earned: false, desc: "Plant 50 trees" },
];

const recentTrees = [
  { name: "Neem Tree", species: "Azadirachta indica", date: "Mar 20, 2026", status: "Verified" },
  { name: "Banyan Tree", species: "Ficus benghalensis", date: "Mar 18, 2026", status: "Verified" },
  { name: "Mango Tree", species: "Mangifera indica", date: "Mar 15, 2026", status: "Pending" },
];

const CommunityDashboard = () => (
  <div className="min-h-screen pt-24 pb-12">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-4xl font-bold mb-8">Your Dashboard</h1>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Trees Planted", value: "12", icon: <TreePine className="h-6 w-6" /> },
            { label: "Green Points", value: "240", icon: <Star className="h-6 w-6" /> },
            { label: "CO₂ Offset", value: "1.2t", icon: <Leaf className="h-6 w-6" /> },
            { label: "Impact Score", value: "87", icon: <TrendingUp className="h-6 w-6" /> },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">{s.label}</span>
                <span className="text-primary">{s.icon}</span>
              </div>
              <div className="font-heading text-3xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Badges */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-4">Badges & Achievements</h2>
            <div className="grid grid-cols-2 gap-4">
              {badges.map((b, i) => (
                <div key={i} className={`rounded-xl p-4 text-center border ${b.earned ? "border-primary/30 bg-primary/5" : "border-border opacity-50"}`}>
                  <div className={`flex justify-center mb-2 ${b.earned ? "text-primary" : "text-muted-foreground"}`}>{b.icon}</div>
                  <div className="font-heading font-semibold text-sm">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trees */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-4">Recent Plantations</h2>
            <div className="space-y-4">
              {recentTrees.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.species} · {t.date}</div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${t.status === "Verified" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="glass-card rounded-2xl p-6 mt-8">
          <h2 className="font-heading text-xl font-semibold mb-4">Next Milestone: Eco Warrior (25 trees)</h2>
          <Progress value={48} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">12 of 25 trees planted</p>
        </div>
      </motion.div>
    </div>
  </div>
);

export default CommunityDashboard;
