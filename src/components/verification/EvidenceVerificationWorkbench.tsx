import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  FileCheck,
  MapPin,
  Calendar,
  User,
  TreePine,
  Activity,
  Lock,
  Award,
  Zap,
  RotateCcw,
  Eye,
  Layers,
  ChevronRight,
  Check,
  Clock,
  Camera,
} from "lucide-react";
import {
  evidenceVerificationService,
  PlantationClaim,
  EvidenceScreeningResult,
  VerificationStatus,
  TrustTier,
  VerificationReceipt,
} from "../../services/evidenceVerificationService";
import { ClaimVerificationReceiptModal } from "./ClaimVerificationReceiptModal";

export const EvidenceVerificationWorkbench: React.FC = () => {
  const [claims, setClaims] = useState<PlantationClaim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<VerificationReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reAuditNotes, setReAuditNotes] = useState("");
  const [showReAuditDialog, setShowReAuditDialog] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadClaims = () => {
    const allClaims = evidenceVerificationService.getClaims();
    setClaims(allClaims);
    if (!selectedClaimId && allClaims.length > 0) {
      setSelectedClaimId(allClaims[0].id);
    }
  };

  useEffect(() => {
    loadClaims();
    const unsubscribe = evidenceVerificationService.subscribe(() => {
      loadClaims();
    });
    return unsubscribe;
  }, []);

  const selectedClaim = useMemo(() => {
    return claims.find((c) => c.id === selectedClaimId) || null;
  }, [claims, selectedClaimId]);

  const selectedScreening = useMemo(() => {
    if (!selectedClaim) return null;
    return evidenceVerificationService.getScreeningResult(selectedClaim.id);
  }, [selectedClaim]);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false;
      if (tierFilter !== "all" && claim.trustTier !== tierFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchId = claim.id.toLowerCase().includes(q);
        const matchTree = claim.treeId.toLowerCase().includes(q);
        const matchPlanter = claim.planterId.toLowerCase().includes(q);
        const matchSpecies = claim.species.toLowerCase().includes(q);
        if (!matchId && !matchTree && !matchPlanter && !matchSpecies) return false;
      }
      return true;
    });
  }, [claims, statusFilter, tierFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = claims.length;
    const submitted = claims.filter((c) => c.status === "submitted").length;
    const inReview = claims.filter((c) => c.status === "in_review").length;
    const verified = claims.filter((c) => c.status === "verified").length;
    const flaggedOrRejected = claims.filter((c) => c.status === "rejected" || c.status === "re_audit_requested").length;
    const highTrustReady = claims.filter((c) => (c.status === "submitted" || c.status === "in_review") && c.trustTier === "high_trust").length;
    return { total, submitted, inReview, verified, flaggedOrRejected, highTrustReady };
  }, [claims]);

  const handleApprove = async (claimId: string) => {
    setIsProcessing(true);
    try {
      const receipt = await evidenceVerificationService.verifyClaim(claimId, "admin_verifier", "Verified through workbench multi-check matrix.");
      loadClaims();
      setActiveReceipt(receipt);
      setActionSuccessMessage("Claim " + claimId + " successfully verified and cryptographically sealed.");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedClaim) return;
    setIsProcessing(true);
    try {
      await evidenceVerificationService.rejectClaim(
        selectedClaim.id,
        "admin_verifier",
        rejectionReason || "Evidence failed verification screening checks."
      );
      loadClaims();
      setShowRejectDialog(false);
      setRejectionReason("");
      setActionSuccessMessage("Claim " + selectedClaim.id + " rejected.");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReAuditConfirm = async () => {
    if (!selectedClaim) return;
    setIsProcessing(true);
    try {
      await evidenceVerificationService.requestReAudit(
        selectedClaim.id,
        "admin_verifier",
        reAuditNotes || "Please recapture tree evidence with clearer lighting and accurate GPS positioning."
      );
      loadClaims();
      setShowReAuditDialog(false);
      setReAuditNotes("");
      setActionSuccessMessage("Re-audit requested for claim " + selectedClaim.id + ".");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchAutoApprove = async () => {
    setIsProcessing(true);
    try {
      const result = await evidenceVerificationService.batchAutoApproveHighTrust("admin_verifier");
      loadClaims();
      setActionSuccessMessage("Batch verified " + result.verifiedCount + " high-trust claims.");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTierBadge = (tier: TrustTier) => {
    switch (tier) {
      case "high_trust":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><ShieldCheck className="w-3 h-3 text-emerald-400" /> High Trust</span>;
      case "moderate_review_required":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30"><AlertTriangle className="w-3 h-3 text-amber-400" /> Moderate Review</span>;
      case "low_flagged":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30"><XCircle className="w-3 h-3 text-rose-400" /> Flagged</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-400">{tier}</span>;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><Check className="w-3 h-3" /> Verified</span>;
      case "in_review":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30"><Clock className="w-3 h-3" /> In Review</span>;
      case "submitted":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-700/60 text-zinc-300 border border-zinc-600"><Layers className="w-3 h-3" /> Submitted</span>;
      case "re_audit_requested":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><RotateCcw className="w-3 h-3" /> Re-Audit</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="text-xs text-zinc-400">{status}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 animate-fade-in" data-testid="evidence-verification-workbench">
      {/* Workbench Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/90 p-5 rounded-2xl border border-emerald-500/20 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Evidence Verification Workbench
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                Task 40 • Phase 8
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Multi-check automated screening, geodetic watermarking, silvicultural growth delta, and cryptographic proof sealing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadClaims}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
            title="Refresh Claims"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {stats.highTrustReady > 0 && (
            <button
              onClick={handleBatchAutoApprove}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>Batch Auto-Approve ({stats.highTrustReady} High-Trust)</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Success Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Queue Total</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">Pending Review</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.submitted + stats.inReview}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Verified & Sealed</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.verified}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Re-Audit / Flagged</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.flaggedOrRejected}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">High-Trust Ready</span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{stats.highTrustReady}</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Claims Queue & Filters (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Tree, Planter, Species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              {["all", "submitted", "in_review", "verified", "rejected", "re_audit_requested"].map((tab) => {
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={"px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition-colors " + (
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    )}
                  >
                    {tab.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>

            {/* Trust Tier Filters */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>Trust Tier:</span>
              <div className="flex items-center gap-1">
                {["all", "high_trust", "moderate_review_required", "low_flagged"].map((tier) => {
                  const isActive = tierFilter === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setTierFilter(tier)}
                      className={"px-2 py-0.5 rounded text-[10px] font-medium " + (
                        isActive ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
                      )}
                    >
                      {tier === "all" ? "All" : tier === "high_trust" ? "High" : tier === "moderate_review_required" ? "Mod" : "Flag"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Queue List Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-zinc-500 text-xs">
                No claims match your filters.
              </div>
            ) : (
              filteredClaims.map((claim) => {
                const isSelected = claim.id === selectedClaimId;
                return (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                    className={"p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 " + (
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                        : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-white">{claim.treeId}</span>
                        {getStatusBadge(claim.status)}
                      </div>
                      <p className="text-xs text-zinc-300 truncate">{claim.species} • {claim.heightCm}cm</p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>Planter: {claim.planterId}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-400">{claim.compositeConfidenceScore}% score</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {getTierBadge(claim.trustTier)}
                      <ChevronRight className={"w-4 h-4 " + (isSelected ? "text-emerald-400" : "text-zinc-600")} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Evidence Inspection & Workbench Actions (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedClaim && selectedScreening ? (
            <div className="space-y-5">
              {/* Top Banner of Selected Claim */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-white font-mono">{selectedClaim.treeId}</h3>
                    {getStatusBadge(selectedClaim.status)}
                    {getTierBadge(selectedClaim.trustTier)}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Claim ID: <span className="font-mono text-zinc-300">{selectedClaim.id}</span> • Submitted {new Date(selectedClaim.submittedAt).toLocaleString()}
                  </p>
                </div>

                {/* Confidence Score Pill */}
                <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Trust Confidence</span>
                    <span className={"text-xl font-black " + (
                      selectedClaim.compositeConfidenceScore >= 85
                        ? "text-emerald-400"
                        : selectedClaim.compositeConfidenceScore >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    )}>
                      {selectedClaim.compositeConfidenceScore}%
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 flex items-center justify-center bg-emerald-500/10">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* 5W Verification Metadata Matrix */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  5W Context & Evidence Provenance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">Who (Planter)</span>
                    <p className="font-semibold text-white mt-0.5">{selectedClaim.planterId}</p>
                    <p className="text-[11px] text-zinc-400">Team: Field Forestry A</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">What (Specimen)</span>
                    <p className="font-semibold text-white mt-0.5">{selectedClaim.species}</p>
                    <p className="text-[11px] text-zinc-400">Height: {selectedClaim.heightCm} cm • Health: {selectedClaim.healthStatus}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">Where (Geodetic GPS)</span>
                    <p className="font-mono text-white mt-0.5 text-[11px]">
                      {selectedClaim.gpsLocation.latitude.toFixed(6)}, {selectedClaim.gpsLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-[11px] text-emerald-400">Centroid Delta: {selectedScreening.checks.geofence.distanceMeters.toFixed(1)}m</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">When (Timestamps)</span>
                    <p className="text-white mt-0.5 font-mono text-[11px]">{new Date(selectedClaim.submittedAt).toLocaleDateString()}</p>
                    <p className="text-[11px] text-zinc-400">Capture: {new Date(selectedClaim.photoEvidence.capturedAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">Why (Silviculture)</span>
                    <p className="text-white mt-0.5">Biomass Monitoring</p>
                    <p className="text-[11px] text-zinc-400">Periodic Verification Cycle</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 text-[10px] uppercase font-semibold">Growth Velocity</span>
                    <p className="text-white mt-0.5 font-mono text-[11px]">
                      {selectedScreening.checks.growthPhysics.growthRateCmPerDay.toFixed(2)} cm/day
                    </p>
                    <p className="text-[11px] text-emerald-400">Δh: +{selectedScreening.checks.growthPhysics.heightDeltaCm}cm in {selectedScreening.checks.growthPhysics.daysDelta}d</p>
                  </div>
                </div>
              </div>

              {/* Automated Multi-Check Screening Matrix */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Automated Multi-Check Screening Matrix
                  </span>
                  <span className="text-[11px] font-normal text-zinc-400">5 Rule Screening Engine</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Geofence Check */}
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {selectedScreening.checks.geofence.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white">Geodetic Geofence Boundary</p>
                        <p className="text-[11px] text-zinc-400">{selectedScreening.checks.geofence.details}</p>
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedScreening.checks.geofence.score}%</span>
                  </div>

                  {/* EXIF Watermark Check */}
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {selectedScreening.checks.exifWatermark.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white">EXIF & Geodetic Watermark Authenticity</p>
                        <p className="text-[11px] text-zinc-400">{selectedScreening.checks.exifWatermark.details}</p>
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedScreening.checks.exifWatermark.score}%</span>
                  </div>

                  {/* Photo Deduplication Check */}
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {selectedScreening.checks.deduplication.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white">SHA-256 Photo Deduplication</p>
                        <p className="text-[11px] text-zinc-400">{selectedScreening.checks.deduplication.details}</p>
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedScreening.checks.deduplication.score}%</span>
                  </div>

                  {/* Silvicultural Growth Delta Check */}
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {selectedScreening.checks.growthPhysics.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white">Silvicultural Growth Physics Delta</p>
                        <p className="text-[11px] text-zinc-400">{selectedScreening.checks.growthPhysics.details}</p>
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedScreening.checks.growthPhysics.score}%</span>
                  </div>

                  {/* Species Canopy AI Check */}
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {selectedScreening.checks.speciesCanopyAI.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white">Botanical AI Species & Canopy Matching</p>
                        <p className="text-[11px] text-zinc-400">{selectedScreening.checks.speciesCanopyAI.details}</p>
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedScreening.checks.speciesCanopyAI.score}%</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Evidence Inspection */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Visual Photographic Evidence & Baseline Comparison
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Baseline / Previous Evidence */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-semibold">Baseline Reference (T-0)</span>
                      <span>{selectedClaim.historicalBaseline ? new Date(selectedClaim.historicalBaseline.recordedAt).toLocaleDateString() : "Initial Registration"}</span>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center border border-zinc-800">
                      {selectedClaim.historicalBaseline?.photoUrl ? (
                        <img
                          src={selectedClaim.historicalBaseline.photoUrl}
                          alt="Baseline Evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-zinc-500">
                          <TreePine className="w-8 h-8 mx-auto text-zinc-600 mb-1" />
                          <p className="text-xs">Baseline Height: {selectedClaim.historicalBaseline?.heightCm ?? selectedClaim.heightCm} cm</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Submission Photo */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Current Evidence (T-Now)</span>
                      <span className="font-mono text-[11px]">{new Date(selectedClaim.photoEvidence.capturedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center border border-emerald-500/30">
                      {selectedClaim.photoEvidence.photoUrl ? (
                        <img
                          src={selectedClaim.photoEvidence.photoUrl}
                          alt="Current Evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-emerald-400">
                          <TreePine className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                          <p className="text-xs">Current Height: {selectedClaim.heightCm} cm</p>
                        </div>
                      )}

                      {/* Watermark overlay */}
                      {selectedClaim.photoEvidence.watermarkData && (
                        <div className="absolute bottom-1 left-1 right-1 bg-black/80 backdrop-blur-sm p-1.5 rounded text-[10px] text-zinc-300 font-mono flex items-center justify-between">
                          <span>GPS: {selectedClaim.photoEvidence.watermarkData.gpsCoords.latitude.toFixed(4)}, {selectedClaim.photoEvidence.watermarkData.gpsCoords.longitude.toFixed(4)}</span>
                          <span className="text-emerald-400">AUTHENTIC</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Actions Toolbar */}
              <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedClaim.verificationReceipt && (
                    <button
                      onClick={() => setActiveReceipt(selectedClaim.verificationReceipt || null)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      <span>View Cryptographic Proof Receipt</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    onClick={() => setShowReAuditDialog(true)}
                    disabled={isProcessing || selectedClaim.status === "verified"}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors disabled:opacity-40"
                  >
                    Request Re-Audit
                  </button>

                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isProcessing || selectedClaim.status === "verified"}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors disabled:opacity-40"
                  >
                    Reject Claim
                  </button>

                  <button
                    onClick={() => handleApprove(selectedClaim.id)}
                    disabled={isProcessing || selectedClaim.status === "verified"}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 disabled:opacity-40"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{selectedClaim.status === "verified" ? "Already Verified" : "Approve & Seal Proof"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-500">
              <FileCheck className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-medium">Select a claim from the queue to inspect evidence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Reject Plantation Claim</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Provide a rationale for rejecting claim <span className="font-mono text-rose-300">{selectedClaim.id}</span>:
            </p>
            <textarea
              rows={3}
              placeholder="E.g., Duplicate photograph detected or GPS coordinates outside plantation bounds."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-Audit Notes Dialog */}
      {showReAuditDialog && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Request Field Re-Audit</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Specify instructions for the field worker to re-audit <span className="font-mono text-amber-300">{selectedClaim.id}</span>:
            </p>
            <textarea
              rows={3}
              placeholder="E.g., Please recapture tree evidence with clearer lighting and check GPS calibration."
              value={reAuditNotes}
              onChange={(e) => setReAuditNotes(e.target.value)}
              className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReAuditDialog(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReAuditConfirm}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-950 disabled:opacity-50"
              >
                Dispatch Re-Audit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Receipt Modal */}
      {activeReceipt && (
        <ClaimVerificationReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
