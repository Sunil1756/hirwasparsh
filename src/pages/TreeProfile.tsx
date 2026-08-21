import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, MapPin, Calendar, Ruler, ShieldCheck, Clock, Loader2, Download, Heart, Droplets, AlertTriangle, Skull, Bot, Activity, Sun, CloudRain, Sparkles, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useRef } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { computeHealthScore, computeImpact, careTips, nearbyNativeSuggestions, treeAgeMonths, ageLabel } from "@/lib/treeIntelligence";

const healthIcon: Record<string, React.ReactNode> = {
  healthy: <Heart className="h-4 w-4 text-primary" />,
  "needs water": <Droplets className="h-4 w-4 text-sky-500" />,
  damaged: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  dead: <Skull className="h-4 w-4 text-destructive" />,
};

const TreeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["tree", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: planter } = useQuery({
    queryKey: ["planter", tree?.user_id],
    enabled: !!tree?.user_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", tree!.user_id!).single();
      return data;
    },
  });

  const { data: healthUpdates = [] } = useQuery({
    queryKey: ["health-updates", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_health_updates")
        .select("*")
        .eq("tree_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: growthUpdates = [] } = useQuery({
    queryKey: ["growth-updates", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_updates")
        .select("id, photo_url, update_day, created_at")
        .eq("tree_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const profileUrl = `${window.location.origin}/tree/${id}`;

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
      link.download = `tree-${id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    try {
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svgData);
    }
  }, [id]);

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
        <div className="text-center">
          <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-2">Tree Not Found</h2>
          <Link to="/tree-map"><Button variant="outline">Back to Map</Button></Link>
        </div>
      </div>
    );
  }

  // ---- Intelligence layer ----
  const treeAny = tree as any;
  const beforeUrl: string | null = treeAny.before_photo_url || null;
  const latestGrowthPhoto = [...growthUpdates].reverse().find((g) => g.photo_url)?.photo_url;
  const afterUrl = latestGrowthPhoto || tree.photo_url;
  const showSlider = !!(beforeUrl && afterUrl && beforeUrl !== afterUrl);

  const { score, band, reasons } = computeHealthScore(tree as any, healthUpdates as any, growthUpdates as any);
  const impact = computeImpact(tree as any);
  const care = careTips(tree as any);
  const natives = nearbyNativeSuggestions(tree.location || "");
  const ageM = treeAgeMonths(tree as any);
  const bandColor =
    band === "excellent" ? "hsl(142 71% 45%)"
    : band === "good" ? "hsl(88 60% 45%)"
    : band === "fair" ? "hsl(38 92% 50%)"
    : "hsl(0 84% 60%)";

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: Photo + QR */}
            <div className="space-y-6">
              {showSlider ? (
                <BeforeAfterSlider beforeUrl={beforeUrl!} afterUrl={afterUrl!} beforeLabel="Planted" afterLabel="Now" />
              ) : tree.photo_url ? (
                <img src={tree.photo_url} alt={tree.tree_name} className="w-full rounded-2xl object-cover aspect-square" />
              ) : (
                <div className="w-full rounded-2xl bg-muted/50 aspect-square flex items-center justify-center">
                  <TreePine className="h-20 w-20 text-muted-foreground" />
                </div>
              )}

              <div className="glass-card rounded-2xl p-6 text-center">
                <h3 className="font-heading font-semibold mb-3">Tree QR Code</h3>
                <div ref={qrRef} className="inline-block bg-card p-3 rounded-xl">
                  <QRCodeSVG value={profileUrl} size={180} level="H" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 break-all">{profileUrl}</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={downloadQR}>
                  <Download className="h-4 w-4" /> Download QR
                </Button>
                <Link to={`/tree-story/${id}`}>
                  <Button size="sm" className="mt-2 w-full gap-2">
                    <TreePine className="h-4 w-4" /> View Growth Story
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="font-heading text-3xl font-bold">{tree.tree_name}</h1>
                    <p className="text-muted-foreground">{tree.species}</p>
                    {tree.ai_detected_species && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Bot className="h-3 w-3" /> AI: {tree.ai_detected_species}
                        </Badge>
                        {tree.ai_scientific_name && (
                          <span className="text-xs text-muted-foreground italic">{tree.ai_scientific_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {tree.verification_status === "verified" ? (
                    <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {tree.verification_status}</Badge>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="text-sm">{tree.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Planted</div>
                      <div className="text-sm">{new Date(tree.plantation_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ruler className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Height</div>
                      <div className="text-sm">{tree.height_cm} cm</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TreePine className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Planter</div>
                      <div className="text-sm">{planter?.full_name || "Anonymous"}</div>
                    </div>
                  </div>
                </div>

                {tree.description && (
                  <p className="mt-4 text-sm text-muted-foreground">{tree.description}</p>
                )}

                {tree.ai_analysis && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                      <Bot className="h-3 w-3" /> AI Analysis
                    </div>
                    <p className="text-sm text-muted-foreground">{tree.ai_analysis}</p>
                    {tree.ai_confidence && (
                      <p className="text-xs text-primary mt-1">Confidence: {tree.ai_confidence}%</p>
                    )}
                  </div>
                )}
              </div>
              {/* AI Health Score */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">AI Tree Health Score</h2>
                  <Badge variant="secondary" className="ml-auto capitalize">{band}</Badge>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                      <motion.circle
                        cx="60" cy="60" r="50" fill="none" stroke={bandColor} strokeWidth="10" strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        initial={{ strokeDasharray: "0 314" }}
                        animate={{ strokeDasharray: `${(score / 100) * 314} 314` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-heading text-3xl font-bold" style={{ color: bandColor }}>{score}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5 text-xs">
                    {reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {r}
                      </div>
                    ))}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1 text-xs"><Calendar className="h-3 w-3" /> Age: {ageLabel(ageM)}</Badge>
                      {tree.ai_confidence != null && (
                        <Badge variant="outline" className="gap-1 text-xs"><Bot className="h-3 w-3" /> AI conf: {tree.ai_confidence}%</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environmental Impact */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Environmental Impact
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { icon: <Wind className="h-4 w-4" />, label: "CO₂ absorbed", value: `${impact.co2KgPerYear} kg/yr` },
                    { icon: <Sparkles className="h-4 w-4" />, label: "O₂ generated", value: `${impact.o2KgPerYear} kg/yr` },
                    { icon: <Sun className="h-4 w-4" />, label: "Shade area", value: `${impact.shadeM2} m²` },
                    { icon: <CloudRain className="h-4 w-4" />, label: "Rainwater filtered", value: `${impact.rainwaterLitersPerYear} L/yr` },
                    { icon: <TreePine className="h-4 w-4" />, label: "Biodiversity", value: `${impact.biodiversityScore}/100` },
                    { icon: <Activity className="h-4 w-4" />, label: "Cars offset", value: `${impact.carsOffsetPerYear}` },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-primary/5 p-3">
                      <div className="flex items-center gap-1.5 text-primary text-xs mb-1">{s.icon}{s.label}</div>
                      <div className="font-heading font-bold text-lg">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Care Tips */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" /> Care Guide
                </h2>
                <div className="rounded-xl bg-primary/5 p-3 mb-3">
                  <div className="text-xs text-muted-foreground">Recommended watering</div>
                  <div className="text-sm font-medium">{care.watering}</div>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {care.tips.map((t, i) => (
                    <li key={i} className="flex gap-2"><span className="text-primary">•</span>{t}</li>
                  ))}
                </ul>
                {natives.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2">Suggested native companions nearby</div>
                    <div className="flex flex-wrap gap-1.5">
                      {natives.map((n) => (
                        <span key={n} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Health Timeline */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Growth & Health Timeline</h2>
                {healthUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No health updates yet.</p>
                ) : (
                  <div className="space-y-4">
                    {healthUpdates.map((u) => (
                      <div key={u.id} className="flex gap-3">
                        <div className="mt-1">{healthIcon[u.health_status] || <Heart className="h-4 w-4" />}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{u.health_status}</span>
                            <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                          {u.notes && <p className="text-sm text-muted-foreground mt-0.5">{u.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeProfile;
