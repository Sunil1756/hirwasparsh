import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TreePine, Upload, MapPin, Calendar, Ruler, FileText, Loader2, CheckCircle, ShieldCheck, ShieldX, Clock, Bot, Camera, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import exifr from "exifr";

type SpeciesDetection = {
  common_name: string;
  scientific_name: string;
  confidence: number;
  description: string;
};

type PhotoStep = "before" | "after" | "selfie";

const stepLabels: Record<PhotoStep, { label: string; desc: string; icon: any }> = {
  before: { label: "Before Plantation", desc: "Photo of the empty spot before planting", icon: Camera },
  after: { label: "After Plantation", desc: "Photo of the planted tree", icon: TreePine },
  selfie: { label: "Selfie With Tree", desc: "Your selfie showing face + tree", icon: User },
};

const PlantTree = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const driveId = searchParams.get("drive");

  const [currentStep, setCurrentStep] = useState<PhotoStep>("before");
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "browser" | "failed">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [treeName, setTreeName] = useState("");
  const [species, setSpecies] = useState("");
  const [plantationDate, setPlantationDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");

  // Photo states
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // EXIF warnings
  const [exifWarnings, setExifWarnings] = useState<string[]>([]);

  // AI species detection
  const [speciesDetection, setSpeciesDetection] = useState<SpeciesDetection | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [speciesConfirmed, setSpeciesConfirmed] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      setLocation(data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

  const getBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("failed");
      return;
    }
    setGeoStatus("browser");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGeoStatus("success");
      },
      () => setGeoStatus("failed"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validateExif = async (file: File) => {
    const warnings: string[] = [];
    try {
      const exif = await exifr.parse(file, true);
      if (!exif) {
        warnings.push("⚠️ No EXIF data found — photo may be from gallery or screenshot");
      } else {
        // Check timestamp freshness (within last 24 hours)
        const dateKeys = ["DateTimeOriginal", "CreateDate", "ModifyDate"];
        const photoDate = dateKeys.map(k => exif[k]).find(Boolean);
        if (photoDate) {
          const hoursDiff = (Date.now() - new Date(photoDate).getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 24) {
            warnings.push(`⚠️ Photo timestamp is ${Math.round(hoursDiff)}h old — expected a recent photo`);
          }
        } else {
          warnings.push("⚠️ No timestamp in photo metadata");
        }
        // Check GPS
        if (!exif.latitude || !exif.longitude) {
          warnings.push("⚠️ No GPS data in photo — using device location instead");
        }
      }
    } catch {
      warnings.push("⚠️ Could not read photo metadata");
    }
    return warnings;
  };

  const detectSpecies = async (file: File) => {
    setIsDetecting(true);
    setSpeciesDetection(null);
    setSpeciesConfirmed(false);
    try {
      const imageBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("detect-species", { body: { imageBase64 } });
      if (error) throw error;
      const detection = data as SpeciesDetection;
      setSpeciesDetection(detection);
      setSpecies(detection.common_name);
      toast({ title: "🤖 Species Detected!", description: `${detection.common_name} (${detection.confidence}% confidence)` });
    } catch {
      toast({ title: "AI Detection Failed", description: "Please enter the species manually.", variant: "destructive" });
    } finally {
      setIsDetecting(false);
    }
  };

  const handlePhotoUpload = async (step: PhotoStep, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (step === "before") {
      setBeforePhoto(file);
      setBeforePreview(preview);
    } else if (step === "after") {
      setAfterPhoto(file);
      setAfterPreview(preview);
    } else {
      setSelfiePhoto(file);
      setSelfiePreview(preview);
    }

    // EXIF validation
    const warnings = await validateExif(file);
    if (warnings.length > 0) {
      setExifWarnings(prev => [...prev.filter(w => !w.includes(step)), ...warnings]);
    }

    // 🌍 AUTO GEO-TAG on EVERY photo capture (not just "after")
    // Try EXIF GPS first → fall back to browser geolocation
    if (!latitude || !longitude || step === "after") {
      setGeoStatus("loading");
      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          setLatitude(gps.latitude);
          setLongitude(gps.longitude);
          await reverseGeocode(gps.latitude, gps.longitude);
          setGeoStatus("success");
          toast({ title: "📍 Location auto-tagged", description: "GPS extracted from photo metadata." });
        } else {
          getBrowserLocation();
        }
      } catch {
        getBrowserLocation();
      }
    }

    // Detect species from "after" photo
    if (step === "after") {
      detectSpecies(file);
    }

    // Auto-advance step
    if (step === "before") setCurrentStep("after");
    else if (step === "after") setCurrentStep("selfie");
  };

  const uploadPhoto = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from("treebank").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("treebank").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const uploadSelfie = async (file: File, path: string) => {
    // Selfies go to the PRIVATE 'selfies' bucket. Store the storage path (not a public URL).
    const { data, error } = await supabase.storage.from("selfies").upload(path, file, { upsert: true });
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please log in", variant: "destructive" });
      return;
    }
    if (!beforePhoto || !afterPhoto || !selfiePhoto) {
      toast({ title: "All 3 photos required", description: "Please upload before, after, and selfie photos.", variant: "destructive" });
      return;
    }
    if (!latitude || !longitude) {
      toast({ title: "Location required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Verify the auth session is still valid (prevents RLS failures from stale sessions)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user?.id) {
        toast({ title: "Session expired", description: "Please log in again to submit your plantation.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const authUserId = sessionData.session.user.id;
      console.log("[PlantTree] Submitting as user:", authUserId);

      const ts = Date.now();
      const [beforeUrl, afterUrl, selfieUrl] = await Promise.all([
        uploadPhoto(beforePhoto, `${authUserId}/${ts}_before.jpg`),
        uploadPhoto(afterPhoto, `${authUserId}/${ts}_after.jpg`),
        uploadPhoto(selfiePhoto, `${authUserId}/${ts}_selfie.jpg`),
      ]);

      // Simple hash for duplicate detection
      const photoHash = `${afterPhoto.size}_${afterPhoto.lastModified}_${afterPhoto.name}`;

      const { data: tree, error: insertError } = await supabase
        .from("trees")
        .insert({
          tree_name: treeName,
          species,
          plantation_date: plantationDate,
          height_cm: parseFloat(heightCm),
          location,
          latitude,
          longitude,
          description: description || null,
          verification_status: "pending",
          admin_status: "pending",
          points_awarded: 0,
          user_id: authUserId,
          drive_id: driveId || null,
          photo_url: afterUrl,
          before_photo_url: beforeUrl,
          selfie_photo_url: selfieUrl,
          photo_hash: photoHash,
          exif_timestamp: new Date().toISOString(),
          ai_detected_species: speciesDetection?.common_name || null,
          ai_scientific_name: speciesDetection?.scientific_name || null,
          ai_species_confidence: speciesDetection?.confidence || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger enhanced AI verification with all 3 photos
      if (tree) {
        const [afterB64, selfieB64, beforeB64] = await Promise.all([
          fileToBase64(afterPhoto),
          fileToBase64(selfiePhoto),
          fileToBase64(beforePhoto),
        ]);
        supabase.functions.invoke("verify-tree", {
          body: {
            imageBase64: afterB64,
            selfieBase64: selfieB64,
            beforeBase64: beforeB64,
            treeId: tree.id,
            species,
            photoHash,
          },
        }).catch(console.error);
      }

      setSubmitted(true);
      toast({ title: "🌳 Plantation Submitted!", description: "Your submission is pending admin approval. Points will be credited after verification." });
    } catch (error: any) {
      console.error("[PlantTree] Submission error:", error);
      const msg = error?.message || "Unknown error";
      const hint = msg.includes("row-level security")
        ? "This usually means your session expired. Please log out and log back in, then try again."
        : msg;
      toast({ title: "Submission failed", description: hint, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-2xl p-12 text-center max-w-md">
          <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-2">Submission Received!</h2>
          <p className="text-muted-foreground mb-4">
            Your plantation is under review. An admin will verify your photos.
            <br /><strong>Points will be credited only after admin approval.</strong>
          </p>
          <div className="inline-block bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            ⏳ Pending Admin Review
          </div>
          <Button className="w-full" onClick={() => window.location.reload()}>Submit Another Plantation</Button>
        </motion.div>
      </div>
    );
  }

  const allPhotosUploaded = !!beforePhoto && !!afterPhoto && !!selfiePhoto;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <TreePine className="h-4 w-4" /> Register Your Plantation
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Plant a Tree</h1>
            <p className="text-muted-foreground">Upload 3 photos: Before → After → Selfie. Points awarded after admin approval only.</p>
            {driveId && <Badge variant="secondary" className="mt-2">Registering under a Plantation Drive</Badge>}
          </div>

          {/* Photo Steps */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h2 className="font-heading text-lg font-semibold mb-4">📸 Photo Evidence (Required)</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["before", "after", "selfie"] as PhotoStep[]).map(step => {
                const preview = step === "before" ? beforePreview : step === "after" ? afterPreview : selfiePreview;
                const done = step === "before" ? !!beforePhoto : step === "after" ? !!afterPhoto : !!selfiePhoto;
                const Icon = stepLabels[step].icon;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                      currentStep === step ? "border-primary bg-primary/5" : done ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}
                  >
                    {preview ? (
                      <img src={preview} alt={step} className="w-full h-20 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-20 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-xs font-medium">{stepLabels[step].label}</div>
                    {done && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current step upload */}
            <div className="border rounded-xl p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{stepLabels[currentStep].label}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{stepLabels[currentStep].desc}</p>
              <Input
                type="file"
                accept="image/*"
                capture={currentStep === "selfie" ? "user" : "environment"}
                onChange={(e) => handlePhotoUpload(currentStep, e)}
                className="cursor-pointer"
              />
            </div>

            {/* EXIF Warnings */}
            {exifWarnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {exifWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Species Detection */}
          {isDetecting && (
            <div className="glass-card rounded-xl p-4 border-primary/20 mb-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">AI is analyzing the tree species...</span>
              </div>
            </div>
          )}

          {speciesDetection && !isDetecting && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-4 border border-primary/20 bg-primary/5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary">Species detected by AI</span>
                <Badge variant="secondary" className="text-xs ml-auto">{speciesDetection.confidence}%</Badge>
              </div>
              <div className="font-heading font-semibold text-lg">{speciesDetection.common_name}</div>
              <div className="text-sm text-muted-foreground italic">{speciesDetection.scientific_name}</div>
              <p className="text-xs text-muted-foreground mt-2">{speciesDetection.description}</p>
              <div className="flex gap-2 mt-3">
                {!speciesConfirmed ? (
                  <>
                    <Button type="button" size="sm" onClick={() => setSpeciesConfirmed(true)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setSpeciesDetection(null); setSpecies(""); }}>
                      Edit Manually
                    </Button>
                  </>
                ) : (
                  <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <CheckCircle className="h-3 w-3" /> Species Confirmed
                  </Badge>
                )}
              </div>
            </motion.div>
          )}

          {/* Form (shown after all photos) */}
          {allPhotosUploaded && (
            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><TreePine className="h-4 w-4" /> Tree Name</Label>
                  <Input placeholder="e.g., My Neem Tree" required value={treeName} onChange={e => setTreeName(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Species</Label>
                  <Input placeholder="e.g., Neem" required value={species} onChange={e => setSpecies(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" /> Plantation Date</Label>
                  <Input type="date" required value={plantationDate} onChange={e => setPlantationDate(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Ruler className="h-4 w-4" /> Height (cm)</Label>
                  <Input type="number" placeholder="30" required value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                </div>
              </div>

              {/* Location */}
              <div className="glass-card rounded-xl p-4">
                <Label className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Auto-detected Location</Label>
                {geoStatus === "success" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-primary"><CheckCircle className="h-4 w-4" /> Location detected</div>
                    <p className="text-sm">{location}</p>
                    <p className="text-xs text-muted-foreground">GPS: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}</p>
                  </div>
                )}
                {(geoStatus === "loading" || geoStatus === "browser") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Detecting location...
                  </div>
                )}
                {geoStatus === "failed" && (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">Could not detect location.</p>
                    <Button type="button" variant="outline" size="sm" onClick={getBrowserLocation}>
                      <MapPin className="h-4 w-4 mr-1" /> Try Again
                    </Button>
                  </div>
                )}
                {geoStatus === "idle" && (
                  <p className="text-sm text-muted-foreground">Upload "After" photo to detect location</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Description (Optional)</Label>
                <Textarea placeholder="Tell us about your tree..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <Button type="submit" size="lg" className="w-full text-lg gap-2" disabled={isSubmitting || isDetecting || !latitude}>
                {isSubmitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>
                ) : (
                  <><TreePine className="h-5 w-5" /> Submit Plantation</>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                ⚠️ Points are credited <strong>only after admin approval</strong>. Fake submissions will be flagged.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PlantTree;
