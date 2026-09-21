import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="bg-nature-900 text-primary-foreground py-16 border-t border-primary/20">
    <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
      {/* Brand Column */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center gap-2.5 font-heading font-bold text-xl">
          <img
            src={logo}
            alt="Green Enlightenment logo"
            width={36}
            height={36}
            loading="lazy"
            className="h-9 w-9 rounded-full object-contain bg-white/10 p-0.5"
          />
          <span className="tracking-tight">Green Enlightenment</span>
        </div>
        <p className="text-xs sm:text-sm opacity-80 leading-relaxed max-w-sm">
          Cryptographically audited afforestation MRV, Copernicus Sentinel-2 satellite intelligence,
          and IPCC Tier-2 carbon modeling for citizen adopters, NGOs, and corporate CSR partners.
        </p>
        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SEBI BRSR Core Principle 6 &amp; Verra VM0047 Compliant</span>
        </div>
      </div>

      {/* Platform & Solutions */}
      <div className="space-y-3">
        <h4 className="font-heading font-semibold text-sm text-foreground uppercase tracking-wider">
          Platform &amp; Tools
        </h4>
        <div className="flex flex-col gap-2 text-xs opacity-80">
          <Link to="/plant" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Plant a Tree</Link>
          <Link to="/plant/bulk" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Bulk Import &amp; QR Tags</Link>
          <Link to="/tree-map" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Tree Map &amp; Sentinel GIS</Link>
          <Link to="/intelligence" className="hover:opacity-100 hover:text-emerald-400 transition-colors">AI Health &amp; Risk Radar</Link>
          <Link to="/growth-updates" className="hover:opacity-100 hover:text-emerald-400 transition-colors">30-Day Growth Audits</Link>
          <Link to="/verify/cert" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Cryptographic Cert Verify</Link>
        </div>
      </div>

      {/* Institutional & B2B */}
      <div className="space-y-3">
        <h4 className="font-heading font-semibold text-sm text-foreground uppercase tracking-wider">
          Institutional &amp; ESG
        </h4>
        <div className="flex flex-col gap-2 text-xs opacity-80">
          <Link to="/csr-portal" className="hover:opacity-100 hover:text-emerald-400 transition-colors">CSR Carbon &amp; ESG Portal</Link>
          <Link to="/ngo-workspace" className="hover:opacity-100 hover:text-emerald-400 transition-colors">NGO Operator Command Center</Link>
          <Link to="/pricing" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Institutional Pricing</Link>
          <Link to="/scouting" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Field Scout Task Queue</Link>
          <Link to="/leaderboard" className="hover:opacity-100 hover:text-emerald-400 transition-colors">Statewide Leaderboard</Link>
        </div>
      </div>

      {/* Connect & Contact */}
      <div className="space-y-3">
        <h4 className="font-heading font-semibold text-sm text-foreground uppercase tracking-wider">
          Connect &amp; HQ
        </h4>
        <div className="flex flex-col gap-1.5 text-xs opacity-80">
          <p className="font-medium text-foreground">ACIC Innovation Hub</p>
          <p>Solapur &amp; Pune, Maharashtra, India</p>
          <p className="pt-1">hirwasparsh@gmail.com</p>
          <p>+91 87998 79203</p>
          <div className="pt-2 flex items-center gap-3 text-xs">
            <Link to="/about" className="hover:underline">About</Link>
            <span>·</span>
            <Link to="/contact" className="hover:underline">Contact</Link>
            <span>·</span>
            <Link to="/dashboard" className="hover:underline">Community</Link>
          </div>
        </div>
      </div>
    </div>

    <div className="container mx-auto px-4 mt-12 pt-8 border-t border-primary-foreground/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-75">
      <div>
        © 2026 Green Enlightenment. All rights reserved. Built for ACIC Afforestation Ecosystem.
      </div>
      <div className="flex items-center gap-4">
        <span>ISO 14064-2 Ground Truth MRV</span>
        <span>•</span>
        <span>Copernicus Sentinel-2 Live Ingest</span>
      </div>
    </div>
  </footer>
);

export default Footer;
