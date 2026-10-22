import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TreePine,
  Building2,
  Printer,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Satellite,
  Lock,
  LogIn,
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
    <main className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 sm:p-5 mb-8 border border-border/50 bg-card/75 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-2.5 rounded-xl bg-muted/80 text-foreground shrink-0">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Institutional Account & Session Gate
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Plantation projects, parcel boundaries, and tree telemetry must be saved under an authenticated Supabase account.
                </p>
              </div>
            </div>
            <Link to="/login?redirect=/plant" className="shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto h-9 sm:h-10 px-4 text-xs font-bold border-border/70 hover:bg-muted/60 gap-1.5 shadow-sm rounded-xl"
              >
                <LogIn className="h-3.5 w-3.5" /> Log In / Sign Up
              </Button>
            </Link>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {/* Card 1: Individual Tree */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-[28px] p-7 sm:p-8 flex flex-col border border-border/50 bg-card/80 backdrop-blur-sm justify-between shadow-md min-h-[460px] lg:min-h-[480px]"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-muted/70 flex items-center justify-center text-foreground mb-5 shadow-xs">
                <TreePine className="h-7 w-7 stroke-[1.75]" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                🌱 Individual Tree
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                For planting and verifying single trees with mobile camera.
              </p>
              <ul className="mt-6 space-y-3.5 text-sm text-foreground/85 flex-1">
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>GPS location capture</span>
                </li>
                <li className="flex items-center gap-3">
                  <TreePine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Before / after photo</span>
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>AI passport & badge</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/individual" className="mt-8">
              <Button className="w-full h-12 rounded-2xl text-sm font-semibold bg-[#1b4332] hover:bg-[#2d6a4f] text-white shadow-sm transition-all duration-200">
                Plant Individual <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 2: Bulk CSV & Batch QR */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-[28px] p-7 sm:p-8 flex flex-col border border-border/50 bg-card/80 backdrop-blur-sm relative overflow-hidden justify-between shadow-md min-h-[460px] lg:min-h-[480px]"
          >
            <div className="absolute top-5 right-5">
              <span className="text-[11px] uppercase font-bold tracking-wider bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1 rounded-full shadow-xs">
                MODULE C
              </span>
            </div>
            <div>
              <div className="h-14 w-14 rounded-2xl bg-muted/70 flex items-center justify-center text-foreground mb-5 shadow-xs">
                <Printer className="h-7 w-7 stroke-[1.75]" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                📁 Bulk CSV & Batch QR
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Mass onboarding (1,000+ trees) and printable field QR tag sheets.
              </p>
              <ul className="mt-6 space-y-3.5 text-sm text-foreground/85 flex-1">
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Instant CSV / Excel parser</span>
                </li>
                <li className="flex items-center gap-3">
                  <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Printable A4 sticker tags</span>
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>High-contrast QR codes</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/bulk" className="mt-8">
              <Button className="w-full h-12 rounded-2xl text-sm bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-semibold shadow-sm transition-all duration-200">
                Open Bulk & QR Generator <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 3: NGO / CSR Project */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-[28px] p-7 sm:p-8 flex flex-col border border-border/50 bg-card/80 backdrop-blur-sm justify-between shadow-md min-h-[460px] lg:min-h-[480px]"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-muted/70 flex items-center justify-center text-foreground mb-5 shadow-xs">
                <Building2 className="h-7 w-7 stroke-[1.75]" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                🏢 NGO / CSR Project
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Full enterprise project tracking, satellite monitoring & boundary polygon.
              </p>
              <ul className="mt-6 space-y-3.5 text-sm text-foreground/85 flex-1">
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Map boundary drawing</span>
                </li>
                <li className="flex items-center gap-3">
                  <Satellite className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Drone & satellite telemetry</span>
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Multi-year survival audits</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/organization" className="mt-8">
              <Button className="w-full h-12 rounded-2xl text-sm font-bold bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0f172a] shadow-sm transition-all duration-200">
                Continue as NGO/CSR <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-10 max-w-4xl mx-auto leading-relaxed">
          Organizations are never asked for a selfie, before and after photo of every single tree —
          verification is done through bulk data, geotagged field evidence, drone/satellite imagery
          and random sample checks.
        </p>
      </div>
    </main>
  );
};

export default PlantChooser;
