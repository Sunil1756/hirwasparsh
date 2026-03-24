import { useState } from "react";
import { motion } from "framer-motion";
import { TreePine, Upload, MapPin, Calendar, Ruler, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import exifr from "exifr";

const PlantTree = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Tree Registered! 🌳", description: "Your tree plantation has been submitted for AI verification." });
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-2xl p-12 text-center max-w-md nature-glow">
          <TreePine className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-2">Tree Registered!</h2>
          <p className="text-muted-foreground mb-4">Your submission is pending AI verification.</p>
          <div className="inline-block bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium">
            ⏳ Pending Verification
          </div>
          <Button className="mt-6 w-full" onClick={() => setSubmitted(false)}>Register Another Tree</Button>
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
                <Input placeholder="e.g., My Neem Tree" required />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Tree Species</Label>
                <Input placeholder="e.g., Neem, Banyan, Peepal" required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" /> Plantation Date</Label>
                <Input type="date" required />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2"><Ruler className="h-4 w-4" /> Tree Height (cm)</Label>
                <Input type="number" placeholder="e.g., 30" required />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Location (GPS Coordinates)</Label>
              <Input placeholder="e.g., 18.5204, 73.8567" required />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><Upload className="h-4 w-4" /> Upload Photo</Label>
              <Input type="file" accept="image/*" className="cursor-pointer" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Description</Label>
              <Textarea placeholder="Tell us about your tree and why you planted it..." rows={3} />
            </div>
            <Button type="submit" size="lg" className="w-full text-lg gap-2">
              <TreePine className="h-5 w-5" /> Register Tree
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default PlantTree;
