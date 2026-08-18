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

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-2xl p-7 flex flex-col border border-border/40"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <TreePine className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-xl font-semibold">🌱 Individual Plantation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              For planting and verifying individual trees.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
              <li className="flex gap-2"><MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" /> GPS location capture</li>
              <li className="flex gap-2"><TreePine className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Before / after plantation photo</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Identity / selfie verification</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /> AI verification → Tree ID → growth tracking</li>
            </ul>
            <Link to="/plant/individual" className="mt-6">
              <Button className="w-full h-11">
                Continue as Individual <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="glass-card rounded-2xl p-7 flex flex-col border border-border/40"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-xl font-semibold">🏢 NGO / Organization Plantation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              For NGOs, government departments, colleges, companies and large-scale plantation drives.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
              <li className="flex gap-2"><MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Project boundary on map + target trees</li>
              <li className="flex gap-2"><TreePine className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Bulk plantation data upload (CSV)</li>
              <li className="flex gap-2"><Satellite className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Drone imagery & satellite monitoring</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Sample field verification & survival reports</li>
            </ul>
            <Link to="/plant/organization" className="mt-6">
              <Button variant="outline" className="w-full h-11 border-primary/40">
                Continue as Organization <ArrowRight className="ml-2 h-4 w-4" />
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
