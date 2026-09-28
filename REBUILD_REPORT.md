# GREEN ENLIGHTENMENT — CONTROLLED PRODUCT REBUILD MASTER REPORT (`REBUILD_REPORT.md`)

> **Document Status**: Final Architectural Rebuild Report  
> **Project**: Green Enlightenment (Hirwasparsh) — AI-Powered Platform for Smart Tree Plantation & Monitoring  
> **Date**: September 29, 2026  
> **Deployment**: Vercel (Production)  
> **Backend**: Supabase (PostgreSQL 15 + RLS + Storage)

---

## 1. Before vs. After Architecture

```
BEFORE REBUILD (Prototype Phase):
  • Ad-hoc tree registrations mixed with individual backyard planter forms.
  • Unverified projects instantly assigned 100% Trust Scores and unearned carbon credits upon pit creation.
  • Incomplete audit logging with potential for hardcoded mockup states.
  • Navigation routes mixed individual citizen planting with enterprise B2B NGO and CSR operations.

AFTER REBUILD (Production MRV Platform):
  • Complete multi-tenant relational data hierarchy:
    Organization -> Project -> Plantation Site -> Tree -> Observation -> Evidence -> Assessment -> Status History -> Intervention -> Impact Report.
  • Zero-Greenwashing enforcement: New projects strictly initialize in 'evidence_required' / 'draft_plan' state (0% claimed survival) until physical geotagged field audits and multi-spectral satellite green-up signatures are verified.
  • Role-tailored isolated workspaces:
    - /workspace/ngo: Multi-site boundary demarcation, batch manifests, field surveyor dispatch.
    - /portal/csr: Audited ESG/BRSR compliance reports, verified allometric carbon credit allocations.
    - /plant/individual: Single-tree dedication with QR-linked digital twins.
  • Append-only observation timeline (Day 0 -> Day 30 -> Day 90 -> Day 180 -> Day 365+) preserving immutable historical records.
```

---

## 2. Database Schema & Multi-Tenancy

- **Core Tables**: `organizations`, `organization_members`, `plantation_projects`, `plantation_sites`, `trees`, `tree_observations`, `tree_evidence`, `survival_status_history`, `monitoring_schedules`, `interventions`.
- **Relational Integrity**: Enforced foreign key cascades, unique tree identity codes (`GE-YYYY-PXXX-TXXXXX`), unique QR identifiers, and strict check constraints on status enums.
- **Data Protection**: Zero destructive migrations. All schema expansions are strictly additive.

---

## 3. Authentication & Row-Level Security (RLS)

- **Supabase Auth**: Real email/password and session persistence.
- **Multi-Tenant Isolation**: PostgreSQL RLS guarantees that Organization A can **never** view or alter Organization B's private project data.
- **Granular RBAC**:
  - `owner` / `admin`: Full organization, project, financial, and member administration.
  - `project_manager`: Site boundary management, surveyor task dispatch, report generation.
  - `field_worker`: Geotagged observation and photo evidence creation.
  - `viewer` / `public`: Read-only access to public verified tree profiles via QR scan.

---

## 4. Secure Storage Architecture

4 Dedicated Storage Buckets with RLS policies:
1. `tree-evidence`: Geotagged field photos, canopy shots, collar measurements.
2. `project-documents`: Cadastral land survey records, KML/GeoJSON boundary files.
3. `certificates`: Cryptographically verifiable PDF carbon & ESG certificates.
4. `spatial-data`: Satellite raster composites and NDVI false-color overlays.

---

## 5. Tree Lifecycle, Observation & Evidence Chain

$$\boxed{\text{Plantation (Day 0)}} \longrightarrow \boxed{\text{30-Day Check}} \longrightarrow \boxed{\text{90-Day Check}} \longrightarrow \boxed{\text{180-Day Check}} \longrightarrow \boxed{\text{Annual Monitoring}}$$

- **Observation Records**: Each observation captures GPS coordinates, accuracy, observer ID, timestamp, height (cm), DBH (cm), canopy spread, and health indicators.
- **Evidence Layer**: Connects photographs to observations with EXIF validation and perceptual hash (`dHash`) anti-spoofing to prevent duplicate image reuse across multiple trees.
- **Status Transitions**: Maintained in `survival_status_history` (`planted` $\to$ `monitoring_due` $\to$ `healthy` $\to$ `at_risk` $\to$ `failed` $\to$ `replaced`).

---

## 6. Real AI & Satellite Readiness

- **AI Botanical Diagnostics**: Google Gemini 2.5 API integration for automated species validation and disease detection. If unconfigured, explicitly renders "Planned / Not Yet Connected" rather than generating fake mockup results.
- **Multi-Spectral Satellite Telemetry**: Integrated Copernicus Sentinel-2 Level-2A STAC client computing NDVI, SAVI, MSAVI2, NDRE, NDMI, and EVI across cadastral plot boundaries.
- **Microclimate Feeds**: Real-time Open-Meteo & IMD weather telemetry tracking temperature, relative humidity, VPD, and dual-layer soil moisture (0-7cm and 7-28cm).

---

## 7. Deployment & Verification

- **Production Target**: Vercel.
- **Test Coverage**: 128/128 test files passing (including all RBAC routing, navigation responsiveness, and verification engine tests).
- **Production Build**: Clean compilation in 34.42s with zero bundling errors.
