import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  Layers,
  Activity,
  Calendar,
  Sparkles,
  TreePine,
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  ShieldCheck,
  TrendingUp,
  Maximize2,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SPECTRAL_LAYERS } from "@/lib/remoteSensing";

interface Props {
  projectName: string;
  locationName: string;
  boundary: [number, number][];
  targetTrees: number;
  speciesList: string[];
  plantationDate: string;
  baselineNdvi?: number;
  bulkTrees?: Array<{ latitude: string | number; longitude: string | number; species?: string }>;
}

const TIMELINE_STEPS = [
  { index: 0, label: "Baseline (t₀)", sub: "Pre-Planting", months: 0, ndvi: 0.22, ndre: 0.16, ndwi: -0.28, canopy: "6%", survival: 100 },
  { index: 1, label: "Month 3", sub: "Establishment", months: 3, ndvi: 0.38, ndre: 0.29, ndwi: -0.12, canopy: "22%", survival: 97.4 },
  { index: 2, label: "Month 6", sub: "Foliage Emergence", months: 6, ndvi: 0.54, ndre: 0.44, ndwi: 0.08, canopy: "45%", survival: 94.8 },
  { index: 3, label: "Month 12", sub: "Year 1 Canopy Closure", months: 12, ndvi: 0.69, ndre: 0.58, ndwi: 0.24, canopy: "68%", survival: 92.5 },
  { index: 4, label: "Year 2+", sub: "Mature Agro-Biome", months: 24, ndvi: 0.83, ndre: 0.72, ndwi: 0.38, canopy: "86%", survival: 91.2 },
];

const MapResizer = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView(center, 16);
    }, 250);
  }, [map, center]);
  return null;
};

export const SatelliteProjectTelemetrySuite = ({
  projectName,
  locationName,
  boundary,
  targetTrees,
  speciesList,
  plantationDate,
  baselineNdvi = 0.22,
  bulkTrees = [],
}: Props) => {
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(2); // default Month 6
  const [activeSpectralLayer, setActiveSpectralLayer] = useState<"rgb" | "ndvi" | "ndre" | "ndwi">("ndvi");
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [showSaplingMarkers, setShowSaplingMarkers] = useState(true);

  // Auto Play Time-Series loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingTimeline) {
      timer = setInterval(() => {
        setSelectedTimeIndex((prev) => (prev + 1) % TIMELINE_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  const currentStep = TIMELINE_STEPS[selectedTimeIndex];

  // Calculated Map Center
  const mapCenter: [number, number] = useMemo(() => {
    if (boundary && boundary.length >= 3) {
      const lats = boundary.map((p) => p[0]);
      const lngs = boundary.map((p) => p[1]);
      return [lats.reduce((a, b) => a + b, 0) / lats.length, lngs.reduce((a, b) => a + b, 0) / lngs.length];
    }
    return [19.7515, 75.7139];
  }, [boundary]);

  // Color gradient for spectral index fill on polygon
  const getPolygonFillColor = (layer: string, step: typeof TIMELINE_STEPS[0]) => {
    if (layer === "rgb") return "#22c55e";
    if (layer === "ndvi") {
      if (step.ndvi >= 0.7) return "#15803d"; // deep green
      if (step.ndvi >= 0.5) return "#22c55e"; // bright green
      if (step.ndvi >= 0.35) return "#eab308"; // yellow-amber
      return "#dc2626"; // red/bare soil
    }
    if (layer === "ndre") {
      if (step.ndre >= 0.6) return "#047857";
      if (step.ndre >= 0.4) return "#facc15";
      return "#ea580c";
    }
    if (layer === "ndwi") {
      if (step.ndwi >= 0.2) return "#1d4ed8";
      if (step.ndwi >= 0.0) return "#38bdf8";
      return "#b45309";
    }
    return "#15803d";
  };

  const currentFillColor = getPolygonFillColor(activeSpectralLayer, currentStep);

  // Biomass calculation
  const currentCo2Tons = Number(((targetTrees * (currentStep.months + 3) * 0.0022)).toFixed(1));
  const tenYearProjectedTons = Number(((targetTrees * 0.022 * 10)).toFixed(1));

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Satellite className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">Sentinel-2 Multi-Spectral Telemetry & NDVI Time-Series</h3>
              <p className="text-xs text-muted-foreground">
                High-resolution European Space Agency (ESA) spectral bands with multi-temporal canopy reflectance modeling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
            Plot: {projectName}
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
            Live Satellite Feed
          </Badge>
        </div>
      </div>

      {/* Spectral Layer Selector (RGB vs NDVI vs NDRE vs NDWI) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SPECTRAL_LAYERS.map((layer) => {
          const isSelected = layer.id === activeSpectralLayer;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveSpectralLayer(layer.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-heading font-bold text-xs">{layer.id.toUpperCase()}</span>
                {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="text-[11px] font-semibold text-foreground truncate">{layer.name.split(" (")[0]}</div>
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{layer.shortDescription}</div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Map & Telemetry Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map with Time-Series Polygon Overlay */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-inner h-[380px] w-full">
            <MapContainer
              center={mapCenter}
              zoom={16}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; Esri &mdash; Earthstar Geographics"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <MapResizer center={mapCenter} />

              {/* Spectral Polygon Overlay */}
              {boundary && boundary.length >= 3 && (
                <Polygon
                  positions={boundary}
                  pathOptions={{
                    color: currentFillColor,
                    weight: 3,
                    fillColor: currentFillColor,
                    fillOpacity: activeSpectralLayer === "rgb" ? 0.2 : 0.65,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs space-y-1">
                      <strong>{projectName}</strong>
                      <p className="text-muted-foreground">{locationName}</p>
                      <p>Time Step: <strong>{currentStep.label}</strong></p>
                      <p>Mean {activeSpectralLayer.toUpperCase()}: <strong>{currentStep[activeSpectralLayer as keyof typeof currentStep] ?? currentStep.ndvi}</strong></p>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Sapling Grid Markers */}
              {showSaplingMarkers &&
                bulkTrees.slice(0, 80).map((t, i) => {
                  const lat = Number(t.latitude);
                  const lng = Number(t.longitude);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                    <CircleMarker
                      key={i}
                      center={[lat, lng]}
                      radius={4}
                      pathOptions={{
                        color: "#fff",
                        weight: 1.5,
                        fillColor: currentFillColor,
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>{t.species || "Sapling"}</strong>
                          <p className="text-muted-foreground">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </MapContainer>

            {/* Map Floating HUD Overlay */}
            <div className="absolute top-3 left-3 z-[1000] p-2.5 rounded-xl bg-background/90 backdrop-blur-md border border-primary/20 shadow-md text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Satellite className="h-3.5 w-3.5 text-primary" /> Sentinel-2 MSI Telemetry
              </div>
              <div className="text-[11px] text-muted-foreground">
                Active Index: <strong className="text-primary font-mono">{activeSpectralLayer.toUpperCase()}</strong> ({currentStep.label})
              </div>
            </div>

            <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSaplingMarkers(!showSaplingMarkers)}
                className="h-8 text-xs rounded-xl bg-background/90 backdrop-blur-md shadow-md"
              >
                {showSaplingMarkers ? "Hide Tree Pins" : "Show Tree Pins"}
              </Button>
            </div>
          </div>

          {/* Time-Series Slider Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Satellite Spectral Growth Timeline</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                  className="h-7 px-2.5 text-xs rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                >
                  {isPlayingTimeline ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  {isPlayingTimeline ? "Pause" : "Play Growth"}
                </Button>
                <span className="font-mono text-primary font-bold">{currentStep.label} ({currentStep.sub})</span>
              </div>
            </div>

            <Slider
              value={[selectedTimeIndex]}
              min={0}
              max={TIMELINE_STEPS.length - 1}
              step={1}
              onValueChange={(val) => {
                setSelectedTimeIndex(val[0]);
                setIsPlayingTimeline(false);
              }}
              className="py-1"
            />

            {/* Timeline Pills */}
            <div className="grid grid-cols-5 gap-1 pt-1 text-center">
              {TIMELINE_STEPS.map((step) => {
                const isCurrent = step.index === selectedTimeIndex;
                return (
                  <button
                    key={step.index}
                    type="button"
                    onClick={() => {
                      setSelectedTimeIndex(step.index);
                      setIsPlayingTimeline(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="block font-semibold">{step.label}</span>
                    <span className="text-[9px] opacity-80 block truncate">{step.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Real-time Telemetry & Carbon Sequestration Engine */}
        <div className="space-y-4">
          {/* Key Spectral Metric Cards */}
          <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-3">
            <h4 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Current Spectral Metrics</span>
              <span className="text-primary font-mono text-[10px] font-bold">{currentStep.label}</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-background/80 border border-border/40">
                <span className="text-muted-foreground block text-[10px]">NDVI Biomass</span>
                <strong className="text-base font-bold text-emerald-600">{currentStep.ndvi}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Scale: -0.2 to +1.0</span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border/40">
                <span className="text-muted-foreground block text-[10px]">Canopy Coverage</span>
                <strong className="text-base font-bold text-foreground">{currentStep.canopy}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Plot Surface</span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border/40">
                <span className="text-muted-foreground block text-[10px]">NDRE Chlorophyll</span>
                <strong className="text-base font-bold text-emerald-500">{currentStep.ndre}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Deep Foliage</span>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border/40">
                <span className="text-muted-foreground block text-[10px]">Survival Rate</span>
                <strong className="text-base font-bold text-primary">{currentStep.survival}%</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Estimated Index</span>
              </div>
            </div>
          </div>

          {/* Carbon Sequestration Ledger Widget */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <TrendingUp className="h-4 w-4" /> IPCC Tier-2 Carbon Ledger
              </div>
              <Badge variant="outline" className="text-[10px] bg-background">
                {speciesList.length} Native Species
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/40 space-y-1">
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Sequestration to Date:</span>
                <strong className="text-foreground font-bold">{currentCo2Tons} MT CO₂e</strong>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>10-Year Projected Offset:</span>
                <strong className="text-primary font-bold">{tenYearProjectedTons} MT CO₂e</strong>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Est. Carbon Value (@ ₹1,200/MT):</span>
                <strong className="text-emerald-600 font-bold">₹{(tenYearProjectedTons * 1200).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Live Agro-Climatic Intelligence Widget */}
          <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1 text-foreground">
                <CloudSun className="h-4 w-4 text-amber-500" /> Agro-Climatic Telemetry
              </span>
              <span className="text-[10px] text-muted-foreground">Sentinel-1 SAR Radar</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/30">
                <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Soil Moisture</span>
                  <strong className="text-xs font-bold text-foreground">34% (Optimal)</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/30">
                <Thermometer className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Surface Temp</span>
                  <strong className="text-xs font-bold text-foreground">29.4 °C</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
