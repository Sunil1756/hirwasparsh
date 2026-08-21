import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import {
  Printer, QrCode, Download, Eye, Sparkles, TreePine, MapPin,
  ShieldCheck, Loader2, CheckCircle2, SlidersHorizontal, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PrintableBatchQRExporterProps {
  initialTreeIds?: string[];
}

export function PrintableBatchQRExporter({ initialTreeIds }: PrintableBatchQRExporterProps) {
  const [trees, setTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [gridCols, setGridCols] = useState<number>(3); // 2, 3, or 4 per row
  const [tagsPerPage, setTagsPerPage] = useState<number>(12);
  const [tagDesign, setTagDesign] = useState<"standard" | "compact" | "field_laminated">("standard");
  const [projectName, setProjectName] = useState<string>("Maharashtra Green Mission 2026");

  useEffect(() => {
    fetchTreesToPrint();
  }, [initialTreeIds]);

  const fetchTreesToPrint = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("trees")
        .select("id, tree_name, species, location, latitude, longitude, plantation_date, verification_status, height_cm")
        .order("created_at", { ascending: false })
        .limit(tagsPerPage);

      if (initialTreeIds && initialTreeIds.length > 0) {
        query = supabase
          .from("trees")
          .select("id, tree_name, species, location, latitude, longitude, plantation_date, verification_status, height_cm")
          .in("id", initialTreeIds.slice(0, tagsPerPage));
      }

      const { data, error } = await query;
      if (error) throw error;
      setTrees(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load trees for QR generation");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPassportUrl = (id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://greenenlightenment.vercel.app";
    return `${origin}/tree/${id}`;
  };

  return (
    <div className="space-y-6">
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr-sheet, #printable-qr-sheet * {
            visibility: visible;
          }
          #printable-qr-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
            color: black !important;
          }
          nav, footer, .no-print {
            display: none !important;
          }
          .tag-card {
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1.5px dashed #4b5563 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden when printing) */}
      <div className="no-print glass-card rounded-2xl p-6 border border-primary/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              Batch Tree Passport QR Tag Generator & Sheet Printer
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Produce standard A4 printable sheets of water-resistant field tags with scannable QR codes for CSR & government drives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={trees.length === 0}
              className="rounded-xl gap-2 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="h-4 w-4" /> Print QR Sheet (A4 / PDF)
            </Button>
          </div>
        </div>

        {/* Customization Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-primary/10">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Tags Per Sheet</label>
            <Select value={String(tagsPerPage)} onValueChange={(v) => setTagsPerPage(Number(v))}>
              <SelectTrigger className="rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6" className="text-xs">6 Tags (2x3 Large)</SelectItem>
                <SelectItem value="8" className="text-xs">8 Tags (2x4 Standard)</SelectItem>
                <SelectItem value="12" className="text-xs">12 Tags (3x4 Compact)</SelectItem>
                <SelectItem value="15" className="text-xs">15 Tags (3x5 Dense)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Tag Layout Style</label>
            <Select value={tagDesign} onValueChange={(v: any) => setTagDesign(v)}>
              <SelectTrigger className="rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard" className="text-xs">Standard Field Tag</SelectItem>
                <SelectItem value="field_laminated" className="text-xs">Laminated Stake Tag</SelectItem>
                <SelectItem value="compact" className="text-xs">Mini Sticker (Avery)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Project Header</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs"
              placeholder="Project / Drive Name"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTreesToPrint}
              className="w-full rounded-xl text-xs gap-1.5 border-primary/30"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Tree List
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center glass-card rounded-2xl">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Generating high-contrast vector QR codes...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && trees.length === 0 && (
        <div className="p-12 text-center glass-card rounded-2xl border border-primary/20">
          <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h4 className="font-heading font-semibold text-lg">No Trees Found to Print</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Upload a batch of trees using the Bulk CSV Uploader above, or plant trees to generate scannable passport tags.
          </p>
        </div>
      )}

      {/* Printable Sheet Canvas */}
      {!loading && trees.length > 0 && (
        <div className="space-y-3">
          <div className="no-print flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>Showing {trees.length} scannable tags ready for print preview</span>
            <span className="font-mono">Sheet Size: Standard ISO A4 (210mm × 297mm)</span>
          </div>

          <div
            id="printable-qr-sheet"
            className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-xl"
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  🌿 Green Enlightenment · Digital Tree Passport
                </div>
                <div className="text-xs text-slate-600 font-medium">{projectName}</div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>Field Tag Batch Sheet</div>
                <div>Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Tags Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4`}>
              {trees.map((t, index) => (
                <div
                  key={t.id}
                  className="tag-card border-2 border-dashed border-slate-400 rounded-xl p-3 bg-white flex flex-col justify-between relative"
                >
                  {/* Punch hole indicator */}
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                    ○
                  </div>

                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                      <TreePine className="h-3 w-3 inline" /> GE-PASSPORT #{index + 1}
                    </div>

                    <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                      {t.tree_name || `Tree #${index + 1}`}
                    </div>
                    <div className="text-[11px] text-slate-700 italic font-serif truncate">
                      {t.species}
                    </div>
                  </div>

                  {/* QR Code & Coordinates */}
                  <div className="my-2.5 flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="bg-white p-1 rounded border border-slate-300 shrink-0">
                      <QRCodeSVG
                        value={getPassportUrl(t.id)}
                        size={64}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-[10px] space-y-0.5 leading-tight text-slate-600 min-w-0">
                      <div className="font-semibold text-slate-800">Scan to Verify</div>
                      <div>📅 {new Date(t.plantation_date || Date.now()).toLocaleDateString()}</div>
                      {t.latitude && t.longitude && (
                        <div className="font-mono text-[9px] truncate">
                          📍 {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                        </div>
                      )}
                      <div className="text-[9px] text-emerald-700 font-medium">✓ AI Tamper-Evident</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-1.5">
                    <span className="font-mono truncate">ID: {t.id.slice(0, 8)}</span>
                    <span className="text-emerald-700 font-semibold">hirwasparsh.org</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sheet Footer */}
            <div className="border-t border-slate-300 mt-6 pt-3 text-[10px] text-slate-500 flex justify-between">
              <span>Tie with jute twine through punch hole onto main tree branch (minimum 40cm above root collar).</span>
              <span>Green Enlightenment Tree Bank</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
