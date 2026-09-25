import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  MapPin,
  TreePine,
  ShieldCheck,
  Calendar,
  Ruler,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Sparkles,
  ChevronRight,
  Layers,
  X,
  Navigation,
  Globe,
  Activity,
  AlertTriangle,
  Building2,
  FolderKanban,
  RotateCcw,
  Clock,
  CalendarDays,
} from "lucide-react";
import {
  RealTreeFeature,
  TreeMapDataResponse,
  fetchRealTreeMapData,
  formatTreeCoordinates,
  getTreeDivIconHtml,
  getTreeMarkerGlowColor,
} from "@/services/treeMapService";
import { GisMapContainer } from "@/components/gis/GisMapContainer";
import {
  BasemapProviderId,
  BoundingBox,
  LatLngTuple,
} from "@/lib/gisMapFoundation";
import { SurvivalStatus, MonitoringStatus, TreeStatus } from "@/types/coreDatabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Smooth Map Navigation Controller
function TreeCoordinateFlyNavigator({
  targetCoord,
  zoom,
  triggerCount,
}: {
  targetCoord: LatLngTuple | null;
  zoom?: number;
  triggerCount: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (triggerCount === 0 || !targetCoord) return;
    if (map && typeof map.flyTo === "function") {
      map.flyTo(targetCoord, zoom || 17, { duration: 1.5 });
    }
  }, [targetCoord, zoom, triggerCount]);

  return null;
}

// Bounding Box Auto-Fitter
function TreeBoundingBoxFitter({
  bounds,
  triggerCount,
}: {
  bounds: BoundingBox | null;
  triggerCount: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (triggerCount === 0 || !bounds) return;
    if (map && typeof map.fitBounds === "function") {
      map.fitBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [50, 50], maxZoom: 16 }
      );
    }
  }, [bounds, triggerCount]);

  return null;
}

export interface TreeMapViewerProps {
  projectId?: string;
  organizationId?: string;
  initialTreeId?: string;
  defaultBasemap?: BasemapProviderId;
  height?: string | number;
  className?: string;
  showFiltersSidebar?: boolean;
  onSelectTree?: (tree: RealTreeFeature | null) => void;
}

export const TreeMapViewer: React.FC<TreeMapViewerProps> = ({
  projectId,
  organizationId,
  initialTreeId,
  defaultBasemap = "google_satellite",
  height = "750px",
  className = "",
  showFiltersSidebar = true,
  onSelectTree,
}) => {
  const [data, setData] = useState<TreeMapDataResponse>({
    trees: [],
    totalTrees: 0,
    verifiedCount: 0,
    aliveCount: 0,
    stressedCount: 0,
    damagedCount: 0,
    deadCount: 0,
    needsReviewCount: 0,
    upToDateCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    criticalOverdueCount: 0,
    overallBoundingBox: null,
    centroid: [19.7515, 75.7139],
    speciesList: [],
    organizationsList: [],
    projectsList: [],
    activeFilterCount: 0,
    isFromDatabase: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 6 Core Filter Dimensions
  const [selectedOrg, setSelectedOrg] = useState<string>(organizationId || "all");
  const [selectedProj, setSelectedProj] = useState<string>(projectId || "all");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monitoringFilter, setMonitoringFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Extra secondary filters
  const [scopeFilter, setScopeFilter] = useState<"all" | "individual" | "institutional">("all");
  const [showAccuracyRings, setShowAccuracyRings] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(initialTreeId || null);
  const [flyCoord, setFlyCoord] = useState<LatLngTuple | null>(null);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Load Tree Map Data with All 6 Filters
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchRealTreeMapData({
        organizationId: selectedOrg,
        projectId: selectedProj,
        species: speciesFilter,
        survivalStatus: statusFilter as any,
        monitoringStatus: monitoringFilter as any,
        dateWindow: dateFilter as any,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        scope: scopeFilter,
        searchQuery,
      });
      setData(response);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedOrg,
    selectedProj,
    speciesFilter,
    statusFilter,
    monitoringFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    scopeFilter,
    searchQuery,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Tree
  const selectedTree = useMemo(
    () => data.trees.find((t) => t.id === selectedTreeId) || null,
    [data.trees, selectedTreeId]
  );

  const handleSelectTree = useCallback(
    (tree: RealTreeFeature | null) => {
      setSelectedTreeId(tree ? tree.id : null);
      onSelectTree?.(tree);
      if (tree) {
        setFlyCoord([tree.latitude, tree.longitude]);
        setFlyTrigger((prev) => prev + 1);
      }
    },
    [onSelectTree]
  );

  const handleResetFilters = useCallback(() => {
    setSelectedOrg("all");
    setSelectedProj("all");
    setSpeciesFilter("all");
    setStatusFilter("all");
    setMonitoringFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setScopeFilter("all");
    setSearchQuery("");
  }, []);

  const handleCopyCoordinates = useCallback((lat: number, lng: number, id: string) => {
    const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(id);
    toast.success(`GPS Coordinates copied: ${formatted}`);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Compute Active Filter Count
  const totalActiveFilters = useMemo(() => {
    let count = 0;
    if (selectedOrg !== "all") count++;
    if (selectedProj !== "all") count++;
    if (speciesFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (monitoringFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (searchQuery.trim()) count++;
    if (scopeFilter !== "all") count++;
    return count;
  }, [selectedOrg, selectedProj, speciesFilter, statusFilter, monitoringFilter, dateFilter, searchQuery, scopeFilter]);

  // Memoized Leaflet DivIcons
  const treeIcons = useMemo(() => {
    const iconMap = new Map<string, L.DivIcon>();
    for (const tree of data.trees) {
      const isSelected = tree.id === selectedTreeId;
      const html = getTreeDivIconHtml(tree, isSelected);
      const icon = L.divIcon({
        className: "custom-tree-marker",
        html,
        iconSize: isSelected ? [28, 28] : [22, 22],
        iconAnchor: isSelected ? [14, 14] : [11, 11],
        popupAnchor: [0, -12],
      });
      iconMap.set(tree.id, icon);
    }
    return iconMap;
  }, [data.trees, selectedTreeId]);

  const cssHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className={`flex flex-col ${showFiltersSidebar ? "lg:flex-row" : ""} gap-4 ${className}`}>
      {/* Search & Filter Sidebar */}
      {showFiltersSidebar && (
        <aside className="w-full lg:w-[420px] flex flex-col gap-3 shrink-0">
          <div className="glass-card rounded-2xl p-4 border border-border/70 shadow-sm space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <TreePine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                    Tree Registry GIS
                    {totalActiveFilters > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-primary/30">
                        {totalActiveFilters} active
                      </Badge>
                    )}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Multi-Dimensional Geospatial MRV</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {totalActiveFilters > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetFilters}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Reset All Filters"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFitTrigger((c) => c + 1)}
                  className="h-7 px-2 text-xs rounded-lg border-border/60"
                  title="Fit Visible Markers"
                >
                  <Compass className="w-3 h-3 mr-1 text-primary" />
                  Fit
                </Button>
              </div>
            </div>

            {/* Real-time Coordinate & Text Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by code, species, or lat, lng..."
                className="pl-9 h-8 text-xs rounded-xl bg-background/70 border-border/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 6-DIMENSION FILTER CONTROLS */}
            <div className="space-y-2.5">
              {/* Filter 1 & 2: Organization & Project */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-primary" />
                    Organization
                  </label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {data.organizationsList.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.treeCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-primary" />
                    Project
                  </label>
                  <Select value={selectedProj} onValueChange={setSelectedProj}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {data.projectsList.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          {proj.name} ({proj.treeCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter 3 & 4: Species & Tree Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <TreePine className="w-3 h-3 text-primary" />
                    Species
                  </label>
                  <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Species" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Species ({data.speciesList.length})</SelectItem>
                      {data.speciesList.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-primary" />
                    Tree Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ALIVE">🟢 Alive ({data.aliveCount})</SelectItem>
                      <SelectItem value="STRESSED">🟡 Stressed ({data.stressedCount})</SelectItem>
                      <SelectItem value="DAMAGED">🟠 Damaged ({data.damagedCount})</SelectItem>
                      <SelectItem value="DEAD">🔴 Dead ({data.deadCount})</SelectItem>
                      <SelectItem value="NEEDS_REVIEW">🟣 Review ({data.needsReviewCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter 5 & 6: Monitoring Status & Date Window */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    Monitoring Status
                  </label>
                  <Select value={monitoringFilter} onValueChange={setMonitoringFilter}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cadence</SelectItem>
                      <SelectItem value="up_to_date">✅ Up to Date ({data.upToDateCount})</SelectItem>
                      <SelectItem value="due_soon">⏳ Due Soon ({data.dueSoonCount})</SelectItem>
                      <SelectItem value="overdue">⚠️ Overdue ({data.overdueCount})</SelectItem>
                      <SelectItem value="critical_overdue">🚨 Critical ({data.criticalOverdueCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-primary" />
                    Date Window
                  </label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background/60">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="7d">Past 7 Days</SelectItem>
                      <SelectItem value="30d">Past 30 Days</SelectItem>
                      <SelectItem value="90d">Past 90 Days</SelectItem>
                      <SelectItem value="1y">Past 1 Year</SelectItem>
                      <SelectItem value="custom">📅 Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Inputs if 'custom' is active */}
              {dateFilter === "custom" && (
                <div className="p-2.5 bg-muted/40 rounded-xl border border-border/50 grid grid-cols-2 gap-2 animate-in fade-in">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-0.5">Start Date</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-7 text-xs rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-0.5">End Date</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-7 text-xs rounded-lg bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border/50 text-center">
              <div className="p-1.5 rounded-lg bg-muted/40">
                <span className="text-[9px] text-muted-foreground block">Total</span>
                <span className="font-bold text-xs text-foreground">{data.totalTrees}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block">Alive</span>
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">{data.aliveCount}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[9px] text-amber-600 dark:text-amber-400 block">Stressed</span>
                <span className="font-bold text-xs text-amber-700 dark:text-amber-300">{data.stressedCount}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[9px] text-rose-600 dark:text-rose-400 block">Overdue</span>
                <span className="font-bold text-xs text-rose-700 dark:text-rose-300">{data.overdueCount + data.criticalOverdueCount}</span>
              </div>
            </div>

            {/* Accuracy Rings Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="acc-rings">
                GPS Accuracy Buffers (±m)
              </Label>
              <Switch
                id="acc-rings"
                checked={showAccuracyRings}
                onCheckedChange={setShowAccuracyRings}
              />
            </div>
          </div>

          {/* Filtered Trees List Drawer */}
          <div className="flex-1 max-h-[340px] overflow-y-auto space-y-2 pr-1">
            {data.trees.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-xs space-y-2">
                <TreePine className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p>No trees matching the active 6-filter criteria.</p>
                {totalActiveFilters > 0 && (
                  <Button size="sm" variant="outline" onClick={handleResetFilters} className="h-7 text-xs">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              data.trees.map((t) => {
                const isSelected = t.id === selectedTreeId;
                const statusColor = getTreeMarkerGlowColor(t.survivalStatus, t.verificationStatus);

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTree(t)}
                    className={`glass-card rounded-xl p-3 border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: statusColor }}
                          />
                          <h4 className="font-bold text-xs text-foreground truncate">
                            {t.treeName}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic truncate mt-0.5">
                          {t.species}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase font-bold shrink-0"
                          style={{ color: statusColor, borderColor: statusColor + "40" }}
                        >
                          {t.survivalStatus}
                        </Badge>
                        {t.monitoringStatus && (
                          <span className="text-[9px] text-muted-foreground capitalize">
                            {t.monitoringStatus.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Geodetic Coordinates Pill */}
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        {t.latitude.toFixed(6)}°, {t.longitude.toFixed(6)}°
                      </span>
                      {t.organizationName && (
                        <span className="font-sans text-[9px] text-muted-foreground truncate max-w-[110px]">
                          {t.organizationName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Map Canvas */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-border/80 shadow-xl bg-slate-950 min-h-[550px]" style={{ height: cssHeight }}>
        <GisMapContainer
          defaultCenter={data.centroid}
          defaultZoom={12}
          defaultBasemap={defaultBasemap}
          className="w-full h-full"
          showBasemapControl={true}
          showScaleControl={true}
          showCoordinatesControl={true}
        >
          {/* Controllers */}
          <TreeCoordinateFlyNavigator targetCoord={flyCoord} zoom={18} triggerCount={flyTrigger} />
          <TreeBoundingBoxFitter bounds={data.overallBoundingBox} triggerCount={fitTrigger} />

          {/* Accuracy Buffer Circles */}
          {showAccuracyRings &&
            data.trees.map((tree) => {
              if (!tree.gpsAccuracyMeters) return null;
              const color = getTreeMarkerGlowColor(tree.survivalStatus, tree.verificationStatus);
              return (
                <Circle
                  key={`acc-${tree.id}`}
                  center={[tree.latitude, tree.longitude]}
                  radius={tree.gpsAccuracyMeters}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.12,
                    weight: 1,
                    dashArray: "3, 3",
                  }}
                />
              );
            })}

          {/* Real Tree Markers */}
          {data.trees.map((tree) => {
            const icon = treeIcons.get(tree.id);
            if (!icon) return null;

            return (
              <Marker
                key={tree.id}
                position={[tree.latitude, tree.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => handleSelectTree(tree),
                }}
              >
                <Popup className="real-tree-popup">
                  <div className="p-3 min-w-[260px] max-w-[320px] font-sans text-slate-800">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-emerald-900 leading-tight">
                          {tree.treeName}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {tree.treeCode || tree.id}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold"
                        style={{
                          borderColor: getTreeMarkerGlowColor(tree.survivalStatus, tree.verificationStatus),
                          color: getTreeMarkerGlowColor(tree.survivalStatus, tree.verificationStatus),
                        }}
                      >
                        {tree.survivalStatus}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="italic text-slate-700">{tree.species}</div>
                      {tree.organizationName && (
                        <div className="text-[11px] text-slate-600">
                          Org: <span className="font-medium text-slate-800">{tree.organizationName}</span>
                        </div>
                      )}
                      {tree.projectName && (
                        <div className="text-[11px] text-slate-600">
                          Project: <span className="font-medium text-slate-800">{tree.projectName}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600">
                        Monitoring: <span className="font-medium text-slate-800 capitalize">{tree.monitoringStatus?.replace("_", " ") || "Up to date"}</span>
                      </div>
                    </div>

                    {/* Geodetic Coordinates Section */}
                    <div className="mt-2.5 pt-2 border-t text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Coordinates:</span>
                        <span className="font-mono text-slate-800 text-[10px]">
                          {tree.latitude.toFixed(6)}°, {tree.longitude.toFixed(6)}°
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">GPS Accuracy:</span>
                        <span className="font-semibold text-emerald-700">±{tree.gpsAccuracyMeters}m</span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-3 pt-2 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCoordinates(tree.latitude, tree.longitude, tree.id)}
                        className="h-7 text-[10px] px-2 flex-1"
                      >
                        {copiedId === tree.id ? (
                          <Check className="w-3 h-3 mr-1 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 mr-1 text-slate-500" />
                        )}
                        {copiedId === tree.id ? "Copied" : "Copy GPS"}
                      </Button>
                      <a
                        href={formatTreeCoordinates(tree.latitude, tree.longitude).googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-7 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </GisMapContainer>

        {/* Selected Tree Bottom HUD Inspector */}
        {selectedTree && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-6 lg:right-6 z-[1000] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="glass-card bg-background/95 backdrop-blur-xl border border-primary/30 shadow-2xl rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border"
                  style={{
                    backgroundColor: getTreeMarkerGlowColor(selectedTree.survivalStatus) + "20",
                    borderColor: getTreeMarkerGlowColor(selectedTree.survivalStatus) + "40",
                  }}
                >
                  <TreePine
                    className="h-5 w-5"
                    style={{ color: getTreeMarkerGlowColor(selectedTree.survivalStatus) }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                      {selectedTree.treeName}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold"
                      style={{
                        color: getTreeMarkerGlowColor(selectedTree.survivalStatus),
                        borderColor: getTreeMarkerGlowColor(selectedTree.survivalStatus) + "40",
                      }}
                    >
                      {selectedTree.survivalStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    {selectedTree.locationName} &bull; GPS:{" "}
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {selectedTree.latitude.toFixed(6)}°, {selectedTree.longitude.toFixed(6)}°
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-border/50">
                <div className="text-xs font-mono">
                  {selectedTree.heightCm && (
                    <span>
                      Height: <strong>{selectedTree.heightCm} cm</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/tree/${selectedTree.id}`}>
                    <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
                      View Passport <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTreeId(null)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
