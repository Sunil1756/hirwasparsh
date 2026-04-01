import { motion } from "framer-motion";
import { TreePine, Award, Leaf, TrendingUp, Star, Shield, Target, User, LogIn, Clock, CheckCircle, XCircle, AlertTriangle, Car, Wind, Sprout } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const badgeDefs = [
  { name: "Tree Guardian", icon: <Shield className="h-8 w-8" />, threshold: 5, desc: "Plant 5 trees" },
  { name: "Green Hero", icon: <Star className="h-8 w-8" />, threshold: 10, desc: "Plant 10 trees" },
  { name: "Eco Warrior", icon: <Award className="h-8 w-8" />, threshold: 25, desc: "Plant 25 trees" },
  { name: "Forest Champion", icon: <Target className="h-8 w-8" />, threshold: 50, desc: "Plant 50 trees" },
];

const statusIcon = (s: string) => {
  switch (s) {
    case "approved": return <CheckCircle className="h-4 w-4 text-primary" />;
    case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
    case "flagged": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const updateDays = [7, 30, 90];

const CommunityDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
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

  const { data: growthUpdates = [] } = useQuery({
    queryKey: ["user-growth-updates-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_updates")
        .select("tree_id, update_day")
        .eq("user_id", user!.id);
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
          <h2 className="font-heading text-2xl font-bold">Sign in to view your dashboard</h2>
          <p className="text-muted-foreground">Track your trees, earn badges, and see your impact.</p>
          <Link to="/login"><Button className="mt-2"><LogIn className="mr-2 h-4 w-4" /> Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const approvedTrees = userTrees.filter(t => t.admin_status === "approved");
  const treesPlanted = profile?.trees_planted ?? approvedTrees.length;
  const greenPoints = profile?.green_points ?? 0;
  const co2Kg = treesPlanted * 21;
  const o2Kg = treesPlanted * 100; // ~100kg O2 per tree per year
  const carsRemoved = (co2Kg / 4600).toFixed(2); // avg car emits 4600 kg CO2/yr

  // Growth updates map
  const growthMap = new Map<string, number[]>();
  growthUpdates.forEach(u => {
    const existing = growthMap.get(u.tree_id) || [];
    existing.push(u.update_day);
    growthMap.set(u.tree_id, existing);
  });

  const nextBadge = badgeDefs.find(b => treesPlanted < b.threshold) ?? badgeDefs[badgeDefs.length - 1];
  const progressPct = Math.min(100, Math.round((treesPlanted / nextBadge.threshold) * 100));

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold">{profile?.full_name ?? user.email}</h1>
              <p className="text-muted-foreground text-sm">Member since {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Stats — only verified data */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Verified Trees", value: String(treesPlanted), icon: <TreePine className="h-6 w-6" /> },
              { label: "Green Points", value: String(greenPoints), icon: <Star className="h-6 w-6" /> },
              { label: "CO₂ Absorbed (kg/yr)", value: String(co2Kg), icon: <Leaf className="h-6 w-6" /> },
              { label: "Total Submissions", value: String(userTrees.length), icon: <TrendingUp className="h-6 w-6" /> },
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

          {/* Carbon Impact Dashboard */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h2 className="font-heading text-xl font-semibold mb-4">🌍 Your Carbon Impact</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-primary/5">
                <TreePine className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-heading text-2xl font-bold text-primary">{treesPlanted}</div>
                <div className="text-xs text-muted-foreground">Verified Trees</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/5">
                <Leaf className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-heading text-2xl font-bold text-primary">{co2Kg} kg</div>
                <div className="text-xs text-muted-foreground">CO₂ Absorbed / year</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/5">
                <Wind className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-heading text-2xl font-bold text-primary">{o2Kg} kg</div>
                <div className="text-xs text-muted-foreground">O₂ Generated / year</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/5">
                <Car className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-heading text-2xl font-bold text-primary">{carsRemoved}</div>
                <div className="text-xs text-muted-foreground">Equiv. Cars Removed</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Plantation Status Cards with Growth Progress */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold">Your Plantations</h2>
                <Link to="/growth-updates"><Button variant="outline" size="sm" className="gap-1"><Sprout className="h-4 w-4" /> Growth Updates</Button></Link>
              </div>
              {userTrees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TreePine className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No trees planted yet.</p>
                  <Link to="/plant"><Button variant="outline" className="mt-3">Plant Your First Tree</Button></Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {userTrees.map(t => {
                    const doneDays = growthMap.get(t.id) || [];
                    return (
                      <Link key={t.id} to={`/tree/${t.id}`} className="block">
                        <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                          <div className="flex items-center gap-3">
                            {t.photo_url ? (
                              <img src={t.photo_url} className="w-12 h-12 rounded-lg object-cover" alt={t.tree_name} />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><TreePine className="h-6 w-6 text-muted-foreground" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{t.tree_name}</div>
                              <div className="text-xs text-muted-foreground">{t.species} · {t.location?.split(",")[0]}</div>
                              <div className="text-xs text-muted-foreground">{new Date(t.plantation_date).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs">
                                {statusIcon(t.admin_status)}
                                <Badge variant="outline" className="text-[10px]">{t.admin_status}</Badge>
                              </div>
                              {t.admin_status === "approved" && (
                                <div className="text-xs text-primary font-medium mt-1">+{t.points_awarded} pts</div>
                              )}
                              {t.admin_status === "pending" && (
                                <div className="text-[10px] text-muted-foreground mt-1">No points yet</div>
                              )}
                            </div>
                          </div>
                          {/* Growth progress checklist */}
                          {t.admin_status === "approved" && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                              {updateDays.map(d => {
                                const done = doneDays.includes(d);
                                return (
                                  <Badge key={d} variant={done ? "default" : "outline"} className={`text-[10px] gap-0.5 ${done ? "bg-primary/10 text-primary" : ""}`}>
                                    {done ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                    {d}d
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold mb-4">Badges & Achievements</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
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
              <h3 className="font-heading font-semibold mb-2">Next: {nextBadge.name} ({nextBadge.threshold} trees)</h3>
              <Progress value={progressPct} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">{treesPlanted} / {nextBadge.threshold} verified trees</p>
            </div>
          </div>

          {/* Points Explanation */}
          <div className="glass-card rounded-2xl p-6 mt-8">
            <h2 className="font-heading text-lg font-semibold mb-3">🏆 Points System</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50"><strong>Admin Approval:</strong> +10 pts</div>
              <div className="p-3 rounded-lg bg-muted/50"><strong>7-day Update:</strong> +5 pts</div>
              <div className="p-3 rounded-lg bg-muted/50"><strong>30-day Update:</strong> +10 pts</div>
              <div className="p-3 rounded-lg bg-muted/50"><strong>90-day Update:</strong> +20 pts</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">⚠️ Points are ONLY credited after admin approves your submission. Fake submissions result in account flagging.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
