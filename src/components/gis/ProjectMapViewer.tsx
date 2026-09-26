import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Marker, Popup, Polygon, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Search,
  Filter,
  Layers,
  MapPin,
  TreePine,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
  Maximize2,
  Satellite,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ProjectMapFeature,
  ProjectBoundaryLayer,
  ProjectMapDataResponse,
  fetchProjectMapData,
  getBoundaryStyle,
  getProjectMarkerHtml,
} from "@/services/projectMapService";
import { ProjectSatelliteBoundaryHUD } from "@/components/gis/ProjectSatelliteBoundaryHUD";
import { GisMapContainer } from "@/components/gis/GisMapContainer";
import {
  BasemapProviderId,
  BoundingBox,
  LatLngTuple,
  coordinateToDMS,
} from "@/lib/gisMapFoundation";
import { ProjectStatus, ProjectType, BoundaryType } from "@/types/coreDatabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Sub-component to handle programmatically flying and framing bounds
function ProjectMapNavigator({
  targetBounds,
  targetCentroid,
  triggerCount,
}: {
  targetBounds: BoundingBox | null;
  targetCentroid: LatLngTuple | null;
  triggerCount: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (triggerCount === 0) return;

    if (targetBounds && map && typeof map.fitBounds === "function") {
      map.fitBounds(
        [
          [targetBounds.minLat, targetBounds.minLng],
          [targetBounds.maxLat, targetBounds.maxLng],
        ],
        { padding: [60, 60], maxZoom: 17, duration: 1.5 }
      );
    } else if (targetCentroid && map && typeof map.flyTo === "function") {
      map.flyTo(targetCentroid, 15, { duration: 1.5 });
    }
  }, [targetBounds, targetCentroid, triggerCount]);

  return null;
}

export interface ProjectMapViewerProps {
  initialProjectId?: string;
  onSelectProject?: (project: ProjectMapFeature | null) => void;
  height?: string | number;
  className?: string;
}

export const ProjectMapViewer: React.FC<ProjectMapViewerProps> = ({
  initialProjectId,
  onSelectProject,
  height = "720px",
  className = "",
}) => {
  const [data, setData] = useState<ProjectMapDataResponse>({
    projects: [],
    totalProjects: 0,
    totalHectares: 0,
    totalTargetTrees: 0,
    totalPlantedTrees: 0,
    overallBoundingBox: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [isSatelliteHudOpen, setIsSatelliteHudOpen] = useState(false);

  // Layer Visibility Toggles
  const [showPlantingZones, setShowPlantingZones] = useState(true);
  const [showBufferZones, setShowBufferZones] = useState(true);
  const [showExclusionZones, setShowExclusionZones] = useState(true);
  const [showWaterbodies, setShowWaterbodies] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  // Navigation Target State
  const [navTargetBounds, setNavTargetBounds] = useState<BoundingBox | null>(null);
  const [navTargetCentroid, setNavTargetCentroid] = useState<LatLngTuple | null>(null);
  const [navTrigger, setNavTrigger] = useState(0);

  // Load project map data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchProjectMapData({
        searchQuery,
        status: statusFilter as any,
        projectType: typeFilter as any,
      });
      setData(response);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Project Object
  const selectedProject = useMemo(
    () => data.projects.find((p) => p.id === selectedProjectId) || null,
    [data.projects, selectedProjectId]
  );

  // Trigger project selection callback
  const handleSelectProject = useCallback(
    (proj: ProjectMapFeature | null) => {
      setSelectedProjectId(proj ? proj.id : null);
      setSelectedCompartmentId(null);
      onSelectProject?.(proj);

      if (proj) {
        setNavTargetBounds(proj.bounds);
        setNavTargetCentroid(proj.centroid);
        setNavTrigger((prev) => prev + 1);
      }
    },
    [onSelectProject]
  );

  // "Fit All Projects" action
  const handleFitAllProjects = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedCompartmentId(null);
    if (data.overallBoundingBox) {
      setNavTargetBounds(data.overallBoundingBox);
      setNavTargetCentroid(null);
      setNavTrigger((prev) => prev + 1);
    }
  }, [data.overallBoundingBox]);

  // Filtered Boundaries based on visibility toggles
  const visibleBoundaries = useMemo(() => {
    const list: { project: ProjectMapFeature; boundary: ProjectBoundaryLayer }[] = [];
    for (const p of data.projects) {
      for (const b of p.boundaries) {
        if (b.boundaryType === "planting_zone" && !showPlantingZones) continue;
        if (b.boundaryType === "buffer_zone" && !showBufferZones) continue;
        if (b.boundaryType === "exclusion_zone" && !showExclusionZones) continue;
        if (b.boundaryType === "waterbody" && !showWaterbodies) continue;
        list.push({ project: p, boundary: b });
      }
    }
    return list;
  }, [
    data.projects,
    showPlantingZones,
    showBufferZones,
    showExclusionZones,
    showWaterbodies,
  ]);

  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      {/* Left Navigation & Filter Sidebar */}
      <aside className="w-full lg:w-96 flex flex-col gap-3 shrink-0">
        <div className="glass-card rounded-2xl p-4 border border-border/70 shadow-sm space-y-3.5">
          {/* Header & KPI Summary */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-base text-foreground">
                Project GIS Explorer
              </h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-xs">
              {data.totalProjects} Projects
            </Badge>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by project, location, NGO..."
              className="pl-9 h-9 text-xs rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Project Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="reforestation">🌲 Reforestation</SelectItem>
                  <SelectItem value="agroforestry">🌾 Agroforestry</SelectItem>
                  <SelectItem value="urban_greenery">🏙️ Urban Greenery</SelectItem>
                  <SelectItem value="corporate_csr">🏢 Corporate CSR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Aggregate Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-muted/60 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">Total Area</div>
              <div className="font-bold text-xs text-foreground mt-0.5">
                {data.totalHectares} ha
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Planted Trees</div>
              <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                {data.totalPlantedTrees.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Target Trees</div>
              <div className="font-bold text-xs text-foreground mt-0.5">
                {data.totalTargetTrees.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Boundary Layer Filter Pills */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Cadastral GIS Layers</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFitAllProjects}
                className="h-6 text-[10px] px-2 text-primary hover:text-primary"
              >
                Fit All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setShowPlantingZones((v) => !v)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  showPlantingZones
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "bg-muted/40 border-border text-muted-foreground opacity-60"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Planting Zones
              </button>

              <button
                type="button"
                onClick={() => setShowBufferZones((v) => !v)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  showBufferZones
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-medium"
                    : "bg-muted/40 border-border text-muted-foreground opacity-60"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Buffer Zones
              </button>

              <button
                type="button"
                onClick={() => setShowExclusionZones((v) => !v)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  showExclusionZones
                    ? "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300 font-medium"
                    : "bg-muted/40 border-border text-muted-foreground opacity-60"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Exclusion
              </button>

              <button
                type="button"
                onClick={() => setShowWaterbodies((v) => !v)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  showWaterbodies
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-medium"
                    : "bg-muted/40 border-border text-muted-foreground opacity-60"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Waterbodies
              </button>
            </div>
          </div>
        </div>

        {/* Project List Items with Click-to-Fly */}
        <div className="flex-1 max-h-[380px] lg:max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {data.projects.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-xs">
              No matching projects found for selected filters.
            </div>
          ) : (
            data.projects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              const progressPct =
                p.targetTrees > 0
                  ? Math.min(100, Math.round((p.plantedTrees / p.targetTrees) * 100))
                  : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProject(p)}
                  className={`glass-card rounded-xl p-3 border transition-all cursor-pointer text-left relative ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">
                          {p.projectType === "agroforestry"
                            ? "🌾"
                            : p.projectType === "urban_greenery"
                            ? "🏙️"
                            : p.projectType === "corporate_csr"
                            ? "🏢"
                            : "🌲"}
                        </span>
                        <h4 className="font-bold text-xs text-foreground truncate">{p.name}</h4>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {p.locationName}
                      </p>
                    </div>

                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase font-bold shrink-0 ${
                        p.status === "active"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : p.status === "under_review"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Progress & Hectares */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        Trees: <strong>{p.plantedTrees.toLocaleString()}</strong> / {p.targetTrees.toLocaleString()}
                      </span>
                      <span>{p.actualAreaHectares} ha</span>
                    </div>
                    <Progress value={progressPct} className="h-1.5" />
                  </div>

                  {/* Compartment count pill */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span>{p.boundaries.length} Compartments</span>
                    <span className="text-primary flex items-center gap-0.5 font-medium">
                      Fly to Map <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Map Viewport */}
      <main className="flex-1 relative rounded-2xl overflow-hidden shadow-lg border border-border/70">
        <GisMapContainer
          center={selectedProject ? selectedProject.centroid : [19.7515, 75.7139]}
          zoom={selectedProject ? 14 : 7}
          height={height}
          fitBounds={selectedProject ? selectedProject.bounds : data.overallBoundingBox}
          className="w-full h-full"
        >
          {/* Custom Map Navigator for Smooth Animation */}
          <ProjectMapNavigator
            targetBounds={navTargetBounds}
            targetCentroid={navTargetCentroid}
            triggerCount={navTrigger}
          />

          {/* Project Boundaries (Polygons) */}
          {visibleBoundaries.map(({ project, boundary }) => {
            const isProjSelected = project.id === selectedProjectId;
            const isCompSelected = boundary.id === selectedCompartmentId;
            const style = getBoundaryStyle(boundary.boundaryType, isProjSelected || isCompSelected);

            return (
              <Polygon
                key={boundary.id}
                positions={boundary.coordinates as any}
                pathOptions={style}
                eventHandlers={{
                  click: () => {
                    handleSelectProject(project);
                    setSelectedCompartmentId(boundary.id);
                  },
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="p-1 text-xs space-y-0.5">
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <span>{boundary.boundaryName}</span>
                      {boundary.compartmentCode && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                          {boundary.compartmentCode}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Type: <strong>{boundary.boundaryType.replace("_", " ")}</strong>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Area: <strong>{boundary.areaHectares} ha</strong> ({boundary.areaAcres} acres)
                    </div>
                    {boundary.targetSpecies && boundary.targetSpecies.length > 0 && (
                      <div className="text-[10px] text-emerald-600 font-medium">
                        Species: {boundary.targetSpecies.join(", ")}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* Project Centroid Markers */}
          {showMarkers &&
            data.projects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              const markerIcon = L.divIcon({
                className: "project-pin-marker",
                html: getProjectMarkerHtml(p, isSelected),
                iconSize: [38, 46],
                iconAnchor: [19, 44],
                popupAnchor: [0, -42],
              });

              return (
                <Marker
                  key={p.id}
                  position={p.centroid}
                  icon={markerIcon}
                  eventHandlers={{
                    click: () => handleSelectProject(p),
                  }}
                >
                  <Popup className="project-gis-popup">
                    <div className="p-1 min-w-[240px] space-y-2 text-foreground">
                      <div className="flex items-start justify-between gap-1.5 border-b pb-1.5">
                        <div>
                          <h4 className="font-heading font-bold text-sm leading-tight text-foreground">
                            {p.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            {p.locationName}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-bold shrink-0"
                        >
                          {p.status}
                        </Badge>
                      </div>

                      {p.organizationName && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{p.organizationName}</span>
                        </div>
                      )}

                      {/* Tree metrics */}
                      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-muted/60 text-xs">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Planted / Target</div>
                          <div className="font-bold text-foreground">
                            {p.plantedTrees.toLocaleString()} / {p.targetTrees.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Area & Survival</div>
                          <div className="font-bold text-emerald-600">
                            {p.actualAreaHectares} ha ({p.survivalRatePct}%)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {p.boundaries.length} Cadastral Compartments
                        </span>
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </GisMapContainer>

        {/* Selected Project Bottom HUD Inspector */}
        {selectedProject && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-6 lg:right-6 z-[1000] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="glass-card bg-background/95 backdrop-blur-xl border border-primary/30 shadow-2xl rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 text-xl">
                  {selectedProject.projectType === "agroforestry"
                    ? "🌾"
                    : selectedProject.projectType === "urban_greenery"
                    ? "🏙️"
                    : selectedProject.projectType === "corporate_csr"
                    ? "🏢"
                    : "🌲"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                      {selectedProject.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20 text-primary">
                      {selectedProject.projectType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    {selectedProject.locationName} &bull; Centroid:{" "}
                    <span className="font-mono text-[11px]">
                      {coordinateToDMS(selectedProject.centroid[0], true)}{" "}
                      {coordinateToDMS(selectedProject.centroid[1], false)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-border/50">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Planted Trees</div>
                    <div className="font-bold text-foreground">
                      {selectedProject.plantedTrees.toLocaleString()} / {selectedProject.targetTrees.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Compartments</div>
                    <div className="font-bold text-emerald-600">
                      {selectedProject.boundaries.length} Zones ({selectedProject.actualAreaHectares} ha)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSatelliteHudOpen(true)}
                    className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <Satellite className="h-3.5 w-3.5" /> Satellite STAC
                  </Button>
                  <Link to={`/projects/${selectedProject.id}`}>
                    <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
                      Open Project <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedProjectId(null)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Satellite Boundary HUD Modal */}
        {selectedProject && isSatelliteHudOpen && (
          <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSatelliteHudOpen(false)}
                className="absolute right-4 top-4 z-10 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
              <ProjectSatelliteBoundaryHUD project={selectedProject} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
