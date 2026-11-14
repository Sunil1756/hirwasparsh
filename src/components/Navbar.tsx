import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, LogOut, Shield, ShieldCheck, Building2, User, Settings,
  TreePine, Bell, ChevronDown, Compass, Heart, ArrowRightLeft, Sparkles, Sprout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import NotificationsBell from "@/components/NotificationsBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OfflineSyncModal } from "@/components/OfflineSyncModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isAdmin, isGovernment, isFieldWorker, isTreeAdopter, activeRole } = useAuth();
  const { t } = useLanguage();
  const { mode, isInstitutional, isIndividual, switchModeAndNavigate } = useAppMode();

  // 1. Citizen & Individual Mode Navigation Links
  const individualPrimaryLinks = [
    { to: "/", label: t.nav_home },
    { to: "/plant/individual", label: "Plant a Tree" },
    { to: "/adopter", label: "Adopt a Tree" },
    { to: "/tree-map", label: "Tree Map & GIS" },
    { to: "/dashboard", label: "My Dashboard" },
    { to: "/intelligence", label: "AI Tree Doctor" },
  ];

  const individualCommunityLinks = [
    { to: "/leaderboard", label: t.nav_leaderboard },
    { to: "/growth-updates", label: "Growth Stories" },
    { to: "/about", label: t.nav_about },
    { to: "/methodology", label: "Methodology" },
    { to: "/contact", label: t.nav_contact },
  ];

  // 2. Institutional, NGO & CSR MRV Navigation Links
  const institutionalPrimaryLinks = [
    { to: "/workspace/ngo", label: "NGO Command" },
    { to: "/portal/csr", label: "CSR & ESG Portal" },
    { to: "/project-management", label: "Projects & Parcels" },
    { to: "/plant/bulk", label: "Bulk & QR Tags" },
    { to: "/tree-map", label: "Sentinel-2 Telemetry" },
    { to: "/monitoring", label: "Surveillance" },
    { to: "/scouting", label: "Field Scouting" },
  ];

  const institutionalMrvLinks = [
    { to: "/organization", label: "Organization Portal" },
    { to: "/government", label: "Government Oversight" },
    { to: "/admin/audit-log", label: "Audit Ledger (SHA-256)" },
    { to: "/methodology", label: "Carbon Tier-3 Methodology" },
    { to: "/tree-map", label: "Public GIS Explorer" },
  ];

  const activePrimaryLinks = isInstitutional ? institutionalPrimaryLinks : individualPrimaryLinks;
  const activeDropdownLinks = isInstitutional ? institutionalMrvLinks : individualCommunityLinks;

  const displayName = (user?.user_metadata?.full_name as string) || user?.email || "";
  const initials =
    displayName
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 glass-card border-b transition-colors duration-300 ${
      isInstitutional 
        ? "border-emerald-500/30 bg-background/95 shadow-[0_1px_16px_-6px_hsl(142_70%_35%/0.25)]" 
        : "border-border/20 shadow-[0_1px_12px_-6px_hsl(var(--primary)/0.35)]"
    }`}>
      <div className="mx-auto w-full max-w-[1650px] flex items-center justify-between gap-1.5 sm:gap-3 h-16 px-2.5 sm:px-5">
        {/* Brand Logo & Name */}
        <Link
          to={isInstitutional ? "/workspace/ngo" : "/"}
          className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-heading font-bold text-primary leading-none"
        >
          <img
            src={logo}
            alt="Green Enlightenment logo"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-bold text-[14px] sm:text-[15px] text-foreground whitespace-nowrap flex items-center gap-1.5">
              Green Enlightenment
              {isInstitutional && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-mono tracking-wider hidden sm:inline-flex">
                  ENTERPRISE MRV
                </Badge>
              )}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1.5 mx-1 min-w-0">
          {activePrimaryLinks.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-2 py-1.5 xl:px-2.5 xl:py-1.5 rounded-xl text-xs xl:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? isInstitutional
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
                      : "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Contextual Secondary Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1 px-2 py-1.5 xl:px-2.5 xl:py-1.5 rounded-xl text-xs xl:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                isInstitutional
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}>
                <span>{isInstitutional ? "MRV & Gov" : "Community"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 bg-popover z-[60]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isInstitutional ? "Institutional Governance & Audit" : "Community & Impact"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeDropdownLinks.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className="w-full cursor-pointer text-xs">
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <Link
              to="/admin"
              className={`px-2 py-1.5 rounded-xl text-xs xl:text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                location.pathname === "/admin"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Right Side Action Controls: Mode Switcher + Utilities + Account */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prominent Mode Switcher on Desktop & Tablet */}
          <div className="hidden sm:block">
            <ModeSwitcher variant="navbar" />
          </div>

          <OfflineSyncModal />
          <LanguageSwitcher />

          {user ? (
            <>
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="flex items-center gap-1 rounded-full p-0.5 hover:bg-primary/5 transition-colors shrink-0"
                  >
                    <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 border ${
                      isInstitutional ? "border-emerald-500/40" : "border-primary/20"
                    }`}>
                      <AvatarFallback className={`${
                        isInstitutional ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"
                      } text-[10px] sm:text-[11px] font-semibold`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 bg-popover z-[60]">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {displayName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Mode Switcher Shortcut */}
                  <DropdownMenuItem asChild>
                    <ModeSwitcher variant="dropdown-item" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Institutional Workspaces
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/workspace/ngo" className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium">
                      <Building2 className="h-4 w-4 mr-2" /> NGO Command Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/portal/csr" className="cursor-pointer text-blue-600 dark:text-blue-400 font-medium">
                      <ShieldCheck className="h-4 w-4 mr-2" /> CSR & ESG Portal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/project-management" className="cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2 text-primary" /> Project & Parcel Manager
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/plant/bulk" className="cursor-pointer">
                      <TreePine className="h-4 w-4 mr-2 text-primary" /> Bulk CSV & Batch QR Tags
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Citizen Planter & Adopter
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/adopter" className="cursor-pointer text-teal-600 dark:text-teal-400 font-medium">
                      <Heart className="h-4 w-4 mr-2" /> Adopter Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2 text-primary" /> Community Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/growth-updates" className="cursor-pointer">
                      <TreePine className="h-4 w-4 mr-2 text-primary" /> Growth Stories & Updates
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/field-worker" className="cursor-pointer text-amber-600 dark:text-amber-400 font-medium">
                      <Compass className="h-4 w-4 mr-2" /> Field Worker Console
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-rose-600 dark:text-rose-400 font-medium">
                        <Shield className="h-4 w-4 mr-2" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditProfileOpen(true)} className="cursor-pointer">
                    <User className="h-4 w-4 mr-2 text-primary" /> Edit Profile / Username
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditProfileOpen(true)} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <EditProfileModal
                open={editProfileOpen}
                onOpenChange={setEditProfileOpen}
                currentProfile={{
                  full_name: (user?.user_metadata?.full_name as string) || null,
                  organization_name: (user?.user_metadata?.organization_name as string) || null,
                  avatar_url: (user?.user_metadata?.avatar_url as string) || null,
                }}
              />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="whitespace-nowrap h-8 px-2.5 text-xs">
                  Log In
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="whitespace-nowrap h-8 px-2.5 text-xs">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className="lg:hidden flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-foreground hover:text-primary hover:bg-primary/10 transition-all shrink-0 border border-primary/30 bg-background/90 shadow-sm ml-0.5"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden glass-card border-t border-border/20 overflow-hidden shadow-2xl bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
              {/* Mobile Mode Switcher Control */}
              <div className="pb-3 border-b border-border/20 mb-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center justify-between">
                  <span>Experience Mode</span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {isInstitutional ? "Institutional" : "Individual"}
                  </Badge>
                </div>
                <ModeSwitcher className="w-full justify-center" onSwitch={() => setOpen(false)} />
              </div>

              {/* Active Mode Primary Links */}
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center justify-between">
                <span>{isInstitutional ? "Institutional & CSR Hub" : "Citizen Planter Menu"}</span>
              </div>
              {activePrimaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                    location.pathname === link.to
                      ? isInstitutional
                        ? "text-emerald-600 bg-emerald-500/15 font-bold"
                        : "text-primary bg-primary/15 font-bold"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <span>{link.label}</span>
                  {location.pathname === link.to && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isInstitutional ? "bg-emerald-500" : "bg-primary"}`} />
                  )}
                </Link>
              ))}

              {/* Secondary Links for Active Mode */}
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">
                {isInstitutional ? "Governance & Operations" : "Community & Impact"}
              </div>
              {activeDropdownLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    location.pathname === link.to
                      ? isInstitutional
                        ? "text-emerald-600 bg-emerald-500/15"
                        : "text-primary bg-primary/10"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Quick Mode Switcher Banner Card at the bottom of drawer */}
              <div className="mt-3 p-3 rounded-2xl border bg-muted/40 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold block text-foreground">
                    {isInstitutional ? "Switch to Individual Planter" : "Switch to Institutional MRV"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isInstitutional ? "Plant single trees, adopt & track" : "Access bulk CSV, parcels & CSR"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    switchModeAndNavigate();
                    setOpen(false);
                  }}
                  className="text-xs h-8 px-2.5 shrink-0 gap-1 rounded-xl"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Switch
                </Button>
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 flex items-center gap-1.5 mt-1"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin Dashboard
                </Link>
              )}

              <div className="pt-3 border-t border-border/20 mt-2">
                {user ? (
                  <Button
                    className="w-full gap-2 text-xs font-semibold"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Log Out ({displayName})
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full text-xs font-semibold" size="sm">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button className="w-full text-xs font-semibold" size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
