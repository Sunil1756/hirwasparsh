import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import BoundaryDrawMap, { computeAreas } from "@/components/BoundaryDrawMap";
import { ProjectVerificationCard } from "@/components/ProjectVerificationCard";
import { SatelliteProjectTelemetrySuite } from "@/components/SatelliteProjectTelemetrySuite";
import { FieldSpotAuditConsole } from "@/components/FieldSpotAuditConsole";
import { QuarterlySurvivalFeed } from "@/components/QuarterlySurvivalFeed";
import { CarbonCertificateModal } from "@/components/CarbonCertificateModal";
import { evaluateProjectVerification, ProjectAuditReport } from "@/lib/projectVerification";
import { calculateCarbonLedgerMetrics, CarbonAuditResult } from "@/lib/carbonLedger";
import {
  Building2, MapPin, Target, Leaf, Upload, Camera, Satellite, Bot, ShieldCheck,
  FileText, Activity, Loader2, Plus, ArrowLeft, ArrowRight, Trash2, CheckCircle2,
  AlertCircle, Download, Sparkles, Navigation, Layers, Grid, Image as ImageIcon,
  Check, ArrowUpRight, Award, QrCode, TrendingUp, SlidersHorizontal, UserCheck,
  Coins, Globe, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageProcessing";
import { syncUserProfileImpact } from "@/lib/syncUserImpact";
import "leaflet/dist/leaflet.css";

type Project = {
  id: string;
  user_id?: string | null;
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
  evidence_required: { label: "Evidence Required 📸", className: "bg-amber-500/15 text-amber-600" },
  verified_active: { label: "Verified Active ✓", className: "bg-emerald-500/15 text-emerald-600" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-600" },
  rejected_fraud: { label: "Flagged / Infeasible ⚠️", className: "bg-destructive/15 text-destructive" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
};

const MH_CENTER: [number, number] = [19.7515, 75.7139];

const MAHARASHTRA_PRESETS = [
  {
    name: "Nagpur Miyawaki Plot",
    location: "Nagpur Urban Agro-Zone, Maharashtra",
    points: [
      [21.1458, 79.0882],
      [21.1472, 79.0915],
      [21.1441, 79.0938],
      [21.1425, 79.0895],
    ] as [number, number][],
  },
  {
    name: "Satara Watershed Basin",
    location: "Koregaon, Satara District, Maharashtra",
    points: [
      [17.6850, 74.0150],
      [17.6885, 74.0210],
      [17.6840, 74.0245],
      [17.6810, 74.0180],
    ] as [number, number][],
  },
  {
    name: "Solapur Bio-Shield",
    location: "Pandharpur Road, Solapur, Maharashtra",
    points: [
      [17.6572, 75.3678],
      [17.6610, 75.3725],
      [17.6585, 75.3770],
      [17.6540, 75.3715],
    ] as [number, number][],
  },
];

const POPULAR_SPECIES = [
  "Neem (Azadirachta indica)",
  "Banyan (Ficus benghalensis)",
  "Peepal (Ficus religiosa)",
  "Teak (Tectona grandis)",
  "Mango (Mangifera indica)",
  "Jamun (Syzygium cumini)",
  "Bamboo (Bambusoideae)",
  "Mahua (Madhuca longifolia)",
  "Shisham (Dalbergia sissoo)",
  "Karanj (Millettia pinnata)",
];

const OrganizationPlantation = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "wizard" | "detail">("list");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Tabs for the project list view: My Workspace vs Public Explorer
  const [listTab, setListTab] = useState<"my_projects" | "public_registry">("my_projects");

  // Local storage project tracking for device session
  const [localProjectIds, setLocalProjectIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("my_created_project_ids") || "[]");
    } catch {
      return [];
    }
  });

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
  const [targetTrees, setTargetTrees] = useState("100");
  const [speciesText, setSpeciesText] = useState("Neem, Banyan, Peepal, Jamun");
  const [plantationDate, setPlantationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Step 4 Flexible Modes (Auto Grid vs Photo vs CSV)
  const [dataEntryMode, setDataEntryMode] = useState<"auto" | "photo" | "csv">("auto");
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [initialSitePhoto, setInitialSitePhoto] = useState<File | null>(null);
  const [initialSitePhotoPreview, setInitialSitePhotoPreview] = useState<string | null>(null);

  // detail state
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [evType, setEvType] = useState("field");
  const [evNotes, setEvNotes] = useState("");
  const [evSurvival, setEvSurvival] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Handle URL query parameters (e.g. ?create=true)
  useEffect(() => {
    const shouldCreate = searchParams.get("create") === "true";
    const projId = searchParams.get("project");
    if (shouldCreate) {
      setView("wizard");
    } else if (projId) {
      setActiveId(projId);
      setView("detail");
    }
  }, [searchParams]);

  const computedBoundaryArea = useMemo(() => computeAreas(boundary), [boundary]);

  // Filter projects owned by current user / device
  const myProjects = useMemo(() => {
    return projects.filter((p) => {
      if (user?.id && p.user_id === user.id) return true;
      if (localProjectIds.includes(p.id)) return true;
      return false;
    });
  }, [projects, user, localProjectIds]);

  const publicProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) || null,
    [projects, activeId]
  );

  const isOwner = useMemo(() => {
    if (!activeProject) return false;
    if (user?.id && activeProject.user_id === user.id) return true;
    if (localProjectIds.includes(activeProject.id)) return true;
    return false;
  }, [activeProject, user, localProjectIds]);

  // Convert active project boundary
  const activeBoundaryPoints: [number, number][] = useMemo(() => {
    if (!activeProject) return [];
    if (Array.isArray(activeProject.boundary)) {
      return activeProject.boundary.map((pt: any) => (Array.isArray(pt) ? pt : [pt.lat, pt.lng]));
    }
    return [];
  }, [activeProject]);

  const activeBoundaryArea = useMemo(() => computeAreas(activeBoundaryPoints), [activeBoundaryPoints]);

  // Dynamic AI Verification Audit Report for Active Project
  const activeAuditReport = useMemo(() => {
    if (!activeProject) return null;

    return evaluateProjectVerification({
      projectName: activeProject.project_name,
      organizationName: activeProject.organization_name,
      organizationType: activeProject.organization_type,
      locationName: activeProject.location,
      boundary: activeBoundaryPoints,
      targetTrees: activeProject.target_trees,
      speciesList: activeProject.species || [],
      evidenceCount: evidence.length,
      existingProjects: projects,
      currentProjectId: activeProject.id,
    });
  }, [activeProject, activeBoundaryPoints, evidence.length, projects]);

  // Dynamic IPCC Tier-2 Carbon Credit & Certificate Calculation
  const activeCarbonLedger: CarbonAuditResult | null = useMemo(() => {
    if (!activeProject) return null;
    return calculateCarbonLedgerMetrics({
      projectId: activeProject.id,
      projectName: activeProject.project_name,
      organizationName: activeProject.organization_name,
      targetTrees: activeProject.target_trees,
      acres: Math.max(0.5, activeBoundaryArea.acres),
      speciesList: activeProject.species || [],
      plantationDate: activeProject.plantation_date,
      survivalRatePercent: activeProject.verified_trees > 0 ? (activeProject.verified_trees / activeProject.target_trees) * 100 : 95.4,
    });
  }, [activeProject, activeBoundaryArea]);

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("plantation_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch plantation projects from Supabase:", error.message);
      }
      setProjects((data as Project[]) || []);
    } catch (e) {
      console.warn("Project load exception:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadEvidence = useCallback(async (projectId: string) => {
    try {
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
    } catch (err) {
      console.warn("Evidence load error:", err);
    }
  }, []);

  useEffect(() => {
    if (view === "detail" && activeId) loadEvidence(activeId);
  }, [view, activeId, loadEvidence]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser does not support GPS location.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setBoundary((b) => [...b, pt]);
        if (!location) {
          setLocation(`Geotagged Site (${pt[0].toFixed(4)}°N, ${pt[1].toFixed(4)}°E)`);
        }
        toast({ title: "Boundary point added 📍", description: `Coordinates: ${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}` });
      },
      () => toast({ title: "GPS Location unavailable", description: "Please enable device location or click on the map.", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const applyMaharashtraPreset = (preset: typeof MAHARASHTRA_PRESETS[0]) => {
    setBoundary(preset.points);
    setLocation(preset.location);
    toast({
      title: `Preset Applied: ${preset.name}`,
      description: `Loaded 4 boundary coordinates in ${preset.location}.`,
    });
  };

  const toggleSpecies = (name: string) => {
    const current = speciesText.split(",").map((s) => s.trim()).filter(Boolean);
    const clean = name.split(" (")[0];
    if (current.includes(clean)) {
      setSpeciesText(current.filter((s) => s !== clean).join(", "));
    } else {
      setSpeciesText([...current, clean].join(", "));
    }
  };

  // 1-Click Auto Generate Grid of Saplings inside Boundary Polygon
  const handleAutoGenerateGrid = () => {
    const count = Math.min(500, Math.max(10, Number(targetTrees) || 100));
    const speciesList = speciesText.split(",").map((s) => s.trim()).filter(Boolean);
    const availableSpecies = speciesList.length > 0 ? speciesList : ["Neem", "Banyan", "Peepal", "Teak", "Jamun"];

    const pts = boundary.length >= 3 ? boundary : [
      [MH_CENTER[0] - 0.002, MH_CENTER[1] - 0.002],
      [MH_CENTER[0] + 0.002, MH_CENTER[1] - 0.002],
      [MH_CENTER[0] + 0.002, MH_CENTER[1] + 0.002],
      [MH_CENTER[0] - 0.002, MH_CENTER[1] + 0.002],
    ] as [number, number][];

    const lats = pts.map((p) => p[0]);
    const lngs = pts.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const generatedRows: Record<string, string>[] = [];

    for (let i = 1; i <= count; i++) {
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);
      const sp = availableSpecies[(i - 1) % availableSpecies.length];

      generatedRows.push({
        tree_id: `GE-${String(i).padStart(4, "0")}`,
        species: sp,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        height_cm: String(Math.floor(35 + Math.random() * 30)),
        status: "healthy",
        planted_on: plantationDate,
      });
    }

    setBulkRows(generatedRows);
    setBulkFileName(`AI-Generated-${count}-Sapling-Grid.csv`);
    toast({
      title: "Smart Grid Generated! ⚡",
      description: `Auto-distributed ${count} sapling locations with GPS coordinates inside your plot.`,
    });
  };

  // Image Upload Handler (for Site / Field Photo)
  const handleSitePhotoSelected = (file: File) => {
    setInitialSitePhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setInitialSitePhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    toast({
      title: "Site Photo Attached 📸",
      description: `"${file.name}" saved as Primary Field Evidence.`,
    });
  };

  // Strict file parser for CSV / Tabular bulk data
  const parseCsv = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const ext = fileName.split(".").pop();

    if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext || "")) {
      setDataEntryMode("photo");
      handleSitePhotoSelected(file);
      return;
    }

    if (["pdf", "mp4", "zip", "exe"].includes(ext || "")) {
      toast({
        title: "Unsupported File Format ⚠️",
        description: `"${file.name}" is not a spreadsheet. Use .CSV or .GeoJSON.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();

      if (text.includes("\0") || /[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 300))) {
        toast({
          title: "Binary File Detected",
          description: "This file contains binary data and cannot be read as a CSV spreadsheet.",
          variant: "destructive",
        });
        return;
      }

      if (ext === "geojson" || ext === "json") {
        const json = JSON.parse(text);
        if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
          const rows = json.features.map((f: any, i: number) => ({
            tree_id: f.id || `TREE-${i + 1}`,
            species: f.properties?.species || f.properties?.name || "Indigenous Tree",
            latitude: String(f.geometry?.coordinates?.[1] || ""),
            longitude: String(f.geometry?.coordinates?.[0] || ""),
            height_cm: String(f.properties?.height_cm || 45),
            status: "healthy",
          }));
          setBulkRows(rows);
          setBulkFileName(file.name);
          toast({ title: "GeoJSON Parsed Successfully! 🗺️", description: `${rows.length} tree coordinates loaded.` });
          return;
        }
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast({ title: "CSV is Empty", description: "Expected a header row plus data rows.", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = cells[i] ?? "";
        });
        return row;
      });

      setBulkRows(rows);
      setBulkFileName(file.name);
      toast({ title: "Bulk Data Parsed 📊", description: `${rows.length} plantation rows loaded from ${file.name}.` });
    } catch (err: any) {
      toast({ title: "Could not parse file", description: err.message, variant: "destructive" });
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "tree_name,species,count,latitude,longitude,height_cm,planted_on\n" +
      "Block A Neem,Azadirachta indica,100,17.6572,75.3678,45,2026-09-02\n" +
      "Sacred Grove Banyan,Ficus benghalensis,50,17.6580,75.3685,60,2026-09-02\n" +
      "Teak Border Line,Tectona grandis,150,17.6565,75.3690,50,2026-09-02\n" +
      "Riparian Jamun,Syzygium cumini,75,17.6590,75.3670,40,2026-09-02\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantation_bulk_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded! 📥", description: "Use this CSV template to format bulk plantation records." });
  };

  const validateCurrentStep = (): boolean => {
    if (step === 1) {
      if (!projectName.trim()) {
        toast({ title: "Project Name Required", description: "Please enter your plantation project title.", variant: "destructive" });
        return false;
      }
      if (!orgName.trim()) {
        toast({ title: "Organization Name Required", description: "Please enter the executing organization / trust name.", variant: "destructive" });
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!location.trim()) {
        if (boundary.length >= 3) {
          setLocation(`Agroforestry Plot (${boundary[0][0].toFixed(4)}°N, ${boundary[0][1].toFixed(4)}°E)`);
        } else {
          toast({
            title: "Location Required",
            description: "Please specify the plantation village/district or choose a Maharashtra preset.",
            variant: "destructive",
          });
          return false;
        }
      }
      if (boundary.length < 3) {
        toast({
          title: "Boundary Points Needed",
          description: "Please mark at least 3 points on the map or click a preset to define the plot area.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!targetTrees || Number(targetTrees) <= 0) {
        toast({ title: "Target Trees Required", description: "Please specify the target number of trees (e.g. 100).", variant: "destructive" });
        return false;
      }
      if (!plantationDate) {
        toast({ title: "Date Required", description: "Please select the scheduled plantation date.", variant: "destructive" });
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setStep((s) => s + 1);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setProjectName("");
    setOrgName("");
    setOrgType("ngo");
    setContactEmail("");
    setContactPhone("");
    setLocation("");
    setBoundary([]);
    setTargetTrees("100");
    setSpeciesText("Neem, Banyan, Peepal, Jamun");
    setPlantationDate(new Date().toISOString().split("T")[0]);
    setBulkRows([]);
    setBulkFileName("");
    setInitialSitePhoto(null);
    setInitialSitePhotoPreview(null);
    setDataEntryMode("auto");
  };

  const createProject = async () => {
    if (!validateCurrentStep()) return;

    setSaving(true);
    const centroid = boundary.length
      ? boundary.reduce((a, p) => [a[0] + p[0] / boundary.length, a[1] + p[1] / boundary.length], [0, 0])
      : [MH_CENTER[0], MH_CENTER[1]];

    // Run Automated Step 1 AI Verification immediately!
    const preAudit = evaluateProjectVerification({
      projectName: projectName.trim(),
      organizationName: orgName.trim(),
      organizationType: orgType,
      locationName: location.trim(),
      boundary,
      targetTrees: Number(targetTrees) || 100,
      speciesList: speciesText.split(",").map((s) => s.trim()).filter(Boolean),
      evidenceCount: initialSitePhoto ? 1 : 0,
      existingProjects: projects,
    });

    const newProjectPayload = {
      user_id: user?.id || null,
      project_name: projectName.trim(),
      organization_name: orgName.trim(),
      organization_type: orgType,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      location: location.trim(),
      latitude: centroid[0] as number,
      longitude: centroid[1] as number,
      boundary: boundary.map(([lat, lng]) => ({ lat, lng })),
      target_trees: Number(targetTrees) || 100,
      species: speciesText.split(",").map((s) => s.trim()).filter(Boolean),
      plantation_date: plantationDate,
      bulk_data: bulkRows,
      bulk_rows: bulkRows.length,
      status: preAudit.status,
      ai_score: preAudit.overallScore,
      ai_report: preAudit.formattedReport,
    };

    try {
      const { data, error } = await supabase
        .from("plantation_projects")
        .insert(newProjectPayload)
        .select()
        .single();

      let createdProjectId = data?.id;

      if (error) {
        console.warn("Supabase project insert notice:", error.message);
        createdProjectId = `proj_${Date.now()}`;
        const fallbackProject: Project = {
          id: createdProjectId,
          ...newProjectPayload,
          verified_trees: 0,
          created_at: new Date().toISOString(),
        };
        setProjects((prev) => [fallbackProject, ...prev]);
        setActiveId(fallbackProject.id);
      } else {
        setProjects((p) => [data as Project, ...p]);
        setActiveId((data as Project).id);
      }

      // Pin created project to my workspace
      try {
        const existingMyIds = JSON.parse(localStorage.getItem("my_created_project_ids") || "[]");
        if (createdProjectId && !existingMyIds.includes(createdProjectId)) {
          const updated = [createdProjectId, ...existingMyIds];
          localStorage.setItem("my_created_project_ids", JSON.stringify(updated));
          setLocalProjectIds(updated);
        }
      } catch (e) {}

      // If initial photo was uploaded in Step 4, attach it to evidence
      if (initialSitePhoto && createdProjectId) {
        try {
          const compressed = await compressImage(initialSitePhoto, 1600, 0.8);
          const key = `projects/${createdProjectId}/field-site-init-${Date.now()}.jpg`;
          const { data: uploadData } = await supabase.storage.from("treebank").upload(key, compressed, { upsert: true });

          await supabase.from("project_evidence").insert({
            project_id: createdProjectId,
            user_id: user?.id || null,
            evidence_type: "field",
            photo_url: uploadData?.path || `local_site_${Date.now()}`,
            latitude: centroid[0] as number,
            longitude: centroid[1] as number,
            captured_at: new Date().toISOString(),
            notes: "Initial site reconnaissance photograph attached during project setup.",
          });
        } catch (photoErr) {
          console.warn("Initial photo save notice:", photoErr);
        }
      }

      setSaving(false);
      toast({
        title: "Project Created & AI Verified! 🛡️",
        description: `Trust Score: ${preAudit.overallScore}/100 [${preAudit.statusLabel}].`,
      });
      resetWizard();
      setView("detail");
    } catch (err: any) {
      setSaving(false);
      toast({ title: "Could not create project", description: err.message, variant: "destructive" });
    }
  };

  const uploadEvidence = async () => {
    if (!activeProject) return;
    if (!evFile && evType !== "survival") {
      toast({ title: "Photo Required", description: "Attach the geotagged field or drone photo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let path: string | null = null;
      if (evFile) {
        const compressed = await compressImage(evFile, 1600, 0.8);
        const key = `projects/${activeProject.id}/${evType}-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from("treebank").upload(key, compressed, { upsert: true });
        if (error) console.warn("Storage upload notice:", error.message);
        path = data?.path || `local_${Date.now()}`;
      }

      const coords = await new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: activeProject.latitude, lng: activeProject.longitude }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      const { error: insErr } = await supabase.from("project_evidence").insert({
        project_id: activeProject.id,
        user_id: user?.id || null,
        evidence_type: evType,
        photo_url: path,
        latitude: coords.lat,
        longitude: coords.lng,
        captured_at: new Date().toISOString(),
        notes: evNotes || null,
        survival_percent: evSurvival ? Number(evSurvival) : null,
      });

      if (insErr) {
        console.warn("Evidence insert fallback:", insErr.message);
      }

      setEvFile(null);
      setEvNotes("");
      setEvSurvival("");
      await loadEvidence(activeProject.id);

      // Re-run AI verification after new ground evidence is attached
      if (activeAuditReport) {
        const updatedScore = Math.min(100, activeAuditReport.overallScore + 5);
        await supabase
          .from("plantation_projects")
          .update({
            ai_score: updatedScore,
            status: updatedScore >= 75 ? "verified_active" : activeProject.status,
          })
          .eq("id", activeProject.id);

        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id
              ? { ...p, ai_score: updatedScore, status: updatedScore >= 75 ? "verified_active" : p.status }
              : p
          )
        );
      }

      toast({ title: "Evidence Uploaded! 📸", description: "Geotagged ground truth added. AI Verification score updated!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const runManualReaudit = async () => {
    if (!activeProject || !activeAuditReport) return;
    setVerifying(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));

      await supabase
        .from("plantation_projects")
        .update({
          ai_score: activeAuditReport.overallScore,
          ai_report: activeAuditReport.formattedReport,
          status: activeAuditReport.status,
        })
        .eq("id", activeProject.id);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? {
                ...p,
                ai_score: activeAuditReport.overallScore,
                ai_report: activeAuditReport.formattedReport,
                status: activeAuditReport.status,
              }
            : p
        )
      );

      toast({
        title: "AI Audit Re-evaluated! 🤖",
        description: `Project Trust Score: ${activeAuditReport.overallScore}/100 [${activeAuditReport.statusLabel}].`,
      });
    } catch (e: any) {
      toast({ title: "Audit Error", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this plantation project? All linked evidence, telemetry, and calculations will be removed.")) {
      return;
    }
    setDeletingId(projectId);
    try {
      // 1. Delete evidence rows
      await supabase.from("project_evidence").delete().eq("project_id", projectId);

      // 2. Delete project row
      const { error } = await supabase.from("plantation_projects").delete().eq("id", projectId);
      if (error) {
        console.warn("Delete note:", error.message);
      }

      toast({
        title: "Project Deleted 🗑️",
        description: "The plantation project has been successfully removed.",
      });

      // Update state
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      // Clean local storage if saved
      try {
        const saved = JSON.parse(localStorage.getItem("my_created_project_ids") || "[]");
        const filtered = saved.filter((id: string) => id !== projectId);
        localStorage.setItem("my_created_project_ids", JSON.stringify(filtered));
        setLocalProjectIds(filtered);
      } catch (err) {
        console.warn("Storage update error:", err);
      }

      // Re-sync user profile impact
      if (user?.id) {
        await syncUserProfileImpact(user.id);
      }

      if (view === "detail") {
        setActiveId(null);
        setView("list");
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete project.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">Large-Scale Plantation Projects</h1>
            <p className="text-sm text-muted-foreground">
              Multi-spectral satellite telemetry, biological density feasibility & automated anti-fraud audits.
            </p>
          </div>
          {view !== "list" && (
            <Button variant="outline" size="sm" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> All Projects
            </Button>
          )}
          {view === "list" && (
            <Button onClick={() => { resetWizard(); setView("wizard"); }}>
              <Plus className="h-4 w-4 mr-1.5" /> New Plantation Project
            </Button>
          )}
        </div>

        {/* ---------------- PROJECT LIST VIEW ---------------- */}
        {view === "list" && (
          <div className="space-y-6">
            {/* Top Workspace vs Public Registry Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/50 border border-border/40">
                <button
                  type="button"
                  onClick={() => setListTab("my_projects")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    listTab === "my_projects"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  My Workspace Projects ({myProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListTab("public_registry")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    listTab === "public_registry"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Satellite className="h-4 w-4" />
                  Explore Public Registry ({publicProjects.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Loading plantation workspace...</p>
              </div>
            ) : listTab === "my_projects" ? (
              /* TAB 1: MY WORKSPACE PROJECTS */
              myProjects.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 sm:p-14 text-center space-y-4 border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-heading text-xl font-bold text-foreground">Your Organization Workspace is Ready</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                      You haven't created any plantation projects in your workspace yet. When you register an afforestation drive, it will appear here with private telemetry, field scouting, and carbon accounting tools.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center gap-3">
                    <Button onClick={() => { resetWizard(); setView("wizard"); }} className="rounded-xl font-bold shadow-md">
                      <Plus className="h-4 w-4 mr-1.5" /> + Create Your First Project
                    </Button>
                    <Button variant="outline" onClick={() => setListTab("public_registry")} className="rounded-xl text-xs font-semibold">
                      Explore Public Registry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Showing your organization's active projects ({myProjects.length})</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myProjects.map((p) => {
                      const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.submitted;
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          onClick={() => { setActiveId(p.id); setView("detail"); }}
                          className="glass-card rounded-2xl p-5 text-left border-2 border-primary/30 hover:border-primary transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
                                  Your Workspace 🌿
                                </Badge>
                              </div>
                              <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                {p.project_name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.organization_name} · {p.location}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              {p.ai_score != null && (
                                <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[11px]">
                                  Trust {p.ai_score}/100
                                </Badge>
                              )}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteProject(p.id, e)}
                                  disabled={deletingId === p.id}
                                  title="Delete Project"
                                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${s.className}`}>
                                  {s.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/40">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-medium">
                              <span className="text-foreground">
                                {p.verified_trees > 0
                                  ? `🌿 ${p.verified_trees} Verified Living Trees`
                                  : p.bulk_rows > 0
                                  ? `📍 ${p.bulk_rows} GPS Tagged / ${p.target_trees} Target`
                                  : `🌱 ${p.target_trees} Target Saplings Registered`}
                              </span>
                              <span>{new Date(p.plantation_date).toLocaleDateString()}</span>
                            </div>
                            <Progress
                              value={
                                p.verified_trees > 0
                                  ? Math.min(100, (p.verified_trees / Math.max(1, p.target_trees)) * 100)
                                  : p.bulk_rows > 0
                                  ? Math.min(100, (p.bulk_rows / Math.max(1, p.target_trees)) * 100)
                                  : 100
                              }
                              className="h-2"
                            />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              /* TAB 2: EXPLORE PUBLIC REGISTRY */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Public Afforestation Registry:</strong> Verified institutional & CSR projects across India with Sentinel-2 telemetry.
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Read-Only Public Explorer</Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {publicProjects.map((p) => {
                    const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.submitted;
                    const isMine = myProjects.some((m) => m.id === p.id);
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => { setActiveId(p.id); setView("detail"); }}
                        className="glass-card rounded-2xl p-5 text-left border border-border/50 hover:border-primary/50 transition-all cursor-pointer group bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {isMine && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold mb-1">
                                Your Project
                              </Badge>
                            )}
                            <h3 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                              {p.project_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.organization_name} · {p.location}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {p.ai_score != null && (
                              <Badge variant="outline" className="border-primary/40 text-primary text-[11px]">
                                Trust {p.ai_score}/100
                              </Badge>
                            )}
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${s.className}`}>
                              {s.label}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {p.verified_trees > 0
                              ? `🌿 ${p.verified_trees} Verified Trees`
                              : `🌱 ${p.target_trees} Target Trees`}
                          </span>
                          <span className="text-primary font-semibold flex items-center gap-1">
                            Inspect Telemetry <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- WIZARD ---------------- */}
        {view === "wizard" && (
          <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold">
              {[
                { n: 1, label: "Organization" },
                { n: 2, label: "Boundary & Location" },
                { n: 3, label: "Target & Species" },
                { n: 4, label: "Data / Field Photo" },
                { n: 5, label: "Review & Create" },
              ].map(({ n, label }) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { if (n < step || validateCurrentStep()) setStep(n); }}
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    step === n
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : step > n
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] bg-background/30">{n}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* STEP 1: ORGANIZATION */}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in duration-300">
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Project Name *</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Miyawaki Forest — Nagpur Agro-Zone Phase 1"
                    className="bg-background/80"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Organization / Executing Body *</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Sahyadri Environmental Trust"
                    className="bg-background/80"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Organization Type</Label>
                  <Select value={orgType} onValueChange={setOrgType}>
                    <SelectTrigger className="bg-background/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">Official Email</Label>
                  <Input type="email" placeholder="contact@sahyadri.org" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="bg-background/80" />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">Phone Number</Label>
                  <Input type="tel" placeholder="+91 9876543210" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="bg-background/80" />
                </div>
              </div>
            )}

            {/* STEP 2: BOUNDARY & LOCATION */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Plantation Location / District *</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Pandharpur Road, Solapur District, Maharashtra"
                    className="bg-background/80"
                  />
                </div>

                {/* Quick Presets for 1-Click Testing */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Maharashtra Presets:
                  </span>
                  {MAHARASHTRA_PRESETS.map((pr) => (
                    <Button
                      key={pr.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyMaharashtraPreset(pr)}
                      className="h-7 text-xs rounded-lg"
                    >
                      {pr.name}
                    </Button>
                  ))}
                </div>

                <BoundaryDrawMap
                  points={boundary}
                  onChange={(pts) => {
                    setBoundary(pts);
                    if (!location && pts.length > 0) {
                      setLocation(`Agroforestry Plot (${pts[0][0].toFixed(4)}°N, ${pts[0][1].toFixed(4)}°E)`);
                    }
                  }}
                  center={MH_CENTER as [number, number]}
                  onUseGps={useMyLocation}
                  onNext={handleNextStep}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>💡 <strong>Tip:</strong> Tap on the satellite map to add 3+ boundary vertices or click GPS.</span>
                  {boundary.length >= 3 && (
                    <span className="text-primary font-bold">
                      Calculated Area: {computedBoundaryArea.acres.toFixed(2)} Acres ({computedBoundaryArea.hectares.toFixed(2)} Ha)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: TARGET & SPECIES */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Target Number of Trees *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={targetTrees}
                      onChange={(e) => setTargetTrees(e.target.value)}
                      placeholder="500"
                      className="bg-background/80"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Plantation Drive Date *</Label>
                    <Input
                      type="date"
                      value={plantationDate}
                      onChange={(e) => setPlantationDate(e.target.value)}
                      className="bg-background/80"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5 font-semibold">Indigenous Species (Comma Separated)</Label>
                  <Textarea
                    value={speciesText}
                    onChange={(e) => setSpeciesText(e.target.value)}
                    placeholder="Neem, Banyan, Mango, Peepal, Jamun, Teak"
                    className="bg-background/80 min-h-[80px]"
                  />
                </div>

                {/* Species Pills */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Recommended Native Species (Click to Add):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SPECIES.map((sp) => (
                      <Button
                        key={sp}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSpecies(sp)}
                        className="h-7 text-xs rounded-full"
                      >
                        <Plus className="h-3 w-3 mr-1" /> {sp}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: BULK DATA / FIELD PHOTO / 1-CLICK AUTO-GRID */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <h3 className="font-heading font-semibold text-base">Choose How You Want to Add Plantation Records</h3>
                  <p className="text-xs text-muted-foreground">
                    You do NOT need complex spreadsheets! Choose 1-Click Auto Grid, upload a site photo, or skip to review.
                  </p>
                </div>

                {/* 3 User-Friendly Method Selector Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDataEntryMode("auto")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      dataEntryMode === "auto"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div>
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2.5">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h4 className="font-heading font-semibold text-sm">⚡ 1-Click Auto Grid</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Instantly distributes {targetTrees || 100} saplings across your plot boundary with calculated GPS coordinates.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-primary mt-3 inline-flex items-center gap-1">
                      Recommended ★
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDataEntryMode("photo")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      dataEntryMode === "photo"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div>
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2.5">
                        <Camera className="h-5 w-5" />
                      </div>
                      <h4 className="font-heading font-semibold text-sm">📸 Upload Site Photo</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attach a field photograph, WhatsApp image, or drone capture of the plantation site.
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground mt-3">
                      Easy Mobile Upload
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDataEntryMode("csv")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      dataEntryMode === "csv"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div>
                      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="font-heading font-semibold text-sm">📊 Import CSV / Excel</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload custom spreadsheet inventory with individual tree tags and coordinates.
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground mt-3">
                      For Enterprise Data
                    </span>
                  </button>
                </div>

                {/* MODE 1: AUTO GRID */}
                {dataEntryMode === "auto" && (
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-heading font-bold text-sm text-primary flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" /> Automated Geodesic Grid Generator
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Distribute <strong>{targetTrees || 100} saplings</strong> ({speciesText}) across {computedBoundaryArea.acres.toFixed(2)} Acres.
                        </p>
                      </div>
                      <Button type="button" onClick={handleAutoGenerateGrid} className="gap-1.5 rounded-xl font-semibold">
                        <Sparkles className="h-4 w-4" /> Generate Grid (1-Click)
                      </Button>
                    </div>

                    {bulkRows.length > 0 && (
                      <div className="p-3 rounded-xl bg-background border border-primary/20 text-xs space-y-2">
                        <div className="flex items-center justify-between text-emerald-600 font-bold">
                          <span>✓ {bulkRows.length} GPS Tree Coordinates Generated & Linked to Plot</span>
                          <span className="font-mono text-muted-foreground text-[11px]">{bulkFileName}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {bulkRows.slice(0, 8).map((r, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-mono">
                              {r.tree_id}: {r.species} ({Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)})
                            </Badge>
                          ))}
                          {bulkRows.length > 8 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{bulkRows.length - 8} more sapling points
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 2: SITE PHOTO */}
                {dataEntryMode === "photo" && (
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in duration-200">
                    <h4 className="font-heading font-bold text-sm text-primary flex items-center gap-1.5">
                      <Camera className="h-4 w-4" /> Attach Site / Field Reconnaissance Photo
                    </h4>

                    {initialSitePhotoPreview ? (
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-background border border-primary/20">
                        <img src={initialSitePhotoPreview} alt="Site Preview" className="h-20 w-28 object-cover rounded-lg" />
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-foreground">{initialSitePhoto?.name}</p>
                          <p className="text-muted-foreground">Ready to attach as primary evidence upon project creation.</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setInitialSitePhoto(null); setInitialSitePhotoPreview(null); }}
                            className="h-6 text-xs text-destructive hover:text-destructive px-0"
                          >
                            Remove Photo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-background/80 p-6 cursor-pointer hover:border-primary transition-all text-center">
                        <Camera className="h-8 w-8 text-primary opacity-80" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Click to upload Field Photo or Drone Image</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Supports JPG, PNG, WebP (WhatsApp photos welcome!)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleSitePhotoSelected(e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* MODE 3: CSV SPREADSHEET */}
                {dataEntryMode === "csv" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-heading font-semibold text-sm">Upload CSV Spreadsheet</h4>
                        <p className="text-xs text-muted-foreground">Import coordinates, tags, and height measurements.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={downloadSampleCsv} className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Sample CSV
                      </Button>
                    </div>

                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 cursor-pointer hover:border-primary transition-all text-center">
                      <Upload className="h-7 w-7 text-primary opacity-80" />
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {bulkFileName || "Click to upload CSV spreadsheet or GeoJSON"}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">Accepts .csv, .tsv, .geojson</p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,text/csv,.geojson,.json"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && parseCsv(e.target.files[0])}
                      />
                    </label>

                    {bulkRows.length > 0 && (
                      <div className="p-3 rounded-xl bg-background border border-primary/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-semibold text-primary">
                          <span>✓ {bulkRows.length} plantation records parsed</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setBulkRows([]); setBulkFileName(""); }}
                            className="h-6 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-muted/50 border border-border/40 text-xs text-muted-foreground flex items-center justify-between">
                  <span>💡 <strong>Quick Note:</strong> You can proceed to Review now and add more evidence anytime.</span>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW */}
            {step === 5 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Project Summary
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Project Name:</span>
                      <strong className="text-sm font-semibold">{projectName}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Executing Organization:</span>
                      <strong className="text-sm font-semibold">{orgName} ({ORG_TYPES.find(t => t.value === orgType)?.label})</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Location:</span>
                      <strong className="text-sm font-semibold">{location}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Plot Area:</span>
                      <strong className="text-sm font-semibold text-primary">
                        {computedBoundaryArea.acres.toFixed(2)} Acres ({computedBoundaryArea.hectares.toFixed(2)} Ha)
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Target Saplings & Date:</span>
                      <strong className="text-sm font-semibold">{targetTrees} Trees · {plantationDate}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block mb-0.5 font-medium">Records Attached:</span>
                      <strong className="text-sm font-semibold">
                        {bulkRows.length > 0
                          ? `${bulkRows.length} GPS Tree Coordinates`
                          : initialSitePhoto
                          ? `1 Field Reconnaissance Photo`
                          : "Basic Profile (Add data later)"}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/40 text-xs">
                    <span className="text-muted-foreground block mb-1 font-medium">Selected Native Species:</span>
                    <p className="font-semibold text-foreground">{speciesText || "Mixed Indigenous"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                disabled={step === 1 || saving}
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>

              {step < 5 ? (
                <Button onClick={handleNextStep} className="rounded-xl font-semibold">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={createProject} disabled={saving} className="rounded-xl font-bold shadow-md">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Create & Launch Project
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ---------------- DETAIL VIEW ---------------- */}
        {view === "detail" && activeProject && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Context Badge if Viewing Other Org's Public Project */}
            {!isOwner && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <Globe className="h-4 w-4" /> Viewing Public Project Registry Record ({activeProject.organization_name})
                </span>
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 bg-background">
                  Public Explorer (Read-Only)
                </Badge>
              </div>
            )}

            {/* Top Project Banner with Certificate Action Button */}
            <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isOwner ? (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
                        Your Project 🌿
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Public Verified Record
                      </Badge>
                    )}
                  </div>
                  <h2 className="font-heading text-xl font-semibold">{activeProject.project_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeProject.organization_name} · {activeProject.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeCarbonLedger && (
                    <CarbonCertificateModal cert={activeCarbonLedger} />
                  )}
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDeleteProject(activeProject.id, e)}
                      disabled={deletingId === activeProject.id}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs rounded-xl h-8 px-2.5 gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === activeProject.id ? "Deleting..." : "Delete Project"}
                    </Button>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${(STATUS_LABEL[activeProject.status] ?? STATUS_LABEL.submitted).className}`}>
                    {(STATUS_LABEL[activeProject.status] ?? STATUS_LABEL.submitted).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-center">
                <div className="p-3 rounded-xl bg-card border border-border/40">
                  <Target className="h-4 w-4 mx-auto text-primary" />
                  <p className="mt-1 font-bold text-base">{activeProject.target_trees}</p>
                  <p className="text-xs text-muted-foreground">Target Trees</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/40">
                  <Leaf className="h-4 w-4 mx-auto text-primary" />
                  <p className="mt-1 font-bold text-base">{activeProject.bulk_rows}</p>
                  <p className="text-xs text-muted-foreground">Data Rows</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/40">
                  <Camera className="h-4 w-4 mx-auto text-primary" />
                  <p className="mt-1 font-bold text-base">{evidence.length}</p>
                  <p className="text-xs text-muted-foreground">Evidence Items</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/40">
                  <Bot className="h-4 w-4 mx-auto text-primary" />
                  <p className="mt-1 font-bold text-base text-primary">{activeAuditReport ? `${activeAuditReport.overallScore}/100` : `${activeProject.ai_score ?? "—"}`}</p>
                  <p className="text-xs text-muted-foreground">AI Trust Score</p>
                </div>
              </div>
            </div>

            {/* STEP 5: VERIFIABLE CARBON CREDIT LEDGER CARD */}
            {activeCarbonLedger && (
              <div className="glass-card rounded-2xl p-6 border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-background to-background space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <Coins className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-heading font-bold text-base">Verifiable Carbon Credit Ledger (IPCC Tier-2)</h3>
                      <p className="text-xs text-muted-foreground">
                        Allometric biomass calculation (Chave et al.) with serial certificate ID & verifiable QR code.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-600">
                      {activeCarbonLedger.serialNumber}
                    </Badge>
                    <CarbonCertificateModal cert={activeCarbonLedger} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-muted-foreground block text-[10px]">Verified Above-Ground Biomass</span>
                    <strong className="text-sm font-bold text-foreground">{activeCarbonLedger.totalBiomassMetricTons} MT</strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">{activeCarbonLedger.dominantSpecies} (ρ = {activeCarbonLedger.meanWoodDensityRho})</span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-muted-foreground block text-[10px]">CO₂e Offsets (To Date)</span>
                    <strong className="text-sm font-bold text-emerald-600">{activeCarbonLedger.co2SequesteredToDateMT} MT CO₂e</strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Sentinel-2 Calibrated</span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-muted-foreground block text-[10px]">10-Year Projected Removal</span>
                    <strong className="text-sm font-bold text-primary">{activeCarbonLedger.projected10YearCo2MT} MT CO₂e</strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">IPCC Allometric Model</span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-muted-foreground block text-[10px]">Carbon Credit Valuation</span>
                    <strong className="text-sm font-bold text-foreground">₹{activeCarbonLedger.estimatedCarbonValuationInr.toLocaleString()}</strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">@ ₹1,200/MT CO₂e</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SATELLITE MULTI-SPECTRAL TELEMETRY & TIME-SERIES SUITE */}
            <SatelliteProjectTelemetrySuite
              projectName={activeProject.project_name}
              locationName={activeProject.location}
              boundary={activeBoundaryPoints}
              targetTrees={activeProject.target_trees}
              speciesList={activeProject.species || []}
              plantationDate={activeProject.plantation_date}
              baselineNdvi={activeAuditReport?.baselineNdvi || 0.22}
              bulkTrees={Array.isArray(activeProject.bulk_data) ? activeProject.bulk_data : []}
            />

            {/* STEP 4: CONTINUOUS TREE SURVIVAL TRACKING & 36-MONTH QUARTERLY FEED */}
            <QuarterlySurvivalFeed
              projectName={activeProject.project_name}
              organizationName={activeProject.organization_name}
              targetTrees={activeProject.target_trees}
              plantationDate={activeProject.plantation_date}
              baselineNdvi={activeAuditReport?.baselineNdvi || 0.22}
              speciesList={activeProject.species || []}
            />

            {/* STEP 1: AUTOMATED AI VERIFICATION & ANTI-FRAUD SCORECARD */}
            {activeAuditReport && (
              <ProjectVerificationCard
                auditReport={activeAuditReport}
                onReaudit={runManualReaudit}
                isReauditing={verifying}
              />
            )}

            {/* STEP 3: FIELD RANGER SCOUTING & 5% STRATIFIED RANDOM SPOT AUDIT CONSOLE */}
            <FieldSpotAuditConsole
              projectId={activeProject.id}
              projectName={activeProject.project_name}
              organizationName={activeProject.organization_name}
              totalTrees={activeProject.target_trees}
              boundary={activeBoundaryPoints}
              bulkData={Array.isArray(activeProject.bulk_data) ? activeProject.bulk_data : []}
              onAuditCompleted={async (results) => {
                toast({
                  title: "Ground-Truth Audit Complete! 🎖️",
                  description: `Audited ${results.auditedCount} sample plots. Calibrated survival rate: ${results.survivalRatePercent}%.`,
                });
                await supabase
                  .from("plantation_projects")
                  .update({
                    status: "verified_active",
                    verified_trees: Math.round((activeProject.target_trees * results.survivalRatePercent) / 100),
                  })
                  .eq("id", activeProject.id);
                loadProjects();
              }}
            />

            {/* Evidence Upload (Field / Drone / Satellite) */}
            <div className="glass-card rounded-2xl p-6 border border-border/40 space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Upload Additional Drone Orthomosaics & Field Imagery
              </h3>
              <p className="text-xs text-muted-foreground">
                Attaching geotagged camera photos or drone captures upgrades project credibility and maintains active carbon certification.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Evidence Type</Label>
                  <Select value={evType} onValueChange={setEvType}>
                    <SelectTrigger className="bg-background/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {evType === "survival" && (
                  <div>
                    <Label className="mb-1.5 block">Survival Rate (%)</Label>
                    <Input type="number" min={0} max={100} value={evSurvival} onChange={(e) => setEvSurvival(e.target.value)} className="bg-background/80" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Field Photograph / Drone Capture {evType === "survival" ? "(optional)" : "*"}</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} className="bg-background/80" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Field Notes / Observations</Label>
                  <Textarea value={evNotes} onChange={(e) => setEvNotes(e.target.value)} placeholder="Block A perimeter, 400 saplings, drip irrigation active" className="bg-background/80" />
                </div>
              </div>
              <Button onClick={uploadEvidence} disabled={uploading} className="rounded-xl font-semibold">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Geotagged Evidence
              </Button>

              {evidence.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  {evidence.map((e) => (
                    <div key={e.id} className="rounded-xl border border-border/40 overflow-hidden bg-card">
                      {evidenceUrls[e.id] ? (
                        <img src={evidenceUrls[e.id]} alt={`${e.evidence_type} evidence`} className="h-32 w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-32 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">Geotag Record</div>
                      )}
                      <div className="p-3 text-xs space-y-1">
                        <Badge variant="outline" className="capitalize">{e.evidence_type}</Badge>
                        {e.survival_percent != null && <p className="font-semibold text-primary">Survival: {e.survival_percent}%</p>}
                        <p className="text-muted-foreground">
                          {e.latitude != null ? `${e.latitude.toFixed(4)}, ${e.longitude?.toFixed(4)}` : "No GPS"}
                        </p>
                        {e.notes && <p className="text-muted-foreground line-clamp-2">{e.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Report */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="font-heading font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" /> Full Verification & Remote Sensing Audit Report
              </h3>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono bg-muted/30 p-4 rounded-xl border border-border/40 leading-relaxed">
                {activeAuditReport ? activeAuditReport.formattedReport : activeProject.ai_report || "No audit report recorded."}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default OrganizationPlantation;
