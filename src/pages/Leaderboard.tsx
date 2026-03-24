import { motion } from "framer-motion";
import { Trophy, TreePine, Star, MapPin, Medal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const topPlanters = [
  { rank: 1, name: "Rahul Sharma", trees: 158, points: 3160, city: "Pune" },
  { rank: 2, name: "Sneha Patil", trees: 132, points: 2640, city: "Mumbai" },
  { rank: 3, name: "Arjun Desai", trees: 105, points: 2100, city: "Delhi" },
  { rank: 4, name: "Priya Nair", trees: 89, points: 1780, city: "Bangalore" },
  { rank: 5, name: "Vikram Singh", trees: 76, points: 1520, city: "Nagpur" },
  { rank: 6, name: "Meera Joshi", trees: 68, points: 1360, city: "Pune" },
  { rank: 7, name: "Amit Kumar", trees: 54, points: 1080, city: "Chennai" },
  { rank: 8, name: "Kavita Rao", trees: 47, points: 940, city: "Hyderabad" },
];

const topCities = [
  { rank: 1, name: "Pune", trees: 4200, volunteers: 340 },
  { rank: 2, name: "Mumbai", trees: 3800, volunteers: 290 },
  { rank: 3, name: "Delhi", trees: 3100, volunteers: 250 },
  { rank: 4, name: "Bangalore", trees: 2600, volunteers: 210 },
  { rank: 5, name: "Nagpur", trees: 1900, volunteers: 160 },
];

const rankColor = (r: number) => r === 1 ? "text-yellow-500" : r === 2 ? "text-gray-400" : r === 3 ? "text-amber-600" : "text-muted-foreground";

const Leaderboard = () => (
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

        <Tabs defaultValue="planters">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="planters" className="gap-2"><TreePine className="h-4 w-4" /> Top Planters</TabsTrigger>
            <TabsTrigger value="cities" className="gap-2"><MapPin className="h-4 w-4" /> Top Cities</TabsTrigger>
          </TabsList>

          <TabsContent value="planters">
            {/* Top 3 podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[topPlanters[1], topPlanters[0], topPlanters[2]].map((p, i) => (
                <motion.div key={p.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`glass-card rounded-2xl p-6 text-center ${p.rank === 1 ? "nature-glow ring-2 ring-primary/20 -mt-4" : ""}`}>
                  <Medal className={`h-8 w-8 mx-auto mb-2 ${rankColor(p.rank)}`} />
                  <div className="font-heading font-bold text-lg">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.city}</div>
                  <div className="mt-3 flex items-center justify-center gap-1 text-primary font-heading font-bold text-2xl">
                    <TreePine className="h-5 w-5" /> {p.trees}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3" /> {p.points} pts
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Rest of list */}
            <div className="glass-card rounded-2xl overflow-hidden">
              {topPlanters.slice(3).map((p) => (
                <div key={p.rank} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-4">
                    <span className="font-heading font-bold text-lg text-muted-foreground w-8">#{p.rank}</span>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium"><TreePine className="h-4 w-4 inline text-primary mr-1" />{p.trees}</span>
                    <span className="text-sm text-muted-foreground"><Star className="h-3 w-3 inline mr-1" />{p.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cities">
            <div className="glass-card rounded-2xl overflow-hidden">
              {topCities.map((c) => (
                <div key={c.rank} className="flex items-center justify-between px-6 py-5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-4">
                    <Medal className={`h-6 w-6 ${rankColor(c.rank)}`} />
                    <div>
                      <div className="font-heading font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.volunteers} volunteers</div>
                    </div>
                  </div>
                  <div className="font-heading font-bold text-primary text-lg">{c.trees.toLocaleString()} trees</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  </div>
);

export default Leaderboard;
