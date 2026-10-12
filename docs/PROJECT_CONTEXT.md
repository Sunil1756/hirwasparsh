# Green Enlightenment — Project Context

> This document summarises the project vision, target users, intended functionality, technical constraints, data-integrity principles, known uncertainties and development priorities. It is a living document derived from the product brief, codebase inspection, and forensic audit findings.

## 1. Project Vision

Green Enlightenment is an **AI-assisted institutional plantation monitoring, evidence management, and environmental MRV (Monitoring, Reporting, and Verification) platform**. Its core purpose is to help organisations document plantation projects, preserve evidence, inspect progress over time, estimate survival using transparent observations, and produce credible reports.

**Core Principle:** No metric should look verified unless its source, method, timestamp, status and limitations can be traced.

**Strongest positioning statement (from product brief):**

> "Green Enlightenment is an AI-assisted tree plantation accountability platform that goes beyond counting planted trees by creating a digital lifecycle for each tree — from plantation and geo-tagged evidence to periodic monitoring, survival assessment and impact reporting."

## 2. Target Users

| User Type | Role |
|-----------|------|
| **NGOs and restoration organisations** | Manage multiple sites, field teams, planting events, and follow-up inspections |
| **CSR / corporate sustainability teams** | Oversee projects, review evidence, track milestones, prepare impact reports |
| **Field workers / auditors** | Capture GPS-linked observations, photos, tree IDs, and inspection outcomes |
| **Administrators / project owners** | Manage users, organisations, project access, data quality, exports |
| **Public / donors (optional)** | View carefully approved summaries without exposing private data |

**Initial market focus:** Institutional plantation survival monitoring for a small number of NGO/CSR pilot projects in Maharashtra.

## 3. Intended End-to-End Workflow

```
Organisation & Account → Create Project → Define Site (GPS/Polygon)
    → Add Planting Evidence → Inventory Trees (ID/QR)
    → Field Follow-up (alive/dead/missing/not inspected)
    → Calculate Metrics (survival, coverage, trend)
    → Environmental Intelligence (weather, satellite)
    → Review & Audit → Reporting
```

## 4. Technical Architecture

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **UI:** Shadcn/UI + Tailwind CSS + Framer Motion
- **Maps:** react-leaflet + Leaflet + Turf.js (polygon area)
- **Charts:** Recharts
- **State:** React Query (@tanstack/react-query)
- **Routing:** react-router-dom v6 (35 routes)

### Backend
- **Platform:** Supabase (managed PostgreSQL + Edge Functions + Storage + Auth + RLS)
- **Edge Functions (Deno):** 9 functions:
  - `tree-assistant` — AI chat assistant
  - `verify-tree` — AI tree photo verification
  - `detect-species` — AI species identification
  - `verify-project` — AI project verification
  - `copernicus-sentinel` — Satellite data proxy
  - `bulk-satellite-telemetry` — Batch satellite queries
  - `daily-weather-check` — Scheduled weather polling
  - `risk-alert-dispatcher` — Risk notification engine
  - `send-otp` — OTP delivery service

### Database
- **70+ migration files** across 6 development phases
- **Core tables:** trees, profiles, user_roles, plantation_drives, organizations, projects, tree_observations, satellite_telemetry, weather_data, monitoring_schedules, etc.
- **Row Level Security (RLS):** Enabled on all tables with role-based policies
- **Storage buckets:** treebank (public), selfies (private), evidence-photos, project-reports

### Authentication & Authorization
- Supabase Auth (email/password + optional Google OAuth)
- Role system: `admin`, `moderator`, `user`, `government`, `field_worker`, `tree_adopter`
- RBAC permission service (`rbacService.ts`)
- Protected routes via `ProtectedRoute` and `RoleProtectedRoute` components

### External Integrations

| Integration | Status | Details |
|-------------|--------|---------|
| **Google Gemini AI** | ✅ Active (partial) | API key valid; Flash-Lite models work; Pro models quota-exhausted on free tier |
| **Open-Meteo Weather** | ✅ Active | Free API, no key required; provides real weather data |
| **Copernicus Sentinel-2** | ⚠️ Code exists, not configured | Requires `CDSE_CLIENT_ID` + `CDSE_CLIENT_SECRET` (ESA OAuth); falls back to zeros |
| **PostHog Analytics** | ⚠️ Placeholder key | Key is `phc_green_enlightenment_live_analytics` (not real) |

### Environment Variables (names only, no values)

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project endpoint | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | Optional (for AI features) |
| `VITE_COPERNICUS_CLIENT_ID` | ESA Copernicus OAuth client ID | Optional (for satellite) |
| `VITE_COPERNICUS_CLIENT_SECRET` | ESA Copernicus OAuth client secret | Optional (for satellite) |
| `VITE_POSTHOG_KEY` | PostHog analytics key | Optional |
| `VITE_POSTHOG_HOST` | PostHog host URL | Optional |

## 5. Data Integrity Principles (from Product Brief)

1. **Survival calculation:** `confirmed alive ÷ (confirmed alive + confirmed dead) × 100`. Trees not inspected must NOT silently count as alive or dead.
2. **A project completion score is NOT a verification score**, and neither is a survival rate.
3. **A random image cannot establish plantation activity.** Image relevance checks can flag evidence for review but cannot conclusively prove trees were planted or are alive.
4. **AI confidence is NOT the same as factual truth** or independent verification.
5. **Satellite vegetation indices describe spectral signals for a pixel/area;** they do NOT automatically count individual trees.
6. **When data is missing or an external service fails,** show "Unavailable" or "Not assessed" rather than inventing a plausible number.
7. **An API/library being present in the repository does NOT prove a real successful integration.**

## 6. Competitive Positioning

### vs TagMyTree
- TagMyTree: "Where is this tree and what is its digital identity?"
- Green Enlightenment: "Was this tree actually planted, is it still alive, what evidence proves it, how has it changed, and what action is required next?"
- Differentiation: **AI-assisted verification + survival monitoring + plantation accountability**, not merely QR tagging.

### vs Map My Crop
- Map My Crop is an agriculture/geospatial monitoring comparator focused on crop monitoring.
- Green Enlightenment targets tree plantation MRV with institutional workflows.
- This brief does NOT assert that Green Enlightenment currently matches Map My Crop's technical capabilities.

## 7. Known Uncertainties and Trust Gaps

These findings are from the forensic audit and code inspection:

1. **Project Verification Score** — Computed entirely client-side using `Math.sin()` hash of coordinates for "baseline NDVI" (not real satellite data). Score capped at 35-55/100 for new projects.
2. **AI Trust Score** — Can display values without underlying verified evidence.
3. **Survival Rate** — Currently derived from `survivalRatePercent` parameter, which lacks a verified database source of tree observations.
4. **Living Trees Census** — Derived from `(targetTrees × survivalRate / 100)`. No actual tree-level observation records feeding this.
5. **Satellite Telemetry** — Code exists for real Copernicus integration, but requires ESA credentials not yet configured. Falls back to zeros/pending state.
6. **Carbon Estimates** — Mathematical model using IPCC Tier-2 allometric formulas. Scientifically valid formulas but inputs (tree count, survival rate, species) are unverified.
7. **Zero/Negative Tree Counts** — Not rejected by server-side validation.
8. **Duplicate Projects** — No server-side duplicate detection.

## 8. Development Priorities (Phased)

| Phase | Scope | Status |
|-------|-------|--------|
| 0 — Forensic Audit | Map code/data flow; classify every feature | **This document** |
| 1 — Reliability | Fix validation, auth, persistence, misleading metrics | NOT STARTED |
| 2 — Field MVP | Tree IDs/QR, geotagged evidence, inspections, survival | NOT STARTED |
| 3 — GIS/Weather | Geometry validation, real weather, robust errors | NOT STARTED |
| 4 — Satellite | Real Sentinel-2, cloud filtering, NDVI time-series | NOT STARTED |
| 5 — AI Assistance | Image screening, anomaly detection, safe fallback | NOT STARTED |
| 6 — Institutional MRV | Portfolio analytics, audit trail, carbon estimates | NOT STARTED |
| 7 — Pilot & Iterate | Real plantation pilot, user feedback | NOT STARTED |

## 9. Budget Constraint

~₹2,500 Antigravity credits. Use expensive models only for complex reasoning. Prioritise efficient, incremental development.

---

*Last updated: October 2026. This document is maintained alongside the codebase and updated as phases complete.*
