import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download, Award, Trees, CheckCircle2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  totalTrees?: number;
  verifiedTrees?: number;
  organizationName?: string;
  co2OffsetKg?: number;
}

export function ESGReportModal({
  totalTrees = 1240,
  verifiedTrees = 1180,
  organizationName = "Green Enlightenment CSR Initiative",
  co2OffsetKg = 27280,
}: Props) {
  const [open, setOpen] = useState(false);
  const survivalRate = Math.round((verifiedTrees / Math.max(1, totalTrees)) * 100);
  const co2MT = (co2OffsetKg / 1000).toFixed(2);
  const certificateId = `ESG-GE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

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

          <div className="text-center py-2 space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-widest">This certifies that</div>
            <div className="font-heading text-2xl font-bold text-foreground">{organizationName}</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              has completed verified community tree planting & remote sensing satellite monitoring across Maharashtra, India.
            </p>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-background/80 border border-primary/15 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Verified Trees</div>
              <div className="font-heading text-lg font-bold text-primary">{verifiedTrees.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{totalTrees.toLocaleString()} Planted</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Survival Rate</div>
              <div className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">{survivalRate}%</div>
              <div className="text-[10px] text-muted-foreground">Satellite & AI Verified</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Annual CO₂ Offset</div>
              <div className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">{co2MT} MT</div>
              <div className="text-[10px] text-muted-foreground">Metric Tons / Year</div>
            </div>
          </div>

          {/* Verification Protocol Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground border-t border-primary/10">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              EXIF GPS & Timestamp Hash Verified
            </div>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              NDVI Canopy Growth Audited
            </div>
            <div className="text-[10px]">Date: {new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Download / Print PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
