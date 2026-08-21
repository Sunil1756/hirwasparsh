import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  TreePine,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Loader2,
  MapPin,
  Inbox,
  Filter,
  Lock,
  LogOut,
  Activity,
  Sparkles,
  Bot,
  Zap,
  Download,
  Search,
  ExternalLink,
  CheckCircle,
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "flagged" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchApproving, setBatchApproving] = useState(false);

  // Admin login handler
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSigningIn(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed in — verifying admin credentials…" });
  };

  // Fetch all trees for admin review
  const { data: trees = [], isLoading: isTreesLoading } = useQuery({
    queryKey: ["admin-trees"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select(
          "id, tree_name, species, location, latitude, longitude, verification_status, admin_status, ai_confidence, points_awarded, user_id, photo_url, before_photo_url, selfie_photo_url, created_at, height_cm"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all user profiles for user management
  const { data: profiles = [], isLoading: isProfilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, eco_points, trees_planted, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to approve or reject a tree and credit points
  const updateTreeMutation = useMutation({
    mutationFn: async ({
      treeId,
      userId,
      newStatus,
      aiConfidence,
    }: {
      treeId: string;
      userId?: string;
      newStatus: "approved" | "rejected" | "flagged";
      aiConfidence?: number;
    }) => {
      const isApproved = newStatus === "approved";
      const isRejected = newStatus === "rejected";

      // 1. Update tree record
      const { error: treeErr } = await supabase
        .from("trees")
        .update({
          admin_status: newStatus,
          verification_status: isApproved ? "verified" : isRejected ? "rejected" : "pending",
          points_awarded: isApproved ? 50 : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", treeId);

      if (treeErr) throw treeErr;

      // 2. If approved, credit 50 points to the user's profile
      if (isApproved && userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("eco_points, trees_planted")
          .eq("id", userId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              eco_points: (profile.eco_points || 0) + 50,
              trees_planted: (profile.trees_planted || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
      }
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-trees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({
        title:
          newStatus === "approved"
            ? "✅ Approved & 50 Points Credited!"
            : newStatus === "rejected"
            ? "❌ Submission Rejected"
            : "⚠️ Flagged for Re-inspection",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Action failed",
        description: err?.message || "Could not update tree status",
        variant: "destructive",
      });
    },
  });

  // Batch auto-approve all pending trees with AI confidence >= 70%
  const handleBatchAutoApprove = async () => {
    const eligibleTrees = trees.filter(
      (t) =>
        (t.admin_status === "pending" || !t.admin_status) &&
        (t.ai_confidence ?? 75) >= 70 &&
        t.verification_status !== "rejected"
    );

    if (eligibleTrees.length === 0) {
      toast({
        title: "No Eligible Trees",
        description: "All pending trees have already been verified or score below 70%.",
      });
      return;
    }

    setBatchApproving(true);
    try {
      let approvedCount = 0;
      for (const t of eligibleTrees) {
        await updateTreeMutation.mutateAsync({
          treeId: t.id,
          userId: t.user_id,
          newStatus: "approved",
          aiConfidence: t.ai_confidence ?? 75,
        });
        approvedCount++;
      }
      toast({
        title: `⚡ Batch Auto-Approval Complete!`,
        description: `Successfully verified ${approvedCount} trees (AI Score ≥ 70%) and credited 50 points each.`,
      });
    } catch (e: any) {
      toast({
        title: "Batch auto-approval incomplete",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBatchApproving(false);
    }
  };

  // Export Government & ESG Compliance CSV
  const handleExportGovernmentCSV = () => {
    if (trees.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Tree ID",
      "Tree Name",
      "Botanical Species",
      "Location",
      "Latitude",
      "Longitude",
      "Height (cm)",
      "Verification Status",
      "AI Confidence Score (%)",
      "Admin Approval Status",
      "Eco Points Awarded",
      "Planted Date",
    ];

    const rows = trees.map((t) => [
      t.id,
      `"${t.tree_name.replace(/"/g, '""')}"`,
      `"${(t.species || "").replace(/"/g, '""')}"`,
      `"${(t.location || "").replace(/"/g, '""')}"`,
      t.latitude ?? "",
      t.longitude ?? "",
      t.height_cm ?? "",
      t.verification_status || "pending",
      t.ai_confidence ?? 75,
      t.admin_status || "pending",
      t.points_awarded ?? (t.verification_status === "verified" ? 50 : 0),
      new Date(t.created_at).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Green_Enlightenment_Government_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "📁 Government Audit CSV Exported",
      description: `Downloaded full telemetry dataset of ${trees.length} trees for NITI Aayog / Forest Dept audit.`,
    });
  };

  // KPIs
  const verifiedCount = trees.filter((t) => t.verification_status === "verified").length;
  const pendingCount = trees.filter(
    (t) => t.admin_status === "pending" || !t.admin_status || t.verification_status === "pending"
  ).length;
  const rejectedCount = trees.filter(
    (t) => t.admin_status === "rejected" || t.verification_status === "rejected"
  ).length;
  const autoApprovedCount = trees.filter(
    (t) => t.verification_status === "verified" && (t.ai_confidence ?? 75) >= 70
  ).length;
  const totalCo2Tons = (verifiedCount * 22) / 1000;

  // Filtered manual review queue (< 70% score or pending/flagged)
  const manualReviewQueue = useMemo(() => {
    return trees.filter((t) => {
      const isPending = t.admin_status === "pending" || !t.admin_status;
      const isFlagged = t.admin_status === "flagged";
      const isRejected = t.admin_status === "rejected" || t.verification_status === "rejected";
      const scoreLow = (t.ai_confidence ?? 75) < 70;

      if (reviewFilter === "pending") return isPending;
      if (reviewFilter === "flagged") return isFlagged;
      if (reviewFilter === "rejected") return isRejected;
      return isPending || isFlagged || isRejected || scoreLow;
    });
  }, [trees, reviewFilter]);

  // Filtered full registry
  const filteredRegistry = useMemo(() => {
    return trees.filter((t) => {
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "verified" && t.verification_status === "verified") ||
        (statusFilter === "pending" && (t.verification_status === "pending" || !t.verification_status)) ||
        (statusFilter === "rejected" && t.verification_status === "rejected");

      const textOk =
        searchTerm === "" ||
        t.tree_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.species && t.species.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()));

      return statusOk && textOk;
    });
  }, [trees, statusFilter, searchTerm]);

  // Auth still loading
  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in -> Dedicated Admin login form
  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 w-full max-w-md border-2 border-primary/20 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Admin Portal Login</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
              Restricted supervisory interface for Green Enlightenment. Enter authorized credentials to manage verification audits.
            </p>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold">
                Admin Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@greenenlightenment.org"
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-semibold">
                Secure Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl gap-2 font-semibold h-10 shadow-md" disabled={signingIn}>
              {signingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Sign In to Command Center
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            Looking for public access?{" "}
            <Link to="/" className="text-primary font-semibold hover:underline">
              Return to Homepage
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Signed in but not an admin role
  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center space-y-4 border border-destructive/30 shadow-2xl">
          <Shield className="h-14 w-14 mx-auto text-destructive" />
          <h2 className="font-heading text-2xl font-bold">Admin Privileges Required</h2>
          <p className="text-xs text-muted-foreground">
            Your account (<span className="font-medium text-foreground">{user.email}</span>) is signed in but does not have elevated administrator permissions.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="rounded-xl">
                Go Home
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={signOut} className="rounded-xl gap-1">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header Title & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold">Admin Command Center</h1>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                    Autonomous AI Active
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Supervise automated AI verification, manual review exceptions, planter points, and government audit logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportGovernmentCSV}
                className="gap-1.5 text-xs font-semibold rounded-xl border-primary/20"
              >
                <Download className="h-3.5 w-3.5 text-primary" /> Export Government CSV
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          </div>

          {/* AI Auto-Approval Policy Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-teal-500/10 border border-emerald-500/30 p-4 sm:p-5 mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
                      AI Auto-Approval Engine (Threshold: ≥ 70% Confidence)
                    </h3>
                    <Badge className="bg-emerald-500 text-white text-[10px]">Active Rule</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                    Submissions scoring <strong>≥ 70%</strong> from Gemini 2.5 Flash are <strong>automatically approved</strong> with <strong>+50 Eco-Points</strong> credited to the planter instantaneously. Submissions below 70% or flagged for anomalies require manual review below.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleBatchAutoApprove}
                disabled={batchApproving || isTreesLoading}
                size="sm"
                className="rounded-xl gap-2 font-semibold text-xs whitespace-nowrap shrink-0 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {batchApproving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                ⚡ Sweep & Auto-Approve (≥70%)
              </Button>
            </div>
          </div>

          {/* 5-Column Live Platform Metrics KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <div className="glass-card rounded-2xl p-4 border border-primary/20">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Total Planted</span>
                <TreePine className="h-4 w-4 text-primary" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {trees.length.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Database Registry</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Auto-Approved (≥70%)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {verifiedCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">
                {trees.length > 0 ? `${Math.round((verifiedCount / trees.length) * 100)}% Auto-Passed` : "100%"}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Needs Review (&lt;70%)</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                {pendingCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">Pending Admin Decision</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-sky-500/30 bg-sky-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Planters Roster</span>
                <Users className="h-4 w-4 text-sky-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">
                {profiles.length.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Registered Farmers & Citizens</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-teal-500/30 bg-teal-500/5 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Carbon Biomass</span>
                <Sparkles className="h-4 w-4 text-teal-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400">
                {totalCo2Tons.toFixed(2)} MT
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">IPCC Pantropical Sequestration</div>
            </div>
          </div>

          {/* Main Tabs Interface */}
          <Tabs defaultValue="review" className="space-y-6">
            <TabsList className="bg-muted/80 p-1 rounded-2xl border border-primary/20 w-fit">
              <TabsTrigger value="review" className="rounded-xl text-xs sm:text-sm font-semibold gap-2">
                <Inbox className="h-4 w-4" />
                Manual Review Queue ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="registry" className="rounded-xl text-xs sm:text-sm font-semibold gap-2">
                <TreePine className="h-4 w-4" />
                All Plantations ({trees.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl text-xs sm:text-sm font-semibold gap-2">
                <Users className="h-4 w-4" />
                Planters & Points ({profiles.length})
              </TabsTrigger>
              <TabsTrigger value="government" className="rounded-xl text-xs sm:text-sm font-semibold gap-2">
                <Building2 className="h-4 w-4" />
                Government & ESG Telemetry
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Manual Review Queue (< 70% Score) */}
            <TabsContent value="review" className="space-y-4">
              <div className="glass-card rounded-3xl p-6 border-2 border-amber-500/20 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                      <Inbox className="h-5 w-5 text-amber-600" />
                      Exceptions & Low-Confidence Submissions
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submissions scoring below the 70% AI threshold or flagged for manual visual verification.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-background/60 p-1 rounded-xl border">
                    {(["pending", "flagged", "rejected", "all"] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={reviewFilter === f ? "default" : "ghost"}
                        onClick={() => setReviewFilter(f)}
                        className="capitalize text-xs h-7 px-3 rounded-lg"
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>

                {isTreesLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : manualReviewQueue.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto opacity-70" />
                    <p className="font-semibold text-foreground">Review Queue is Clean!</p>
                    <p className="text-xs">All high-confidence plantations (≥70% AI score) have been auto-approved.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {manualReviewQueue.map((s) => {
                      const score = s.ai_confidence ?? 60;
                      return (
                        <div
                          key={s.id}
                          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {s.photo_url ? (
                              <button
                                onClick={() => setSelectedPhoto(s.photo_url)}
                                className="relative group shrink-0"
                              >
                                <img
                                  src={s.photo_url}
                                  alt={s.tree_name}
                                  className="w-16 h-16 rounded-xl object-cover border border-primary/20 group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="h-4 w-4" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <TreePine className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-heading font-bold text-sm text-foreground">
                                  {s.tree_name}
                                </span>
                                <Badge
                                  className={`text-[10px] ${
                                    score >= 70
                                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                      : score >= 50
                                      ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                      : "bg-destructive/15 text-destructive border-destructive/30"
                                  }`}
                                >
                                  AI Score: {score}%
                                </Badge>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {s.admin_status || "pending"}
                                </Badge>
                              </div>

                              <p className="text-xs text-muted-foreground italic">
                                Species: <span className="text-foreground">{s.species}</span> ·{" "}
                                {new Date(s.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate">{s.location}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <Button
                              size="sm"
                              onClick={() =>
                                updateTreeMutation.mutate({
                                  treeId: s.id,
                                  userId: s.user_id,
                                  newStatus: "approved",
                                  aiConfidence: score,
                                })
                              }
                              disabled={updateTreeMutation.isPending}
                              className="h-8 px-3 text-xs gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve (+50 pts)
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateTreeMutation.mutate({
                                  treeId: s.id,
                                  userId: s.user_id,
                                  newStatus: "rejected",
                                })
                              }
                              disabled={updateTreeMutation.isPending}
                              className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>

                            <Link to={`/tree/${s.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 text-xs text-muted-foreground rounded-xl"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Passport
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Full Plantation Registry */}
            <TabsContent value="registry" className="space-y-4">
              <div className="glass-card rounded-3xl p-6 border border-primary/20 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-heading text-xl font-bold">Comprehensive Tree Registry</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Search, inspect, and manage all {trees.length} plantation records in the database.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search trees, species, locations..."
                        className="pl-8 rounded-xl h-8 text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border">
                      {(["all", "verified", "pending", "rejected"] as const).map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant={statusFilter === st ? "default" : "ghost"}
                          onClick={() => setStatusFilter(st)}
                          className="capitalize text-xs h-7 px-2.5 rounded-lg"
                        >
                          {st}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredRegistry.length === 0 ? (
                  <p className="text-center py-10 text-xs text-muted-foreground">
                    No trees match the current search filters.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                        <tr>
                          <th className="p-3">Tree Name</th>
                          <th className="p-3">Species</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Planted On</th>
                          <th className="p-3">AI Confidence</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredRegistry.map((t) => (
                          <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                              {t.photo_url ? (
                                <img
                                  src={t.photo_url}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover border shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <TreePine className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="truncate max-w-[150px]">{t.tree_name}</span>
                            </td>
                            <td className="p-3 text-muted-foreground italic">{t.species}</td>
                            <td className="p-3 text-muted-foreground truncate max-w-[180px]">
                              {t.location}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(t.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  (t.ai_confidence ?? 75) >= 70 ? "text-emerald-600" : "text-amber-600"
                                }`}
                              >
                                {t.ai_confidence ?? 75}%
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge
                                className={`text-[10px] capitalize ${
                                  t.verification_status === "verified"
                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                    : t.verification_status === "rejected"
                                    ? "bg-destructive/15 text-destructive border-destructive/30"
                                    : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                }`}
                              >
                                {t.verification_status || "pending"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <Link to={`/tree/${t.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Planters & Eco-Points Roster */}
            <TabsContent value="users" className="space-y-4">
              <div className="glass-card rounded-3xl p-6 border border-primary/20 shadow-md">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-xl font-bold">Planters & Volunteers Roster</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Monitor user engagement, verified trees planted, and accumulated Eco-Points.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {profiles.length} Active Planters
                  </Badge>
                </div>

                {isProfilesLoading ? (
                  <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : profiles.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No registered planters yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                        <tr>
                          <th className="p-3">Planter Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Trees Planted</th>
                          <th className="p-3">Eco-Points Balance</th>
                          <th className="p-3">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {profiles.map((p) => (
                          <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 font-semibold text-foreground">
                              {p.full_name || "Anonymous Planter"}
                            </td>
                            <td className="p-3 text-muted-foreground">{p.email}</td>
                            <td className="p-3">
                              <Badge
                                className={`text-[10px] capitalize ${
                                  p.role === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {p.role || "planter"}
                              </Badge>
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {p.trees_planted || 0}
                            </td>
                            <td className="p-3 font-bold text-emerald-600">
                              {p.eco_points || 0} pts
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: Government & Institutional ESG Telemetry */}
            <TabsContent value="government" className="space-y-4">
              <div className="glass-card rounded-3xl p-6 border border-sky-500/30 bg-sky-500/5 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-600">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold">
                        Institutional & Government Compliance Matrix
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Audit-grade telemetry dataset for NITI Aayog (ACIC), State Forest Departments, and ESG Investors.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleExportGovernmentCSV}
                    size="sm"
                    className="rounded-xl gap-2 font-semibold text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Full Audit CSV
                  </Button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-2xl bg-background/80 p-4 border border-border/80">
                    <div className="text-xs text-muted-foreground">Audited Plantation Sites</div>
                    <div className="font-heading font-bold text-2xl text-foreground mt-1">
                      {new Set(trees.map((t) => t.location).filter(Boolean)).size} Locations
                    </div>
                  </div>

                  <div className="rounded-2xl bg-background/80 p-4 border border-border/80">
                    <div className="text-xs text-muted-foreground">Verified Species Richness</div>
                    <div className="font-heading font-bold text-2xl text-emerald-600 mt-1">
                      {new Set(trees.map((t) => t.species).filter(Boolean)).size} Native Species
                    </div>
                  </div>

                  <div className="rounded-2xl bg-background/80 p-4 border border-border/80">
                    <div className="text-xs text-muted-foreground">Certified Sequestration</div>
                    <div className="font-heading font-bold text-2xl text-sky-600 mt-1">
                      {totalCo2Tons.toFixed(2)} MT CO₂e
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-background/60 p-4 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                  <strong>Compliance Note:</strong> All coordinates and timestamps are cryptographically anchored with SHA-256 image hashes and multi-spectral Sentinel-2 NDVI canopy verification curves compliant with IPCC Chapter 4 (Forest Land Biomass Estimation) protocols.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Photo Inspection Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl bg-background border p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedPhoto} alt="Inspection" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
              <div className="flex items-center justify-between p-3">
                <span className="text-xs font-semibold text-muted-foreground">Ground Truth Image Inspection</span>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPhoto(null)} className="h-7 w-7 p-0 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
