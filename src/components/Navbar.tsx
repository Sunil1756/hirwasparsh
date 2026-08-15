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
import NotificationsBell from "@/components/NotificationsBell";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isAdmin, isGovernment } = useAuth();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/plant", label: "Plant a Tree" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/growth-updates", label: "Growth" },
    { to: "/tree-map", label: "Tree Map" },
    { to: "/drives", label: "Drives" },
    { to: "/intelligence", label: "AI Intelligence" },
    { to: "/leaderboard", label: "Leaderboard" },
    { to: "/contact", label: "Contact" },
    { to: "/challenges", label: "Challenges" },
    { to: "/green-impact", label: "Green Impact" },
  ];

  const displayName = (user?.user_metadata?.full_name as string) || user?.email || "";
  const initials = displayName
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("") || "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/20 shadow-[0_1px_12px_-6px_hsl(var(--primary)/0.35)]">
      <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between gap-4 h-16 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 font-heading font-bold text-primary whitespace-nowrap leading-none text-[15px]"
        >
          <img src={logo} alt="Green Enlightenment logo" width={32} height={32} className="h-8 w-8 rounded-full object-contain" />
          <span className="hidden sm:inline">Green Enlightenment</span>
        </Link>

        <div className="hidden xl:flex items-center justify-center flex-1 min-w-0 gap-0.5 2xl:gap-1">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              className={`px-2 2xl:px-2.5 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${
                location.pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}>
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={`px-2 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              location.pathname === "/admin" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}>
              <Shield className="h-3 w-3" /> Admin
            </Link>
          )}
          {(isGovernment || isAdmin) && (
            <Link to="/government" className={`px-2 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              location.pathname === "/government" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}>
              <Building2 className="h-3 w-3" /> Govt
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="flex items-center gap-1 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-primary/5 transition-colors"
                  >
                    <Avatar className="h-8 w-8 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover z-[60]">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {displayName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><User className="h-4 w-4 mr-2" /> Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/growth-updates"><TreePine className="h-4 w-4 mr-2" /> My Trees</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><Bell className="h-4 w-4 mr-2" /> Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><Settings className="h-4 w-4 mr-2" /> Settings</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="h-4 w-4 mr-2" /> Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  {(isGovernment || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/government"><Building2 className="h-4 w-4 mr-2" /> Government</Link>
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
            <div className="hidden sm:flex items-center gap-1.5">
              <Link to="/login"><Button variant="ghost" size="sm" className="whitespace-nowrap">Log In</Button></Link>
              <Link to="/login"><Button size="sm" className="whitespace-nowrap">Sign Up</Button></Link>
            </div>
          )}

          <button className="xl:hidden ml-1" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="xl:hidden glass-card border-t border-border/20 overflow-hidden">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}>
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Admin Dashboard
                </Link>
              )}
              {(isGovernment || isAdmin) && (
                <Link to="/government" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Government Dashboard
                </Link>
              )}
              {user ? (
                <Button className="w-full mt-2" size="sm" variant="outline" onClick={() => { signOut(); setOpen(false); }}>
                  <LogOut className="h-4 w-4 mr-1" /> Log Out
                </Button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button className="w-full mt-2" size="sm">Sign Up / Log In</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
