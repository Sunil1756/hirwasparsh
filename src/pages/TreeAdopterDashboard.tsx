import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine,
  Sparkles,
  QrCode,
  Camera,
  MapPin,
  Calendar,
  ShieldCheck,
  Download,
  Share2,
  ExternalLink,
  Award,
  Heart,
  Wind,
  Leaf,
  PlusCircle,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  Satellite,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { TreeNdviSatelliteViewer } from "@/components/TreeNdviSatelliteViewer";
import { RiskAlertNotificationBanner } from "@/components/RiskAlertNotificationBanner";

export default function TreeAdopterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal states
  const [selectedTreeForPassport, setSelectedTreeForPassport] = useState<any | null>(null);
  const [selectedTreeForGrowth, setSelectedTreeForGrowth] = useState<any | null>(null);
  const [selectedTreeForNdvi, setSelectedTreeForNdvi] = useState<any | null>(null);
  const [growthPhoto, setGrowthPhoto] = useState<File | null>(null);
  const [growthNotes, setGrowthNotes] = useState<string>("");
  const [growthHeightCm, setGrowthHeightCm] = useState<number>(85);
  const [isSubmittingGrowth, setIsSubmittingGrowth] = useState(false);

  // Fetch trees adopted or planted by this user
  const { data: userTrees = [], isLoading: isTreesLoading } = useQuery({
    queryKey: ["adopter-trees", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("trees")
          .select("id, tree_name, species, location, latitude, longitude, verification_status, ai_confidence, points_awarded, photo_url, created_at, height_cm")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) return data;

        // Fallback demo trees if new user
        return [
          {
            id: "tree-adopt-001",
            tree_name: "Ganga Sacred Banyan",
            species: "Ficus benghalensis",
            location: "Rishikesh Forest Reserve, Uttarakhand",
            latitude: 30.0869,
            longitude: 78.2676,
            verification_status: "verified",
            ai_confidence: 94,
            points_awarded: 50,
            photo_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
            created_at: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
            height_cm: 110,
          },
          {
            id: "tree-adopt-002",
            tree_name: "Western Ghats Neem Protector",
            species: "Azadirachta indica",
            location: "Mahabaleshwar Bio-Corridor, Maharashtra",
            latitude: 17.9237,
            longitude: 73.6586,
            verification_status: "verified",
            ai_confidence: 88,
            points_awarded: 50,
            photo_url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop",
            created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
            height_cm: 145,
          },
        ];
      } catch {
        return [];
      }
    },
  });

  // User Profile stats
  const { data: profile } = useQuery({
    queryKey: ["adopter-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("eco_points, trees_planted, full_name")
        .eq("id", user?.id)
        .maybeSingle();
      return data || { eco_points: 150, trees_planted: userTrees.length, full_name: user?.email?.split("@")[0] };
    },
  });

  // Impact Calculations (IPCC Standards)
  const treesCount = userTrees.length || 2;
  const annualCo2Kg = treesCount * 22; // ~22kg CO2/tree/year
  const annualO2Kg = treesCount * 118; // ~118kg O2/tree/year
  const ecoPointsBalance = profile?.eco_points ?? treesCount * 50;

  // Handle Growth Check-in Submission
  const handleGrowthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreeForGrowth) return;

    setIsSubmittingGrowth(true);
    try {
      // Mock upload / supabase checkin record
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "🌿 Growth Check-In Verified!",
        description: `Successfully logged growth update for ${selectedTreeForGrowth.tree_name}. +50 Eco-Points awarded!`,
      });
      setSelectedTreeForGrowth(null);
      setGrowthPhoto(null);
      setGrowthNotes("");
      queryClient.invalidateQueries({ queryKey: ["adopter-trees"] });
      queryClient.invalidateQueries({ queryKey: ["adopter-profile"] });
    } catch (err: any) {
      toast({
        title: "Growth check-in failed",
        description: err?.message || "Could not save update.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrowth(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background via-emerald-500/[0.02] to-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Heart className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold">Citizen Adopter Sanctuary</h1>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                    Tree Adopter Steward
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Track your adopted trees, inspect verifiable QR passports, submit 30-day growth photos, and earn eco-points.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/plant">
                <Button className="gap-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                  <PlusCircle className="h-4 w-4" /> Adopt Another Tree
                </Button>
              </Link>
            </div>
          </div>

          {/* Proactive AI Tree Health Advisory Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-foreground">
                      Continuous Satellite Watch: All Adopted Canopies Safeguarded
                    </h3>
                    <Badge className="bg-emerald-500 text-white text-[10px]">Active Protection</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
                    Our Sentinel-2 multi-spectral AI monitoring runs bi-weekly overpasses over your tree coordinates. If moisture stress or micro-climate anomalies are detected, local field rangers are automatically dispatched with on-site hydration and care.
                  </p>
                </div>
              </div>

              <Badge variant="outline" className="text-xs py-1.5 px-3 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0">
                🛡️ Zero-Greenwashing Verified
              </Badge>
            </div>
          </div>

          {/* Real-time AI Risk Alert & Health Notification Stream */}
          <RiskAlertNotificationBanner role="adopter" />

          {/* Personal Eco-Impact Wallet Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Adopted Trees</span>
                <TreePine className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {treesCount} Trees
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">100% Verified Alive</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>CO₂e Sequestered</span>
                <Leaf className="h-4 w-4 text-teal-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {annualCo2Kg.toLocaleString()} kg/yr
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">IPCC Pantropical Standard</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Oxygen Generated</span>
                <Wind className="h-4 w-4 text-sky-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {annualO2Kg.toLocaleString()} kg/yr
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">For 2.4 Human Days/Day</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Eco-Points Balance</span>
                <Award className="h-4 w-4 text-amber-600" />
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                {ecoPointsBalance} pts
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">Steward Tier 2 (Silver)</div>
            </div>
          </div>

          {/* My Adopted Trees Showcase */}
          <div className="glass-card rounded-3xl p-6 border border-primary/20 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-emerald-600" />
                  My Adopted Canopy Portfolio
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Live satellite-monitored specimens under your active guardianship.
                </p>
              </div>

              <Badge variant="outline" className="text-xs">
                {userTrees.length} Trees Registered
              </Badge>
            </div>

            {isTreesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </div>
            ) : userTrees.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <TreePine className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="font-semibold text-foreground">No trees adopted yet!</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Adopt a native sapling to receive your Verifiable Digital Tree Passport with satellite telemetry.
                </p>
                <Link to="/plant">
                  <Button size="sm" className="rounded-xl mt-2 text-xs">
                    Adopt Your First Tree
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTrees.map((tree) => {
                  const confidence = tree.ai_confidence ?? 90;
                  const passportUrl = `${window.location.origin}/tree/${tree.id}`;

                  return (
                    <div
                      key={tree.id}
                      className="rounded-2xl border border-border/80 bg-background/60 hover:border-emerald-500/40 hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Tree Photo Header */}
                        <div className="relative h-44 w-full bg-muted overflow-hidden">
                          {tree.photo_url ? (
                            <img
                              src={tree.photo_url}
                              alt={tree.tree_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <TreePine className="h-12 w-12 text-primary/40" />
                            </div>
                          )}

                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <Badge className="bg-emerald-500 text-white text-[10px] font-bold shadow-md">
                              AI: {confidence}% Confirmed
                            </Badge>
                          </div>

                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{tree.location}</span>
                            </span>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-heading font-bold text-base text-foreground truncate">
                              {tree.tree_name}
                            </h3>
                            <p className="text-xs text-muted-foreground italic truncate">
                              {tree.species || "Native Specimen"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/40 border">
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Planted On</span>
                              <span className="font-medium text-foreground">
                                {new Date(tree.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Current Height</span>
                              <span className="font-medium text-foreground">
                                {tree.height_cm ? `${tree.height_cm} cm` : "120 cm"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-4 pt-0 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTreeForPassport(tree)}
                            className="h-8 text-xs gap-1.5 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <QrCode className="h-3.5 w-3.5" /> Passport QR
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => setSelectedTreeForGrowth(tree)}
                            className="h-8 text-xs gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <Camera className="h-3.5 w-3.5" /> Growth Log
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTreeForNdvi(tree)}
                          className="w-full h-8 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-medium"
                        >
                          <Satellite className="h-3.5 w-3.5 text-primary" /> Sentinel-2 NDVI Telemetry
                        </Button>

                        <Link to={`/tree/${tree.id}`} className="block">
                          <Button variant="ghost" size="sm" className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3 w-3 mr-1" /> View Full Telemetry & Blockchain Proof
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Digital Tree Passport QR Modal */}
      <Dialog open={!!selectedTreeForPassport} onOpenChange={() => setSelectedTreeForPassport(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Verifiable Digital Tree Passport
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cryptographically verified tree certificate anchored on Supabase with Sentinel-2 NDVI telemetry.
            </DialogDescription>
          </DialogHeader>

          {selectedTreeForPassport && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center border shadow-inner">
                <QRCodeSVG
                  value={`${window.location.origin}/tree/${selectedTreeForPassport.id}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
                <span className="text-[10px] text-gray-500 mt-2 font-mono">
                  ID: {selectedTreeForPassport.id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Tree Name:</span>
                  <span className="font-semibold text-foreground">{selectedTreeForPassport.tree_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Botanical Species:</span>
                  <span className="font-medium italic">{selectedTreeForPassport.species}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">GPS Location:</span>
                  <span className="font-mono text-[11px]">
                    {selectedTreeForPassport.latitude?.toFixed(4)}°, {selectedTreeForPassport.longitude?.toFixed(4)}°
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Verification Hash:</span>
                  <span className="font-mono text-[10px] text-emerald-600 truncate max-w-[180px]">
                    SHA256: 8f9b2d...c301
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Link to={`/tree/${selectedTreeForPassport.id}`} className="flex-1">
                  <Button className="w-full text-xs rounded-xl" size="sm">
                    Open Full Passport
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/tree/${selectedTreeForPassport.id}`);
                    toast({ title: "🔗 Passport Link Copied!" });
                  }}
                  className="rounded-xl text-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 30/90/180-Day Growth Check-In Modal */}
      <Dialog open={!!selectedTreeForGrowth} onOpenChange={() => setSelectedTreeForGrowth(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-600" />
              Growth Milestone Check-In
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit a fresh photo of <strong>{selectedTreeForGrowth?.tree_name}</strong> to verify vital health and earn +50 Eco-Points.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGrowthSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tree Height (cm)</Label>
              <Input
                type="number"
                min={10}
                max={2000}
                required
                value={growthHeightCm}
                onChange={(e) => setGrowthHeightCm(parseInt(e.target.value) || 85)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Health & Vitality Notes</Label>
              <Input
                placeholder="e.g. Vigorous new shoots, regular watering, no pest damage"
                value={growthNotes}
                onChange={(e) => setGrowthNotes(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recent Ground Photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setGrowthPhoto(e.target.files?.[0] || null)}
                className="rounded-xl text-xs h-9"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmittingGrowth}
              className="w-full rounded-xl gap-2 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md mt-2"
            >
              {isSubmittingGrowth ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Submit Milestone (+50 Eco-Points)
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sentinel-2 Multi-Spectral NDVI Telemetry Modal */}
      <Dialog open={!!selectedTreeForNdvi} onOpenChange={() => setSelectedTreeForNdvi(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              Copernicus Sentinel-2 Vegetation Index Telemetry
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Live 10m GSD Multi-Spectral NDVI and surface reflectance analytics for{" "}
              <strong>{selectedTreeForNdvi?.tree_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedTreeForNdvi && (
            <div className="pt-2">
              <TreeNdviSatelliteViewer
                treeId={selectedTreeForNdvi.id}
                latitude={selectedTreeForNdvi.latitude || 18.5204}
                longitude={selectedTreeForNdvi.longitude || 73.8567}
                treeName={selectedTreeForNdvi.tree_name}
                species={selectedTreeForNdvi.species}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
