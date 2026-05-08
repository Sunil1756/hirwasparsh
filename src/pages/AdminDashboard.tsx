import { motion } from "framer-motion";
import { Shield, TreePine, Users, CheckCircle, XCircle, Clock, AlertTriangle, Eye, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useState } from "react";

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [treesRes, usersRes, pendingRes, flaggedRes] = await Promise.all([
        supabase.from("trees").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("trees").select("id", { count: "exact", head: true }).eq("admin_status", "pending"),
        supabase.from("trees").select("id", { count: "exact", head: true }).eq("verification_status", "rejected"),
      ]);
      return {
        totalTrees: treesRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        flagged: flaggedRes.count ?? 0,
      };
    },
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, adminStatus }: { id: string; adminStatus: string }) => {
      const { error } = await supabase
        .from("trees")
        .update({ admin_status: adminStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { adminStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: adminStatus === "approved" ? "✅ Approved! Points credited." : adminStatus === "rejected" ? "❌ Rejected" : "⚠️ Flagged for review" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="font-heading text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) =>
    s === "approved" ? "bg-primary/10 text-primary" :
    s === "rejected" ? "bg-destructive/10 text-destructive" :
    s === "flagged" ? "bg-yellow-500/10 text-yellow-600" :
    "bg-accent/20 text-accent-foreground";

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-4xl font-bold">Admin Dashboard</h1>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Trees", value: stats?.totalTrees ?? 0, icon: <TreePine className="h-5 w-5" />, color: "text-primary" },
              { label: "Total Users", value: stats?.totalUsers ?? 0, icon: <Users className="h-5 w-5" />, color: "text-sky-500" },
              { label: "Pending Review", value: stats?.pending ?? 0, icon: <Clock className="h-5 w-5" />, color: "text-yellow-500" },
              { label: "AI Flagged", value: stats?.flagged ?? 0, icon: <AlertTriangle className="h-5 w-5" />, color: "text-destructive" },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <div className="font-heading text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Submissions */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-4">All Submissions</h2>
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
            ) : submissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map(s => (
                  <div key={s.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-semibold">{s.tree_name}</span>
                          <Badge className={`text-xs ${statusColor(s.admin_status)}`}>{s.admin_status}</Badge>
                          {s.verification_status === "rejected" && (
                            <Badge variant="destructive" className="text-xs">AI Failed</Badge>
                          )}
                          {s.verification_status === "verified" && (
                            <Badge className="text-xs bg-primary/10 text-primary">AI Passed</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {s.species} · {new Date(s.plantation_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {s.location?.substring(0, 60)}{(s.location?.length ?? 0) > 60 ? "..." : ""}
                        </div>
                        {s.ai_analysis && (
                          <p className="text-xs text-muted-foreground mt-1 italic">AI: {s.ai_analysis.substring(0, 100)}...</p>
                        )}
                        {s.points_awarded > 0 && (
                          <div className="text-xs text-primary font-medium mt-1">🏆 {s.points_awarded} points awarded</div>
                        )}
                      </div>

                      {/* Photo thumbnails */}
                      <div className="flex gap-2">
                        {s.before_photo_url && (
                          <button onClick={() => setSelectedPhoto(s.before_photo_url)} className="relative group">
                            <img src={s.before_photo_url} className="w-16 h-16 rounded-lg object-cover" alt="Before" />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center rounded-b-lg">Before</span>
                          </button>
                        )}
                        {s.photo_url && (
                          <button onClick={() => setSelectedPhoto(s.photo_url)} className="relative group">
                            <img src={s.photo_url} className="w-16 h-16 rounded-lg object-cover" alt="After" />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center rounded-b-lg">After</span>
                          </button>
                        )}
                        {s.selfie_photo_url && (
                          <button onClick={() => setSelectedPhoto(s.selfie_photo_url)} className="relative group">
                            <img src={s.selfie_photo_url} className="w-16 h-16 rounded-lg object-cover" alt="Selfie" />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center rounded-b-lg">Selfie</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {(s.admin_status === "pending" || s.admin_status === "flagged") && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button size="sm" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "approved" })}
                          disabled={updateMutation.isPending} className="gap-1">
                          <CheckCircle className="h-4 w-4" /> Approve (+10 pts)
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "rejected" })}
                          disabled={updateMutation.isPending} className="gap-1">
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "flagged" })}
                          disabled={updateMutation.isPending} className="gap-1">
                          <AlertTriangle className="h-4 w-4" /> Flag
                        </Button>
                        <Link to={`/tree/${s.id}`}><Button size="sm" variant="ghost" className="gap-1"><Eye className="h-4 w-4" /> Profile</Button></Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} className="max-w-full max-h-[80vh] rounded-lg" alt="Full size" />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
