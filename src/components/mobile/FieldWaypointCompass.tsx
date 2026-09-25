import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Compass,
  Navigation,
  MapPin,
  Target,
  ArrowUp,
  RotateCw,
  TreePine,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LatLngTuple,
  calculateHaversineDistance,
  coordinateToDMS,
  formatTreeCoordinates,
} from "@/lib/gisMapFoundation";
import { RealTreeFeature, getSyntheticRealTrees } from "@/services/treeMapService";

export interface WaypointTarget {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  species?: string;
  type: "tree" | "boundary_point" | "anomaly_spot" | "nursery";
  description?: string;
}

export interface FieldWaypointCompassProps {
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
  target?: WaypointTarget | null;
  onSelectTarget?: (target: WaypointTarget) => void;
  className?: string;
}

/**
 * Computes the forward azimuth / bearing in degrees (0 - 360) from coord1 to coord2.
 */
export function calculateBearing(coord1: LatLngTuple, coord2: LatLngTuple): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;

  return Number(bearing.toFixed(1));
}

/**
 * Returns cardinal compass direction string (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export const FieldWaypointCompass: React.FC<FieldWaypointCompassProps> = ({
  currentLocation,
  target: externalTarget,
  onSelectTarget,
  className = "",
}) => {
  const defaultTargets: WaypointTarget[] = [
    {
      id: "waypoint-001",
      name: "Sector 4B Banyan Mother Tree",
      species: "Ficus benghalensis",
      latitude: 18.473521,
      longitude: 73.436102,
      type: "tree",
      description: "Quarterly MRV health audit required",
    },
    {
      id: "waypoint-002",
      name: "Paithan Neem Sapling Spot #02",
      species: "Azadirachta indica",
      latitude: 19.481234,
      longitude: 75.386128,
      type: "tree",
      description: "Sentinel-2 Moisture Deficit Anomaly Check",
    },
    {
      id: "waypoint-003",
      name: "Kundalika Mangrove Plot Boundary 1",
      species: "Rhizophora mucronata",
      latitude: 18.439812,
      longitude: 73.016421,
      type: "boundary_point",
      description: "Estuary conservation perimeter peg",
    },
  ];

  const [activeTarget, setActiveTarget] = useState<WaypointTarget>(
    externalTarget || defaultTargets[0]
  );
  const [deviceHeading, setDeviceHeading] = useState<number>(0);

  useEffect(() => {
    if (externalTarget) {
      setActiveTarget(externalTarget);
    }
  }, [externalTarget]);

  // Listen to device orientation if available on mobile
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setDeviceHeading(360 - e.alpha);
      }
    };

    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, []);

  const userCoord: LatLngTuple = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : [18.4728, 73.4355]; // Default demo Mulshi baseline

  const targetCoord: LatLngTuple = [activeTarget.latitude, activeTarget.longitude];
  const distanceMeters = calculateHaversineDistance(userCoord, targetCoord);
  const bearingAngle = calculateBearing(userCoord, targetCoord);
  const cardinal = getCardinalDirection(bearingAngle);

  // Relative pointer angle (bearing minus device heading)
  const pointerAngle = (bearingAngle - deviceHeading + 360) % 360;

  // Proximity classification
  const isClose = distanceMeters <= 5;
  const isApproaching = distanceMeters <= 25 && !isClose;

  return (
    <div
      className={`glass-card rounded-2xl p-4 sm:p-5 border border-border/80 shadow-md space-y-4 ${className}`}
      data-testid="field-waypoint-compass"
    >
      {/* Target Selector Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
              Field Waypoint Compass
            </h3>
            <p className="text-[11px] text-muted-foreground">Geodetic Azimuth & Rangefinder</p>
          </div>
        </div>

        {/* Proximity Pill */}
        {isClose ? (
          <Badge className="bg-emerald-500 text-white animate-pulse text-xs px-2.5 py-0.5">
            <CheckCircle2 className="w-3 h-3 mr-1" /> On Target (≤5m)
          </Badge>
        ) : isApproaching ? (
          <Badge className="bg-amber-500 text-white text-xs px-2.5 py-0.5">
            <Target className="w-3 h-3 mr-1" /> Approaching (≤25m)
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 text-primary">
            <Navigation className="w-3 h-3 mr-1" /> En Route
          </Badge>
        )}
      </div>

      {/* Target Selector Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {defaultTargets.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTarget(t);
              if (onSelectTarget) onSelectTarget(t);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all shrink-0 border ${
              activeTarget.id === t.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background/80 text-muted-foreground border-border/70 hover:bg-accent"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Interactive Compass Dial */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full border-4 border-dashed border-border/80 flex items-center justify-center bg-gradient-to-b from-card/80 to-background/90 shadow-inner">
          {/* Cardinal Points */}
          <span className="absolute top-2 font-bold text-xs text-rose-500">N</span>
          <span className="absolute bottom-2 font-bold text-xs text-muted-foreground">S</span>
          <span className="absolute right-3 font-bold text-xs text-muted-foreground">E</span>
          <span className="absolute left-3 font-bold text-xs text-muted-foreground">W</span>

          {/* Compass Rings */}
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-border/50 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center p-2">
              <span className="font-extrabold text-xl font-mono text-foreground leading-none">
                {distanceMeters >= 1000
                  ? `${(distanceMeters / 1000).toFixed(2)}km`
                  : `${Math.round(distanceMeters)}m`}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold mt-1">
                {cardinal} ({Math.round(bearingAngle)}°)
              </span>
            </div>
          </div>

          {/* Rotating Directional Arrow Needle */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ rotate: pointerAngle }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
          >
            <div className="h-full w-6 flex flex-col justify-between items-center py-3">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[22px] border-b-emerald-500 drop-shadow-md" />
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[14px] border-t-muted-foreground/40" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Target Details Card */}
      <div className="bg-background/80 rounded-xl p-3 border border-border/70 text-xs space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TreePine className="h-3.5 w-3.5 text-emerald-500" />
            {activeTarget.name}
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {activeTarget.species || "Target Site"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>Target Coordinates:</span>
          <span className="font-mono text-foreground">
            {activeTarget.latitude.toFixed(5)}°N, {activeTarget.longitude.toFixed(5)}°E
          </span>
        </div>
        {activeTarget.description && (
          <p className="text-muted-foreground text-[11px] pt-1 border-t border-border/50">
            {activeTarget.description}
          </p>
        )}
      </div>
    </div>
  );
};
