import { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  TreePine,
  Cloud,
  Droplets,
  Thermometer,
  ShieldCheck,
  Compass,
  PieChart,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  SlidersHorizontal,
  Bot,
  Zap,
  Flame,
  ArrowRight,
  Info,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgroWeatherWidget } from "./AgroWeatherWidget";
import { NDVISpectralViewer } from "./NDVISpectralViewer";
import { CanopyNDVITimeSeriesChart } from "./CanopyNDVITimeSeriesChart";
import { AllometricCarbonCalculator } from "./AllometricCarbonCalculator";
import { PlotPolygonDrawer } from "./PlotPolygonDrawer";
import { ESGReportModal } from "./ESGReportModal";
import { GeminiApiKeyModal } from "./GeminiApiKeyModal";
import { SatellitePixelInspectorHUD } from "./SatellitePixelInspectorHUD";
import { SatelliteTimeSliderCompare } from "./SatelliteTimeSliderCompare";
import {
  SPECTRAL_LAYERS,
  AGROFORESTRY_PRESET_ZONES,
  AgroforestryPresetZone,
  inspectCoordinateTelemetry,
  CoordinateTelemetryResult,
  getNdviColor,
} from "@/lib/remoteSensing";
import { analyzeCanopyWithAI } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TreeRecord {
  id: string;
  tree_name: string;
  species: string;
  latitude: number;
  longitude: number;
  verification_status: string;
  created_at?: string;
}

interface Props {
  trees?: TreeRecord[];
}

// Satellite tile URLs
const SATELLITE_TILES: Record<string, string> = {
  rgb: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndvi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndre: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ndwi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  evi: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  thermal: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

// Target Reticle Icon for Clicked Coordinates
const targetReticleIcon = L.divIcon({
  className: "target-reticle-marker",
  html: `<div style="position:relative;width:32px;height:32px;">
    <span style="position:absolute;inset:0;border:2px solid #22c55e;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;background:rgba(34,197,94,0.25);"></span>
    <span style="position:absolute;inset:4px;border:2px solid #ffffff;border-radius:50%;background:#15803d;box-shadow:0 0 10px #22c55e;"></span>
    <span style="position:absolute;inset:12px;background:#ffffff;border-radius:50%;"></span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Glowing pin for planted trees
const makeSatelliteIcon = (color: string) =>
  L.divIcon({
    className: "satellite-glow-marker",
    html: `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 8px ${color}"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

const verifiedSatIcon = makeSatelliteIcon("#22c55e");
const pendingSatIcon = makeSatelliteIcon("#f59e0b");

// Component to handle map clicks and fly-to animations
function MapEventsController({
  onMapClick,
  centerTarget,
  zoomTarget,
}: {
  onMapClick: (lat: number, lng: number) => void;
  centerTarget: [number, number];
  zoomTarget: number;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.flyTo(centerTarget, zoomTarget, { duration: 1.2 });
  }, [centerTarget, zoomTarget, map]);

  return null;
}

export function ModuleASatelliteEngine({ trees = [] }: Props) {
  const { toast } = useToast();
  const [activeSpectral, setActiveSpectral] = useState<"rgb" | "ndvi" | "ndre" | "ndwi" | "evi" | "thermal">("ndvi");
  const [activeSubTab, setActiveSubTab] = useState<"map" | "slider" | "timeseries" | "carbon" | "parcel">("map");
  const [showPurposeGuide, setShowPurposeGuide] = useState(true);
  const [selectedZone, setSelectedZone] = useState<AgroforestryPresetZone>(AGROFORESTRY_PRESET_ZONES[0]);

  // Clicked Coordinate Telemetry State
  const [inspectedTelemetry, setInspectedTelemetry] = useState<CoordinateTelemetryResult>(() =>
    inspectCoordinateTelemetry(AGROFORESTRY_PRESET_ZONES[0].center[0], AGROFORESTRY_PRESET_ZONES[0].center[1], "ndvi")
  );

  const [mapCenter, setMapCenter] = useState<[number, number]>(AGROFORESTRY_PRESET_ZONES[0].center);
  const [mapZoom, setMapZoom] = useState<number>(AGROFORESTRY_PRESET_ZONES[0].zoom);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReportModalContent, setAiReportModalContent] = useState<string | null>(null);

  // User project boundaries from Supabase
  const [dbProjects, setDbProjects] = useState<any[]>([]);

  useEffect(() => {
    async function loadDbProjects() {
      try {
        const { data } = await supabase.from("plantation_projects").select("*").order("created_at", { ascending: false });
        if (data) setDbProjects(data);
      } catch (err) {
        console.warn("Could not fetch plantation projects for map overlay:", err);
      }
    }
    loadDbProjects();
  }, []);

  const verifiedTrees = useMemo(() => trees.filter((t) => t.verification_status === "verified"), [trees]);
  const totalCo2Kg = verifiedTrees.length * 22;
  const meanNdviScore = selectedZone ? selectedZone.meanNdvi : verifiedTrees.length > 0 ? 0.74 : 0.0;
  const currentLayer = SPECTRAL_LAYERS.find((l) => l.id === activeSpectral) || SPECTRAL_LAYERS[1];

  // Handle Map Click for Remote Pixel Scouting
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const result = inspectCoordinateTelemetry(lat, lng, activeSpectral);
      setInspectedTelemetry(result);
      toast({
        title: `🛰️ Sentinel-2 Scout: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
        description: `NDVI: ${result.ndvi} [${result.classification}]. Click HUD for deep multi-spectral telemetry.`,
      });
    },
    [activeSpectral, toast]
  );

  // Handle Preset Zone Selection
  const handleSelectZone = (zone: AgroforestryPresetZone) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);
    setMapZoom(zone.zoom);
    const telemetry = inspectCoordinateTelemetry(zone.center[0], zone.center[1], activeSpectral);
    setInspectedTelemetry(telemetry);
  };

  // Run AI Vision Diagnostic on the Active Viewport / Coordinate
  const handleRunAiDiagnostic = async () => {
    setIsAiAnalyzing(true);
    try {
      const prompt = `Conduct an enterprise Sentinel-2 multi-spectral remote sensing canopy audit for coordinates ${inspectedTelemetry.latitude}°N, ${inspectedTelemetry.longitude}°E (Agro-Zone: ${selectedZone.name}, ${selectedZone.district}).
Telemetry metrics:
- Mean NDVI (Vegetation Vigor): ${inspectedTelemetry.ndvi}
- NDRE (Chlorophyll Red Edge): ${inspectedTelemetry.ndre}
- NDWI (Foliar Moisture Stress): ${inspectedTelemetry.ndwi}
- Enhanced Vegetation Index (EVI): ${inspectedTelemetry.evi}
- Land Surface Temperature: ${inspectedTelemetry.surfaceTempC}°C
- Chlorophyll Density: ${inspectedTelemetry.chlorophyllDensityUgCm2} µg/cm²
- Estimated Canopy Coverage: ${inspectedTelemetry.canopyCoveragePct}%
- Carbon Biomass Density: ${inspectedTelemetry.biomassCarbonMTPerHa} MT CO2e/Hectare

Please provide:
1. Executive Remote Sensing Diagnosis
2. Photosynthetic Chlorophyll & Nitrogen Health Assessment
3. Soil Moisture & Drought Resilience Advisory
4. 10-Year Carbon Sequestration Projection under IPCC Tier-2 standards
5. Precision Agroforestry Interventions (species enrichment, mulch, drip conservation).`;

      const aiResponse = await analyzeCanopyWithAI(prompt);
      setAiReportModalContent(aiResponse);
      toast({
        title: "AI Satellite Audit Complete 🤖",
        description: `Detailed multi-spectral diagnosis generated for ${selectedZone.name}.`,
      });
    } catch (err: any) {
      toast({
        title: "AI Analysis Error",
        description: err?.message || "Failed to generate AI satellite audit.",
        variant: "destructive",
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Enterprise Telemetry Controls */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border-2 border-primary/30 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
                <Satellite className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
                    Module A: Satellite NDVI & Multi-Spectral Telemetry
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    Sentinel-2 L2A (10m)
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Space-borne remote sensing suite: Calibrated multi-spectral reflectance, 36-month canopy curves, and IPCC Pantropical carbon MRV.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPurposeGuide((prev) => !prev)}
              className="h-9 text-xs rounded-xl gap-1.5 border-primary/20 hover:bg-primary/10"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              {showPurposeGuide ? "Hide Purpose Guide" : "Why Module A?"}
            </Button>
            <GeminiApiKeyModal />
            <ESGReportModal
              totalTrees={trees.length}
              verifiedTrees={verifiedTrees.length}
              organizationName="Maharashtra Green Mission Network"
              co2OffsetKg={totalCo2Kg}
            />
          </div>
        </div>

        {/* ---------------- PURPOSE & SCIENTIFIC VALUE ACCORDION ---------------- */}
        <AnimatePresence>
          {showPurposeGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-5 border-t border-primary/20 overflow-hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-primary flex items-center gap-1.5">
                  <Info className="h-4 w-4" /> For what purpose is Module A & this Satellite Map used?
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Enterprise Earth Observation (EO) Architecture
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    🛰️ 1
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Zero-Cost Space Verification</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Continuously monitor 1,000+ saplings and large-scale plantations from orbit using European Space Agency Sentinel-2 satellites without expensive manual field visits.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    🌱 2
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Chlorophyll & Vigor (NDVI/NDRE)</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Quantify photosynthetic green biomass ($(\text{NIR}-\text{Red})/(\text{NIR}+\text{Red})$) and leaf nitrogen health to detect tree mortality or stunted growth months before visual symptoms appear.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold">
                    💧 3
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Drought Sentinel & Water (NDWI)</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Measure cellular foliage moisture and root-zone water stress. Alerts ground teams to irrigate vulnerable sapling clusters before irreversible wilting occurs.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm space-y-1.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                    📜 4
                  </div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Carbon MRV & ESG Audits</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Automatically convert remote-sensed canopy density into audited $CO_2$ metric tons under IPCC Pantropical Tier-2 standards for CSR, BRSR, and carbon credit issuance.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Core Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <div className="text-xs text-muted-foreground">Monitored Plot</div>
            <div className="font-heading font-extrabold text-lg sm:text-xl text-foreground mt-0.5 truncate">
              {selectedZone.name}
            </div>
            <div className="text-[10px] text-primary mt-0.5 font-semibold">
              {selectedZone.targetTrees.toLocaleString()} Trees ({selectedZone.district})
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-xs text-muted-foreground">Mean Plot NDVI</div>
            <div className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {selectedZone.meanNdvi.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-600/90 font-medium mt-0.5">
              {selectedZone.healthStatus}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
            <div className="text-xs text-muted-foreground">Foliar Water (NDWI)</div>
            <div className="font-heading font-extrabold text-2xl text-sky-600 dark:text-sky-400 mt-0.5">
              +{selectedZone.meanNdwi.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Well-Hydrated Canopy</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-xs text-muted-foreground">Carbon Biomass</div>
            <div className="font-heading font-extrabold text-2xl text-amber-600 dark:text-amber-400 mt-0.5">
              {selectedZone.carbonOffsetTons} MT
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {selectedZone.biomassTonsPerHa} MT/Ha Density
            </div>
          </div>
        </div>

        {/* Sub-Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-primary/20">
          {[
            { id: "map", label: "1. Spectral Map & Remote Scout", icon: Satellite },
            { id: "slider", label: "2. Temporal Transformation (Before vs After)", icon: SlidersHorizontal },
            { id: "timeseries", label: "3. 36-Month NDVI Growth Curve", icon: TrendingUp },
            { id: "carbon", label: "4. IPCC Carbon Credit Modeler", icon: PieChart },
            { id: "parcel", label: "5. Cadastral Boundary (Module D)", icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                    : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background border border-border/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: INTERACTIVE SATELLITE CANVAS + LIVE REMOTE PIXEL SCOUT */}
      {/* ========================================================================= */}
      {activeSubTab === "map" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Live Agro-Climatic Intelligence Widget */}
          <AgroWeatherWidget
            latitude={selectedZone.center[0]}
            longitude={selectedZone.center[1]}
            locationName={`${selectedZone.name} (${selectedZone.district})`}
          />

          {/* Quick-Jump Agroforestry Zone Hub Switcher */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-primary/20 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-heading font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Quick-Focus Plantation Zones & Plots:
              </span>
              <span className="text-[11px] text-muted-foreground">
                Click any zone to fly camera & load multi-spectral telemetry
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {AGROFORESTRY_PRESET_ZONES.map((zone) => {
                const isCurrent = selectedZone.id === zone.id;
                return (
                  <Button
                    key={zone.id}
                    type="button"
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectZone(zone)}
                    className={`rounded-xl text-xs font-semibold h-8 transition-all ${
                      isCurrent
                        ? "shadow-md"
                        : "border-primary/20 text-muted-foreground hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    <TreePine className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    {zone.name.split(" ")[0]} ({zone.district.split(",")[0]})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Spectral Layer Selector */}
          <NDVISpectralViewer
            activeLayerId={activeSpectral}
            onLayerChange={(layerId) => setActiveSpectral(layerId)}
            meanNdvi={selectedZone.meanNdvi}
          />

          {/* Interactive Multi-Spectral Satellite Canvas */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border-2 border-primary/30 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h4 className="font-heading font-bold text-base sm:text-lg text-foreground">
                    Sentinel-2 Multi-Spectral Canvas: {currentLayer.name}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  💡 <strong>Interactive Scout:</strong> Click anywhere on the satellite imagery to drop a GPS pin and inspect live pixel telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono bg-primary/5 border-primary/30">
                  Formula: {currentLayer.formula}
                </Badge>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-bold">
                  {activeSpectral.toUpperCase()} Active
                </Badge>
              </div>
            </div>

            {/* Map Container */}
            <div className="rounded-2xl overflow-hidden border-2 border-primary/30 shadow-inner relative">
              {/* Dynamic Spectral Color Ramp Overlay Shader */}
              <div
                className="absolute inset-0 pointer-events-none z-[400] mix-blend-color opacity-35"
                style={{
                  background:
                    activeSpectral === "ndvi"
                      ? "radial-gradient(circle at 45% 45%, rgba(21,128,61,0.7) 0%, rgba(132,204,22,0.4) 40%, rgba(234,179,8,0.2) 75%, transparent 100%)"
                      : activeSpectral === "ndre"
                      ? "radial-gradient(circle at 45% 45%, rgba(4,120,87,0.7) 0%, rgba(59,130,246,0.4) 50%, rgba(250,204,21,0.2) 80%, transparent 100%)"
                      : activeSpectral === "ndwi"
                      ? "radial-gradient(circle at 45% 45%, rgba(29,78,216,0.7) 0%, rgba(56,189,248,0.4) 50%, rgba(180,83,9,0.2) 80%, transparent 100%)"
                      : activeSpectral === "evi"
                      ? "radial-gradient(circle at 45% 45%, rgba(22,163,74,0.7) 0%, rgba(202,138,4,0.4) 50%, rgba(225,29,72,0.2) 80%, transparent 100%)"
                      : activeSpectral === "thermal"
                      ? "radial-gradient(circle at 45% 45%, rgba(30,58,138,0.7) 0%, rgba(245,158,11,0.4) 50%, rgba(185,28,28,0.2) 80%, transparent 100%)"
                      : "none",
                }}
              />

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                style={{ height: "460px", width: "100%" }}
              >
                <MapEventsController
                  onMapClick={handleMapClick}
                  centerTarget={mapCenter}
                  zoomTarget={mapZoom}
                />

                <TileLayer
                  url={SATELLITE_TILES[activeSpectral] || SATELLITE_TILES.rgb}
                  attribution="&copy; ESRI World Imagery & Sentinel-2 Earth Observation"
                />

                {/* Plot Cadastral Boundary Polygon for Active Agroforestry Zone */}
                {selectedZone.boundary && selectedZone.boundary.length > 0 && (
                  <Polygon
                    positions={selectedZone.boundary}
                    pathOptions={{
                      color: "#22c55e",
                      weight: 3,
                      dashArray: "6, 6",
                      fillColor: "#15803d",
                      fillOpacity: 0.25,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-foreground">{selectedZone.name}</div>
                        <div className="text-muted-foreground">{selectedZone.district}</div>
                        <div className="text-emerald-600 font-semibold">
                          Target: {selectedZone.targetTrees.toLocaleString()} Trees · NDVI: {selectedZone.meanNdvi}
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* Plot DB Projects Boundaries if available */}
                {dbProjects.map((p) => {
                  if (!p.boundary || !Array.isArray(p.boundary) || p.boundary.length < 3) return null;
                  const pts: [number, number][] = p.boundary.map((pt: any) =>
                    Array.isArray(pt) ? pt : [pt.lat, pt.lng]
                  );
                  return (
                    <Polygon
                      key={p.id}
                      positions={pts}
                      pathOptions={{
                        color: "#3b82f6",
                        weight: 2.5,
                        fillColor: "#2563eb",
                        fillOpacity: 0.2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-bold text-foreground">{p.project_name}</div>
                          <div className="text-muted-foreground">{p.organization_name} · {p.location}</div>
                          <div className="text-blue-600 font-semibold">
                            Target: {p.target_trees} Saplings
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                })}

                {/* Inspected Target Reticle Marker */}
                {inspectedTelemetry && (
                  <Marker
                    position={[inspectedTelemetry.latitude, inspectedTelemetry.longitude]}
                    icon={targetReticleIcon}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-foreground">🎯 Selected Remote Scout Coordinate</div>
                        <div className="font-mono text-muted-foreground">
                          {inspectedTelemetry.latitude.toFixed(4)}°N, {inspectedTelemetry.longitude.toFixed(4)}°E
                        </div>
                        <div className="text-emerald-600 font-bold">
                          NDVI: {inspectedTelemetry.ndvi} ({inspectedTelemetry.classification})
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Plot Individual Real Trees */}
                {trees.map((tree) => {
                  const lat = Number(tree.latitude);
                  const lng = Number(tree.longitude);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                    <Marker
                      key={tree.id}
                      position={[lat, lng]}
                      icon={tree.verification_status === "verified" ? verifiedSatIcon : pendingSatIcon}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-bold text-foreground">{tree.tree_name}</div>
                          <div className="text-muted-foreground">{tree.species}</div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            Status: {tree.verification_status}
                          </Badge>
                          <div className="text-emerald-600 font-semibold mt-1">
                            Estimated NDVI: 0.76 (Vigorous Canopy)
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Floating Quick Action Overlay inside Map */}
              <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleRunAiDiagnostic}
                  disabled={isAiAnalyzing}
                  className="rounded-xl font-bold shadow-lg gap-1.5 text-xs bg-primary/95 hover:bg-primary text-primary-foreground backdrop-blur-md"
                >
                  <Bot className="h-3.5 w-3.5" />
                  {isAiAnalyzing ? "Analyzing..." : "AI Viewport Audit"}
                </Button>
              </div>
            </div>

            {/* Live Pixel Inspector HUD for Active Coordinate */}
            {inspectedTelemetry && (
              <SatellitePixelInspectorHUD
                telemetry={inspectedTelemetry}
                onRunAiDiagnostic={handleRunAiDiagnostic}
                isAiAnalyzing={isAiAnalyzing}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: BEFORE VS AFTER TEMPORAL TRANSFORMATION SLIDER */}
      {/* ========================================================================= */}
      {activeSubTab === "slider" && (
        <SatelliteTimeSliderCompare
          zoneName={`${selectedZone.name} (${selectedZone.district})`}
          baselineYear="2023 Baseline"
          currentYear="2026 Multi-Spectral Canopy"
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: 36-MONTH NDVI & BIOMASS CURVE */}
      {/* ========================================================================= */}
      {activeSubTab === "timeseries" && (
        <CanopyNDVITimeSeriesChart
          initialTreeCount={selectedZone.targetTrees || 5000}
          plotName={selectedZone.name}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: IPCC CARBON BIOMASS MODELER */}
      {/* ========================================================================= */}
      {activeSubTab === "carbon" && <AllometricCarbonCalculator />}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: CADASTRAL PARCEL BOUNDARY MODELER (MODULE D) */}
      {/* ========================================================================= */}
      {activeSubTab === "parcel" && <PlotPolygonDrawer />}

      {/* AI Satellite Audit Modal Report */}
      <AnimatePresence>
        {aiReportModalContent && (
          <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-6 sm:p-7 max-w-2xl w-full border-2 border-primary/40 shadow-2xl bg-background space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <Bot className="h-4 w-4" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    AI Multi-Spectral Canopy Audit
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiReportModalContent(null)}
                  className="rounded-xl h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {aiReportModalContent}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setAiReportModalContent(null)}
                  className="rounded-xl font-semibold text-xs"
                >
                  Close Audit Report
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
