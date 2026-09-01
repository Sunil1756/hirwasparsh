import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Award,
  ShieldCheck,
  Download,
  Share2,
  Check,
  Printer,
  Sparkles,
  TreePine,
  ExternalLink,
  Layers,
  Bot,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CarbonAuditResult } from "@/lib/carbonLedger";

interface Props {
  cert: CarbonAuditResult;
  triggerButton?: React.ReactNode;
}

export const CarbonCertificateModal = ({ cert, triggerButton }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyCertLink = () => {
    navigator.clipboard.writeText(cert.qrVerificationUrl);
    setCopied(true);
    toast({
      title: "Verification Link Copied! 📋",
      description: `Public URL for Serial No: ${cert.serialNumber} copied.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="rounded-xl font-bold gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
            <Award className="h-4 w-4" /> View ESG Carbon Certificate
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-background shadow-2xl">
        {/* Certificate Frame */}
        <div className="p-6 sm:p-10 space-y-6 relative bg-gradient-to-b from-emerald-500/5 via-background to-background print:p-0 print:border-none">
          {/* Top Actions (hidden in print) */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4 print:hidden">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                Serial No: {cert.serialNumber}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Verified Active ✓
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyCertLink}
                className="h-8 text-xs rounded-xl gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Link Copied" : "Share Verification Link"}
              </Button>
              <Button
                size="sm"
                onClick={handlePrintCertificate}
                className="h-8 text-xs rounded-xl gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF Certificate
              </Button>
            </div>
          </div>

          {/* Institutional Certificate Canvas */}
          <div className="rounded-2xl border-4 border-double border-emerald-600/40 p-8 sm:p-12 text-center space-y-6 bg-card relative shadow-inner overflow-hidden">
            {/* Background Seal Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Award className="h-96 w-96 text-emerald-600" />
            </div>

            {/* Certificate Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" /> Green Enlightenment Carbon Registry
              </div>
              <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                CERTIFICATE OF CARBON SEQUESTRATION
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
                Issued under the International IPCC Tier-2 Pantropical Afforestation & Agroforestry Standard.
              </p>
            </div>

            {/* Dedication Text */}
            <div className="space-y-2 text-sm text-foreground max-w-2xl mx-auto">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                This certifies that the agroforestry project
              </p>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-emerald-600">
                "{cert.projectName}"
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Executed by <strong>{cert.organizationName}</strong> across <strong>{cert.acres} Acres</strong> of verified land tract, has completed Sentinel-2 multi-spectral remote sensing verification and 5% ground-truth sampling.
              </p>
            </div>

            {/* Key Certified Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Verified Living Trees</span>
                <strong className="text-lg sm:text-xl font-heading font-bold text-foreground">
                  {cert.totalLivingTrees.toLocaleString()}
                </strong>
                <span className="text-[10px] text-muted-foreground block">{cert.dominantSpecies}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Sequestration to Date</span>
                <strong className="text-lg sm:text-xl font-heading font-bold text-emerald-600">
                  {cert.co2SequesteredToDateMT} MT
                </strong>
                <span className="text-[10px] text-muted-foreground block">Verified CO₂e</span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">10-Year Projected Offset</span>
                <strong className="text-lg sm:text-xl font-heading font-bold text-primary">
                  {cert.projected10YearCo2MT} MT
                </strong>
                <span className="text-[10px] text-muted-foreground block">Net Removal</span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Carbon Valuation</span>
                <strong className="text-lg sm:text-xl font-heading font-bold text-foreground">
                  ₹{cert.estimatedCarbonValuationInr.toLocaleString()}
                </strong>
                <span className="text-[10px] text-muted-foreground block">@ ₹1,200/MT</span>
              </div>
            </div>

            {/* Signatures & Live QR Code */}
            <div className="flex flex-wrap items-end justify-between gap-6 pt-4 border-t border-border/40 text-left">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Certificate Serial: <strong className="text-foreground">{cert.serialNumber}</strong>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Cryptographic Hash: <span className="font-mono text-[9px]">{cert.cryptographicHash}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Issued On: <strong>{cert.issuedDate}</strong> · Standard: <strong>IPCC Tier-2 Pantropical</strong>
                </p>
              </div>

              {/* QR Code */}
              <div className="flex items-center gap-3 bg-background p-2.5 rounded-xl border border-border/40">
                <QRCodeSVG
                  value={cert.qrVerificationUrl}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
                <div className="text-[10px] space-y-0.5">
                  <span className="font-bold block text-foreground flex items-center gap-1">
                    <QrCode className="h-3 w-3 text-emerald-600" /> Scan to Verify
                  </span>
                  <p className="text-muted-foreground text-[9px] max-w-[120px]">
                    Instant on-chain & satellite verification proof.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
