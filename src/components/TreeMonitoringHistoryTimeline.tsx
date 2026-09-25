/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 22
 * Tree Monitoring History & Biometric Audit Timeline Component
 * 
 * Features:
 * - Unified chronological event log (observations, photos, health check-ins, initial planting)
 * - Biometric growth delta calculations between consecutive observations
 * - Direct "+ Log Observation" trigger with CreateObservationModal
 * - Next scheduled monitoring countdown and overdue warnings
 * - Cryptographic SHA-256 evidence verification
 */

import React, { useState } from "react";
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
  PlusCircle,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TreeObservation, TreePhoto, MonitoringStatus } from "@/types/coreDatabase";
import { CreateObservationModal } from "@/components/CreateObservationModal";
import { monitoringEventService } from "@/services/monitoringEventService";

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
  observerRole?: string | null;
  evidenceType?: string | null;
  sha256Hash?: string | null;
  pestDiseaseDetected?: boolean | null;
  diseaseDescription?: string | null;
  treatmentApplied?: string | null;
  heightDeltaCm?: number | null;
  dbhDeltaCm?: number | null;
}

export interface TreeMonitoringHistoryTimelineProps {
  treeId: string;
  treeCode?: string | null;
  plantationDate: string;
  initialPhotoUrl?: string | null;
  species: string;
  nextMonitoringDate?: string | null;
  monitoringStatus?: MonitoringStatus | null;
  observations?: TreeObservation[];
  photos?: TreePhoto[];
  healthUpdates?: any[];
  growthUpdates?: any[];
  onObservationAdded?: () => void;
}

export const TreeMonitoringHistoryTimeline: React.FC<TreeMonitoringHistoryTimelineProps> = ({
  treeId,
  treeCode,
  plantationDate,
  initialPhotoUrl,
  species,
  nextMonitoringDate,
  monitoringStatus,
  observations = [],
  photos = [],
  healthUpdates = [],
  growthUpdates = [],
  onObservationAdded,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Compute schedule & status
  const schedule = React.useMemo(() => {
    return monitoringEventService.getTreeMonitoringSchedule({
      id: treeId,
      tree_code: treeCode,
      species,
      plantation_date: plantationDate,
      next_monitoring_date: nextMonitoringDate,
      monitoring_status: monitoringStatus || undefined,
      status: observations.length > 0 ? (observations[0].health_status as any) : "alive",
    });
  }, [treeId, treeCode, species, plantationDate, nextMonitoringDate, monitoringStatus, observations]);

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

    // Sort observations chronologically ascending first to compute deltas
    const sortedObs = [...observations].sort(
      (a, b) => new Date(a.observation_date || a.created_at).getTime() - new Date(b.observation_date || b.created_at).getTime()
    );

    let prevHeight: number | null = null;
    let prevDbh: number | null = null;

    sortedObs.forEach((obs) => {
      let heightDelta: number | null = null;
      let dbhDelta: number | null = null;

      if (obs.height_cm && prevHeight !== null) {
        heightDelta = Math.round((obs.height_cm - prevHeight) * 10) / 10;
      }
      if (obs.dbh_cm && prevDbh !== null) {
        dbhDelta = Math.round((obs.dbh_cm - prevDbh) * 10) / 10;
      }

      if (obs.height_cm) prevHeight = obs.height_cm;
      if (obs.dbh_cm) prevDbh = obs.dbh_cm;

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
        notes: obs.condition_notes || obs.notes,
        observerName: obs.observer_name,
        observerRole: obs.observer_role,
        pestDiseaseDetected: obs.pest_disease_detected,
        diseaseDescription: obs.disease_description,
        treatmentApplied: obs.treatment_applied,
        sha256Hash: obs.sha256_hash,
        heightDeltaCm: heightDelta,
        dbhDeltaCm: dbhDelta,
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

    // Deduplicate and sort descending (newest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [treeId, plantationDate, initialPhotoUrl, observations, photos, healthUpdates, growthUpdates]);

  const getStatusBadge = (status?: string | null) => {
    switch (status?.toLowerCase()) {
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
      case "critical":
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

  const latestHeight = observations.length > 0 && observations[0].height_cm ? observations[0].height_cm : null;
  const latestDbh = observations.length > 0 && observations[0].dbh_cm ? observations[0].dbh_cm : null;

  return (
    <>
      <Card className="glass-card rounded-2xl p-6 border-border shadow-sm">
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-heading font-semibold">
                  Monitoring History & Audit Timeline
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {events.length} Records
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Living record of biometric growth, health progression, and cryptographic photo evidence.
              </CardDescription>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Log Observation</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0 space-y-6">
          {/* Next Scheduled Inspection Notice Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            schedule.isCritical
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : schedule.isOverdue
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-primary/5 border-primary/15 text-primary"
          }`}>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <span>Next Inspection: {new Date(schedule.nextMonitoringDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {schedule.stageLabel}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {schedule.rationale}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Badge
                className={`text-xs capitalize font-semibold ${
                  schedule.monitoringStatus === "critical_overdue"
                    ? "bg-rose-600 text-white"
                    : schedule.monitoringStatus === "overdue"
                    ? "bg-amber-600 text-white"
                    : schedule.monitoringStatus === "due_soon"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {schedule.monitoringStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Chronological Timeline */}
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

                    {/* Observer details */}
                    {event.observerName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 text-primary" />
                        <span>Recorded by: <span className="text-foreground font-medium">{event.observerName}</span></span>
                        {event.observerRole && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted/60">
                            {event.observerRole.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Biometric metrics row */}
                    {(event.heightCm || event.canopyCm || event.dbhCm) && (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        {event.heightCm && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Height</span>
                            <div className="flex items-baseline gap-1.5">
                              <p className="font-mono font-medium text-foreground">{event.heightCm} cm</p>
                              {event.heightDeltaCm !== null && event.heightDeltaCm !== undefined && (
                                <span className={`text-[10px] font-mono flex items-center ${
                                  event.heightDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                                  {event.heightDeltaCm >= 0 ? `+${event.heightDeltaCm}` : event.heightDeltaCm}cm
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {event.canopyCm && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canopy Spread</span>
                            <p className="font-mono font-medium text-foreground">{event.canopyCm} cm</p>
                          </div>
                        )}
                        {event.dbhCm && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">DBH (Trunk)</span>
                            <div className="flex items-baseline gap-1.5">
                              <p className="font-mono font-medium text-foreground">{event.dbhCm} cm</p>
                              {event.dbhDeltaCm !== null && event.dbhDeltaCm !== undefined && (
                                <span className={`text-[10px] font-mono flex items-center ${
                                  event.dbhDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                                  {event.dbhDeltaCm >= 0 ? `+${event.dbhDeltaCm}` : event.dbhDeltaCm}cm
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pest / Disease alert */}
                    {event.pestDiseaseDetected && (
                      <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pathology / Symptom Detected</span>
                        </div>
                        {event.diseaseDescription && (
                          <p className="text-muted-foreground">{event.diseaseDescription}</p>
                        )}
                        {event.treatmentApplied && (
                          <p className="text-[11px] text-primary font-mono">Treatment: {event.treatmentApplied}</p>
                        )}
                      </div>
                    )}

                    {/* Notes & Observation details */}
                    {event.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{event.notes}</p>
                    )}

                    {/* Photo thumbnail */}
                    {event.photoUrl && (
                      <div className="pt-2">
                        <div
                          onClick={() => setSelectedPhoto(event.photoUrl!)}
                          className="relative rounded-lg overflow-hidden border border-border max-w-xs aspect-video bg-muted/30 cursor-pointer group/photo"
                        >
                          <img
                            src={event.photoUrl}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity text-white text-xs gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> View Photo
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cryptographic hash badge */}
                    {event.sha256Hash && (
                      <div className="pt-1 text-[10px] font-mono text-muted-foreground truncate">
                        SHA-256: {event.sha256Hash}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Observation Modal */}
      <CreateObservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        treeId={treeId}
        treeCode={treeCode}
        species={species}
        plantationDate={plantationDate}
        currentHeightCm={latestHeight}
        currentDbhCm={latestDbh}
        onSuccess={() => {
          onObservationAdded?.();
        }}
      />
    </>
  );
};
