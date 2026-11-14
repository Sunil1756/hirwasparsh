import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TreePine, Leaf, MapPin, Users, BarChart3, Shield, Globe, ArrowRight,
  AlertTriangle, Lightbulb, Sprout, ShieldCheck, TrendingUp, Bot, Sparkles,
  User, Building2, Award, ArrowRightLeft, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useQuery } from "@tanstack/react-query";
import ViralImpactCounter from "@/components/ViralImpactCounter";
import { fetchLivePlatformMetrics } from "@/lib/platformStats";
import { useAppMode } from "@/contexts/AppModeContext";
import heroBg from "@/assets/hero-bg.jpg";
import sentinelTelemetryHud from "@/assets/sentinel-telemetry-hud.jpg";
import { useState } from "react";
import { SEO } from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const features = [
  // Institutional & Enterprise MRV
  { icon: <Globe className="h-7 w-7" />, title: "Satellite NDVI Telemetry", desc: "Sentinel-2 multi-spectral NDVI & NDRE canopy vigor tracking", link: "/tree-map", mode: "institutional" },
  { icon: <Shield className="h-7 w-7" />, title: "Field Scouting Matrix", desc: "Geotag pest, disease, and water stress with scientific remedies", link: "/scouting", mode: "institutional" },
  { icon: <TreePine className="h-7 w-7" />, title: "Bulk CSV & Batch QR", desc: "Mass plantation onboarding with printable A4 field QR sheets", link: "/plant/bulk", mode: "institutional" },
  { icon: <BarChart3 className="h-7 w-7" />, title: "IPCC Carbon Biomass", desc: "Pantropical allometric biomass modeling and ESG carbon credits", link: "/portal/csr", mode: "institutional" },
  { icon: <MapPin className="h-7 w-7" />, title: "Cadastral Parcel Modeler", desc: "Import Google Earth KML / GeoJSON boundaries with Turf.js", link: "/project-management", mode: "institutional" },
  { icon: <Building2 className="h-7 w-7" />, title: "NGO Command Center", desc: "Compartment quotas, survival verification, and team governance", link: "/workspace/ngo", mode: "institutional" },
  // Individual & Citizen Planter
  { icon: <Sprout className="h-7 w-7" />, title: "Individual Tree Planting", desc: "Plant and geotag backyard trees in 60s with phone camera & GPS", link: "/plant/individual", mode: "individual" },
  { icon: <Bot className="h-7 w-7" />, title: "AI Tree Doctor & Voice", desc: "Gemini multi-lingual health diagnosis and vernacular care advice", link: "/intelligence", mode: "individual" },
  { icon: <Award className="h-7 w-7" />, title: "Adopter Passports & Stories", desc: "Adopt verified saplings with milestone updates and growth stories", link: "/adopter", mode: "individual" },
];

const problems = [
  { icon: <AlertTriangle className="h-9 w-9" />, title: "Deforestation", desc: "80,000 acres of forest are lost daily worldwide (Source: UN FAO Global Forest Resources Assessment)" },
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
  const { mode, isIndividual, isInstitutional, switchModeAndNavigate } = useAppMode();
  const [featureFilter, setFeatureFilter] = useState<"all" | "individual" | "institutional">("all");
  const { data: stats } = useQuery({
    queryKey: ["home-stats-live"],
    queryFn: fetchLivePlatformMetrics,
  });

  const treesPlanted = stats?.totalTreesPlanted || 0;
  const co2Absorbed = stats?.co2OffsetKgPerYear || 0;
  const volunteers = stats?.activeVolunteers || 0;

  const displayFeatures = features.filter((f) => {
    if (featureFilter === "all") return true;
    return f.mode === featureFilter;
  });

  return (
    <div className="relative overflow-hidden bg-background">
      <SEO
        title="AI & Satellite Tree Verification Platform"
        description="Plant trees with proof. Green Enlightenment combines multi-spectral Sentinel-2 satellite imagery, AI vision audits, and IPCC allometric carbon accounting."
        canonicalPath="/"
      />
      {/* 1. HERO SECTION (Extended to Red Arrow Line - Full Mobile & Desktop Fold Matching Map My Crop) */}
      <section className="relative flex items-center justify-center overflow-hidden pt-20 md:pt-28 pb-16 md:pb-24 min-h-[840px] sm:min-h-[880px] md:min-h-[920px]">
        <img src={heroBg} alt="Lush green misty mountain valley" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        {/* Atmospheric Readability Overlays: rich, high-contrast forest tones */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--nature-900)/0.70)_0%,hsl(var(--nature-900)/0.52)_40%,hsl(var(--nature-900)/0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--nature-900)/0.45)_100%)]" />
        
        {/* Toned-down gentle bottom edge dissolve - compact (56-64px), strictly at the base */}
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-20 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none z-[1]" />

        {/* Floating leaf particles */}
        {[...Array(4)].map((_, i) => (
          <FloatingTree key={i} delay={i * 2} x={`${12 + i * 22}%`} size={16 + i * 4} />
        ))}

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 text-center">
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

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8 md:mt-10 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-3xl mx-auto w-full"
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

            {/* Interactive Sentinel-2 Space Telemetry Showcase Card (Lush Green Glassmorphism - Seamlessly Merged into Main Page) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.7 }}
              className="mt-4 max-w-xl mx-auto w-full text-left"
            >
              <Link to="/tree-map" className="block group">
                <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-emerald-500/35 bg-gradient-to-b from-emerald-950/70 via-nature-900/60 to-emerald-950/80 backdrop-blur-xl shadow-[0_12px_45px_-10px_hsl(142_70%_25%/0.5)] p-3.5 sm:p-5 hover:border-emerald-400/70 hover:shadow-[0_16px_50px_-8px_hsl(142_70%_35%/0.6)] transition-all duration-300">
                  {/* Subtle ambient green radial glow */}
                  <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Top Bar of the HUD Card */}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-emerald-500/25">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-sm">
                        <Globe className="h-3.5 w-3.5 text-emerald-400" />
                        Sentinel-2 Multi-Spectral Telemetry
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-mono font-medium text-emerald-200 bg-emerald-900/70 border border-emerald-400/40 px-2.5 py-0.5 rounded-full shadow-sm">
                      BOA Reflectance Live
                    </span>
                  </div>

                  {/* Dedicated Space-Borne Sentinel-2 Telemetry & LiDAR Canopy Elevation Scan */}
                  <div className="relative h-44 sm:h-52 md:h-56 rounded-xl overflow-hidden bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                    <img
                      src={sentinelTelemetryHud}
                      alt="Satellite LiDAR Forest Canopy Multi-Spectral Telemetry"
                      className="absolute inset-0 w-full h-full object-cover object-center filter saturate-[1.25] brightness-[1.08] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
                    />
                    
                    {/* Organic Emerald Light Flare instead of Dark Black overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-emerald-950/20 pointer-events-none" />
                    
                    {/* Scanning telemetry line in bright emerald */}
                    <motion.div
                      animate={{ y: ["-100%", "220%"] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                      className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-emerald-300/35 to-transparent pointer-events-none"
                    />

                    {/* Floating Telemetry Badge 1: Top Left - NDVI Health */}
                    <div className="absolute top-2.5 left-2.5 bg-emerald-950/85 backdrop-blur-md border border-emerald-400/60 text-left px-2.5 py-1.5 rounded-xl shadow-lg">
                      <div className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider">Canopy Vigor</div>
                      <div className="text-sm sm:text-base font-mono font-extrabold text-white flex items-center gap-1.5">
                        <span>0.78 NDVI</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-md font-sans font-semibold">Healthy</span>
                      </div>
                    </div>

                    {/* Floating Telemetry Badge 2: Top Right - AI Tree Doctor Status */}
                    <div className="absolute top-2.5 right-2.5 bg-emerald-950/85 backdrop-blur-md border border-emerald-400/60 text-right px-2.5 py-1.5 rounded-xl shadow-lg">
                      <div className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider">Gemini MRV</div>
                      <div className="text-sm sm:text-base font-mono font-extrabold text-white flex items-center gap-1.5 justify-end">
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-md font-sans font-semibold">Verified</span>
                        <span>99.4%</span>
                      </div>
                    </div>

                    {/* Floating Telemetry Badge 3: Bottom Right - IPCC Carbon Biomass */}
                    <div className="absolute bottom-2.5 right-2.5 bg-emerald-950/85 backdrop-blur-md border border-emerald-400/50 text-right px-2.5 py-1.5 rounded-xl shadow-lg">
                      <div className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider">Carbon Accrual</div>
                      <div className="text-xs sm:text-sm font-mono font-extrabold text-emerald-100">
                        +24.5 kg CO₂/yr
                      </div>
                    </div>

                    {/* Bottom Left: NDVI Color Ramp Legend */}
                    <div className="absolute bottom-2.5 left-2.5 bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                      <span className="text-[8px] font-mono font-semibold text-emerald-200">0.0</span>
                      <div className="h-1.5 w-14 sm:w-16 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 shadow-sm" />
                      <span className="text-[8px] font-mono font-semibold text-emerald-200">0.9</span>
                    </div>
                  </div>

                  {/* Bottom CTA Bar of HUD Card - Vibrant Green Pill Button matching Main Page */}
                  <div className="relative z-10 mt-3 pt-2.5 border-t border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <span className="flex items-center gap-2 text-[11px] sm:text-xs text-emerald-200/90 font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Live 10m Sentinel-2 Multi-Spectral Telemetry
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-primary text-white text-xs font-semibold shadow-md shadow-emerald-950/50 border border-emerald-400/40 group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:shadow-emerald-500/30 group-hover:scale-[1.02] transition-all">
                      Launch GIS Radar <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 1.5 PLATFORM EXPERIENCE MODE SELECTOR */}
      <section className="relative -mt-6 z-20 container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card rounded-3xl p-5 sm:p-7 border border-border/60 bg-card/90 backdrop-blur-xl shadow-xl"
        >
          <div className="text-center mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Two Distinct Workspaces
            </span>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mt-2 text-foreground">
              Tailored Experiences for Citizens & Institutions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
              Switch between personal planting & gamification, or enterprise cadastral MRV & CSR carbon accounting anytime without losing access to any feature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Mode 1: Individual Planter */}
            <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              isIndividual 
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                : "border-border/60 bg-muted/20 hover:border-primary/40"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  {isIndividual && (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      Currently Active
                    </Badge>
                  )}
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                  🌱 Individual & Citizen Planter
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  For individuals, adopters, families, and eco-clubs planting backyard trees, adopting saplings, and tracking personal green impact.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-foreground/80">
                  <li className="flex items-center gap-2">✓ Plant a tree in 60s with phone camera & GPS</li>
                  <li className="flex items-center gap-2">✓ Adopt & name trees with digital passports</li>
                  <li className="flex items-center gap-2">✓ Vernacular Voice AI Tree Doctor for garden care</li>
                  <li className="flex items-center gap-2">✓ Community leaderboard, badges & green points</li>
                </ul>
              </div>
              <Button
                onClick={() => switchModeAndNavigate("individual")}
                className="mt-5 w-full rounded-xl gap-2 text-xs font-semibold"
                variant={isIndividual ? "default" : "outline"}
              >
                {isIndividual ? "Explore Citizen Features" : "Switch to Individual Mode"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mode 2: Institutional & CSR MRV */}
            <div className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              isInstitutional 
                ? "border-emerald-500 bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/25" 
                : "border-border/60 bg-muted/20 hover:border-emerald-500/40"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
                    <Building2 className="h-6 w-6" />
                  </div>
                  {isInstitutional && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Currently Active
                    </Badge>
                  )}
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                  🏢 Institutional, NGO & CSR MRV
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  For forest departments, NGOs, and corporate ESG teams managing mass plantations, carbon credits, and satellite surveillance.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-foreground/80">
                  <li className="flex items-center gap-2">✓ NGO Command Center & Cadastral Parcel Mapping</li>
                  <li className="flex items-center gap-2">✓ Mass CSV/Excel upload & A4 field QR sheet printer</li>
                  <li className="flex items-center gap-2">✓ 10m Sentinel-2 multi-spectral NDVI & NDRE telemetry</li>
                  <li className="flex items-center gap-2">✓ Scope 1/2/3 carbon credits & Verra/BRSR audit ledgers</li>
                </ul>
              </div>
              <Button
                onClick={() => switchModeAndNavigate("institutional")}
                className="mt-5 w-full rounded-xl gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                variant={isInstitutional ? "default" : "outline"}
              >
                {isInstitutional ? "Explore Institutional Console" : "Switch to Institutional Mode"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. THE PROBLEM WE FACE - Toned down, seamless transition starting exactly below the extended first screen */}
      <section className="relative pt-8 md:pt-12 pb-12 md:pb-16 bg-gradient-to-b from-background via-muted/20 to-background">
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

      {/* 4. PLATFORM FEATURES (WITH DEDICATED MODE TABS) */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-muted/25 to-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8 md:mb-10">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
              className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Platform Features & Capabilities
            </motion.h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto">
              Separated into dedicated modes for individual citizen planters and enterprise forestry operations.
            </p>

            {/* Mode Category Filter Tabs */}
            <div className="mt-5 inline-flex items-center p-1 rounded-2xl bg-muted/80 border border-border/60">
              <button
                onClick={() => setFeatureFilter("all")}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  featureFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Capabilities ({features.length})
              </button>
              <button
                onClick={() => setFeatureFilter("individual")}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  featureFilter === "individual"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-3 w-3" />
                Citizen & Community (3)
              </button>
              <button
                onClick={() => setFeatureFilter("institutional")}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  featureFilter === "institutional"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3 w-3" />
                Institutional & MRV (6)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {displayFeatures.map((f, i) => (
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
