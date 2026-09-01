import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Award,
  Trees,
  MapPin,
  Satellite,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  Activity,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CertificateVerify() {
  const { serialNo } = useParams<{ serialNo: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Mock / dynamic cert metadata based on serialNo
  const certData = useMemo(() => {
    const s = serialNo || "GE-IND-MH-2026-NAGP-9A4B12";
    return {
      serialNumber: s,
      status: "AUTHENTIC & VERIFIED ✓",
      projectName: "Miyawaki Agroforestry Drive — Phase 1",
      organizationName: "Sahyadri Environmental Trust",
      location: "Nagpur Urban Agro-Zone, Maharashtra, India",
      acres: 4.25,
      targetTrees: 500,
      livingTrees: 478,
      survivalRatePercent: 95.6,
      co2SequesteredMT: 11.8,
      tenYearProjectedCo2MT: 105.2,
      issuedDate: "02 Sep 2026",
      methodology: "IPCC Tier-2 Pantropical Afforestation Standard (Chave et al. / Verra VM0047)",
      satelliteSensor: "ESA Sentinel-2 MSI Multi-Spectral Telemetry",
      meanNdvi: 0.68,
      baselineNdvi: 0.22,
      deltaNdvi: "+0.46",
      hash: `sha256:0x${s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}77c18fa`,
    };
  }, [serialNo]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link Copied! 📋", description: "Public verification link copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to="/plant/organization">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 rounded-xl text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Share Proof"}
          </Button>
        </div>

        {/* Verification Status Banner */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-background to-background space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    Public Certificate Registry
                  </h1>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-semibold">
                    {certData.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Serial ID: <strong className="text-foreground">{certData.serialNumber}</strong>
                </p>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-xs bg-card">
              Hash: {certData.hash.slice(0, 18)}...
            </Badge>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Certified Agroforestry Project</span>
              <h2 className="text-2xl font-heading font-extrabold text-foreground mt-1">
                {certData.projectName}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Executing Body: <strong className="text-foreground">{certData.organizationName}</strong> · Location: {certData.location}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Verified Trees</span>
                <strong className="text-xl font-heading font-bold text-foreground">
                  {certData.livingTrees} Living
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  {certData.survivalRatePercent}% Survival
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/40">
                <span className="text-[11px] text-muted-foreground block">CO₂ Sequestered to Date</span>
                <strong className="text-xl font-heading font-bold text-emerald-600">
                  {certData.co2SequesteredMT} MT
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Verified CO₂e</span>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/40">
                <span className="text-[11px] text-muted-foreground block">10-Year Projected Offset</span>
                <strong className="text-xl font-heading font-bold text-primary">
                  {certData.tenYearProjectedCo2MT} MT
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">IPCC Tier-2</span>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Sentinel-2 NDVI</span>
                <strong className="text-xl font-heading font-bold text-emerald-500">
                  {certData.meanNdvi}
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  Δ {certData.deltaNdvi} vs Baseline
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification Log */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-3 text-xs">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" /> Multi-Tier Verification Log
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <strong>Layer 1: Automated Geospatial & LULC Sanity Check</strong>
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <strong>Layer 2: ESA Sentinel-2 Multi-Spectral Reflectance Audit</strong>
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <strong>Layer 3: 5% Stratified Random Ground Sample Physical Audit</strong>
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
