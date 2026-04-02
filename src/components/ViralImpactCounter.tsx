import { TreePine, Film, Share2, Users } from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ViralImpactCounter = () => {
  const { data } = useQuery({
    queryKey: ["viral-impact"],
    queryFn: async () => {
      const [treesRes, growthRes, profilesRes, challengeRes] = await Promise.all([
        supabase.from("trees").select("id", { count: "exact", head: true }).eq("admin_status", "approved"),
        supabase.from("growth_updates").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("challenge_participants").select("id", { count: "exact", head: true }),
      ]);
      return {
        trees: treesRes.count || 0,
        stories: growthRes.count || 0,
        volunteers: profilesRes.count || 0,
        challengeParticipants: challengeRes.count || 0,
      };
    },
  });

  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-4xl font-bold text-center mb-4">🌍 Viral Green Impact</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Every tree planted becomes a shareable story inspiring more people to act.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedCounter end={data?.trees || 0} label="Verified Trees" icon={<TreePine className="h-10 w-10" />} />
          <AnimatedCounter end={data?.stories || 0} label="Active Tree Stories" icon={<Film className="h-10 w-10" />} />
          <AnimatedCounter end={data?.volunteers || 0} label="Tree Guardians" icon={<Users className="h-10 w-10" />} />
          <AnimatedCounter end={data?.challengeParticipants || 0} label="Challenge Participants" icon={<Share2 className="h-10 w-10" />} />
        </div>
      </div>
    </section>
  );
};

export default ViralImpactCounter;
