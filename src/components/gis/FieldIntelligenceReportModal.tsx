import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, ShieldCheck, Satellite, Trees, FileText, CheckCircle2, Globe, Calendar, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

interface FieldIntelligenceReportProps {
  isOpen: boolean;
  onClose: () => void;
  parcelData: {
    name: string;
    district: string;
    coordinates: [number, number];
    areaHectares: number;
    areaAcres: number;
    treeCount: number;
    species: string[];
    acquisitionDate: string;
    tileId: string;
    cloudCoverPct: number;
    ndvi: number;
    ndre: number;
    ndwi: number;
    evi: number;
    savi: number;
    biomassTonsPerHa: number;
    carbonOffsetTons: number;
  };
}

export function FieldIntelligenceReportModal({
  isOpen,
  onClose,
  parcelData,
}: FieldIntelligenceReportProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-background border border-border print:border-none print:shadow-none print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-primary" />
            <span>Field Intelligence &amp; Carbon Audit Report</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Institutional verification dossier formatted for CSR sponsors, agricultural banks, and carbon registries.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Report Paper */}
        <div className="space-y-6 pt-2 print:p-8 print:text-black">
          {/* Header Strip */}
          <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Green Enlightenment" className="h-12 w-12 rounded-xl object-contain bg-emerald-950 p-1" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground print:text-black">Green Enlightenment</h2>
                <p className="text-xs text-muted-foreground print:text-slate-600 font-mono">
                  Autonomous Agroforestry MRV • Copernicus Sentinel-2 Telemetry
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] mb-1">
                VERIFIED AUDIT DOSSIER
              </Badge>
              <div className="text-muted-foreground print:text-slate-600 text-[11px]">
                Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* Section 1: Parcel Geodetic Identity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Plot Name</span>
              <span className="font-bold text-foreground print:text-black">{parcelData.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Location</span>
              <span className="font-bold text-foreground print:text-black">{parcelData.district}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Geodetic Center</span>
              <span className="font-mono text-foreground print:text-black">
                {parcelData.coordinates[0].toFixed(5)}°N, {parcelData.coordinates[1].toFixed(5)}°E
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Parcel Area</span>
              <span className="font-bold text-foreground print:text-black">
                {parcelData.areaAcres} Acres ({parcelData.areaHectares} Ha)
              </span>
            </div>
          </div>

          {/* Section 2: Spaceborne Observation Metadata */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <Satellite className="h-4 w-4" /> 1. Copernicus Sentinel-2 MSI Telemetry
            </h4>
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl border border-border/60 bg-card text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] block">Overpass Date</span>
                <span className="font-mono font-bold text-foreground print:text-black">{parcelData.acquisitionDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">ESA MGRS Tile ID</span>
                <span className="font-mono font-bold text-foreground print:text-black">{parcelData.tileId}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Scene Cloud Cover</span>
                <span className="font-mono font-bold text-emerald-600">{parcelData.cloudCoverPct}% (Clear Sky)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Multi-Spectral Spectral Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> 2. Multi-Spectral Remote Sensing Matrix
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-muted-foreground block">NDVI</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">{parcelData.ndvi.toFixed(2)}</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Canopy Vigor</span>
              </div>
              <div className="p-2 rounded-lg bg-lime-500/10 border border-lime-500/30">
                <span className="text-[10px] text-muted-foreground block">NDRE</span>
                <span className="font-mono font-extrabold text-lime-600 text-sm">{parcelData.ndre.toFixed(2)}</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Chlorophyll</span>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30">
                <span className="text-[10px] text-muted-foreground block">NDWI</span>
                <span className="font-mono font-extrabold text-sky-600 text-sm">
                  {parcelData.ndwi > 0 ? `+${parcelData.ndwi.toFixed(2)}` : parcelData.ndwi.toFixed(2)}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Hydration</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-muted-foreground block">EVI</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">{parcelData.evi.toFixed(2)}</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Atmo-Corrected</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] text-muted-foreground block">SAVI</span>
                <span className="font-mono font-extrabold text-amber-600 text-sm">{parcelData.savi.toFixed(2)}</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Soil-Adjusted</span>
              </div>
            </div>
          </div>

          {/* Section 4: IPCC Tier-2 Carbon & ESG Accounting */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <Trees className="h-4 w-4" /> 3. IPCC Tier-2 Allometric Carbon Accounting
            </h4>
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Allometric Biomass Density:</span>
                <span className="font-mono font-bold text-foreground">{parcelData.biomassTonsPerHa} MT / Hectare</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Standing Carbon Sequestration Stock:</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">{parcelData.carbonOffsetTons} MT CO₂e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target / Census Sapling Count:</span>
                <span className="font-mono font-bold text-foreground">{parcelData.treeCount} Native Trees</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Key Indigenous Species:</span>
                <span className="font-medium text-foreground">{parcelData.species.slice(0, 4).join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Footer Sign-off */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <div>
              <span>Verification Standards: <strong>IPCC AFOLU Tier-2 • Verra VM0047 • SEBI BRSR Core</strong></span>
            </div>
            <div className="text-right">
              <span>Green Enlightenment Telemetry Engine • ACIC Ecosystem</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-row justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
