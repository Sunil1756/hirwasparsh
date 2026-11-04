import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Satellite,
  Trees,
  Award,
  BookOpen,
  CheckCircle2,
  Cpu,
  Building2,
  Users,
  ExternalLink,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Methodology = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-background text-foreground">
      <SEO
        title="Scientific MRV & Carbon Sequestration Methodology"
        description="Comprehensive audit methodology for tree survival verification, IPCC AFOLU Tier-2 allometric carbon accretion, and ESA Sentinel-2 satellite telemetry."
        canonicalPath="/methodology"
      />

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 space-y-4"
        >
          <Badge variant="outline" className="px-3 py-1 text-xs border-emerald-500/40 text-emerald-400 bg-emerald-950/30">
            Institutional Audit Framework • Verra VM0047 & IPCC Aligned
          </Badge>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Scientific MRV &amp; Carbon Accounting Methodology
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            Green Enlightenment eliminates greenwashing through multi-tiered verification: ground-truth botanical AI inspection, cryptographic EXIF auditing, and ESA Sentinel-2 spaceborne telemetry.
          </p>
        </motion.div>

        {/* 3 Core Pillars */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-emerald-500/20 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                <Trees className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">1. IPCC Tier-2 Allometry</CardTitle>
              <CardDescription className="text-xs">
                Pantropical allometric biomass equations calibrated by native Western Ghats wood densities.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Calculates Above-Ground Biomass (AGB) and Below-Ground Biomass (BGB) with a 0.47 carbon fraction and stoichiometric CO₂ equivalent conversion factor (44/12).
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-2">
                <Satellite className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">2. Sentinel-2 Space Telemetry</CardTitle>
              <CardDescription className="text-xs">
                ESA Copernicus constellation BOA surface reflectance over 10m multispectral bands.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Tracks 36-month canopy vigor through Sentinel-2 Bands 4 &amp; 8 (NDVI) and Band 11 (NDMI) to cross-verify continuous photosynthetic survival from orbit.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">3. Anti-Fraud Vision &amp; EXIF</CardTitle>
              <CardDescription className="text-xs">
                Zero-trust ground auditing with perceptual difference hash (dHash) and GPS fencing.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Rejects screens, indoor houseplants, recycled web images, and silhouetted photos with an automated multi-modal forensic inspection engine.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Allometric Biomass Mathematics */}
        <section className="mb-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              01
            </div>
            <h2 className="font-heading text-2xl font-bold">
              Carbon Accretion Formula &amp; Native Species Calibration
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              For agroforestry and afforestation carbon credits, we implement the globally recognized <strong>Chave et al. (2014) pantropical allometric equation</strong>:
            </p>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 font-mono text-xs sm:text-sm text-emerald-200 overflow-x-auto text-center">
              AGB = 0.0673 × (ρ × D² × H)⁰·⁹⁷⁶
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted-foreground pt-2">
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">AGB</strong>: Above-Ground Dry Biomass (kg)</li>
                <li><strong className="text-foreground">ρ (rho)</strong>: Species-specific wood density (g/cm³)</li>
                <li><strong className="text-foreground">D</strong>: Diameter at Breast Height (DBH in cm at 1.3m)</li>
                <li><strong className="text-foreground">H</strong>: Tree height in meters</li>
              </ul>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">BGB (Roots)</strong>: AGB × 0.25 (Cairns et al. root-to-shoot ratio)</li>
                <li><strong className="text-foreground">Total Carbon</strong>: (AGB + BGB) × 0.47 (IPCC Carbon Fraction)</li>
                <li><strong className="text-foreground">CO₂ Equivalent</strong>: Total Carbon × (44 / 12)</li>
                <li><strong className="text-foreground">Conservative Buffer</strong>: 20% permanence withholding pool</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Certified Maharashtra Wood Densities (ICRAF / FSI Database):
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="font-medium text-foreground block">Neem (Kadunimb)</span>
                  <span className="text-muted-foreground">ρ = 0.72 g/cm³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="font-medium text-foreground block">Teak (Sagwan)</span>
                  <span className="text-muted-foreground">ρ = 0.65 g/cm³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="font-medium text-foreground block">Tamarind (Chinch)</span>
                  <span className="text-muted-foreground">ρ = 0.85 g/cm³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="font-medium text-foreground block">Banyan (Vad)</span>
                  <span className="text-muted-foreground">ρ = 0.58 g/cm³</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Satellite Spectral Indices */}
        <section className="mb-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
              02
            </div>
            <h2 className="font-heading text-2xl font-bold">
              Copernicus Sentinel-2 Telemetry &amp; Canopy Thresholds
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every registered parcel boundary is cross-referenced with ESA Sentinel-2 Bottom-Of-Atmosphere (BOA) surface reflectance tiles refreshed every 5 days:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 space-y-1.5 text-xs">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  NDVI (Normalized Difference Veg. Index)
                </span>
                <p className="font-mono text-emerald-300">NDVI = (Band 8 - Band 4) / (Band 8 + Band 4)</p>
                <p className="text-muted-foreground">Measures active foliar chlorophyll and biomass density.</p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 space-y-1.5 text-xs">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  NDMI (Normalized Difference Moisture Index)
                </span>
                <p className="font-mono text-cyan-300">NDMI = (Band 8 - Band 11) / (Band 8 + Band 11)</p>
                <p className="text-muted-foreground">Detects water stress and drought risk before visual leaf wilting.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border text-xs space-y-2">
              <h4 className="font-semibold text-foreground">Audit Vitality Classification Standards:</h4>
              <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <strong>NDVI &gt; 0.55:</strong> High Canopy Vigor (100% Carbon Accrual)
                </div>
                <div className="p-2 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                  <strong>NDVI 0.35 - 0.55:</strong> Moderate Vigor (75% Accrual)
                </div>
                <div className="p-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <strong>NDVI 0.20 - 0.35:</strong> Severe Stress (Foliar Audit Alert)
                </div>
                <div className="p-2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  <strong>NDVI &lt; 0.20:</strong> Defoliated / Crop Land (0% Accrual)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pilot Partners & Field Proof */}
        <section className="mb-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              03
            </div>
            <h2 className="font-heading text-2xl font-bold">
              Pilot Ecosystem &amp; Institutional Verification Proof
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-base">Sahyadri Devrai Afforestation Partner</CardTitle>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px]">Field Ground Truth Partner</Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Active collaboration with grassroots reforestation initiatives in Maharashtra, planting indigenous climax species across drought-prone and degraded hillsides in Solapur, Pune, and Satara.
                </p>
                <p className="text-foreground font-medium">
                  Verified Pilot Metrics: 10,000+ native saplings surveyed, achieving 84.7% 24-month survival using drip irrigation and mulching.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-base">ACIC Innovation Hub</CardTitle>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px]">Incubation &amp; Technology Partner</Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Incubated at Atal Community Innovation Center (ACIC) supported by AIM, NITI Aayog. Providing research backing, GIS lab infrastructure, and institutional validation for carbon MRV software.
                </p>
                <p className="text-foreground font-medium">
                  Standards Compliance: SEBI Business Responsibility &amp; Sustainability Reporting (BRSR) Core Principle 6.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Leadership & Advisory Team */}
        <section className="mb-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              04
            </div>
            <h2 className="font-heading text-2xl font-bold">
              Core Leadership &amp; Scientific Advisory
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg font-heading">
                SE
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Sunil E.</h3>
                <p className="text-xs text-primary font-medium">Founder &amp; Chief Platform Architect</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Specialist in geospatial telemetry, zero-trust cloud architecture, and verifiable digital environmental registries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="h-14 w-14 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg font-heading">
                AG
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Agroforestry Advisory Council</h3>
                <p className="text-xs text-cyan-400 font-medium">Native Flora &amp; Soil Ecology</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Council of retired forest conservators and agricultural university scientists guiding species suitability and survival protocols.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="h-14 w-14 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-lg font-heading">
                RS
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Remote Sensing &amp; GIS Lab</h3>
                <p className="text-xs text-purple-400 font-medium">Copernicus Telemetry Ingestion</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Engineers focused on Sentinel-2 Level-2A data pipeline automation, cloud masking, and NDVI time-series smoothing.
              </p>
            </div>
          </div>
        </section>

        {/* Call to action for CSR buyers */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-nature-900/60 to-emerald-950/80 border border-emerald-500/30 text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold text-emerald-100">
            Audit Your CSR Plantation With Mathematical Rigor
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl mx-auto">
            Ready to integrate verifiable satellite telemetry, GPS polygon boundaries, and IPCC Tier-2 carbon modeling into your institutional ESG reports?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl gap-2 bg-primary text-primary-foreground">
              <Link to="/contact">
                Schedule Institutional Pilot <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-emerald-500/30 text-emerald-300">
              <Link to="/pricing">Explore Enterprise Plans</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Methodology;
