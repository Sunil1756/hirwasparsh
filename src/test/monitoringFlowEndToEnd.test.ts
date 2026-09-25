import { describe, it, expect, beforeAll } from 'vitest';
import { observationService } from '@/services/observationService';
import { monitoringEventService } from '@/services/monitoringEventService';
import { survivalStatusService } from '@/services/survivalStatusService';
import { evidenceHistoryService } from '@/services/evidenceHistoryService';
import { monitoringDashboardService } from '@/services/monitoringDashboardService';

describe('Phase 5 Task 26 — End-to-End Monitoring Lifecycle Testing', () => {
  const TREE_ID = 'test-e2e-tree-001';
  const TREE_CODE = 'GE-2026-E2E001';
  const SPECIES = 'Azadirachta indica (Neem)';
  const BASELINE_LAT = 18.52043;
  const BASELINE_LNG = 73.85674;
  const PLANTATION_DATE = '2026-01-01T08:00:00.000Z';

  beforeAll(() => {
    evidenceHistoryService._clearMemoryCache();
    monitoringDashboardService._setMockTrees(null);
  });

  describe('1. Initial Tree Baseline Registration (Day 0)', () => {
    it('initializes a tree with baseline biometric parameters and cryptographic registry entry', async () => {
      const initialRecord = await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId: TREE_ID,
        observerName: 'Sanjay Deshmukh',
        observerRole: 'planter',
        eventTimestamp: PLANTATION_DATE,
        eventType: 'initial_planting',
        survivalStatus: 'ALIVE',
        healthStatus: 'healthy',
        heightCm: 35.0,
        dbhCm: 1.8,
        canopyWidthCm: 20.0,
        latitude: BASELINE_LAT,
        longitude: BASELINE_LNG,
        baselineLatitude: BASELINE_LAT,
        baselineLongitude: BASELINE_LNG,
        photoUrl: 'https://hirwasparsh.org/photos/baseline-tree-001.jpg',
        evidenceType: 'planting_photo',
        notes: 'Initial sapling plantation during monsoon drive.',
      });

      expect(initialRecord.id).toBeDefined();
      expect(initialRecord.who.observerName).toBe('Sanjay Deshmukh');
      expect(initialRecord.what.heightCm).toBe(35.0);
      expect(initialRecord.where.distanceFromBaselineM).toBe(0);
      expect(initialRecord.where.geofenceStatus).toBe('within_bounds');
      expect(initialRecord.evidence.sha256Hash).toHaveLength(64);
      expect(initialRecord.what.survivalStatus).toBe('ALIVE');
    });
  });

  describe('2. First Monitoring Event (Day 30 — Establishment Stage)', () => {
    it('records first periodic observation, calculates growth deltas, and updates schedule', async () => {
      // 1. Initial Observation Input
      const obsInput = {
        tree_id: TREE_ID,
        observer_name: 'Pooja Kadam',
        observer_role: 'field_worker',
        observation_date: '2026-02-01T10:00:00.000Z',
        health_status: 'healthy',
        survival_status: 'ALIVE',
        height_cm: 52.0, // Growth: +17cm
        dbh_cm: 2.2,    // Growth: +0.4cm
        canopy_width_cm: 32.0,
        latitude: BASELINE_LAT + 0.00005, // ~5.5 meters away
        longitude: BASELINE_LNG,
        photo_url: 'https://hirwasparsh.org/photos/month1-tree-001.jpg',
        condition_notes: 'Sapling rooted firmly with healthy new green shoot flushes.',
      };

      // 2. Validate observation input
      const validation = observationService.validateObservationInput(obsInput);
      expect(validation.isValid).toBe(true);

      // 3. Compute next monitoring schedule dynamically
      const scheduleCalc = monitoringEventService.calculateNextMonitoringDate(
        PLANTATION_DATE,
        'healthy',
        obsInput.observation_date
      );

      expect(scheduleCalc.intervalDays).toBe(30); // 30-day interval in establishment stage
      expect(scheduleCalc.stageLabel).toBe('Sapling Establishment Phase (< 6 mo)');

      // 4. Create 5W Evidence Record
      const evidenceRec = await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId: TREE_ID,
        observerName: obsInput.observer_name,
        observerRole: obsInput.observer_role,
        eventTimestamp: obsInput.observation_date,
        eventType: 'biometric_field_audit',
        survivalStatus: 'ALIVE',
        healthStatus: 'healthy',
        heightCm: obsInput.height_cm,
        dbhCm: obsInput.dbh_cm,
        canopyWidthCm: obsInput.canopy_width_cm,
        heightDeltaCm: 17.0,
        dbhDeltaCm: 0.4,
        latitude: obsInput.latitude,
        longitude: obsInput.longitude,
        baselineLatitude: BASELINE_LAT,
        baselineLongitude: BASELINE_LNG,
        photoUrl: obsInput.photo_url,
        notes: obsInput.condition_notes,
      });

      expect(evidenceRec.what.heightDeltaCm).toBe(17.0);
      expect(evidenceRec.what.dbhDeltaCm).toBe(0.4);
      expect(evidenceRec.where.distanceFromBaselineM).toBeLessThan(10);
      expect(evidenceRec.where.geofenceStatus).toBe('within_bounds');
      expect(evidenceRec.evidence.sha256Hash).toHaveLength(64);
    });
  });

  describe('3. Second Monitoring Event (Day 60 — Stressed Condition & Treatment)', () => {
    it('detects stress, applies treatments, accelerates inspection interval, and records in history', async () => {
      const obsDate = '2026-03-01T11:00:00.000Z';

      // 1. Stressed observation with treatments
      const evidenceRec = await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId: TREE_ID,
        observerName: 'Ravi Gaikwad',
        observerRole: 'field_forester',
        eventTimestamp: obsDate,
        eventType: 'health_inspection',
        survivalStatus: 'STRESSED',
        healthStatus: 'stressed',
        heightCm: 64.0, // Growth: +12cm
        dbhCm: 2.6,    // Growth: +0.4cm
        canopyWidthCm: 36.0,
        heightDeltaCm: 12.0,
        dbhDeltaCm: 0.4,
        pestDiseaseDetected: false,
        treatmentApplied: 'Organic mulch ring + deep soil saturation irrigation',
        notes: 'Mild wilting due to heat spike. Irrigation & organic mulch applied.',
        latitude: BASELINE_LAT,
        longitude: BASELINE_LNG,
        baselineLatitude: BASELINE_LAT,
        baselineLongitude: BASELINE_LNG,
        photoUrl: 'https://hirwasparsh.org/photos/month2-tree-001.jpg',
      });

      expect(evidenceRec.what.survivalStatus).toBe('STRESSED');
      expect(evidenceRec.what.treatmentApplied).toContain('Organic mulch ring');

      // 2. Stressed tree should trigger shorter follow-up interval (14 days)
      const scheduleCalc = monitoringEventService.calculateNextMonitoringDate(
        PLANTATION_DATE,
        'stressed',
        obsDate
      );

      expect(scheduleCalc.intervalDays).toBe(14); // Accelerated monitoring
      expect(scheduleCalc.stageLabel).toBe('Stress Recovery Protocol');
    });
  });

  describe('4. AI Anomaly Flag & Human Verification Workflow (Day 74)', () => {
    it('prohibits silent AI overrides and requires explicit forester ground-truth sign-off', async () => {
      // 1. AI Vision proposes status suggestion with low confidence (68%)
      const aiAssessment = {
        suggestedStatus: 'DAMAGED' as const,
        confidence: 68,
        rationale: 'Canopy thinning observed in drone imagery. Potential grazing trauma.',
        source: 'gemini_vision' as const,
      };

      // 2. Verify AI suggestion triggers NEEDS_REVIEW guardrail without silent overwrite
      const aiResult = await survivalStatusService.submitAiStatusSuggestion(
        TREE_ID,
        aiAssessment
      );

      expect(aiResult.success).toBe(true);
      expect(aiResult.actionTaken).toBe('flagged_needs_review');
      expect(aiResult.currentStatus).toBe('NEEDS_REVIEW');

      // 3. Forester visits on-site and executes certified ground-truth sign-off
      const verificationInput = {
        treeId: TREE_ID,
        verifiedStatus: 'ALIVE' as const,
        reviewerId: 'forester-uuid-007',
        reviewerName: 'Dr. Sunita Deshmukh',
        reviewerRole: 'senior_forester',
        verificationSource: 'forester_audit' as const,
        notes: 'Ground inspection completed. New growth buds thriving after mulching. Tree fully recovered.',
      };

      const signOffResult = await survivalStatusService.verifySurvivalStatus(verificationInput);
      expect(signOffResult.success).toBe(true);
      expect(signOffResult.verifiedStatus).toBe('ALIVE');
    });
  });

  describe('5. Third Monitoring Event (Day 210 — Young Tree Maturation Stage & Geofence Boundary Check)', () => {
    it('records observation in young tree maturation phase, validates canopy growth, and tags minor GPS displacement', async () => {
      const obsDate = '2026-08-01T09:30:00.000Z'; // 7 months after plantation
      // GPS reading ~32m away (boundary warning range 25-50m)
      const displacedLat = BASELINE_LAT + 0.00028;
      const displacedLng = BASELINE_LNG;

      const distance = evidenceHistoryService.calculateGeofenceDistance(
        BASELINE_LAT,
        BASELINE_LNG,
        displacedLat,
        displacedLng
      );

      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(50);
      expect(evidenceHistoryService.evaluateGeofenceStatus(distance)).toBe('boundary_warning');

      const evidenceRec = await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId: TREE_ID,
        observerName: 'Pooja Kadam',
        observerRole: 'field_worker',
        eventTimestamp: obsDate,
        eventType: 'biometric_field_audit',
        survivalStatus: 'ALIVE',
        healthStatus: 'thriving',
        heightCm: 96.0, // Growth: +32cm
        dbhCm: 3.9,    // Growth: +1.3cm
        canopyWidthCm: 55.0,
        heightDeltaCm: 32.0,
        dbhDeltaCm: 1.3,
        latitude: displacedLat,
        longitude: displacedLng,
        baselineLatitude: BASELINE_LAT,
        baselineLongitude: BASELINE_LNG,
        photoUrl: 'https://hirwasparsh.org/photos/month7-tree-001.jpg',
        notes: 'Substantial canopy spread and trunk thickening in young tree maturation stage.',
      });

      expect(evidenceRec.what.heightCm).toBe(96.0);
      expect(evidenceRec.where.geofenceStatus).toBe('boundary_warning');

      // Schedule in Young Tree Maturation stage (6-24 Months) expands to 60 days
      const scheduleCalc = monitoringEventService.calculateNextMonitoringDate(
        PLANTATION_DATE,
        'thriving',
        obsDate
      );
      expect(scheduleCalc.intervalDays).toBe(60);
      expect(scheduleCalc.stageLabel).toBe('Young Tree Maturation Phase (6–24 mo)');
    });
  });

  describe('6. Full History Retrieval & Provenance Integrity Acceptance', () => {
    it('retrieves complete chronological history with all 4 events and 100% integrity verification', async () => {
      const history = await evidenceHistoryService.getTreeEvidenceHistory(TREE_ID);

      // Verify all 4 chronological events exist
      expect(history.length).toBe(4);

      // Verify newest-first ordering
      expect(new Date(history[0].when.eventTimestamp).getTime()).toBeGreaterThan(
        new Date(history[1].when.eventTimestamp).getTime()
      );
      expect(new Date(history[1].when.eventTimestamp).getTime()).toBeGreaterThan(
        new Date(history[2].when.eventTimestamp).getTime()
      );
      expect(new Date(history[2].when.eventTimestamp).getTime()).toBeGreaterThan(
        new Date(history[3].when.eventTimestamp).getTime()
      );

      // Verify complete summary metrics
      const summary = await evidenceHistoryService.getAuditableEvidenceSummary(TREE_ID);

      expect(summary.totalEvidenceRecords).toBe(4);
      expect(summary.integrityVerifiedCount).toBe(4);
      expect(summary.latestHeightCm).toBe(96.0);
      expect(summary.latestDbhCm).toBe(3.9);
      expect(summary.latestSurvivalStatus).toBe('ALIVE');
      expect(summary.geofenceCompliancePct).toBe(100); // 3 within bounds + 1 boundary warning = 100% compliant
    });

    it('surfaces the monitored tree in the monitoring dashboard data streams', async () => {
      const dashboardData = await monitoringDashboardService.getMonitoringDashboardData();

      expect(dashboardData.kpis.totalMonitoredTrees).toBeGreaterThan(0);
      expect(dashboardData.kpis.survivalRatePct).toBeGreaterThan(0);
      expect(dashboardData.recentObservations.length).toBeGreaterThan(0);
      expect(dashboardData.survivalStatistics.totalTrees).toBeGreaterThan(0);
    });
  });
});
