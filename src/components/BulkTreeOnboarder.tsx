import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Loader2,
  TreePine, MapPin, Database, Sparkles, RefreshCw, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TreeBulkRow,
  downloadSampleCsvTemplate,
  parseBulkFile,
  commitBulkTreesToSupabase,
} from "@/lib/bulkOnboardingService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BulkTreeOnboarderProps {
  onSuccess?: (insertedIds: string[]) => void;
}

export function BulkTreeOnboarder({ onSuccess }: BulkTreeOnboarderProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<TreeBulkRow[]>([]);
  const [parsing, setParsing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);

  const validRows = rows.filter((r) => r.isValid !== false);
  const invalidRows = rows.filter((r) => r.isValid === false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setCompleted(false);

    try {
      const parsed = await parseBulkFile(file);
      setRows(parsed);
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error reading file: ${err.message || "Invalid file format"}`);
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to import!");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const { successCount, failedCount, insertedIds } = await commitBulkTreesToSupabase(
        rows,
        user?.id,
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
        }
      );

      setImportedCount(successCount);
      setCompleted(true);

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} trees into the database!`);
        if (onSuccess) {
          onSuccess(insertedIds);
        }
      }
      if (failedCount > 0) {
        toast.error(`Failed to insert ${failedCount} rows.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Batch import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setRows([]);
    setFileName("");
    setCompleted(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Mass Plantation Bulk CSV / Excel Importer
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload spreadsheets containing hundreds of tree coordinates, species, and planter records in one step.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={downloadSampleCsvTemplate}
            className="rounded-xl gap-2 border-primary/30 text-xs sm:text-sm"
          >
            <Download className="h-4 w-4 text-primary" /> Download Sample CSV Template
          </Button>
        </div>

        {/* Drag & Drop Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary mb-3">
            <Upload className="h-7 w-7" />
          </div>
          <div className="font-heading font-semibold text-base">
            {fileName ? fileName : "Click to select or drag & drop CSV / Excel spreadsheet"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .CSV, .XLSX, .XLS (Up to 5,000 trees per batch)
          </p>
        </div>
      </div>

      {/* Parsing indicator */}
      {parsing && (
        <div className="p-8 text-center glass-card rounded-2xl">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Parsing and validating spreadsheet data...</p>
        </div>
      )}

      {/* Preview Table & Validation Summary */}
      {rows.length > 0 && !parsing && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card rounded-2xl p-4 text-center border border-primary/15">
              <div className="text-xs text-muted-foreground">Total Rows</div>
              <div className="font-heading text-2xl font-bold text-foreground mt-1">{rows.length}</div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-emerald-500/20">
              <div className="text-xs text-muted-foreground">Valid Ready Rows</div>
              <div className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {validRows.length}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-rose-500/20">
              <div className="text-xs text-muted-foreground">Issues Found</div>
              <div className="font-heading text-2xl font-bold text-rose-500 mt-1">
                {invalidRows.length}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center border border-primary/15">
              <div className="text-xs text-muted-foreground">Est. 1-Year CO₂</div>
              <div className="font-heading text-2xl font-bold text-primary mt-1">
                {((validRows.length * 22) / 1000).toFixed(2)} MT
              </div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="glass-card rounded-2xl overflow-hidden border border-primary/20">
            <div className="p-4 border-b border-primary/15 flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Parsed Tree Preview (First 15 Rows)
              </div>
              <Badge variant="outline" className="text-xs">
                {validRows.length} Valid / {rows.length} Total
              </Badge>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tree Name</th>
                    <th className="p-3">Species</th>
                    <th className="p-3">Latitude, Longitude</th>
                    <th className="p-3">Height / DBH</th>
                    <th className="p-3">Planter / Project</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.slice(0, 15).map((r, i) => (
                    <tr key={i} className={r.isValid === false ? "bg-rose-500/5" : ""}>
                      <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="p-3">
                        {r.isValid !== false ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-none text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> {r.errors?.[0] || "Invalid"}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-medium text-foreground">{r.tree_name}</td>
                      <td className="p-3 text-muted-foreground">{r.species}</td>
                      <td className="p-3 font-mono text-[11px]">
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </td>
                      <td className="p-3">{r.height_cm}cm / {r.dbh_cm}cm</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[150px]">
                        {r.planted_by} ({r.project_name})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commit Progress Bar */}
            {importing && (
              <div className="p-4 bg-primary/10 border-t border-primary/20 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-primary">
                  <span>Importing into Supabase database...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 bg-muted/30 border-t border-primary/15 flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={handleReset} className="rounded-xl text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Clear & Upload Another
              </Button>

              <div className="flex items-center gap-2">
                {completed ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 text-xs px-3 py-1.5 border-emerald-500/30 gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> {importedCount} Trees Successfully Live in Database!
                  </Badge>
                ) : (
                  <Button
                    onClick={handleCommit}
                    disabled={importing || validRows.length === 0}
                    className="rounded-xl gap-2 text-xs sm:text-sm font-semibold shadow-md"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Importing Batch ({progress}%)...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" /> Commit {validRows.length} Trees to Supabase
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
