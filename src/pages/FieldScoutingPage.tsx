import { motion } from "framer-motion";
import { ShieldAlert, MapPin, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldScoutingModule } from "@/components/FieldScoutingModule";

export default function FieldScoutingPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-rose-500/10 rounded-2xl text-rose-500">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold">
                Module B: Field Scouting & Anomaly Matrix
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Geotagged ground truth observations, pest & disease detection, drought alerts, and field task dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/tree-map">
              <Button variant="outline" className="rounded-xl gap-2 text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4" /> Back to Tree Map
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Module B Component */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <FieldScoutingModule />
        </motion.div>
      </div>
    </div>
  );
}
