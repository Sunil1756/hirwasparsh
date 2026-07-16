import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Loader2, Shield, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AuditRow = {
  id: string;
  tree_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string;
  actor_email: string | null;
  created_at: string;
};

const actionStyle = (a: string) =>
  a === "approved" ? { icon: <CheckCircle className="h-4 w-4" />, cls: "bg-primary/10 text-primary" } :
  a === "rejected" ? { icon: <XCircle className="h-4 w-4" />, cls: "bg-destructive/10 text-destructive" } :
  a === "flagged"  ? { icon: <AlertTriangle className="h-4 w-4" />, cls: "bg-yellow-500/10 text-yellow-600" } :
                     { icon: <Clock className="h-4 w-4" />, cls: "bg-accent/20 text-accent-foreground" };

type RejectionRow = {
  id: string;
  tree_name: string | null;
  species: string | null;
  photo_url: string | null;
  rejection_reason: string | null;
  user_id: string;
  updated_at: string;
};

type FilterTab = "all" | "approved" | "rejected" | "flagged";

const AdminAuditLog = () => {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<FilterTab>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-audit-log", tab],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("admin_audit_log")
        .select("id, tree_id, action, previous_status, new_status, actor_email, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (tab !== "all") q = q.eq("action", tab);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const { data: rejections = [], isLoading: rejLoading } = useQuery({
    queryKey: ["admin-rejection-details"],
    enabled: isAdmin && tab === "rejected",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("id, tree_name, species, photo_url, rejection_reason, user_id, updated_at")
        .eq("admin_status", "rejected")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RejectionRow[];
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="font-heading text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">The audit log is restricted to administrators.</p>
          <Link to="/admin"><Button variant="outline">Go to Admin</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <ScrollText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="font-heading text-3xl font-bold">Admin Audit Log</h1>
                <p className="text-sm text-muted-foreground">Every approve, reject, and flag action — for transparency.</p>
              </div>
            </div>
            <Link to="/admin"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Button></Link>
          </div>

          <div className="glass-card rounded-2xl p-6">
            {isLoading ? (
              <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
            ) : rows.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No admin actions have been recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Actor</th>
                      <th className="py-2 pr-4 font-medium">Action</th>
                      <th className="py-2 pr-4 font-medium">Change</th>
                      <th className="py-2 pr-4 font-medium">Tree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const s = actionStyle(r.action);
                      return (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-accent/5">
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 font-medium">{r.actor_email ?? "—"}</td>
                          <td className="py-2 pr-4">
                            <Badge className={`gap-1 capitalize ${s.cls}`}>{s.icon}{r.action}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            {r.previous_status ?? "—"} → <span className="text-foreground font-medium">{r.new_status}</span>
                          </td>
                          <td className="py-2 pr-4">
                            {r.tree_id ? (
                              <Link to={`/tree/${r.tree_id}`} className="text-primary hover:underline font-mono text-xs">
                                {r.tree_id.slice(0, 8)}…
                              </Link>
                            ) : <span className="text-muted-foreground">deleted</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAuditLog;
