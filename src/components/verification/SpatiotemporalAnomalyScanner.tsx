import React, { useState, useEffect, useMemo } from "react";
import {
  Navigation,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Gauge,
  Sun,
  Moon,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  spatiotemporalConsistencyService,
  SpatiotemporalAuditReport,
  SpatiotemporalRiskLevel,
} from "../../services/spatiotemporalConsistencyService";
import { SpatiotemporalConsistencyModal } from "./SpatiotemporalConsistencyModal";

export const SpatiotemporalAnomalyScanner: React.FC = () => {
  const [reports, setReports] = useState<SpatiotemporalAuditReport[]>(() =>
    spatiotemporalConsistencyService.getAuditReports()
  );
  const [selectedReport, setSelectedReport] = useState<SpatiotemporalAuditReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);

  const runSweep = () => {
    setIsScanning(true);
    setTimeout(() => {
      spatiotemporalConsistencyService.rebuildAllAuditReports();
      setReports(spatiotemporalConsistencyService.getAuditReports());
      setIsScanning(false);
    }, 400);
  };

  useEffect(() => {
    const unsubscribe = spatiotemporalConsistencyService.subscribe(() => {
      setReports(spatiotemporalConsistencyService.getAuditReports());
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const total = reports.length;
    const critical = reports.filter((r) => r.riskLevel === "critical_spoofing").length;
    const teleportation = reports.filter(
      (r) => r.kinematics.status === "impossible_teleportation" || r.kinematics.status === "high_speed_warning"
    ).length;
    const solarAnomalies = reports.filter(
      (r) => r.solarEphemeris.lightingStatus === "astronomical_night"
    ).length;
    const geofenceBreaches = reports.filter(
      (r) => r.geofence.status === "geofence_breach"
    ).length;
    const avgScore = total > 0 ? Math.round(reports.reduce((acc, r) => acc + r.overallScore, 0) / total) : 100;
    return { total, critical, teleportation, solarAnomalies, geofenceBreaches, avgScore };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (categoryFilter === "teleportation" && rep.kinematics.status !== "impossible_teleportation" && rep.kinematics.status !== "high_speed_warning") {
        return false;
      }
      if (categoryFilter === "solar" && rep.solarEphemeris.lightingStatus !== "astronomical_night") {
        return false;
      }
      if (categoryFilter === "geofence" && rep.geofence.status !== "geofence_breach") {
        return false;
      }
      if (categoryFilter === "critical" && rep.riskLevel !== "critical_spoofing") {
        return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTree = rep.treeId.toLowerCase().includes(q);
        const matchPlanter = rep.planterName.toLowerCase().includes(q) || rep.planterId.toLowerCase().includes(q);
        const matchViolation = rep.activeViolations.some((v) => v.toLowerCase().includes(q));
        if (!matchTree && !matchPlanter && !matchViolation) return false;
      }
      return true;
    });
  }, [reports, categoryFilter, searchQuery]);

  const getRiskBadge = (risk: SpatiotemporalRiskLevel) => {
    switch (risk) {
      case "critical_spoofing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Critical Spoofing
          </span>
        );
      case "anomalous_flagged":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Anomalous
          </span>
        );
      case "minor_warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            Minor Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Consistent
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 animate-fade-in" data-testid="spatiotemporal-anomaly-scanner">
      {/* Top Banner & Audit Trigger */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Navigation className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Spatiotemporal & Kinematic Anomaly Scanner
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                Task 42
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Planter trajectory kinematics, astronomical solar day/night ephemeris, and geofence verification.
            </p>
          </div>
        </div>

        <button
          onClick={runSweep}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950 transition-all disabled:opacity-50"
        >
          <RefreshCw className={"w-4 h-4 " + (isScanning ? "animate-spin" : "")} />
          <span>{isScanning ? "Evaluating Kinematics..." : "Run Spatiotemporal Audit Sweep"}</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Trajectories</span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/30 bg-rose-950/10">
          <span className="text-[10px] uppercase font-bold text-rose-400">Teleportation Speed</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.teleportation}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/30 bg-blue-950/10">
          <span className="text-[10px] uppercase font-bold text-blue-400">Solar Night Anomalies</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.solarAnomalies}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 bg-amber-950/10">
          <span className="text-[10px] uppercase font-bold text-amber-400">Geofence Breaches</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.geofenceBreaches}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Average Trust Score</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.avgScore}%</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tree ID, planter name, violation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Audits" },
            { id: "teleportation", label: "Teleportation Speed" },
            { id: "solar", label: "Solar Night Mismatch" },
            { id: "geofence", label: "Geofence Breach" },
            { id: "critical", label: "Critical Spoofing" },
          ].map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={"px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors " + (
                  isActive
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trajectory Reports Grid */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-zinc-300">No spatiotemporal anomalies found matching your criteria.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getRiskBadge(report.riskLevel)}
                  <span className="text-xs font-mono font-bold text-white">
                    {report.treeId}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    by <strong className="text-zinc-200">{report.planterName}</strong> ({report.planterId})
                  </span>
                </div>

                {report.activeViolations.length > 0 ? (
                  <div className="space-y-1">
                    {report.activeViolations.map((v, i) => (
                      <p key={i} className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" /> {v}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400/90">
                    Physical kinematics, solar ephemeris, and geofence boundaries verified consistent.
                  </p>
                )}

                <div className="flex items-center gap-4 text-[11px] text-zinc-400 flex-wrap">
                  <span>
                    Kinematics: <strong className="text-amber-400 font-mono">{report.kinematics.speedKmh} km/h</strong>
                  </span>
                  <span>
                    Solar: <strong className="text-blue-300">{report.solarEphemeris.lightingStatus.replace(/_/g, " ")} ({report.solarEphemeris.solarZenithAngleDeg}°)</strong>
                  </span>
                  <span>
                    Geofence: <strong className="text-zinc-200">{report.geofence.status.replace(/_/g, " ")}</strong>
                  </span>
                  <span>
                    Score: <strong className="text-white font-mono">{report.overallScore}%</strong>
                  </span>
                </div>
              </div>

              {/* Right Action Button */}
              <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-end">
                <button
                  onClick={() => setSelectedReport(report)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Spatiotemporal Forensics</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Spatiotemporal Consistency Inspector Modal */}
      {selectedReport && (
        <SpatiotemporalConsistencyModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onResolved={(updated) => {
            setReports((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};
