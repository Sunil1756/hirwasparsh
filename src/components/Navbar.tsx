import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Shield, Building2, User, Settings, TreePine, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import NotificationsBell from "@/components/NotificationsBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OfflineSyncModal } from "@/components/OfflineSyncModal";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isAdmin, isGovernment } = useAuth();
  const { t } = useLanguage();

  const primaryLinks = [
    { to: "/", label: t.nav_home },
    { to: "/tree-map", label: t.nav_tree_map },
    { to: "/plant", label: t.nav_plant },
    { to: "/dashboard", label: t.nav_dashboard },
    { to: "/intelligence", label: t.nav_intelligence },
  ];

  const communityLinks = [
    { to: "/growth-updates", label: "My Trees & Growth" },
    { to: "/leaderboard", label: t.nav_leaderboard },
    { to: "/about", label: t.nav_about },
    { to: "/contact", label: t.nav_contact },
  ];

  const navLinks = [...primaryLinks, ...communityLinks];

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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/20 shadow-[0_1px_12px_-6px_hsl(var(--primary)/0.35)]">
      <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between gap-1.5 sm:gap-4 h-16 px-2.5 sm:px-6">
        {/* Brand Logo & Name */}
        <Link
          to="/"
          className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0 font-heading font-bold text-primary leading-none"
        >
          <img
            src={logo}
            alt="Green Enlightenment logo"
            width={30}
            height={30}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-contain shrink-0"
          />
          <span className="truncate font-bold text-[13px] min-[360px]:text-[14px] sm:text-[16px] text-foreground">
            Green Enlightenment
          </span>
        </Link>

        {/* Desktop Navigation (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 gap-1 xl:gap-2">
          {primaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-xl text-[13px] xl:text-[14px] font-semibold whitespace-nowrap transition-colors ${
                location.pathname === link.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Community Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] xl:text-[14px] font-semibold whitespace-nowrap text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                Community <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 bg-popover z-[60]">
              {communityLinks.map((item) => (
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
              className={`px-2 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                location.pathname === "/admin"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Shield className="h-3 w-3" /> Admin
            </Link>
          )}
          {(isGovernment || isAdmin) && (
            <Link
              to="/government"
              className={`px-2 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                location.pathname === "/government"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Building2 className="h-3 w-3" /> Govt
            </Link>
          )}
        </div>

        {/* Right Side Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-[11px] font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover z-[60]">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {displayName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <User className="h-4 w-4 mr-2" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/growth-updates">
                      <TreePine className="h-4 w-4 mr-2" /> My Trees
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <Bell className="h-4 w-4 mr-2" /> Notifications
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield className="h-4 w-4 mr-2" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(isGovernment || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/government">
                        <Building2 className="h-4 w-4 mr-2" /> Government
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Mobile & Tablet Hamburger Menu Button (Always visible on mobile/tablet below 1024px) */}
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
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1 max-h-[75vh] overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                Main Menu
              </div>
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                    location.pathname === link.to
                      ? "text-primary bg-primary/15 font-bold"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <span>{link.label}</span>
                  {location.pathname === link.to && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}

              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">
                Community & Features
              </div>
              {communityLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    location.pathname === link.to
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 flex items-center gap-1.5 mt-1"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin Dashboard
                </Link>
              )}
              {(isGovernment || isAdmin) && (
                <Link
                  to="/government"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 flex items-center gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" /> Government Dashboard
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
