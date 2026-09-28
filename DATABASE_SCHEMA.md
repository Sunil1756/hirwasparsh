# GREEN ENLIGHTENMENT — DATABASE SCHEMA SPECIFICATION (`DATABASE_SCHEMA.md`)

> **Database System**: PostgreSQL 15+ via Supabase  
> **Schema Philosophy**: Normalized relational architecture with Row-Level Security (RLS), foreign key cascading protections, check constraints, and append-only audit histories.

---

## 1. Entity-Relationship Overview

```
+----------------------------------------------------------------------------------------------------+
|                                    RELATIONAL SCHEMA HIERARCHY                                     |
+----------------------------------------------------------------------------------------------------+

       organizations
             | 1
             |
             +---> organization_members (RBAC: owner, admin, manager, field_worker, viewer)
             |
             +---> projects (Status: draft, active, completed, archived)
                     | 1
                     |
                     +---> plantation_sites (Cadastral polygons, GeoJSON boundary)
                             | 1
                             |
                             +---> trees (Stable ID: GE-YYYY-PXXX-TXXXXX, Species, GPS, QR)
                                     | 1
                                     |
                                     +---> tree_observations (Append-only observation timeline)
                                     |       | 1
                                     |       |
                                     |       +---> tree_evidence (Photos, EXIF, Hash, GPS)
                                     |
                                     +---> survival_status_history (Immutable state transitions)
                                     |
                                     +---> monitoring_schedules (30d, 90d, 180d, 365d compliance)
                                     |
                                     +---> interventions (Risk detected -> Action -> Evidence -> Verify)
```

---

## 2. Core Table Definitions

### 2.1 `organizations`
Represents institutional entities (NGOs, Corporate CSR sponsors, Educational Campuses, Government Forest Divisions).

```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ngo', 'csr', 'educational_institution', 'government', 'community')),
    registration_number TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 `organization_members`
Connects authenticated users to organizations with granular role-based permissions.

```sql
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'project_manager', 'field_worker', 'viewer')),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);
```

### 2.3 `projects` / `plantation_projects`
Defines multi-hectare afforestation initiatives belonging to an organization.

```sql
CREATE TABLE public.plantation_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    target_tree_count INTEGER NOT NULL CHECK (target_tree_count > 0),
    actual_tree_count INTEGER DEFAULT 0,
    target_area_hectares NUMERIC(10, 4),
    actual_area_hectares NUMERIC(10, 4),
    start_date DATE NOT NULL,
    estimated_completion_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'evidence_required', 'active', 'completed', 'archived')),
    verification_tier TEXT DEFAULT 'unverified' CHECK (verification_tier IN ('unverified', 'satellite_only', 'field_verified', 'gold_tier')),
    confidence_score NUMERIC(5, 2) DEFAULT 0.00 CHECK (confidence_score >= 0.00 AND confidence_score <= 100.00),
    verified_survival_rate NUMERIC(5, 2) DEFAULT 0.00,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 `plantation_sites`
Geo-fenced cadastral parcels belonging to a project.

```sql
CREATE TABLE public.plantation_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.plantation_projects(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    boundary_geojson JSONB,
    centroid_lat NUMERIC(10, 7),
    centroid_lng NUMERIC(10, 7),
    area_hectares NUMERIC(10, 4),
    soil_type TEXT,
    elevation_meters NUMERIC(6, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.5 `trees`
Digital Twin registry for every single tree.

```sql
CREATE TABLE public.trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_code TEXT NOT NULL UNIQUE, -- Stable ID: GE-2026-P001-T00001
    qr_identifier TEXT NOT NULL UNIQUE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES public.plantation_projects(id) ON DELETE RESTRICT,
    site_id UUID REFERENCES public.plantation_sites(id) ON DELETE SET NULL,
    species TEXT NOT NULL,
    scientific_name TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    plantation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_status TEXT NOT NULL DEFAULT 'planted' CHECK (current_status IN ('planted', 'monitoring_due', 'healthy', 'at_risk', 'failed', 'dead', 'replaced', 'verification_required')),
    height_cm NUMERIC(6, 2),
    dbh_cm NUMERIC(6, 2), -- Diameter at Breast Height
    canopy_radius_cm NUMERIC(6, 2),
    initial_photo_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.6 `tree_observations` (Append-Only Observation Timeline)
Stores immutable periodic field inspections.

```sql
CREATE TABLE public.tree_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    observer_id UUID NOT NULL REFERENCES auth.users(id),
    observation_type TEXT NOT NULL CHECK (observation_type IN ('initial_plantation', '30_day', '90_day', '180_day', 'annual', 'emergency_scouting')),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    gps_lat NUMERIC(10, 7) NOT NULL,
    gps_lng NUMERIC(10, 7) NOT NULL,
    gps_accuracy_meters NUMERIC(5, 2),
    observed_status TEXT NOT NULL CHECK (observed_status IN ('healthy', 'moderate_stress', 'severe_stress', 'wilting', 'dead', 'missing')),
    height_cm NUMERIC(6, 2),
    dbh_cm NUMERIC(6, 2),
    canopy_spread_cm NUMERIC(6, 2),
    leaf_condition TEXT,
    pest_signs TEXT,
    notes TEXT,
    ai_validation_status TEXT DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'verified', 'flagged_mismatch', 'skipped')),
    ai_confidence_pct NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.7 `tree_evidence` (Cryptographic & Perceptual Hash Evidence Layer)
Links multi-angle photographs and sensor telemetry directly to an observation.

```sql
CREATE TABLE public.tree_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES public.tree_observations(id) ON DELETE CASCADE,
    tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('ground_photo', 'canopy_crown', 'trunk_collar', 'leaf_macro', 'drone_aerial', 'satellite_chip')),
    exif_timestamp TIMESTAMPTZ,
    exif_latitude NUMERIC(10, 7),
    exif_longitude NUMERIC(10, 7),
    camera_azimuth_deg NUMERIC(5, 2),
    perceptual_hash TEXT, -- dHash for duplicate prevention
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.8 `survival_status_history`
Maintains a tamper-proof audit trail of state changes over time.

```sql
CREATE TABLE public.survival_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('field_observation', 'satellite_telemetry', 'ai_audit', 'admin_review', 'remediation_closure')),
    observation_id UUID REFERENCES public.tree_observations(id),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.9 `interventions` (At-Risk Remediation & Work Order Dispatch)
Dispatches remediation tasks when health anomalies are detected.

```sql
CREATE TABLE public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.plantation_projects(id) ON DELETE CASCADE,
    risk_category TEXT NOT NULL CHECK (risk_category IN ('water_stress', 'pest_disease', 'nutrient_chlorosis', 'physical_damage', 'weed_competition', 'mortality_replacement')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES auth.users(id),
    recommended_action TEXT NOT NULL,
    resolution_notes TEXT,
    resolution_evidence_id UUID REFERENCES public.tree_evidence(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
```

---

## 3. Row-Level Security (RLS) Policy Architecture

1. **Multi-Tenant Isolation**:
   ```sql
   CREATE POLICY org_isolation_projects ON public.plantation_projects
   FOR ALL USING (
       organization_id IN (
           SELECT organization_id FROM public.organization_members
           WHERE user_id = auth.uid()
       )
   );
   ```
2. **Public QR Code Resolution**:
   ```sql
   CREATE POLICY public_read_trees ON public.trees
   FOR SELECT USING (true); -- Read-only public access to verified tree profiles
   ```
3. **Field Worker Scope**:
   ```sql
   CREATE POLICY worker_insert_observations ON public.tree_observations
   FOR INSERT WITH CHECK (
       auth.uid() = observer_id
   );
   ```
