import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TreePine,
  MapPin,
  Calendar,
  Ruler,
  ShieldCheck,
  Clock,
  Loader2,
  Download,
  Heart,
  Droplets,
  AlertTriangle,
  Skull,
  Bot,
  Activity,
  Sun,
  CloudRain,
  Sparkles,
  Wind,
  Camera,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Layers,
  FileCheck,
  Compass,
  UserCheck,
  ShieldAlert,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useRef, useState } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  computeHealthScore,
  computeImpact,
  careTips,
  nearbyNativeSuggestions,
  treeAgeMonths,
  ageLabel,
} from "@/lib/treeIntelligence";
import { VernacularVoiceAssistant } from "@/components/VernacularVoiceAssistant";
import { TreeNdviSatelliteViewer } from "@/components/TreeNdviSatelliteViewer";
import { TreeMonitoringHistoryTimeline } from "@/components/TreeMonitoringHistoryTimeline";
import { EvidenceAuditInspectorModal } from "@/components/EvidenceAuditInspectorModal";
import { evidenceHistoryService } from "@/services/evidenceHistoryService";
import { AuditableEvidenceRecord } from "@/types/coreDatabase";
import { CreateObservationModal } from "@/components/CreateObservationModal";
import { SurvivalStatusBadge } from "@/components/SurvivalStatusBadge";
import { SurvivalVerificationModal } from "@/components/SurvivalVerificationModal";
import { monitoringEventService } from "@/services/monitoringEventService";
import { survivalStatusService } from "@/services/survivalStatusService";
import { TreeObservation, TreePhoto } from "@/types/coreDatabase";

const healthStatusBadge = (status?: string | null) => {
  switch (status?.toLowerCase()) {
    case "thriving":
      return (
        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 gap-1">
          <Heart className="w-3.5 h-3.5" /> Thriving
        </Badge>
      );
    case "alive":
    case "healthy":
      return (
        <Badge className="bg-green-600/20 text-green-400 border-green-500/30 gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Alive & Healthy
        </Badge>
      );
    case "stressed":
    case "needs water":
    case "moderate":
      return (
        <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 gap-1">
          <Droplets className="w-3.5 h-3.5" /> Stressed
        </Badge>
      );
    case "diseased":
    case "damaged":
      return (
        <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/30 gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Diseased / Damaged
        </Badge>
      );
    case "dead":
      return (
        <Badge className="bg-rose-600/20 text-rose-400 border-rose-500/30 gap-1">
          <Skull className="w-3.5 h-3.5" /> Dead
        </Badge>
      );
    case "replaced":
      return (
        <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Replaced
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <TreePine className="w-3.5 h-3.5" /> {status || "Alive"}
        </Badge>
      );
  }
};

const TreeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [activeEvidenceRecord, setActiveEvidenceRecord] = useState<AuditableEvidenceRecord | null>(null);

  // 1. Fetch Tree by either UUID or human-readable tree_code (e.g. GE-2026-000001)
  const { data: tree, isLoading } = useQuery({
    queryKey: ["tree", id],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
      let query = supabase.from("trees").select("*");
      if (isUuid) {
        query = query.or(`id.eq.${id},tree_code.eq.${id}`);
      } else {
        query = query.eq("tree_code", id!);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const treeRealId = tree?.id;

  // 2. Fetch Planter Profile
  const { data: planter } = useQuery({
    queryKey: ["planter", tree?.user_id || tree?.created_by],
    enabled: !!(tree?.user_id || tree?.created_by),
    queryFn: async () => {
      try {
        const userId = tree?.user_id || tree?.created_by;
        const { data } = await supabase.from("profiles").select("full_name, organization_name").eq("id", userId!).single();
        return data || null;
      } catch {
        return null;
      }
    },
  });

  // 3. Fetch Project if linked
  const { data: project } = useQuery({
    queryKey: ["project", tree?.project_id],
    enabled: !!tree?.project_id,
    queryFn: async () => {
      try {
        const { data } = await supabase.from("projects").select("id, name, location_name").eq("id", tree!.project_id!).single();
        return data || null;
      } catch {
        return null;
      }
    },
  });

  // 4. Fetch Tree Biometric Observations
  const { data: observations = [] } = useQuery<TreeObservation[]>({
    queryKey: ["tree-observations", treeRealId],
    enabled: !!treeRealId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("tree_observations")
          .select("*")
          .eq("tree_id", treeRealId!)
          .order("observation_date", { ascending: false });
        if (error) {
          console.warn("tree-observations error:", error.message);
          return [];
        }
        return (data as TreeObservation[]) || [];
      } catch {
        return [];
      }
    },
  });

  // 5. Fetch Tree Evidence Photos
  const { data: photos = [] } = useQuery<TreePhoto[]>({
    queryKey: ["tree-photos", treeRealId],
    enabled: !!treeRealId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("tree_photos")
          .select("*")
          .eq("tree_id", treeRealId!)
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("tree-photos error:", error.message);
          return [];
        }
        return (data as TreePhoto[]) || [];
      } catch {
        return [];
      }
    },
  });

  // 6. Fetch Health Updates
  const { data: healthUpdates = [] } = useQuery({
    queryKey: ["health-updates", treeRealId],
    enabled: !!treeRealId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("tree_health_updates")
          .select("*")
          .eq("tree_id", treeRealId!)
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("health-updates error:", error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // 7. Fetch Growth Updates
  const { data: growthUpdates = [] } = useQuery({
    queryKey: ["growth-updates", treeRealId],
    enabled: !!treeRealId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("growth_updates")
          .select("id, photo_url, update_day, created_at")
          .eq("tree_id", treeRealId!)
          .order("created_at", { ascending: true });
        if (error) {
          console.warn("growth-updates error:", error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const handleDataRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tree", id] });
    queryClient.invalidateQueries({ queryKey: ["tree-observations", treeRealId] });
    queryClient.invalidateQueries({ queryKey: ["tree-photos", treeRealId] });
  };

  const displayTreeId = tree?.tree_code || tree?.id || id;
  const profileUrl = `${window.location.origin}/tree/${displayTreeId}`;

  const handleCopyTreeId = () => {
    if (!displayTreeId) return;
    navigator.clipboard.writeText(displayTreeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement("a");
      link.download = `tree-${displayTreeId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    try {
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svgData);
    }
  }, [displayTreeId]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center space-y-4">
          <TreePine className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-heading font-bold text-foreground">Tree Record Not Found</h1>
          <p className="text-muted-foreground max-w-md">
            The tree record with identifier <span className="font-mono text-foreground font-semibold">{id}</span> was not found in the Green Enlightenment Registry.
          </p>
          <Link to="/map">
            <Button className="mt-2">Browse All Trees</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Intelligence calculations
  const ageM = treeAgeMonths(tree.plantation_date);
  const daysPlanted = Math.max(1, Math.floor((Date.now() - new Date(tree.plantation_date).getTime()) / (1000 * 60 * 60 * 24)));
  const { score, band, reasons } = computeHealthScore({
    status: tree.status,
    height_cm: tree.height_cm,
    plantation_date: tree.plantation_date,
    verification_status: tree.verification_status,
    ai_confidence: tree.ai_confidence,
  });
  const impact = computeImpact(tree.species, tree.height_cm, ageM);
  const care = careTips(tree.species, tree.status);
  const natives = nearbyNativeSuggestions(tree.species);

  // Monitoring Schedule & Overdue Assessment
  const schedule = monitoringEventService.getTreeMonitoringSchedule({
    id: tree.id,
    tree_code: tree.tree_code,
    species: tree.species,
    plantation_date: tree.plantation_date,
    last_monitored_at: tree.last_monitored_at,
    next_monitoring_date: tree.next_monitoring_date,
    monitoring_status: tree.monitoring_status,
    status: tree.status,
  });

  const currentSurvivalStatus = survivalStatusService.normalizeSurvivalStatus(tree.survival_status || tree.status);

  const bandColor =
    score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Breadcrumb / Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <span>/</span>
              <Link to="/map" className="hover:text-foreground">Trees</Link>
              <span>/</span>
              <span className="text-foreground font-mono font-medium">{displayTreeId}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-7 gap-1 px-2.5"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                {copiedLink ? "Link Copied" : "Share"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (treeRealId) {
                    const history = await evidenceHistoryService.getTreeEvidenceHistory(treeRealId);
                    if (history.length > 0) {
                      setActiveEvidenceRecord(history[0]);
                    } else {
                      setActiveEvidenceRecord({
                        id: `tree-${treeRealId}`,
                        treeId: treeRealId,
                        who: {
                          observerId: tree?.user_id || null,
                          observerName: planter?.full_name || "Planter",
                          observerRole: "planter",
                        },
                        when: {
                          eventTimestamp: tree?.plantation_date || tree?.created_at,
                          createdAt: tree?.created_at,
                        },
                        what: {
                          eventType: "initial_planting",
                          survivalStatus: (tree?.survival_status as any) || "ALIVE",
                          healthStatus: tree?.status || "healthy",
                          heightCm: tree?.height_cm,
                          dbhCm: tree?.dbh_cm,
                          notes: tree?.description,
                        },
                        where: {
                          latitude: tree?.latitude,
                          longitude: tree?.longitude,
                          gpsAccuracyM: 2.5,
                          distanceFromBaselineM: 0,
                          geofenceStatus: "within_bounds",
                        },
                        evidence: {
                          photoUrl: tree?.photo_url,
                          evidenceType: "planting_photo",
                          sha256Hash: tree?.photo_url ? evidenceHistoryService.computeEvidenceHash(tree?.photo_url) : null,
                          verificationStatus: "verified",
                        },
                      });
                    }
                    setIsEvidenceModalOpen(true);
                  }
                }}
                className="text-xs h-7 gap-1 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>5W Provenance</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSurvivalModalOpen(true)}
                className="text-xs h-7 gap-1 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verify Status</span>
              </Button>
              <Button
                onClick={() => setIsObsModalOpen(true)}
                size="sm"
                className="text-xs h-7 gap-1 px-2.5 bg-primary text-primary-foreground"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Log Observation</span>
              </Button>
            </div>
          </div>

          {/* NEEDS_REVIEW Alert Banner if AI flagged uncertainty or mortality conflict */}
          {currentSurvivalStatus === "NEEDS_REVIEW" && (
            <div className="p-4 rounded-2xl border bg-purple-500/15 border-purple-500/30 text-purple-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <div className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <span>Survival Status Needs Human Verification</span>
                    <Badge className="bg-purple-600 text-white text-[10px]">Action Required</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tree.ai_status_rationale || "AI telemetry detected potential health regression or uncertainty. Please verify ground truth."}
                  </p>
                  {tree.ai_suggested_status && (
                    <div className="pt-1 font-mono text-xs text-purple-300 flex items-center gap-2">
                      <span>AI Proposed: <strong>{tree.ai_suggested_status}</strong></span>
                      {tree.ai_status_confidence && (
                        <span>({tree.ai_status_confidence}% confidence)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsSurvivalModalOpen(true)}
                className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Sign Off
              </Button>
            </div>
          )}

          {/* Overdue Alert Banner if tree requires immediate monitoring */}
          {schedule.isOverdue && (
            <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
              schedule.isCritical
                ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{schedule.isCritical ? "CRITICAL: Monitoring Severely Overdue" : "Monitoring Overdue Warning"}</span>
                    <Badge className="bg-rose-600 text-white text-[10px]">
                      {schedule.daysOverdue} Days Overdue
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This tree was due for field biometric observation on{" "}
                    <span className="font-semibold text-foreground">
                      {new Date(schedule.nextMonitoringDate).toLocaleDateString()}
                    </span>. Please conduct an on-site audit to maintain MRV carbon verification and health tracking.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsObsModalOpen(true)}
                className="shrink-0 bg-primary text-primary-foreground text-xs"
              >
                Audit Now
              </Button>
            </div>
          )}

          {/* Main Grid: Left Column Photo & QR, Right Column Details */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column: Photo, Status, QR Card */}
            <div className="space-y-6">
              {/* Photo & Status Card */}
              <div className="glass-card rounded-2xl p-4 border border-border space-y-4">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border">
                  {tree.photo_url ? (
                    <img
                      src={tree.photo_url}
                      alt={tree.tree_name || tree.species}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <TreePine className="h-16 w-16 opacity-30 mb-2" />
                      <span className="text-xs">No Photo Recorded</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <SurvivalStatusBadge status={currentSurvivalStatus} size="sm" />
                    {healthStatusBadge(tree.status)}
                  </div>

                  {tree.verification_status && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <Badge className="bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {tree.verification_status}
                      </Badge>
                      {tree.admin_status && (
                        <Badge className="bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px]">
                          Admin {tree.admin_status}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Planter Selfie Evidence if available */}
                {tree.selfie_photo_url && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-primary" /> Planter Selfie Evidence
                    </span>
                    <div className="rounded-xl overflow-hidden aspect-video border border-border bg-muted/30">
                      <img src={tree.selfie_photo_url} alt="Planter selfie" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Before / After Slider if both exist */}
                {tree.before_photo_url && tree.photo_url && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-primary" /> Visual Growth Progression
                    </span>
                    <BeforeAfterSlider
                      beforeSrc={tree.before_photo_url}
                      afterSrc={tree.photo_url}
                      beforeLabel="Planting"
                      afterLabel="Current"
                      className="rounded-xl overflow-hidden aspect-video border border-border"
                    />
                  </div>
                )}
              </div>

              {/* QR Code & Certificate Card */}
              <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Digital Tree Passport & Physical QR
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadQR} title="Download QR">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div ref={qrRef} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-border shadow-inner">
                  <QRCodeSVG
                    value={profileUrl}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                  <div className="text-[10px] font-mono text-slate-800 font-bold mt-1 text-center">
                    {displayTreeId}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Tree Code</div>
                    <div className="font-mono font-bold text-foreground truncate">{displayTreeId}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTreeId}
                    aria-label="Copy Tree ID"
                    className="h-7 text-xs px-2 shrink-0 gap-1"
                  >
                    {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedId ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Link to={`/tree-certificate/${treeRealId}`} className="block">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <FileCheck className="h-3.5 w-3.5 text-primary" /> Official Provenance Certificate
                    </Button>
                  </Link>

                  <Link to={`/tree-story/${treeRealId}`} className="block">
                    <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <TreePine className="h-3.5 w-3.5" /> Growth Story Slideshow
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Species, Metadata, Health & Sentinel-2 Telemetry */}
            <div className="md:col-span-2 space-y-6">
              {/* Primary Identity & Species Card */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                        {tree.tree_name || tree.species}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
                      <span className="font-medium text-foreground">{tree.species}</span>
                      {(tree.botanical_name || tree.ai_scientific_name) && (
                        <span className="italic text-xs text-muted-foreground/80">
                          ({tree.botanical_name || tree.ai_scientific_name})
                        </span>
                      )}
                    </div>

                    {tree.ai_detected_species && (
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                          <Bot className="h-3 w-3" /> AI Detected: {tree.ai_detected_species}
                        </Badge>
                        {tree.ai_confidence && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {tree.ai_confidence}% accuracy
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <VernacularVoiceAssistant
                      text={`${tree.tree_name || tree.species}. प्रजाती: ${tree.species}. लागवड दिनांक: ${new Date(tree.plantation_date).toLocaleDateString("mr-IN")}. ठिकाण: ${tree.location}. आरोग्य निर्देशांक: ${score} टक्के. पाणी देण्याचा सल्ला: ${care.watering}.`}
                    />
                  </div>
                </div>

                {/* Core Parameters Grid */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  {/* Tree ID */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <Tag className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Tree Identifier</div>
                      <div className="text-sm font-mono font-bold text-foreground truncate">{displayTreeId}</div>
                    </div>
                  </div>

                  {/* Verified Survival Status */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Certified Survival Status</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <SurvivalStatusBadge
                          status={currentSurvivalStatus}
                          verificationSource={tree.status_verification_source}
                          showSource={true}
                          size="sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSurvivalModalOpen(true)}
                          className="text-[10px] h-6 px-1.5 text-primary hover:bg-primary/10"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Plantation Date & Age */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <Calendar className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Plantation Date</div>
                      <div className="text-sm font-medium text-foreground">
                        {new Date(tree.plantation_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({ageLabel(ageM)} / {daysPlanted}d)</span>
                      </div>
                    </div>
                  </div>

                  {/* Geodetic Coordinates */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Coordinates (WGS84)</div>
                      <div className="text-sm font-mono text-foreground truncate">
                        {tree.latitude?.toFixed(6)}°, {tree.longitude?.toFixed(6)}°
                        {tree.elevation_m ? ` (${tree.elevation_m}m MSL)` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Location Address & Project */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <Compass className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Location / Project</div>
                      <div className="text-sm text-foreground truncate">
                        {tree.location || project?.name || "Maharashtra, India"}
                      </div>
                    </div>
                  </div>

                  {/* Biometric Height & DBH */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <Ruler className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Biometrics</div>
                      <div className="text-sm font-medium text-foreground">
                        {tree.height_cm} cm height
                        {tree.dbh_cm ? ` • ${tree.dbh_cm} cm DBH` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Planter / Registered By */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/60">
                    <TreePine className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Planter</div>
                      <div className="text-sm text-foreground truncate">
                        {planter?.full_name || "Community Volunteer"}
                        {planter?.organization_name ? ` (${planter.organization_name})` : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {tree.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                    {tree.description}
                  </p>
                )}

                {/* AI Botanical & Biometric Analysis */}
                {tree.ai_analysis && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Bot className="h-3.5 w-3.5" /> AI Botanical & MRV Verification Analysis
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tree.ai_analysis}</p>
                    {tree.ai_confidence && (
                      <p className="text-[11px] font-mono text-primary pt-0.5">
                        Model Confidence: {tree.ai_confidence}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Monitoring Schedule & Survival Assurance Card */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-semibold">Monitoring Schedule & Survival Protocol</h2>
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-card/60 border border-border/80">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Next Inspection</span>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {new Date(schedule.nextMonitoringDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card/60 border border-border/80">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Interval & Stage</span>
                    <div className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      Every {schedule.intervalDays}d ({schedule.stageLabel})
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card/60 border border-border/80">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Status Timeline</span>
                    <div className={`text-sm font-semibold mt-0.5 ${
                      schedule.isCritical ? "text-rose-400" : schedule.isOverdue ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {schedule.isOverdue
                        ? `${schedule.daysOverdue} days overdue`
                        : schedule.daysRemaining === 0
                        ? "Due today"
                        : `Due in ${schedule.daysRemaining} days`}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed flex items-center justify-between gap-3">
                  <span>{schedule.rationale}</span>
                  <Button
                    onClick={() => setIsObsModalOpen(true)}
                    size="sm"
                    className="shrink-0 text-xs h-7 gap-1"
                  >
                    <PlusCircle className="h-3 w-3" /> Log Inspection
                  </Button>
                </div>
              </div>

              {/* AI Health Score Gauge */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-semibold">AI Tree Health & Vitality Score</h2>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs font-semibold">
                    {band} Vitality
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={bandColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        initial={{ strokeDasharray: "0 314" }}
                        animate={{ strokeDasharray: `${(score / 100) * 314} 314` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-heading text-3xl font-bold" style={{ color: bandColor }}>
                        {score}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    {reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Calendar className="h-3 w-3" /> Age: {ageLabel(ageM)}
                      </Badge>
                      {tree.ai_confidence != null && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Bot className="h-3 w-3" /> AI conf: {tree.ai_confidence}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Copernicus Sentinel-2 Multi-Spectral NDVI Telemetry */}
              {tree.latitude && tree.longitude && (
                <TreeNdviSatelliteViewer
                  treeId={tree.id}
                  latitude={tree.latitude}
                  longitude={tree.longitude}
                  treeName={tree.tree_name || tree.species}
                  species={tree.species}
                />
              )}

              {/* Environmental & Carbon Sequestration Impact */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Verifiable Environmental & Carbon Impact
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { icon: <Wind className="h-4 w-4" />, label: "CO₂ absorbed", value: `${impact.co2KgPerYear} kg/yr` },
                    { icon: <Sparkles className="h-4 w-4" />, label: "O₂ generated", value: `${impact.o2KgPerYear} kg/yr` },
                    { icon: <Sun className="h-4 w-4" />, label: "Shade area", value: `${impact.shadeM2} m²` },
                    { icon: <CloudRain className="h-4 w-4" />, label: "Rainwater filtered", value: `${impact.rainwaterLitersPerYear} L/yr` },
                    { icon: <TreePine className="h-4 w-4" />, label: "Biodiversity score", value: `${impact.biodiversityScore}/100` },
                    { icon: <Activity className="h-4 w-4" />, label: "Vehicle km offset", value: `${impact.carsOffsetPerYear}` },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                      <div className="flex items-center gap-1.5 text-primary text-xs mb-1">
                        {s.icon}
                        <span>{s.label}</span>
                      </div>
                      <div className="font-heading font-bold text-lg text-foreground">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Care & Agroforestry Guide */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" /> Species Care Guide
                </h2>
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-3">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Recommended Irrigation</div>
                  <div className="text-sm font-medium text-foreground">{care.watering}</div>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {care.tips.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                {natives.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Suggested native companions nearby</div>
                    <div className="flex flex-wrap gap-1.5">
                      {natives.map((n) => (
                        <span key={n} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Unified Monitoring History & Audit Timeline */}
              <TreeMonitoringHistoryTimeline
                treeId={treeRealId || ""}
                treeCode={tree.tree_code}
                plantationDate={tree.plantation_date}
                initialPhotoUrl={tree.photo_url}
                species={tree.species}
                latitude={tree.latitude}
                longitude={tree.longitude}
                nextMonitoringDate={tree.next_monitoring_date}
                monitoringStatus={tree.monitoring_status}
                observations={observations}
                photos={photos}
                healthUpdates={healthUpdates}
                growthUpdates={growthUpdates}
                onObservationAdded={handleDataRefresh}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 5W Evidence Audit Inspector Modal */}
      <EvidenceAuditInspectorModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        record={activeEvidenceRecord}
        treeCode={tree?.tree_code}
        species={tree?.species}
      />

      {/* Observation Modal */}
      <CreateObservationModal
        isOpen={isObsModalOpen}
        onClose={() => setIsObsModalOpen(false)}
        treeId={treeRealId || ""}
        treeCode={tree.tree_code}
        species={tree.species}
        plantationDate={tree.plantation_date}
        currentHeightCm={tree.height_cm}
        currentDbhCm={tree.dbh_cm}
        onSuccess={handleDataRefresh}
      />

      {/* Survival Status Verification Modal (Human-in-the-Loop) */}
      <SurvivalVerificationModal
        isOpen={isSurvivalModalOpen}
        onClose={() => setIsSurvivalModalOpen(false)}
        treeId={treeRealId || ""}
        treeCode={tree.tree_code}
        species={tree.species}
        currentSurvivalStatus={currentSurvivalStatus}
        aiSuggestedStatus={tree.ai_suggested_status}
        aiConfidence={tree.ai_status_confidence}
        aiRationale={tree.ai_status_rationale}
        photoUrl={tree.photo_url}
        onSuccess={handleDataRefresh}
      />
    </div>
  );
};

export default TreeProfile;
