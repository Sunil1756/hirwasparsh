import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet, QrCode, Building2, TreePine, ArrowLeft,
  Sparkles, CheckCircle2, ShieldCheck, Printer
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BulkTreeOnboarder } from "@/components/BulkTreeOnboarder";
import { PrintableBatchQRExporter } from "@/components/PrintableBatchQRExporter";

export default function BulkOnboardPage() {
  const [activeTab, setActiveTab] = useState<"bulk_csv" | "print_qr">("bulk_csv");
  const [recentImportedIds, setRecentImportedIds] = useState<string[]>([]);

  const handleImportSuccess = (insertedIds: string[]) => {
    setRecentImportedIds(insertedIds);
    // Switch to QR generation tab automatically
    setActiveTab("print_qr");
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-heading text-3xl sm:text-4xl font-bold">
                  Module C: Enterprise Bulk Onboard & Batch QR Tags
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Mass tree onboarding from CSV / Excel spreadsheets and instant printable field QR tag sheets for CSR & government drives.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/plant">
              <Button variant="outline" className="rounded-xl gap-2 text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4" /> Back to Planting
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Option Segmented Control */}
        <div className="flex items-center justify-center sm:justify-start gap-2 p-1.5 rounded-2xl bg-muted/70 border border-primary/20 w-fit">
          <button
            onClick={() => setActiveTab("bulk_csv")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "bulk_csv"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            1. Bulk CSV / Excel Upload
          </button>

          <button
            onClick={() => setActiveTab("print_qr")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "print_qr"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            <QrCode className="h-4 w-4" />
            2. Printable Batch QR Passport Sheets
          </button>
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "bulk_csv" ? (
            <BulkTreeOnboarder onSuccess={handleImportSuccess} />
          ) : (
            <PrintableBatchQRExporter initialTreeIds={recentImportedIds} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
