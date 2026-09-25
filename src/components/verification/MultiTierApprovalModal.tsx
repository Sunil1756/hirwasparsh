import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  Award,
  Lock,
  Calendar,
  MapPin,
  TreePine,
  Check,
  X,
  FileCheck,
  Clock,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  ApprovalClaim,
  ReviewerRole,
  VerificationChecklist,
  RejectionCategory,
  reviewerApprovalService,
} from "../../services/reviewerApprovalService";

interface MultiTierApprovalModalProps {
  claim: ApprovalClaim;
  currentRole: ReviewerRole;
  currentReviewerId: string;
  currentReviewerName: string;
  onClose: () => void;
  onClaimUpdated?: (updated: ApprovalClaim) => void;
}

export const MultiTierApprovalModal: React.FC<MultiTierApprovalModalProps> = ({
  claim,
  currentRole,
  currentReviewerId,
  currentReviewerName,
  onClose,
  onClaimUpdated,
}) => {
  const [checklist, setChecklist] = useState<VerificationChecklist>({
    speciesMatch: true,
    photoAuthenticity: true,
    spatiotemporalKinematics: true,
    geofenceContainment: true,
    silviculturalGrowth: true,
  });

  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectCategory, setRejectCategory] = useState<RejectionCategory>("insufficient_evidence_quality");
  const [rejectReason, setRejectReason] = useState("");

  const allChecksPassed = Object.values(checklist).every(Boolean);

  const handleL1Action = async (decision: "approved" | "escalated" | "re_audit") => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const updated = reviewerApprovalService.submitL1Review(
        claim.id,
        { reviewerId: currentReviewerId, reviewerName: currentReviewerName, role: "field_auditor" },
        decision,
        checklist,
        notes || "L1 Field Audit decision: " + decision
      );
      if (onClaimUpdated) onClaimUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "L1 review submission failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleL2Action = async (decision: "approved" | "escalated" | "re_audit") => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const updated = reviewerApprovalService.submitL2Review(
        claim.id,
        { reviewerId: currentReviewerId, reviewerName: currentReviewerName, role: currentRole },
        decision,
        checklist,
        notes || "L2 Lead Endorsement decision: " + decision
      );
      if (onClaimUpdated) onClaimUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "L2 endorsement failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleL3Action = async (decision: "approved" | "re_audit") => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const updated = reviewerApprovalService.submitL3Certification(
        claim.id,
        { reviewerId: currentReviewerId, reviewerName: currentReviewerName, role: "admin_certifier" },
        decision,
        notes || "L3 Admin Master Certification"
      );
      if (onClaimUpdated) onClaimUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "L3 certification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const updated = reviewerApprovalService.rejectClaimWithCategory(
        claim.id,
        { reviewerId: currentReviewerId, reviewerName: currentReviewerName, role: currentRole },
        rejectCategory,
        rejectReason || "Rejected during " + currentRole + " review."
      );
      if (onClaimUpdated) onClaimUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Rejection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multitier-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="multitier-modal-title"
                className="text-lg font-bold text-white tracking-wide flex items-center gap-2"
              >
                Multi-Tier Approval & Certification Drawer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                  {claim.stage.replace(/_/g, " ")}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Four-Eyes dual signatory control & cryptographic proof certification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close approval drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200 text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Claim Summary & Photo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative aspect-square md:aspect-auto rounded-2xl overflow-hidden bg-black border border-zinc-800 md:col-span-1">
              <img src={claim.photoUrl} alt={claim.treeId} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                {claim.treeId}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white text-sm">{claim.species}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    {claim.trustTier.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
                  <div>Planter: <strong className="text-zinc-200">{claim.planterName}</strong></div>
                  <div>Location: <strong className="text-zinc-200">{claim.locationName}</strong></div>
                  <div>Coordinates: <span className="font-mono text-zinc-300">{claim.coords.latitude.toFixed(4)}, {claim.coords.longitude.toFixed(4)}</span></div>
                  <div>Submitted: <span className="text-zinc-300">{new Date(claim.submittedAt).toLocaleDateString()}</span></div>
                </div>
              </div>

              {/* 4-Eyes Dual Control Signatory Status */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Four-Eyes Dual-Signatory Progress
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  {/* L1 */}
                  <div className={"p-2 rounded-xl border " + (
                    claim.l1Review ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                  )}>
                    <span className="text-[10px] font-bold block">L1 Field Auditor</span>
                    <span className="text-xs font-semibold">{claim.l1Review ? claim.l1Review.reviewerName : "Pending"}</span>
                  </div>

                  {/* L2 */}
                  <div className={"p-2 rounded-xl border " + (
                    claim.l2Review ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                  )}>
                    <span className="text-[10px] font-bold block">L2 Lead Verifier</span>
                    <span className="text-xs font-semibold">{claim.l2Review ? claim.l2Review.reviewerName : "Pending"}</span>
                  </div>

                  {/* L3 */}
                  <div className={"p-2 rounded-xl border " + (
                    claim.cryptographicCertificate ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                  )}>
                    <span className="text-[10px] font-bold block">L3 Admin Seal</span>
                    <span className="text-xs font-semibold">{claim.cryptographicCertificate ? "Sealed" : "Pending"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Point Verification Checklist */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" /> Reviewer Verification Checklist (5 Mandatory Criteria)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: "speciesMatch", label: "Botanical AI & Canopy Species Match Confirmed" },
                { id: "photoAuthenticity", label: "Exact & Perceptual dHash Photo Deduplication Verified" },
                { id: "spatiotemporalKinematics", label: "Kinematic Transit Speed & Solar Daylight Feasible" },
                { id: "geofenceContainment", label: "Cadastral Geofence Boundary Alignment Confirmed" },
                { id: "silviculturalGrowth", label: "Silvicultural Growth Curve & Height Delta Plausible" },
              ].map((item) => {
                const isChecked = checklist[item.id as keyof VerificationChecklist];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setChecklist((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id as keyof VerificationChecklist],
                      }))
                    }
                    className={"p-2.5 rounded-xl border text-left flex items-center justify-between transition-all " + (
                      isChecked
                        ? "bg-emerald-950/30 border-emerald-500/40 text-zinc-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    )}
                  >
                    <span>{item.label}</span>
                    <div className={"w-4 h-4 rounded flex items-center justify-center border " + (
                      isChecked ? "bg-emerald-600 border-emerald-500 text-white" : "border-zinc-700 bg-zinc-800"
                    )}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Actions */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Auditor Sign-Off Notes & Decision Rationale
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Active Role: <strong className="text-emerald-400">{currentRole.replace(/_/g, " ")}</strong>
              </span>
            </div>

            <textarea
              rows={2}
              placeholder="Enter comprehensive verification rationale, field notes, or waiver grounds..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />

            {/* Rejection Form Dropdown if active */}
            {showRejectForm ? (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-fade-in">
                <span className="text-xs font-bold text-rose-300 block">Select Rejection Category & Reason:</span>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value as RejectionCategory)}
                  className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                >
                  <option value="fraudulent_photo_reuse">Fraudulent Photo Reuse / Collision</option>
                  <option value="geodetic_out_of_bounds">Geodetic Out of Bounds (Boundary Breach)</option>
                  <option value="kinematic_impossible_travel">Kinematic Impossible Travel (Teleportation)</option>
                  <option value="botanical_species_mismatch">Botanical Species Mismatch</option>
                  <option value="insufficient_evidence_quality">Insufficient Evidence Quality / Blurry</option>
                  <option value="duplicate_claim">Duplicate Claim</option>
                  <option value="other">Other Violation</option>
                </select>
                <textarea
                  rows={2}
                  placeholder="Specify detailed grounds for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Submit Formal Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                >
                  Reject Claim...
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role Specific Action Buttons */}
                  {currentRole === "field_auditor" && (
                    <>
                      <button
                        onClick={() => handleL1Action("re_audit")}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 disabled:opacity-50"
                      >
                        Request Re-Audit
                      </button>
                      <button
                        onClick={() => handleL1Action("escalated")}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs font-semibold border border-amber-500/30 disabled:opacity-50"
                      >
                        Escalate to Lead
                      </button>
                      <button
                        onClick={() => handleL1Action("approved")}
                        disabled={isProcessing || !allChecksPassed}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
                      >
                        L1 Approve & Sign
                      </button>
                    </>
                  )}

                  {currentRole === "lead_verifier" && (
                    <>
                      <button
                        onClick={() => handleL2Action("re_audit")}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 disabled:opacity-50"
                      >
                        Request Re-Audit
                      </button>
                      <button
                        onClick={() => handleL2Action("escalated")}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 text-blue-300 text-xs font-semibold border border-blue-500/30 disabled:opacity-50"
                      >
                        Escalate to Admin
                      </button>
                      <button
                        onClick={() => handleL2Action("approved")}
                        disabled={isProcessing || !allChecksPassed}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
                      >
                        L2 Endorse & Approve
                      </button>
                    </>
                  )}

                  {currentRole === "admin_certifier" && (
                    <>
                      <button
                        onClick={() => handleL3Action("re_audit")}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 disabled:opacity-50"
                      >
                        Request Re-Audit
                      </button>
                      <button
                        onClick={() => handleL3Action("approved")}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
                      >
                        L3 Master Certify & Seal
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            HirwaSparsh • Four-Eyes Dual-Signatory Trust Protocol
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
