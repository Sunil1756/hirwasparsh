import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TreePine, Upload, MapPin, Calendar, Ruler, FileText, Loader2, CheckCircle, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import exifr from "exifr";

type VerificationResult = {
  status: "verified" | "rejected";
  verification: {
    is_tree: boolean;
    is_genuine_photo: boolean;
    species_match: string;
    health_status: string;
    confidence: number;
    analysis: string;
  };
};

const PlantTree = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "browser" | "failed">("idle");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [treeName, setTreeName] = useState("");
  const [species, setSpecies] = useState("");
  const [plantationDate, setPlantationDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data?.display_name) {
        setLocation(data.display_name);
      } else {
        setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

  const getBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support location access.", variant: "destructive" });
      setGeoStatus("failed");
      return;
    }
    setGeoStatus("browser");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        await reverseGeocode(lat, lng);
        setGeoStatus("success");
        toast({ title: "📍 Location Detected!", description: "GPS location obtained from your device." });
      },
      () => {
        setGeoStatus("failed");
        toast({ title: "Location access denied", description: "Please allow location access to auto-detect your position.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast, reverseGeocode]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setGeoStatus("loading");

    try {
      const gps = await exifr.gps(file);
      if (gps?.latitude && gps?.longitude) {
        setLatitude(gps.latitude);
        setLongitude(gps.longitude);
        await reverseGeocode(gps.latitude, gps.longitude);
        setGeoStatus("success");
        toast({ title: "📍 Location Detected!", description: "GPS coordinates extracted from your photo automatically." });
      } else {
        // Fallback to browser geolocation
        getBrowserLocation();
      }
    } catch {
      // Fallback to browser geolocation
      getBrowserLocation();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to plant a tree.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!latitude || !longitude) {
      toast({ title: "Location required", description: "Please upload a photo with GPS data or allow location access.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
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
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (photoFile && tree) {
        toast({ title: "🤖 AI Verification Started", description: "Analyzing your tree photo..." });
        const imageBase64 = await fileToBase64(photoFile);
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-tree", {
          body: { imageBase64, treeId: tree.id, species },
        });
        if (verifyError) {
          console.error("Verification error:", verifyError);
          toast({ title: "Verification pending", description: "Tree registered but AI verification will be retried later.", variant: "destructive" });
        } else {
          setVerificationResult(verifyData as VerificationResult);
        }
      }

      setSubmitted(true);
      toast({ title: "Tree Registered! 🌳", description: "Your tree plantation has been submitted." });
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({ title: "Submission failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-2xl p-12 text-center max-w-md nature-glow">
          {verificationResult?.status === "verified" ? (
            <>
              <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold mb-2">Tree Verified! ✅</h2>
              <p className="text-muted-foreground mb-3">AI confidence: {verificationResult.verification.confidence}%</p>
              <p className="text-sm text-muted-foreground mb-4">{verificationResult.verification.analysis}</p>
              <div className="inline-block bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
                🌿 Health: {verificationResult.verification.health_status}
              </div>
            </>
          ) : verificationResult?.status === "rejected" ? (
            <>
              <ShieldX className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-3">Confidence: {verificationResult.verification.confidence}%</p>
              <p className="text-sm text-muted-foreground mb-4">{verificationResult.verification.analysis}</p>
              <div className="inline-block bg-destructive/20 text-destructive px-4 py-2 rounded-full text-sm font-medium">
                ❌ Not verified
              </div>
            </>
          ) : (
            <>
              <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold mb-2">Tree Registered!</h2>
              <p className="text-muted-foreground mb-4">Your submission is pending AI verification.</p>
              <div className="inline-block bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium">
                ⏳ Pending Verification
              </div>
            </>
          )}
          <Button className="mt-6 w-full" onClick={() => {
            setSubmitted(false);
            setVerificationResult(null);
            setTreeName(""); setSpecies(""); setPlantationDate(""); setHeightCm("");
            setLocation(""); setLatitude(null); setLongitude(null);
            setDescription(""); setPhotoFile(null); setPhotoPreview(null); setGeoStatus("idle");
          }}>Register Another Tree</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <TreePine className="h-4 w-4" /> Register Your Plantation
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Plant a Tree</h1>
            <p className="text-muted-foreground">Upload a tree photo — location is auto-detected via GPS.</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2"><TreePine className="h-4 w-4" /> Tree Name</Label>
                <Input placeholder="e.g., My Neem Tree" required value={treeName} onChange={e => setTreeName(e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Tree Species</Label>
                <Input placeholder="e.g., Neem, Banyan, Peepal" required value={species} onChange={e => setSpecies(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" /> Plantation Date</Label>
                <Input type="date" required value={plantationDate} onChange={e => setPlantationDate(e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2"><Ruler className="h-4 w-4" /> Tree Height (cm)</Label>
                <Input type="number" placeholder="e.g., 30" required value={heightCm} onChange={e => setHeightCm(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><Upload className="h-4 w-4" /> Upload Tree Photo *</Label>
              <Input type="file" accept="image/*" capture="environment" className="cursor-pointer" onChange={handlePhotoUpload} required />
              <p className="text-xs text-muted-foreground mt-1">📷 Location is auto-detected from photo GPS or device location</p>
              {photoPreview && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
                  <img src={photoPreview} alt="Tree preview" className="w-full h-48 object-cover" />
                </div>
              )}
            </div>

            {/* Auto-detected location display */}
            <div className="glass-card rounded-xl p-4">
              <Label className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Auto-detected Location</Label>
              {geoStatus === "idle" && (
                <p className="text-sm text-muted-foreground">Upload a photo to auto-detect location</p>
              )}
              {(geoStatus === "loading" || geoStatus === "browser") && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {geoStatus === "browser" ? "Getting device location..." : "Reading photo GPS data..."}
                </div>
              )}
              {geoStatus === "success" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle className="h-4 w-4" /> Location detected
                  </div>
                  <p className="text-sm text-foreground">{location}</p>
                  {latitude && longitude && (
                    <p className="text-xs text-muted-foreground">GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                  )}
                </div>
              )}
              {geoStatus === "failed" && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">Could not detect location automatically.</p>
                  <Button type="button" variant="outline" size="sm" onClick={getBrowserLocation}>
                    <MapPin className="h-4 w-4 mr-1" /> Try Again
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Description</Label>
              <Textarea placeholder="Tell us about your tree and why you planted it..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full text-lg gap-2" disabled={isSubmitting || geoStatus === "loading" || geoStatus === "browser"}>
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Submitting & Verifying...</>
              ) : (
                <><TreePine className="h-5 w-5" /> Register Tree</>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default PlantTree;
