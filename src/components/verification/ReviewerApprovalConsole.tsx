import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Zap,
  Filter,
  Layers,
  Award,
  Lock,
  User,
  MapPin,
  Calendar,
  X,
} from "lucide-react";
import {
  ApprovalClaim,
  ApprovalStage,
  ReviewerRole,
  reviewerApprovalService,
  BatchApprovalResult,
} from "../../services/reviewerApprovalService";
import { MultiTierApprovalModal } from "./MultiTierApprovalModal";
import { BatchApprovalSafetyModal } from "./BatchApprovalSafetyModal";

export const ReviewerApprovalConsole: React.FC = () => {
  const [claims, setClaims] = useState<ApprovalClaim[]>(() =>
    reviewerApprovalService.getAllClaims()
  );
  const [currentRole, setCurrentRole] = useState<ReviewerRole>("field_auditor");
  const [selectedClaim, setSelectedClaim] = useState<ApprovalClaim | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchApprovalResult | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadClaims = () => {
    setClaims(reviewerApprovalService.getAllClaims());
  };

  useEffect(() => {
    const unsubscribe = reviewerApprovalService.subscribe(() => {
      loadClaims();
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const total = claims.length;
    const l1Pending = claims.filter((c) => c.stage === "pending_l1_review").length;
    const leadPending = claims.filter((c) => c.stage === "pending_lead_approval").length;
    const adminPending = claims.filter((c) => c.stage === "pending_admin_certification").length;
    const approved = claims.filter((c) => c.stage === "approved_certified").length;
    const rejected = claims.filter((c) => c.stage === "rejected").length;
    return { total, l1Pending, leadPending, adminPending, approved, rejected };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTree = c.treeId.toLowerCase().includes(q);
        const matchPlanter = c.planterName.toLowerCase().includes(q) || c.planterId.toLowerCase().includes(q);
        const matchSpecies = c.species.toLowerCase().includes(q);
        if (!matchTree && !matchPlanter && !matchSpecies) return false;
      }
      return true;
    });
  }, [claims, stageFilter, searchQuery]);

  const handleExecuteBatch = () => {
    setIsProcessingBatch(true);
    setTimeout(() => {
      const result = reviewerApprovalService.executeBatchApproval(
        claims.map((c) => c.id),
        { reviewerId: "ACTIVE-USER-01", reviewerName: "Active Reviewer", role: currentRole }
      );
      setBatchResult(result);
      setIsProcessingBatch(false);
      setShowBatchModal(false);
    }, 400);
  };

  const getStageBadge = (stage: ApprovalStage) => {
    switch (stage) {
      case "approved_certified":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Certified & Sealed</span>;
      case "pending_l1_review":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">Pending L1 Audit</span>;
      case "pending_lead_approval":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Pending Lead Approval</span>;
      case "pending_admin_certification":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">Pending Admin Seal</span>;
      case "rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300">{stage}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 animate-fade-in" data-testid="reviewer-approval-console">
      {/* Top Banner & Multi-Tier Role Switcher */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Reviewer & Admin Approval Console
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                Task 43
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Multi-tier governance, Four-Eyes dual control verification, and cryptographic batch certification.
            </p>
          </div>
        </div>

        {/* Role Switcher & Batch Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
            <span className="text-[11px] font-semibold text-zinc-400 px-2">Simulate Role:</span>
            {[
              { id: "field_auditor", label: "Field Auditor (L1)" },
              { id: "lead_verifier", label: "Lead Verifier (L2)" },
              { id: "admin_certifier", label: "Admin Certifier (L3)" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setCurrentRole(r.id as ReviewerRole)}
                className={"px-3 py-1.5 rounded-lg font-medium transition-colors " + (
                  currentRole === r.id
                    ? "bg-emerald-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all"
          >
            <Zap className="w-4 h-4 text-emerald-200" />
            <span>Safe Batch Approve</span>
          </button>
        </div>
      </div>

      {/* Batch Result Notification */}
      {batchResult && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              Batch <strong>{batchResult.batchId}</strong> successfully sealed: <strong>{batchResult.approvedCount} approved</strong>, <strong>{batchResult.quarantinedCount} quarantined</strong>.
            </span>
          </div>
          <button onClick={() => setBatchResult(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Claims</span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/30 bg-blue-950/10">
          <span className="text-[10px] uppercase font-bold text-blue-400">Pending L1 Audit</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.l1Pending}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 bg-amber-950/10">
          <span className="text-[10px] uppercase font-bold text-amber-400">Pending Lead Endorsement</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.leadPending}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-purple-500/30 bg-purple-950/10">
          <span className="text-[10px] uppercase font-bold text-purple-400">Pending Admin Seal</span>
          <p className="text-2xl font-black text-purple-400 mt-1">{stats.adminPending}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Certified & Sealed</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.approved}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tree ID, planter name, species..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Claims" },
            { id: "pending_l1_review", label: "Pending L1" },
            { id: "pending_lead_approval", label: "Pending Lead" },
            { id: "pending_admin_certification", label: "Pending Admin" },
            { id: "approved_certified", label: "Certified" },
            { id: "rejected", label: "Rejected" },
          ].map((cat) => {
            const isActive = stageFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setStageFilter(cat.id)}
                className={"px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors " + (
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Claims List Grid */}
      <div className="space-y-3">
        {filteredClaims.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-zinc-300">No claims match your current filter.</p>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStageBadge(claim.stage)}
                  <span className="text-xs font-mono font-bold text-white">{claim.treeId}</span>
                  <span className="text-xs text-zinc-300 font-semibold">{claim.species}</span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-zinc-400 flex-wrap">
                  <span>Planter: <strong className="text-zinc-200">{claim.planterName}</strong></span>
                  <span>Location: <strong className="text-zinc-200">{claim.locationName}</strong></span>
                  <span>Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</span>
                  <span>Dual Control: <strong className="text-amber-400">{claim.requiresDualControl ? "Required" : "Standard"}</strong></span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
                <img src={claim.photoUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover border border-zinc-800" />
                <button
                  onClick={() => setSelectedClaim(claim)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Review & Adjudicate</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Multi-Tier Approval Drawer Modal */}
      {selectedClaim && (
        <MultiTierApprovalModal
          claim={selectedClaim}
          currentRole={currentRole}
          currentReviewerId="ACTIVE-USER-01"
          currentReviewerName="Senior Verifier"
          onClose={() => setSelectedClaim(null)}
          onClaimUpdated={() => {
            loadClaims();
            setSelectedClaim(null);
          }}
        />
      )}

      {/* Batch Safety Modal */}
      {showBatchModal && (
        <BatchApprovalSafetyModal
          claims={claims}
          currentRole={currentRole}
          onConfirm={handleExecuteBatch}
          onCancel={() => setShowBatchModal(false)}
          isProcessing={isProcessingBatch}
        />
      )}
    </div>
  );
};
