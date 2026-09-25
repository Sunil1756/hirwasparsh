import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Marker, Popup, Polygon, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import {
  Layers,
  ShieldCheck,
  TreePine,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Compass,
  FileCheck,
  Scale,
  Leaf,
  Activity,
  Calendar,
  X,
  Lock,
} from "lucide-react";
import {
  BoundarySystemData,
  ProjectCadastralArea,
  ExistingVegetationBaseline,
  PlantedTreesAdditionality,
  fetchBoundarySystemData,
  BOUNDARY_LAYER_STYLES,
  validateDataSeparation,
} from "@/services/boundarySystemService";
import { RealTreeFeature, formatTreeCoordinates, getTreeDivIconHtml } from "@/services/treeMapService";
import { GisMapContainer } from "@/components/gis/GisMapContainer";
import {
  BasemapProviderId,
  BoundingBox,
  LatLngTuple,
  coordinateToDMS,
} from "@/lib/gisMapFoundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// Smooth Map Navigation Controller
function BoundaryMapNavigator({
  targetBounds,
  triggerCount,
}: {
  targetBounds: BoundingBox | null;
  triggerCount: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (triggerCount === 0 || !targetBounds) return;
    if (map && typeof map.fitBounds === "function") {
      const leafletBounds: L.LatLngBoundsExpression = [
        [targetBounds.minLat, targetBounds.minLng],
        [targetBounds.maxLat, targetBounds.maxLng],
      ];
      map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 17, animate: true });
    }
  }, [targetBounds, triggerCount]);

  return null;
}

export interface BoundarySystemMapViewerProps {
  projectId?: string;
  defaultBasemap?: BasemapProviderId;
  height?: string;
  className?: string;
  onLayerSelect?: (layerName: "projectArea" | "existingVegetation" | "plantedTrees") => void;
}

export const BoundarySystemMapViewer: React.FC<BoundarySystemMapViewerProps> = ({
  projectId = "proj-pune-western-ghats",
  defaultBasemap = "google_satellite",
  height = "750px",
  className = "",
  onLayerSelect,
}) => {
  // 1. Data State
  const [data, setData] = useState<BoundarySystemData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Layer Visibility Toggles (Strict 3-way isolation)
  const [showProjectArea, setShowProjectArea] = useState<boolean>(true);
  const [showExistingVegetation, setShowExistingVegetation] = useState<boolean>(true);
  const [showPlantedTrees, setShowPlantedTrees] = useState<boolean>(true);
  const [showAccuracyBuffers, setShowAccuracyBuffers] = useState<boolean>(false);

  // 3. Selection & Inspection State
  const [selectedEntity, setSelectedEntity] = useState<{
    type: "project_area" | "baseline_canopy" | "planted_tree";
    data: any;
  } | null>(null);

  // 4. Map Fly trigger
  const [navTrigger, setNavTrigger] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load Data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchBoundarySystemData(projectId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load boundary system data", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Validation Audit
  const validationResult = useMemo(() => {
    if (!data) return { isSeparated: true, violations: [] };
    return validateDataSeparation(data.projectArea, data.existingVegetation, data.plantedTrees);
  }, [data]);

  // Handle Layer Toggle with Callback
  const handleToggleLayer = (layer: "projectArea" | "existingVegetation" | "plantedTrees", val: boolean) => {
    if (layer === "projectArea") setShowProjectArea(val);
    if (layer === "existingVegetation") setShowExistingVegetation(val);
    if (layer === "plantedTrees") setShowPlantedTrees(val);
    if (onLayerSelect && val) onLayerSelect(layer);
  };

  // Focus All Boundaries
  const handleFitAll = useCallback(() => {
    if (data?.projectArea?.bounds) {
      setNavTrigger((c) => c + 1);
    }
  }, [data]);

  // Filtered Trees
  const filteredTrees = useMemo(() => {
    if (!data?.plantedTrees?.trees) return [];
    if (!searchQuery.trim()) return data.plantedTrees.trees;
    const q = searchQuery.toLowerCase();
    return data.plantedTrees.trees.filter(
      (t) =>
        t.treeName.toLowerCase().includes(q) ||
        t.species.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Create Leaflet DivIcons for Planted Trees
  const treeIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    if (!data?.plantedTrees?.trees) return map;

    for (const tree of data.plantedTrees.trees) {
      const html = getTreeDivIconHtml(tree);
      map.set(
        tree.id,
        L.divIcon({
          className: "custom-tree-marker",
          html,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        })
      );
    }
    return map;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-emerald-500/20 backdrop-blur-md"
        style={{ height }}
      >
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <Layers className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 text-sm font-semibold text-emerald-200 tracking-wide uppercase">
          Loading 3-Way Boundary Separation System...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Isolating Project Cadastre, Baseline Vegetation T0 & Afforestation Additions
        </p>
      </div>
    );
  }

  const { projectArea, existingVegetation, plantedTrees, additionalitySummary } = data;

  return (
    <div className={`flex flex-col lg:flex-row gap-4 w-full ${className}`}>
      {/* LEFT / TOP: Interactive Boundary Controls & Additionality Audit Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-3 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Boundary Separation
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Phase 6.30
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">Strict 3-Way MRV Dataset Segregation</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFitAll}
            className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
            title="Fit Cadastral Bounds"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Fit
          </Button>
        </div>

        {/* Invariant Rule Banner */}
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-emerald-200">
            <span className="font-semibold text-emerald-300">Golden Rule Invariant:</span> Baseline standing biomass ({existingVegetation.baselineStandingBiomassTCo2e} tCO₂e) is strictly isolated and never combined with afforestation additions ({plantedTrees.totalAdditionalityBiomassTCo2e} tCO₂e).
          </div>
        </div>

        {/* 3-WAY LAYER SWITCHES */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Geospatial Layer Segregation
          </span>

          {/* Layer 1: Project Cadastral Area */}
          <div
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              showProjectArea
                ? "bg-indigo-950/30 border-indigo-500/40 shadow-sm"
                : "bg-slate-950/40 border-slate-800/60 opacity-60"
            }`}
            onClick={() => setSelectedEntity({ type: "project_area", data: projectArea })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-indigo-500/80 border border-indigo-300 shadow-sm" />
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    1. Project Cadastral Area
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-indigo-500/30 text-indigo-300">
                      Legal Parcel
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Gross {projectArea.grossAreaHectares} ha • Net {projectArea.netPlantableAreaHectares} ha plantable
                  </div>
                </div>
              </div>
              <Switch
                checked={showProjectArea}
                onCheckedChange={(v) => handleToggleLayer("projectArea", v)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
          </div>

          {/* Layer 2: Existing Baseline Vegetation */}
          <div
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              showExistingVegetation
                ? "bg-amber-950/30 border-amber-500/40 shadow-sm"
                : "bg-slate-950/40 border-slate-800/60 opacity-60"
            }`}
            onClick={() => setSelectedEntity({ type: "baseline_canopy", data: existingVegetation })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-emerald-800/80 border border-emerald-400 border-dashed shadow-sm" />
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    2. Existing Baseline Vegetation
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-300">
                      T₀ Baseline
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {existingVegetation.baselineCanopyAreaHectares} ha canopy • {existingVegetation.baselineStandingBiomassTCo2e} tCO₂e standing stock
                  </div>
                </div>
              </div>
              <Switch
                checked={showExistingVegetation}
                onCheckedChange={(v) => handleToggleLayer("existingVegetation", v)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </div>

          {/* Layer 3: Green Enlightenment Planted Trees */}
          <div
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              showPlantedTrees
                ? "bg-emerald-950/30 border-emerald-500/40 shadow-sm"
                : "bg-slate-950/40 border-slate-800/60 opacity-60"
            }`}
            onClick={() => setSelectedEntity({ type: "planted_tree", data: plantedTrees })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    3. Planted Trees (Additions)
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-300">
                      T &gt; T₀
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {plantedTrees.totalPlantedTrees.toLocaleString()} trees • {plantedTrees.totalAdditionalityBiomassTCo2e} tCO₂e verified carbon
                  </div>
                </div>
              </div>
              <Switch
                checked={showPlantedTrees}
                onCheckedChange={(v) => handleToggleLayer("plantedTrees", v)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Land Budget & Additionality Audit Card */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Scale className="w-3.5 h-3.5" />
              Additionality Ledger
            </span>
            <span className="text-[10px] text-slate-400">MRV Certified</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">T₀ Baseline Biomass</span>
              <span className="font-bold text-amber-300 text-xs">
                {additionalitySummary.baselineStandingBiomassTCo2e} tCO₂e
              </span>
              <span className="text-[9px] text-slate-500 block">Deducted baseline</span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Net Planted Additions</span>
              <span className="font-bold text-emerald-400 text-xs">
                +{additionalitySummary.netAdditionalityBiomassTCo2e} tCO₂e
              </span>
              <span className="text-[9px] text-slate-500 block">Additionality Credits</span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Land Allocation ({projectArea.grossAreaHectares} ha total)</span>
              <span className="text-slate-300 font-medium">
                {additionalitySummary.availablePlantableHectares} ha plantable remaining
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${(additionalitySummary.baselineCanopyHectares / projectArea.grossAreaHectares) * 100}%`,
                }}
                className="bg-amber-600 h-full"
                title="Baseline Canopy"
              />
              <div
                style={{
                  width: `${(additionalitySummary.newPlantedHectares / projectArea.grossAreaHectares) * 100}%`,
                }}
                className="bg-emerald-500 h-full"
                title="Planted Additionality"
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-600 inline-block" /> Baseline: {additionalitySummary.baselineCanopyHectares} ha
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Planted: {additionalitySummary.newPlantedHectares} ha
              </span>
            </div>
          </div>
        </div>

        {/* Tree Search within Planted Layer */}
        {showPlantedTrees && (
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search planted tree or species..."
                className="h-8 pl-8 pr-2 text-xs bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-lg"
              />
            </div>
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchQuery("")}
                className="h-8 px-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT / MAIN: High Precision GIS Map Canvas */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 min-h-[550px]" style={{ height }}>
        <GisMapContainer
          defaultCenter={[18.473, 73.438]}
          defaultZoom={15}
          defaultBasemap={defaultBasemap}
          className="w-full h-full"
          showBasemapControl={true}
          showScaleControl={true}
          showCoordinatesControl={true}
        >
          {/* Navigator */}
          <BoundaryMapNavigator
            targetBounds={projectArea.bounds}
            triggerCount={navTrigger}
          />

          {/* =========================================================
              LAYER 1: PROJECT CADASTRAL AREA (Never Combined)
              ========================================================= */}
          {showProjectArea && projectArea.perimeterCoordinates && (
            <Polygon
              positions={projectArea.perimeterCoordinates}
              pathOptions={{
                color: BOUNDARY_LAYER_STYLES.projectArea.color,
                weight: BOUNDARY_LAYER_STYLES.projectArea.weight,
                fillColor: BOUNDARY_LAYER_STYLES.projectArea.fillColor,
                fillOpacity: BOUNDARY_LAYER_STYLES.projectArea.fillOpacity,
              }}
              eventHandlers={{
                click: () => setSelectedEntity({ type: "project_area", data: projectArea }),
              }}
            >
              <Tooltip sticky>
                <div className="p-1 font-sans text-xs">
                  <div className="font-bold text-indigo-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {projectArea.projectName}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Cadastral Parcel: {projectArea.cadastralParcelId}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Gross Area: {projectArea.grossAreaHectares} ha
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          )}

          {/* =========================================================
              LAYER 2: EXISTING BASELINE VEGETATION (T0 Isolated)
              ========================================================= */}
          {showExistingVegetation &&
            existingVegetation.canopyPolygons.map((poly) => {
              const style =
                BOUNDARY_LAYER_STYLES.existingVegetation[poly.densityClass] ||
                BOUNDARY_LAYER_STYLES.existingVegetation.dense_canopy;

              return (
                <Polygon
                  key={poly.id}
                  positions={poly.coordinates}
                  pathOptions={{
                    color: style.color,
                    weight: style.weight,
                    fillColor: style.fillColor,
                    fillOpacity: style.fillOpacity,
                    dashArray: style.dashArray,
                  }}
                  eventHandlers={{
                    click: () => setSelectedEntity({ type: "baseline_canopy", data: poly }),
                  }}
                >
                  <Tooltip sticky>
                    <div className="p-1 font-sans text-xs">
                      <div className="font-bold text-amber-800 flex items-center gap-1">
                        <TreePine className="w-3.5 h-3.5" />
                        {poly.strataName}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Pre-Existing Baseline Area: {poly.areaHectares} ha
                      </div>
                      <div className="text-[10px] font-semibold text-amber-900">
                        Standing Baseline Biomass: {poly.standingBiomassTCo2e} tCO₂e (T₀)
                      </div>
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}

          {/* =========================================================
              LAYER 3: GREEN ENLIGHTENMENT PLANTED TREES (T > T0)
              ========================================================= */}
          {showPlantedTrees &&
            filteredTrees.map((tree) => {
              const icon = treeIcons.get(tree.id);
              if (!icon) return null;

              return (
                <React.Fragment key={tree.id}>
                  {showAccuracyBuffers && tree.gpsAccuracyMeters && (
                    <Circle
                      center={[tree.latitude, tree.longitude]}
                      radius={tree.gpsAccuracyMeters}
                      pathOptions={{
                        color: "#22c55e",
                        fillColor: "#22c55e",
                        fillOpacity: 0.12,
                        weight: 1,
                      }}
                    />
                  )}
                  <Marker
                    position={[tree.latitude, tree.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedEntity({ type: "planted_tree", data: tree }),
                    }}
                  >
                    <Popup className="tree-passport-popup">
                      <div className="p-2 min-w-[220px] font-sans">
                        <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            {tree.treeName}
                          </span>
                          <Badge variant="outline" className="text-[9px] border-emerald-500 text-emerald-700">
                            {tree.survivalStatus}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-700 italic font-serif">
                          {tree.species} ({tree.vernacularName})
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                          <span>Height: {tree.heightCm} cm</span>
                          <span>GPS: ±{tree.gpsAccuracyMeters}m</span>
                        </div>
                        <div className="mt-2 pt-1 border-t text-[10px] text-slate-500 flex justify-between items-center">
                          <span>Additionality Carbon:</span>
                          <span className="font-bold text-emerald-700">+{tree.estimatedBiomassKgCo2e} kg CO₂e</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
        </GisMapContainer>

        {/* FLOATING INSPECTOR DRAWER */}
        {selectedEntity && (
          <div className="absolute top-4 right-4 z-[1000] w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                {selectedEntity.type === "project_area" && (
                  <MapPin className="w-4 h-4 text-indigo-400" />
                )}
                {selectedEntity.type === "baseline_canopy" && (
                  <TreePine className="w-4 h-4 text-amber-400" />
                )}
                {selectedEntity.type === "planted_tree" && (
                  <Leaf className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-bold tracking-wide uppercase text-slate-300">
                  {selectedEntity.type === "project_area"
                    ? "Cadastral Boundary"
                    : selectedEntity.type === "baseline_canopy"
                    ? "Baseline Strata T₀"
                    : "Planted Afforestation Tree"}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEntity(null)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Content for Project Area */}
            {selectedEntity.type === "project_area" && (
              <div className="flex flex-col gap-2 text-xs">
                <h4 className="font-bold text-slate-100 text-sm">{projectArea.projectName}</h4>
                <div className="p-2 bg-indigo-950/40 border border-indigo-500/20 rounded-lg space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Cadastral ID:</span>
                    <span className="font-mono text-indigo-300">{projectArea.cadastralParcelId}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Gross Legal Area:</span>
                    <span className="font-semibold text-slate-100">{projectArea.grossAreaHectares} ha</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Net Plantable:</span>
                    <span className="font-semibold text-emerald-400">{projectArea.netPlantableAreaHectares} ha</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-200 text-right">{projectArea.locationName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Baseline Canopy */}
            {selectedEntity.type === "baseline_canopy" && (
              <div className="flex flex-col gap-2 text-xs">
                <h4 className="font-bold text-amber-300 text-sm">
                  {selectedEntity.data.strataName || "Baseline Canopy Strata"}
                </h4>
                <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Density Class:</span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                      {selectedEntity.data.densityClass || "Dense Canopy"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Strata Extent:</span>
                    <span className="font-semibold text-slate-100">{selectedEntity.data.areaHectares || 6.8} ha</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Standing Biomass (T₀):</span>
                    <span className="font-bold text-amber-400">{selectedEntity.data.standingBiomassTCo2e || 326.4} tCO₂e</span>
                  </div>
                </div>
                <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">Pre-project Species Mix:</span>
                  {existingVegetation.baselineSpeciesMix.join(", ")}
                </div>
              </div>
            )}

            {/* Content for Planted Tree */}
            {selectedEntity.type === "planted_tree" && (
              <div className="flex flex-col gap-2 text-xs">
                {selectedEntity.data.treeName ? (
                  <>
                    <h4 className="font-bold text-emerald-400 text-sm">{selectedEntity.data.treeName}</h4>
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg space-y-1">
                      <div className="text-slate-300 font-serif italic">{selectedEntity.data.species}</div>
                      <div className="flex justify-between text-slate-400 pt-1">
                        <span>Survival Status:</span>
                        <span className="font-bold text-emerald-300">{selectedEntity.data.survivalStatus}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Coordinates:</span>
                        <span className="font-mono text-slate-200 text-[10px]">
                          {selectedEntity.data.latitude.toFixed(6)}, {selectedEntity.data.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Additionality Carbon:</span>
                        <span className="font-bold text-emerald-400">+{selectedEntity.data.estimatedBiomassKgCo2e} kg CO₂e</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-emerald-400 text-sm">Planted Additions Pool (T &gt; T₀)</h4>
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Total Afforestation Saplings:</span>
                        <span className="font-bold text-slate-100">{plantedTrees.totalPlantedTrees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Verified Alive:</span>
                        <span className="font-bold text-emerald-300">{plantedTrees.verifiedAliveTrees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Survival Rate:</span>
                        <span className="font-bold text-emerald-400">{plantedTrees.survivalRatePct}%</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Additionality Carbon:</span>
                        <span className="font-bold text-emerald-400">+{plantedTrees.totalAdditionalityBiomassTCo2e} tCO₂e</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
