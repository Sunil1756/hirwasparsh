import { TreePine, Film, HeartPulse, Users } from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useQuery } from "@tanstack/react-query";
import { fetchLivePlatformMetrics } from "@/lib/platformStats";

const ViralImpactCounter = () => {
  const { data } = useQuery({
    queryKey: ["viral-impact-live"],
    queryFn: fetchLivePlatformMetrics,
  });

  return (
    <section className="relative py-12 md:py-16 bg-gradient-to-b from-muted/20 via-background to-primary/5">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-3 tracking-tight">🌍 Viral Green Impact</h2>
        <p className="text-muted-foreground text-center mb-8 md:mb-10 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
          Every tree planted becomes a verifiable living asset inspiring more people to act.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <AnimatedCounter
            end={data?.totalTreesPlanted || 0}
            label="Verified Trees"
            icon={<TreePine className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />}
            to="/tree-map"
            buttonLabel="Explore GIS Map"
          />
          <AnimatedCounter
            end={data?.totalStories || 0}
            label="Active Tree Stories"
            icon={<Film className="h-9 w-9 text-primary" />}
            to="/growth-updates"
            buttonLabel="View Growth Feed"
          />
          <AnimatedCounter
            end={data?.activeVolunteers || 0}
            label="Tree Guardians"
            icon={<Users className="h-9 w-9 text-blue-500" />}
            to="/leaderboard"
            buttonLabel="View Leaderboard"
          />
          <AnimatedCounter
            end={data?.survivingTrees ?? 0}
            label="Trees Surviving"
            icon={<HeartPulse className="h-9 w-9 text-emerald-500 animate-pulse" />}
            to="/intelligence"
            badge="Live Telemetry"
            buttonLabel="Track Survival HUD"
          />
        </div>
      </div>
    </section>
  );
};

export default ViralImpactCounter;
