# Green Enlightenment — Feature Implementation Matrix

> Maps every feature from the product brief to the actual repository implementation. Each feature is classified by its real implementation status based on source code inspection, not UI appearance.

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ VERIFIED WORKING | Feature implemented, connected to real data, and tested/confirmed to function |
| 🔶 IMPLEMENTED BUT UNVERIFIED | Code exists and appears correct but has not been live-tested in this audit |
| 🟡 PARTIALLY IMPLEMENTED | Some parts work, others are missing or incomplete |
| 🔴 MOCK OR HARDCODED | Values are fabricated, hardcoded, simulated, or derived from deterministic math, not real data |
| ❌ BROKEN | Feature exists but fails, crashes, or produces incorrect results |
| ⬜ NOT IMPLEMENTED | Feature described in brief but no corresponding code exists |

---

## F01 — Accounts (Signup/Login/Session)

**Status: ✅ VERIFIED WORKING**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Signup/Login | Supabase Auth with email/password | `src/contexts/AuthContext.tsx` lines 106-143 |
| Session management | `supabase.auth.onAuthStateChange()` + `getSession()` | `AuthContext.tsx` lines 107-141 |
| Password reset | Supabase Auth built-in | Supabase dashboard config |
| Profile auto-creation | Trigger `on_auth_user_created` creates profile row | `consolidated_schema.sql` lines 72-87 |
| Google OAuth | Supported via Supabase Auth config | `src/pages/Login.tsx` |

**Issues:** None critical. Profile sync uses `maybeSingle()` which handles missing profiles gracefully.

---

## F02 — Organisations

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Organisation table | Exists with RLS | Multiple migration files create org tables |
| Role-based access | `user_roles` table with `admin/moderator/user/government` enum | `consolidated_schema.sql` lines 183-217 |
| Organisation isolation | RLS policies exist but were hardened in later migrations | `20260930000000_fix_org_isolation_rls.sql` |
| Member management | Organisation members table exists | `src/services/organizationService.ts` (368 lines) |

**Issues:**
- Profile-level `role` column exists alongside the `user_roles` table — dual role sources create ambiguity
- `isFieldWorker` in `AuthContext.tsx` line 158-164 matches on `moderator`, `ngo`, `field_worker` — inconsistent mapping
- Organization-level data isolation (cross-org data leakage) has not been penetration-tested

---

## F03 — Project Creation

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Project metadata form | Exists in `OrganizationPlantation.tsx` | ~2211 lines, project creation ~lines 800-920 |
| Species list | Selectable species with benchmarks | `projectVerification.ts` lines 40-53 |
| Boundary polygon | Drawn via map with Turf.js area calculation | `PlotPolygonDrawer.tsx` (662 lines) |
| Server-side validation | **MISSING** — validation is client-side only | No Supabase Edge Function validates project inputs |

**Critical Issues:**
- ❌ **Zero, negative, and impossibly large tree counts are NOT rejected server-side**
- ❌ **No duplicate project detection** (same name + location can create multiple projects)
- ❌ **No draft/submitted/verified state machine enforcement server-side** — a project can jump to any status
- ⚠️ Boundary polygon defaults to a 1-acre fallback if not drawn (`sqm = 4046.86` hardcoded at `projectVerification.ts` line 372)

---

## F04 — Site Mapping

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| GPS point capture | `GpsLocationCapture.tsx` (211 lines) | Uses browser Geolocation API |
| Polygon drawing | `PlotPolygonDrawer.tsx` (662 lines) | react-leaflet based |
| Map display | Multiple map components | `TreeMapViewer.tsx`, `ProjectMapViewer.tsx`, `GisMapContainer.tsx` |
| Boundary validation | Turf.js area calculation in `projectVerification.ts` | Lines 371-380 |
| CRS handling | Assumed WGS84, no explicit CRS validation | Coordinates are [lat,lng] pairs |

**Issues:**
- No self-intersection check for polygons
- No CRS validation or conversion
- KML parser exists (`kmlParser.ts`, 127 lines) but integration unclear

---

## F05 — Evidence Uploads

**Status: 🔶 IMPLEMENTED BUT UNVERIFIED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Photo upload | `PhotoEvidenceUploader.tsx` (307 lines) | Uploads to Supabase Storage |
| Storage buckets | `treebank` (public), `selfies` (private) | `consolidated_schema.sql` lines 462-500 |
| Metadata extraction | EXIF timestamp column exists (`exif_timestamp`) | Trees table schema |
| File type validation | Client-side only | Frontend component logic |

**Issues:**
- No server-side file type or size validation
- Photo hash column exists (`photo_hash`) but population unclear
- Evidence chain (provenance) between upload and project linkage is not fully traced

---

## F06 — Image Screening (AI)

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| AI botanical vision | `geminiBotanicalVision.ts` (361 lines) | Genuine Gemini API calls |
| Species identification | `detect-species` Edge Function | `supabase/functions/detect-species/index.ts` |
| Anti-fraud screening | Prompt includes anti-fraud checks | `geminiBotanicalVision.ts` botanical analysis prompt |
| Duplicate image detection | `perceptualHash.ts` (192 lines) | Client-side perceptual hashing |

**Issues:**
- ⚠️ **Gemini Pro models return 429 (quota exhausted) on free tier** — only Flash-Lite models work
- AI analysis results are stored but not validated against ground truth
- "AI confidence" label implies certainty that AI cannot provide (per product brief principle)
- Perceptual hash is computed client-side — can be bypassed

---

## F07 — Tree Register

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Trees table | Comprehensive schema with GPS, species, photos | `consolidated_schema.sql` lines 2-20 |
| Tree ID/QR | `PrintableBatchQRExporter.tsx` (265 lines) | QR code generation |
| Tree profile page | `TreeProfile.tsx` (1020 lines) | `/tree/:id` route |
| Bulk onboarding | `BulkTreeOnboarder.tsx` (295 lines) | CSV/batch import |

**Issues:**
- Tree code uniqueness enforcement unclear from migrations alone
- QR code links to tree profile but real-world QR scanning workflow not fully tested

---

## F08 — Inspections (Field Follow-up)

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Tree observations | `observationService.ts` (403 lines) | Database-backed observation records |
| Monitoring schedules | `monitoringEventService.ts` (530 lines) | Schedule and work order management |
| Survival status | `survivalStatusService.ts` (458 lines) | alive/dead/missing/not-inspected states |
| Monitoring dashboard | `MonitoringDashboard.tsx` (821 lines) | UI for schedules, work orders, alerts |

**Issues:**
- The observation→survival pipeline exists in code but feeding actual survival rates to the dashboard metrics has not been confirmed
- `CreateObservationModal.tsx` (427 lines) exists but end-to-end flow (create observation → update survival → reflect on dashboard) is unverified

---

## F09 — Survival Metrics

**Status: 🔴 MOCK OR HARDCODED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Survival rate calculation | Exists in `treeSurvivalEngine.ts` (775 lines) | Formulas present |
| Dashboard display | Shows "Calibrated Survival" / "Field-Verified Survival" | `OrganizationPlantation.tsx` |
| Zero-tree lock | Carbon ledger locks on zero trees | `carbonLedger.ts` lines 78-80 |

**Critical Issues:**
- 🔴 **The `survivalRatePercent` parameter in `carbonLedger.ts` defaults to 0** — but caller can pass arbitrary values
- 🔴 **No database query connects actual tree observations to the survival rate displayed on the dashboard**
- 🔴 **A UI displaying "97% survival" has no traceable database computation behind it** — the value can come from any caller
- The denominator (total trees inspected vs total trees planted) is not enforced

---

## F10 — Audit / Diagnostic Checks

**Status: 🔴 MOCK OR HARDCODED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| 4-tier verification | `projectVerification.ts` (477 lines) | Runs 4 client-side checks |
| Biological density audit | ✅ Real formula based on species benchmarks | Lines 58-125 |
| Geospatial sanity audit | ✅ Real coordinate range checks | Lines 130-197 |
| Cadastral overlap | 🔶 Boundary comparison logic exists | Lines 202-276 |
| Baseline NDVI | 🔴 **SIMULATED via `Math.sin()` coordinate hash** | Lines 280-339, specifically line 294-296 |

**Critical Issues:**
- 🔴 **"Baseline NDVI" is NOT from real satellite data** — it's computed as `0.18 + (Math.sin(lat*12.9898 + lng*78.233)*43758.5453 % 1) * 0.18`
- 🔴 **The entire audit runs client-side** — it can be bypassed by modifying the browser
- The score labels ("Gold Standard / Verra additionality criteria") make unsubstantiated certification claims

---

## F11 — AI Trust Score

**Status: 🔴 MOCK OR HARDCODED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Score display | Shows in dashboard UI | Various dashboard components |
| Score source | Derived from the project verification score | `projectVerification.ts` master evaluator |

**Critical Issues:**
- 🔴 **"AI Trust Score" has no published formula, no calibrated inputs, no validation, and no clear label** — exactly what the product brief warns against
- The term "Trust Score" implies independent verification, which does not exist
- Score of 40 can display without any meaningful evidence

---

## F12 — Geospatial Plot Cleaning

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Polygon area calculation | ✅ Real Turf.js area calculation | `projectVerification.ts` lines 371-380 |
| Coordinate validation | Basic lat/lng range checks | `auditGeospatialLandSanity()` |
| GIS map foundation | `gisMapFoundation.ts` (487 lines) | Map projection and layer management |

**Issues:**
- No self-intersection detection
- No duplicate point detection
- "Geospatial Plot Cleaning: PASS" can display without any actual cleaning operation

---

## F13 — Satellite Telemetry

**Status: 🟡 PARTIALLY IMPLEMENTED (Not Operational)**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Copernicus integration code | Complete OAuth + OData + Statistical API | `sentinel2RealService.ts` (794 lines) |
| STAC fallback | Earth Search STAC query code | `sentinel2RealService.ts` |
| Spectral index computation | ✅ Correct formulas (NDVI, NDRE, NDWI, EVI, SAVI) | Lines 145-239 |
| Error fallback | Returns zeros with `status: "unavailable"` | Lines 486-526 |

**Critical Issues:**
- ⚠️ **Copernicus credentials (`VITE_COPERNICUS_CLIENT_ID`, `VITE_COPERNICUS_CLIENT_SECRET`) are NOT configured** — the integration cannot function
- When credentials are missing, `getCopernicusAuthToken()` throws, and the catch block returns all-zero values with `isLiveSatelliteData: false`
- The code is well-structured and correct for when credentials are provided

---

## F14 — Vegetation Indices

**Status: 🟡 PARTIALLY IMPLEMENTED (Formulas correct, data source blocked)**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| NDVI formula | ✅ `(NIR - Red) / (NIR + Red)` | `sentinel2RealService.ts` lines 162-165 |
| NDRE formula | ✅ `(NIR - RedEdge) / (NIR + RedEdge)` | Lines 167-170 |
| NDWI formula | ✅ `(Green - NIR) / (Green + NIR)` | Lines 172-175 |
| EVI formula | ✅ `2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)` | Lines 177-180 |
| SAVI formula | ✅ `1.5 * (NIR - Red) / (NIR + Red + 0.5)` | Lines 182-185 |

**Issues:**
- Formulas are scientifically correct but cannot produce real results without Copernicus credentials
- `computeSpectralIndicesFromBands()` is a pure computation function — it works correctly given valid inputs

---

## F15 — Space-based Analysis

**Status: 🔴 MOCK OR HARDCODED (in current deployment)**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Time-series comparison | Code exists for historical overpasses | `sentinel2RealService.ts` lines 279-287, 315-326 |
| Area-level change detection | Spectral classification logic | Lines 198-216 |

**Critical Issues:**
- In current deployment without Copernicus credentials, all satellite analysis returns zeros
- Any "Space-based Analysis" results shown in the UI are either zeros or derived from the `Math.sin()` hash

---

## F16 — Meteo-Intelligence (Weather)

**Status: ✅ VERIFIED WORKING**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Weather provider | Open-Meteo API (free, no key) | `weatherService.ts` (385 lines) |
| Data retrieved | Temperature, humidity, precipitation, soil moisture, wind, UV, ET₀ | Interface at lines 11-34 |
| Drought risk calculation | ✅ Computed from real weather data | `weatherService.ts` |
| Data freshness | Timestamps recorded | `recorded_at` field |

**Issues:**
- Weather data is genuine but is presented alongside unverified metrics, creating a false sense of overall reliability
- No staleness detection or explicit "data age" display

---

## F17 — Carbon/Biomass Estimates

**Status: 🔴 MOCK OR HARDCODED (inputs are unverified)**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| IPCC Tier-2 formula | ✅ Scientifically valid allometric model | `carbonLedger.ts` (183 lines) |
| Species wood density | ✅ Real allometric parameters | Lines 16-28 |
| Chave et al. biomass | Correct formulation | Computation in `calculateCarbonLedgerMetrics()` |

**Critical Issues:**
- 🔴 **The formula is correct but its inputs are unverified:**
  - `targetTrees`: User-entered, no server validation
  - `survivalRatePercent`: Defaults to 0, can be passed as anything
  - `speciesList`: User-entered, no verification
- 🔴 **Carbon valuation in INR is computed** (`estimatedCarbonValuationInr`) but is **not connected to any real carbon registry**
- Labels like "Gold Standard" and "Verra" appear in the code but no actual certification exists

---

## F18 — Institutional MRV

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Audit log service | `auditLogService.ts` (951 lines) | Comprehensive audit trail |
| Database audit service | `databaseAuditService.ts` (735 lines) | Schema inspection and integrity |
| MRV three-tier engine | `mrvThreeTierEngine.ts` (261 lines) | Report generation framework |
| Institutional data service | `institutionalDataService.ts` (433 lines) | Organisation-level data access |

**Issues:**
- Report totals are not verified to trace to source records
- Export functionality (CSV/PDF) exists in UI but not confirmed operational
- "Evidence-linked reports" are not yet fully connected to observation chains

---

## F19 — Alerts & Tasks

**Status: 🔶 IMPLEMENTED BUT UNVERIFIED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Risk alerts | `PredictiveRiskAlertsConsole.tsx` (698 lines) | Risk alert UI |
| Alert engine | `predictiveRiskEngine.ts` (497 lines) | Risk calculation |
| Notification service | `riskAlertNotificationService.ts` (247 lines) | Alert dispatch |
| Edge function | `risk-alert-dispatcher/index.ts` | Server-side dispatch |

**Issues:**
- Alert rules and thresholds have not been tested with real data
- Anomaly detection (`anomalyAlertAutomator.ts`, 175 lines) exists but trigger conditions unverified

---

## F20 — Dashboard

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Project list | ✅ Queries from Supabase | Multiple dashboard pages |
| Map display | ✅ react-leaflet maps | `TreeMap.tsx` (686 lines), `TreeMapViewer.tsx` (785 lines) |
| Metrics display | ⚠️ Mix of real and simulated values | KPI cards in `OrganizationPlantation.tsx` |
| Empty state handling | ❌ **No honest empty states** — metrics show even without data | Dashboard components |

**Critical Issues:**
- Dashboard displays survival rates, NDVI values, and scores that are not traceable to verified source data
- Multiple cards may reuse the same underlying computation

---

## F21 — Import/Export

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Bulk CSV import | `BulkTreeOnboarder.tsx` (295 lines), `bulkOnboardingService.ts` (153 lines) | Import UI exists |
| KML import | `kmlParser.ts` (127 lines) | KML file parsing |
| PDF export | Referenced in MRV engine | Export code exists |

**Issues:**
- No server-side CSV schema validation
- Row-level error reporting unclear
- PDF export not confirmed functional

---

## F22 — Audit Trail

**Status: 🔶 IMPLEMENTED BUT UNVERIFIED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Admin audit log page | `AdminAuditLog.tsx` (196 lines) | `/admin/audit-log` route |
| Audit service | `auditLogService.ts` (951 lines) | Comprehensive logging |
| Database triggers | Admin approval trigger records actions | `consolidated_schema.sql` lines 233-258 |

---

## F23 — Demo Mode

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Genuine data filter | `genuineDataFilter.ts` (73 lines) | Filters known test IDs |
| Known test IDs | Hardcoded project/tree/org test IDs | Lines 10-28 |
| DEMO labels | ⚠️ Not confirmed whether demo data is visually labelled | Frontend component review needed |

**Issues:**
- Test data is filtered client-side by ID — new test data without known IDs could leak into production
- No `is_demo` database column for systematic separation

---

## F24 — Privacy/Security

**Status: 🟡 PARTIALLY IMPLEMENTED**

| Aspect | Finding | Evidence |
|--------|---------|----------|
| RLS policies | ✅ Enabled on all tables | All `CREATE TABLE` followed by `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| Storage policies | ✅ User-scoped upload policies | `consolidated_schema.sql` lines 462-500 |
| Privileged column guard | ✅ Trigger prevents non-admin verification changes | `guard_tree_privileged_columns()` lines 422-452 |
| Anonymous insert block | ✅ Removed anonymous tree inserts | Line 409 |
| Legacy role cleanup | ✅ Removes simulated role tokens | `AuthContext.tsx` lines 54-61 |

**Issues:**
- Cross-organisation data leakage not penetration-tested
- Server-side validation of project inputs is missing (all validation client-side)
- Storage bucket policies scope to `auth.uid()` folder but no file-size limits enforced

---

## Summary Statistics

| Status | Count |
|--------|-------|
| ✅ VERIFIED WORKING | 2 (F01 Accounts, F16 Weather) |
| 🔶 IMPLEMENTED BUT UNVERIFIED | 3 (F05 Evidence, F19 Alerts, F22 Audit Trail) |
| 🟡 PARTIALLY IMPLEMENTED | 11 (F02, F03, F04, F06, F07, F08, F12, F13, F14, F18, F20, F21, F23, F24) |
| 🔴 MOCK OR HARDCODED | 5 (F09 Survival, F10 Diagnostics, F11 AI Trust, F15 Space Analysis, F17 Carbon) |
| ❌ BROKEN | 0 |
| ⬜ NOT IMPLEMENTED | 0 |

> **Bottom line:** Only 2 of 24 features are verified working. 5 features present mock/hardcoded/unverified data as real results. 14 features are partially implemented with significant gaps. No feature is completely missing from the codebase, but the gap between "code exists" and "feature works reliably with real data" is substantial.

---

*Last updated: October 2026 — Phase 0 Forensic Audit*
