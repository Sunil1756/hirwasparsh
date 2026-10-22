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
    <main className="min-h-screen pt-20 pb-16 px-4">
      <div className="mx-auto w-full max-w-5xl">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 mb-6 border border-border/40 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-muted/80 text-foreground shrink-0">
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
              <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs font-bold border-border/60 hover:bg-muted/50 gap-1.5 shadow-sm">
                <LogIn className="h-3.5 w-3.5" /> Log In / Sign Up
              </Button>
            </Link>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Individual Tree */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-3xl p-6 flex flex-col border border-border/50 bg-card/70 justify-between shadow-sm"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-foreground mb-4">
                <TreePine className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                🌱 Individual Tree
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                For planting and verifying single trees with mobile camera.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>GPS location capture</span>
                </li>
                <li className="flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Before / after photo</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>AI passport & badge</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/individual" className="mt-6">
              <Button className="w-full h-11 rounded-2xl text-xs font-semibold bg-[#1b4332] hover:bg-[#2d6a4f] text-white shadow-sm">
                Plant Individual <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 2: Bulk CSV & Batch QR */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-3xl p-6 flex flex-col border border-border/50 bg-card/70 relative overflow-hidden justify-between shadow-sm"
          >
            <div className="absolute top-4 right-4">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-900 text-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                MODULE C
              </span>
            </div>
            <div>
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-foreground mb-4">
                <Printer className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                📁 Bulk CSV & Batch QR
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Mass onboarding (1,000+ trees) and printable field QR tag sheets.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Instant CSV / Excel parser</span>
                </li>
                <li className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Printable A4 sticker tags</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>High-contrast QR codes</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/bulk" className="mt-6">
              <Button className="w-full h-11 rounded-2xl text-xs bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-semibold shadow-sm">
                Open Bulk & QR Generator <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          {/* Card 3: NGO / CSR Project */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-3xl p-6 flex flex-col border border-border/50 bg-card/70 justify-between shadow-sm"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-foreground mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                🏢 NGO / CSR Project
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Full enterprise project tracking, satellite monitoring & boundary polygon.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Map boundary drawing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Drone & satellite telemetry</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Multi-year survival audits</span>
                </li>
              </ul>
            </div>
            <Link to="/plant/organization" className="mt-6">
              <Button className="w-full h-11 rounded-2xl text-xs font-bold bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] shadow-sm">
                Continue as NGO/CSR <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
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
