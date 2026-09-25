import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ScaleControl,
  ZoomControl,
} from "react-leaflet";
import {
  Layers,
  Maximize2,
  Minimize2,
  Compass,
  RotateCcw,
  MapPin,
  Check,
} from "lucide-react";
import {
  BASEMAP_PROVIDERS,
  BasemapProviderId,
  LatLngTuple,
  coordinateToDMS,
  isValidCoordinate,
  BoundingBox,
} from "@/lib/gisMapFoundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import L from "leaflet";

if (typeof window !== "undefined" && L && (L as any).Icon && (L as any).Icon.Default) {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  } catch {
    // Ignore in test/SSR environments
  }
}

interface ResizeHandlerProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

function MapResizeObserver({ containerRef }: ResizeHandlerProps) {
  const map = useMap();

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (typeof window !== "undefined" && typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          if (map && typeof map.invalidateSize === "function") {
            map.invalidateSize();
          }
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  return null;
}

interface CursorTrackerProps {
  onCursorMove: (latLng: LatLngTuple | null) => void;
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bbox: BoundingBox) => void;
}

function MapTelemetryTracker({
  onCursorMove,
  onZoomChange,
  onBoundsChange,
}: CursorTrackerProps) {
  const map = useMap();

  useMapEvents({
    mousemove: (e) => {
      if (e?.latlng) {
        onCursorMove([e.latlng.lat, e.latlng.lng]);
      }
    },
    mouseout: () => {
      onCursorMove(null);
    },
    zoomend: () => {
      if (map && typeof map.getZoom === "function") {
        onZoomChange(map.getZoom());
      }
      if (map && typeof map.getBounds === "function") {
        const bounds = map.getBounds();
        if (bounds && typeof bounds.getSouth === "function") {
          onBoundsChange({
            minLat: bounds.getSouth(),
            minLng: bounds.getWest(),
            maxLat: bounds.getNorth(),
            maxLng: bounds.getEast(),
          });
        }
      }
    },
    moveend: () => {
      if (map && typeof map.getBounds === "function") {
        const bounds = map.getBounds();
        if (bounds && typeof bounds.getSouth === "function") {
          onBoundsChange({
            minLat: bounds.getSouth(),
            minLng: bounds.getWest(),
            maxLat: bounds.getNorth(),
            maxLng: bounds.getEast(),
          });
        }
      }
    },
  });

  useEffect(() => {
    if (map && typeof map.getZoom === "function") {
      onZoomChange(map.getZoom());
    }
    if (map && typeof map.getBounds === "function") {
      const bounds = map.getBounds();
      if (bounds && typeof bounds.getSouth === "function") {
        onBoundsChange({
          minLat: bounds.getSouth(),
          minLng: bounds.getWest(),
          maxLat: bounds.getNorth(),
          maxLng: bounds.getEast(),
        });
      }
    }
  }, []);

  return null;
}

interface MapViewControllerProps {
  center?: LatLngTuple;
  zoom?: number;
  bounds?: BoundingBox | null;
  fitBoundsTrigger?: number;
}

function MapViewController({ center, zoom, bounds, fitBoundsTrigger }: MapViewControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (center && isValidCoordinate(center[0], center[1]) && map && typeof map.setView === "function") {
      map.setView(center, zoom || (typeof map.getZoom === "function" ? map.getZoom() : 13));
    }
  }, [center?.[0], center?.[1], zoom]);

  useEffect(() => {
    if (bounds && fitBoundsTrigger && map && typeof map.fitBounds === "function") {
      map.fitBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [50, 50], maxZoom: 18 }
      );
    }
  }, [bounds, fitBoundsTrigger]);

  return null;
}

export interface GisMapContainerProps {
  center?: LatLngTuple;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  initialBasemap?: BasemapProviderId;
  height?: string | number;
  className?: string;
  showLayerSwitcher?: boolean;
  showTelemetryHud?: boolean;
  showScaleBar?: boolean;
  showResetButton?: boolean;
  showFullscreenButton?: boolean;
  fitBounds?: BoundingBox | null;
  children?: React.ReactNode;
  onBasemapChange?: (basemap: BasemapProviderId) => void;
  onMapClick?: (latLng: LatLngTuple) => void;
}

export const GisMapContainer: React.FC<GisMapContainerProps> = ({
  center = [19.7515, 75.7139],
  zoom = 13,
  minZoom = 2,
  maxZoom = 20,
  initialBasemap = "satellite",
  height = "600px",
  className = "",
  showLayerSwitcher = true,
  showTelemetryHud = true,
  showScaleBar = true,
  showResetButton = true,
  showFullscreenButton = true,
  fitBounds = null,
  children,
  onBasemapChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBasemap, setActiveBasemap] = useState<BasemapProviderId>(initialBasemap);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState<LatLngTuple | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [currentBounds, setCurrentBounds] = useState<BoundingBox>({
    minLat: center[0] - 0.1,
    minLng: center[1] - 0.1,
    maxLat: center[0] + 0.1,
    maxLng: center[1] + 0.1,
  });
  const [fitTrigger, setFitTrigger] = useState(0);

  const selectedProvider = useMemo(
    () => BASEMAP_PROVIDERS[activeBasemap] || BASEMAP_PROVIDERS.satellite,
    [activeBasemap]
  );

  const handleSelectBasemap = useCallback(
    (id: BasemapProviderId) => {
      setActiveBasemap(id);
      setIsLayerMenuOpen(false);
      onBasemapChange?.(id);
    },
    [onBasemapChange]
  );

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleResetOrFit = useCallback(() => {
    setFitTrigger((prev) => prev + 1);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-border/70 shadow-lg bg-card text-card-foreground select-none ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : ""
      } ${className}`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-0 font-sans"
        attributionControl={false}
      >
        <MapResizeObserver containerRef={containerRef} />
        
        <MapViewController
          center={center}
          zoom={zoom}
          bounds={fitBounds}
          fitBoundsTrigger={fitTrigger}
        />

        <MapTelemetryTracker
          onCursorMove={setCursorPos}
          onZoomChange={setCurrentZoom}
          onBoundsChange={setCurrentBounds}
        />

        {/* Dynamic Basemap Layer */}
        <TileLayer
          key={selectedProvider.id}
          url={selectedProvider.url}
          attribution={selectedProvider.attribution}
          maxZoom={selectedProvider.maxZoom}
          minZoom={selectedProvider.minZoom}
          subdomains={selectedProvider.subdomains || ["a", "b", "c"]}
          detectRetina={selectedProvider.detectRetina ?? false}
        />

        {/* Custom Zoom Control in Top-Right */}
        <ZoomControl position="topright" />

        {/* Scale Bar */}
        {showScaleBar && <ScaleControl position="bottomleft" imperial={false} />}

        {/* User Injected Child Layers (Markers, Polygons, Heatmaps) */}
        {children}
      </MapContainer>

      {/* Floating Basemap Provider Selector (Top-Left) */}
      {showLayerSwitcher && (
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLayerMenuOpen((prev) => !prev)}
              className="glass-card shadow-md bg-background/90 backdrop-blur-md border-primary/20 hover:border-primary/50 text-xs font-semibold flex items-center gap-2 h-9 px-3"
            >
              <Layers className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{selectedProvider.name.split(" ")[0]}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                {selectedProvider.category}
              </Badge>
            </Button>

            {isLayerMenuOpen && (
              <div className="absolute top-11 left-0 w-64 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1 border-b border-border/50 flex items-center justify-between">
                  <span>Basemap Provider</span>
                  <span className="text-[10px] text-primary">WGS-84</span>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {(Object.keys(BASEMAP_PROVIDERS) as BasemapProviderId[]).map((id) => {
                    const p = BASEMAP_PROVIDERS[id];
                    const isSelected = activeBasemap === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectBasemap(id)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-primary/15 border border-primary/30 text-foreground font-medium"
                            : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full mt-0.5 shrink-0 border border-white/20 shadow-sm"
                          style={{ backgroundColor: p.thumbnailColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">{p.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Actions (Top-Right under Zoom) */}
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1.5">
        {showFullscreenButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen GIS Map"}
            className="h-8 w-8 bg-background/90 backdrop-blur-md shadow-md border-border/70 hover:bg-background"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        {showResetButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleResetOrFit}
            title="Recenter / Fit Assets"
            className="h-8 w-8 bg-background/90 backdrop-blur-md shadow-md border-border/70 hover:bg-background"
          >
            <RotateCcw className="h-4 w-4 text-primary" />
          </Button>
        )}
      </div>

      {/* Real-Time GIS Telemetry HUD (Bottom-Right) */}
      {showTelemetryHud && (
        <div className="absolute bottom-2 right-2 z-[1000] pointer-events-none">
          <div className="glass-card bg-background/85 backdrop-blur-md border border-border/60 shadow-lg rounded-xl px-3 py-1.5 text-[11px] font-mono text-muted-foreground flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>Zoom: <strong className="text-foreground">{currentZoom}</strong></span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" />
              {cursorPos ? (
                <span>
                  {coordinateToDMS(cursorPos[0], true)} {coordinateToDMS(cursorPos[1], false)}
                </span>
              ) : (
                <span>
                  {currentBounds.minLat.toFixed(4)}°N, {currentBounds.minLng.toFixed(4)}°E
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
