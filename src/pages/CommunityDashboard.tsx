import { motion } from "framer-motion";
import { TreePine, Award, Leaf, TrendingUp, Star, Shield, Target, User, LogIn, Clock, CheckCircle, XCircle, AlertTriangle, Car, Wind, Sprout, Building2, ArrowUpRight, Satellite } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { syncUserProfileImpact } from "@/lib/syncUserImpact";
import { useEffect } from "react";

const badgeDefs = [
  { name: "Tree Guardian", icon: <Shield className="h-8 w-8" />, threshold: 5, desc: "Plant 5 trees" },
  { name: "Green Hero", icon: <Star className="h-8 w-8" />, threshold: 10, desc: "Plant 10 trees" },
  { name: "Eco Warrior", icon: <Award className="h-8 w-8" />, threshold: 25, desc: "Plant 25 trees" },
  { name: "Forest Champion", icon: <Target className="h-8 w-8" />, threshold: 50, desc: "Plant 50 trees" },
];

const statusIcon = (s: string) => {
  switch (s) {
    case "approved":
    case "verified_active":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "rejected":
    case "rejected_fraud":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "flagged":
    case "evidence_required":
    case "under_review":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const CommunityDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      syncUserProfileImpact(user.id);
    }
  }, [user?.id]);

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
      return data || [];
    },
  });

  const { data: userProjects = [] } = useQuery({
    queryKey: ["user-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantation_projects")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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

  let projectTreesCount = 0;
  userProjects.forEach((p) => {
    projectTreesCount += p.verified_trees > 0 ? p.verified_trees : (p.target_trees || p.bulk_rows || 0);
  });

  const totalUserTrees = userTrees.length + projectTreesCount;
  const treesPlanted = Math.max(profile?.trees_planted ?? 0, totalUserTrees);
  const greenPoints = Math.max(profile?.green_points ?? 0, totalUserTrees * 10);
  const co2Kg = treesPlanted * 22;
  const o2Kg = treesPlanted * 100;
  const carsRemoved = (co2Kg / 4600).toFixed(2);

  const nextBadge = badgeDefs.find((b) => treesPlanted < b.threshold) ?? badgeDefs[badgeDefs.length - 1];
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
              <p className="text-muted-foreground text-sm">
                Member since {new Date(user.created_at).toLocaleDateString()} · {userProjects.length} Projects Active
              </p>
            </div>
          </div>

          {/* Stats — Verified Live Data */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Trees Planted", value: String(treesPlanted), icon: <TreePine className="h-6 w-6" /> },
              { label: "Green Impact Points", value: String(greenPoints), icon: <Star className="h-6 w-6" /> },
              { label: "CO₂ Absorbed (kg/yr)", value: String(co2Kg), icon: <Leaf className="h-6 w-6" /> },
              { label: "Afforestation Drives", value: String(userProjects.length), icon: <TrendingUp className="h-6 w-6" /> },
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
                <div className="text-xs text-muted-foreground">Living Trees</div>
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
            {/* Institutional & Organization Projects */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Large-Scale Afforestation Projects ({userProjects.length})
                </h2>
                <Link to="/plant/organization">
                  <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
                    <Satellite className="h-3.5 w-3.5" /> Open Workspace
                  </Button>
                </Link>
              </div>

              {userProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No large-scale afforestation projects created yet.</p>
                  <Link to="/plant/organization?create=true">
                    <Button variant="outline" size="sm" className="mt-3 rounded-xl text-xs">
                      + Create Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {userProjects.map((p) => (
                    <Link key={p.id} to={`/plant/organization?project=${p.id}`} className="block">
                      <div className="p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all border border-border/40 flex items-center justify-between">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-foreground">{p.project_name}</h4>
                          <p className="text-xs text-muted-foreground">{p.organization_name} · {p.location}</p>
                          <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                            {p.verified_trees > 0
                              ? `🌿 ${p.verified_trees} Verified Trees`
                              : `🌱 ${p.target_trees} Target Trees`}
                          </span>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                            Trust {p.ai_score || 85}/100
                          </Badge>
                          <span className="text-[10px] text-primary flex items-center gap-1 mt-1 font-semibold justify-end">
                            Telemetry <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Plantations */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-primary" /> Individual Trees ({userTrees.length})
                </h2>
                <Link to="/plant/individual">
                  <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs">
                    <Sprout className="h-3.5 w-3.5" /> Plant Individual
                  </Button>
                </Link>
              </div>

              {userTrees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TreePine className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No single trees logged yet with mobile camera.</p>
                  <Link to="/plant/individual">
                    <Button variant="outline" size="sm" className="mt-3 rounded-xl text-xs">
                      Plant a Tree
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {userTrees.map((t) => (
                    <Link key={t.id} to={`/tree/${t.id}`} className="block">
                      <div className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <TreePine className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-semibold text-foreground truncate">{t.species}</p>
                          <p className="text-muted-foreground truncate">{t.location}</p>
                        </div>
                        <div>{statusIcon(t.admin_status)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
