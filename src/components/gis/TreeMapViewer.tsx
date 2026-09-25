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
import { SurvivalStatus } from "@/types/coreDatabase";
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

export interface TreeMapViewerProps {
  initialTreeId?: string;
  projectId?: string;
  onSelectTree?: (tree: RealTreeFeature | null) => void;
  height?: string | number;
  className?: string;
  showFiltersSidebar?: boolean;
}

export const TreeMapViewer: React.FC<TreeMapViewerProps> = ({
  initialTreeId,
  projectId,
  onSelectTree,
  height = "700px",
  className = "",
  showFiltersSidebar = true,
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
    overallBoundingBox: null,
    centroid: [19.7515, 75.7139],
    speciesList: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "individual" | "institutional">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showAccuracyRings, setShowAccuracyRings] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(initialTreeId || null);
  const [flyCoord, setFlyCoord] = useState<LatLngTuple | null>(null);
  const [flyTrigger, setFlyTrigger] = useState(0);

  // Load Tree Map Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchRealTreeMapData({
        scope: scopeFilter,
        survivalStatus: statusFilter as any,
        growthStage: stageFilter as any,
        species: speciesFilter,
        dateWindow: dateFilter as any,
        searchQuery,
        projectId,
      });
      setData(response);
    } finally {
      setIsLoading(false);
    }
  }, [scopeFilter, statusFilter, stageFilter, speciesFilter, dateFilter, searchQuery, projectId]);

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

  const handleCopyCoordinates = useCallback((lat: number, lng: number, id: string) => {
    const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(id);
    toast.success(`GPS Coordinates copied: ${formatted}`);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className={`flex flex-col ${showFiltersSidebar ? "lg:flex-row" : ""} gap-4 ${className}`}>
      {/* Search & Filter Sidebar */}
      {showFiltersSidebar && (
        <aside className="w-full lg:w-96 flex flex-col gap-3 shrink-0">
          <div className="glass-card rounded-2xl p-4 border border-border/70 shadow-sm space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-bold text-base text-foreground">
                  Tree Registry GIS
                </h3>
              </div>
              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-xs">
                {data.totalTrees} Trees
              </Badge>
            </div>

            {/* Real-time Coordinate & Text Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by code, species, or lat, lng..."
                className="pl-9 h-9 text-xs rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Scope Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Planted Domain
              </label>
              <Select value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 All Plantations ({data.totalTrees})</SelectItem>
                  <SelectItem value="individual">🌿 Individual Plantations</SelectItem>
                  <SelectItem value="institutional">🏢 Institutional & Plots</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Survival Status & Growth Stage */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Survival Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
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

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Growth Stage
                </label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="sapling">🌱 Sapling (&lt;100 cm)</SelectItem>
                    <SelectItem value="young">🌿 Young (100–300 cm)</SelectItem>
                    <SelectItem value="mature">🌳 Mature (300+ cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Native Species Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Tree Species
              </label>
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All Species" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Planted Species ({data.speciesList.length})</SelectItem>
                  {data.speciesList.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Real Tree Items List with GPS Coordinates */}
          <div className="flex-1 max-h-[380px] lg:max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {data.trees.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-xs">
                No matching trees with real GPS coordinates found.
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

                      <Badge
                        variant="secondary"
                        className="text-[9px] uppercase font-bold shrink-0"
                        style={{ color: statusColor, borderColor: statusColor + "40" }}
                      >
                        {t.survivalStatus}
                      </Badge>
                    </div>

                    {/* Geodetic Coordinates Pill */}
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        {t.latitude.toFixed(6)}°, {t.longitude.toFixed(6)}°
                      </span>
                      {t.heightCm && (
                        <span className="font-sans font-semibold text-foreground">
                          {t.heightCm} cm
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

      {/* Main Map Viewport */}
      <main className="flex-1 relative rounded-2xl overflow-hidden shadow-lg border border-border/70">
        <GisMapContainer
          center={selectedTree ? [selectedTree.latitude, selectedTree.longitude] : data.centroid}
          zoom={selectedTree ? 17 : data.trees.length > 0 ? 9 : 7}
          height={height}
          fitBounds={data.overallBoundingBox}
          className="w-full h-full"
        >
          {/* Smooth Coordinate Fly Controller */}
          <TreeCoordinateFlyNavigator
            targetCoord={flyCoord}
            zoom={17}
            triggerCount={flyTrigger}
          />

          {/* Real Tree Markers & Accuracy Circles */}
          {data.trees.map((t) => {
            const isSelected = t.id === selectedTreeId;
            const statusColor = getTreeMarkerGlowColor(t.survivalStatus, t.verificationStatus);
            const { decimal, dms, googleMapsUrl } = formatTreeCoordinates(t.latitude, t.longitude);

            const treeIcon = L.divIcon({
              className: "real-tree-pin",
              html: getTreeDivIconHtml(t, isSelected),
              iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
              iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11],
              popupAnchor: [0, -12],
            });

            return (
              <React.Fragment key={t.id}>
                {/* GPS Accuracy Buffer Circle */}
                {showAccuracyRings && (
                  <Circle
                    center={[t.latitude, t.longitude]}
                    radius={t.gpsAccuracyMeters || 5.0}
                    pathOptions={{
                      color: statusColor,
                      fillColor: statusColor,
                      fillOpacity: isSelected ? 0.25 : 0.1,
                      weight: isSelected ? 2 : 1,
                      dashArray: "3, 3",
                    }}
                  />
                )}

                {/* Tree Marker Pin */}
                <Marker
                  position={[t.latitude, t.longitude]}
                  icon={treeIcon}
                  eventHandlers={{
                    click: () => handleSelectTree(t),
                  }}
                >
                  <Popup className="real-tree-popup">
                    <div className="p-1 min-w-[240px] max-w-[280px] space-y-2 text-foreground">
                      {/* Photo Thumbnail */}
                      {t.photoUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-border/60 shadow-sm h-32 w-full">
                          <img
                            src={t.photoUrl}
                            alt={t.treeName}
                            className="w-full h-full object-cover"
                          />
                          <Badge
                            className="absolute bottom-1.5 left-1.5 text-[9px] font-bold shadow-md"
                            style={{ backgroundColor: statusColor, color: "#ffffff" }}
                          >
                            {t.survivalStatus}
                          </Badge>
                        </div>
                      )}

                      <div className="border-b pb-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-heading font-bold text-sm text-foreground leading-tight">
                            {t.treeName}
                          </h4>
                          {t.treeCode && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0 font-mono">
                              {t.treeCode}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">
                          {t.species}
                        </p>
                      </div>

                      {/* Real GPS Telemetry Box */}
                      <div className="p-2 rounded-xl bg-muted/60 space-y-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1 font-bold text-foreground">
                            <MapPin className="h-3 w-3 text-primary" />
                            GPS Coordinates
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCoordinates(t.latitude, t.longitude, t.id)}
                            className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
                          >
                            {copiedId === t.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedId === t.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="text-foreground font-semibold">{decimal}</div>
                        <div className="text-[10px] text-muted-foreground">{dms}</div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                          <span>Accuracy: ±{t.gpsAccuracyMeters}m</span>
                          {t.elevationMeters && <span>Elev: {t.elevationMeters}m</span>}
                        </div>
                      </div>

                      {/* Biometrics */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {t.heightCm && (
                          <div className="p-1.5 rounded-lg bg-muted/40">
                            <div className="text-[10px] text-muted-foreground">Height</div>
                            <div className="font-bold text-foreground">{t.heightCm} cm</div>
                          </div>
                        )}
                        {t.dbhCm && (
                          <div className="p-1.5 rounded-lg bg-muted/40">
                            <div className="text-[10px] text-muted-foreground">DBH</div>
                            <div className="font-bold text-foreground">{t.dbhCm} cm</div>
                          </div>
                        )}
                      </div>

                      {/* Deep Links */}
                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                        >
                          <Navigation className="h-3 w-3 text-primary" /> Google Maps
                        </a>

                        <Link to={`/tree/${t.id}`}>
                          <Button size="sm" className="h-7 text-xs font-semibold gap-1">
                            Digital Passport <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
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
                    size="icon"
                    onClick={() => setSelectedTreeId(null)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
