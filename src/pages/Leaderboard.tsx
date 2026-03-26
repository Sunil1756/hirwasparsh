import { motion } from "framer-motion";
import { Trophy, TreePine, Star, Medal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const rankColor = (r: number) => r === 1 ? "text-yellow-500" : r === 2 ? "text-gray-400" : r === 3 ? "text-amber-600" : "text-muted-foreground";

const Leaderboard = () => {
  const { data: planters = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, trees_planted, green_points")
        .gt("trees_planted", 0)
        .order("trees_planted", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const ranked = planters.map((p, i) => ({ ...p, rank: i + 1 }));
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <Trophy className="h-4 w-4" /> Community Leaderboard
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">Recognizing our top environmental champions</p>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : ranked.length === 0 ? (
            <div className="text-center py-20">
              <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No planters yet</h3>
              <p className="text-muted-foreground">Be the first to plant a tree and top the leaderboard!</p>
            </div>
          ) : (
            <>
              {/* Top 3 podium */}
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
                    </motion.div>
                  ))}
                </div>
              )}

              {/* If less than 3, show them in a list */}
              {top3.length < 3 && top3.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden mb-8">
                  {top3.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-4">
                        <Medal className={`h-6 w-6 ${rankColor(p.rank)}`} />
                        <div className="font-medium">{p.full_name || "Anonymous"}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium"><TreePine className="h-4 w-4 inline text-primary mr-1" />{p.trees_planted}</span>
                        <span className="text-sm text-muted-foreground"><Star className="h-3 w-3 inline mr-1" />{p.green_points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest of list */}
              {rest.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  {rest.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{p.rank}</span>
                        <div className="font-medium">{p.full_name || "Anonymous"}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium"><TreePine className="h-4 w-4 inline text-primary mr-1" />{p.trees_planted}</span>
                        <span className="text-sm text-muted-foreground"><Star className="h-3 w-3 inline mr-1" />{p.green_points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
