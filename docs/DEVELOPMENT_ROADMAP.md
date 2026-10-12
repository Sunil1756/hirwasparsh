# Green Enlightenment — Development Roadmap

> Phased plan for transforming Green Enlightenment from its current state into a reliable, production-ready environmental monitoring platform. Each phase has defined scope, exit criteria, and estimated effort.

## Current State Summary

Based on the Phase 0 forensic audit:

- **2 of 24** features are verified working (Accounts, Weather)
- **5 features** present mock/hardcoded data as real results
- **All validation is client-side only** — no server-side input enforcement
- **Copernicus satellite integration** is coded but not configured (missing ESA credentials)
- **Gemini AI integration** works for Flash-Lite models; Pro models quota-exhausted on free tier
- **Weather integration** is genuine and operational (Open-Meteo)
- **Database schema** is extensive (70+ migrations) with RLS policies on all tables

---

## Phase 1 — Reliability & Data Integrity

**Goal:** Ensure no misleading data reaches users. Invalid inputs must be rejected. No mock values appear in production.

### 1.1 Server-Side Project Validation
- [ ] Create Supabase Edge Function for project creation validation
- [ ] Reject zero/negative/impossibly-large tree counts
- [ ] Validate coordinate ranges (valid latitude: -90 to 90, longitude: -180 to 180)
- [ ] Validate plantation date (not future, not before 1900)
- [ ] Require project name and organisation
- [ ] Check for duplicate projects (same name + similar location within 1km)

### 1.2 Honest Score Display
- [ ] Replace `Math.sin()` hash-based "Baseline NDVI" with honest "NOT ASSESSED" when no satellite data exists
- [ ] Cap verification score at 35/100 for new projects with clear label: "Pre-Planting Boundary Check Only"
- [ ] Remove or relabel "AI Trust Score" — rename to "Evidence Completeness Score" with published formula
- [ ] Remove Gold Standard / Verra certification language until actual certification exists
- [ ] Add data provenance badges: "CLIENT-SIDE ESTIMATE", "SATELLITE VERIFIED", "FIELD VERIFIED"

### 1.3 Authentication & Authorization Hardening
- [ ] Verify cross-organisation data isolation with test accounts
- [ ] Ensure profile role + user_roles table are consistent (eliminate dual-source ambiguity)
- [ ] Test RLS policies: User A cannot read/write User B's trees, projects, or organisation data
- [ ] Verify `guard_tree_privileged_columns` trigger prevents self-approval

### 1.4 Demo/Live Data Separation
- [ ] Add `is_demo` boolean column to projects and trees tables
- [ ] Enforce server-side filter: demo records excluded from all aggregation queries
- [ ] Add visible "DEMO" badge on all demo projects in the UI
- [ ] Prevent demo data from appearing in institutional reports

### 1.5 Automated Tests
- [ ] Add validation unit tests: invalid tree counts, bad coordinates, missing fields
- [ ] Add RLS integration tests (requires Supabase test setup)
- [ ] Add score calculation tests: verify score ranges, edge cases, zero-tree handling
- [ ] Ensure all 6 existing tests continue to pass

**Exit Criteria:**
- Invalid project submissions are rejected server-side
- No fake "verified" results appear
- Automated regression tests pass
- Cross-org data isolation confirmed

**Files to modify:**
- New: `supabase/functions/validate-project/index.ts`
- Modify: `src/lib/projectVerification.ts` (remove `Math.sin()` NDVI, update score labels)
- Modify: `src/pages/OrganizationPlantation.tsx` (honest score display)
- Modify: `src/components/ProjectVerificationCard.tsx` (provenance badges)
- New: `src/test/projectValidation.test.ts`
- New migration: Add `is_demo` column

---

## Phase 2 — Field MVP (Plantation Monitoring Engine)

**Goal:** Complete the tree-level lifecycle: register → observe → track survival → report.

### 2.1 Tree Registration
- [ ] Enforce unique tree codes (server-side)
- [ ] GPS capture on tree registration with accuracy threshold (reject >50m accuracy)
- [ ] Species validation against known species list
- [ ] QR code generation linked to tree profile page
- [ ] Bulk import with row-level error reporting

### 2.2 Field Observations
- [ ] Complete observation workflow: observer → photo → GPS → status (alive/dead/missing/not-inspected) → notes
- [ ] Store observation date, observer ID, evidence URL, GPS coordinates
- [ ] Correction workflow: allow amendments with version history
- [ ] Overdue observation alerts

### 2.3 Transparent Survival Metrics
- [ ] Implement correct survival formula: `confirmed alive ÷ (confirmed alive + confirmed dead) × 100`
- [ ] Display denominator: "754 alive / 800 assessed (200 not inspected)"
- [ ] Separate "survival among assessed" from "confirmed alive as share of planted"
- [ ] Store calculation inputs and timestamp
- [ ] Display "Not enough data" when <10% of trees have been inspected

### 2.4 Tree Profile Enhancement
- [ ] Timeline view: all observations for a single tree
- [ ] Status history: planted → alive → at-risk → dead
- [ ] Photo evidence gallery with dates
- [ ] Location consistency check (GPS should be within boundary)

**Exit Criteria:**
- End-to-end test with controlled records: create project → register trees → create observations → calculate survival
- Pilot-ready workflow
- Survival metric is traceable to individual observation records

---

## Phase 3 — GIS & Weather Intelligence

**Goal:** Reliable geospatial operations and genuine weather integration with provenance.

### 3.1 Geometry Validation
- [ ] Self-intersection detection for polygons
- [ ] Duplicate point removal
- [ ] Area calculation with units (acres, hectares)
- [ ] CRS validation (ensure WGS84)
- [ ] Original geometry preservation (store raw + cleaned versions)

### 3.2 Map Layer Improvements
- [ ] Tree markers on project boundary map
- [ ] Heatmap of observation recency
- [ ] Colour-coded survival status on map

### 3.3 Weather Integration Enhancement
- [ ] Add data freshness indicator ("Updated 2 hours ago")
- [ ] Store weather history per project
- [ ] Display weather alongside observation timeline
- [ ] Handle API failures with "Weather data unavailable" state

**Exit Criteria:**
- Provider/source traceability for all displayed weather data
- Geometry operations produce reproducible results
- No "cleaned successfully" displayed without actual cleaning

---

## Phase 4 — Satellite Monitoring

**Goal:** Real Sentinel-2 satellite data retrieval with quality filtering and NDVI time-series.

### 4.1 Copernicus Integration Activation
- [ ] Obtain ESA Copernicus Data Space Ecosystem credentials (CDSE account)
- [ ] Configure `VITE_COPERNICUS_CLIENT_ID` and `VITE_COPERNICUS_CLIENT_SECRET`
- [ ] Test OAuth token retrieval
- [ ] Test OData catalog query for a known location
- [ ] Test Statistical API for real reflectance bands

### 4.2 Quality Filtering
- [ ] Cloud cover threshold (reject >40% cloud scenes)
- [ ] Data mask validation (reject no-data pixels)
- [ ] Temporal gap handling (show "No observation available" for missing dates)

### 4.3 NDVI Time-Series
- [ ] 6-month historical NDVI chart from real satellite data
- [ ] Clearly mark each data point with acquisition date and source scene ID
- [ ] Show resolution limitation: "10m pixel — area average, not individual tree"
- [ ] Delta NDVI calculation with confidence interval

### 4.4 Integration Testing
- [ ] Reproducible result from a known test location (e.g., Pune coordinates)
- [ ] Compare computed NDVI with published reference values
- [ ] Test failure modes: expired token, rate limit, no coverage

**Exit Criteria:**
- Reproducible NDVI result from a known scene and test location
- All satellite values include acquisition date, source, and quality flags

---

## Phase 5 — AI-Assisted Evidence & Diagnostics

**Goal:** Reliable AI features with evaluation datasets, error analysis, and safe fallbacks.

### 5.1 Image Relevance Screening
- [ ] Evaluate Gemini Flash-Lite for tree/plant detection accuracy
- [ ] Create evaluation dataset (50+ images: trees, non-trees, indoor, urban)
- [ ] Measure precision/recall/F1
- [ ] Display "AI suggests: likely tree" vs "AI suggests: not a tree" (not "AI verified")
- [ ] Safe fallback when AI unavailable: "Manual review required"

### 5.2 Species Identification
- [ ] Test with known species photos
- [ ] Report top-3 matches with confidence
- [ ] Add disclaimer: "AI suggestion — confirm with botanical expertise"

### 5.3 Anomaly Detection
- [ ] Flag projects with unusual patterns (e.g., all trees "alive" with no photo evidence)
- [ ] Inspection prioritisation based on risk score
- [ ] Alert triggers for sudden NDVI drops (when satellite data available)

### 5.4 AI Model Management
- [ ] Configure billing for Gemini Pro access (if budget allows)
- [ ] Implement rate limiting to avoid quota exhaustion
- [ ] Model fallback chain: Pro → Flash → Flash-Lite → Manual Review

**Exit Criteria:**
- Evaluation dataset with measured accuracy
- Error analysis documenting limitations
- Safe fallback on every AI feature

---

## Phase 6 — Institutional MRV & Reporting

**Goal:** Evidence-linked institutional reports with portfolio analytics and optional carbon estimates.

### 6.1 Portfolio Analytics
- [ ] Organisation-level dashboard: all projects, aggregate survival, total trees
- [ ] Filter by project status, date range, species
- [ ] Cross-project comparison

### 6.2 Evidence-Linked Reports
- [ ] PDF report generation with observation summaries
- [ ] Every number traceable to source records
- [ ] Reporting period clearly stated
- [ ] Assumptions and uncertainty documented

### 6.3 Carbon Estimates (Optional)
- [ ] Label carbon estimates as "THEORETICAL ESTIMATES — not certified"
- [ ] Document methodology: IPCC Tier-2, Chave et al., species parameters
- [ ] State assumptions: growth rate, survival rate source, wood density source
- [ ] Remove any Gold Standard/Verra language until actual certification

### 6.4 Audit Trail
- [ ] Review all audit log entries for completeness
- [ ] Ensure actor, timestamp, action, and before/after are recorded
- [ ] Export audit log as CSV

**Exit Criteria:**
- Evidence-linked reports where all reported totals trace to source records
- Carbon estimates clearly labelled as theoretical
- Audit trail complete and exportable

---

## Phase 7 — Pilot & Iterate

**Goal:** Run a small real plantation pilot; collect user feedback and field validation.

### 7.1 Pilot Setup
- [ ] Select 1-2 real plantation sites in Maharashtra
- [ ] Register 50-100 real trees with GPS + photos
- [ ] Conduct 3 observation rounds over 3 months
- [ ] Calculate and display survival metrics from real data

### 7.2 Field Validation
- [ ] Compare platform survival rate with manual field count
- [ ] Test GPS accuracy in rural areas
- [ ] Test photo upload on 2G/3G networks
- [ ] Collect user feedback on workflow

### 7.3 Documentation
- [ ] Document pilot results, known limitations, and prioritised improvements
- [ ] Update `FEATURE_IMPLEMENTATION_MATRIX.md` with pilot findings
- [ ] Prepare investor/stakeholder summary

**Exit Criteria:**
- Documented pilot results with real data
- Known limitations catalogued
- Prioritised improvement backlog

---

## Budget Considerations

| Phase | Estimated AI/API Cost | Infrastructure Cost | Notes |
|-------|----------------------|--------------------|----|
| Phase 1 | Minimal | None | Code changes only |
| Phase 2 | Minimal | None | Code + migrations |
| Phase 3 | Minimal | None | Code changes |
| Phase 4 | Free (ESA Copernicus) | None | ESA provides free Sentinel-2 access |
| Phase 5 | ~₹500-1000/month | None | Gemini API calls for evaluation |
| Phase 6 | Minimal | None | Code changes |
| Phase 7 | ~₹500 | Travel/field costs | Real pilot |

**Total estimated platform costs:** Under ₹2,500 for development phases (excluding field pilot logistics).

---

## Git Workflow

- Each phase creates a feature branch: `phase-1/reliability`, `phase-2/field-mvp`, etc.
- Small, reviewable commits
- All changes merged to `main` only after passing tests
- Git backup/tag before each phase: `git tag pre-phase-1`

---

*Last updated: October 2026 — Phase 0 Complete*
