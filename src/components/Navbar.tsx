import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/20">
      <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between gap-3 h-16 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0 font-heading font-bold text-primary whitespace-nowrap text-base xl:text-[15px] 2xl:text-base leading-none">
          <img src={logo} alt="Green Enlightenment logo" width={32} height={32} className="h-8 w-8 rounded-full object-contain" />
          <span>Green Enlightenment</span>
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

        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          {user ? (
            <>
              <NotificationsBell />
              <span className="text-[13px] text-muted-foreground truncate max-w-[120px]">
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" /> Log Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm" className="whitespace-nowrap">Log In</Button></Link>
              <Link to="/login"><Button size="sm" className="whitespace-nowrap">Sign Up</Button></Link>
            </>
          )}
        </div>

        <button className="xl:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="xl:hidden glass-card border-t border-border/20">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
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
