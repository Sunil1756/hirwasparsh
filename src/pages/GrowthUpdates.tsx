import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, TreePine, Loader2, LogIn, CheckCircle, Clock, Upload, AlertTriangle, Sprout, QrCode, MapPin, HandHeart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import QRScanner from "@/components/QRScanner";
import { compressImage, sha256File, haversineMeters } from "@/lib/imageProcessing";

const updateDays = [
  { day: 7, label: "Week 1", points: 5, desc: "7-day survival check" },
  { day: 30, label: "Month 1", points: 10, desc: "30-day growth check" },
  { day: 90, label: "Month 3", points: 20, desc: "90-day health check" },
];

const GrowthUpdates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTree, setSelectedTree] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [qrVerified, setQrVerified] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [delegateTree, setDelegateTree] = useState<any | null>(null);

  const { data: userTrees = [] } = useQuery({
    queryKey: ["user-approved-trees", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_trees_with_token");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedTreeObj = userTrees.find(t => t.id === selectedTree);

  const handleQrResult = (text: string) => {
    setQrScannerOpen(false);
    if (!selectedTreeObj) return;
    if (text !== selectedTreeObj.qr_token && !text.includes(selectedTreeObj.id)) {
      toast({ title: "❌ QR mismatch", description: "Scanned QR does not belong to this tree.", variant: "destructive" });
      return;
    }
    // GPS proximity check
    if (!navigator.geolocation || selectedTreeObj.latitude == null) {
      setQrVerified(true);
      toast({ title: "✅ QR verified", description: "Location check skipped (no GPS)." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const R = 6371000;
        const dLat = (pos.coords.latitude - selectedTreeObj.latitude!) * Math.PI / 180;
        const dLng = (pos.coords.longitude - selectedTreeObj.longitude!) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(pos.coords.latitude * Math.PI/180) * Math.cos(selectedTreeObj.latitude! * Math.PI/180) * Math.sin(dLng/2)**2;
        const dist = R * 2 * Math.asin(Math.sqrt(a));
        if (dist > 50) {
          toast({ title: "❌ GPS mismatch", description: `You are ${Math.round(dist)}m from the registered tree. Updates require you to be on-site.`, variant: "destructive" });
          return;
        }
        setQrVerified(true);
        toast({ title: "✅ Verified", description: `On-site (${Math.round(dist)}m from tree).` });
      },
      () => { setQrVerified(true); toast({ title: "✅ QR verified", description: "Couldn't read GPS." }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const { data: existingUpdates = [] } = useQuery({
    queryKey: ["user-growth-updates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_updates")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedTree || !selectedDay) throw new Error("Missing fields");
      setIsUploading(true);

      let photoUrl: string | null = null;
      if (photo) {
        const path = `${user.id}/growth_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from("treebank").upload(path, photo, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("treebank").getPublicUrl(data.path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("growth_updates").insert({
        tree_id: selectedTree,
        user_id: user.id,
        update_day: parseInt(selectedDay),
        photo_url: photoUrl,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-growth-updates"] });
      const dayInfo = updateDays.find(d => d.day === parseInt(selectedDay));
      toast({ title: `✅ ${dayInfo?.label} Update Submitted!`, description: `+${dayInfo?.points} points awarded for this growth update.` });
      setSelectedTree("");
      setSelectedDay("");
      setNotes("");
      setPhoto(null);
      setPhotoPreview(null);
      setIsUploading(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setIsUploading(false);
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sprout className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="font-heading text-2xl font-bold">Sign in to submit growth updates</h2>
          <Link to="/login"><Button><LogIn className="mr-2 h-4 w-4" /> Sign In</Button></Link>
        </div>
      </div>
    );
  }

  // Build progress map per tree
  const treeUpdatesMap = new Map<string, number[]>();
  existingUpdates.forEach(u => {
    const existing = treeUpdatesMap.get(u.tree_id) || [];
    existing.push(u.update_day);
    treeUpdatesMap.set(u.tree_id, existing);
  });

  const getAvailableDays = (treeId: string) => {
    const done = treeUpdatesMap.get(treeId) || [];
    return updateDays.filter(d => !done.includes(d.day));
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <Sprout className="h-4 w-4" /> Growth Tracking
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Growth Updates</h1>
            <p className="text-muted-foreground">Upload survival photos at 7, 30, and 90 days to earn bonus points</p>
          </div>

          {/* Points info */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h2 className="font-heading text-lg font-semibold mb-3">📅 Update Schedule & Points</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {updateDays.map(d => (
                <div key={d.day} className="p-4 rounded-xl bg-muted/50 text-center">
                  <div className="font-heading text-xl font-bold text-primary">Day {d.day}</div>
                  <div className="text-sm text-muted-foreground">{d.desc}</div>
                  <Badge className="mt-2 bg-primary/10 text-primary">+{d.points} pts</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">⚠️ Only approved trees are eligible for growth updates. Missing updates may result in reduced points.</p>
          </div>

          {/* Tree progress cards */}
          {userTrees.length > 0 && (
            <div className="glass-card rounded-2xl p-6 mb-8">
              <h2 className="font-heading text-lg font-semibold mb-4">Your Trees — Growth Progress</h2>
              <div className="space-y-3">
                {userTrees.map(t => {
                  const doneDays = treeUpdatesMap.get(t.id) || [];
                  const progress = Math.round((doneDays.length / 3) * 100);
                  return (
                    <div key={t.id} className="p-4 rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TreePine className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{t.tree_name}</span>
                          <span className="text-xs text-muted-foreground">({t.species})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 mb-2" />
                      <div className="flex gap-2">
                        {updateDays.map(d => {
                          const done = doneDays.includes(d.day);
                          return (
                            <Badge key={d.day} variant={done ? "default" : "outline"} className={`text-xs gap-1 ${done ? "bg-primary/10 text-primary" : ""}`}>
                              {done ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              Day {d.day}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit update form */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading text-lg font-semibold mb-4">Submit Growth Update</h2>

            {userTrees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No approved trees yet. Get a tree approved first!</p>
                <Link to="/plant"><Button variant="outline" className="mt-3">Plant a Tree</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Select Tree</Label>
                  <Select value={selectedTree} onValueChange={(v) => { setSelectedTree(v); setSelectedDay(""); setQrVerified(false); }}>
                    <SelectTrigger><SelectValue placeholder="Choose your approved tree" /></SelectTrigger>
                    <SelectContent>
                      {userTrees.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.tree_name} ({t.species})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTree && !qrVerified && (
                  <div className="rounded-xl p-4 border-2 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-2">
                      <QrCode className="h-5 w-5" /> QR Authentication Required
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Scan this tree's QR code on-site. Updates require GPS proximity to the registered tree.
                    </p>
                    <Button size="sm" onClick={() => setQrScannerOpen(true)} className="gap-2">
                      <Camera className="h-4 w-4" /> Open Scanner
                    </Button>
                  </div>
                )}

                {selectedTree && qrVerified && (
                  <div className="rounded-xl p-3 border border-primary/30 bg-primary/5 flex items-center gap-2 text-sm text-primary">
                    <CheckCircle className="h-4 w-4" /> QR + GPS verified — you can submit this update
                  </div>
                )}

                {selectedTree && (
                  <div>
                    <Label>Update Period</Label>
                    {getAvailableDays(selectedTree).length === 0 ? (
                      <p className="text-sm text-primary mt-1">✅ All updates completed for this tree!</p>
                    ) : (
                      <Select value={selectedDay} onValueChange={setSelectedDay}>
                        <SelectTrigger><SelectValue placeholder="Select update period" /></SelectTrigger>
                        <SelectContent>
                          {getAvailableDays(selectedTree).map(d => (
                            <SelectItem key={d.day} value={String(d.day)}>{d.label} (Day {d.day}) — +{d.points} pts</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {selectedDay && qrVerified && (
                  <>
                    <div>
                      <Label className="flex items-center gap-2 mb-2"><Camera className="h-4 w-4" /> Growth Photo</Label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                      {photoPreview && (
                        <img src={photoPreview} alt="Preview" className="mt-3 w-full max-h-48 object-cover rounded-lg" />
                      )}
                    </div>

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea placeholder="How is your tree doing?" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                    </div>

                    <Button className="w-full gap-2" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || isUploading}>
                      {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Submit Day {selectedDay} Update
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      {qrScannerOpen && <QRScanner onResult={handleQrResult} onClose={() => setQrScannerOpen(false)} />}
    </div>
  );
};

export default GrowthUpdates;
