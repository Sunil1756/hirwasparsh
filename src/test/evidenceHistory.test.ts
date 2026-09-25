import { describe, it, expect, beforeEach } from 'vitest';
import { evidenceHistoryService } from '@/services/evidenceHistoryService';
import { AuditableEvidenceRecord, CreateAuditableEvidenceInput } from '@/types/coreDatabase';

describe('Phase 5 Task 24 — Auditable Evidence History & 5W Provenance System', () => {
  beforeEach(() => {
    evidenceHistoryService._clearMemoryCache();
  });

  describe('1. WHERE: Haversine Geofence Distance Calculation', () => {
    const BASELINE_LAT = 18.52043;
    const BASELINE_LNG = 73.85674; // Pune, Maharashtra

    it('returns 0 for identical baseline and target coordinates', () => {
      const distance = evidenceHistoryService.calculateGeofenceDistance(
        BASELINE_LAT,
        BASELINE_LNG,
        BASELINE_LAT,
        BASELINE_LNG
      );
      expect(distance).toBe(0);
    });

    it('accurately computes proximity for a point ~10 meters away', () => {
      // 0.0001 deg lat is ~11.1 meters
      const targetLat = BASELINE_LAT + 0.00009;
      const targetLng = BASELINE_LNG;
      const distance = evidenceHistoryService.calculateGeofenceDistance(
        BASELINE_LAT,
        BASELINE_LNG,
        targetLat,
        targetLng
      );
      expect(distance).toBeGreaterThan(8);
      expect(distance).toBeLessThan(12);
    });

    it('accurately computes distance for a point ~100 meters away', () => {
      // 0.0009 deg lat is ~100 meters
      const targetLat = BASELINE_LAT + 0.0009;
      const targetLng = BASELINE_LNG;
      const distance = evidenceHistoryService.calculateGeofenceDistance(
        BASELINE_LAT,
        BASELINE_LNG,
        targetLat,
        targetLng
      );
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });

    it('handles NaN, null, and undefined coordinates safely', () => {
      expect(evidenceHistoryService.calculateGeofenceDistance(NaN, 73.8, 18.5, 73.8)).toBe(0);
      expect(evidenceHistoryService.calculateGeofenceDistance(18.5, null as any, 18.5, 73.8)).toBe(0);
    });
  });

  describe('2. WHERE: Geofence Status Thresholds', () => {
    it('categorizes distance <= 25m as within_bounds', () => {
      expect(evidenceHistoryService.evaluateGeofenceStatus(0)).toBe('within_bounds');
      expect(evidenceHistoryService.evaluateGeofenceStatus(12.5)).toBe('within_bounds');
      expect(evidenceHistoryService.evaluateGeofenceStatus(25.0)).toBe('within_bounds');
    });

    it('categorizes distance between 25m and 50m as boundary_warning', () => {
      expect(evidenceHistoryService.evaluateGeofenceStatus(25.1)).toBe('boundary_warning');
      expect(evidenceHistoryService.evaluateGeofenceStatus(38.0)).toBe('boundary_warning');
      expect(evidenceHistoryService.evaluateGeofenceStatus(50.0)).toBe('boundary_warning');
    });

    it('categorizes distance > 50m as out_of_bounds', () => {
      expect(evidenceHistoryService.evaluateGeofenceStatus(50.1)).toBe('out_of_bounds');
      expect(evidenceHistoryService.evaluateGeofenceStatus(120.0)).toBe('out_of_bounds');
      expect(evidenceHistoryService.evaluateGeofenceStatus(1500.0)).toBe('out_of_bounds');
    });

    it('handles negative or invalid distance values gracefully', () => {
      expect(evidenceHistoryService.evaluateGeofenceStatus(-5)).toBe('within_bounds');
      expect(evidenceHistoryService.evaluateGeofenceStatus(NaN)).toBe('within_bounds');
    });
  });

  describe('3. EVIDENCE: Cryptographic SHA-256 Integrity Verification', () => {
    it('generates a 64-character deterministic hex hash for any seed', () => {
      const hash1 = evidenceHistoryService.computeEvidenceHash('https://supabase.co/storage/tree-1.jpg');
      const hash2 = evidenceHistoryService.computeEvidenceHash('https://supabase.co/storage/tree-1.jpg');
      
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    });

    it('produces distinct hashes for different input media', () => {
      const hashA = evidenceHistoryService.computeEvidenceHash('photo_a.jpg');
      const hashB = evidenceHistoryService.computeEvidenceHash('photo_b.jpg');
      expect(hashA).not.toBe(hashB);
    });

    it('verifies standard SHA-256 integrity check successfully', () => {
      const photoUrl = 'https://hirwasparsh.org/photos/growth-evidence-42.jpg';
      const hash = evidenceHistoryService.computeEvidenceHash(photoUrl);

      const check = evidenceHistoryService.verifySha256Integrity(photoUrl, hash);
      expect(check.isValid).toBe(true);
      expect(check.hash).toBe(hash);
    });

    it('rejects invalid or malformed hash strings', () => {
      const check = evidenceHistoryService.verifySha256Integrity(
        'photo.jpg',
        'invalid-short-hash'
      );
      expect(check.isValid).toBe(false);
    });
  });

  describe('4. THE 5 Ws: Assembly and Complete Record Creation', () => {
    it('creates and returns a complete 5W auditable evidence record', async () => {
      const input: CreateAuditableEvidenceInput = {
        treeId: 'tree-uuid-001',
        observerId: 'forester-uuid-123',
        observerName: 'Rajesh Patil',
        observerRole: 'field_forester',
        verifiedById: 'verifier-uuid-999',
        verifiedByName: 'Dr. Sunita Deshmukh',
        eventTimestamp: '2026-09-25T08:30:00.000Z',
        exifTimestamp: '2026-09-25T08:29:45.000Z',
        eventType: 'biometric_field_audit',
        survivalStatus: 'ALIVE',
        healthStatus: 'thriving',
        heightCm: 145.5,
        dbhCm: 6.2,
        canopyWidthCm: 85.0,
        heightDeltaCm: 12.5,
        dbhDeltaCm: 0.8,
        pestDiseaseDetected: false,
        notes: 'Vigorous new shoot growth observed after monsoon watering.',
        latitude: 18.52043,
        longitude: 73.85674,
        elevationM: 560,
        gpsAccuracyM: 2.1,
        locationName: 'Warje Urban Forest, Pune',
        baselineLatitude: 18.52040,
        baselineLongitude: 73.85672,
        photoUrl: 'https://hirwasparsh.org/evidence/tree-001-obs.jpg',
        evidenceType: 'growth_photo',
      };

      const record = await evidenceHistoryService.createAuditableEvidenceRecord(input);

      // WHO Verification
      expect(record.who.observerName).toBe('Rajesh Patil');
      expect(record.who.observerRole).toBe('field_forester');
      expect(record.who.verifiedByName).toBe('Dr. Sunita Deshmukh');

      // WHEN Verification
      expect(record.when.eventTimestamp).toBe('2026-09-25T08:30:00.000Z');
      expect(record.when.exifTimestamp).toBe('2026-09-25T08:29:45.000Z');
      expect(record.when.createdAt).toBeDefined();

      // WHAT Verification
      expect(record.what.survivalStatus).toBe('ALIVE');
      expect(record.what.heightCm).toBe(145.5);
      expect(record.what.dbhCm).toBe(6.2);
      expect(record.what.heightDeltaCm).toBe(12.5);
      expect(record.what.notes).toContain('Vigorous new shoot growth');

      // WHERE Verification
      expect(record.where.latitude).toBe(18.52043);
      expect(record.where.longitude).toBe(73.85674);
      expect(record.where.distanceFromBaselineM).toBeLessThan(10);
      expect(record.where.geofenceStatus).toBe('within_bounds');

      // EVIDENCE Verification
      expect(record.evidence.photoUrl).toBe('https://hirwasparsh.org/evidence/tree-001-obs.jpg');
      expect(record.evidence.sha256Hash).toHaveLength(64);
      expect(record.evidence.verificationStatus).toBe('verified');
    });

    it('assembles 5W record from raw observation data accurately', () => {
      const rawObservation = {
        id: 'obs-uuid-888',
        tree_id: 'tree-uuid-001',
        observer_name: 'Anjali Sharma',
        observer_role: 'ngo_worker',
        observation_date: '2026-09-24T12:00:00Z',
        survival_status: 'STRESSED',
        health_status: 'stressed',
        height_cm: 120,
        dbh_cm: 4.5,
        canopy_width_cm: 60,
        pest_disease_detected: true,
        disease_description: 'Mild leaf rust on lower canopy',
        treatment_applied: 'Organic neem spray application',
        latitude: 18.52090, // ~52m away from baseline
        longitude: 73.85674,
        photo_url: 'https://hirwasparsh.org/photos/rust-obs.jpg',
      };

      const baseline = { latitude: 18.52043, longitude: 73.85674 };
      const record = evidenceHistoryService.assembleEvidenceRecordFromObservation(
        rawObservation as any,
        baseline
      );

      expect(record.who.observerName).toBe('Anjali Sharma');
      expect(record.what.survivalStatus).toBe('STRESSED');
      expect(record.what.pestDiseaseDetected).toBe(true);
      expect(record.what.diseaseDescription).toBe('Mild leaf rust on lower canopy');
      expect(record.what.treatmentApplied).toBe('Organic neem spray application');
      expect(record.where.distanceFromBaselineM).toBeGreaterThan(50);
      expect(record.where.geofenceStatus).toBe('out_of_bounds');
      expect(record.evidence.sha256Hash).toHaveLength(64);
    });
  });

  describe('5. EVIDENCE HISTORY & SUMMARY AGGREGATION', () => {
    it('retrieves and aggregates multiple evidence records chronologically', async () => {
      const treeId = 'tree-summary-test-01';

      // Record 1: Month 1 (within bounds)
      await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId,
        observerName: 'Planter Ravi',
        eventTimestamp: '2026-06-01T10:00:00Z',
        survivalStatus: 'ALIVE',
        heightCm: 45,
        dbhCm: 2,
        latitude: 18.52000,
        longitude: 73.85000,
        baselineLatitude: 18.52000,
        baselineLongitude: 73.85000,
        photoUrl: 'https://hirwasparsh.org/p1.jpg',
      });

      // Record 2: Month 2 (boundary warning ~35m away)
      await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId,
        observerName: 'Forester Maya',
        eventTimestamp: '2026-07-01T10:00:00Z',
        survivalStatus: 'ALIVE',
        heightCm: 60,
        dbhCm: 2.8,
        latitude: 18.52030,
        longitude: 73.85000,
        baselineLatitude: 18.52000,
        baselineLongitude: 73.85000,
        photoUrl: 'https://hirwasparsh.org/p2.jpg',
      });

      // Record 3: Month 3 (most recent observation)
      await evidenceHistoryService.createAuditableEvidenceRecord({
        treeId,
        observerName: 'Forester Maya',
        eventTimestamp: '2026-08-01T10:00:00Z',
        survivalStatus: 'ALIVE',
        heightCm: 82,
        dbhCm: 3.5,
        latitude: 18.52005,
        longitude: 73.85000,
        baselineLatitude: 18.52000,
        baselineLongitude: 73.85000,
        photoUrl: 'https://hirwasparsh.org/p3.jpg',
      });

      const history = await evidenceHistoryService.getTreeEvidenceHistory(treeId);
      expect(history).toHaveLength(3);
      // Verify descending order (Month 3 first, Month 1 last)
      expect(history[0].when.eventTimestamp).toBe('2026-08-01T10:00:00Z');
      expect(history[2].when.eventTimestamp).toBe('2026-06-01T10:00:00Z');

      const summary = await evidenceHistoryService.getAuditableEvidenceSummary(treeId);
      expect(summary.totalEvidenceRecords).toBe(3);
      expect(summary.verifiedCount).toBe(3);
      expect(summary.withinBoundsCount).toBe(2);
      expect(summary.boundaryWarningCount).toBe(1);
      expect(summary.outOfBoundsCount).toBe(0);
      expect(summary.geofenceCompliancePct).toBe(100); // 3/3 within or boundary warning
      expect(summary.integrityVerifiedCount).toBe(3);
      expect(summary.latestHeightCm).toBe(82);
      expect(summary.latestDbhCm).toBe(3.5);
      expect(summary.latestSurvivalStatus).toBe('ALIVE');
    });
  });
});
