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
  height?: number;
  onNext?: () => void;
  onUseGps?: () => void;
}

const BoundaryDrawMap = ({ points, onChange, center, height = 380, onNext, onUseGps }: Props) => {
  const areas = useMemo(() => computeAreas(points), [points]);
  const canProceed = points.length >= 3;

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/40">
      <MapContainer
        center={points[0] ?? center}
        zoom={points.length ? 16 : 6}
        scrollWheelZoom
        style={{ height, width: "100%" }}
      >
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
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

      {/* Floating control bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center justify-center gap-2 rounded-full bg-card/85 backdrop-blur-xl border border-border/40 shadow-lg px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-3"
          disabled={points.length === 0}
          onClick={() => onChange(points.slice(0, -1))}
        >
          <Undo2 className="h-4 w-4 mr-1.5" /> Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-3"
          disabled={points.length === 0}
          onClick={() => onChange([])}
        >
          <Trash2 className="h-4 w-4 mr-1.5" /> Clear
        </Button>
        {onUseGps && (
          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full px-3" onClick={onUseGps}>
            <MapPin className="h-4 w-4 mr-1.5" /> GPS
          </Button>
        )}
        {onNext && (
          <Button type="button" size="sm" className="h-8 rounded-full px-4" disabled={!canProceed} onClick={onNext}>
            Next <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Floating bottom area card */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-2xl bg-card/85 backdrop-blur-xl border border-border/40 shadow-lg px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Enclosed area</div>
          <div className="font-heading text-lg font-bold text-primary leading-tight">
            {areas.acres.toFixed(2)} acres
          </div>
          <div className="text-xs text-muted-foreground">{areas.hectares.toFixed(3)} hectares</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Points</div>
          <div className="font-heading text-lg font-bold">{points.length}</div>
          {!canProceed && <div className="text-[11px] text-muted-foreground">Tap map to add 3+</div>}
        </div>
      </div>
    </div>
  );
};

export default BoundaryDrawMap;
