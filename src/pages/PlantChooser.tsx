import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TreePine,
  Building2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Satellite,
  Lock,
  LogIn,
  Award,
  Check,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const PlantChooser = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const drive = searchParams.get("drive");

  // Drive sign-ups always belong to the individual verification flow.
  useEffect(() => {
    if (drive) navigate(`/plant/individual?drive=${drive}`, { replace: true });
  }, [drive, navigate]);

  return (
    <main className="min-h-screen pt-24 pb-20 px-4">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="font-heading font-bold text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
            How are you planting?
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Choose the institutional or personal workflow that matches your plantation. All pathways
            use AI-assisted verification and live Copernicus satellite telemetry.
          </p>
        </motion.div>

        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 mb-8 border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Institutional Account & Session Gate
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Plantation projects, parcel boundaries, and tree telemetry must be saved under an authenticated Supabase account.
                </p>
              </div>
            </div>
            <Link to="/login?redirect=/plant" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs font-bold border-primary/40 hover:bg-primary/10 gap-1.5">
                <LogIn className="h-3.5 w-3.5" /> Log In / Sign Up
              </Button>
            </Link>
          </motion.div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Individual Tree */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-2xl p-5 flex flex-col border border-border/40 justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <TreePine className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-base font-semibold">🌱 Individual Tree</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                For planting and verifying single trees with mobile camera.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> GPS location capture</li>
                <li className="flex gap-2"><TreePine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Before / after photo</li>
                <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> AI passport & badge</li>
              </ul>
            </div>
            <Link to="/plant/individual" className="mt-5">
              <Button className="w-full h-9 text-xs">
                Plant Individual <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 2: Bulk CSV & Batch QR */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-2xl p-5 flex flex-col border border-primary/30 bg-primary/5 relative overflow-hidden justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-3">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-base font-semibold">📂 Bulk CSV & QR</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Mass onboarding (1,000+ trees) and printable field QR tag sheets.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Instant CSV / Excel parser</li>
                <li className="flex gap-2"><TreePine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Printable A4 sticker tags</li>
                <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> High-contrast QR codes</li>
              </ul>
            </div>
            <Link to="/plant/bulk" className="mt-5">
              <Button className="w-full h-9 text-xs bg-primary font-semibold shadow-md">
                Open Bulk & QR <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 3: NGO Reforestation Project */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-2xl p-5 flex flex-col border border-border/40 justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-base font-semibold">🏢 NGO Project</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Full geodetic parcel boundaries, satellite monitoring & field ranger spot audits.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Map boundary drawing</li>
                <li className="flex gap-2"><Satellite className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Sentinel-2 telemetry</li>
                <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Multi-year survival audits</li>
              </ul>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Link to="/plant/organization?create=true">
                <Button variant="outline" className="w-full h-9 text-xs border-primary/40 font-semibold">
                  Launch Project <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/workspace/ngo">
                <Button variant="ghost" className="w-full h-7 text-[11px] text-muted-foreground hover:text-primary">
                  NGO Command Center →
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Card 4: Corporate CSR / B2B MRV Option */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-2xl p-5 flex flex-col border border-emerald-500/40 bg-emerald-500/5 relative overflow-hidden justify-between shadow-md"
          >
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[9px] uppercase font-bold tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                B2B Enterprise
              </span>
            </div>
            <div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-base font-semibold">💼 Corporate CSR / B2B</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Buy institutional project plans, pay & fund CSR afforestation, and get verified audits.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> Buy / Sponsor Projects</li>
                <li className="flex gap-2"><Satellite className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> IPCC Tier-2 Carbon Credit</li>
                <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> SEBI BRSR Core Export</li>
              </ul>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Link to="/plans">
                <Button className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                  Buy Plan & Continue CSR <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/portal/csr">
                <Button variant="ghost" className="w-full h-7 text-[11px] text-muted-foreground hover:text-emerald-600">
                  CSR Intelligence Portal →
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Organizations are never asked for a selfie, before and after photo of every single tree —
          verification is done through bulk data, geotagged field evidence, drone/satellite imagery
          and random sample checks.
        </p>
      </div>
    </main>
  );
};

export default PlantChooser;
