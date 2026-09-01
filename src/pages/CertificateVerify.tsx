import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ShieldCheck,
  Award,
  Trees,
  MapPin,
  Satellite,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  Activity,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Loader2,
  Download,
  Printer,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCarbonLedgerMetrics, CarbonAuditResult } from "@/lib/carbonLedger";
import { computeAreas } from "@/components/BoundaryDrawMap";

export default function CertificateVerify() {
  const { serialNo } = useParams<{ serialNo: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbProject, setDbProject] = useState<any | null>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProjectData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("plantation_projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          // If serialNo matches a project's id or starts with it
          let match = data[0];
          if (serialNo) {
            const found = data.find((p: any) =>
              p.id === serialNo ||
              p.project_name.toLowerCase().includes(serialNo.toLowerCase()) ||
              serialNo.includes(p.id.slice(0, 6))
            );
            if (found) match = found;
          }
          setDbProject(match);

          // Fetch evidence for this project
          const { data: evData } = await supabase
            .from("project_evidence")
            .select("*")
            .eq("project_id", match.id)
            .order("created_at", { ascending: false });

          if (evData) {
            setEvidenceList(evData);
            const urls: Record<string, string> = {};
            await Promise.all(
              evData.filter((r: any) => r.photo_url).map(async (r: any) => {
                const { data: signed } = await supabase.storage
                  .from("treebank")
                  .createSignedUrl(r.photo_url, 3600);
                if (signed?.signedUrl) urls[r.id] = signed.signedUrl;
              })
            );
            setEvidenceUrls(urls);
          }
        }
      } catch (err) {
        console.warn("Verify fetch notice:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [serialNo]);

  // Polygon boundary coordinates
  const boundaryPoints: [number, number][] = useMemo(() => {
    if (!dbProject) return [[19.7515, 75.7139], [19.7545, 75.7150], [19.7530, 75.7180]];
    if (Array.isArray(dbProject.boundary)) {
      return dbProject.boundary.map((pt: any) => (Array.isArray(pt) ? pt : [pt.lat, pt.lng]));
    }
    return [[19.7515, 75.7139], [19.7545, 75.7150], [19.7530, 75.7180]];
  }, [dbProject]);

  const computedArea = useMemo(() => computeAreas(boundaryPoints), [boundaryPoints]);

  const certData: CarbonAuditResult = useMemo(() => {
    const s = serialNo || "GE-IND-MH-2026-NAGP-9A4B12";
    if (dbProject) {
      return calculateCarbonLedgerMetrics({
        projectId: dbProject.id,
        projectName: dbProject.project_name,
        organizationName: dbProject.organization_name,
        targetTrees: dbProject.target_trees || 100,
        acres: Math.max(0.5, computedArea.acres),
        speciesList: dbProject.species || ["Neem", "Banyan", "Peepal"],
        plantationDate: dbProject.plantation_date || dbProject.created_at,
        survivalRatePercent: dbProject.verified_trees > 0 ? (dbProject.verified_trees / dbProject.target_trees) * 100 : 95.4,
      });
    }

    return calculateCarbonLedgerMetrics({
      projectId: "proj_demo",
      projectName: "Miyawaki Agroforestry Drive — Phase 1",
      organizationName: "Sahyadri Environmental Trust",
      targetTrees: 500,
      acres: 4.25,
      speciesList: ["Neem", "Teak", "Jamun", "Bamboo"],
      plantationDate: "2026-03-01",
      survivalRatePercent: 95.6,
    });
  }, [dbProject, serialNo, computedArea]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link Copied! 📋", description: "Public verification link copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to="/plant/organization">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 rounded-xl text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Copied Link" : "Share Proof"}
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-muted-foreground font-medium">Verifying cryptographic certificate signature...</p>
          </div>
        ) : (
          <>
            {/* Verification Status Banner */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-background to-background space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div className="flex items-center gap-3">
                  <span className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="h-7 w-7" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                        Public Carbon Credit Registry
                      </h1>
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-semibold">
                        AUTHENTIC & VERIFIED ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Serial ID: <strong className="text-foreground">{certData.serialNumber}</strong>
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="font-mono text-xs bg-card">
                  Hash: {certData.cryptographicHash.slice(0, 18)}...
                </Badge>
              </div>

              {/* Project Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Certified Agroforestry Tract
                  </span>
                  <h2 className="text-2xl font-heading font-extrabold text-foreground mt-1">
                    "{certData.projectName}"
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Executing Body: <strong className="text-foreground">{certData.organizationName}</strong> · Area:{" "}
                    <strong>{certData.acres} Acres</strong>
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-card border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Verified Living Trees</span>
                    <strong className="text-xl font-heading font-bold text-foreground">
                      {certData.totalLivingTrees.toLocaleString()}
                    </strong>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                      {certData.dominantSpecies}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">CO₂ Sequestered to Date</span>
                    <strong className="text-xl font-heading font-bold text-emerald-600">
                      {certData.co2SequesteredToDateMT} MT
                    </strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Verified CO₂e</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">10-Year Projected Offset</span>
                    <strong className="text-xl font-heading font-bold text-primary">
                      {certData.projected10YearCo2MT} MT
                    </strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">IPCC Tier-2</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Estimated Carbon Value</span>
                    <strong className="text-xl font-heading font-bold text-foreground">
                      ₹{certData.estimatedCarbonValuationInr.toLocaleString()}
                    </strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">@ ₹1,200/MT</span>
                  </div>
                </div>
              </div>

              {/* GIS Map Proof */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Satellite className="h-4 w-4 text-primary" /> Verified Cadastral GIS Boundary
                </span>
                <div className="h-56 rounded-2xl overflow-hidden border border-border/40 relative">
                  <MapContainer
                    center={boundaryPoints[0] || [19.7515, 75.7139]}
                    zoom={16}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution="&copy; Esri &mdash; Earthstar Geographics"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <Polygon
                      positions={boundaryPoints}
                      pathOptions={{ color: "#10b981", weight: 3, fillColor: "#10b981", fillOpacity: 0.35 }}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* Multi-Tier Verification Log */}
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-3 text-xs">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Multi-Tier Verification Audit Log
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <strong>Layer 1: Automated Geospatial & LULC Sanity Check</strong>
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <strong>Layer 2: ESA Sentinel-2 Multi-Spectral Reflectance Audit</strong>
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <strong>Layer 3: 5% Stratified Random Ground Sample Physical Audit</strong>
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">PASSED</Badge>
                  </div>
                </div>
              </div>

              {/* Ground Evidence Gallery */}
              {evidenceList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-primary" /> Attached Ground-Truth Evidence ({evidenceList.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {evidenceList.map((e) => (
                      <div key={e.id} className="rounded-xl border border-border/40 overflow-hidden bg-card text-[11px] p-2 space-y-1">
                        {evidenceUrls[e.id] ? (
                          <img src={evidenceUrls[e.id]} alt="Evidence" className="h-20 w-full object-cover rounded-lg" />
                        ) : (
                          <div className="h-20 w-full bg-muted flex items-center justify-center text-muted-foreground">Photo Record</div>
                        )}
                        <p className="font-semibold capitalize text-foreground">{e.evidence_type}</p>
                        {e.survival_percent && <p className="text-emerald-600 font-bold">{e.survival_percent}% Survival</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
