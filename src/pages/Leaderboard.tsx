import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TreePine, Star, Medal, Loader2, Users, Building, Home, Sprout, Share2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const rankColor = (r: number) => r === 1 ? "text-yellow-500" : r === 2 ? "text-gray-400" : r === 3 ? "text-amber-600" : "text-muted-foreground";

const teamTypeIcons: Record<string, React.ReactNode> = {
  college: <Building className="h-4 w-4" />,
  village: <Home className="h-4 w-4" />,
  ngo: <Users className="h-4 w-4" />,
};

const challenges = [
  { name: "🌧️ Monsoon Plantation Challenge", period: "Jul - Sep", status: "active", target: 100 },
  { name: "🌍 World Environment Day", period: "June 5", status: "upcoming", target: 50 },
  { name: "🌳 Van Mahotsav Drive", period: "Jul 1-7", status: "upcoming", target: 200 },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState("college");
  const [teamDesc, setTeamDesc] = useState("");

  // Individual leaderboard
  const { data: planters = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, trees_planted, green_points")
        .gt("trees_planted", 0)
        .order("green_points", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Teams with member counts
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-leaderboard"],
    queryFn: async () => {
      const { data: teamsData, error } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      // Get member counts and total trees per team
      const enriched = await Promise.all((teamsData || []).map(async (team) => {
        const { data: members } = await supabase.from("team_members").select("user_id").eq("team_id", team.id);
        const memberIds = (members || []).map(m => m.user_id);
        let totalTrees = 0;
        let totalPoints = 0;
        if (memberIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("trees_planted, green_points").in("id", memberIds);
          (profiles || []).forEach(p => { totalTrees += p.trees_planted; totalPoints += p.green_points; });
        }
        return { ...team, memberCount: memberIds.length, totalTrees, totalPoints };
      }));
      return enriched.sort((a, b) => b.totalTrees - a.totalTrees);
    },
  });

  // User's team membership
  const { data: userMemberships = [] } = useQuery({
    queryKey: ["user-memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("team_id").eq("user_id", user!.id);
      if (error) throw error;
      return data.map(m => m.team_id);
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const { data, error } = await supabase.from("teams").insert({
        name: teamName, type: teamType, description: teamDesc || null, created_by: user.id,
      }).select().single();
      if (error) throw error;
      // Auto-join the team
      await supabase.from("team_members").insert({ team_id: data.id, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-memberships"] });
      setCreateOpen(false);
      setTeamName(""); setTeamDesc("");
      toast({ title: "🎉 Team Created!", description: "You've been auto-added as a member." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-memberships"] });
      toast({ title: "✅ Joined Team!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leaveTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-memberships"] });
      toast({ title: "Left team" });
    },
  });

  const ranked = planters.map((p, i) => ({ ...p, rank: i + 1 }));
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const shareCard = (name: string, trees: number, points: number) => {
    const text = `🌳 ${name} planted ${trees} trees & earned ${points} Green Points on Green Enlightenment! Join the movement: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ title: "Green Enlightenment", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Share text copied to clipboard." });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <Trophy className="h-4 w-4" /> Green League
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">Champions of environmental action</p>
          </div>

          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="individual" className="gap-1"><Star className="h-4 w-4" /> Top Planters</TabsTrigger>
              <TabsTrigger value="teams" className="gap-1"><Users className="h-4 w-4" /> Teams</TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1"><Calendar className="h-4 w-4" /> Challenges</TabsTrigger>
            </TabsList>

            {/* Individual */}
            <TabsContent value="individual">
              {isLoading ? (
                <div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
              ) : ranked.length === 0 ? (
                <div className="text-center py-20">
                  <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-semibold mb-2">No planters yet</h3>
                  <p className="text-muted-foreground">Be the first!</p>
                </div>
              ) : (
                <>
                  {top3.length >= 3 && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[top3[1], top3[0], top3[2]].map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className={`glass-card rounded-2xl p-6 text-center ${p.rank === 1 ? "nature-glow ring-2 ring-primary/20 -mt-4" : ""}`}>
                          <Medal className={`h-8 w-8 mx-auto mb-2 ${rankColor(p.rank)}`} />
                          <div className="font-heading font-bold text-lg">{p.full_name || "Anonymous"}</div>
                          <div className="mt-3 flex items-center justify-center gap-1 text-primary font-heading font-bold text-2xl">
                            <TreePine className="h-5 w-5" /> {p.trees_planted}
                          </div>
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3" /> {p.green_points} pts
                          </div>
                          <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => shareCard(p.full_name || "Anonymous", p.trees_planted, p.green_points)}>
                            <Share2 className="h-3 w-3" /> Share
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {top3.length > 0 && top3.length < 3 && (
                    <div className="glass-card rounded-2xl overflow-hidden mb-8">
                      {top3.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-4"><Medal className={`h-6 w-6 ${rankColor(p.rank)}`} /><span className="font-medium">{p.full_name || "Anonymous"}</span></div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium"><TreePine className="h-4 w-4 inline text-primary mr-1" />{p.trees_planted}</span>
                            <span className="text-sm text-muted-foreground"><Star className="h-3 w-3 inline mr-1" />{p.green_points}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rest.length > 0 && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                      {rest.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-4">
                            <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{p.rank}</span>
                            <span className="font-medium">{p.full_name || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium"><TreePine className="h-4 w-4 inline text-primary mr-1" />{p.trees_planted}</span>
                            <span className="text-sm text-muted-foreground"><Star className="h-3 w-3 inline mr-1" />{p.green_points}</span>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => shareCard(p.full_name || "Anonymous", p.trees_planted, p.green_points)}>
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Teams */}
            <TabsContent value="teams">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-xl font-semibold">Team Rankings</h2>
                {user && (
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Users className="h-4 w-4" /> Create Team</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create a Team</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Team Name</Label><Input placeholder="e.g., Green Warriors" value={teamName} onChange={e => setTeamName(e.target.value)} /></div>
                        <div>
                          <Label>Team Type</Label>
                          <Select value={teamType} onValueChange={setTeamType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="college">College</SelectItem>
                              <SelectItem value="village">Village</SelectItem>
                              <SelectItem value="ngo">NGO</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Description</Label><Textarea placeholder="About your team..." value={teamDesc} onChange={e => setTeamDesc(e.target.value)} /></div>
                        <Button className="w-full" onClick={() => createTeamMutation.mutate()} disabled={!teamName || createTeamMutation.isPending}>
                          {createTeamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Team
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Filter by type */}
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="college" className="gap-1"><Building className="h-3 w-3" /> College</TabsTrigger>
                  <TabsTrigger value="village" className="gap-1"><Home className="h-3 w-3" /> Village</TabsTrigger>
                  <TabsTrigger value="ngo" className="gap-1"><Users className="h-3 w-3" /> NGO</TabsTrigger>
                </TabsList>
                {["all", "college", "village", "ngo"].map(filter => (
                  <TabsContent key={filter} value={filter}>
                    {teams.filter(t => filter === "all" || t.type === filter).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p>No teams yet. Create one!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teams.filter(t => filter === "all" || t.type === filter).map((team, i) => {
                          const isMember = userMemberships.includes(team.id);
                          return (
                            <div key={team.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{i + 1}</span>
                                <div className="flex items-center gap-2">
                                  {teamTypeIcons[team.type]}
                                  <div>
                                    <div className="font-heading font-semibold">{team.name}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{team.type} · {team.memberCount} members</div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-sm font-medium text-primary"><TreePine className="h-4 w-4" /> {team.totalTrees}</div>
                                  <div className="text-xs text-muted-foreground">{team.totalPoints} pts</div>
                                </div>
                                {user && (
                                  isMember ? (
                                    <Button variant="outline" size="sm" onClick={() => leaveTeamMutation.mutate(team.id)}>Leave</Button>
                                  ) : (
                                    <Button size="sm" onClick={() => joinTeamMutation.mutate(team.id)}>Join</Button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            {/* Challenges */}
            <TabsContent value="challenges">
              <div className="space-y-4">
                {challenges.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass-card rounded-xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading text-lg font-semibold">{c.name}</h3>
                        <p className="text-sm text-muted-foreground">{c.period}</p>
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sprout className="h-4 w-4 text-primary" />
                      <span>Target: {c.target} trees</span>
                    </div>
                    {c.status === "active" && (
                      <Button className="mt-3 gap-1" size="sm"><TreePine className="h-4 w-4" /> Participate</Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
