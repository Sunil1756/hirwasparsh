import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import {
  Building2, MapPin, Target, Leaf, Upload, Camera, Satellite, Bot, ShieldCheck,
  FileText, Activity, Loader2, Plus, ArrowLeft, ArrowRight, Trash2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageProcessing";
import "leaflet/dist/leaflet.css";

type Project = {
  id: string;
  project_name: string;
  organization_name: string;
  organization_type: string;
  contact_email: string | null;
  contact_phone: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  boundary: any;
  target_trees: number;
  species: string[];
  plantation_date: string;
  bulk_data: any;
  bulk_rows: number;
  status: string;
  ai_score: number | null;
  ai_report: string | null;
  verified_trees: number;
  created_at: string;
};

type Evidence = {
  id: string;
  evidence_type: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  notes: string | null;
  survival_percent: number | null;
  created_at: string;
};

const ORG_TYPES = [
  { value: "ngo", label: "NGO / Trust" },
  { value: "government", label: "Government Department" },
  { value: "school_college", label: "School / College" },
  { value: "company", label: "Company / CSR" },
  { value: "other", label: "Other" },
];

const EVIDENCE_TYPES = [
  { value: "field", label: "Field evidence (geotagged photo)", icon: Camera },
  { value: "drone", label: "Drone imagery", icon: Satellite },
  { value: "satellite", label: "Satellite monitoring capture", icon: Satellite },
  { value: "survival", label: "Survival monitoring record", icon: Activity },
];

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", className: "bg-blue-500/15 text-blue-600" },
  under_review: { label: "Under Review", className: "bg-amber-500/15 text-amber-600" },
  verified_pending_admin: { label: "AI Passed · Awaiting Admin", className: "bg-primary/15 text-primary" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
};

const MH_CENTER: [number, number] = [19.7515, 75.7139];

const OrganizationPlantation = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "wizard" | "detail">("list");
  const [activeId, setActiveId] = useState<string | null>(null);

  // wizard state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("ngo");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [location, setLocation] = useState("");
  const [boundary, setBoundary] = useState<[number, number][]>([]);
  const [targetTrees, setTargetTrees] = useState("");
  const [speciesText, setSpeciesText] = useState("");
  const [plantationDate, setPlantationDate] = useState("");
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");

  // detail state
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [evType, setEvType] = useState("field");
  const [evNotes, setEvNotes] = useState("");
  const [evSurvival, setEvSurvival] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sample, setSample] = useState<Record<string, string>[]>([]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) || null,
    [projects, activeId]
  );

  const loadProjects = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("plantation_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load projects", description: error.message, variant: "destructive" });
    setProjects((data as Project[]) || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadEvidence = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from("project_evidence")
      .select("id, evidence_type, photo_url, latitude, longitude, captured_at, notes, survival_percent, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const rows = (data as Evidence[]) || [];
    setEvidence(rows);

    const urls: Record<string, string> = {};
    await Promise.all(
      rows.filter((r) => r.photo_url).map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("treebank")
          .createSignedUrl(r.photo_url as string, 3600);
        if (signed?.signedUrl) urls[r.id] = signed.signedUrl;
      })
    );
    setEvidenceUrls(urls);
  }, []);

  useEffect(() => {
    if (view === "detail" && activeId) loadEvidence(activeId);
  }, [view, activeId, loadEvidence]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setBoundary((b) => [...b, pt]);
        toast({ title: "Boundary point added", description: `${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}` });
      },
      () => toast({ title: "Location unavailable", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      toast({ title: "CSV looks empty", description: "Expected a header row plus data rows.", variant: "destructive" });
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
      return row;
    });
    setBulkRows(rows);
    setBulkFileName(file.name);
    toast({ title: "Bulk data parsed", description: `${rows.length} plantation rows loaded.` });
  };

  const resetWizard = () => {
    setStep(1); setProjectName(""); setOrgName(""); setOrgType("ngo");
    setContactEmail(""); setContactPhone(""); setLocation(""); setBoundary([]);
    setTargetTrees(""); setSpeciesText(""); setPlantationDate("");
    setBulkRows([]); setBulkFileName("");
  };

  const createProject = async () => {
    if (!user) { toast({ title: "Please log in", variant: "destructive" }); return; }
    if (!projectName || !orgName || !location || !targetTrees || !plantationDate) {
      toast({ title: "Missing details", description: "Complete project, location, target and date fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const centroid = boundary.length
      ? boundary.reduce((a, p) => [a[0] + p[0] / boundary.length, a[1] + p[1] / boundary.length], [0, 0])
      : [null, null];
    const { data, error } = await supabase
      .from("plantation_projects")
      .insert({
        user_id: user.id,
        project_name: projectName,
        organization_name: orgName,
        organization_type: orgType,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        location,
        latitude: centroid[0] as number | null,
        longitude: centroid[1] as number | null,
        boundary: boundary.map(([lat, lng]) => ({ lat, lng })),
        target_trees: Number(targetTrees),
        species: speciesText.split(",").map((s) => s.trim()).filter(Boolean),
        plantation_date: plantationDate,
        bulk_data: bulkRows,
        bulk_rows: bulkRows.length,
        status: "submitted",
      })
      .select()
      .single();
    setSaving(false);
    if (error) { toast({ title: "Could not create project", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Project created", description: "Now upload field evidence and run AI verification." });
    setProjects((p) => [data as Project, ...p]);
    setActiveId((data as Project).id);
    resetWizard();
    setView("detail");
  };

  const uploadEvidence = async () => {
    if (!user || !activeProject) return;
    if (!evFile && evType !== "survival") {
      toast({ title: "Photo required", description: "Attach the evidence image.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let path: string | null = null;
      if (evFile) {
        const compressed = await compressImage(evFile, 1600, 0.8);
        const key = `projects/${activeProject.id}/${evType}-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from("treebank").upload(key, compressed, { upsert: true });
        if (error) throw error;
        path = data.path;
      }

      const coords = await new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: null, lng: null }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      const { error: insErr } = await supabase.from("project_evidence").insert({
        project_id: activeProject.id,
        user_id: user.id,
        evidence_type: evType,
        photo_url: path,
        latitude: coords.lat,
        longitude: coords.lng,
        captured_at: new Date().toISOString(),
        notes: evNotes || null,
        survival_percent: evSurvival ? Number(evSurvival) : null,
      });
      if (insErr) throw insErr;

      setEvFile(null); setEvNotes(""); setEvSurvival("");
      await loadEvidence(activeProject.id);
      toast({ title: "Evidence uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const runAiVerification = async () => {
    if (!activeProject) return;
    setVerifying(true);
    try {
      const withPhotos = evidence.filter((e) => e.photo_url).slice(0, 4);
      const images = await Promise.all(
        withPhotos.map(async (e) => {
          const url = evidenceUrls[e.id];
          if (!url) return null;
          const blob = await (await fetch(url)).blob();
          const base64 = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(",")[1]);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
          return { type: e.evidence_type, base64 };
        })
      );
      const { data, error } = await supabase.functions.invoke("verify-project", {
        body: { projectId: activeProject.id, images: images.filter(Boolean) },
      });
      if (error) throw error;
      toast({ title: `AI score: ${data.score}/100`, description: STATUS_LABEL[data.status]?.label ?? data.status });
      await loadProjects();
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const drawSample = () => {
    if (!activeProject) return;
    const rows: Record<string, string>[] = Array.isArray(activeProject.bulk_data) ? activeProject.bulk_data : [];
    if (!rows.length) {
      toast({ title: "No bulk data", description: "Upload plantation data to draw a random sample.", variant: "destructive" });
      return;
    }
    const n = Math.max(1, Math.min(10, Math.ceil(rows.length * 0.05)));
    const picked = [...rows].sort(() => Math.random() - 0.5).slice(0, n);
    setSample(picked);
  };

  if (!user) {
    return (
      <main className="min-h-screen pt-28 px-4 text-center">
        <Building2 className="h-10 w-10 text-primary mx-auto" />
        <h1 className="font-heading text-2xl font-bold mt-4">Organization Plantation Projects</h1>
        <p className="text-muted-foreground mt-2">Please log in to create and manage plantation projects.</p>
        <Link to="/login"><Button className="mt-5">Log In</Button></Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-heading font-bold text-primary text-[clamp(1.5rem,3.5vw,2.25rem)]">
              Large-Scale Plantation Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bulk data, geotagged field evidence, drone &amp; satellite monitoring — no per-tree selfies.
            </p>
          </div>
          {view === "list" ? (
            <Button onClick={() => { resetWizard(); setView("wizard"); }}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> All Projects
            </Button>
          )}
        </div>

        {/* ---------------- LIST ---------------- */}
        {view === "list" && (
          <div className="space-y-4">
            {loading && <p className="text-muted-foreground">Loading projects…</p>}
            {!loading && projects.length === 0 && (
              <div className="glass-card rounded-2xl p-10 text-center border border-border/40">
                <Building2 className="h-9 w-9 text-primary mx-auto" />
                <p className="mt-3 font-medium">No plantation projects yet</p>
                <p className="text-sm text-muted-foreground">Create your first large-scale project to begin verification.</p>
                <Button className="mt-4" onClick={() => setView("wizard")}>
                  <Plus className="h-4 w-4 mr-2" /> Create Project
                </Button>
              </div>
            )}
            {projects.map((p) => {
              const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.submitted;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { setActiveId(p.id); setSample([]); setView("detail"); }}
                  className="w-full text-left glass-card rounded-2xl p-5 border border-border/40 hover:border-primary/40 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading font-semibold">{p.project_name}</h3>
                      <p className="text-sm text-muted-foreground">{p.organization_name} · {p.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.ai_score != null && <Badge variant="outline">AI {p.ai_score}/100</Badge>}
                      <span className={`text-xs px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{p.bulk_rows} recorded / {p.target_trees} target trees</span>
                      <span>{new Date(p.plantation_date).toLocaleDateString()}</span>
                    </div>
                    <Progress value={Math.min(100, (p.bulk_rows / Math.max(1, p.target_trees)) * 100)} className="h-2" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ---------------- WIZARD ---------------- */}
        {view === "wizard" && (
          <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {["Organization", "Boundary", "Target & Species", "Bulk Data", "Review"].map((label, i) => (
                <span key={label} className={`px-2.5 py-1 rounded-full ${step === i + 1 ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                  {i + 1}. {label}
                </span>
              ))}
            </div>

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Project name *</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Miyawaki Forest — Nagpur Phase 1" />
                </div>
                <div>
                  <Label>Organization name *</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Green Earth Foundation" />
                </div>
                <div>
                  <Label>Organization type</Label>
                  <Select value={orgType} onValueChange={setOrgType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Contact phone</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Plantation location *</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Village / taluka / district" />
                </div>
                <div className="rounded-xl overflow-hidden border border-border/40">
                  <MapContainer center={boundary[0] ?? MH_CENTER} zoom={boundary.length ? 15 : 6} style={{ height: 320, width: "100%" }}>
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Esri"
                    />
                    {boundary.length >= 3 && <Polygon positions={boundary} pathOptions={{ color: "#4CAF50" }} />}
                    {boundary.map((pt, i) => <Marker key={i} position={pt} />)}
                  </MapContainer>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={useMyLocation}>
                    <MapPin className="h-4 w-4 mr-2" /> Add boundary point (my GPS)
                  </Button>
                  {boundary.length > 0 && (
                    <Button type="button" variant="ghost" onClick={() => setBoundary([])}>
                      <Trash2 className="h-4 w-4 mr-2" /> Clear ({boundary.length})
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Walk the site perimeter and add at least 3 points to record the plantation boundary.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Target number of trees *</Label>
                  <Input type="number" min={1} value={targetTrees} onChange={(e) => setTargetTrees(e.target.value)} />
                </div>
                <div>
                  <Label>Plantation date *</Label>
                  <Input type="date" value={plantationDate} onChange={(e) => setPlantationDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Species (comma separated)</Label>
                  <Textarea value={speciesText} onChange={(e) => setSpeciesText(e.target.value)} placeholder="Neem, Banyan, Mango, Peepal" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Label>Bulk plantation data (CSV)</Label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 p-8 cursor-pointer hover:border-primary/50">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {bulkFileName || "Upload CSV — e.g. species, count, latitude, longitude, planted_on"}
                  </span>
                  <input
                    type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => e.target.files?.[0] && parseCsv(e.target.files[0])}
                  />
                </label>
                {bulkRows.length > 0 && (
                  <div className="text-sm">
                    <p className="text-primary font-medium mb-2">{bulkRows.length} rows parsed</p>
                    <div className="overflow-x-auto rounded-lg border border-border/40">
                      <table className="text-xs w-full">
                        <thead className="bg-muted/50">
                          <tr>{Object.keys(bulkRows[0]).map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {bulkRows.slice(0, 5).map((r, i) => (
                            <tr key={i} className="border-t border-border/30">
                              {Object.keys(bulkRows[0]).map((h) => <td key={h} className="px-3 py-2">{r[h]}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Optional — you can add plantation data later.</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-2 text-sm">
                <p><strong>{projectName || "—"}</strong> · {orgName || "—"} ({ORG_TYPES.find(t => t.value === orgType)?.label})</p>
                <p className="text-muted-foreground">{location || "—"} · boundary points: {boundary.length}</p>
                <p className="text-muted-foreground">Target: {targetTrees || 0} trees · Date: {plantationDate || "—"}</p>
                <p className="text-muted-foreground">Species: {speciesText || "—"}</p>
                <p className="text-muted-foreground">Bulk data rows: {bulkRows.length}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {step < 5 ? (
                <Button onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
              ) : (
                <Button onClick={createProject} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Create Project
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ---------------- DETAIL ---------------- */}
        {view === "detail" && activeProject && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-semibold">{activeProject.project_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeProject.organization_name} · {activeProject.location}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${(STATUS_LABEL[activeProject.status] ?? STATUS_LABEL.submitted).className}`}>
                  {(STATUS_LABEL[activeProject.status] ?? STATUS_LABEL.submitted).label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-center">
                <div><Target className="h-4 w-4 mx-auto text-primary" /><p className="mt-1 font-semibold">{activeProject.target_trees}</p><p className="text-xs text-muted-foreground">Target</p></div>
                <div><Leaf className="h-4 w-4 mx-auto text-primary" /><p className="mt-1 font-semibold">{activeProject.bulk_rows}</p><p className="text-xs text-muted-foreground">Data rows</p></div>
                <div><Camera className="h-4 w-4 mx-auto text-primary" /><p className="mt-1 font-semibold">{evidence.length}</p><p className="text-xs text-muted-foreground">Evidence</p></div>
                <div><Bot className="h-4 w-4 mx-auto text-primary" /><p className="mt-1 font-semibold">{activeProject.ai_score ?? "—"}</p><p className="text-xs text-muted-foreground">AI score</p></div>
              </div>
            </div>

            {/* Evidence upload */}
            <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Upload field / drone / satellite evidence
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Evidence type</Label>
                  <Select value={evType} onValueChange={setEvType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {evType === "survival" && (
                  <div>
                    <Label>Survival rate (%)</Label>
                    <Input type="number" min={0} max={100} value={evSurvival} onChange={(e) => setEvSurvival(e.target.value)} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Photo {evType === "survival" ? "(optional)" : "*"}</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={evNotes} onChange={(e) => setEvNotes(e.target.value)} placeholder="Block A perimeter, 400 saplings, drip irrigation installed" />
                </div>
              </div>
              <Button onClick={uploadEvidence} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Add Evidence
              </Button>

              {evidence.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  {evidence.map((e) => (
                    <div key={e.id} className="rounded-xl border border-border/40 overflow-hidden">
                      {evidenceUrls[e.id] ? (
                        <img src={evidenceUrls[e.id]} alt={`${e.evidence_type} evidence`} className="h-32 w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-32 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                      <div className="p-3 text-xs space-y-1">
                        <Badge variant="outline" className="capitalize">{e.evidence_type}</Badge>
                        {e.survival_percent != null && <p>Survival: {e.survival_percent}%</p>}
                        <p className="text-muted-foreground">
                          {e.latitude != null ? `${e.latitude.toFixed(4)}, ${e.longitude?.toFixed(4)}` : "No geotag"}
                        </p>
                        {e.notes && <p className="text-muted-foreground line-clamp-2">{e.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI verification + sampling */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-3">
                <h3 className="font-heading font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" /> AI-assisted verification
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cross-checks bulk data coverage, geotagged evidence and imagery authenticity to produce a 0–100 project score.
                </p>
                <Button onClick={runAiVerification} disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Run AI Verification
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-3">
                <h3 className="font-heading font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Random sample field verification
                </h3>
                <p className="text-sm text-muted-foreground">
                  Draws a random 5% sample from your plantation data for physical spot checks.
                </p>
                <Button variant="outline" onClick={drawSample}>Draw Random Sample</Button>
                {sample.length > 0 && (
                  <ul className="text-xs space-y-1 pt-2">
                    {sample.map((r, i) => (
                      <li key={i} className="rounded-md bg-muted/50 px-2 py-1">
                        {Object.entries(r).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Report */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="font-heading font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" /> Project verification report
              </h3>
              {activeProject.ai_report ? (
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">{activeProject.ai_report}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">Run AI verification to generate the project report.</p>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="font-heading font-semibold flex items-center gap-2 mb-2">
                <Satellite className="h-4 w-4 text-primary" /> Periodic survival monitoring
              </h3>
              <p className="text-sm text-muted-foreground">
                Add a “Survival monitoring record” above every quarter with the current survival rate and site imagery.
                The latest recorded survival rate is{" "}
                <strong className="text-foreground">
                  {evidence.find((e) => e.survival_percent != null)?.survival_percent ?? "—"}%
                </strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default OrganizationPlantation;
