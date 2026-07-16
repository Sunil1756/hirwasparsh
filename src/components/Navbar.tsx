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
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl text-primary">
          <img src={logo} alt="Green Enlightenment logo" width={36} height={36} className="h-9 w-9 rounded-full object-contain" />
          Green Enlightenment
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}>
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              location.pathname === "/admin" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}>
              <Shield className="h-3 w-3" /> Admin
            </Link>
          )}
          {(isGovernment || isAdmin) && (
            <Link to="/government" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              location.pathname === "/government" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}>
              <Building2 className="h-3 w-3" /> Govt
            </Link>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" /> Log Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
              <Link to="/login"><Button size="sm">Sign Up</Button></Link>
            </>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-card border-t border-border/20">
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
