import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Activity,
  TreePine,
  Droplets,
  MapPin,
  Check,
} from "lucide-react";
import {
  monitoringAlertService,
  AlertRule,
  AlertType,
  AlertSeverity,
} from "../../services/monitoringAlertService";

interface AlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleToEdit?: AlertRule | null;
  onSaved?: (rule: AlertRule) => void;
}

export const AlertRuleModal: React.FC<AlertRuleModalProps> = ({
  isOpen,
  onClose,
  ruleToEdit,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("canopy_degradation");
  const [severity, setSeverity] = useState<AlertSeverity>("critical");
  const [metricKey, setMetricKey] = useState("delta_ndvi");
  const [operator, setOperator] = useState<"<" | ">" | "<=" | ">=" | "==">("<=");
  const [thresholdValue, setThresholdValue] = useState(-0.15);
  const [unit, setUnit] = useState("NDVI index");
  const [projectId, setProjectId] = useState("proj-sahayadri");
  const [projectName, setProjectName] = useState("Sahayadri Tiger Reserve Afforestation");
  const [autoCreateWorkOrder, setAutoCreateWorkOrder] = useState(true);
  const [targetSquad, setTargetSquad] = useState("Aeronav UAV Rapid Response");

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name);
      setDescription(ruleToEdit.description);
      setAlertType(ruleToEdit.alertType);
      setSeverity(ruleToEdit.severity);
      setMetricKey(ruleToEdit.metricKey);
      setOperator(ruleToEdit.operator);
      setThresholdValue(ruleToEdit.thresholdValue);
      setUnit(ruleToEdit.unit);
      setProjectId(ruleToEdit.projectId);
      setProjectName(ruleToEdit.projectName);
      setAutoCreateWorkOrder(ruleToEdit.autoCreateWorkOrder);
      setTargetSquad(ruleToEdit.targetSquad);
    } else {
      setName("Sentinel-2 NDVI Canopy Degradation Rule");
      setDescription("Triggers when 5-day Copernicus spectral pass detects drop in NDVI vegetation index.");
      setAlertType("canopy_degradation");
      setSeverity("critical");
      setMetricKey("delta_ndvi");
      setOperator("<=");
      setThresholdValue(-0.15);
      setUnit("NDVI index");
      setProjectId("proj-sahayadri");
      setProjectName("Sahayadri Tiger Reserve Afforestation");
      setAutoCreateWorkOrder(true);
      setTargetSquad("Aeronav UAV Rapid Response");
    }
  }, [ruleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (ruleToEdit) {
      const updated = monitoringAlertService.updateRule(ruleToEdit.id, {
        name,
        description,
        alertType,
        severity,
        metricKey,
        operator,
        thresholdValue: Number(thresholdValue),
        unit,
        projectId,
        projectName,
        autoCreateWorkOrder,
        targetSquad,
      });
      if (onSaved) onSaved(updated);
    } else {
      const created = monitoringAlertService.createRule({
        name,
        description,
        alertType,
        severity,
        metricKey,
        operator,
        thresholdValue: Number(thresholdValue),
        unit,
        projectId,
        projectName,
        autoCreateWorkOrder,
        targetSquad,
      });
      if (onSaved) onSaved(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {ruleToEdit ? "Edit Alert Threshold Rule" : "Configure New Anomaly Alert Rule"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Set automatic trigger conditions for satellite spectral & ground telemetry
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
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sentinel-2 NDVI Drop Anomaly Threshold"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Alert Type
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as AlertType)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="canopy_degradation">Canopy Degradation (NDVI)</option>
                <option value="drought_deficit">Drought / Soil Moisture Deficit</option>
                <option value="survival_rate_breach">Survival Rate Minimum Breach</option>
                <option value="pest_disease_outbreak">Pest & Disease Outbreak</option>
                <option value="geofence_violation">Geofence Boundary Violation</option>
                <option value="carbon_accrual_deficit">Carbon Accrual Model Deficit</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none"
              >
                <option value="critical">CRITICAL (Immediate Dispatch)</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
          </div>

          {/* Condition Matrix */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              Threshold Breach Condition
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Metric Key</label>
                <input
                  type="text"
                  required
                  value={metricKey}
                  onChange={(e) => setMetricKey(e.target.value)}
                  placeholder="delta_ndvi"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Operator</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-[11px]"
                >
                  <option value="<">&lt; (Less than)</option>
                  <option value="<=">&le; (Less or Equal)</option>
                  <option value=">">&gt; (Greater than)</option>
                  <option value=">=">&ge; (Greater or Equal)</option>
                  <option value="==">== (Exact)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Threshold</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="NDVI index"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Target Response Squad
              </label>
              <input
                type="text"
                required
                value={targetSquad}
                onChange={(e) => setTargetSquad(e.target.value)}
                placeholder="e.g. Aeronav UAV Rapid Response"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="autoWorkOrder"
                checked={autoCreateWorkOrder}
                onChange={(e) => setAutoCreateWorkOrder(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700"
              />
              <label htmlFor="autoWorkOrder" className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">
                Auto-dispatch Task 47 Field Work Order on Breach
              </label>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Rule Description & MRV Compliance Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain ecological context or sensor threshold reasoning..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
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
              data-testid="submit-alert-rule-btn"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-sm"
            >
              {ruleToEdit ? "Update Alert Rule" : "Create Alert Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
