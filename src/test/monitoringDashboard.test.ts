import { describe, it, expect } from 'vitest';
import { monitoringDashboardService } from '@/services/monitoringDashboardService';

describe('Phase 5 Task 25 — Monitoring Dashboard Service & Analytics Stream', () => {
  describe('1. Unified Monitoring Dashboard Data Aggregation', () => {
    it('aggregates all 5 essential monitoring streams and top-level KPIs', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();

      expect(data).toBeDefined();

      // 1. Trees Requiring Monitoring
      expect(data.treesRequiringMonitoring).toBeDefined();
      expect(Array.isArray(data.treesRequiringMonitoring)).toBe(true);

      // 2. Overdue Observations
      expect(data.overdueObservations).toBeDefined();
      expect(Array.isArray(data.overdueObservations)).toBe(true);

      // 3. Recent Observations Feed
      expect(data.recentObservations).toBeDefined();
      expect(Array.isArray(data.recentObservations)).toBe(true);

      // 4. Survival Statistics
      expect(data.survivalStatistics).toBeDefined();
      expect(typeof data.survivalStatistics.survivalRatePct).toBe('number');
      expect(typeof data.survivalStatistics.retentionRatePct).toBe('number');

      // 5. Trees Needing Review
      expect(data.treesNeedingReview).toBeDefined();
      expect(Array.isArray(data.treesNeedingReview)).toBe(true);

      // Top-level KPIs
      expect(data.kpis).toBeDefined();
      expect(data.kpis.totalMonitoredTrees).toBeGreaterThanOrEqual(0);
      expect(data.kpis.survivalRatePct).toBeGreaterThanOrEqual(0);
      expect(data.kpis.survivalRatePct).toBeLessThanOrEqual(100);
    });
  });

  describe('2. Stream 1: Trees Requiring Monitoring (Upcoming Inspections)', () => {
    it('correctly filters trees due within 7 days or due today', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();

      data.treesRequiringMonitoring.forEach((tree) => {
        expect(tree.id).toBeDefined();
        expect(tree.species).toBeDefined();
        expect(tree.nextMonitoringDate).toBeDefined();
        expect(tree.stageLabel).toBeDefined();
        // Either status is due_soon or days remaining is <= 7
        const isDueSoon = tree.monitoringStatus === 'due_soon' || (tree.daysRemaining <= 7 && tree.daysRemaining >= 0);
        expect(isDueSoon).toBe(true);
      });
    });
  });

  describe('3. Stream 2: Overdue Observations Alert Matrix', () => {
    it('accurately identifies and orders overdue inspections by days overdue', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();

      data.overdueObservations.forEach((tree) => {
        expect(tree.id).toBeDefined();
        expect(tree.daysOverdue).toBeGreaterThan(0);
        expect(['overdue', 'critical_overdue']).toContain(tree.monitoringStatus);
      });

      // Verify descending order of overdue days
      for (let i = 0; i < data.overdueObservations.length - 1; i++) {
        expect(data.overdueObservations[i].daysOverdue).toBeGreaterThanOrEqual(
          data.overdueObservations[i + 1].daysOverdue
        );
      }
    });
  });

  describe('4. Stream 3: Recent Observations Feed & Biometric Deltas', () => {
    it('formats recent observations with observer attribution and growth metrics', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();

      expect(data.recentObservations.length).toBeGreaterThan(0);

      const obs = data.recentObservations[0];
      expect(obs.id).toBeDefined();
      expect(obs.treeId).toBeDefined();
      expect(obs.date).toBeDefined();
      expect(obs.observerName).toBeDefined();
      expect(obs.survivalStatus).toBeDefined();
      expect(obs.geofenceStatus).toBeDefined();
    });
  });

  describe('5. Stream 4: Survival Statistics & 6-Status Breakdown', () => {
    it('computes accurate survival rates, retention rates, and status distributions', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();
      const stats = data.survivalStatistics;

      expect(stats.totalTrees).toBeGreaterThan(0);
      
      const sumOfStatuses =
        stats.aliveCount +
        stats.stressedCount +
        stats.damagedCount +
        stats.deadCount +
        stats.unknownCount +
        stats.needsReviewCount;

      expect(sumOfStatuses).toBe(stats.totalTrees);

      // Survival rate should be between 0 and 100
      expect(stats.survivalRatePct).toBeGreaterThanOrEqual(0);
      expect(stats.survivalRatePct).toBeLessThanOrEqual(100);

      // Retention rate should be >= survival rate (as it includes stressed and damaged)
      expect(stats.retentionRatePct).toBeGreaterThanOrEqual(stats.survivalRatePct);
    });
  });

  describe('6. Stream 5: Human-in-the-Loop Review Queue (Trees Needing Review)', () => {
    it('routes low confidence AI assessments or NEEDS_REVIEW trees to review queue', async () => {
      const data = await monitoringDashboardService.getMonitoringDashboardData();

      data.treesNeedingReview.forEach((tree) => {
        const isNeedsReview = tree.survivalStatus === 'NEEDS_REVIEW';
        const isLowConfidence = tree.aiConfidence !== null && tree.aiConfidence < 80;
        expect(isNeedsReview || isLowConfidence).toBe(true);

        if (tree.aiSuggestedStatus) {
          expect(tree.aiRationale).toBeDefined();
        }
      });
    });
  });
});
