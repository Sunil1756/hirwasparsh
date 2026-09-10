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
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-4xl font-bold text-center mb-4">🌍 Viral Green Impact</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Every tree planted becomes a verifiable living asset inspiring more people to act.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedCounter
            end={data?.totalTreesPlanted || 0}
            label="Verified Trees"
            icon={<TreePine className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />}
            to="/tree-map"
            buttonLabel="Explore GIS Map"
          />
          <AnimatedCounter
            end={data?.totalStories || 0}
            label="Active Tree Stories"
            icon={<Film className="h-10 w-10 text-primary" />}
            to="/growth-updates"
            buttonLabel="View Growth Feed"
          />
          <AnimatedCounter
            end={data?.activeVolunteers || 0}
            label="Tree Guardians"
            icon={<Users className="h-10 w-10 text-blue-500" />}
            to="/leaderboard"
            buttonLabel="View Leaderboard"
          />
          <AnimatedCounter
            end={data?.survivingTrees || data?.totalTreesPlanted || 0}
            label="Trees Surviving"
            icon={<HeartPulse className="h-10 w-10 text-emerald-500 animate-pulse" />}
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

