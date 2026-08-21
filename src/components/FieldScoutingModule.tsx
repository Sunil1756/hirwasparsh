import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import {
  loadScoutingPins,
  addScoutingPin,
  updateScoutingPinStatus,
  ScoutingPin,
  ScoutingIssueCategory,
  ScoutingSeverity,
  ScoutingStatus,
  SCOUTING_CATEGORY_CONFIG,
} from "@/lib/scoutingService";
import {
  Bug,
  Droplets,
  AlertTriangle,
  Sparkles,
  Scissors,
  MapPin,
  Plus,
  CheckCircle2,
  Clock,
  Filter,
  ShieldAlert,
  Search,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Map click listener to set coordinates for new pin
const MapClickListener = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export function FieldScoutingModule() {
  const [pins, setPins] = useState<ScoutingPin[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScoutingIssueCategory>("pest_disease");
  const [severity, setSeverity] = useState<ScoutingSeverity>("moderate");
  const [plotName, setPlotName] = useState("Sector 3 - Agroforestry Block");
  const [affectedSpecies, setAffectedSpecies] = useState("Teak & Neem");
  const [affectedTreeCount, setAffectedTreeCount] = useState(25);
  const [assignedTo, setAssignedTo] = useState("Field Scout Team A");
  const [notes, setNotes] = useState("");
  const [remedy, setRemedy] = useState(SCOUTING_CATEGORY_CONFIG.pest_disease.defaultRemedy);
  const [lat, setLat] = useState<number>(18.5204);
  const [lng, setLng] = useState<number>(73.8567);

  useEffect(() => {
    setPins(loadScoutingPins());
  }, []);

  const handleCategoryChange = (cat: ScoutingIssueCategory) => {
    setCategory(cat);
    setRemedy(SCOUTING_CATEGORY_CONFIG[cat].defaultRemedy);
  };

  const handleUseCurrentGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(5)));
          setLng(Number(pos.coords.longitude.toFixed(5)));
          toast.success("GPS Coordinates Acquired!");
        },
        () => toast.error("Could not fetch GPS location. Please enter manually.")
      );
    }
  };

  const handleSavePin = () => {
    if (!title.trim()) {
      toast.error("Please provide a title for the scout observation.");
      return;
    }

    const created = addScoutingPin({
      plotName,
      title,
      category,
      severity,
      status: "open",
      latitude: lat,
      longitude: lng,
      assignedTo,
      affectedTreeCount,
      affectedSpecies,
      notes,
      recommendedRemedy: remedy,
    });

    setPins([created, ...pins]);
    toast.success("Scouting Pin Registered & Alert Issued!");
    setIsDialogOpen(false);
    setTitle("");
    setNotes("");
  };

  const handleStatusUpdate = (id: string, newStatus: ScoutingStatus) => {
    const updated = updateScoutingPinStatus(id, newStatus);
    setPins([...updated]);
    toast.success(`Issue status updated to ${newStatus.replace("_", " ").toUpperCase()}`);
  };

  const filteredPins = pins.filter((p) => {
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchCat && matchStatus;
  });

  const openCount = pins.filter((p) => p.status === "open").length;
  const inProgressCount = pins.filter((p) => p.status === "in_progress").length;
  const resolvedCount = pins.filter((p) => p.status === "resolved").length;
  const criticalCount = pins.filter((p) => p.severity === "critical" && p.status !== "resolved").length;

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h3 className="font-heading font-semibold text-lg">
              Plantation Field Scouting & Anomaly Telemetry
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geo-tagged pest outbreaks, drought stress hotspots, and field remediation dispatch (Map My Crop model).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs bg-destructive/10 border-destructive/30 text-destructive">
            {criticalCount} Critical Action Items
          </Badge>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl flex items-center gap-1.5 text-xs">
                <Plus className="h-4 w-4" /> Drop Scouting Pin
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  Log Field Anomaly & Scouting Pin
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs pt-1">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Issue Title / Observation</label>
                  <input
                    type="text"
                    placeholder="e.g. Stem Borer Infestation in Sector 4"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Category</label>
                    <Select value={category} onValueChange={(v: any) => handleCategoryChange(v)}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCOUTING_CATEGORY_CONFIG).map(([k, cfg]) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Severity Level</label>
                    <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low" className="text-xs">Low (Monitor)</SelectItem>
                        <SelectItem value="moderate" className="text-xs">Moderate (Action in 7 days)</SelectItem>
                        <SelectItem value="critical" className="text-xs">Critical (Emergency Dispatch)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Affected Species</label>
                    <input
                      type="text"
                      value={affectedSpecies}
                      onChange={(e) => setAffectedSpecies(e.target.value)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Est. Affected Trees</label>
                    <input
                      type="number"
                      value={affectedTreeCount}
                      onChange={(e) => setAffectedTreeCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="p-3 rounded-xl bg-background/50 border border-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">GPS Location Coordinates</span>
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      className="text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <MapPin className="h-3 w-3" /> Use Device GPS
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Latitude:</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={lat}
                        onChange={(e) => setLat(Number(e.target.value))}
                        className="w-full rounded-lg border border-primary/20 bg-background px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Longitude:</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={lng}
                        onChange={(e) => setLng(Number(e.target.value))}
                        className="w-full rounded-lg border border-primary/20 bg-background px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Field Scout Observations</label>
                  <textarea
                    rows={2}
                    placeholder="Describe symptoms, foliage discoloration, root status..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Recommended Remediation Action</label>
                  <textarea
                    rows={2}
                    value={remedy}
                    onChange={(e) => setRemedy(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSavePin}>
                  Save & Issue Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
          <div className="text-[10px] text-muted-foreground">Open Incidents</div>
          <div className="font-heading font-bold text-lg text-destructive">{openCount}</div>
          <div className="text-[10px] text-muted-foreground">Pending Treatment</div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-[10px] text-muted-foreground">Under Action</div>
          <div className="font-heading font-bold text-lg text-amber-600 dark:text-amber-400">
            {inProgressCount}
          </div>
          <div className="text-[10px] text-muted-foreground">Field Teams Dispatched</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[10px] text-muted-foreground">Resolved Issues</div>
          <div className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
            {resolvedCount}
          </div>
          <div className="text-[10px] text-muted-foreground">Treated & Restored</div>
        </div>

        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
          <div className="text-[10px] text-muted-foreground">Remediation Rate</div>
          <div className="font-heading font-bold text-lg text-primary">
            {pins.length > 0 ? `${Math.round((resolvedCount / pins.length) * 100)}%` : "100%"}
          </div>
          <div className="text-[10px] text-muted-foreground">Survival Protected</div>
        </div>
      </div>

      {/* Interactive Scouting Map Canvas */}
      <div className="glass-card rounded-2xl overflow-hidden border border-primary/20 mb-5">
        <MapContainer
          center={[18.5204, 73.8567]}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: "360px", width: "100%" }}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <MapClickListener
            onLocationSelect={(clickedLat, clickedLng) => {
              setLat(Number(clickedLat.toFixed(5)));
              setLng(Number(clickedLng.toFixed(5)));
              setIsDialogOpen(true);
            }}
          />

          {filteredPins.map((pin) => {
            const config = SCOUTING_CATEGORY_CONFIG[pin.category] || SCOUTING_CATEGORY_CONFIG.pest_disease;
            const pinColor = pin.status === "resolved" ? "#22c55e" : config.color;

            return (
              <CircleMarker
                key={pin.id}
                center={[pin.latitude, pin.longitude]}
                radius={pin.severity === "critical" ? 10 : 7}
                pathOptions={{
                  color: pinColor,
                  fillColor: pinColor,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 min-w-[220px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-foreground">{pin.title}</span>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {pin.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">📍 {pin.plotName}</div>
                    <div>🌿 Affected: {pin.affectedTreeCount} trees ({pin.affectedSpecies})</div>
                    <div className="p-2 rounded-lg bg-muted text-[11px]">
                      <strong>Prescription:</strong> {pin.recommendedRemedy}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Assigned: {pin.assignedTo}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Scouting Issues Task Matrix */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-primary" /> Active Field Scouting Incidents
          </h4>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 text-[11px] w-36 rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                {Object.entries(SCOUTING_CATEGORY_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 text-[11px] w-28 rounded-lg">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="open" className="text-xs">Open</SelectItem>
                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Issue Cards */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredPins.map((pin) => {
            const config = SCOUTING_CATEGORY_CONFIG[pin.category] || SCOUTING_CATEGORY_CONFIG.pest_disease;

            return (
              <div
                key={pin.id}
                className="p-3.5 rounded-xl bg-background/60 border border-primary/10 flex flex-wrap items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-semibold text-foreground">{pin.title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {config.label}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        pin.severity === "critical"
                          ? "bg-destructive/20 text-destructive"
                          : pin.severity === "moderate"
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pin.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-[11px]">{pin.notes}</p>
                  <div className="text-primary text-[11px]">
                    <strong>Action:</strong> {pin.recommendedRemedy}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    📍 ({pin.latitude.toFixed(3)}°N, {pin.longitude.toFixed(3)}°E) • Assigned: {pin.assignedTo} • {pin.affectedTreeCount} trees
                  </div>
                </div>

                {/* Status Changer Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {pin.status !== "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(pin.id, "open")}
                      className="h-7 px-2 text-[10px] rounded-lg"
                    >
                      Re-open
                    </Button>
                  )}
                  {pin.status !== "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(pin.id, "in_progress")}
                      className="h-7 px-2 text-[10px] rounded-lg border-amber-500/30 text-amber-600"
                    >
                      In Progress
                    </Button>
                  )}
                  {pin.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(pin.id, "resolved")}
                      className="h-7 px-2 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPins.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No scouting incidents found matching the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
