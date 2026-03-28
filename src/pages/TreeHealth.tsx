import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Droplets, AlertTriangle, Skull, TreePine, Loader2, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const statusOptions = [
  { value: "healthy", label: "🌿 Healthy", icon: <Heart className="h-5 w-5 text-primary" /> },
  { value: "needs water", label: "💧 Needs Water", icon: <Droplets className="h-5 w-5 text-sky-500" /> },
  { value: "damaged", label: "⚠️ Damaged", icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
  { value: "dead", label: "💀 Dead", icon: <Skull className="h-5 w-5 text-destructive" /> },
];

const TreeHealth = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTree, setSelectedTree] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState("healthy");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const { data: userTrees = [] } = useQuery({
    queryKey: ["user-trees-health", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("id, tree_name, species")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allTrees = [] } = useQuery({
    queryKey: ["all-trees-health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("id, verification_status");
      if (error) throw error;
      return data;
    },
  });

  const { data: allUpdates = [] } = useQuery({
    queryKey: ["all-health-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_health_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tree_health_updates").insert({
        tree_id: selectedTree,
        user_id: user!.id,
        health_status: healthStatus,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-health-updates"] });
      setOpen(false);
      setNotes("");
      setHealthStatus("healthy");
      toast({ title: "Update Added! 🌿", description: "Health status recorded." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Survival rate calculation
  const totalTrees = allTrees.length;
  const latestStatusMap = new Map<string, string>();
  // Sort by created_at asc so latest overwrites
  [...allUpdates].reverse().forEach(u => latestStatusMap.set(u.tree_id, u.health_status));
  const deadCount = [...latestStatusMap.values()].filter(s => s === "dead").length;
  const survivalRate = totalTrees > 0 ? Math.round(((totalTrees - deadCount) / totalTrees) * 100) : 100;

  const statusCounts = { healthy: 0, "needs water": 0, damaged: 0, dead: 0 };
  latestStatusMap.forEach(s => {
    if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="font-heading text-2xl font-bold">Sign in to monitor trees</h2>
          <Link to="/login"><Button><LogIn className="mr-2 h-4 w-4" /> Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <Heart className="h-4 w-4" /> Health Monitoring
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Tree Health Monitor</h1>
            <p className="text-muted-foreground">Track and update the health of registered trees</p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-xl p-5 text-center">
              <div className="font-heading text-3xl font-bold text-primary">{survivalRate}%</div>
              <div className="text-sm text-muted-foreground">Survival Rate</div>
            </div>
            {statusOptions.map(s => (
              <div key={s.value} className="glass-card rounded-xl p-5 flex items-center gap-3">
                {s.icon}
                <div>
                  <div className="font-heading text-xl font-bold">{statusCounts[s.value as keyof typeof statusCounts]}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Survival progress */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h3 className="font-heading font-semibold mb-3">Platform Survival Rate</h3>
            <Progress value={survivalRate} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">{totalTrees - deadCount} alive out of {totalTrees} total trees</p>
          </div>

          {/* Add update */}
          <div className="flex justify-end mb-6">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Health Update</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Tree Health</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Tree</Label>
                    <Select value={selectedTree} onValueChange={setSelectedTree}>
                      <SelectTrigger><SelectValue placeholder="Choose your tree" /></SelectTrigger>
                      <SelectContent>
                        {userTrees.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.tree_name} ({t.species})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Health Status</Label>
                    <Select value={healthStatus} onValueChange={setHealthStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea placeholder="Any observations..." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={() => addUpdate.mutate()} disabled={!selectedTree || addUpdate.isPending}>
                    {addUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Update
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Recent updates */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-heading text-lg font-semibold mb-4">Recent Health Updates</h3>
            {allUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No health updates recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allUpdates.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {statusOptions.find(s => s.value === u.health_status)?.icon || <Heart className="h-5 w-5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{u.health_status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                      {u.notes && <p className="text-xs text-muted-foreground truncate">{u.notes}</p>}
                    </div>
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

export default TreeHealth;
