import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "mr", label: "मराठी (Marathi)", flag: "🇮🇳" },
  { code: "hi", label: "हिंदी (Hindi)", flag: "🇮🇳" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-semibold gap-1 rounded-full hover:bg-primary/10 border border-primary/20 text-foreground shrink-0"
        >
          <Languages className="h-3.5 w-3.5 text-primary" />
          <span>{current.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 text-xs">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-1.5 text-xs ${
              language === lang.code ? "bg-primary/15 text-primary font-bold" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
            {language === lang.code && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
