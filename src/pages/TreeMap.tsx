import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TreePine, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mockTrees = [
  { id: 1, name: "Neem Tree", species: "Neem", city: "Pune", owner: "Rahul", date: "Mar 2026", lat: 18.52, lng: 73.85 },
  { id: 2, name: "Banyan Tree", species: "Banyan", city: "Mumbai", owner: "Sneha", date: "Feb 2026", lat: 19.07, lng: 72.87 },
  { id: 3, name: "Peepal Tree", species: "Peepal", city: "Delhi", owner: "Arjun", date: "Jan 2026", lat: 28.61, lng: 77.20 },
  { id: 4, name: "Mango Tree", species: "Mango", city: "Bangalore", owner: "Priya", date: "Mar 2026", lat: 12.97, lng: 77.59 },
  { id: 5, name: "Teak Tree", species: "Teak", city: "Nagpur", owner: "Vikram", date: "Feb 2026", lat: 21.14, lng: 79.08 },
  { id: 6, name: "Ashoka Tree", species: "Ashoka", city: "Pune", owner: "Meera", date: "Mar 2026", lat: 18.55, lng: 73.90 },
];

const TreeMap = () => {
  const [filter, setFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const filtered = mockTrees.filter(t =>
    (cityFilter === "all" || t.city === cityFilter) &&
    (filter === "" || t.name.toLowerCase().includes(filter.toLowerCase()) || t.species.toLowerCase().includes(filter.toLowerCase()))
  );
  const cities = [...new Set(mockTrees.map(t => t.city))];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h1 className="font-heading text-4xl font-bold mb-2">Tree Map</h1>
            <p className="text-muted-foreground">Explore all planted trees across India</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by tree name or species..." className="pl-10" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg cursor-pointer hover:scale-110 transition-transform" title={t.name}>
                    <TreePine className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tree list */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="glass-card rounded-xl p-4 hover:nature-glow transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-lg p-2"><TreePine className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-semibold">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.species} · {t.city}</p>
                    <p className="text-xs text-muted-foreground mt-1">By {t.owner} · {t.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeMap;
