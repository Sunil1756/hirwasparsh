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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  const qrRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
          <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
          <h2 className="font-heading text-2xl font-bold">Tree Not Found</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            No Green Enlightenment tree found matching identifier <span className="font-mono font-semibold">{id}</span>.
          </p>
          <Link to="/tree-map">
            <Button variant="outline">Back to Tree Map</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---- Intelligence layer ----
  const treeAny = tree as any;
  const beforeUrl: string | null = treeAny.before_photo_url || null;
  const selfieUrl: string | null = treeAny.selfie_photo_url || null;
  const latestGrowthPhoto = [...growthUpdates].reverse().find((g) => g.photo_url)?.photo_url;
  const afterUrl = latestGrowthPhoto || tree.photo_url;
  const showSlider = !!(beforeUrl && afterUrl && beforeUrl !== afterUrl);

  const { score, band, reasons } = computeHealthScore(tree as any, healthUpdates as any, growthUpdates as any);
  const impact = computeImpact(tree as any);
  const care = careTips(tree as any);
  const natives = nearbyNativeSuggestions(tree.location || "");
  const ageM = treeAgeMonths(tree as any);
  const daysPlanted = Math.max(
    0,
    Math.floor((Date.now() - new Date(tree.plantation_date).getTime()) / (1000 * 60 * 60 * 24))
  );

  const bandColor =
    band === "excellent"
      ? "hsl(142 71% 45%)"
      : band === "good"
      ? "hsl(88 60% 45%)"
      : band === "fair"
      ? "hsl(38 92% 50%)"
      : "hsl(0 84% 60%)";

  const handleSharePassport = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${tree?.tree_name || tree?.species || "Tree"} — Green Enlightenment Passport`,
          text: `Track the growth and verifiable carbon impact of ${tree?.tree_name || tree?.species} (${tree?.tree_code || tree?.id}) on Green Enlightenment!`,
          url: profileUrl,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background/50">
      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        {/* Top Breadcrumb & Quick Info Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/tree-map" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Compass className="w-3.5 h-3.5" /> Tree Map
            </Link>
            <span className="text-muted-foreground/40">/</span>
            {project && (
              <>
                <span className="text-xs text-muted-foreground">{project.name}</span>
                <span className="text-muted-foreground/40">/</span>
              </>
            )}
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-primary">
              <Tag className="w-3.5 h-3.5" />
              <span>{displayTreeId}</span>
              <button
                onClick={handleCopyTreeId}
                className="ml-1 hover:text-primary-foreground focus:outline-none"
                title="Copy Tree ID"
                aria-label="Copy Tree ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {healthStatusBadge(tree.status || "alive")}

            {tree.verification_status === "verified" ? (
              <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                <Clock className="h-3 w-3" /> {tree.verification_status || "Pending"}
              </Badge>
            )}

            {tree.admin_status && (
              <Badge
                variant="outline"
                className={`gap-1 text-xs capitalize ${
                  tree.admin_status === "approved"
                    ? "border-emerald-500/40 text-emerald-400"
                    : tree.admin_status === "rejected"
                    ? "border-rose-500/40 text-rose-400"
                    : "text-muted-foreground"
                }`}
              >
                <FileCheck className="h-3 w-3" /> Admin {tree.admin_status}
              </Badge>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column: Photo Evidence + Digital Tree Passport */}
            <div className="space-y-6">
              {/* Photo Evidence / Before-After Slider */}
              <div className="space-y-2">
                {showSlider ? (
                  <BeforeAfterSlider
                    beforeUrl={beforeUrl!}
                    afterUrl={afterUrl!}
                    beforeLabel="Planted"
                    afterLabel="Latest"
                  />
                ) : tree.photo_url ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-square border border-border shadow-md bg-muted/20 group">
                    <img
                      src={tree.photo_url}
                      alt={tree.tree_name || tree.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-medium flex items-center gap-1.5 border border-white/10">
                      <Camera className="w-3 h-3 text-emerald-400" /> Initial Photo Evidence
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl bg-muted/50 aspect-square flex flex-col items-center justify-center text-muted-foreground border border-border/80">
                    <TreePine className="h-16 w-16 mb-2 opacity-50" />
                    <span className="text-xs">No initial photo registered</span>
                  </div>
                )}

                {/* Planter Selfie Evidence Thumbnail if available */}
                {selfieUrl && (
                  <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center gap-3">
                    <img
                      src={selfieUrl}
                      alt="Planter verification selfie"
                      className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold flex items-center gap-1 text-foreground">
                        <UserCheck className="w-3.5 h-3.5 text-primary" /> Planter Selfie Evidence
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Ground-truth planter biometric proof
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Digital Tree Passport & Cryptographic QR */}
              <div className="glass-card rounded-2xl p-6 text-center space-y-4 border border-border shadow-lg">
                <div className="space-y-1">
                  <h3 className="font-heading font-semibold text-base flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Digital Tree Passport
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verifiable cryptographic MRV on-chain registry certificate
                  </p>
                </div>

                <div ref={qrRef} className="inline-block bg-white p-3 rounded-xl shadow-inner border border-border/50">
                  <QRCodeSVG value={profileUrl} size={160} level="H" includeMargin={false} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono font-semibold text-primary">{displayTreeId}</div>
                  <p className="text-[10px] font-mono text-muted-foreground break-all">{profileUrl}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl" onClick={downloadQR}>
                    <Download className="h-3.5 w-3.5" /> QR Code
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl" onClick={handleSharePassport}>
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />} Share
                  </Button>
                </div>

                <div className="pt-2 space-y-2">
                  <Link to={`/growth-updates?tree=${treeRealId}`} className="block">
                    <Button size="sm" className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md">
                      <Camera className="h-3.5 w-3.5" /> 30-Day Growth Check-in
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
                plantationDate={tree.plantation_date}
                initialPhotoUrl={tree.photo_url}
                species={tree.species}
                observations={observations}
                photos={photos}
                healthUpdates={healthUpdates}
                growthUpdates={growthUpdates}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeProfile;

