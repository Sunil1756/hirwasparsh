import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import { Undo2, Trash2, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

const YELLOW = "#FACC15";

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
  onNext?: () => void;
  onUseGps?: () => void;
}

const BoundaryDrawMap = ({ points, onChange, center, height, onNext, onUseGps }: Props) => {
  const areas = useMemo(() => computeAreas(points), [points]);
  const canProceed = points.length >= 3;
  const mapHeight = height ?? "min(70vh, 720px)";

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border/40" style={{ minHeight: mapHeight }}>
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
            pathOptions={{ color: YELLOW, weight: 3, fillColor: YELLOW, fillOpacity: 0.22 }}
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
      <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-xl border border-border/40 shadow-md px-1.5 py-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs"
          disabled={points.length === 0}
          onClick={() => onChange(points.slice(0, -1))}
        >
          <Undo2 className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Undo</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-2.5 text-xs"
          disabled={points.length === 0}
          onClick={() => onChange([])}
        >
          <Trash2 className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Clear</span>
        </Button>
        {onUseGps && (
          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full px-2.5 text-xs" onClick={onUseGps}>
            <MapPin className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">GPS</span>
          </Button>
        )}
        {onNext && (
          <Button type="button" size="sm" className="h-8 rounded-full px-3 text-xs" disabled={!canProceed} onClick={onNext}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Slim bottom summary strip */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] rounded-full bg-card/90 backdrop-blur-xl border border-border/40 shadow-md px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <span className="truncate">
          <span className="text-muted-foreground">Area </span>
          <span className="font-heading font-bold text-primary">{areas.acres.toFixed(2)} ac</span>
          <span className="text-muted-foreground"> · {areas.hectares.toFixed(3)} ha</span>
        </span>
        <span className="shrink-0">
          <span className="text-muted-foreground">Points </span>
          <span className="font-heading font-bold">{points.length}</span>
          {!canProceed && <span className="text-muted-foreground"> · tap to add 3+</span>}
        </span>
      </div>
    </div>
  );
};


export default BoundaryDrawMap;
