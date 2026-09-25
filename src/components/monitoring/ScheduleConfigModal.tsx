import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Layers,
  Satellite,
  UserCheck,
  Plane,
  CloudRain,
  TreePine,
  ShieldCheck,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  MonitoringSchedule,
  CadenceType,
  monitoringScheduleService,
} from "../../services/monitoringScheduleService";

interface ScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleToEdit?: MonitoringSchedule | null;
  onSaved?: (schedule: MonitoringSchedule) => void;
}

export const ScheduleConfigModal: React.FC<ScheduleConfigModalProps> = ({
  isOpen,
  onClose,
  scheduleToEdit,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("proj-sahayadri");
  const [projectName, setProjectName] = useState("Sahayadri Tiger Reserve Afforestation");
  const [cadenceType, setCadenceType] = useState<CadenceType>("satellite_sentinel2");
  const [intervalDays, setIntervalDays] = useState(5);
  const [cronExpression, setCronExpression] = useState("0 6 */5 * *");
  const [targetQuota, setTargetQuota] = useState(30);
  const [assignedTeam, setAssignedTeam] = useState("Field Operations Team");
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [notificationChannels, setNotificationChannels] = useState<string[]>(["in_app", "email"]);

  useEffect(() => {
    if (scheduleToEdit) {
      setName(scheduleToEdit.name);
      setDescription(scheduleToEdit.description);
      setProjectId(scheduleToEdit.projectId);
      setProjectName(scheduleToEdit.projectName);
      setCadenceType(scheduleToEdit.cadenceType);
      setIntervalDays(scheduleToEdit.recurrence.intervalDays || 5);
      setCronExpression(scheduleToEdit.recurrence.cronExpression || "0 6 */5 * *");
      setTargetQuota(scheduleToEdit.targetQuota || 30);
      setAssignedTeam(scheduleToEdit.assignedTeam || "Field Operations Team");
      setGracePeriodDays(scheduleToEdit.gracePeriodDays || 3);
      setNotificationChannels(scheduleToEdit.notificationChannels || ["in_app"]);
    } else {
      setName("Sentinel-2 Multi-Spectral Orbital Sweep");
      setDescription("Automated Copernicus 5-day cycle pulling 10m L2A NDVI, NDRE, and NDWI tiles.");
      setProjectId("proj-sahayadri");
      setProjectName("Sahayadri Tiger Reserve Afforestation");
      setCadenceType("satellite_sentinel2");
      setIntervalDays(5);
      setCronExpression("0 6 */5 * *");
      setTargetQuota(1420);
      setAssignedTeam("Automated Satellite Daemon");
      setGracePeriodDays(3);
      setNotificationChannels(["in_app", "email"]);
    }
  }, [scheduleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleCadenceChange = (type: CadenceType) => {
    setCadenceType(type);
    switch (type) {
      case "satellite_sentinel2":
        setIntervalDays(5);
        setCronExpression("0 6 */5 * *");
        setName("Sentinel-2 Multi-Spectral Orbital Sweep");
        setDescription("Automated Copernicus 5-day cycle pulling 10m L2A NDVI, NDRE, and NDWI tiles.");
        setTargetQuota(1420);
        setAssignedTeam("Automated Satellite Daemon");
        break;
      case "ground_sample_psp":
        setIntervalDays(30);
        setCronExpression("0 0 1 * *");
        setName("Stratified Sample Quadrat (PSP) Ground Audit");
        setDescription("Cochran's Stratified Random Sampling quota dispatch for field rangers.");
        setTargetQuota(45);
        setAssignedTeam("Sahayadri Ranger Squad Alpha");
        break;
      case "drone_lidar_ortho":
        setIntervalDays(90);
        setCronExpression("0 0 1 */3 *");
        setName("UAV Drone LiDAR & Canopy Orthomosaic Survey");
        setDescription("High-resolution aerial photogrammetry sweep measuring volumetric crown expansion.");
        setTargetQuota(80);
        setAssignedTeam("Aeronav UAV Survey Unit");
        break;
      case "weather_deficit_telemetry":
        setIntervalDays(1);
        setCronExpression("0 4 * * *");
        setName("Microclimate & Precipitation Deficit Ingestion");
        setDescription("Daily ERA5 / IMD weather grid aggregation tracking cumulative dry spell indices.");
        setTargetQuota(1);
        setAssignedTeam("Automated Weather Telemetry Engine");
        break;
      case "carbon_biomass_allometry":
        setIntervalDays(365);
        setCronExpression("0 0 1 1 *");
        setName("IPCC Tier-2 Carbon Accrual & Allometry Reconciliation");
        setDescription("Annual Chave pantropical allometric carbon accrual estimation.");
        setTargetQuota(12500);
        setAssignedTeam("Chief Carbon Modeler");
        break;
    }
  };

  const toggleChannel = (channel: string) => {
    setNotificationChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (scheduleToEdit) {
      const updated = monitoringScheduleService.updateSchedule(scheduleToEdit.id, {
        name,
        description,
        projectId,
        projectName,
        cadenceType,
        recurrence: { intervalDays, cronExpression },
        targetQuota,
        assignedTeam,
        gracePeriodDays,
        notificationChannels,
      });
      if (onSaved) onSaved(updated);
    } else {
      const created = monitoringScheduleService.createSchedule({
        name,
        description,
        projectId,
        projectName,
        cadenceType,
        recurrence: { intervalDays, cronExpression },
        targetQuota,
        assignedTeam,
        gracePeriodDays,
        notificationChannels,
      });
      if (onSaved) onSaved(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {scheduleToEdit ? "Edit Monitoring Schedule" : "Create Recurring Monitoring Schedule"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure automated recurrence cadence, quota, team, and notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Cadence Type Picker */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Cadence Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleCadenceChange("satellite_sentinel2")}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  cadenceType === "satellite_sentinel2"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Satellite className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">Sentinel-2 Satellite</span>
                <span className="text-[10px] text-zinc-500">5-day Copernicus sweep</span>
              </button>

              <button
                type="button"
                onClick={() => handleCadenceChange("ground_sample_psp")}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  cadenceType === "ground_sample_psp"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold">Ground Truth PSP</span>
                <span className="text-[10px] text-zinc-500">Cochran's quadrat quota</span>
              </button>

              <button
                type="button"
                onClick={() => handleCadenceChange("drone_lidar_ortho")}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  cadenceType === "drone_lidar_ortho"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Plane className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold">Drone LiDAR / Ortho</span>
                <span className="text-[10px] text-zinc-500">Seasonal canopy sweep</span>
              </button>

              <button
                type="button"
                onClick={() => handleCadenceChange("weather_deficit_telemetry")}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  cadenceType === "weather_deficit_telemetry"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <CloudRain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold">Weather Telemetry</span>
                <span className="text-[10px] text-zinc-500">Daily rainfall & deficit</span>
              </button>

              <button
                type="button"
                onClick={() => handleCadenceChange("carbon_biomass_allometry")}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all col-span-2 sm:col-span-2 ${
                  cadenceType === "carbon_biomass_allometry"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <TreePine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">Carbon Biomass Allometry</span>
                <span className="text-[10px] text-zinc-500">Annual IPCC Tier-2 Chave model reconciliation</span>
              </button>
            </div>
          </div>

          {/* Name & Target Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Schedule Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly Ground Truth PSP Audit"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Target Project
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setProjectName(e.target.options[e.target.selectedIndex].text);
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="proj-sahayadri">Sahayadri Tiger Reserve Afforestation</option>
                <option value="proj-konkan">Konkan Coastal Mangrove Restoration</option>
                <option value="proj-marathwada">Marathwada Agroforestry Corridor</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Description / MRV Methodology
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe sampling criteria or orbital parameters..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Recurrence & Quota Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Interval (Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Target Quota (Units)
              </label>
              <input
                type="number"
                min={1}
                value={targetQuota}
                onChange={(e) => setTargetQuota(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>
          </div>

          {/* Assigned Team & Notification Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Assigned Team / Unit
              </label>
              <input
                type="text"
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value)}
                placeholder="e.g. Ranger Squad Delta"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Alert Channels
              </label>
              <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                {["in_app", "email", "sms", "webhook"].map((ch) => {
                  const active = notificationChannels.includes(ch);
                  return (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                        active
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {active ? "✓ " : ""}{ch.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm"
            >
              {scheduleToEdit ? "Save Changes" : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
