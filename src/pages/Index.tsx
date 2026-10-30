import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, Leaf, MapPin, Users, BarChart3, Shield, Globe, ArrowRight, AlertTriangle, Lightbulb, Sprout, ShieldCheck, TrendingUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useQuery } from "@tanstack/react-query";
import ViralImpactCounter from "@/components/ViralImpactCounter";
import { fetchLivePlatformMetrics } from "@/lib/platformStats";
import heroBg from "@/assets/hero-bg.jpg";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const features = [
  { icon: <Globe className="h-7 w-7" />, title: "Satellite NDVI Telemetry", desc: "Sentinel-2 multi-spectral NDVI & NDRE canopy vigor tracking", link: "/tree-map" },
  { icon: <Shield className="h-7 w-7" />, title: "Field Scouting Matrix", desc: "Geotag pest, disease, and water stress with scientific remedies", link: "/scouting" },
  { icon: <TreePine className="h-7 w-7" />, title: "Bulk CSV & Batch QR", desc: "Mass plantation onboarding with printable A4 field QR sheets", link: "/plant/bulk" },
  { icon: <BarChart3 className="h-7 w-7" />, title: "IPCC Carbon Biomass", desc: "Pantropical allometric biomass modeling and ESG carbon credits", link: "/tree-map" },
  { icon: <MapPin className="h-7 w-7" />, title: "Cadastral Parcel Modeler", desc: "Import Google Earth KML / GeoJSON boundaries with Turf.js", link: "/tree-map" },
  { icon: <Bot className="h-7 w-7" />, title: "AI Tree Doctor & MRV", desc: "Gemini multi-modal health diagnostics and anti-fraud verification", link: "/intelligence" },
];

const problems = [
  { icon: <AlertTriangle className="h-9 w-9" />, title: "Deforestation", desc: "80,000 acres of forest are lost daily worldwide" },
  { icon: <Globe className="h-9 w-9" />, title: "Climate Change", desc: "Rising temperatures threaten ecosystems globally" },
  { icon: <Users className="h-9 w-9" />, title: "Low Participation", desc: "Citizens lack tools to contribute to green initiatives" },
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

// Feature card with smooth 3D flip on hover and direct touch support
const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      custom={i + 1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="perspective-[800px] min-h-[180px] md:h-[190px] cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped((prev) => !prev)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 glass-card rounded-2xl p-6 sm:p-7 hover:nature-glow transition-all flex flex-col justify-between border border-border/40 shadow-sm"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div>
            <div className="text-primary mb-3">
              {f.icon}
            </div>
            <h3 className="font-heading text-lg font-semibold mb-1.5 text-foreground">{f.title}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{f.desc}</p>
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 glass-card rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center bg-primary/10 border border-primary/30 shadow-md"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="text-primary mb-2.5">
            {f.icon}
          </div>
          <h3 className="font-heading text-base sm:text-lg font-semibold mb-3 text-center">{f.title}</h3>
          <Link to={f.link} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="gap-2 h-9 px-5 rounded-xl text-xs sm:text-sm shadow-sm">
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
    queryKey: ["home-stats-live"],
    queryFn: fetchLivePlatformMetrics,
  });

  const treesPlanted = stats?.totalTreesPlanted || 0;
  const co2Absorbed = stats?.co2OffsetKgPerYear || 0;
  const volunteers = stats?.activeVolunteers || 0;

  return (
    <div className="relative overflow-hidden bg-background">
      {/* 1. HERO SECTION */}
      <section className="relative flex items-center justify-center overflow-hidden pt-20 md:pt-28 pb-14 md:pb-18 min-h-[580px] md:min-h-[620px]">
        <img src={heroBg} alt="Lush green misty mountain valley" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        {/* Atmospheric Readability Overlays: rich, high-contrast forest tones */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--nature-900)/0.68)_0%,hsl(var(--nature-900)/0.50)_45%,hsl(var(--nature-900)/0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_32%,hsl(var(--nature-900)/0.45)_100%)]" />
        
        {/* Toned-down gentle bottom edge dissolve - compact (56-64px), strictly at the base below badges */}
        <div className="absolute bottom-0 left-0 right-0 h-14 md:h-16 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none z-[1]" />

        {/* Floating leaf particles */}
        {[...Array(4)].map((_, i) => (
          <FloatingTree key={i} delay={i * 2} x={`${12 + i * 22}%`} size={16 + i * 4} />
        ))}

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 text-primary-foreground px-4 py-1.5 rounded-full text-xs sm:text-sm mb-6 tracking-wide shadow-sm">
              <Sprout className="h-4 w-4" />
              Smart Green Verification Platform
            </div>

            <h1
              className="font-heading font-extrabold text-primary-foreground leading-[1.05] tracking-[-0.02em] text-balance drop-shadow-sm"
              style={{ fontSize: "clamp(2.1rem, 5.2vw, 4rem)" }}
            >
              MAKE EVERY TREE COUNT.
            </h1>

            <p
              className="font-heading font-semibold text-primary-foreground/95 mt-2.5 drop-shadow-sm"
              style={{ fontSize: "clamp(1.25rem, 2.8vw, 2.25rem)" }}
            >
              Green Enlightenment
            </p>

            <div className="flex items-center justify-center gap-3 my-4 opacity-75">
              <span className="h-px w-10 bg-primary-foreground/50" />
              <Leaf className="h-4 w-4 text-primary-foreground" />
              <span className="h-px w-10 bg-primary-foreground/50" />
            </div>

            <p
              className="font-medium text-primary-foreground/90 tracking-wide drop-shadow-sm"
              style={{ fontSize: "clamp(0.95rem, 1.7vw, 1.25rem)" }}
            >
              Plant with Proof. Grow with Trust.
            </p>

            <p className="mt-4 text-xs sm:text-sm md:text-base text-primary-foreground/85 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
              Plant trees, verify their survival, track their growth, and measure real environmental impact with AI-powered transparency.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center w-full sm:w-auto">
              <Link to="/plant" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base gap-2 shadow-lg">
                  <Leaf className="h-5 w-5" /> Plant a Tree
                </Button>
              </Link>
              <Link to="/tree-map" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base gap-2 border-primary-foreground/40 bg-primary-foreground/10 backdrop-blur-md text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground shadow-sm">
                  <MapPin className="h-5 w-5" /> Explore Tree Map
                </Button>
              </Link>
            </div>

            {/* Trust strip - crisp, high-contrast on deep forest background with zero milky white fog */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8 md:mt-10 mb-2 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-3xl mx-auto w-full"
            >
              {[
                { icon: <ShieldCheck className="h-5 w-5" />, label: "Verified Plantation" },
                { icon: <TrendingUp className="h-5 w-5" />, label: "Real-time Tracking" },
                { icon: <Bot className="h-5 w-5" />, label: "AI-Powered Verification" },
                { icon: <Users className="h-5 w-5" />, label: "Community Driven" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 text-primary-foreground">
                  <span className="text-primary-foreground drop-shadow-md">{item.icon}</span>
                  <span className="text-[11px] md:text-xs font-semibold text-center leading-tight tracking-wider uppercase drop-shadow-md">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. THE PROBLEM WE FACE - Toned down, seamless transition without harsh white glare */}
      <section className="relative pt-6 md:pt-8 pb-12 md:pb-16 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-8 md:mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
              The Problem We Face
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl mx-auto">
              Our planet needs urgent action. Here's why Green Enlightenment exists.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="glass-card rounded-2xl p-6 sm:p-7 text-center hover:nature-glow transition-all cursor-default border border-border/40 shadow-sm"
              >
                <div className="text-destructive mb-3.5 flex justify-center">
                  {p.icon}
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-semibold mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TECHNOLOGY MEETS NATURE (OUR SOLUTION) */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-primary/[0.04] to-background">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 border border-primary/20">
              <Lightbulb className="h-4 w-4" />
              Our Solution
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-heading text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
              Technology Meets <span className="text-gradient-nature">Nature</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Green Enlightenment combines AI, satellite monitoring, and gamification to make tree plantation trackable, verifiable, and rewarding for everyone.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* 4. PLATFORM FEATURES (2-COLUMN GRID MATCHING PHOTO) */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-muted/25 to-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-8 md:mb-10 tracking-tight">
            Platform Features
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} f={f} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. LIVE IMPACT */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-background/90 to-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-8 md:mb-10 tracking-tight">Live Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            <AnimatedCounter end={treesPlanted} label="Trees Planted" icon={<TreePine className="h-9 w-9 text-primary" />} />
            <AnimatedCounter end={co2Absorbed} suffix=" kg" label="CO₂ Offset/Year" icon={<Leaf className="h-9 w-9 text-primary" />} />
            <AnimatedCounter end={volunteers} label="Active Volunteers" icon={<Users className="h-9 w-9 text-primary" />} />
          </div>
        </div>
      </section>

      {/* 6. VIRAL IMPACT */}
      <ViralImpactCounter />

      {/* 7. CALL TO ACTION */}
      <section className="relative py-14 md:py-20 bg-gradient-to-b from-primary/95 to-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Join the Green Movement Today</h2>
          <p className="text-primary-foreground/85 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Every tree planted makes a difference. Be part of the change and help build a greener, healthier planet.
          </p>
          <Link to="/plant">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Button size="lg" variant="secondary" className="text-base sm:text-lg px-8 h-12 gap-2 shadow-lg rounded-xl font-semibold">
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
