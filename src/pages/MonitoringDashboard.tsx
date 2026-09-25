/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 25
 * Unified Real-Time Monitoring & Survival Operations Dashboard
 * 
 * Features:
 * 1. Trees Requiring Monitoring (upcoming inspections with stage & countdowns)
 * 2. Overdue Observations (critical overdue alert matrix)
 * 3. Recent Observations Stream (live biometric deltas, photos, & 5W audit inspector)
 * 4. Survival Statistics & Analytics (6-status breakdowns, retention rates, MRV metrics)
 * 5. Trees Needing Review (Human-in-the-Loop review queue for AI uncertainty)
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Droplets,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  Layers,
  Leaf,
  Loader2,
  Lock,
  MapPin,
  PlusCircle,
  RefreshCw,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TreePine,
  TrendingUp,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurvivalStatusBadge } from "@/components/SurvivalStatusBadge";
import { CreateObservationModal } from "@/components/CreateObservationModal";
import { SurvivalVerificationModal } from "@/components/SurvivalVerificationModal";
import { EvidenceAuditInspectorModal } from "@/components/EvidenceAuditInspectorModal";
import {
  monitoringDashboardService,
  DashboardTreeItem,
  DashboardObservationItem,
} from "@/services/monitoringDashboardService";
import { AuditableEvidenceRecord } from "@/types/coreDatabase";

export const MonitoringDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("requiring_monitoring");

  // Modal states
  const [selectedObsTree, setSelectedObsTree] = useState<DashboardTreeItem | null>(null);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);

  const [selectedSurvivalTree, setSelectedSurvivalTree] = useState<DashboardTreeItem | null>(null);
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);

  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AuditableEvidenceRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Fetch Dashboard Data
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["monitoring-dashboard-data"],
    queryFn: async () => {
      return await monitoringDashboardService.getMonitoringDashboardData();
    },
    refetchInterval: 60000, // Background refresh every 60s
  });

  const handleOpenObsModal = (tree: DashboardTreeItem) => {
    setSelectedObsTree(tree);
    setIsObsModalOpen(true);
  };

  const handleOpenSurvivalModal = (tree: DashboardTreeItem) => {
    setSelectedSurvivalTree(tree);
    setIsSurvivalModalOpen(true);
  };

  const handleInspectAudit = (obs: DashboardObservationItem) => {
    const auditRec: AuditableEvidenceRecord = {
      id: obs.id,
      treeId: obs.treeId,
      who: {
        observerId: null,
        observerName: obs.observerName || "Field Forester",
        observerRole: obs.observerRole || "field_worker",
      },
      when: {
        eventTimestamp: obs.date,
        createdAt: obs.date,
      },
      what: {
        eventType: "biometric_field_observation",
        survivalStatus: obs.survivalStatus,
        healthStatus: obs.healthStatus,
        heightCm: obs.heightCm,
        dbhCm: obs.dbhCm,
        canopyWidthCm: obs.canopyCm,
        heightDeltaCm: obs.heightDeltaCm,
        dbhDeltaCm: obs.dbhDeltaCm,
        pestDiseaseDetected: obs.pestDiseaseDetected,
        diseaseDescription: obs.diseaseDescription,
        treatmentApplied: obs.treatmentApplied,
        notes: obs.notes,
      },
      where: {
        latitude: obs.latitude ?? null,
        longitude: obs.longitude ?? null,
        gpsAccuracyM: 3.0,
        distanceFromBaselineM: obs.distanceFromBaselineM ?? 0,
        geofenceStatus: obs.geofenceStatus || "within_bounds",
      },
      evidence: {
        photoUrl: obs.photoUrl || null,
        evidenceType: "growth_photo",
        sha256Hash: obs.sha256Hash || null,
        verificationStatus: "verified",
      },
    };

    setSelectedAuditRecord(auditRec);
    setIsAuditModalOpen(true);
  };

  const handleExportCsv = () => {
    if (!data) return;

    const headers = ["Tree Code", "Species", "Location", "Next Monitoring Date", "Monitoring Status", "Survival Status", "Days Remaining/Overdue"];
    const rows = (data.treesRequiringMonitoring.concat(data.overdueObservations)).map((t) => [
      t.treeCode,
      t.species,
      t.location || "N/A",
      new Date(t.nextMonitoringDate).toLocaleDateString(),
      t.monitoringStatus,
      t.survivalStatus,
      t.daysOverdue > 0 ? `-${t.daysOverdue} days` : `+${t.daysRemaining} days`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monitoring-schedule-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter helper
  const filterList = <T extends { treeCode?: string | null; species?: string | null; location?: string | null }>(
    list: T[] = []
  ): T[] => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.treeCode?.toLowerCase().includes(q) ||
        item.species?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Aggregating monitoring telemetry & MRV compliance...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalMonitoredTrees: 0,
    requiringMonitoringCount: 0,
    overdueCount: 0,
    criticalOverdueCount: 0,
    needsReviewCount: 0,
    survivalRatePct: 100,
    retentionRatePct: 100,
    complianceRatePct: 100,
  };

  const filteredRequiring = filterList(data?.treesRequiringMonitoring);
  const filteredOverdue = filterList(data?.overdueObservations);
  const filteredRecent = filterList(data?.recentObservations);
  const filteredReview = filterList(data?.treesNeedingReview);
  const stats = data?.survivalStatistics;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Monitoring & Survival Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time biometric surveillance, scheduled inspection tracking, and AI-assisted survival governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 text-xs border-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            <span>{isRefetching ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (data?.treesRequiringMonitoring && data.treesRequiringMonitoring.length > 0) {
                handleOpenObsModal(data.treesRequiringMonitoring[0]);
              } else if (data?.overdueObservations && data.overdueObservations.length > 0) {
                handleOpenObsModal(data.overdueObservations[0]);
              }
            }}
            className="gap-1.5 text-xs bg-primary text-primary-foreground shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Log Field Observation</span>
          </Button>
        </div>
      </div>

      {/* Top Level Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monitored */}
        <Card className="glass-card rounded-2xl border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Total Monitored Trees</span>
            <TreePine className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-heading font-bold text-foreground mt-2">
            {kpis.totalMonitoredTrees}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>{stats?.verifiedPercentage || 100}% verified in registry</span>
          </div>
        </Card>

        {/* Certified Survival Rate */}
        <Card className="glass-card rounded-2xl border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Survival Rate</span>
            <Heart className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-emerald-400 mt-2">
            {kpis.survivalRatePct}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Retention Rate: <span className="font-semibold text-foreground">{kpis.retentionRatePct}%</span>
          </div>
        </Card>

        {/* Overdue Inspections */}
        <Card className={`glass-card rounded-2xl border p-4 ${
          kpis.overdueCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Overdue Inspections</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-amber-400 mt-2">
            {kpis.overdueCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Critical Overdue: <span className="font-semibold text-rose-400">{kpis.criticalOverdueCount}</span>
          </div>
        </Card>

        {/* Needs Human Review */}
        <Card className={`glass-card rounded-2xl border p-4 ${
          kpis.needsReviewCount > 0 ? "border-purple-500/30 bg-purple-500/5" : "border-border"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Needs Human Review</span>
            <ShieldAlert className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-purple-400 mt-2">
            {kpis.needsReviewCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            AI uncertainty & status flags
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tree code, species, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/60 border-border text-sm"
          />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/70 border border-border p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="requiring_monitoring" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Requiring Monitoring</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-mono">
              {data?.treesRequiringMonitoring.length || 0}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="overdue" className="text-xs gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5" />
            <span>Overdue Observations</span>
            {kpis.overdueCount > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-[10px] font-mono bg-rose-500 text-white">
                {kpis.overdueCount}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="recent" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>Recent Observations Feed</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-mono">
              {data?.recentObservations.length || 0}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Survival Statistics</span>
          </TabsTrigger>

          <TabsTrigger value="needs_review" className="text-xs gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Needs Review</span>
            {kpis.needsReviewCount > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-[10px] font-mono bg-purple-500 text-white">
                {kpis.needsReviewCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: Trees Requiring Monitoring */}
        {/* ==================================================================== */}
        <TabsContent value="requiring_monitoring" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing trees due for field inspection in the upcoming 7 days or scheduled windows.
            </div>
            <span className="text-xs font-mono text-muted-foreground">{filteredRequiring.length} Trees</span>
          </div>

          {filteredRequiring.length === 0 ? (
            <Card className="rounded-2xl p-12 text-center border-border bg-card/40">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-lg text-foreground">All Scheduled Inspections Up-to-Date</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No trees currently require immediate observation. The next monitoring cycles will activate automatically.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequiring.map((tree) => (
                <Card key={tree.id} className="rounded-2xl border-border bg-card/60 hover:border-primary/40 transition-colors p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary block">{tree.treeCode}</span>
                      <h4 className="font-heading font-semibold text-sm text-foreground">{tree.species}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{tree.location}</span>
                      </p>
                    </div>
                    <SurvivalStatusBadge status={tree.survivalStatus} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Stage</span>
                      <p className="font-medium text-foreground">{tree.stageLabel}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Scheduled Date</span>
                      <p className="font-medium text-foreground">
                        {new Date(tree.nextMonitoringDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                      {tree.daysRemaining === 0 ? "Due Today" : `Due in ${tree.daysRemaining}d`}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Link to={`/tree/${tree.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleOpenObsModal(tree)}
                        className="h-7 text-xs gap-1 px-2.5 bg-primary text-primary-foreground"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Log
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: Overdue Observations */}
        {/* ==================================================================== */}
        <TabsContent value="overdue" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Prioritized list of overdue field monitoring inspections requiring urgent field visits.</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{filteredOverdue.length} Overdue</span>
          </div>

          {filteredOverdue.length === 0 ? (
            <Card className="rounded-2xl p-12 text-center border-border bg-card/40">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-lg text-foreground">Zero Overdue Inspections</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                All tree monitoring schedules are up-to-date and compliant with MRV verification timelines.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOverdue.map((tree) => {
                const isCritical = tree.monitoringStatus === "critical_overdue" || tree.daysOverdue > 14;
                return (
                  <Card
                    key={tree.id}
                    className={`rounded-2xl p-4 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCritical ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                      }`}>
                        <Clock className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{tree.treeCode}</span>
                          <span className="font-heading font-semibold text-sm text-foreground">{tree.species}</span>
                          <Badge className={`text-[10px] uppercase font-mono font-bold ${
                            isCritical ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                          }`}>
                            {tree.daysOverdue} Days Overdue
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" /> {tree.location}
                          </span>
                          <span>•</span>
                          <span>Stage: <strong className="text-foreground">{tree.stageLabel}</strong></span>
                          <span>•</span>
                          <span>Due: {new Date(tree.nextMonitoringDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/tree/${tree.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-border">
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleOpenObsModal(tree)}
                        className={`h-8 text-xs gap-1 ${
                          isCritical ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Conduct Audit
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: Recent Observations Feed */}
        {/* ==================================================================== */}
        <TabsContent value="recent" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Live chronological stream of biometric observations with growth progression deltas and 5W audit provenance.
            </div>
            <span className="text-xs font-mono text-muted-foreground">{filteredRecent.length} Entries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecent.map((obs) => (
              <Card key={obs.id} className="rounded-2xl border-border bg-card/60 p-4 space-y-3 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{obs.treeCode}</span>
                      <span className="font-semibold text-sm text-foreground">{obs.species}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-primary" />
                      <span>{obs.observerName} ({obs.observerRole?.replace(/_/g, " ")})</span>
                    </p>
                  </div>
                  <SurvivalStatusBadge status={obs.survivalStatus} size="sm" />
                </div>

                {/* Biometrics row */}
                {(obs.heightCm || obs.dbhCm || obs.canopyCm) && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    {obs.heightCm && (
                      <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Height</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <p className="font-mono font-semibold text-foreground">{obs.heightCm} cm</p>
                          {obs.heightDeltaCm !== null && obs.heightDeltaCm !== undefined && (
                            <span className={`text-[10px] font-mono ${obs.heightDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              +{obs.heightDeltaCm}cm
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {obs.dbhCm && (
                      <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">DBH</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <p className="font-mono font-semibold text-foreground">{obs.dbhCm} cm</p>
                          {obs.dbhDeltaCm !== null && obs.dbhDeltaCm !== undefined && (
                            <span className={`text-[10px] font-mono ${obs.dbhDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              +{obs.dbhDeltaCm}cm
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {obs.canopyCm && (
                      <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canopy</span>
                        <p className="font-mono font-semibold text-foreground mt-0.5">{obs.canopyCm} cm</p>
                      </div>
                    )}
                  </div>
                )}

                {obs.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/30">
                    {obs.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>{new Date(obs.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInspectAudit(obs)}
                    className="h-6 text-[10px] font-mono text-primary hover:bg-primary/10 gap-1 border border-primary/30 px-2"
                  >
                    <ShieldCheck className="w-3 h-3 text-primary" /> 5W Provenance
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: Survival Statistics & Analytics */}
        {/* ==================================================================== */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 6-Status Breakdown Card */}
            <Card className="glass-card rounded-2xl border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h3 className="font-heading font-semibold text-base text-foreground">Survival Status Distribution</h3>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {stats?.totalTrees || 0} Total Trees
                </Badge>
              </div>

              <div className="space-y-3">
                {[
                  { label: "ALIVE", count: stats?.aliveCount || 0, color: "bg-emerald-500", text: "text-emerald-400" },
                  { label: "STRESSED", count: stats?.stressedCount || 0, color: "bg-amber-500", text: "text-amber-400" },
                  { label: "DAMAGED", count: stats?.damagedCount || 0, color: "bg-orange-500", text: "text-orange-400" },
                  { label: "DEAD", count: stats?.deadCount || 0, color: "bg-rose-500", text: "text-rose-400" },
                  { label: "NEEDS_REVIEW", count: stats?.needsReviewCount || 0, color: "bg-purple-500", text: "text-purple-400" },
                  { label: "UNKNOWN", count: stats?.unknownCount || 0, color: "bg-slate-500", text: "text-slate-400" },
                ].map((item) => {
                  const pct = stats?.totalTrees ? Math.round((item.count / stats.totalTrees) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${item.text}`}>{item.label}</span>
                        <span className="font-mono text-muted-foreground">{item.count} trees ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* MRV & Retention Performance Metrics */}
            <Card className="glass-card rounded-2xl border-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-semibold text-base text-foreground">MRV Compliance & Retention</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Certified Survival</span>
                  <div className="text-2xl font-heading font-bold text-emerald-400">{kpis.survivalRatePct}%</div>
                  <p className="text-[10px] text-muted-foreground">Excludes unsurveyed trees</p>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Tree Retention Rate</span>
                  <div className="text-2xl font-heading font-bold text-primary">{kpis.retentionRatePct}%</div>
                  <p className="text-[10px] text-muted-foreground">Alive + Stressed + Damaged</p>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Inspection Compliance</span>
                  <div className="text-2xl font-heading font-bold text-foreground">{kpis.complianceRatePct}%</div>
                  <p className="text-[10px] text-muted-foreground">On-time monitoring adherence</p>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Ground-Truth Verified</span>
                  <div className="text-2xl font-heading font-bold text-foreground">{stats?.verifiedPercentage || 100}%</div>
                  <p className="text-[10px] text-muted-foreground">Forester signed off</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 5: Trees Needing Review */}
        {/* ==================================================================== */}
        <TabsContent value="needs_review" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>Human-in-the-Loop Review Queue: AI uncertainty flags and regression conflicts requiring human verification.</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{filteredReview.length} Pending Review</span>
          </div>

          {filteredReview.length === 0 ? (
            <Card className="rounded-2xl p-12 text-center border-border bg-card/40">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-lg text-foreground">Review Queue Empty</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No tree survival statuses currently require human sign-off or verification.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReview.map((tree) => (
                <Card
                  key={tree.id}
                  className="rounded-2xl p-4 border border-purple-500/30 bg-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{tree.treeCode}</span>
                        <span className="font-heading font-semibold text-sm text-foreground">{tree.species}</span>
                        <Badge className="bg-purple-600 text-white text-[10px]">Action Required</Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tree.aiRationale || "AI telemetry detected potential health regression or uncertainty. Please verify ground truth."}
                      </p>

                      {tree.aiSuggestedStatus && (
                        <div className="pt-0.5 text-xs text-purple-300 font-mono flex items-center gap-2">
                          <span>AI Proposed: <strong>{tree.aiSuggestedStatus}</strong></span>
                          {tree.aiConfidence && (
                            <span>({tree.aiConfidence}% confidence)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/tree/${tree.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-border">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => handleOpenSurvivalModal(tree)}
                      className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify Status
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Observation Modal */}
      {selectedObsTree && (
        <CreateObservationModal
          isOpen={isObsModalOpen}
          onClose={() => setIsObsModalOpen(false)}
          treeId={selectedObsTree.id}
          treeCode={selectedObsTree.treeCode}
          species={selectedObsTree.species}
          plantationDate={selectedObsTree.plantationDate}
          currentHeightCm={selectedObsTree.heightCm}
          currentDbhCm={selectedObsTree.dbhCm}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["monitoring-dashboard-data"] });
          }}
        />
      )}

      {/* Survival Verification Modal */}
      {selectedSurvivalTree && (
        <SurvivalVerificationModal
          isOpen={isSurvivalModalOpen}
          onClose={() => setIsSurvivalModalOpen(false)}
          treeId={selectedSurvivalTree.id}
          treeCode={selectedSurvivalTree.treeCode}
          species={selectedSurvivalTree.species}
          currentSurvivalStatus={selectedSurvivalTree.survivalStatus}
          aiSuggestedStatus={selectedSurvivalTree.aiSuggestedStatus}
          aiConfidence={selectedSurvivalTree.aiConfidence}
          aiRationale={selectedSurvivalTree.aiRationale}
          photoUrl={selectedSurvivalTree.photoUrl}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["monitoring-dashboard-data"] });
          }}
        />
      )}

      {/* 5W Evidence Audit Inspector Modal */}
      <EvidenceAuditInspectorModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        record={selectedAuditRecord}
      />
    </div>
  );
};

export default MonitoringDashboard;
