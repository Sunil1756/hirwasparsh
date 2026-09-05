import { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import {
  Undo2,
  Trash2,
  ArrowRight,
  MapPin,
  Sparkles,
  TreePine,
  CheckCircle2,
  Scan,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  detectTreesInBoundary,
  BoundaryDetectionResult,
  LatLng,
} from "@/lib/boundaryTreeDetection";
import "leaflet/dist/leaflet.css";

const YELLOW = "#FACC15";
const EMERALD = "#10B981";

// Glowing tree icon for trees detected inside the boundary
const detectedTreeIcon = L.divIcon({
  className: "detected-tree-pin",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 10px #10b981"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const ClickCatcher = ({ onAdd }: { onAdd: (pt: LatLng) => void }) => {
  useMapEvents({
    click: (e) => onAdd([e.latlng.lat, e.latlng.lng]),
  });
  return null;
};

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
  trees?: Array<{ id: string; tree_name?: string; species?: string; latitude?: number | null; longitude?: number | null; verification_status?: string }>;
  bulkData?: Array<Record<string, any>>;
  onNext?: () => void;
  onUseGps?: () => void;
  onDetectedTreeCount?: (count: number) => void;
}

const BoundaryDrawMap = ({
  points,
  onChange,
  center,
  height,
  trees = [],
  bulkData = [],
  onNext,
  onUseGps,
  onDetectedTreeCount,
}: Props) => {
  const [showDetectionCard, setShowDetectionCard] = useState(true);
  const [showTreePins, setShowTreePins] = useState(true);

  const areas = useMemo(() => computeAreas(points), [points]);
  const canProceed = points.length >= 3;
  const mapHeight = height ?? "min(70vh, 720px)";

  // Automated Real-Time Tree Detection within Boundary
  const detectionResult: BoundaryDetectionResult | null = useMemo(() => {
    if (points.length < 3) return null;
    return detectTreesInBoundary({
      boundary: points,
      trees,
      bulkData,
      baselineNdvi: 0.54,
      canopyCoverage: 45,
    });
  }, [points, trees, bulkData]);

  const handleApplyDetectedCount = () => {
    if (detectionResult && onDetectedTreeCount) {
      onDetectedTreeCount(detectionResult.totalDetectedCount);
    }
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-border/40 shadow-sm"
      style={{ minHeight: mapHeight }}
    >
      <MapContainer
        center={points[0] ?? center}
        zoom={points.length ? 16 : 6}
        scrollWheelZoom
        style={{ height: mapHeight, width: "100%" }}
      >
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
              color: detectionResult ? EMERALD : YELLOW,
              weight: 3.5,
              fillColor: detectionResult ? EMERALD : YELLOW,
              fillOpacity: 0.25,
            }}
          />
        )}

        {points.length === 2 && (
          <Polyline positions={points} pathOptions={{ color: YELLOW, weight: 3 }} />
        )}

        {/* Boundary Vertex Circles */}
        {points.map((pt, i) => (
          <CircleMarker
            key={`${pt[0]}-${pt[1]}-${i}`}
            center={pt}
            radius={6}
            pathOptions={{ color: "#fff", weight: 2, fillColor: detectionResult ? EMERALD : YELLOW, fillOpacity: 1 }}
          />
        ))}

        {/* Detected Trees inside boundary Pins */}
        {showTreePins &&
          detectionResult &&
          detectionResult.insideTrees.map((t) => (
            <Marker key={t.id} position={[t.latitude, t.longitude]} icon={detectedTreeIcon}>
              <Popup>
                <div className="p-1 text-xs space-y-0.5">
                  <strong className="text-sm font-heading block text-emerald-600">🌳 {t.name}</strong>
                  <p className="text-muted-foreground">{t.species}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
                  </p>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 mt-1">
                    Inside Boundary
                  </Badge>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Top-Right Floating Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-wrap items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-xl border border-border/40 shadow-md px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs"
          disabled={points.length === 0}
          onClick={() => onChange(points.slice(0, -1))}
        >
          <Undo2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Undo</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs text-destructive hover:text-destructive"
          disabled={points.length === 0}
          onClick={() => onChange([])}
        >
          <Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Clear</span>
        </Button>
        {onUseGps && (
          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-xs text-primary" onClick={onUseGps}>
            <MapPin className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">GPS</span>
          </Button>
        )}
        {onNext && (
          <Button type="button" size="sm" className="h-8 rounded-full px-3.5 text-xs font-semibold" disabled={!canProceed} onClick={onNext}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Floating Tree Detection Scorecard (Appears when >= 3 points are marked) */}
      {detectionResult && (
        <div className="absolute top-3 left-3 z-[1000] max-w-xs sm:max-w-sm rounded-2xl bg-card/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <Scan className="h-4 w-4" />
              </span>
              <div>
                <h4 className="font-heading font-bold text-xs text-foreground">Boundary Tree Detection</h4>
                <p className="text-[10px] text-muted-foreground">{areas.acres.toFixed(2)} Acres · Sentinel-2 Spatial Match</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 font-bold">
              {detectionResult.confidencePercent}% Confidence
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] text-muted-foreground">Trees in Boundary</div>
              <div className="font-heading font-extrabold text-xl text-emerald-600">
                {detectionResult.totalDetectedCount}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {detectionResult.insideGeotaggedCount > 0 ? "Geotagged Database Pins" : "Canopy Spectral Census"}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-primary/5 border border-primary/15">
              <div className="text-[10px] text-muted-foreground">Canopy Density</div>
              <div className="font-heading font-extrabold text-xl text-primary">
                {detectionResult.densityPerAcre}
              </div>
              <div className="text-[9px] text-muted-foreground">Trees per Acre</div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            {detectionResult.diagnosticSummary}
          </p>

          {onDetectedTreeCount && (
            <Button
              type="button"
              size="sm"
              onClick={handleApplyDetectedCount}
              className="w-full h-7 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Sync Count ({detectionResult.totalDetectedCount} Trees) to Target
            </Button>
          )}
        </div>
      )}

      {/* Slim Bottom Summary Strip */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-full bg-card/90 backdrop-blur-xl border border-border/40 shadow-md px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <span className="truncate flex items-center gap-2">
          <span className="text-muted-foreground">Plot Area:</span>
          <span className="font-heading font-bold text-primary">{areas.acres.toFixed(2)} ac</span>
          <span className="text-muted-foreground">({areas.hectares.toFixed(3)} ha · {Math.round(areas.sqm).toLocaleString()} m²)</span>
        </span>
        <span className="shrink-0 flex items-center gap-2">
          {detectionResult ? (
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <TreePine className="h-3.5 w-3.5" /> {detectionResult.totalDetectedCount} Trees Detected
            </span>
          ) : (
            <span className="text-muted-foreground">Points: <strong>{points.length}</strong> (tap 3+ to detect trees)</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default BoundaryDrawMap;
