import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, Leaf, MapPin, Users, BarChart3, Shield, Globe, Award, ArrowRight, AlertTriangle, Lightbulb, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ViralImpactCounter from "@/components/ViralImpactCounter";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const features = [
  { icon: <TreePine className="h-8 w-8" />, title: "Plant & Register", desc: "Register tree plantations with photos and GPS location" },
  { icon: <Shield className="h-8 w-8" />, title: "AI Verification", desc: "AI-powered image recognition verifies tree uploads" },
  { icon: <MapPin className="h-8 w-8" />, title: "Interactive Map", desc: "View all planted trees on an interactive map" },
  { icon: <BarChart3 className="h-8 w-8" />, title: "Analytics", desc: "Track environmental impact with real-time data" },
  { icon: <Award className="h-8 w-8" />, title: "Gamification", desc: "Earn points, badges, and compete on leaderboards" },
  { icon: <Globe className="h-8 w-8" />, title: "Satellite Monitoring", desc: "Monitor green cover with vegetation index tracking" },
];

const problems = [
  { icon: <AlertTriangle className="h-10 w-10" />, title: "Deforestation", desc: "80,000 acres of forest are lost daily worldwide" },
  { icon: <Globe className="h-10 w-10" />, title: "Climate Change", desc: "Rising temperatures threaten ecosystems globally" },
  { icon: <Users className="h-10 w-10" />, title: "Low Participation", desc: "Citizens lack tools to contribute to green initiatives" },
];

const Index = () => {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [treesRes, profilesRes] = await Promise.all([
        supabase.from("trees").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        trees: treesRes.count || 0,
        volunteers: profilesRes.count || 0,
      };
    },
  });

  const treesPlanted = stats?.trees || 0;
  const co2Absorbed = Math.round(treesPlanted * 22);
  const volunteers = stats?.volunteers || 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="Lush green forest" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-nature-900/70 via-nature-900/50 to-background" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm mb-6">
              <Sprout className="h-4 w-4" />
              Smart Green Community Platform
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold text-primary-foreground mb-6 leading-tight">
              Grow a Greener Future<br />
              <span className="text-sky">with Hirwa Sparsh</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Plant trees, track growth, and build green communities using AI technology and community participation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/plant">
                <Button size="lg" className="text-lg px-8 gap-2">
                  <Leaf className="h-5 w-5" /> Plant a Tree
                </Button>
              </Link>
              <Link to="/tree-map">
                <Button size="lg" variant="outline" className="text-lg px-8 gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <MapPin className="h-5 w-5" /> Explore Tree Map
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-4xl font-bold text-foreground mb-4">The Problem We Face</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-xl mx-auto">Our planet needs urgent action. Here's why Hirwa Sparsh exists.</motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((p, i) => (
              <motion.div key={i} variants={fadeUp} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="glass-card rounded-2xl p-8 text-center hover:nature-glow transition-shadow">
                <div className="text-destructive mb-4 flex justify-center">{p.icon}</div>
                <h3 className="font-heading text-xl font-semibold mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
              <Lightbulb className="h-4 w-4" /> Our Solution
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-4xl font-bold mb-4">
              Technology Meets <span className="text-gradient-nature">Nature</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Hirwa Sparsh combines AI, satellite monitoring, and gamification to make tree plantation trackable, verifiable, and rewarding for everyone.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="font-heading text-4xl font-bold text-center mb-16">Platform Features</motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i + 1} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="glass-card rounded-2xl p-8 hover:nature-glow transition-all group">
                <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Counter */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-4xl font-bold text-center mb-16">Live Impact</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatedCounter end={treesPlanted} label="Trees Planted" icon={<TreePine className="h-10 w-10" />} />
            <AnimatedCounter end={co2Absorbed} suffix=" kg" label="CO₂ Offset/Year" icon={<Leaf className="h-10 w-10" />} />
            <AnimatedCounter end={volunteers} label="Active Volunteers" icon={<Users className="h-10 w-10" />} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-4xl font-bold text-primary-foreground mb-4">Join the Green Movement Today</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Every tree planted makes a difference. Be part of the change and help build a greener, healthier planet.
          </p>
          <Link to="/plant">
            <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
