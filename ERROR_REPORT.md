# GREEN ENLIGHTENMENT — ERROR & DEFECT AUDIT REPORT (`ERROR_REPORT.md`)

> **Document Status**: Active Defect Tracking & Resolution Ledger  
> **Repository**: `hirwasparsh`  
> **Last Updated**: September 29, 2026

---

## 1. Errors Found & Root Cause Analysis

### Defect 1: Navbar Runtime Crash in Authenticated / Protected Mode
- **Symptom**: `ReferenceError: ShieldCheck is not defined` when authenticated users accessed protected dashboard routes.
- **Root Cause**: The icon `<ShieldCheck />` was added to the B2B Corporate Portal dropdown item in `src/components/Navbar.tsx` without being included in the named import list from `lucide-react`.
- **Severity**: Critical (React Error Boundary crash on login).
- **Status**: **RESOLVED & FIXED** in commit `a95e004`.

### Defect 2: Fake Instant 100% Verification for Empty / Auto-Grid Projects
- **Symptom**: Newly generated projects using 1-Click auto-grid demarcation received instantaneous 100% Trust Scores and unearned carbon valuations without planting a single tree or uploading field proof.
- **Root Cause**: Auto-generated pit coordinates in `OrganizationPlantation.tsx` were treating demarcated coordinate rows (`bulkRows.length > 0`) as verified evidence count.
- **Severity**: High (Violated Zero-Greenwashing policy).
- **Status**: **RESOLVED & FIXED** — Generated coordinate grids are now strictly treated as pit demarcation plans, initializing projects in `evidence_required` / `draft_plan` state with 0% claimed survival until geotagged field photos are submitted.

### Defect 3: Unmounted State Update Warnings in Audit Log Console
- **Symptom**: React warning `Can't perform a React state update on an unmounted component` when navigating rapidly away from `AuditLogConsole.tsx`.
- **Root Cause**: Asynchronous Supabase subscriptions in `AuditLogConsole.tsx` were resolving after component unmount without an `isMounted` cancellation guard.
- **Severity**: Low (Console warning, non-fatal).
- **Status**: **RESOLVED & FIXED** — Added cleanup controllers and abort signals to all async query subscriptions.

---

## 2. Summary of Fixed Defects

| Defect ID | Description | Component / File | Fix Details | Status |
| :--- | :--- | :--- | :--- | :---: |
| **ERR-001** | Missing `ShieldCheck` icon import | `src/components/Navbar.tsx` | Added `ShieldCheck` to `lucide-react` import list. | **FIXED** |
| **ERR-002** | Instant 100% Trust Score for unverified projects | `src/pages/OrganizationPlantation.tsx` | Decoupled auto-grid coordinates from evidence count; set project state to `evidence_required`. | **FIXED** |
| **ERR-003** | Mixed individual and institutional B2B navigation | `src/components/Navbar.tsx`, `src/pages/PlantChooser.tsx` | Enforced strict role-isolated routes (`/workspace/ngo`, `/portal/csr`, `/plant/individual`). | **FIXED** |
| **ERR-004** | Unhandled Supabase timeout in audit logging | `src/services/survivalStatusService.ts` | Wrapped async status history inserts in 2.5s fallback timeouts to prevent UI hang. | **FIXED** |

---

## 3. Remaining Warnings / Non-Fatal Items & Rationale

| Item | Description | Location | Reason for Remaining & Impact |
| :--- | :--- | :--- | :--- |
| **WARN-001** | Recharts container zero-dimension warning in headless Vitest runs | Unit test console output for `CSRCorporatePortal.tsx` | Occurs only in headless jsdom test environments where SVG container dimensions evaluate to `0x0`. Has **zero runtime impact** in real browser viewports where DOM layout engine computes dimensions normally. |
| **WARN-002** | Gemini API key fallback notice | `src/lib/gemini.ts` | When users or test environments run without `VITE_GEMINI_API_KEY`, the system intentionally falls back to displaying "Planned / Not Yet Connected" to avoid fake AI responses. |
