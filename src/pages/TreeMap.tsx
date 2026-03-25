import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TreePine, Filter, Search, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const fetchTrees = async () => {
  const { data, error } = await supabase
    .from("trees")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

const TreeMap = () => {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: fetchTrees,
  });

  const filtered = trees.filter(t =>
    (statusFilter === "all" || t.verification_status === statusFilter) &&
    (filter === "" ||
      t.tree_name.toLowerCase().includes(filter.toLowerCase()) ||
      t.species.toLowerCase().includes(filter.toLowerCase()) ||
      t.location.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h1 className="font-heading text-4xl font-bold mb-2">Tree Map</h1>
            <p className="text-muted-foreground">Explore all planted trees across the community</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, species, or location..." className="pl-10" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trees</SelectItem>
                <SelectItem value="verified">✅ Verified</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Map placeholder with markers */}
          <div className="glass-card rounded-2xl overflow-hidden mb-8">
            <div className="bg-gradient-to-br from-nature-100 to-nature-200 h-[400px] relative flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "30px 30px"
              }} />
              {isLoading ? (
                <div className="text-center z-10">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-3 animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading trees...</p>
                </div>
              ) : (
                <>
                  <div className="text-center z-10">
                    <MapPin className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="font-heading font-semibold text-lg">Interactive Map</p>
                    <p className="text-muted-foreground text-sm">{filtered.length} trees displayed</p>
                  </div>
                  {filtered.map((t, i) => (
                    <div key={t.id} className="absolute animate-float" style={{
                      left: `${15 + (i * 13) % 70}%`,
                      top: `${20 + (i * 17) % 60}%`,
                      animationDelay: `${i * 0.5}s`
                    }}>
                      <div
                        className={`rounded-full p-2 shadow-lg cursor-pointer hover:scale-110 transition-transform ${
                          t.verification_status === "verified"
                            ? "bg-primary text-primary-foreground"
                            : t.verification_status === "rejected"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={`${t.tree_name} (${t.verification_status})`}
                      >
                        <TreePine className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Tree list */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading trees...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No trees found. Be the first to plant one!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => (
                <div key={t.id} className="glass-card rounded-xl p-4 hover:nature-glow transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-lg p-2"><TreePine className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold truncate">{t.tree_name}</h3>
                        {t.verification_status === "verified" ? (
                          <Badge variant="default" className="shrink-0 text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </Badge>
                        ) : t.verification_status === "rejected" ? (
                          <Badge variant="destructive" className="shrink-0 text-xs">Rejected</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.species}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        📍 {t.location}
                      </p>
                      {t.ai_confidence && (
                        <p className="text-xs text-primary mt-1">AI Confidence: {t.ai_confidence}%</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TreeMap;
