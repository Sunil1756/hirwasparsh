import { useState, useMemo, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import {
  Undo2,
  Trash2,
  ArrowRight,
  MapPin,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchGeocodingLocations,
  GeocodingResult,
  validateGeodeticBoundary,
} from "@/lib/projectOnboardingService";
import { parseKmlString, parseGeoJsonString } from "@/lib/kmlParser";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

const YELLOW = "#FACC15";

const ClickCatcher = ({ onAdd }: { onAdd: (pt: LatLng) => void }) => {
  useMapEvents({
    click: (e) => onAdd([e.latlng.lat, e.latlng.lng]),
  });
  return null;
};

// Map center & bounds controller
function MapFlyController({ target, zoom }: { target: LatLng | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target && !isNaN(target[0]) && !isNaN(target[1])) {
      map.flyTo(target, zoom || 16, { duration: 1.2 });
    }
  }, [target, zoom, map]);
  return null;
}

export const computeAreas = (points: LatLng[]) => {
  if (points.length < 3) return { sqm: 0, hectares: 0, acres: 0 };
  const ring = [...points, points[0]].map(([lat, lng]) => [lng, lat]);
  try {
    const sqm = area(turfPolygon([ring]));
    return { sqm, hectares: sqm / 10000, acres: sqm / 4046.8564224 };
  } catch {
    return { sqm: 0, hectares: 0, acres: 0 };
  }
};

interface Props {
  points: LatLng[];
  onChange: (pts: LatLng[]) => void;
  center: LatLng;
  height?: string | number;
  onNext?: () => void;
  onUseGps?: () => void;
}

const BoundaryDrawMap = ({ points, onChange, center, height, onNext, onUseGps }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);

  const areas = useMemo(() => computeAreas(points), [points]);
  const validation = useMemo(() => validateGeodeticBoundary(points), [points]);
  const canProceed = points.length >= 3 && validation.isValid;
  const mapHeight = height ?? "min(70vh, 720px)";

  // Handle Geocoding Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchGeocodingLocations(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast.error(`No locations found for "${searchQuery}".`);
      } else if (results.length === 1) {
        const first = results[0];
        setFlyTarget([first.lat, first.lng]);
        setSearchResults([]);
        toast.success(`Found: ${first.displayName.split(",")[0]}`);
      }
    } catch {
      toast.error("Geocoding service unavailable.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: GeocodingResult) => {
    setFlyTarget([item.lat, item.lng]);
    setSearchResults([]);
    setSearchQuery(item.displayName.split(",")[0]);
    toast.success(`Navigated to ${item.displayName.split(",")[0]}`);
  };

  // Handle File Upload (KML / GeoJSON)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let res;
      if (file.name.endsWith(".kml") || file.name.endsWith(".xml")) {
        res = parseKmlString(text, file.name);
      } else if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        res = parseGeoJsonString(text, file.name);
      } else {
        throw new Error("Unsupported format. Use .kml or .geojson");
      }

      if (res && res.polygonCoords?.length >= 3) {
        onChange(res.polygonCoords);
        setFlyTarget(res.centerCoords);
        toast.success(`Imported ${res.acres} Acres from ${file.name}`);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-border/40 shadow-sm"
      style={{ minHeight: mapHeight }}
    >
      {/* Top Search & Navigation Toolbar */}
      <div className="absolute top-2.5 left-2.5 z-[1000] w-[calc(100%-140px)] max-w-sm">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            placeholder="Search village, city, or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full bg-card/95 backdrop-blur-xl border border-border/40 pl-8 pr-8 text-xs shadow-md focus-visible:ring-primary"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-primary" />
          )}
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-card/95 backdrop-blur-xl border border-border/40 p-1 shadow-lg text-xs">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(res)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors truncate"
              >
                <div className="font-semibold text-foreground truncate">{res.displayName.split(",")[0]}</div>
                <div className="text-[10px] text-muted-foreground truncate">{res.displayName}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={points[0] ?? center}
        zoom={points.length ? 16 : 6}
        scrollWheelZoom
        style={{ height: mapHeight, width: "100%" }}
      >
        <MapFlyController target={flyTarget} />
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        {/* Hybrid label overlay: place names, roads and district borders */}
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <ClickCatcher onAdd={(pt) => onChange([...points, pt])} />

        {points.length >= 3 && (
          <Polygon
            positions={points}
            pathOptions={{
              color: validation.isValid ? YELLOW : "#ef4444",
              weight: 3,
              fillColor: validation.isValid ? YELLOW : "#ef4444",
              fillOpacity: 0.22,
            }}
          />
        )}
        {points.length === 2 && (
          <Polyline positions={points} pathOptions={{ color: YELLOW, weight: 3 }} />
        )}
        {points.map((pt, i) => (
          <CircleMarker
            key={`${pt[0]}-${pt[1]}-${i}`}
            center={pt}
            radius={6}
            pathOptions={{ color: "#fff", weight: 2, fillColor: YELLOW, fillOpacity: 1 }}
          />
        ))}
      </MapContainer>

      {/* Compact toolbar docked top-right */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-xl border border-border/40 shadow-md px-1.5 py-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml, .geojson, .json, .xml"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
          title="Import KML/GeoJSON"
        >
          <Upload className="h-4 w-4 text-primary" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs"
          disabled={points.length === 0}
          onClick={() => onChange(points.slice(0, -1))}
          title="Undo last point"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs text-destructive hover:bg-destructive/10"
          disabled={points.length === 0}
          onClick={() => onChange([])}
          title="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        {onUseGps && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-2.5 text-xs"
            onClick={onUseGps}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        )}
        {onNext && (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!canProceed}
            onClick={onNext}
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Geodetic Area & Validation Strip */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] rounded-2xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 truncate">
          {validation.isValid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : points.length >= 3 ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Compass className="h-4 w-4 text-primary shrink-0" />
          )}

          <div className="truncate">
            <span className="font-heading font-bold text-foreground">
              {areas.acres.toFixed(2)} Acres
            </span>
            <span className="text-muted-foreground ml-1.5 font-medium">
              ({areas.hectares.toFixed(3)} Ha · {areas.sqm.toFixed(0)} m²)
            </span>
            {!validation.isValid && points.length >= 3 && (
              <span className="text-amber-500 font-medium ml-2 hidden sm:inline">
                {validation.errorMessage}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>{points.length} vertices</span>
          {points.length < 3 && <span className="text-primary font-medium">Click map to plot</span>}
        </div>
      </div>
    </div>
  );
};

export default BoundaryDrawMap;
