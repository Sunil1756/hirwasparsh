# Green Enlightenment Database Architecture (V2)

## 1. Core Architecture Philosophy
The Green Enlightenment system has been refactored to employ a **Single Canonical Database Architecture**, removing duplicate tables and legacy data structures from the frontend.

## 2. Canonical Data Models

### **Organizations** (`organizations`, `organization_members`)
The foundational customer/tenant entity. All user accounts and projects belong to an organization.
- **`organizations`**: Represents the NGO, Corporate CSR, or Government entity.
- **`organization_members`**: RBAC user mappings determining who has access to the organization's data.

### **Projects** (`projects`)
The canonical project entity representing a single afforestation or plantation initiative.
- Replaces legacy models: `plantation_projects`, `plots`.
- Linked directly to `organization_id`.
- Contains overarching project metadata (target trees, project status, dates).

### **Boundaries / Sites** (`project_boundaries`)
Geospatial boundaries mapping out the project's real-world geography.
- Associated via `project_id`.
- Replaces legacy concepts like boundary arrays stored directly on `plantation_projects` or separate `plantation_sites` tables.

### **Trees** (`trees`)
The core individual unit of afforestation.
- Associated via `project_id` (and optionally `boundary_id`).
- Contains species, plantation date, geolocation, and current overall status.

### **Observations** (`tree_observations`)
Longitudinal health check-ins and field reports for trees.
- Replaces legacy models: `check_ins`, `tree_health_updates`.
- Records point-in-time health status, observer ID, and dates.

### **Evidence** (`tree_evidence`)
Photographic and document proof (KML, drone mapping, health inspections) verifying tree status or project existence.
- Replaces legacy models: `tree_photos`, `project_evidence`.
- Links to either `tree_id` or `project_id` depending on the scope of the evidence.

## 3. Legacy Deprecation Path
Legacy tables have been safely maintained via non-destructive SQL migrations mapped into the canonical tables. To prevent new writes from using outdated schema definitions:
- Frontend queries have been updated to target Canonical models.
- Legacy tables have been prefixed with `legacy_` (e.g., `legacy_plantation_projects`, `legacy_plots`) to retain historical integrity without exposing them to ongoing inserts.
