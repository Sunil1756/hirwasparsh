import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, TreePine, Plus, Calendar, Target, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AnimatedCounter from "@/components/AnimatedCounter";

const Challenges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_trees: 5, duration_days: 30 });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("challenges")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("challenges query:", error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["challenge-participants"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("challenge_participants").select("*");
        if (error) {
          console.warn("challenge_participants query:", error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["challenge-stats"],
    queryFn: async () => {
      try {
        const [treesRes, participantsCount] = await Promise.all([
          supabase.from("trees").select("id", { count: "exact", head: true }).eq("admin_status", "approved"),
          supabase.from("challenge_participants").select("id", { count: "exact", head: true }),
        ]);
        return {
          totalTrees: treesRes.count || 0,
          totalParticipants: participantsCount.count || 0,
          activeChallenges: challenges.filter(c => new Date(c.ends_at) > new Date()).length,
        };
      } catch {
        return {
          totalTrees: 0,
          totalParticipants: 0,
          activeChallenges: 0,
        };
      }
    },
    enabled: challenges.length >= 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + form.duration_days * 86400000);
      const { error } = await supabase.from("challenges").insert({
        title: form.title,
        description: form.description,
        target_trees: form.target_trees,
        duration_days: form.duration_days,
        created_by: user.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast.success("Challenge created!");
      setShowCreate(false);
      setForm({ title: "", description: "", target_trees: 5, duration_days: 30 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase.from("challenge_participants").insert({
        challenge_id: challengeId,
        user_id: user.id,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already joined!");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-participants"] });
      toast.success("Joined challenge!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isActive = (c: typeof challenges[0]) => new Date(c.ends_at) > new Date();
  const daysLeft = (c: typeof challenges[0]) => Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000));
  const participantsFor = (cId: string) => allParticipants.filter(p => p.challenge_id === cId);
  const hasJoined = (cId: string) => user ? allParticipants.some(p => p.challenge_id === cId && p.user_id === user.id) : false;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl font-bold mb-3">🌱 Plant With Me Challenge</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create or join plantation challenges, compete with friends, and grow more trees together!
            </p>
          </div>

          {/* Impact Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <AnimatedCounter end={stats?.activeChallenges || 0} label="Active Challenges" icon={<Target className="h-8 w-8" />} />
            <AnimatedCounter end={stats?.totalParticipants || 0} label="Total Participants" icon={<Users className="h-8 w-8" />} />
            <AnimatedCounter end={stats?.totalTrees || 0} label="Verified Trees" icon={<TreePine className="h-8 w-8" />} />
          </div>

          {/* Create Challenge */}
          <div className="mb-8">
            {!showCreate ? (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create Challenge
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Challenge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Challenge Title (e.g. Plant 5 Trees in 30 Days)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Target Trees</label>
                      <Input type="number" min={1} max={1000} value={form.target_trees} onChange={e => setForm(f => ({ ...f, target_trees: parseInt(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Duration (days)</label>
                      <Input type="number" min={7} max={365} value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 30 }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Challenges List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No Challenges Yet</h3>
              <p className="text-muted-foreground">Be the first to create a plantation challenge!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {challenges.map((c) => {
                const parts = participantsFor(c.id);
                const active = isActive(c);
                const joined = hasJoined(c.id);
                const totalPlanted = parts.reduce((s, p) => s + p.trees_planted, 0);

                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`h-full ${!active ? "opacity-60" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{c.title}</CardTitle>
                          <Badge variant={active ? "default" : "secondary"}>
                            {active ? `${daysLeft(c)}d left` : "Ended"}
                          </Badge>
                        </div>
                        {c.description && <CardDescription>{c.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="font-heading text-xl font-bold text-primary">{parts.length}</div>
                            <div className="text-xs text-muted-foreground">Participants</div>
                          </div>
                          <div>
                            <div className="font-heading text-xl font-bold text-primary">{totalPlanted}</div>
                            <div className="text-xs text-muted-foreground">Trees Planted</div>
                          </div>
                          <div>
                            <div className="font-heading text-xl font-bold text-primary">{c.target_trees}</div>
                            <div className="text-xs text-muted-foreground">Target</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (totalPlanted / c.target_trees) * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.starts_at).toLocaleDateString()} – {new Date(c.ends_at).toLocaleDateString()}
                        </div>

                        {active && user && !joined && (
                          <Button size="sm" className="w-full gap-2" onClick={() => joinMutation.mutate(c.id)} disabled={joinMutation.isPending}>
                            <ArrowRight className="h-4 w-4" /> Join Challenge
                          </Button>
                        )}
                        {active && !user && (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => toast.info("Please log in to join community challenges.")}>
                            Log In to Join
                          </Button>
                        )}
                        {joined && (
                          <Badge variant="outline" className="w-full justify-center">✅ You've joined!</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Challenges;
