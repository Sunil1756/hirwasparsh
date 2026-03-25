import { useState } from "react";
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
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "manual">("idle");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [treeName, setTreeName] = useState("");
  const [species, setSpecies] = useState("");
  const [plantationDate, setPlantationDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");

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
        setLocation(`${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`);
        setGeoStatus("success");
        toast({ title: "📍 Location Detected!", description: "GPS coordinates extracted from your photo automatically." });
      } else {
        setGeoStatus("manual");
        toast({ title: "No GPS data found", description: "Please enter the location manually.", variant: "destructive" });
      }
    } catch {
      setGeoStatus("manual");
      toast({ title: "Could not read photo data", description: "Please enter the location manually.", variant: "destructive" });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Insert tree record
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
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. If photo uploaded, trigger AI verification
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
            setTreeName("");
            setSpecies("");
            setPlantationDate("");
            setHeightCm("");
            setLocation("");
            setLatitude(null);
            setLongitude(null);
            setDescription("");
            setPhotoFile(null);
            setPhotoPreview(null);
            setGeoStatus("idle");
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
            <p className="text-muted-foreground">Register your tree plantation and watch it grow on the community map.</p>
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
              <Label className="flex items-center gap-2 mb-2"><Upload className="h-4 w-4" /> Upload Photo</Label>
              <Input type="file" accept="image/*" className="cursor-pointer" onChange={handlePhotoUpload} />
              <p className="text-xs text-muted-foreground mt-1">📷 Photos with GPS data will auto-fill the location • AI will verify your tree</p>
              {photoPreview && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
                  <img src={photoPreview} alt="Tree preview" className="w-full h-48 object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Location (Auto-detected from photo)</Label>
              <div className="relative">
                <Input
                  placeholder="Upload a photo with GPS data or enter manually"
                  required
                  value={location}
                  onChange={e => { setLocation(e.target.value); setGeoStatus("manual"); }}
                />
                {geoStatus === "loading" && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {geoStatus === "success" && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                )}
              </div>
              {geoStatus === "success" && (
                <p className="text-xs text-primary mt-1">✓ Auto-detected from photo EXIF data</p>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Description</Label>
              <Textarea placeholder="Tell us about your tree and why you planted it..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full text-lg gap-2" disabled={isSubmitting}>
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
