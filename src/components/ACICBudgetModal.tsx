import { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ACICBudgetModal({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const pdfUrl = "/Green_Enlightenment_ACIC_Budget_Proposal.pdf";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "Green_Enlightenment_ACIC_Budget_Proposal.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.open(pdfUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 rounded-xl text-xs font-semibold border-primary/30 hover:bg-primary/10 ${className}`}
        >
          <FileText className="h-4 w-4 text-primary" />
          <span>📄 ACIC Funding Budget (PDF)</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-primary" /> Green Enlightenment: ACIC Funding Proposal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Top Banner */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-1">
                Atal Community Innovation Centre (ACIC / NITI Aayog)
              </Badge>
              <h4 className="font-heading font-bold text-base text-foreground">
                12-Month Seed & Deployment Ask: ₹25,00,000
              </h4>
              <p className="text-[11px] text-muted-foreground">
                AI & Sentinel-2 Satellite Multi-Spectral Agroforestry MRV Platform
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleDownload} className="gap-1.5 font-semibold shadow-md">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-background/60 border">
              <div className="text-[10px] text-muted-foreground">Tech & AI Cloud</div>
              <div className="font-bold text-sm text-foreground">₹7,20,000</div>
              <div className="text-[10px] text-primary">28.8%</div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border">
              <div className="text-[10px] text-muted-foreground">Field Pilots & QR Tags</div>
              <div className="font-bold text-sm text-foreground">₹6,00,000</div>
              <div className="text-[10px] text-primary">24.0%</div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border">
              <div className="text-[10px] text-muted-foreground">Core Tech Talent</div>
              <div className="font-bold text-sm text-foreground">₹7,80,000</div>
              <div className="text-[10px] text-primary">31.2%</div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border">
              <div className="text-[10px] text-muted-foreground">Carbon MRV & IP</div>
              <div className="font-bold text-sm text-foreground">₹2,20,000</div>
              <div className="text-[10px] text-primary">8.8%</div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border">
              <div className="text-[10px] text-muted-foreground">Farmer Outreach & Buffer</div>
              <div className="font-bold text-sm text-foreground">₹1,80,000</div>
              <div className="text-[10px] text-primary">7.2%</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] text-muted-foreground">Year 1 Target</div>
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">50,000 Trees</div>
              <div className="text-[10px] text-muted-foreground">&gt;90% Survival</div>
            </div>
          </div>

          {/* PDF Viewer / Direct Action */}
          <div className="p-4 rounded-xl bg-background/50 border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Official Proposal Document</span>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Open in full tab</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              The generated official PDF includes the 2-page detailed budget, macro & micro line-item
              justifications, unit economics, commercial monetization path, and alignment with ACIC / NITI
              Aayog sustainability goals.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handleDownload} className="gap-2 font-semibold">
                <Download className="h-3.5 w-3.5" /> Download Official PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
