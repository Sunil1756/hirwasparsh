import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import {
  loadScoutingPins,
  addScoutingPin,
  updateScoutingPinStatus,
  deleteScoutingPin,
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
  RefreshCw,
  Trash2,
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
  const [refreshing, setRefreshing] = useState(false);

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

  const loadData = () => {
    setPins(loadScoutingPins());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadData();
      setRefreshing(false);
      toast.success("Field scouting matrix refreshed!");
    }, 250);
  };

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

  const handleDeletePin = (id: string) => {
    const updated = deleteScoutingPin(id);
    setPins([...updated]);
    toast.success("Scouting pin deleted.");
  };

  const filteredPins = pins.filter((p) => {
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchCat && matchStatus;
  });

  const openCount = pins.filter((p) => p.status === "open").length;
  const inProgressCount = pins.filter((p) => p.status === "in_progress").length;
  const resolvedCount = pins.filter((p) => p.status === "resolved").length;

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h3 className="font-heading font-semibold text-lg">
              Plantation Field Scouting & Anomaly Telemetry
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geotag ground truth observations, pest & disease detection, and assign remediation tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl text-xs gap-1.5 border-primary/30"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            Refresh Matrix
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl text-xs gap-1.5 font-semibold shadow-md">
                <Plus className="h-3.5 w-3.5" /> Drop Scouting Pin
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <MapPin className="h-5 w-5 text-primary" /> Register Field Scouting Observation
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Issue Title / Summary</label>
                  <input
                    type="text"
                    placeholder="e.g., Fungal leaf spot outbreak, Severely dry root collar"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                    <label className="text-muted-foreground block mb-1 font-medium">Severity</label>
                    <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low" className="text-xs">Low (Monitor)</SelectItem>
                        <SelectItem value="moderate" className="text-xs">Moderate (Action)</SelectItem>
                        <SelectItem value="critical" className="text-xs">Critical (Immediate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Plot / Sector</label>
                    <input
                      type="text"
                      value={plotName}
                      onChange={(e) => setPlotName(e.target.value)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Affected Trees</label>
                    <input
                      type="number"
                      value={affectedTreeCount}
                      onChange={(e) => setAffectedTreeCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs focus:outline-none"
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

      {/* KPI Counters (Zero-baseline real data) */}
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
            {pins.length > 0 ? `${Math.round((resolvedCount / pins.length) * 100)}%` : "0%"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {pins.length === 0 ? "No active incidents" : `${resolvedCount}/${pins.length} resolved`}
          </div>
        </div>
      </div>

      {/* Scouting Map */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-md mb-5 relative">
        <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-primary/20 text-[11px] font-medium text-foreground shadow-sm">
          💡 Click map to pick coordinates
        </div>

        <MapContainer
          center={[19.7515, 75.7139]}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: "340px", width: "100%" }}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <MapClickListener
            onLocationSelect={(clickedLat, clickedLng) => {
              setLat(Number(clickedLat.toFixed(5)));
              setLng(Number(clickedLng.toFixed(5)));
              setIsDialogOpen(true);
              toast.info(`Location pinned at ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`);
            }}
          />

          {pins.map((pin) => {
            const config = SCOUTING_CATEGORY_CONFIG[pin.category] || SCOUTING_CATEGORY_CONFIG.pest_disease;
            return (
              <CircleMarker
                key={pin.id}
                center={[pin.latitude, pin.longitude]}
                radius={pin.severity === "critical" ? 11 : 9}
                pathOptions={{
                  color: config.color,
                  fillColor: config.color,
                  fillOpacity: 0.85,
                  weight: pin.status === "resolved" ? 1 : 3,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[200px]">
                    <div className="font-bold text-foreground">{pin.title}</div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {pin.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{pin.notes}</p>
                    <div className="text-primary font-medium">
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
            <AlertTriangle className="h-4 w-4 text-primary" /> Active Field Scouting Incidents ({pins.length})
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

        {/* Empty State vs List */}
        {pins.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-xl border border-primary/15 space-y-2">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <h5 className="font-heading font-semibold text-sm">No Field Scouting Incidents Logged</h5>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Zero active anomalies. When field scouts detect pest attacks, water stress, or weed choking, click <strong>"Drop Scouting Pin"</strong> or tap the satellite map to log a geotagged alert.
            </p>
            <Button size="sm" onClick={() => setIsDialogOpen(true)} className="rounded-xl text-xs gap-1.5 mt-2">
              <Plus className="h-3.5 w-3.5" /> Drop First Scouting Pin
            </Button>
          </div>
        ) : (
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

                  {/* Status & Action Buttons */}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePin(pin.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete Pin"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
        )}
      </div>
    </div>
  );
}
