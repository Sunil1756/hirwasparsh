import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Award,
  Download,
  ShieldCheck,
  Trees,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ExternalLink,
  Sparkles,
  Satellite,
  Compass,
  ArrowUpRight,
  Filter,
  Search,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ESGReportModal } from "@/components/ESGReportModal";
import { CarbonCertificateModal } from "@/components/CarbonCertificateModal";
import { B2BRoleGate, RoleBadge } from "@/components/B2BRoleGate";
import { isAuditExportEligible, B2BRole } from "@/lib/b2bAccessControl";
import { toast } from "sonner";

interface CSRProjectSummary {
  id: string;
  projectName: string;
  location: string;
  district: string;
  funderName: string;
  plantedTrees: number;
  verifiedTrees: number;
  survivalRatePct: number;
  annualCo2eMT: number;
  cumulative10YrCo2eMT: number;
  confidenceScore: number;
  verificationTier: "Gold" | "Field Verified" | "Satellite Only" | "Unverified";
  sentinel2PassesCount: number;
  lastOverpassDate: string;
  meanNdvi: number;
  ndviTrend: "+4.2%" | "+6.8%" | "-1.5%" | "+2.1%";
  brsrEligible: boolean;
}

const SAMPLE_CSR_PORTFOLIO: CSRProjectSummary[] = [
  {
    id: "proj_satara_agro",
    projectName: "Sahyadri Western Ghats Biodiversity Corridor",
    location: "Satara Watershed, Maharashtra",
    district: "Satara",
    funderName: "Tata Sustainability Fund / ACIC Initiative",
    plantedTrees: 5200,
    verifiedTrees: 4940,
    survivalRatePct: 95,
    annualCo2eMT: 114.4,
    cumulative10YrCo2eMT: 1144.0,
    confidenceScore: 88,
    verificationTier: "Gold",
    sentinel2PassesCount: 14,
    lastOverpassDate: "2026-09-06",
    meanNdvi: 0.72,
    ndviTrend: "+6.8%",
    brsrEligible: true,
  },
  {
    id: "proj_nagpur_teak",
    projectName: "Vidarbha Indigenous Afforestation & Carbon Sink",
    location: "Nagpur Agroforestry Belt, Maharashtra",
    district: "Nagpur",
    funderName: "Mahindra Green CSR / ACIC Incubator",
    plantedTrees: 3400,
    verifiedTrees: 3060,
    survivalRatePct: 90,
    annualCo2eMT: 74.8,
    cumulative10YrCo2eMT: 748.0,
    confidenceScore: 76,
    verificationTier: "Field Verified",
    sentinel2PassesCount: 9,
    lastOverpassDate: "2026-09-02",
    meanNdvi: 0.65,
    ndviTrend: "+4.2%",
    brsrEligible: true,
  },
  {
    id: "proj_solapur_bio",
    projectName: "Solapur Semi-Arid Soil Moisture & Agro-Forestry Grid",
    location: "Solapur District, Maharashtra",
    district: "Solapur",
    funderName: "Bajaj CSR Foundation",
    plantedTrees: 1800,
    verifiedTrees: 1440,
    survivalRatePct: 80,
    annualCo2eMT: 39.6,
    cumulative10YrCo2eMT: 396.0,
    confidenceScore: 62,
    verificationTier: "Satellite Only",
    sentinel2PassesCount: 6,
    lastOverpassDate: "2026-08-28",
    meanNdvi: 0.48,
    ndviTrend: "+2.1%",
    brsrEligible: false,
  },
];

export default function CSRCorporatePortal() {
  const [currentRole, setCurrentRole] = useState<B2BRole>("csr_donor");
  const [searchFilter, setSearchFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const filteredProjects = useMemo(() => {
    return SAMPLE_CSR_PORTFOLIO.filter((p) => {
      const matchSearch =
        p.projectName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.district.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.funderName.toLowerCase().includes(searchFilter.toLowerCase());

      const matchTier =
        tierFilter === "all" || p.verificationTier.toLowerCase().replace(/\s+/g, "_") === tierFilter;

      return matchSearch && matchTier;
    });
  }, [searchFilter, tierFilter]);

  // Aggregate Portfolio Totals
  const totalTreesPlanted = useMemo(
    () => filteredProjects.reduce((sum, p) => sum + p.plantedTrees, 0),
    [filteredProjects]
  );
  const totalTreesVerified = useMemo(
    () => filteredProjects.reduce((sum, p) => sum + p.verifiedTrees, 0),
    [filteredProjects]
  );
  const totalAnnualCo2eMT = useMemo(
    () => filteredProjects.reduce((sum, p) => sum + p.annualCo2eMT, 0),
    [filteredProjects]
  );
  const portfolioAvgSurvival = useMemo(() => {
    if (totalTreesPlanted === 0) return 0;
    return Math.round((totalTreesVerified / totalTreesPlanted) * 100);
  }, [totalTreesPlanted, totalTreesVerified]);

  const handleExportBRSRCSV = () => {
    const headers =
      "Project_ID,Project_Name,District,Funder,Planted_Trees,Verified_Trees,Survival_Rate_Pct,Annual_CO2e_MT,10Yr_Cumulative_CO2e_MT,Confidence_Score,Verification_Tier,Sentinel2_Overpasses,Mean_NDVI,BRSR_Core_Principle6_Compliance\n";

    const rows = filteredProjects
      .map(
        (p) =>
          `"${p.id}","${p.projectName}","${p.district}","${p.funderName}",${p.plantedTrees},${p.verifiedTrees},${p.survivalRatePct}%,${p.annualCo2eMT},${p.cumulative10YrCo2eMT},${p.confidenceScore}%,${p.verificationTier},${p.sentinel2PassesCount},${p.meanNdvi},${p.brsrEligible ? "COMPLIANT_AUDITED" : "PENDING_FIELD_VERIFICATION"}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SEBI_BRSR_Core_ESG_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SEBI BRSR Core Principle 6 ESG Ledger Exported!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-primary/20 shadow-xl bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-3 py-1 rounded-full font-semibold">
              ACIC Institutional B2B Suite
            </Badge>
            <RoleBadge role={currentRole} />
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
            CSR & ESG Carbon Intelligence Portal
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Cryptographically audited afforestation MRV for corporate CSR donors, ESG compliance officers,
            and institutional investors under <strong>SEBI BRSR Core Principle 6</strong> and <strong>IPCC Tier-2</strong> standards.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <ESGReportModal
            totalTrees={totalTreesPlanted}
            verifiedTrees={totalTreesVerified}
            organizationName="Tata Sustainability / ACIC Afforestation Portfolio"
            co2OffsetKg={totalAnnualCo2eMT * 1000}
          />

          <Button
            variant="default"
            onClick={handleExportBRSRCSV}
            className="rounded-xl gap-2 text-xs font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export BRSR Core CSV
          </Button>
        </div>
      </div>

      {/* Portfolio Aggregate KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-primary/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Total Planted Portfolio</span>
              <Trees className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-foreground">
              {totalTreesPlanted.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Funded across {filteredProjects.length} geo-spatial plots
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>AI & Satellite Verified Survival</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {portfolioAvgSurvival}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            {totalTreesVerified.toLocaleString()} live trees cryptographically verified
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Annual Carbon Sequestration</span>
              <TrendingUp className="h-4 w-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-sky-600 dark:text-sky-400">
              {totalAnnualCo2eMT.toFixed(1)} MT
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            IPCC Tier-2 Allometric Modeling (tCO₂e / yr)
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-purple-500/20 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Copernicus Sentinel-2 Status</span>
              <Satellite className="h-4 w-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-heading text-purple-600 dark:text-purple-400">
              100% Live L2A
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Continuous 5-day orbital optical monitoring
          </CardContent>
        </Card>
      </div>

      {/* Main Portfolio Registry & Deep Audits */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading">Sponsored Plantation Projects</h2>
            <p className="text-xs text-muted-foreground">
              Direct telemetry from Copernicus Sentinel-2 satellites and ground photogrammetry feeds.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search project or funder..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-9 w-48 sm:w-64 rounded-xl text-xs bg-background/60 pl-8 border-primary/20"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="h-9 rounded-xl border border-primary/20 bg-background/60 px-3 text-xs focus:outline-none"
            >
              <option value="all">All Verification Tiers</option>
              <option value="gold">Gold Tier (&ge;85%)</option>
              <option value="field_verified">Field Verified (&ge;70%)</option>
              <option value="satellite_only">Satellite Only (&ge;20%)</option>
            </select>
          </div>
        </div>

        {/* Project Audit Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const auditCheck = isAuditExportEligible(currentRole, project.confidenceScore);

            return (
              <Card
                key={project.id}
                className="rounded-2xl border border-primary/20 bg-card/70 backdrop-blur-md shadow-md overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-border/20 bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          project.verificationTier === "Gold"
                            ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            : project.verificationTier === "Field Verified"
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                        }`}
                      >
                        {project.verificationTier} Tier ({project.confidenceScore}%)
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Satellite className="h-3 w-3 text-primary" /> {project.sentinel2PassesCount} passes
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold font-heading mt-2 line-clamp-1">
                      {project.projectName}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      📍 {project.location}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-background/60 border border-border/30 space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Funder Sponsor:</span>
                        <strong className="text-foreground">{project.funderName}</strong>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Trees Survival:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {project.verifiedTrees.toLocaleString()} / {project.plantedTrees.toLocaleString()} ({project.survivalRatePct}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Annual Carbon Sink:</span>
                        <strong className="text-sky-600 font-semibold">{project.annualCo2eMT} MT CO₂e</strong>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Sentinel-2 Mean NDVI:</span>
                        <span className="font-mono text-foreground font-semibold">
                          {project.meanNdvi} ({project.ndviTrend})
                        </span>
                      </div>
                    </div>

                    {/* SEBI BRSR Compliance Status */}
                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-muted-foreground">BRSR Core Principle 6:</span>
                      {project.brsrEligible ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Audited & Compliant
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Field Audit Required
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0 border-t border-border/20 bg-muted/10 mt-2 flex items-center justify-between gap-2">
                  <Button asChild size="sm" variant="ghost" className="h-8 text-xs rounded-xl">
                    <Link to={`/tree-map?project=${project.id}`}>
                      Inspect Telemetry <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>

                  <CarbonCertificateModal
                    projectId={project.id}
                    projectName={project.projectName}
                    organizationName={project.funderName}
                    targetTrees={project.plantedTrees}
                    verifiedTrees={project.verifiedTrees}
                    confidenceScore={project.confidenceScore}
                    co2OffsetKg={project.annualCo2eMT * 1000}
                    verificationTier={project.verificationTier}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
