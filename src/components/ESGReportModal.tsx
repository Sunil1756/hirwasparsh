import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download, Award, Trees, CheckCircle2, QrCode, AlertTriangle, Building2, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  totalTrees?: number;
  verifiedTrees?: number;
  projectName?: string;
  organizationName?: string;
  location?: string;
  co2OffsetKg?: number;
  projectedCo2OffsetKg?: number;
  confidenceScore?: number;
  verificationTier?: string;
}

export function ESGReportModal({
  totalTrees = 100,
  verifiedTrees = 0,
  projectName = "Agroforestry Plantation",
  organizationName = "Institutional Afforestation Initiative",
  location = "Maharashtra, India",
  co2OffsetKg = 0,
  projectedCo2OffsetKg = 0,
  confidenceScore = 0,
  verificationTier = "unverified_demo",
}: Props) {
  const [open, setOpen] = useState(false);
  const survivalRate = totalTrees > 0 ? Math.round((verifiedTrees / totalTrees) * 100) : 0;
  const verifiedCo2MT = (co2OffsetKg / 1000).toFixed(2);
  const projectedCo2MT = ((projectedCo2OffsetKg || totalTrees * 22) / 1000).toFixed(2);
  const certificateId = `ESG-GE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const isVerified = verifiedTrees > 0 || (confidenceScore >= 50 && verificationTier !== "unverified_demo");

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl flex items-center gap-2 border-primary/30">
          <Award className="h-4 w-4 text-primary" />
          Generate ESG & Carbon Certificate
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Award className="h-6 w-6 text-primary" />
            Verified ESG Tree Plantation Certificate
          </DialogTitle>
          <DialogDescription className="sr-only">
            Verified ESG carbon sequestration and tree plantation certificate preview and export
          </DialogDescription>
        </DialogHeader>

        {/* Certificate Printable Canvas */}
        <div id="esg-certificate" className="p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 space-y-4">
          <div className="flex items-center justify-between border-b border-primary/20 pb-4">
            <div>
              <div className="font-heading text-xl font-bold text-primary">GREEN ENLIGHTENMENT</div>
              <div className="text-xs text-muted-foreground">Certified Geo-Spatial Carbon Sequestration Audit</div>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-primary/30">
              {certificateId}
            </Badge>
          </div>

          <div className="text-center py-2 space-y-1.5">
            <div className="text-xs text-muted-foreground uppercase tracking-widest">This certifies that</div>
            <div className="font-heading text-2xl font-bold text-foreground">
              {organizationName}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Trees className="h-3.5 w-3.5" /> Project: {projectName} · <MapPin className="h-3 w-3" /> {location}
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto pt-1">
              has registered a large-scale afforestation drive of <strong className="text-foreground">{totalTrees.toLocaleString()} trees</strong> under continuous Copernicus Sentinel-2 remote sensing monitoring.
            </p>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-background/80 border border-primary/15 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Verified Trees</div>
              <div className="font-heading text-lg font-bold text-primary">{verifiedTrees.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{totalTrees.toLocaleString()} Planted in Project</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Survival Rate</div>
              <div className={`font-heading text-lg font-bold ${verifiedTrees > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {verifiedTrees > 0 ? `${survivalRate}%` : "0%"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {verifiedTrees > 0 ? "Satellite & AI Verified" : "Awaiting Field Audit"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Annual CO₂ Offset</div>
              <div className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {verifiedCo2MT} MT
              </div>
              <div className="text-[10px] text-muted-foreground">
                Projected: {projectedCo2MT} MT/yr
              </div>
            </div>
          </div>

          {/* Verification Protocol Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground border-t border-primary/10">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ESA Sentinel-2 Space-Borne Monitoring
            </div>
            <div className={`flex items-center gap-1 ${isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {isVerified ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ground Truth Sample Audits Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Awaiting Ground Truth Sample Checks
                </>
              )}
            </div>
            <div className="text-[10px]">Date: {new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Download className="h-4 w-4" /> Download / Print PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
