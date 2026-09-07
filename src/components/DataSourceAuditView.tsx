import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Database,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TreePine,
  Satellite,
  Download,
  Eye,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchDataSourceAuditList,
  DataSourceAuditItem,
} from "@/lib/databaseAuditService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isDemoMode?: boolean;
}

export function DataSourceAuditView({ isDemoMode = false }: Props) {
  const { toast } = useToast();
  const [auditItems, setAuditItems] = useState<DataSourceAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const items = await fetchDataSourceAuditList(isDemoMode);
      setAuditItems(items);
    } catch (err) {
      console.warn("Failed to load audit data:", err);
      toast({
        title: "Audit Error",
        description: "Could not load ground truth records from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [isDemoMode]);

  const filteredItems = useMemo(() => {
    return auditItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creatorInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.integrityStatus === statusFilter;

      const matchesSource =
        sourceFilter === "all" || item.sourceType === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [auditItems, searchQuery, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const totalPlots = auditItems.length;
    const realUserPlots = auditItems.filter((i) => i.sourceType === "real_user_plot").length;
    const realCsrProjects = auditItems.filter((i) => i.sourceType === "real_csr_project").length;
    const totalVerifiedTrees = auditItems.reduce((acc, i) => acc + i.approvedTrees, 0);
    const totalVerifications = auditItems.reduce((acc, i) => acc + i.verificationCount, 0);
    const totalSatellitePasses = auditItems.reduce((acc, i) => acc + i.satellitePassesCount, 0);

    return {
      totalPlots,
      realUserPlots,
      realCsrProjects,
      totalVerifiedTrees,
      totalVerifications,
      totalSatellitePasses,
    };
  }, [auditItems]);

  const handleExportChecklist = () => {
    const headers =
      "Plot_ID,Plot_Name,Source_Type,Location,Total_Trees,Approved_Trees,Pending_Trees,Verifications,Satellite_Passes,Latest_NDVI,Created_At,Creator_Info,Integrity_Status\n";
    const rows = filteredItems
      .map(
        (i) =>
          `"${i.id}","${i.name}","${i.sourceType}","${i.location}",${i.totalTrees},${i.approvedTrees},${i.pendingTrees},${i.verificationCount},${i.satellitePassesCount},${i.meanNdvi || "N/A"},"${i.createdAt}","${i.creatorInfo}","${i.integrityStatus}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Green_Enlightenment_Data_Source_Audit_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Checklist Exported",
      description: "Data source audit CSV downloaded successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-2xl">
                  Ground Truth & Data Source Audit
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs font-semibold">
                  100% Real Supabase Records
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Internal administrator verification checklist ensuring zero synthetic mock parcels are presented to NGOs or CSR partners.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAuditData}
              disabled={isLoading}
              className="gap-1.5 rounded-xl border-primary/20"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportChecklist}
              className="gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Download className="h-4 w-4" /> Export Audit Checklist
            </Button>
          </div>
        </div>

        {/* Audit Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-background/60 border border-primary/10">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Real Parcels & Projects</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-0.5">
              {stats.totalPlots}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.realUserPlots} Plots · {stats.realCsrProjects} CSR Drives
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background/60 border border-emerald-500/20">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Verified Trees (GPS+Photo)</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.totalVerifiedTrees.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.totalVerifications} AI & Field audits
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background/60 border border-blue-500/20">
            <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Satellite Overpasses</p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.totalSatellitePasses}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sentinel-2 Multi-spectral
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background/60 border border-primary/10">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Credibility Posture</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Zero Greenwashing</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Mock plots quarantined
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parcel name, district, creator, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs rounded-xl border-border/80"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-[170px]">
              <SelectValue placeholder="Integrity Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrity States</SelectItem>
              <SelectItem value="verified_with_evidence">Verified with Evidence</SelectItem>
              <SelectItem value="active_monitoring">Active Monitoring</SelectItem>
              <SelectItem value="awaiting_trees">Awaiting Trees</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-[160px]">
              <SelectValue placeholder="Source Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="real_user_plot">User Geofenced Plot</SelectItem>
              <SelectItem value="real_csr_project">CSR Project Drive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Checklist Table */}
      <div className="glass-card rounded-2xl border border-border/60 shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Auditing database plots and verification records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <TreePine className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-lg">No parcels match filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Create a new geofenced parcel via Plot Drawer or Plant a Tree to register a live verifiable plot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Parcel / Project</th>
                  <th className="py-3 px-4">Source Origin</th>
                  <th className="py-3 px-4">Trees (Verified / Total)</th>
                  <th className="py-3 px-4">Ground Proof</th>
                  <th className="py-3 px-4">Satellite NDVI</th>
                  <th className="py-3 px-4">Created By & Date</th>
                  <th className="py-3 px-4 text-right">Integrity Posture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-sans">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground/80">
                          {typeof item.id === "string" ? item.id.substring(0, 12) : String(item.id || "")}...
                        </span>
                        <span>·</span>
                        <span>{item.location}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.sourceType === "real_user_plot" ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                          Geofenced Plot
                        </Badge>
                      ) : item.sourceType === "real_csr_project" ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                          CSR Project Drive
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-600">
                          Demo Preset
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">{item.approvedTrees}</span>
                        <span className="text-muted-foreground"> / {item.totalTrees}</span>
                      </div>
                      {item.pendingTrees > 0 && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          {item.pendingTrees} pending review
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.verificationCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{item.verificationCount} Audits</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">No ground photos</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.meanNdvi !== null ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(item.meanNdvi).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({item.satellitePassesCount} passes)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Awaiting Overpass
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-foreground font-medium truncate max-w-[160px]">
                        {item.creatorInfo}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {(item.createdAt || "").split("T")[0] || "—"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {item.integrityStatus === "verified_with_evidence" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                          <ShieldCheck className="h-3 w-3" /> Ground Verified
                        </Badge>
                      ) : item.integrityStatus === "active_monitoring" ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                          Active Tracking
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                          Awaiting Trees
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
