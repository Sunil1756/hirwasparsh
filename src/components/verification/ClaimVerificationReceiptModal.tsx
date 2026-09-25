import React, { useState } from "react";
import { ShieldCheck, QrCode, Copy, Check, Award, Lock, X, Calendar, MapPin, User, CheckCircle2 } from "lucide-react";
import { VerificationReceipt } from "../../services/evidenceVerificationService";

interface ClaimVerificationReceiptModalProps {
  receipt: VerificationReceipt;
  onClose: () => void;
}

export const ClaimVerificationReceiptModal: React.FC<ClaimVerificationReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySeal = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(receipt.sha256Seal);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "high_trust":
        return "text-emerald-400 bg-emerald-950/60 border-emerald-500/40";
      case "moderate_review_required":
        return "text-amber-400 bg-amber-950/60 border-amber-500/40";
      case "low_flagged":
        return "text-rose-400 bg-rose-950/60 border-rose-500/40";
      default:
        return "text-blue-400 bg-blue-950/60 border-blue-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 id="receipt-modal-title" className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Cryptographic Proof Receipt
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Immutable Plantation Evidence Seal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close receipt modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200 text-sm">
          {/* Top summary card */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Receipt ID</span>
              <p className="font-mono font-bold text-emerald-400 text-sm">{receipt.receiptId}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{new Date(receipt.verifiedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={"px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider " + getTierColor(receipt.trustTier)}>
                {receipt.trustTier.replace(/_/g, " ")}
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-zinc-800 text-emerald-300 font-bold border border-zinc-700 text-sm">
                {receipt.confidenceScore}% Score
              </div>
            </div>
          </div>

          {/* Key Plant & Planter Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tree & Planter Details</span>
              </div>
              <p className="font-semibold text-white">Tree: <span className="font-mono text-emerald-400">{receipt.treeId}</span></p>
              <p className="text-xs text-zinc-300 mt-0.5">Species: <span className="italic text-emerald-300">{receipt.species}</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">Planter: {receipt.planterId}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Geodetic Location</span>
              </div>
              <p className="font-mono text-xs text-zinc-200">
                Lat: {receipt.gpsLocation.latitude.toFixed(6)}
              </p>
              <p className="font-mono text-xs text-zinc-200">
                Lng: {receipt.gpsLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Verifier: <span className="font-mono text-zinc-300">{receipt.verifierId}</span></p>
            </div>
          </div>

          {/* Cryptographic SHA-256 Seal Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>SHA-256 Immutable Digital Seal</span>
              </div>
              <button
                onClick={handleCopySeal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-emerald-300 transition-colors border border-zinc-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Seal"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-black/70 border border-zinc-800 font-mono text-xs text-emerald-300 break-all select-all">
              {receipt.sha256Seal}
            </div>
          </div>

          {/* QR Verification Payload & Integrity Checks */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-lg bg-white p-2 flex items-center justify-center flex-shrink-0 shadow-md">
              <div className="w-full h-full border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-900 text-center">
                <QrCode className="w-10 h-10 text-zinc-900" />
                <span className="text-[9px] font-bold mt-0.5 tracking-tighter">VERIFIED</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Public Verification URL / Payload</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Scan to audit tamper-evident proof on the transparent plantation ledger or verify via the public registry.
              </p>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate">
                {receipt.qrPayload}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">HirwaSparsh • Trust Framework</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-950"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};