import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Key, CheckCircle2, ExternalLink } from "lucide-react";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { toast } from "sonner";

export function GeminiApiKeyModal() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    const key = getGeminiApiKey();
    setSavedKey(key);
    if (key) setApiKey(key);
  }, [open]);

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    setSavedKey(apiKey.trim() || null);
    toast.success(apiKey.trim() ? "Google Gemini API Key configured!" : "Gemini API key cleared");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl flex items-center gap-2 text-xs border-primary/30">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {savedKey ? "Gemini AI: Connected" : "Connect Gemini AI"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <Key className="h-5 w-5 text-primary" />
            Google Gemini API Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Connect your own direct Google Gemini API key to power plant identification, leaf pathology diagnosis, and satellite canopy analysis with zero subscription costs.
          </p>

          <div>
            <label className="text-muted-foreground block mb-1 font-medium">Google Gemini API Key</label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Get free API key at Google AI Studio <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save Key</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
