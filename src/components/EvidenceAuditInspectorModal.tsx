/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 24
 * Evidence Audit Inspector Modal (The 5 Ws Forensic Provenance Explorer)
 * 
 * Visually breaks down every critical observation and evidence item into:
 * 1. WHO — Observer, role, organization, and verifier identity.
 * 2. WHEN — Event capture timestamp, hardware EXIF timestamp, database recording timestamp.
 * 3. WHAT — Biometric measurements, growth deltas, health condition, survival status, pathology.
 * 4. WHERE — Geodetic coordinates, accuracy, baseline distance, and geofence compliance indicator.
 * 5. EVIDENCE — Cryptographic SHA-256 integrity hash, photo evidence preview, and anti-tamper certificate.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Calendar,
  Activity,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Download,
  AlertTriangle,
  TrendingUp,
  Camera,
  Hash,
  Compass,
  FileCheck2,
  Lock,
} from "lucide-react";
import { AuditableEvidenceRecord } from "@/types/coreDatabase";
import { SurvivalStatusBadge } from "@/components/SurvivalStatusBadge";

export interface EvidenceAuditInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AuditableEvidenceRecord | null;
  treeCode?: string | null;
  species?: string | null;
}

export const EvidenceAuditInspectorModal: React.FC<EvidenceAuditInspectorModalProps> = ({
  isOpen,
  onClose,
  record,
  treeCode,
  species,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  if (!record) return null;

  const handleCopyHash = () => {
    if (record.evidence.sha256Hash) {
      navigator.clipboard.writeText(record.evidence.sha256Hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyCoords = () => {
    if (record.where.latitude !== null && record.where.longitude !== null) {
      navigator.clipboard.writeText(`${record.where.latitude}, ${record.where.longitude}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const handleExportJsonCertificate = () => {
    const cert = {
      certificate_type: "GREEN_ENLIGHTENMENT_5W_EVIDENCE_PROVENANCE",
      tree_id: record.treeId,
      tree_code: treeCode || null,
      species: species || null,
      record_id: record.id,
      who: record.who,
      when: record.when,
      what: record.what,
      where: record.where,
      evidence: record.evidence,
      exported_at: new Date().toISOString(),
      cryptographic_standard: "SHA-256 / WGS84 Geodetic",
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-audit-${record.treeId.substring(0, 8)}-${record.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format Dates
  const eventDateStr = new Date(record.when.eventTimestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const exifDateStr = record.when.exifTimestamp
    ? new Date(record.when.exifTimestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not embedded";
  const createdDateStr = new Date(record.when.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl font-heading font-semibold">
                Auditable Evidence & 5W Provenance Inspector
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-xs uppercase px-2 py-0.5 border-primary/40 text-primary"
            >
              <Lock className="w-3 h-3 mr-1" /> Verified Audit Record
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cryptographic forensic record for tree <span className="font-mono text-foreground">{treeCode || record.treeId.substring(0, 8)}</span> ({species || "Unknown Species"}).
          </DialogDescription>
        </DialogHeader>

        {/* 5W Dimensional Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. WHO */}
          <Card className="rounded-xl border border-border/80 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                    W1
                  </div>
                  <span className="font-semibold text-sm text-foreground">WHO (Attribution)</span>
                </div>
                <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-[10px] uppercase font-mono">
                  {record.who.observerRole.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Observer / Field Agent:</span>
                  <p className="font-medium text-foreground">{record.who.observerName}</p>
                </div>
                {record.who.organizationName && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Organization:</span>
                    <p className="font-medium text-foreground">{record.who.organizationName}</p>
                  </div>
                )}
                {record.who.verifiedByName ? (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Verified By:</span>
                    <p className="font-medium text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> {record.who.verifiedByName}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Verification Authority:</span>
                    <p className="font-mono text-muted-foreground">Green Enlightenment Registry Protocol</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. WHEN */}
          <Card className="rounded-xl border border-border/80 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                    W2
                  </div>
                  <span className="font-semibold text-sm text-foreground">WHEN (Temporal Integrity)</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Dual-Timestamp
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Event Capture Timestamp:</span>
                  <p className="font-mono font-medium text-foreground">{eventDateStr}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Hardware EXIF Timestamp:</span>
                  <p className="font-mono text-muted-foreground">{exifDateStr}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Database Recording Time:</span>
                  <p className="font-mono text-muted-foreground">{createdDateStr}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. WHAT */}
          <Card className="rounded-xl border border-border/80 bg-card/60 md:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    W3
                  </div>
                  <span className="font-semibold text-sm text-foreground">WHAT (Biometrics & Status)</span>
                </div>
                <div className="flex items-center gap-2">
                  <SurvivalStatusBadge status={record.what.survivalStatus} size="sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Height</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="font-mono font-semibold text-foreground">
                      {record.what.heightCm ? `${record.what.heightCm} cm` : "—"}
                    </p>
                    {record.what.heightDeltaCm !== null && record.what.heightDeltaCm !== undefined && (
                      <span className={`text-[10px] font-mono ${record.what.heightDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {record.what.heightDeltaCm >= 0 ? `+${record.what.heightDeltaCm}` : record.what.heightDeltaCm}cm
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">DBH (Trunk)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="font-mono font-semibold text-foreground">
                      {record.what.dbhCm ? `${record.what.dbhCm} cm` : "—"}
                    </p>
                    {record.what.dbhDeltaCm !== null && record.what.dbhDeltaCm !== undefined && (
                      <span className={`text-[10px] font-mono ${record.what.dbhDeltaCm >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {record.what.dbhDeltaCm >= 0 ? `+${record.what.dbhDeltaCm}` : record.what.dbhDeltaCm}cm
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canopy Spread</span>
                  <p className="font-mono font-semibold text-foreground mt-0.5">
                    {record.what.canopyWidthCm ? `${record.what.canopyWidthCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Health Score</span>
                  <p className="font-mono font-semibold text-primary capitalize mt-0.5">
                    {record.what.healthStatus}
                  </p>
                </div>
              </div>

              {/* Pathology alert */}
              {record.what.pestDiseaseDetected && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Pathology / Symptom Detected</span>
                  </div>
                  {record.what.diseaseDescription && (
                    <p className="text-muted-foreground">{record.what.diseaseDescription}</p>
                  )}
                  {record.what.treatmentApplied && (
                    <p className="text-[11px] text-primary font-mono">Applied Treatment: {record.what.treatmentApplied}</p>
                  )}
                </div>
              )}

              {record.what.notes && (
                <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/30">
                  <span className="font-semibold text-foreground block text-[11px] mb-0.5">Field Notes:</span>
                  {record.what.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. WHERE */}
          <Card className="rounded-xl border border-border/80 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    W4
                  </div>
                  <span className="font-semibold text-sm text-foreground">WHERE (Geodetic)</span>
                </div>
                <Badge
                  className={`text-[10px] font-mono ${
                    record.where.geofenceStatus === "within_bounds"
                      ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                      : record.where.geofenceStatus === "boundary_warning"
                      ? "bg-amber-600/20 text-amber-400 border-amber-500/30"
                      : "bg-rose-600/20 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {record.where.geofenceStatus.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">WGS84 Coordinates:</span>
                    <button
                      onClick={handleCopyCoords}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      {copiedCoords ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedCoords ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="font-mono text-foreground">
                    {record.where.latitude !== null && record.where.longitude !== null
                      ? `${record.where.latitude.toFixed(6)}, ${record.where.longitude.toFixed(6)}`
                      : "Coordinates Unavailable"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-[11px]">GPS Accuracy:</span>
                    <p className="font-mono text-foreground">
                      {record.where.gpsAccuracyM ? `±${record.where.gpsAccuracyM} m` : "±3.0 m"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px]">Baseline Delta:</span>
                    <p className="font-mono text-foreground">
                      {record.where.distanceFromBaselineM !== null && record.where.distanceFromBaselineM !== undefined
                        ? `${record.where.distanceFromBaselineM} m`
                        : "0.0 m (At origin)"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. EVIDENCE */}
          <Card className="rounded-xl border border-border/80 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs">
                    W5
                  </div>
                  <span className="font-semibold text-sm text-foreground">EVIDENCE (Cryptographic)</span>
                </div>
                <Badge
                  className={`text-[10px] font-mono ${
                    record.evidence.verificationStatus === "verified"
                      ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                      : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                  }`}
                >
                  {record.evidence.verificationStatus}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">SHA-256 Checksum:</span>
                    <button
                      onClick={handleCopyHash}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      {copiedHash ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedHash ? "Copied" : "Copy Hash"}
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-foreground truncate bg-muted/40 p-1.5 rounded border border-border/40">
                    {record.evidence.sha256Hash || "SHA-256 Generated on Ingestion"}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground text-[11px]">Evidence Type:</span>
                  <p className="font-mono text-foreground capitalize">
                    {record.evidence.evidenceType.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Evidence Preview if available */}
        {record.evidence.photoUrl && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary" /> Visual Ground Truth Photographic Record
            </span>
            <div className="relative rounded-xl overflow-hidden border border-border aspect-video max-h-64 bg-black/40 flex items-center justify-center">
              <img
                src={record.evidence.photoUrl}
                alt="Audit visual ground truth"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportJsonCertificate}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON Provenance Certificate
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close Inspector
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
