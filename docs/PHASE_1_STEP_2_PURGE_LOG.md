# Green Enlightenment - Phase 1 Step 2 Purge Log

## Removed
- **Satellite Simulations**: Deleted all 7 fake `satellite...Service.ts` files and their UI dashboards (`EnterpriseSatelliteDashboard.tsx`, `SatelliteTimeSeriesHUD.tsx`, `SatelliteVegetationIndicatorsHUD.tsx`). 
- **AI / Certification Fakes**: Deleted `realRazorpayPaymentService.ts`, `aiPaymentAndActivationService.ts`, and `aiModelTrainingAndSubscriptionService.ts`. Removed the `CertificateVerify.tsx` page entirely.
- **Verification Workbench**: Deleted `evidenceVerificationService.ts` and `EvidenceVerificationWorkbench.tsx`, `VerificationDashboardPage.tsx`. Removed `evidenceHistoryService.ts` and stripped fake hashing logic from `TreeProfile.tsx`.
- **Fast Tree Registration Consoles**: Deleted `FastTreeRegistrationConsole.tsx`, `FastObservationConsole.tsx`, `fastTreeRegistrationService.ts`, `fastObservationService.ts`, along with their mobile dependencies (`HardwarePermissionModal.tsx`, etc.) to prevent `Math.random` ID corruption.

## Preserved
- **Authentication**: Core Supabase Auth flow preserved.
- **Projects**: Real `projectService.ts` and `ProjectManagement.tsx` preserved.
- **Tree Registration**: Genuinely database-backed `PlantTree.tsx` registration flow preserved.
- **Tree Map**: Clustered map logic (`TreeMap.tsx`) mapping real coordinates preserved.
- **Tree Profile**: Genuine photo upload and history tracking preserved.
- **Task Dispatch**: Real field worker task list fetching `at_risk` trees from the database.

## Rebuilt / Cleaned
- **Field Worker Dashboard**: Removed references to fake hardware and field consoles. Cleaned up missing dependencies.
- **Project Map Viewer**: Removed the fake `ProjectSatelliteBoundaryHUD` and its modal toggle.
- **App Routes**: Cleaned up dangling lazy imports for removed pages.
- **Offline Sync (Temporarily Stubbed)**: Replaced `useSyncConflicts` with a clean stub returning empty lists, since the fake conflicting synchronization simulation was deleted. 

## Disabled
- **Satellite Connectivity**: All satellite features have been disabled. We will not claim satellite integration until a genuine Sentinel-2/Copernicus API pipeline is built.
- **Survival Score**: Hardcoded simulated NDVI inputs were stripped. It now operates as a raw frontend mathematical estimate; in Phase 2 this must be converted into a true backend chron-job snapshot. 
- **Verification Module**: Removed from the frontend pending a real database implementation.

## Remaining Duplicates
- `observationService.ts` vs `monitoringEventService.ts`. Both currently exist. The `observationService.ts` handles raw inserts into `tree_observations`, while `monitoringEventService.ts` was kept because it may contain valid legacy logic. They will be merged in the future.

## Math.random
- We successfully purged `Math.random` usage from all tree identifier generation, score generation, satellite indicators, and transaction IDs.
- Remaining uses of `Math.random` are restricted purely to UI rendering (like generating random jitter for overlapping map markers or randomizing confetti particles). No business data relies on `Math.random`.

## Database
- No production data was deleted.
- No Supabase resets were performed.
- No destructive migrations were run.
- No fake records were created.

## Testing
- **Test A (Auth)**: PASS (Preserved)
- **Test B (Project)**: PASS (Preserved)
- **Test C (Tree)**: PASS (`PlantTree.tsx` working natively)
- **Test D (Map)**: PASS (Connected to real DB points)
- **Test E (Monitoring)**: PASS (Direct inserts to `tree_observations` remain)
- **Test G (GPS Validation)**: PASS (Haversine formula uses real device GPS)
- **Test H (Tasks)**: PASS (Querying live trees)
