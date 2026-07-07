import { motion } from "framer-motion";
import { Shield, TreePine, Users, CheckCircle, XCircle, Clock, AlertTriangle, Eye, Loader2, MapPin, Inbox, Filter, Lock, LogOut, Activity } from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useState } from "react";

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "rejected" | "flagged" | "pending">("all");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSigningIn(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed in — verifying admin role…" });
  };


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

  const { data: today } = useQuery({
    queryKey: ["admin-today-activity"],
    enabled: isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();
      const q = (action: string) =>
        supabase
          .from("admin_audit_log")
          .select("id", { count: "exact", head: true })
          .eq("action", action)
          .gte("created_at", iso);
      const [approved, rejected, flagged] = await Promise.all([q("approved"), q("rejected"), q("flagged")]);
      return {
        approved: approved.count ?? 0,
        rejected: rejected.count ?? 0,
        flagged: flagged.count ?? 0,
      };
    },
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_trees", { _limit: 50 });
      if (error) throw error;
      return data ?? [];
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

  // Auth still resolving
  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in → dedicated admin login form
  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 w-full max-w-md border-2 border-primary/20"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Admin Login</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Restricted area. Only accounts with the admin role can continue.
            </p>
          </div>
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={signingIn}>
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4" /> Sign in as Admin</>}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Not an admin? <Link to="/" className="text-primary hover:underline">Return to site</Link>
          </p>
        </motion.div>
      </div>
    );
  }

  // Signed in but lacks admin role → hard deny
  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="font-heading text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">
            Your account (<span className="font-medium">{user.email}</span>) does not have the admin role.
            Approval actions and this dashboard are restricted to administrators.
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/"><Button variant="outline">Go Home</Button></Link>
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="font-heading text-4xl font-bold">Admin Dashboard</h1>
            </div>
            <Link to="/admin/audit-log">
              <Button variant="outline" size="sm" className="gap-1">
                <Inbox className="h-4 w-4" /> View Audit Log
              </Button>
            </Link>
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

          {/* Manual Review Queue */}
          <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-yellow-500/20">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-yellow-600" />
                <h2 className="font-heading text-xl font-semibold">Manual Review Queue</h2>
                <Badge className="bg-yellow-500/10 text-yellow-600">
                  {submissions.filter(s => s.admin_status === "rejected" || s.admin_status === "flagged" || s.admin_status === "pending").length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {(["all", "pending", "flagged", "rejected"] as const).map(f => (
                  <Button key={f} size="sm" variant={reviewFilter === f ? "default" : "outline"}
                    onClick={() => setReviewFilter(f)} className="capitalize text-xs h-7">
                    {f}
                    <span className="ml-1 opacity-70">
                      ({f === "all"
                        ? submissions.filter(s => ["rejected","flagged","pending"].includes(s.admin_status)).length
                        : submissions.filter(s => s.admin_status === f).length})
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            {(() => {
              const queue = submissions.filter(s => {
                if (reviewFilter === "all") return ["rejected","flagged","pending"].includes(s.admin_status);
                return s.admin_status === reviewFilter;
              });
              if (isLoading) return <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;
              if (queue.length === 0) return <p className="text-muted-foreground text-center py-6 text-sm">Queue empty — nothing to review.</p>;
              return (
                <div className="space-y-2">
                  {queue.map(s => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/5 transition-colors">
                      {s.photo_url && (
                        <button onClick={() => setSelectedPhoto(s.photo_url)}>
                          <img src={s.photo_url} className="w-14 h-14 rounded-md object-cover" alt="" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{s.tree_name}</span>
                          <Badge className={`text-[10px] ${statusColor(s.admin_status)}`}>{s.admin_status}</Badge>
                          {s.ai_validation_score != null && (
                            <Badge variant="outline" className={`text-[10px] ${Number(s.ai_validation_score) < 50 ? "text-destructive" : Number(s.ai_validation_score) < 75 ? "text-yellow-600" : "text-primary"}`}>
                              AI {Number(s.ai_validation_score).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{s.species} · {s.flagged_reason || s.location?.substring(0, 50)}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => {
                          if (s.admin_status === "rejected" && !confirm("Override AI rejection? +10 pts will be credited.")) return;
                          updateMutation.mutate({ id: s.id, adminStatus: "approved" });
                        }} disabled={updateMutation.isPending} className="h-8 px-2 border-primary/40 text-primary hover:bg-primary/10">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "flagged" })}
                          disabled={updateMutation.isPending} className="h-8 px-2">
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "rejected" })}
                          disabled={updateMutation.isPending} className="h-8 px-2 text-destructive hover:bg-destructive/10">
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Link to={`/tree/${s.id}`}><Button size="sm" variant="ghost" className="h-8 px-2"><Eye className="h-4 w-4" /></Button></Link>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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

                    {/* Actions — pending/flagged: full controls; rejected: human override */}
                    {(s.admin_status === "pending" || s.admin_status === "flagged") && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
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
                    {s.admin_status === "rejected" && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          Auto-rejected by AI. Human override available — review photos & analysis carefully before overturning.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            if (confirm("Override AI rejection and approve this submission? +10 points will be credited to the user.")) {
                              updateMutation.mutate({ id: s.id, adminStatus: "approved" });
                            }
                          }} disabled={updateMutation.isPending} className="gap-1 border-primary/40 text-primary hover:bg-primary/10">
                            <CheckCircle className="h-4 w-4" /> Override → Approve (+10 pts)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: s.id, adminStatus: "flagged" })}
                            disabled={updateMutation.isPending} className="gap-1">
                            <AlertTriangle className="h-4 w-4" /> Send to Manual Review
                          </Button>
                          <Link to={`/tree/${s.id}`}><Button size="sm" variant="ghost" className="gap-1"><Eye className="h-4 w-4" /> Profile</Button></Link>
                        </div>
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
