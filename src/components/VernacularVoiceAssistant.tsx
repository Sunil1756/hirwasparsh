import { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles, Languages, Play, Pause, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Props {
  text: string;
  title?: string;
  className?: string;
}

export function VernacularVoiceAssistant({ text, title = "Audio Tree Guide", className = "" }: Props) {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, []);

  const handleToggleSpeech = () => {
    if (!supported) {
      toast.error("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice/locale
    if (language === "mr") {
      utterance.lang = "mr-IN";
    } else if (language === "hi") {
      utterance.lang = "hi-IN";
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = 0.95; // Slightly slower for clarity in field conditions
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    toast.success(
      language === "mr"
        ? "मराठी व्हॉइस गाईड सुरू..."
        : language === "hi"
        ? "हिंदी वॉइस गाइड शुरू..."
        : "Playing Audio Guide..."
    );
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggleSpeech}
      className={`rounded-xl gap-2 text-xs font-semibold border-primary/30 transition-all ${
        isPlaying ? "bg-primary text-primary-foreground animate-pulse shadow-md" : "hover:bg-primary/10"
      } ${className}`}
    >
      {isPlaying ? (
        <>
          <VolumeX className="h-3.5 w-3.5" />
          {language === "mr" ? "आवाज थांबवा" : language === "hi" ? "ऑडियो रोकें" : "Stop Audio"}
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 text-primary" />
          {language === "mr"
            ? "🔊 मराठीत ऐका"
            : language === "hi"
            ? "🔊 हिंदी में सुनें"
            : "🔊 Listen Guide"}
        </>
      )}
    </Button>
  );
}
