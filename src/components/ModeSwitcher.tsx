import { motion } from "framer-motion";
import { User, Building2, Sparkles, ArrowRightLeft, ShieldCheck, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppMode, AppMode } from "@/contexts/AppModeContext";

interface ModeSwitcherProps {
  variant?: "navbar" | "compact" | "banner" | "dropdown-item";
  className?: string;
  onSwitch?: () => void;
}

export function ModeSwitcher({ variant = "navbar", className = "", onSwitch }: ModeSwitcherProps) {
  const { mode, setMode, toggleMode, isInstitutional, switchModeAndNavigate } = useAppMode();

  const handleSelect = (targetMode: AppMode) => {
    if (mode !== targetMode) {
      switchModeAndNavigate(targetMode);
      if (onSwitch) onSwitch();
    }
  };

  // 1. Dropdown Item Variant (inside User Account Menu)
  if (variant === "dropdown-item") {
    return (
      <button
        onClick={() => {
          switchModeAndNavigate();
          if (onSwitch) onSwitch();
        }}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${className} ${
          isInstitutional
            ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            : "text-primary hover:bg-primary/10"
        }`}
      >
        <span className="flex items-center gap-2">
          {isInstitutional ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          <span>Switch to {isInstitutional ? "Individual Planter" : "Institutional & CSR"} Mode</span>
        </span>
        <ArrowRightLeft className="h-3 w-3 opacity-60" />
      </button>
    );
  }

  // 2. Banner Variant (e.g. at the top of Dashboard, Homepage, or Plant Chooser)
  if (variant === "banner") {
    return (
      <div className={`p-4 sm:p-5 rounded-3xl border glass-card shadow-sm ${
        isInstitutional 
          ? "border-emerald-500/30 bg-emerald-950/20" 
          : "border-primary/25 bg-primary/5"
      } ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              isInstitutional 
                ? "bg-emerald-600 text-white" 
                : "bg-primary text-primary-foreground"
            }`}>
              {isInstitutional ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm sm:text-base text-foreground">
                  {isInstitutional ? "Institutional, NGO & CSR Workspace" : "Individual & Citizen Planter Experience"}
                </span>
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isInstitutional 
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" 
                    : "border-primary/40 text-primary bg-primary/10"
                }`}>
                  Active Mode
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                {isInstitutional
                  ? "Tailored for multi-hectare plantation projects, cadastral boundaries, bulk CSV onboarding, field QR tag sheets, and Verra/BRSR audit ledgers."
                  : "Tailored for backyard planting, tree adoption, personal growth stories, eco-badges, and community impact tracking."}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSelect(isInstitutional ? "individual" : "institutional")}
            className="rounded-xl gap-2 text-xs font-semibold shrink-0 border-border/80 hover:bg-muted"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Switch to {isInstitutional ? "Individual Mode" : "Institutional Mode"}
          </Button>
        </div>
      </div>
    );
  }

  // 3. Compact / Navbar Segmented Switcher (Default)
  return (
    <div
      role="group"
      aria-label="Application Mode Switcher"
      className={`relative inline-flex items-center p-1 rounded-2xl bg-muted/70 dark:bg-muted/40 border border-border/60 shadow-xs ${className}`}
    >
      {/* Individual Option */}
      <button
        type="button"
        onClick={() => handleSelect("individual")}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
          mode === "individual"
            ? "text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {mode === "individual" && (
          <motion.div
            layoutId="activeModeIndicator"
            className="absolute inset-0 bg-primary rounded-xl"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Individual</span>
          <span className="sm:hidden">Individual</span>
        </span>
      </button>

      {/* Institutional Option */}
      <button
        type="button"
        onClick={() => handleSelect("institutional")}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
          mode === "institutional"
            ? "text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {mode === "institutional" && (
          <motion.div
            layoutId="activeModeIndicator"
            className="absolute inset-0 bg-emerald-600 dark:bg-emerald-700 rounded-xl"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Institutional & CSR</span>
          <span className="md:hidden">Institutional</span>
        </span>
      </button>
    </div>
  );
}
