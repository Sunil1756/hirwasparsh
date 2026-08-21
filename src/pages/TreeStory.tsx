import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, MapPin, Calendar, Loader2, Share2, Download, Play, Pause, ChevronLeft, Heart, Droplets, AlertTriangle, Bot, Instagram, MessageCircle, Twitter, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import { VernacularVoiceAssistant } from "@/components/VernacularVoiceAssistant";

const STAGE_LABELS: Record<number, string> = {
  1: "🌱 Plantation Day",
  7: "🌿 Week 1 Update",
  30: "🌳 Month 1 Growth",
  90: "🌲 3 Month Milestone",
  180: "🌴 6 Month Check",
};

const TreeStory = () => {
  const { id } = useParams<{ id: string }>();
  const [playing, setPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["tree-story", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trees").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: planter } = useQuery({
    queryKey: ["planter-story", tree?.user_id],
    enabled: !!tree?.user_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", tree!.user_id!).single();
      return data;
    },
  });

  const { data: growthUpdates = [] } = useQuery({
    queryKey: ["story-growth", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_updates")
        .select("*")
        .eq("tree_id", id!)
        .order("update_day", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Build timeline from tree photos + growth updates
  const timeline = (() => {
    const items: { day: number; label: string; photo: string | null; date: string; healthStatus?: string; notes?: string }[] = [];

    if (tree) {
      items.push({
        day: 1,
        label: STAGE_LABELS[1],
        photo: tree.photo_url,
        date: tree.plantation_date,
      });
    }

    growthUpdates.forEach((u) => {
      items.push({
        day: u.update_day,
        label: STAGE_LABELS[u.update_day] || `Day ${u.update_day} Update`,
        photo: u.photo_url,
        date: u.created_at,
        healthStatus: u.ai_health_status || undefined,
        notes: u.notes || undefined,
      });
    });

    return items;
  })();

  // Slideshow logic
  useEffect(() => {
    if (playing && timeline.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => {
          if (prev >= timeline.length - 1) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, timeline.length]);

  const generateShareCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !tree) return null;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, "#1a472a");
    grad.addColorStop(1, "#0d2818");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Tree emoji
    ctx.font = "120px serif";
    ctx.textAlign = "center";
    ctx.fillText("🌳", 540, 400);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("My Tree is Growing!", 540, 560);

    // Species
    ctx.font = "36px sans-serif";
    ctx.fillStyle = "#a8d5ba";
    ctx.fillText(tree.species || "Tree", 540, 640);

    // Stats
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px sans-serif";
    ctx.fillText(`Planted on ${new Date(tree.plantation_date).toLocaleDateString()}`, 540, 760);
    ctx.fillText(`Location: ${tree.location}`, 540, 810);
    ctx.fillText(`Planter: ${planter?.full_name || "Anonymous"}`, 540, 860);
    ctx.fillText(`Growth Updates: ${growthUpdates.length}`, 540, 910);

    // Days alive
    const daysAlive = Math.floor((Date.now() - new Date(tree.plantation_date).getTime()) / 86400000);
    ctx.font = "bold 48px sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.fillText(`${daysAlive} Days Growing 🌱`, 540, 1040);

    // Watermark
    ctx.fillStyle = "#ffffff80";
    ctx.font = "24px sans-serif";
    ctx.fillText("Green Enlightenment – Growing India's Future 🌱", 540, 1800);

    return canvas.toDataURL("image/png");
  }, [tree, planter, growthUpdates]);

  const downloadStory = useCallback(async () => {
    const dataUrl = await generateShareCard();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `tree-story-${id}.png`;
    link.href = dataUrl;
    link.click();
  }, [generateShareCard, id]);

  const shareToSocial = useCallback(async (platform: string) => {
    const url = `${window.location.origin}/tree-story/${id}`;
    const text = `Check out my tree's growth story on Green Enlightenment! 🌳🌱`;
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };

    if (platform === "instagram") {
      await downloadStory();
      return;
    }

    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({ title: "My Tree Story", text, url });
      } catch (err) {
        console.debug("Native share cancelled or failed:", err);
      }
      return;
    }

    window.open(urls[platform], "_blank");
  }, [id, downloadStory]);

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

  const currentItem = timeline[currentSlide];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <canvas ref={canvasRef} className="hidden" />
      <div className="container mx-auto px-4 max-w-5xl">
        <Link to={`/tree/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to Tree Profile
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h1 className="font-heading text-3xl md:text-4xl font-bold">🌳 Tree Growth Story</h1>
            <VernacularVoiceAssistant
              text={`${tree.tree_name} झाडाची वाढ गोष्ट. प्रजाती: ${tree.species}. लागवड दिनांक: ${new Date(tree.plantation_date).toLocaleDateString()}. एकूण नोंदवलेली वाढ आणि टप्पे खालील स्लाइडशोमध्ये पहा.`}
            />
          </div>
          <p className="text-muted-foreground mb-8">Watch how this tree has grown over time through verified photo milestones</p>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Slideshow Viewer */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="overflow-hidden">
                <div className="relative aspect-[4/3] bg-muted">
                  {currentItem?.photo ? (
                    <motion.img
                      key={currentSlide}
                      src={currentItem.photo}
                      alt={currentItem.label}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6 }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TreePine className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-heading font-semibold">{currentItem?.label}</p>
                    <p className="text-white/70 text-sm">{currentItem?.date ? new Date(currentItem.date).toLocaleDateString() : ""}</p>
                  </div>
                  {/* Play/Pause */}
                  {timeline.length > 1 && (
                    <button
                      onClick={() => setPlaying(!playing)}
                      className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                    >
                      {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                {/* Slide dots */}
                {timeline.length > 1 && (
                  <div className="flex justify-center gap-2 p-3 bg-card">
                    {timeline.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentSlide(i); setPlaying(false); }}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {/* Share Buttons */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-primary" /> Share This Story
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => shareToSocial("whatsapp")}>
                      <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => shareToSocial("instagram")}>
                      <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => shareToSocial("twitter")}>
                      <Twitter className="h-4 w-4 text-sky-500" /> X (Twitter)
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => shareToSocial("facebook")}>
                      <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                    </Button>
                    {navigator.share && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => shareToSocial("native")}>
                        <Share2 className="h-4 w-4" /> More
                      </Button>
                    )}
                    <Button size="sm" className="gap-2" onClick={downloadStory}>
                      <Download className="h-4 w-4" /> Download Story Card
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Green Enlightenment – Growing India's Future 🌱
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Tree Info + Timeline */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tree Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tree Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <TreePine className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Species:</span>
                    <span className="font-medium">{tree.species}</span>
                  </div>
                  {tree.ai_detected_species && (
                    <div className="flex items-center gap-2 text-sm">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">AI Detected:</span>
                      <span className="font-medium">{tree.ai_detected_species}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{tree.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Planted:</span>
                    <span className="font-medium">{new Date(tree.plantation_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Planter:</span>
                    <span className="font-medium">{planter?.full_name || "Anonymous"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={tree.admin_status === "approved" ? "default" : "secondary"}>
                      {tree.admin_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Growth Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No growth updates yet.</p>
                  ) : (
                    <div className="space-y-0">
                      {timeline.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentSlide(i); setPlaying(false); }}
                          className={`w-full flex gap-3 p-3 rounded-lg text-left transition-colors ${
                            i === currentSlide ? "bg-primary/10" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`} />
                            {i < timeline.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                            {item.healthStatus && item.healthStatus !== "pending" && (
                              <Badge variant="outline" className="text-xs mt-1">{item.healthStatus}</Badge>
                            )}
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes}</p>
                            )}
                          </div>
                          {item.photo && (
                            <img src={item.photo} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TreeStory;
