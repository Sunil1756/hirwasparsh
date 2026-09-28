# GREEN ENLIGHTENMENT — PHASE 0 FULL READ-ONLY AUDIT REPORT (`REBUILD_AUDIT.md`)

> **Document Status**: Complete Read-Only Audit & Baseline Architecture Report  
> **Project Name**: Green Enlightenment (Hirwasparsh) — AI-Powered Platform for Smart Tree Plantation & Monitoring  
> **Repository**: `hirwasparsh`  
> **Date**: September 29, 2026  
> **Stack**: Vite, React 18 (TypeScript), Tailwind CSS, Shadcn UI, Leaflet, Turf.js, Supabase (PostgreSQL + RLS + Storage)

---

## 1. Executive Summary & Objective

This audit establishes the baseline architectural state of the **Green Enlightenment** platform to guide its controlled rebuild into a real, multi-tenant tree survival MRV (Measurement, Reporting & Verification) platform without breaking working features or running destructive database changes.

### Core Product Principle
$$\boxed{\textbf{Organization} \to \textbf{Project} \to \textbf{Plantation Site} \to \textbf{Tree} \to \textbf{Observation} \to \textbf{Evidence} \to \textbf{Assessment} \to \textbf{Status History} \to \textbf{Action} \to \textbf{Impact Report}}$$

---

## 2. Frontend Framework & Architecture (Audit Points 1-3)

- **Build Engine**: Vite 5 + React 18.3.1 (TypeScript, SWC).
- **Styling & UI**: Tailwind CSS 3.4 + Shadcn UI (Radix UI primitives) + Framer Motion.
- **State Management & Querying**: TanStack React Query v5.
- **Geospatial & Mapping**: Leaflet 1.9.4, React-Leaflet 4.2.1, Turf.js 7.4 (polygon computation, geodetic area, point-in-polygon).
- **Routing Structure** (`src/App.tsx`):
  - **Public / Explorer**: `/` (Home), `/about`, `/contact`, `/tree-map` (Space-borne GIS), `/intelligence` (AI telemetry), `/tree/:id` (Tree profile), `/tree-story/:id`, `/verify/cert/:serial` (Cryptographic certificate verification), `/pricing`.
  - **Role-Tailored Workspaces**:
    - **Citizen / Individual**: `/plant` (Chooser), `/plant/individual` (Individual tree dedication with QR twin), `/my-trees`, `/adopter` (Tree Adopter Dashboard).
    - **NGO Operations**: `/workspace/ngo` (alias: `/ngo-workspace`, `/organizations`), `/plant/organization` (Cadastral Demarcation), `/project-management`, `/bulk-onboard` (CSV/GeoJSON batch ingestion).
    - **Corporate CSR**: `/portal/csr` (alias: `/csr-portal`, `/organization-portal`), `/verification-dashboard`.
    - **Field Workers / Rangers**: `/field-worker`, `/scouting` (Offline GPS field scouting).
    - **Government & Forest Dept**: `/government`.
    - **Super Admin**: `/admin`, `/admin/audit-log`.

---

## 3. Backend, Database Schema & Migrations (Audit Points 4-9)

### Database Migrations
The database migration history comprises 56 migration files in `supabase/migrations/`:
- **Core Multi-Tenant Entities**:
  - `organizations`: Organization profiles (NGO, CSR, School/College, Govt, Community).
  - `organization_members`: RBAC mapping (`owner`, `admin`, `project_manager`, `field_worker`, `viewer`).
  - `projects` / `plantation_projects`: Multi-hectare projects bound to organizations with status lifecycle (`draft`, `active`, `completed`, `archived`).
  - `plantation_sites` / `plots`: Cadastral parcels and geo-fenced boundaries.
  - `trees`: Individual tree registry with stable unique IDs (`GE-YYYY-PXXX-TXXXXX`), species taxonomy, GPS coordinates, QR codes, and current health status.
- **Observation & Evidence Chain**:
  - `tree_observations`: Append-only periodic monitoring events (Day 0, Day 30, Day 90, Day 180, Day 365+).
  - `tree_evidence`: Photographic and sensor evidence linked to specific observations with EXIF GPS, timestamp, and perceptual hash (`dHash`).
  - `survival_status_history`: Immutable status transitions (`planted` $\to$ `monitoring_due` $\to$ `healthy` $\to$ `at_risk` $\to$ `failed` $\to$ `replaced`).
- **Monitoring Schedules & Tasks**:
  - `monitoring_schedules`: Automated calculation of upcoming, overdue, and completed observation compliance.
  - `interventions`: Risk detection and field action dispatch (watering, ring weeding, bio-fungicide, replantation).
- **Remote Sensing & Satellite Telemetry**:
  - `satellite_time_series`: Sentinel-2 Level-2A STAC multi-spectral time-series data (NDVI, SAVI, NDRE, NDMI, EVI).
  - `microclimate_telemetry`: Open-Meteo & IMD weather, topsoil moisture (0-7cm), and root-zone moisture (7-28cm).

### Row Level Security (RLS)
- Strict PostgreSQL RLS policies enforce tenant isolation:
  - Organization members can only view and modify records belonging to their authenticated `organization_id`.
  - Public trees are accessible in read-only mode for QR code profile resolution.
  - Super Admin overrides for cross-tenant system compliance.

---

## 4. Storage Buckets & Policies (Audit Point 10)

4 Dedicated Supabase Storage Buckets configured:
1. `tree-evidence`: Geotagged observation photos, crown canopy images, and field evidence.
2. `project-documents`: Cadastral land records, KML/GeoJSON boundaries, NGO registration certificates, CSR MoUs.
3. `certificates`: Cryptographically signed PDF carbon & ESG compliance certificates.
4. `spatial-data`: Processed raster layers, NDVI color overlays, and GeoTIFF masks.

---

## 5. Security & Authentication Architecture (Audit Points 5, 11, 18)

- **Supabase Auth**: Real email/password and OTP authentication via `src/contexts/AuthContext.tsx`.
- **JWT Session Persistence**: Handled through `@supabase/supabase-js` with token refresh.
- **Role-Protected Routing**: Enforced on the frontend via `ProtectedRoute` and `RoleProtectedRoute`, and enforced on the database layer via Supabase RLS.
- **Environment Variables**: Stored securely in `.env.local` / Vercel secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`, `VITE_RAZORPAY_KEY_ID`).

---

## 6. Functional Reality Audit (Working vs. Incomplete vs. Obsolete)

| Module / Feature | Current State | Verification Detail |
| :--- | :--- | :--- |
| **Cadastral Boundary Mapping** | **WORKING** | Dynamic Leaflet + Turf.js polygon ingestion, geodetic area calculation, boundary geo-fencing. |
| **Multi-Spectral Satellite Engine** | **WORKING** | Sentinel-2 L2A STAC telemetry computing NDVI, SAVI, NDRE, NDMI, EVI, and FVC %. |
| **Microclimate & Soil Moisture** | **WORKING** | Real-time Open-Meteo telemetry (temp, RH, VPD, ET0, dual-layer soil moisture). |
| **Offline Field Scouting** | **WORKING** | GPS photo capture with EXIF validation, offline IndexedDB sync, and remedy dispatch. |
| **Auto-Grid Demarcation Anti-Fraud** | **WORKING** | Auto-grids strictly initialize in `evidence_required` / `draft_plan` state with **0% claimed survival** until field photos are uploaded. |
| **Role Workspaces Isolation** | **WORKING** | Dedicated `/workspace/ngo`, `/portal/csr`, and `/plant/individual` routes. |
| **AI Botanical Diagnostics** | **PARTIALLY WORKING** | Gemini 2.5 API integration active for botanical identification; labeled "Planned / Not Yet Connected" when API key is unconfigured. |
| **Automated Cron Jobs** | **PARTIALLY WORKING** | Supabase Edge Functions created for daily weather and Sentinel-2 telemetry; pending scheduled webhook trigger activation. |
| **Legacy Mock Data** | **ELIMINATED** | Removed hardcoded 100% survival rates and synthetic mock tree counts across primary dashboards. |

---

## 7. Migration Risks & Safety Protocol (Audit Points 19-20)

### Migration Safeguards
1. **Zero Destructive SQL**: Never run `DROP TABLE`, `TRUNCATE`, or destructive `ALTER TABLE` commands.
2. **Additive Only**: Add new columns with default values or nullable constraints to maintain backwards compatibility.
3. **Foreign Key Integrity**: Enforce foreign keys between `trees`, `tree_observations`, `tree_evidence`, and `organizations` with `ON DELETE RESTRICT` or `CASCADE` where appropriate.
4. **Data Preservation**: Existing tree registrations and project boundary polygons must be preserved.

---

## 8. Recommended Execution Sequence (Phases 1–21)

$$\begin{aligned}
\text{Step 1 (Phases 1–5)}: &\quad \text{Core Relational Data Layer (Org } \to \text{ Project } \to \text{ Site } \to \text{ Tree } \to \text{ Observation } \to \text{ Evidence)} \\
\text{Step 2 (Phases 6–9)}: &\quad \text{Schedules, Stable QR Identity, Real Auth \& Strict RLS Multi-Tenancy} \\
\text{Step 3 (Phases 10–13)}: &\quad \text{Field Monitoring Lifecycle, AI Integrity, Satellite GIS \& Risk-Intervention Loop} \\
\text{Step 4 (Phases 14–17)}: &\quad \text{Real Data Dashboards, ESG/BRSR Reporting \& Prototype Behavior Elimination} \\
\text{Step 5 (Phases 18–21)}: &\quad \text{Additive Migrations, Full Test Suite, Production Build \& Documentation}
\end{aligned}$$
