/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 19
 * Tree Monitoring History & Biometric Audit Timeline Component
 */

import React from "react";
import {
  Activity,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Droplets,
  Heart,
  Ruler,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  FileText,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TreeObservation, TreePhoto } from "@/types/coreDatabase";

export interface UnifiedTimelineEvent {
  id: string;
  type: "observation" | "photo" | "health_checkin" | "initial_planting";
  date: string;
  title: string;
  status?: string | null;
  heightCm?: number | null;
  canopyCm?: number | null;
  dbhCm?: number | null;
  healthScore?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
  observerName?: string | null;
  evidenceType?: string | null;
  sha256Hash?: string | null;
}

export interface TreeMonitoringHistoryTimelineProps {
  treeId: string;
  plantationDate: string;
  initialPhotoUrl?: string | null;
  species: string;
  observations?: TreeObservation[];
  photos?: TreePhoto[];
  healthUpdates?: any[];
  growthUpdates?: any[];
}

export const TreeMonitoringHistoryTimeline: React.FC<TreeMonitoringHistoryTimelineProps> = ({
  treeId,
  plantationDate,
  initialPhotoUrl,
  species,
  observations = [],
  photos = [],
  healthUpdates = [],
  growthUpdates = [],
}) => {
  // Aggregate and sort all events chronologically descending (newest first)
  const events: UnifiedTimelineEvent[] = React.useMemo(() => {
    const list: UnifiedTimelineEvent[] = [];

    // 1. Initial Plantation Event
    list.push({
      id: `initial-${treeId}`,
      type: "initial_planting",
      date: plantationDate || new Date().toISOString(),
      title: "Initial Tree Plantation & Registration",
      status: "alive",
      photoUrl: initialPhotoUrl || null,
      notes: `Planted and cryptographically registered in Green Enlightenment registry.`,
    });

    // 2. Tree Observations
    observations.forEach((obs) => {
      list.push({
        id: obs.id,
        type: "observation",
        date: obs.observation_date || obs.created_at,
        title: "Biometric Field Observation",
        status: obs.health_status,
        heightCm: obs.height_cm,
        canopyCm: obs.canopy_width_cm,
        dbhCm: obs.dbh_cm,
        healthScore: obs.ai_health_score,
        photoUrl: obs.photo_url,
        notes: obs.condition_notes || (obs.pest_disease_detected ? obs.disease_description : null),
      });
    });

    // 3. Tree Evidence Photos
    photos.forEach((ph) => {
      // Exclude initial planting photo duplicate
      if (ph.photo_url !== initialPhotoUrl) {
        list.push({
          id: ph.id,
          type: "photo",
          date: ph.exif_timestamp || ph.created_at,
          title: `Evidence: ${ph.evidence_type.replace(/_/g, " ")}`,
          photoUrl: ph.photo_url,
          notes: ph.caption,
          evidenceType: ph.evidence_type,
          sha256Hash: ph.sha256_hash,
        });
      }
    });

    // 4. Health Updates
    healthUpdates.forEach((hu) => {
      list.push({
        id: hu.id,
        type: "health_checkin",
        date: hu.created_at,
        title: "Health & Vitality Check-in",
        status: hu.health_status,
        notes: hu.notes,
      });
    });

    // 5. Growth Updates
    growthUpdates.forEach((gu) => {
      if (gu.photo_url && gu.photo_url !== initialPhotoUrl) {
        list.push({
          id: gu.id,
          type: "photo",
          date: gu.created_at,
          title: `Day ${gu.update_day || "30"} Growth Check-in`,
          photoUrl: gu.photo_url,
          notes: `Periodic survival and growth capture.`,
        });
      }
    });

    // Deduplicate and sort descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [treeId, plantationDate, initialPhotoUrl, observations, photos, healthUpdates, growthUpdates]);

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "thriving":
      case "healthy":
        return (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-[10px]">
            <Heart className="w-3 h-3 mr-1" /> Thriving
          </Badge>
        );
      case "alive":
        return (
          <Badge className="bg-green-600/20 text-green-400 border-green-500/30 text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Alive
          </Badge>
        );
      case "stressed":
      case "moderate":
      case "needs water":
        return (
          <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[10px]">
            <Droplets className="w-3 h-3 mr-1" /> Stressed
          </Badge>
        );
      case "diseased":
      case "damaged":
        return (
          <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/30 text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" /> Diseased
          </Badge>
        );
      case "dead":
        return (
          <Badge className="bg-rose-600/20 text-rose-400 border-rose-500/30 text-[10px]">
            Dead
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="glass-card rounded-2xl p-6 border-border">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading font-semibold">
              Monitoring History & Audit Timeline
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {events.length} Total Records
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Chronological field observations, drone captures, biometric audits, and periodic check-ins.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
          {events.map((event) => {
            const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={event.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-primary flex items-center justify-center text-[10px] text-primary shadow-sm">
                  {event.type === "initial_planting" ? (
                    <Sparkles className="w-2.5 h-2.5" />
                  ) : event.type === "photo" ? (
                    <Camera className="w-2.5 h-2.5" />
                  ) : (
                    <Activity className="w-2.5 h-2.5" />
                  )}
                </div>

                <div className="rounded-xl bg-card/60 border border-border/80 p-4 space-y-2 hover:border-primary/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{event.title}</span>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Biometric metrics row */}
                  {(event.heightCm || event.canopyCm || event.dbhCm) && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      {event.heightCm && (
                        <div className="p-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Height</span>
                          <p className="font-mono font-medium text-foreground">{event.heightCm} cm</p>
                        </div>
                      )}
                      {event.canopyCm && (
                        <div className="p-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canopy</span>
                          <p className="font-mono font-medium text-foreground">{event.canopyCm} cm</p>
                        </div>
                      )}
                      {event.dbhCm && (
                        <div className="p-1.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">DBH</span>
                          <p className="font-mono font-medium text-foreground">{event.dbhCm} cm</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes & Observation details */}
                  {event.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.notes}</p>
                  )}

                  {/* Photo thumbnail */}
                  {event.photoUrl && (
                    <div className="pt-2">
                      <div className="relative rounded-lg overflow-hidden border border-border max-w-xs aspect-video bg-muted/30">
                        <img
                          src={event.photoUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cryptographic hash badge */}
                  {event.sha256Hash && (
                    <div className="pt-1 text-[10px] font-mono text-muted-foreground truncate">
                      SHA256: {event.sha256Hash}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
