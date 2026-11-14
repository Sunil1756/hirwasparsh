import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export type AppMode = "individual" | "institutional";

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isIndividual: boolean;
  isInstitutional: boolean;
  switchModeAndNavigate: (targetMode?: AppMode) => void;
}

const STORAGE_KEY = "ge_app_mode";

const INSTITUTIONAL_PATHS = [
  "/workspace/ngo",
  "/ngo-workspace",
  "/portal/csr",
  "/csr-portal",
  "/plant/organization",
  "/plant/bulk",
  "/bulk-onboard",
  "/organization",
  "/organization-portal",
  "/project-management",
  "/projects",
  "/monitoring",
  "/monitoring-dashboard",
  "/scouting",
  "/government",
  "/admin",
  "/admin/audit-log",
  "/field-worker",
];

const INDIVIDUAL_PATHS = [
  "/plant/individual",
  "/adopter",
  "/my-trees",
  "/tree-story",
  "/growth-updates",
];

const AppModeContext = createContext<AppModeContextType>({
  mode: "individual",
  setMode: () => {},
  toggleMode: () => {},
  isIndividual: true,
  isInstitutional: false,
  switchModeAndNavigate: () => {},
});

export const useAppMode = () => useContext(AppModeContext);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, primaryRole, isAdmin, isGovernment } = useAuth();

  // Initialize mode from storage or role
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as AppMode | null;
      if (saved === "individual" || saved === "institutional") {
        return saved;
      }
    }
    // Default based on institutional roles
    if (isAdmin || isGovernment || primaryRole === "ngo_coordinator" || primaryRole === "csr_partner") {
      return "institutional";
    }
    return "individual";
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {}
  };

  const toggleMode = () => {
    setMode(mode === "individual" ? "institutional" : "individual");
  };

  // Sync mode based on current URL path
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    
    const isInstPath = INSTITUTIONAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    const isIndivPath = INDIVIDUAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

    if (isInstPath && mode !== "institutional") {
      setModeState("institutional");
      try {
        localStorage.setItem(STORAGE_KEY, "institutional");
      } catch {}
    } else if (isIndivPath && mode !== "individual") {
      setModeState("individual");
      try {
        localStorage.setItem(STORAGE_KEY, "individual");
      } catch {}
    }
  }, [location.pathname]);

  // Switch mode and navigate to appropriate primary screen
  const switchModeAndNavigate = (targetMode?: AppMode) => {
    const nextMode = targetMode || (mode === "individual" ? "institutional" : "individual");
    setMode(nextMode);

    const path = location.pathname.toLowerCase();
    const isInstPath = INSTITUTIONAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    const isIndivPath = INDIVIDUAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

    if (nextMode === "institutional" && isIndivPath) {
      navigate("/workspace/ngo");
    } else if (nextMode === "individual" && isInstPath) {
      navigate("/dashboard");
    }
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isIndividual: mode === "individual",
        isInstitutional: mode === "institutional",
        switchModeAndNavigate,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};
