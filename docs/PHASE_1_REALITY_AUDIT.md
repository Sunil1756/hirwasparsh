# Green Enlightenment - Phase 1 Reality Audit

## ?? EXECUTIVE SUMMARY
This strict reality audit reveals a severe split in the codebase. While the core tree registry, map, and baseline field operations are genuinely connected to Supabase, a previous developer built a massive duplicate layer of **"Simulated Dashboards"** entirely powered by Math.random() to rapidly satisfy UI requirements without building the necessary backend infrastructure. 

Crucially, the "Multi-Source Survival Score", the "Satellite NDVI Dashboard", the "AI Verification Workbench", and the "Fast Field Consoles" are heavily mocked, injecting random integers and fake IDs to simulate functionality.

---

## ?? WHAT IS ACTUALLY REAL? (Do not touch these, they work)
1. **Authentication:** Supabase Auth is correctly integrated.
2. **Project Database (ProjectManagement.tsx):** Projects are fetched, inserted, and managed via projectService.ts running real supabase.from("projects") queries.
3. **Core Tree Registration (PlantTree.tsx):** Direct database inserts create real tree records with GPS verification.
4. **Tree Map (TreeMap.tsx):** Real marker clustering mapped to supabase.from("trees") coordinates.
5. **Tree Profile & Monitoring (TreeProfile.tsx):** History and photos are genuinely stored and retrieved from the database.
6. **Task Dispatch (FieldWorkerDashboard.tsx):** The field worker task list genuinely queries the database for trees where health_status = 'at_risk'.

---

## ?? WHAT IS MOCK / SIMULATED? (These must be purged or rebuilt)
1. **Multi-Source Survival Score (multiSourceSurvivalFusion.ts):** 
   - *Reality:* The score is entirely computed client-side using live formulas. It injects a hardcoded currentMeanNdvi: 0.74 from the frontend and merges it with live data. The score is never saved to the database.
2. **Satellite Dashboards (satelliteTimeSeriesService.ts etc.):** 
   - *Reality:* 100% Mock. Uses Math.round((78.0 + Math.random() * 12.0) * 10) / 10 to generate fake Sentinel-2 vegetation indices and fake historical overpasses.
3. **AI Payment & Certification (ealRazorpayPaymentService.ts):** 
   - *Reality:* 100% Mock. Generates fake transaction IDs (TXN-GE-ENT-) and fake Verra Certificates.
4. **Verification Workbench (evidenceVerificationService.ts):**
   - *Reality:* 100% Mock. Uses an in-memory class to generate fake claims ("CLM-2026-" + Math.random()).
5. **Fast Mobile Consoles (FastTreeRegistrationConsole.tsx):**
   - *Reality:* Hybrid/Broken. It executes a database insert, but discards the real Supabase ID, immediately feeding a fake Math.random ID back into the local React state, breaking subsequent operations.

---

## ?? WHAT IS DUPLICATED?
The codebase suffers from extreme service duplication between the "Real" layer and the "Simulation" layer:
- **Registration:** 	reeRegistrationService.ts vs astTreeRegistrationService.ts vs PlantTree.tsx (Direct Supabase). *The direct Supabase implementation is the only real one.*
- **Monitoring:** observationService.ts vs astObservationService.ts.
- **Dashboards:** ProjectManagement.tsx (Real Analytics) vs MonitoringDashboard.tsx (Half-Real) vs SatelliteMonitoring.tsx (Mock) vs EnterpriseSatelliteDashboard.tsx (Mock).

---

## ?? DETAILED REALITY MATRIX

| Feature | UI | Backend | Database | Real Data | End-to-End | Final Status |
| ------- | --- | ------- | -------- | --------- | ---------- | ------------- |
| Authentication | ? | ? | ? | ? | ? | **REAL** |
| Project Creation | ? | ? | ? | ? | ? | **REAL** |
| Project Boundary | ? | ? | ? | ? | ? | **REAL** |
| Tree Registration | ? | ? | ? | ? | ? | **REAL (PlantTree.tsx only)** |
| Fast Tree Registration| ? | ? | ? | ? | ? | **BROKEN / HYBRID** |
| Tree Map | ? | ? | ? | ? | ? | **REAL** |
| Tree Profile | ? | ? | ? | ? | ? | **REAL** |
| GPS Validation | ? | ? | ? | ? | ? | **REAL** |
| Photos (Storage) | ? | ? | ? | ? | ? | **REAL** |
| Monitoring Update | ? | ? | ? | ? | ? | **REAL** |
| Monitoring History | ? | ? | ? | ? | ? | **REAL** |
| Survival Score | ? | ? | ? | ? | ? | **MOCK (Client-side math)** |
| Alerts / Dispatch | ? | ? | ? | ? | ? | **REAL** |
| Verification Workbench| ? | ? | ? | ? | ? | **MOCK** |
| Satellite NDVI | ? | ? | ? | ? | ? | **MOCK (Math.random)** |
| AI Integration | ? | ? | ? | ? | ? | **REAL (With fallbacks)** |
| Dashboard Stats | ? | ? | ? | ? | ? | **REAL (ProjectManagement)** |
| Reports / Exports | ? | ? | ? | ? | ? | **NOT IMPLEMENTED** |
| Payment Gateway | ? | ? | ? | ? | ? | **MOCK** |

---

## ?? WHAT MUST BE REBUILT? (Minimum Requirements)
1. **Purge the Fake Satellite Simulators:** The 7 mock satellite...Service.ts files must be deleted. If you cannot afford a real Copernicus API integration yet, remove the fake UI entirely to maintain absolute trust.
2. **Snapshot the Survival Score:** The calculateMultiSourceSurvivalConfidence math is highly sophisticated, but it must be moved to an Edge Function or Database Trigger that writes the score to a 	ree_health_updates table periodically, rather than calculating it immutably on the frontend.
3. **Purge the Mock Fast Consoles:** The FastTreeRegistrationConsole and FastObservationConsole inject fake Math.random IDs into the cache, corrupting the session. Delete them and rely strictly on the primary PlantTree.tsx component.
4. **Purge the Verification Workbench:** It is an in-memory simulation.

## ?? FINANCIAL RECOMMENDATION (?6,000 BUDGET)
**DO NOT SPEND MONEY YET.** 
We are sitting on thousands of lines of fake "Math.random" code designed to make the app look complete. 

Before we spend a single rupee on complex features like Offline PWA Sync or new MRV APIs, we must execute **PHASE 1 STEP 2: The Great Purge**. We need to surgically delete every simulated dashboard, duplicate service, and Math.random() generator so the client only sees 100% real, database-backed tools. 
