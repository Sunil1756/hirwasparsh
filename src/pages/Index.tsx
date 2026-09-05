import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TreePine, Leaf, MapPin, Users, BarChart3, Shield, Globe, Award, ArrowRight,
  AlertTriangle, Lightbulb, Sprout, ShieldCheck, TrendingUp, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ViralImpactCounter from "@/components/ViralImpactCounter";
import heroBg from "@/assets/hero-bg.jpg";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const features = [
  { icon: <Globe className="h-8 w-8" />, title: "Satellite NDVI Telemetry", desc: "Sentinel-2 multi-spectral NDVI & NDRE canopy vigor tracking", link: "/tree-map" },
  { icon: <Shield className="h-8 w-8" />, title: "Field Scouting Matrix", desc: "Geotag pest, disease, and water stress with scientific remedies", link: "/scouting" },
  { icon: <TreePine className="h-8 w-8" />, title: "Bulk CSV & Batch QR", desc: "Mass plantation onboarding with printable A4 field QR sheets", link: "/plant/bulk" },
  { icon: <BarChart3 className="h-8 w-8" />, title: "IPCC Carbon Biomass", desc: "Pantropical allometric biomass modeling and ESG carbon credits", link: "/tree-map" },
  { icon: <MapPin className="h-8 w-8" />, title: "Cadastral Parcel Modeler", desc: "Import Google Earth KML / GeoJSON boundaries with Turf.js", link: "/tree-map" },
  { icon: <Bot className="h-8 w-8" />, title: "AI Tree Doctor & MRV", desc: "Gemini multi-modal health diagnostics and anti-fraud verification", link: "/intelligence" },
];

const problems = [
  { icon: <AlertTriangle className="h-10 w-10" />, title: "Deforestation", desc: "80,000 acres of forest are lost daily worldwide" },
  { icon: <Globe className="h-10 w-10" />, title: "Climate Change", desc: "Rising temperatures threaten ecosystems globally" },
  { icon: <Users className="h-10 w-10" />, title: "Low Participation", desc: "Citizens lack tools to contribute to green initiatives" },
];

// Floating leaf/tree particle for hero
const FloatingTree = ({ delay, x, size }: { delay: number; x: string; size: number }) => (
  <motion.div
    className="absolute text-primary-foreground/20 pointer-events-none"
    style={{ left: x, bottom: -40 }}
    animate={{
      y: [0, -600, -1200],
      x: [0, Math.random() > 0.5 ? 30 : -30, 0],
      rotate: [0, 180, 360],
      opacity: [0, 0.6, 0],
    }}
    transition={{ duration: 8 + Math.random() * 4, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <Leaf style={{ width: size, height: size }} />
  </motion.div>
);

// Feature card with 3D flip on hover
const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      custom={i + 1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="perspective-[800px] h-[220px] cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 glass-card rounded-2xl p-8 hover:nature-glow transition-shadow flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <motion.div
            className="text-primary mb-4"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          >
            {f.icon}
          </motion.div>
          <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
          <p className="text-muted-foreground text-sm">{f.desc}</p>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 glass-card rounded-2xl p-8 flex flex-col items-center justify-center bg-primary/10 border-primary/20"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <motion.div
            className="text-primary mb-4"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {f.icon}
          </motion.div>
          <h3 className="font-heading text-lg font-semibold mb-3">{f.title}</h3>
          <Link to={f.link}>
            <Button size="sm" className="gap-2">
              Explore <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Index = () => {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_platform_stats");
      const row = Array.isArray(data) ? data[0] : data;
      return { trees: Number(row?.trees ?? 0), volunteers: Number(row?.volunteers ?? 0) };
    },
  });

  const treesPlanted = stats?.trees || 0;
  const co2Absorbed = Math.round(treesPlanted * 22);
  const volunteers = stats?.volunteers || 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden pt-24 md:pt-28 pb-16 md:pb-24 min-h-[calc(100svh-4rem)]">
        <img src={heroBg} alt="Lush green misty mountain valley" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        {/* Readability overlay: deep green gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--nature-900)/0.72)_0%,hsl(var(--nature-900)/0.55)_45%,hsl(var(--nature-900)/0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--nature-900)/0.45)_100%)]" />
        {/* Smooth fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[hsl(var(--muted)/0.5)] pointer-events-none z-[1]" />

        {/* Floating leaf particles */}
        {[...Array(4)].map((_, i) => (
          <FloatingTree key={i} delay={i * 2} x={`${12 + i * 22}%`} size={16 + i * 4} />
        ))}

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 text-primary-foreground px-4 py-1.5 rounded-full text-xs sm:text-sm mb-7 tracking-wide">
              <Sprout className="h-4 w-4" />
              Smart Green Verification Platform
            </div>

            <h1
              className="font-heading font-extrabold text-primary-foreground leading-[1.05] tracking-[-0.02em] text-balance"
              style={{ fontSize: "clamp(2.1rem, 5.2vw, 4rem)" }}
            >
              MAKE EVERY TREE COUNT.
            </h1>

            <p
              className="font-heading font-semibold text-primary-foreground/95 mt-3"
              style={{ fontSize: "clamp(1.25rem, 2.8vw, 2.25rem)" }}
            >
              Green Enlightenment
            </p>

            <div className="flex items-center justify-center gap-3 my-5 opacity-70">
              <span className="h-px w-10 bg-primary-foreground/50" />
              <Leaf className="h-4 w-4 text-primary-foreground" />
              <span className="h-px w-10 bg-primary-foreground/50" />
            </div>

            <p
              className="font-medium text-primary-foreground/90 tracking-wide"
              style={{ fontSize: "clamp(0.95rem, 1.7vw, 1.25rem)" }}
            >
              Plant with Proof. Grow with Trust.
            </p>

            <p className="mt-5 text-sm sm:text-base text-primary-foreground/75 max-w-2xl mx-auto leading-relaxed">
              Plant trees, verify their survival, track their growth, and measure real environmental impact with AI-powered transparency.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center w-full sm:w-auto">
              <Link to="/plant" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base gap-2 shadow-lg">
                  <Leaf className="h-5 w-5" /> Plant a Tree
                </Button>
              </Link>
              <Link to="/tree-map" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base gap-2 border-primary-foreground/40 bg-primary-foreground/10 backdrop-blur-md text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                  <MapPin className="h-5 w-5" /> Explore Tree Map
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 max-w-3xl mx-auto w-full"
            >
              {[
                { icon: <ShieldCheck className="h-5 w-5" />, label: "Verified Plantation" },
                { icon: <TrendingUp className="h-5 w-5" />, label: "Real-time Tracking" },
                { icon: <Bot className="h-5 w-5" />, label: "AI-Powered Verification" },
                { icon: <Users className="h-5 w-5" />, label: "Community Driven" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 text-primary-foreground/85">
                  <span className="text-primary-foreground">{item.icon}</span>
                  <span className="text-[11px] md:text-xs font-medium text-center leading-tight tracking-wide uppercase">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-4xl font-bold text-foreground mb-4">The Problem We Face</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-xl mx-auto">Our planet needs urgent action. Here's why Green Enlightenment exists.</motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ scale: 1.04, y: -6 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="glass-card rounded-2xl p-8 text-center hover:nature-glow transition-shadow cursor-default"
              >
                <motion.div
                  className="text-destructive mb-4 flex justify-center"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                >
                  {p.icon}
                </motion.div>
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
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Lightbulb className="h-4 w-4" />
              </motion.span>
              Our Solution
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-4xl font-bold mb-4">
              Technology Meets <span className="text-gradient-nature">Nature</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Green Enlightenment combines AI, satellite monitoring, and gamification to make tree plantation trackable, verifiable, and rewarding for everyone.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Features with flip cards */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="font-heading text-4xl font-bold text-center mb-16">Platform Features</motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <FeatureCard key={i} f={f} i={i} />
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

      {/* Viral Impact */}
      <ViralImpactCounter />

      {/* CTA */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-4xl font-bold text-primary-foreground mb-4">Join the Green Movement Today</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Every tree planted makes a difference. Be part of the change and help build a greener, healthier planet.
          </p>
          <Link to="/plant">
            <motion.div whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
