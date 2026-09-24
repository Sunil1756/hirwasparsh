/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 18
 * Tree ID Certificate Card Component
 * Displays the unique Green Enlightenment Tree Identifier (e.g. GE-2026-000001)
 */

import React from "react";
import { motion } from "framer-motion";
import {
  TreePine,
  ShieldCheck,
  QrCode,
  MapPin,
  Calendar,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tree } from "@/types/coreDatabase";
import { useToast } from "@/hooks/use-toast";

export interface TreeIdCertificateCardProps {
  treeCode: string; // e.g. GE-2026-000001
  tree: Partial<Tree>;
  qrToken?: string | null;
  photoUrl?: string | null;
  onClose?: () => void;
}

export const TreeIdCertificateCard: React.FC<TreeIdCertificateCardProps> = ({
  treeCode,
  tree,
  qrToken,
  photoUrl,
  onClose,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(treeCode);
    setCopied(true);
    toast({
      title: "Tree Code Copied!",
      description: `Identifier "${treeCode}" copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md w-full mx-auto"
    >
      <Card className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border-2 border-emerald-500/40 shadow-2xl overflow-hidden backdrop-blur-xl relative">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="text-center pb-4 pt-6 border-b border-slate-800/80">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950/50">
            <TreePine className="w-8 h-8" />
          </div>

          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mx-auto mb-2 text-xs font-semibold px-3 py-0.5 gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Official Green Enlightenment Tree Registry
          </Badge>

          <CardTitle className="text-2xl font-bold text-slate-100 tracking-tight">
            Tree Registration Certificate
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Cryptographically indexed onto the Supabase Data Spine
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* Main Tree Code Display Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border-2 border-emerald-500/30 text-center space-y-1.5 shadow-inner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              Unique Tree Identifier
            </span>
            <div className="text-3xl font-mono font-extrabold text-slate-100 tracking-wider flex items-center justify-center gap-2">
              <span>{treeCode}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
                className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Format: <span className="font-mono text-emerald-300">GE-YYYY-NNNNNN</span>
            </p>
          </div>

          {/* Photo & Biometric Summary */}
          <div className="grid grid-cols-3 gap-2.5">
            {photoUrl ? (
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                <img
                  src={photoUrl}
                  alt={tree.species || "Registered Tree"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 aspect-square flex items-center justify-center text-slate-600">
                <TreePine className="w-6 h-6" />
              </div>
            )}

            <div className="col-span-2 space-y-1.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Species</span>
                <p className="font-semibold text-slate-200 truncate">{tree.species || "Living Sapling"}</p>
                {tree.botanical_name && (
                  <p className="text-[11px] text-slate-400 italic truncate">{tree.botanical_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px]">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Plant Date</span>
                  <p className="font-mono text-slate-300">{tree.plantation_date || "Today"}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px]">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Points</span>
                  <p className="font-mono text-emerald-400 font-bold">+10 Eco-Pts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Geolocation Telemetry */}
          {tree.latitude !== undefined && tree.longitude !== undefined && (
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono">
                  {tree.latitude.toFixed(5)}°, {tree.longitude.toFixed(5)}°
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-300">
                WGS84 Locked
              </Badge>
            </div>
          )}

          {/* Registration 7-Step Pipeline Checkmarks */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Verification Pipeline Flow
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> User Auth
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Project Link
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> GPS Locked
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Photo Hash
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Tree Biometrics
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Tree Code Issued
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy ID
            </Button>
            {onClose && (
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
