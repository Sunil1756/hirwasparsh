import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, Building2, ArrowRight, ShieldCheck, MapPin, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";

const PlantChooser = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const drive = searchParams.get("drive");

  // Drive sign-ups always belong to the individual verification flow.
  useEffect(() => {
    if (drive) navigate(`/plant/individual?drive=${drive}`, { replace: true });
  }, [drive, navigate]);

  return (
    <main className="min-h-screen pt-24 pb-20 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-heading font-bold text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
            How are you planting?
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Choose the workflow that matches your plantation. Both paths use AI-assisted
            verification — only the evidence requirements differ.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-2xl p-6 flex flex-col border border-border/40"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <TreePine className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-lg font-semibold">🌱 Individual Tree</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              For planting and verifying single trees with mobile camera.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground flex-1">
              <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> GPS location capture</li>
              <li className="flex gap-2"><TreePine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Before / after photo</li>
              <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> AI passport & badge</li>
            </ul>
            <Link to="/plant/individual" className="mt-5">
              <Button className="w-full h-10 text-xs">
                Plant Individual <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-2xl p-6 flex flex-col border border-primary/40 bg-primary/5 relative overflow-hidden"
          >
            <div className="absolute top-3 right-3">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Module C
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-lg font-semibold">📂 Bulk CSV & Batch QR</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Mass onboarding (1,000+ trees) and printable field QR tag sheets.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground flex-1">
              <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Instant CSV / Excel parser</li>
              <li className="flex gap-2"><TreePine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Printable A4 sticker tags</li>
              <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> High-contrast QR codes</li>
            </ul>
            <Link to="/plant/bulk" className="mt-5">
              <Button className="w-full h-10 text-xs bg-primary font-semibold shadow-md">
                Open Bulk & QR Generator <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-2xl p-6 flex flex-col border border-border/40"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-lg font-semibold">🏢 NGO / CSR Project</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Full enterprise project tracking, satellite monitoring & boundary polygon.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground flex-1">
              <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Map boundary drawing</li>
              <li className="flex gap-2"><Satellite className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Drone & satellite telemetry</li>
              <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Multi-year survival audits</li>
            </ul>
            <Link to="/plant/organization?create=true" className="mt-5">
              <Button variant="outline" className="w-full h-10 text-xs border-primary/40 hover:bg-primary/10">
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
