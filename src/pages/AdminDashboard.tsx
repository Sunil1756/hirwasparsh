import { motion } from "framer-motion";
import { Shield, TreePine, Users, CheckCircle, XCircle, Clock, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const pendingSubmissions = [
  { id: 1, user: "Rahul S.", tree: "Neem Tree", date: "Mar 22, 2026", location: "Pune" },
  { id: 2, user: "Priya N.", tree: "Teak Tree", date: "Mar 21, 2026", location: "Mumbai" },
  { id: 3, user: "Amit K.", tree: "Mango Tree", date: "Mar 20, 2026", location: "Delhi" },
];

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState(pendingSubmissions);

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
              { label: "Total Trees", value: "15,420", icon: <TreePine className="h-5 w-5" />, color: "text-primary" },
              { label: "Total Users", value: "3,250", icon: <Users className="h-5 w-5" />, color: "text-sky" },
              { label: "Pending Review", value: submissions.length.toString(), icon: <Clock className="h-5 w-5" />, color: "text-accent-foreground" },
              { label: "Flagged", value: "12", icon: <AlertTriangle className="h-5 w-5" />, color: "text-destructive" },
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

          {/* Pending Submissions */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-4">Pending Submissions</h2>
            {submissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">All submissions reviewed! ✅</p>
            ) : (
              <div className="space-y-3">
                {submissions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">{s.tree}</div>
                      <div className="text-sm text-muted-foreground">By {s.user} · {s.location} · {s.date}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setSubmissions(prev => prev.filter(x => x.id !== s.id))} className="gap-1">
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setSubmissions(prev => prev.filter(x => x.id !== s.id))} className="gap-1">
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
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

export default AdminDashboard;
