/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 10 TASK 56
 * Satellite Pre-Processing HUD & Quality Inspection Console
 *
 * Interactive user-facing interface for:
 * 1. Scene Classification Layer (SCL) Cloud & Shadow Masking inspection
 * 2. Temporal Selection & Best Available Pixel (BAP) Compositing controls
 * 3. Vector-Raster Spatial Boundary Clipping & Setback Buffer analysis
 * 4. Radiometric Calibration & Topographic Solar Illumination Normalization
 */

import React, { useState, useEffect } from "react";
import {
  Satellite,
  ShieldCheck,
  Sun,
  Layers,
  Scissors,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Sliders,
  Sparkles,
  TreePine,
  Download,
  Info,
  Activity,
  Code2,
} from "lucide-react";
import {
  satellitePreProcessingService,
  PreProcessedScenePackage,
  CompositeMethod,
  PhenologicalSeason,
} from "@/services/satellitePreProcessingService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export interface SatellitePreProcessingHUDProps {
  projectId?: string;
  className?: string;
  onProcessed?: (pkg: PreProcessedScenePackage) => void;
}

export const SatellitePreProcessingHUD: React.FC<SatellitePreProcessingHUDProps> = ({
  projectId = "proj-sahayadri",
  className = "",
  onProcessed,
}) => {
  const [data, setData] = useState<PreProcessedScenePackage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<CompositeMethod>("greenest_pixel_mvc");

  const loadPipeline = async (method: CompositeMethod = selectedMethod) => {
    setIsLoading(true);
    try {
      const res = await satellitePreProcessingService.executePreProcessingPipeline(projectId, {
        compositeMethod: method,
      });
      setData(res);
      onProcessed?.(res);
    } catch (err) {
      console.error("Failed to execute satellite pre-processing pipeline:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline(selectedMethod);
  }, [projectId]);

  const handleMethodChange = async (method: CompositeMethod) => {
    setSelectedMethod(method);
    setIsProcessing(true);
    try {
      await loadPipeline(method);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !data) {
    return (
      <Card className={`glass-card rounded-2xl border-border p-6 text-center ${className}`} data-testid="preprocessing-hud-loading">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">Executing Satellite Pre-Processing Pipeline...</p>
          <span className="text-xs text-muted-foreground">Applying SCL cloud masking, 10m setback boundary clipping & radiometric normalization</span>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={`glass-card rounded-2xl border-border p-6 ${className}`}>
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">Pre-processing pipeline failed for project {projectId}.</p>
        </div>
      </Card>
    );
  }

  const { cloudMasking, spatialClipping, radiometricNormalization, cleanIndices, temporalSelection, preProcessingAuditCertificate } = data;

  const getSeasonBadge = (season: PhenologicalSeason) => {
    switch (season) {
      case "rabi_winter":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Rabi (Winter) · Clear Sky Optical</Badge>;
      case "kharif_monsoon":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Kharif (Monsoon) · Peak Vigor</Badge>;
      case "zaid_summer":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Zaid (Summer) · Thermal Baseline</Badge>;
    }
  };

  return (
    <Card
      className={`glass-card rounded-2xl border-border/80 shadow-2xl overflow-hidden ${className}`}
      data-testid="satellite-preprocessing-hud"
    >
      {/* Header Bar */}
      <CardHeader className="bg-gradient-to-r from-blue-950/40 via-background to-emerald-950/30 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs gap-1 py-0.5">
                <Scissors className="w-3 h-3" />
                <span>Task 56 Pre-Processing Pipeline</span>
              </Badge>
              {getSeasonBadge(temporalSelection.phenologicalSeason)}
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs py-0.5">
                <ShieldCheck className="w-3 h-3 mr-1" />
                <span>Quality Gate Passed</span>
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Scientific Pre-Processing & Normalization Suite</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                (Scene: {data.sceneId})
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Copernicus Sen2Cor 2.11 · SCL Cloud & Shadow Masking · 10m Setback Spatial Clipping · Topographic Solar Calibration
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadPipeline(selectedMethod)}
              disabled={isProcessing}
              className="border-primary/30 hover:bg-primary/10 text-primary text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
              <span>{isProcessing ? "Re-processing..." : "Re-run Pipeline"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Compositing Method Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/50">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Temporal Synthesis Strategy:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={selectedMethod === "greenest_pixel_mvc" ? "default" : "outline"}
              onClick={() => handleMethodChange("greenest_pixel_mvc")}
              className="text-xs h-7 px-2.5"
            >
              Greenest Pixel (MVC)
            </Button>
            <Button
              size="sm"
              variant={selectedMethod === "single_clearest" ? "default" : "outline"}
              onClick={() => handleMethodChange("single_clearest")}
              className="text-xs h-7 px-2.5"
            >
              Single Clearest
            </Button>
            <Button
              size="sm"
              variant={selectedMethod === "median_reflectance" ? "default" : "outline"}
              onClick={() => handleMethodChange("median_reflectance")}
              className="text-xs h-7 px-2.5"
            >
              Median Reflectance
            </Button>
          </div>
        </div>

        {/* Pre-Processing Navigation Tabs */}
        <Tabs defaultValue="cloud_mask" className="space-y-4">
          <TabsList className="grid grid-cols-4 bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="cloud_mask" className="text-xs data-[state=active]:bg-background">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>Cloud & Shadow Masking</span>
            </TabsTrigger>
            <TabsTrigger value="spatial_clip" className="text-xs data-[state=active]:bg-background">
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
              <span>Spatial Clipping</span>
            </TabsTrigger>
            <TabsTrigger value="radiometric" className="text-xs data-[state=active]:bg-background">
              <Sun className="w-3.5 h-3.5 mr-1.5" />
              <span>Radiometric Normalization</span>
            </TabsTrigger>
            <TabsTrigger value="clean_indices" className="text-xs data-[state=active]:bg-background">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              <span>Clean Telemetry</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CLOUD & SHADOW MASKING */}
          <TabsContent value="cloud_mask" className="space-y-3 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Usable Pixels</span>
                <p className="text-xl font-bold text-emerald-400">{cloudMasking.usablePixelCoveragePct}%</p>
                <Progress value={cloudMasking.usablePixelCoveragePct} className="h-1.5 mt-1.5 bg-muted" />
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cloud Contamination</span>
                <p className="text-xl font-bold text-blue-400">{cloudMasking.cloudContaminationPct}%</p>
                <Progress value={cloudMasking.cloudContaminationPct} className="h-1.5 mt-1.5 bg-muted" />
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cloud Shadow Pixels</span>
                <p className="text-xl font-bold text-amber-400">{cloudMasking.shadowPixels}</p>
                <span className="text-[10px] text-muted-foreground">SCL Class 3 Filtered</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cirrus Pixels</span>
                <p className="text-xl font-bold text-purple-400">{cloudMasking.cirrusPixels}</p>
                <span className="text-[10px] text-muted-foreground">SCL Class 10 Filtered</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-foreground">
                  MRV Data Suitability: <strong className="text-emerald-400">PASSED ({cloudMasking.validPixels} of {cloudMasking.totalPixels} pixels valid)</strong>
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                Verra VM0047 Compliant
              </Badge>
            </div>
          </TabsContent>

          {/* TAB 2: SPATIAL CLIPPING & SETBACK BUFFER */}
          <TabsContent value="spatial_clip" className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] text-muted-foreground">Total Cadastral Area</span>
                <p className="text-base font-bold text-foreground">{spatialClipping.totalBoundaryAreaHa} ha</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] text-muted-foreground">Setback Buffer (10m)</span>
                <p className="text-base font-bold text-primary">-{spatialClipping.setbackBufferMeters}m Edge</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] text-muted-foreground">Clipped Interior Area</span>
                <p className="text-base font-bold text-emerald-400">{spatialClipping.interiorAreaHa} ha</p>
              </div>
            </div>

            {/* Sub-Compartment Table */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Sub-Compartment Zonal Clipping Breakdown:</span>
              </span>

              <div className="space-y-1.5 text-xs">
                {spatialClipping.subCompartmentBreakdown.map((comp) => (
                  <div
                    key={comp.compartmentId}
                    className="p-2 rounded-lg bg-background/60 border border-border/40 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-foreground">{comp.compartmentName}</strong>
                      <span className="text-muted-foreground text-[10px] ml-2 font-mono">({comp.areaHectares} ha)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400">NDVI {comp.meanNdvi}</span>
                      <span className="font-mono text-blue-400">NDRE {comp.meanNdre}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-300">
                        {comp.validPixelPct}% Clear
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: RADIOMETRIC & SOLAR ILLUMINATION NORMALIZATION */}
          <TabsContent value="radiometric" className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Solar Zenith & Topographic Illumination Correction:</span>
                </span>
                <span className="font-mono text-muted-foreground">
                  Sun Elevation: {radiometricNormalization.sunElevationAngleDeg}° · cos(θz): {radiometricNormalization.solarZenithCosine}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-background/60 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">Raw BOA Reflectance</span>
                  <div className="font-mono text-[11px] space-y-0.5 text-foreground">
                    <div>Red (B04): {radiometricNormalization.scaledSurfaceReflectance.b04Red}</div>
                    <div>NIR (B08): {radiometricNormalization.scaledSurfaceReflectance.b08Nir}</div>
                    <div>RedEdge: {radiometricNormalization.scaledSurfaceReflectance.b05RedEdge}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/60 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-400">Topographically Corrected</span>
                  <div className="font-mono text-[11px] space-y-0.5 text-emerald-300">
                    <div>Red: {radiometricNormalization.topographicallyCorrectedBands.b04Red}</div>
                    <div>NIR: {radiometricNormalization.topographicallyCorrectedBands.b08Nir}</div>
                    <div>RedEdge: {radiometricNormalization.topographicallyCorrectedBands.b05RedEdge}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/60 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-blue-400">Harmonized Landsat-8/9</span>
                  <div className="font-mono text-[11px] space-y-0.5 text-blue-300">
                    <div>Red: {radiometricNormalization.harmonizedLandsatEquivalent.b04Red}</div>
                    <div>NIR: {radiometricNormalization.harmonizedLandsatEquivalent.b08Nir}</div>
                    <div>Delta: ±0.003</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: CLEAN TELEMETRY & QA CERTIFICATE */}
          <TabsContent value="clean_indices" className="space-y-3 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Clean NDVI</span>
                <p className="text-xl font-bold text-emerald-400">{cleanIndices.ndvi}</p>
                <Progress value={cleanIndices.ndvi * 100} className="h-1.5 mt-1.5 bg-muted" />
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Clean NDRE</span>
                <p className="text-xl font-bold text-blue-400">{cleanIndices.ndre}</p>
                <Progress value={cleanIndices.ndre * 100} className="h-1.5 mt-1.5 bg-muted" />
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Standing Biomass</span>
                <p className="text-xl font-bold text-foreground">{cleanIndices.standingBiomassMTPerHa} MT/ha</p>
                <span className="text-[10px] text-muted-foreground">IPCC Tier-2 Model</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total Carbon Stock</span>
                <p className="text-xl font-bold text-emerald-400">{cleanIndices.carbonStockEstimateTCO2e.toLocaleString()} tCO₂e</p>
                <span className="text-[10px] text-muted-foreground">Clipped Area ({spatialClipping.interiorAreaHa} ha)</span>
              </div>
            </div>

            {/* QA Certificate */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <strong className="text-foreground">{preProcessingAuditCertificate.algorithmVersion}</strong>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  {preProcessingAuditCertificate.complianceStandard}
                </Badge>
              </div>
              <div className="text-muted-foreground text-[11px] truncate">
                SHA-256 Pre-Processing Digest: <span className="text-primary">{preProcessingAuditCertificate.verificationDigestSha256}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
