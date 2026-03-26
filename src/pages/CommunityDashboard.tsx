import { motion } from "framer-motion";
import { TreePine, Award, Leaf, TrendingUp, Star, Shield, Target, User, LogIn } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const badgeDefs = [
  { name: "Tree Guardian", icon: <Shield className="h-8 w-8" />, threshold: 5, desc: "Plant 5 trees" },
  { name: "Green Hero", icon: <Star className="h-8 w-8" />, threshold: 10, desc: "Plant 10 trees" },
  { name: "Eco Warrior", icon: <Award className="h-8 w-8" />, threshold: 25, desc: "Plant 25 trees" },
  { name: "Forest Champion", icon: <Target className="h-8 w-8" />, threshold: 50, desc: "Plant 50 trees" },
];

const CommunityDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userTrees = [] } = useQuery({
    queryKey: ["user-trees", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="font-heading text-2xl font-bold">Sign in to view your profile</h2>
          <p className="text-muted-foreground">Track your trees, earn badges, and see your environmental impact.</p>
          <Link to="/login">
            <Button className="mt-2"><LogIn className="mr-2 h-4 w-4" /> Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const treesPlanted = profile?.trees_planted ?? userTrees.length;
  const greenPoints = profile?.green_points ?? treesPlanted * 20;
  const verifiedTrees = userTrees.filter((t) => t.verification_status === "verified").length;
  const co2Offset = (verifiedTrees * 0.1).toFixed(1);

  // Determine next milestone
  const nextBadge = badgeDefs.find((b) => treesPlanted < b.threshold) ?? badgeDefs[badgeDefs.length - 1];
  const progressPct = Math.min(100, Math.round((treesPlanted / nextBadge.threshold) * 100));

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold">
                {profile?.full_name ?? user.email}
              </h1>
              <p className="text-muted-foreground text-sm">Member since {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Trees Planted", value: String(treesPlanted), icon: <TreePine className="h-6 w-6" /> },
              { label: "Green Points", value: String(greenPoints), icon: <Star className="h-6 w-6" /> },
              { label: "CO₂ Offset", value: `${co2Offset}t`, icon: <Leaf className="h-6 w-6" /> },
              { label: "Verified Trees", value: String(verifiedTrees), icon: <TrendingUp className="h-6 w-6" /> },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                  <span className="text-primary">{s.icon}</span>
                </div>
                <div className="font-heading text-3xl font-bold">{s.value}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Badges */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Badges & Achievements</h2>
              <div className="grid grid-cols-2 gap-4">
                {badgeDefs.map((b, i) => {
                  const earned = treesPlanted >= b.threshold;
                  return (
                    <div key={i} className={`rounded-xl p-4 text-center border ${earned ? "border-primary/30 bg-primary/5" : "border-border opacity-50"}`}>
                      <div className={`flex justify-center mb-2 ${earned ? "text-primary" : "text-muted-foreground"}`}>{b.icon}</div>
                      <div className="font-heading font-semibold text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Trees */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Your Plantations</h2>
              {userTrees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TreePine className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No trees planted yet.</p>
                  <Link to="/plant"><Button variant="outline" className="mt-3">Plant Your First Tree</Button></Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {userTrees.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{t.tree_name}</div>
                        <div className="text-xs text-muted-foreground">{t.species} · {new Date(t.plantation_date).toLocaleDateString()}</div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        t.verification_status === "verified" ? "bg-primary/10 text-primary" :
                        t.verification_status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-accent/20 text-accent-foreground"
                      }`}>
                        {t.verification_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress to next badge */}
          <div className="glass-card rounded-2xl p-6 mt-8">
            <h2 className="font-heading text-xl font-semibold mb-4">
              Next Milestone: {nextBadge.name} ({nextBadge.threshold} trees)
            </h2>
            <Progress value={progressPct} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {treesPlanted} of {nextBadge.threshold} trees planted
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
