import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban, Plus, Search, Filter, MapPin, TreePine, Calendar,
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, Layers, FileText,
  Building2, ArrowRight, Upload, Trash2, Edit3, Eye, ArrowUpRight,
  RefreshCw, Check, X, ShieldAlert, Sparkles, Navigation, Globe,
  FileSpreadsheet, Activity, ChevronRight, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  Project,
  ProjectBoundary,
  ProjectStatus,
  ProjectType,
  BoundaryType,
  Organization,
} from "@/types/coreDatabase";
import {
  projectService,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectDetailsWithCompartments,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/services/projectService";
import { organizationService } from "@/services/organizationService";
import BoundaryDrawMap from "@/components/BoundaryDrawMap";
import { ProjectMapViewer } from "@/components/gis/ProjectMapViewer";
import { BoundarySystemMapViewer } from "@/components/gis/BoundarySystemMapViewer";
import { Map as MapIcon, LayoutGrid } from "lucide-react";
import { LatLngPoint } from "@/lib/projectOnboardingService";
import { toast } from "sonner";

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "reforestation", label: "Native Reforestation" },
  { value: "agroforestry", label: "Agroforestry & Farming" },
  { value: "urban_greenery", label: "Urban Greenery & Miyawaki" },
  { value: "community", label: "Community Social Forestry" },
  { value: "corporate_csr", label: "Corporate CSR Plantation" },
  { value: "government_reserve", label: "Government Forest Reserve" },
];

const BOUNDARY_TYPE_OPTIONS: { value: BoundaryType; label: string }[] = [
  { value: "planting_zone", label: "Active Planting Zone" },
  { value: "buffer_zone", label: "Ecological Buffer Zone" },
  { value: "exclusion_zone", label: "Exclusion / Conservation Zone" },
  { value: "waterbody", label: "Waterbody / Wetland Buffer" },
];

const COMMON_SPECIES = [
  "Neem (Azadirachta indica)",
  "Banyan (Ficus benghalensis)",
  "Peepal (Ficus religiosa)",
  "Teak (Tectona grandis)",
  "Mahua (Madhuca longifolia)",
  "Jamun (Syzygium cumini)",
  "Shisham (Dalbergia sissoo)",
  "Bamboo (Bambusoideae)",
  "Mango (Mangifera indica)",
  "Miyawaki Dense Blend",
];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; badgeClass: string; icon: any; description: string }> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    icon: Edit3,
    description: "Project details and boundaries are being configured.",
  },
  submitted: {
    label: "Submitted",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: Clock,
    description: "Submitted for initial remote sensing and agronomic screening.",
  },
  under_review: {
    label: "Under Review",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: AlertTriangle,
    description: "Government auditor / platform administrator reviewing evidence.",
  },
  active: {
    label: "Active & Verified",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
    description: "Approved for planting, GPS tagging, and Sentinel-2 satellite MRV.",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
    description: "Planting targets achieved. Transitioned to long-term monitoring.",
  },
  suspended: {
    label: "Suspended",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: ShieldAlert,
    description: "Temporarily held due to compliance review or cadastral conflict.",
  },
};

export const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "gis_map" | "boundary_system">("grid");

  // Selected project modal state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsWithCompartments | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create Project Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("community");
  const [newProjectOrgId, setNewProjectOrgId] = useState<string>("none");
  const [newTargetTrees, setNewTargetTrees] = useState<number>(1000);
  const [newLocationName, setNewLocationName] = useState("");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEndDate, setNewEndDate] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(["Neem (Azadirachta indica)"]);
  const [initialBoundaryPoints, setInitialBoundaryPoints] = useState<LatLngPoint[]>([]);

  // Add Boundary Compartment Dialog
  const [isAddBoundaryOpen, setIsAddBoundaryOpen] = useState(false);
  const [boundaryName, setBoundaryName] = useState("");
  const [compartmentCode, setCompartmentCode] = useState("");
  const [boundaryType, setBoundaryType] = useState<BoundaryType>("planting_zone");
  const [boundaryPoints, setBoundaryPoints] = useState<LatLngPoint[]>([]);
  const [isSavingBoundary, setIsSavingBoundary] = useState(false);

  // Status transition reason dialog
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState<ProjectStatus | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  // Load user organizations and projects
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projRes, orgRes] = await Promise.all([
        projectService.getProjects(),
        user?.id ? organizationService.getUserOrganizations(user.id) : Promise.resolve([]),
      ]);

      setProjects(projRes.projects);
      setUserOrganizations(orgRes);
    } catch (err) {
      toast.error("Failed to load project registry.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load details when selected project changes
  const loadProjectDetails = useCallback(async (id: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await projectService.getProjectDetails(id);
      setProjectDetails(details);
    } catch (err) {
      toast.error("Failed to load project details.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    } else {
      setProjectDetails(null);
    }
  }, [selectedProjectId, loadProjectDetails]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location_name && p.location_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
      const matchesType = selectedType === "all" || p.project_type === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchQuery, selectedStatus, selectedType]);

  // Species toggle helper
  const toggleSpecies = (species: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(species) ? prev.filter((s) => s !== species) : [...prev, species]
    );
  };

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name.");
      return;
    }
    if (newTargetTrees <= 0) {
      toast.error("Target trees must be greater than 0.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload: CreateProjectPayload = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
        project_type: newProjectType,
        organization_id: newProjectOrgId !== "none" ? newProjectOrgId : null,
        target_trees: newTargetTrees,
        location_name: newLocationName.trim() || undefined,
        species_list: selectedSpecies,
        start_date: newStartDate,
        end_date: newEndDate || undefined,
        created_by: user?.id || null,
        status: "draft",
        initial_boundary:
          initialBoundaryPoints.length >= 3
            ? {
                points: initialBoundaryPoints,
                boundary_name: "Primary Planting Zone",
                compartment_code: "COMP-A1",
                boundary_type: "planting_zone",
              }
            : undefined,
      };

      const res = await projectService.createProject(payload);
      if (res.success && res.project) {
        toast.success(`Project "${res.project.name}" created successfully!`);
        setIsCreateOpen(false);
        resetCreateForm();
        await loadData();
        setSelectedProjectId(res.project.id);
      } else {
        toast.error(res.error || "Failed to create project.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setNewProjectType("community");
    setNewProjectOrgId("none");
    setNewTargetTrees(1000);
    setNewLocationName("");
    setSelectedSpecies(["Neem (Azadirachta indica)"]);
    setInitialBoundaryPoints([]);
  };

  // Handle Status Transition
  const handleInitiateTransition = (nextStatus: ProjectStatus) => {
    setTargetTransitionStatus(nextStatus);
    setTransitionReason("");
    setIsTransitionOpen(true);
  };

  const handleExecuteTransition = async () => {
    if (!selectedProjectId || !targetTransitionStatus) return;
    setIsSubmittingTransition(true);
    try {
      const res = await projectService.transitionProjectStatus(
        selectedProjectId,
        targetTransitionStatus,
        user?.id,
        transitionReason.trim() || undefined
      );

      if (res.success) {
        toast.success(`Project status transitioned to ${STATUS_CONFIG[targetTransitionStatus].label}`);
        setIsTransitionOpen(false);
        await loadProjectDetails(selectedProjectId);
        await loadData();
      } else {
        toast.error(res.error || "Transition rejected by state machine.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to transition status.");
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  // Handle Add Boundary Compartment
  const handleSaveBoundary = async () => {
    if (!selectedProjectId) return;
    if (boundaryPoints.length < 3) {
      toast.error("Please plot at least 3 GPS vertices on the map.");
      return;
    }

    setIsSavingBoundary(true);
    try {
      const res = await projectService.saveProjectBoundary(
        selectedProjectId,
        {
          boundary_name: boundaryName.trim() || `Compartment ${projectDetails?.boundaries.length ? projectDetails.boundaries.length + 1 : 1}`,
          compartment_code: compartmentCode.trim() || `COMP-${(projectDetails?.boundaries.length || 0) + 1}`,
          boundary_type: boundaryType,
          points: boundaryPoints,
        },
        user?.id
      );

      if (res.success) {
        toast.success("Boundary compartment successfully registered!");
        setIsAddBoundaryOpen(false);
        setBoundaryPoints([]);
        setBoundaryName("");
        setCompartmentCode("");
        await loadProjectDetails(selectedProjectId);
        await loadData();
      } else {
        toast.error(res.error || "Failed to save boundary.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save boundary.");
    } finally {
      setIsSavingBoundary(false);
    }
  };

  // Handle Delete Boundary
  const handleDeleteBoundary = async (boundaryId: string) => {
    if (!selectedProjectId) return;
    if (!confirm("Are you sure you want to remove this cadastral boundary compartment?")) return;

    try {
      const res = await projectService.deleteProjectBoundary(boundaryId, selectedProjectId, user?.id);
      if (res.success) {
        toast.success("Boundary compartment deleted.");
        await loadProjectDetails(selectedProjectId);
        await loadData();
      } else {
        toast.error(res.error || "Failed to delete boundary.");
      }
    } catch (err) {
      toast.error("Failed to delete boundary.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 gap-1 text-xs">
              <FolderKanban className="h-3 w-3" />
              Phase 3 Multi-Tenant MRV
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Cadastral & Target Engine</span>
          </div>
          <h1 className="text-3xl font-heading font-black tracking-tight text-foreground sm:text-4xl">
            Afforestation Projects & Plots
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure multi-plot cadastral boundaries, sapling targets, botanical species mixes, and manage project lifecycle verification workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="rounded-xl border-border/40 hover:bg-muted/40 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Projects</span>
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-heading font-bold text-foreground">{projects.length}</div>
          <p className="text-[11px] text-muted-foreground">Registered in platform database</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active & Verified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-heading font-bold text-emerald-400">
            {projects.filter((p) => p.status === "active").length}
          </div>
          <p className="text-[11px] text-muted-foreground">Passed remote sensing audit</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Target Saplings</span>
            <TreePine className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-heading font-bold text-foreground">
            {projects.reduce((acc, p) => acc + (p.target_trees || 0), 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">Committed across all plots</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Hectares Mapped</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-heading font-bold text-foreground">
            {projects.reduce((acc, p) => acc + (Number(p.target_area_hectares) || 0), 0).toFixed(1)} ha
          </div>
          <p className="text-[11px] text-muted-foreground">GeoJSON cadastral coverage</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-md p-3.5 rounded-2xl border border-border/40">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/80 rounded-xl border-border/40 text-xs focus-visible:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs bg-background/80 border-border/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="active">Active & Verified</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-9 w-[170px] rounded-xl text-xs bg-background/80 border-border/40">
              <SelectValue placeholder="Project Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROJECT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center p-1 rounded-xl bg-background/80 border border-border/40">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("gis_map")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "gis_map"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Project Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("boundary_system")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "boundary_system"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Boundary System (3-Way)
            </button>
          </div>
        </div>
      </div>

      {/* Projects View (Grid or Interactive GIS Map or 3-Way Boundary System) */}
      {viewMode === "gis_map" ? (
        <div className="animate-in fade-in duration-200">
          <ProjectMapViewer
            onSelectProject={(proj) => {
              if (proj) {
                loadProjectDetails(proj.id);
              }
            }}
            height="700px"
          />
        </div>
      ) : viewMode === "boundary_system" ? (
        <div className="animate-in fade-in duration-200">
          <BoundarySystemMapViewer
            projectId={selectedProjectId || filteredProjects[0]?.id || "proj-pune-western-ghats"}
            height="720px"
          />
        </div>
      ) : isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading projects and spatial registries...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 p-8 space-y-4">
          <TreePine className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || selectedStatus !== "all" || selectedType !== "all"
                ? "Try adjusting your filters or search query."
                : "Create your first afforestation project to begin GIS boundary mapping and carbon tracking."}
            </p>
          </div>
          <Button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="rounded-xl text-xs bg-primary hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const statusMeta = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusMeta.icon;
            const progress =
              project.target_trees > 0
                ? Math.min(100, Math.round((project.planted_trees / project.target_trees) * 100))
                : 0;

            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col justify-between rounded-3xl bg-card border border-border/40 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Top Bar with Type and Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[11px] font-mono capitalize bg-muted/40 border-border/40">
                      {project.project_type.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className={`text-[11px] gap-1 px-2 py-0.5 border ${statusMeta.badgeClass}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusMeta.label}
                    </Badge>
                  </div>

                  {/* Project Title & Organization */}
                  <div>
                    <h3 className="text-lg font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{project.organization_name || (project.organization_id ? "Institutional Org" : "Personal / Individual")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{project.location_name || "Coordinates set"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description snippet */}
                  {project.description && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2 italic">
                      "{project.description}"
                    </p>
                  )}

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/30 border border-border/20 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Target Trees</span>
                      <span className="font-heading font-semibold text-foreground">
                        {project.target_trees.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Cadastral Area</span>
                      <span className="font-heading font-semibold text-foreground">
                        {project.target_area_hectares ? `${project.target_area_hectares} ha` : "Not mapped"}
                      </span>
                    </div>
                  </div>

                  {/* Plantation Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Planted: {project.planted_trees.toLocaleString()}</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-muted/60" />
                  </div>

                  {/* Species List */}
                  {project.species_list && project.species_list.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.species_list.slice(0, 3).map((sp, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[150px]"
                        >
                          {sp.split(" (")[0]}
                        </span>
                      ))}
                      {project.species_list.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{project.species_list.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block">
                      Start: <strong>{project.start_date || "Immediate"}</strong>
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 block">
                      Owner: {project.created_by ? (user?.id === project.created_by ? "You (Owner)" : `${project.created_by.slice(0, 8)}...`) : "Platform"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProjectId(project.id)}
                    className="h-8 rounded-xl px-3 text-xs gap-1 border-primary/30 hover:bg-primary/10 hover:text-primary font-medium"
                  >
                    Manage Plot
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-border/40 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-primary" />
              Create Afforestation Project
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a new plantation campaign, assign organization ownership, specify biological sapling targets, and draw initial geodetic plot boundaries.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  required
                  placeholder="e.g. Sahyadri Sacred Grove Restoration"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Project Type *</Label>
                <Select
                  value={newProjectType}
                  onValueChange={(val) => setNewProjectType(val as ProjectType)}
                >
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Organization Association</Label>
                <Select value={newProjectOrgId} onValueChange={setNewProjectOrgId}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue placeholder="Select Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Personal / Individual Project</SelectItem>
                    {userOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Sapling Count *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={newTargetTrees}
                  onChange={(e) => setNewTargetTrees(parseInt(e.target.value) || 0)}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Location / District</Label>
                <Input
                  placeholder="e.g. Pune, Western Ghats, Maharashtra"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Start Date</Label>
                  <Input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Description & Objective</Label>
              <Textarea
                placeholder="Briefly describe the ecological objectives, soil condition, and community involvement..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="rounded-xl text-xs min-h-[80px]"
              />
            </div>

            {/* Species Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Botanical Species</Label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-muted/30 border border-border/30">
                {COMMON_SPECIES.map((sp) => {
                  const isSelected = selectedSpecies.includes(sp);
                  return (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => toggleSpecies(sp)}
                      className={`text-xs px-3 py-1 rounded-full transition-all border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                          : "bg-background text-muted-foreground border-border/40 hover:border-primary/40"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {sp.split(" (")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Initial Boundary Plotting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Initial Cadastral Boundary (Optional)</Label>
                <span className="text-[11px] text-muted-foreground">Click map or upload KML/GeoJSON</span>
              </div>
              <BoundaryDrawMap
                points={initialBoundaryPoints}
                onChange={setInitialBoundaryPoints}
                center={[18.5204, 73.8567]}
                height="320px"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCreate}
                className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isSubmittingCreate ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PROJECT DETAILS & MANAGEMENT MODAL */}
      <Dialog open={!!selectedProjectId} onOpenChange={(open) => !open && setSelectedProjectId(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border-border/40 bg-card/95 backdrop-blur-xl">
          {isLoadingDetails || !projectDetails ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading project telemetry & compartments...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs gap-1 border ${STATUS_CONFIG[projectDetails.status].badgeClass}`}>
                      {STATUS_CONFIG[projectDetails.status].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {projectDetails.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h2 className="text-2xl font-heading font-black text-foreground">
                    {projectDetails.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {projectDetails.location_name || "Location configured"} · Created {new Date(projectDetails.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddBoundaryOpen(true);
                      setBoundaryPoints([]);
                    }}
                    className="rounded-xl text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Compartment
                  </Button>
                </div>
              </div>

              {/* Multi-Tab Workspace */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 bg-muted/40 p-1 rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="compartments" className="rounded-xl text-xs">
                    Compartments ({projectDetails.boundaries.length})
                  </TabsTrigger>
                  <TabsTrigger value="lifecycle" className="rounded-xl text-xs">Lifecycle State</TabsTrigger>
                  <TabsTrigger value="audit" className="rounded-xl text-xs">Audit Trail</TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="space-y-4 pt-4">
                  {/* Core 9 Key Attributes Summary */}
                  <div className="rounded-2xl bg-muted/20 border border-border/30 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Plantation Project Metadata
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Project Name:</span>
                        <span className="font-semibold text-foreground text-sm">{projectDetails.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Organization:</span>
                        <span className="font-semibold text-foreground">
                          {projectDetails.organization_name || (projectDetails.organization_id ? "Linked Organization" : "Personal / Individual Project")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Location / Territorial Zone:</span>
                        <span className="font-semibold text-foreground">
                          {projectDetails.location_name || "Territorial Coordinates Set"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Project Owner / Creator:</span>
                        <span className="font-semibold text-foreground font-mono">
                          {projectDetails.created_by ? (user?.id === projectDetails.created_by ? "You (Owner & Creator)" : projectDetails.created_by) : "Platform Admin"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Start Date:</span>
                        <span className="font-semibold text-foreground">{projectDetails.start_date || "Immediate"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Target Trees / Saplings:</span>
                        <span className="font-semibold text-foreground">{projectDetails.target_trees.toLocaleString()} Trees</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Project Status:</span>
                        <Badge variant="outline" className={`text-[11px] gap-1 px-2 py-0.5 mt-0.5 border ${STATUS_CONFIG[projectDetails.status].badgeClass}`}>
                          {STATUS_CONFIG[projectDetails.status].label}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Project Classification:</span>
                        <span className="font-semibold capitalize text-foreground">{projectDetails.project_type.replace(/_/g, " ")}</span>
                      </div>
                    </div>

                    {projectDetails.description && (
                      <div className="pt-2 border-t border-border/20 text-xs text-muted-foreground">
                        <span className="text-foreground font-semibold block mb-0.5">Description:</span>
                        <p>{projectDetails.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/20">
                      <span className="text-[10px] text-muted-foreground block">Target Saplings</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        {projectDetails.target_trees.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/20">
                      <span className="text-[10px] text-muted-foreground block">Planted Trees</span>
                      <span className="text-lg font-heading font-bold text-primary">
                        {projectDetails.planted_trees.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/20">
                      <span className="text-[10px] text-muted-foreground block">Hectares Mapped</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        {projectDetails.total_hectares} ha
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/20">
                      <span className="text-[10px] text-muted-foreground block">Acres</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        {projectDetails.total_acres} ac
                      </span>
                    </div>
                  </div>

                  {/* Species List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-foreground block">Approved Botanical Species</span>
                    <div className="flex flex-wrap gap-2">
                      {projectDetails.species_list?.map((sp, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs rounded-xl px-2.5 py-1">
                          🌿 {sp}
                        </Badge>
                      )) || <span className="text-xs text-muted-foreground">No species specified</span>}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: COMPARTMENTS / BOUNDARIES */}
                <TabsContent value="compartments" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Cadastral Boundary Compartments</h4>
                      <p className="text-xs text-muted-foreground">
                        Multi-plot GIS partitions registered for precision remote sensing.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsAddBoundaryOpen(true);
                        setBoundaryPoints([]);
                      }}
                      className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Plot
                    </Button>
                  </div>

                  {projectDetails.boundaries.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl border border-dashed border-border/60 p-6 space-y-3">
                      <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs text-muted-foreground">No spatial boundary compartments plotted yet.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddBoundaryOpen(true)}
                        className="rounded-xl text-xs"
                      >
                        Draw First Boundary
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projectDetails.boundaries.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-primary/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-bold text-sm text-foreground">
                                {b.boundary_name}
                              </span>
                              {b.compartment_code && (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {b.compartment_code}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {b.boundary_type.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-3">
                              <span>Area: <strong>{b.area_hectares || 0} ha</strong> ({b.area_acres || 0} acres)</span>
                              <span>·</span>
                              <span>Added {new Date(b.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBoundary(b.id)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                            title="Delete boundary"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: LIFECYCLE STATE MACHINE */}
                <TabsContent value="lifecycle" className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Lifecycle State Machine</h4>
                    <p className="text-xs text-muted-foreground">
                      Current status: <strong>{STATUS_CONFIG[projectDetails.status].label}</strong> — {STATUS_CONFIG[projectDetails.status].description}
                    </p>
                  </div>

                  {/* Transition Actions */}
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-3">
                    <span className="text-xs font-semibold text-foreground block">Allowed Next Transitions:</span>
                    <div className="flex flex-wrap gap-2">
                      {ALLOWED_STATUS_TRANSITIONS[projectDetails.status]?.map((nextStatus) => {
                        const meta = STATUS_CONFIG[nextStatus];
                        const NextIcon = meta.icon;
                        return (
                          <Button
                            key={nextStatus}
                            size="sm"
                            onClick={() => handleInitiateTransition(nextStatus)}
                            className="rounded-xl text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                          >
                            <NextIcon className="h-3.5 w-3.5" />
                            Transition to {meta.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verification Notes */}
                  {projectDetails.verification_notes && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <span className="font-semibold text-amber-400 block">Verification & Audit Notes:</span>
                      <p className="text-muted-foreground">{projectDetails.verification_notes}</p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 4: AUDIT TRAIL */}
                <TabsContent value="audit" className="space-y-3 pt-4">
                  <h4 className="text-sm font-bold text-foreground">Tamper-Evident Audit History</h4>
                  {projectDetails.audit_history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No audit logs recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {projectDetails.audit_history.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-2xl bg-muted/20 border border-border/20 text-xs flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono font-semibold text-foreground block">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {log.previous_status ? `${log.previous_status} ➔ ${log.new_status}` : "Record update"}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD BOUNDARY COMPARTMENT DIALOG */}
      <Dialog open={isAddBoundaryOpen} onOpenChange={setIsAddBoundaryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-border/40 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Plot Cadastral Boundary Compartment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define parcel coordinates by clicking on the interactive map or uploading a GIS file (.kml / .geojson).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Compartment Name</Label>
                <Input
                  placeholder="e.g. Zone A (Riparian Buffer)"
                  value={boundaryName}
                  onChange={(e) => setBoundaryName(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Compartment Code</Label>
                <Input
                  placeholder="e.g. COMP-A2"
                  value={compartmentCode}
                  onChange={(e) => setCompartmentCode(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Zone Type</Label>
                <Select value={boundaryType} onValueChange={(v) => setBoundaryType(v as BoundaryType)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOUNDARY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <BoundaryDrawMap
              points={boundaryPoints}
              onChange={setBoundaryPoints}
              center={[
                projectDetails?.centroid_latitude || 18.5204,
                projectDetails?.centroid_longitude || 73.8567,
              ]}
              height="340px"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/40 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddBoundaryOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSavingBoundary || boundaryPoints.length < 3}
              onClick={handleSaveBoundary}
              className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
            >
              {isSavingBoundary ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving Plot...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Compartment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STATUS TRANSITION REASON DIALOG */}
      <Dialog open={isTransitionOpen} onOpenChange={setIsTransitionOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-border/40 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-foreground">
              Confirm Status Transition
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transition project to <strong>{targetTransitionStatus ? STATUS_CONFIG[targetTransitionStatus].label : ""}</strong>.
              This action is logged in the permanent audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Transition Reason / Auditor Notes</Label>
            <Textarea
              placeholder="Provide reason for this status change (e.g. Field verification approved, evidence submitted)..."
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              className="rounded-xl text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/40 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTransitionOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmittingTransition}
              onClick={handleExecuteTransition}
              className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmittingTransition ? "Processing..." : "Confirm Transition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
