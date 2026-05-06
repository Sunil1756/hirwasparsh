import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="bg-nature-900 text-primary-foreground py-16">
    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <div className="flex items-center gap-2 font-heading font-bold text-xl mb-4">
          <img src={logo} alt="Green Enlightenment logo" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-full object-contain bg-white/10" />
          Green Enlightenment
        </div>
        <p className="text-sm opacity-80">Connecting People with Nature through Technology</p>
      </div>
      <div>
        <h4 className="font-heading font-semibold mb-3">Platform</h4>
        <div className="flex flex-col gap-2 text-sm opacity-80">
          <Link to="/plant" className="hover:opacity-100">Plant a Tree</Link>
          <Link to="/tree-map" className="hover:opacity-100">Tree Map</Link>
          <Link to="/analytics" className="hover:opacity-100">Analytics</Link>
          <Link to="/leaderboard" className="hover:opacity-100">Leaderboard</Link>
        </div>
      </div>
      <div>
        <h4 className="font-heading font-semibold mb-3">Community</h4>
        <div className="flex flex-col gap-2 text-sm opacity-80">
          <Link to="/about" className="hover:opacity-100">About Us</Link>
          <Link to="/dashboard" className="hover:opacity-100">Dashboard</Link>
          <Link to="/contact" className="hover:opacity-100">Contact</Link>
        </div>
      </div>
      <div>
        <h4 className="font-heading font-semibold mb-3">Connect</h4>
        <p className="text-sm opacity-80">hirwasparsh@gmail.com</p>
        <p className="text-sm opacity-80 mt-1">+91 87998 79203</p>
        <p className="text-sm opacity-80 mt-1">Solapur, Maharashtra</p>
      </div>
    </div>
    <div className="container mx-auto px-4 mt-12 pt-8 border-t border-primary-foreground/20 text-center text-sm opacity-60">
      © 2026 Green Enlightenment. All rights reserved.
    </div>
  </footer>
);

export default Footer;
