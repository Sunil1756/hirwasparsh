import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpatiotemporalConsistencyModal } from '../components/verification/SpatiotemporalConsistencyModal';
import { SpatiotemporalAnomalyScanner } from '../components/verification/SpatiotemporalAnomalyScanner';
import {
  spatiotemporalConsistencyService,
  SpatiotemporalAuditReport,
} from '../services/spatiotemporalConsistencyService';

const mockReport: SpatiotemporalAuditReport = {
  id: 'ST-REP-TEST-001',
  treeId: 'TREE-TELEPORT-99',
  planterId: 'USR-PUNE-101',
  planterName: 'Ramesh Shinde',
  coords: { latitude: 18.922, longitude: 73.85715, altitudeMeters: 550 },
  timestamp: '2026-09-20T08:46:00.000Z',
  overallScore: 45,
  riskLevel: 'critical_spoofing',
  kinematics: {
    distanceMeters: 52000,
    distanceKm: 52,
    elapsedSeconds: 240,
    elapsedMinutes: 4,
    speedKmh: 780,
    status: 'impossible_teleportation',
    isPlausible: false,
    notes: 'Critical impossible travel: 780 km/h indicates GPS spoofing.',
    previousPoint: {
      id: 'P0',
      treeId: 'TREE-BANYAN-7702',
      planterId: 'USR-PUNE-101',
      coords: { latitude: 18.52085, longitude: 73.85715 },
      timestamp: '2026-09-20T08:42:00.000Z',
    },
  },
  solarEphemeris: {
    solarZenithAngleDeg: 42.5,
    solarElevationAngleDeg: 47.5,
    sunriseTime: '06:15',
    sunsetTime: '18:25',
    solarNoonTime: '12:20',
    dayLengthHours: 12.2,
    lightingStatus: 'daylight',
    isDaylightPlausible: true,
    notes: 'Capture timestamp aligns with daytime natural sunlight.',
  },
  geofence: {
    status: 'geofence_breach',
    isContained: false,
    distanceToBoundaryMeters: 44000,
    boundaryName: 'Pune Agroforestry Parcel #1',
    notes: 'Geofence breach: Coordinates are 44000m outside registered project perimeter.',
  },
  chronology: {
    clockDriftSeconds: 0,
    isClockSynchronized: true,
    isFutureTimestamp: false,
    isRetroactiveViolation: false,
    notes: 'Timestamp and hardware clocks are synchronized.',
  },
  activeViolations: [
    'Impossible Teleportation Fraud (780.0 km/h across 52.0km)',
    'Project Geofence Boundary Breach (44000m outside)',
  ],
  adjudicationStatus: 'pending_review',
};

beforeEach(() => {
  vi.restoreAllMocks();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  spatiotemporalConsistencyService.resetToDefaults();

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  });
});

describe('SpatiotemporalConsistencyModal Component (Task 42)', () => {
  it('renders modal with trajectory metrics, solar ephemeris, and violations', () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <SpatiotemporalConsistencyModal
        report={mockReport}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    expect(screen.getByText('Spatiotemporal & Kinematic Verification Inspector')).toBeInTheDocument();
    expect(screen.getByText('critical spoofing')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('780 km/h')).toBeInTheDocument();

    // Trajectory details
    expect(screen.getByText(/52.0 km/i)).toBeInTheDocument();
    expect(screen.getByText('TREE-BANYAN-7702')).toBeInTheDocument();
    expect(screen.getByText('TREE-TELEPORT-99')).toBeInTheDocument();

    // Solar details
    expect(screen.getByText('42.5°')).toBeInTheDocument();
    expect(screen.getByText('06:15')).toBeInTheDocument();
    expect(screen.getByText('18:25')).toBeInTheDocument();

    // Violations
    expect(screen.getByText(/Impossible Teleportation Fraud/i)).toBeInTheDocument();
  });

  it('allows auditor to confirm spoofing and reject claim', async () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <SpatiotemporalConsistencyModal
        report={mockReport}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    const textarea = screen.getByPlaceholderText(/Enter auditor adjudication notes/i);
    fireEvent.change(textarea, { target: { value: 'Impossible 780 km/h velocity across highway.' } });

    const rejectBtn = screen.getByText('Confirm Spoofing & Reject');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ST-REP-TEST-001',
          adjudicationStatus: 'confirmed_spoofing_rejected',
          adjudicationNotes: 'Impossible 780 km/h velocity across highway.',
        })
      );
    });
  });

  it('allows auditor to grant travel/terrain waiver', async () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <SpatiotemporalConsistencyModal
        report={mockReport}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    const waiverBtn = screen.getByText('Grant Travel/Terrain Waiver');
    fireEvent.click(waiverBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ST-REP-TEST-001',
          adjudicationStatus: 'travel_waiver_granted',
        })
      );
    });
  });

  it('copies forensic summary to clipboard', () => {
    render(
      <SpatiotemporalConsistencyModal
        report={mockReport}
        onClose={vi.fn()}
      />
    );

    const copyBtn = screen.getByText('Copy Forensic Summary');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <SpatiotemporalConsistencyModal
        report={mockReport}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Close spatiotemporal inspector' });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SpatiotemporalAnomalyScanner Component (Task 42)', () => {
  it('renders scanner overview and anomaly reports list', () => {
    render(<SpatiotemporalAnomalyScanner />);

    expect(screen.getByText('Spatiotemporal & Kinematic Anomaly Scanner')).toBeInTheDocument();
    expect(screen.getByText('Total Trajectories')).toBeInTheDocument();
    expect(screen.getAllByText(/Teleportation Speed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Solar Night Anomalies/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Geofence Breaches/i).length).toBeGreaterThan(0);

    // Check seed items rendered
    expect(screen.getAllByText(/TREE-TELEPORT-99/i).length).toBeGreaterThan(0);
  });

  it('filters trajectory reports by category buttons and search input', async () => {
    render(<SpatiotemporalAnomalyScanner />);

    // Filter by Teleportation Speed
    const teleportTab = screen.getByRole('button', { name: 'Teleportation Speed' });
    fireEvent.click(teleportTab);

    expect(screen.getAllByText(/TREE-TELEPORT-99/i).length).toBeGreaterThan(0);

    // Search query
    const searchInput = screen.getByPlaceholderText(/Search tree ID, planter name, violation.../i);
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_ANOMALY_999' } });

    expect(screen.getByText(/No spatiotemporal anomalies found matching your criteria/i)).toBeInTheDocument();
  });

  it('triggers full spatiotemporal audit sweep on button click', async () => {
    render(<SpatiotemporalAnomalyScanner />);

    const sweepBtn = screen.getByText('Run Spatiotemporal Audit Sweep');
    fireEvent.click(sweepBtn);

    expect(screen.getByText(/Evaluating Kinematics.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Run Spatiotemporal Audit Sweep')).toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('opens inspector modal when clicking Inspect Spatiotemporal Forensics', async () => {
    render(<SpatiotemporalAnomalyScanner />);

    const inspectButtons = screen.getAllByText('Inspect Spatiotemporal Forensics');
    expect(inspectButtons.length).toBeGreaterThan(0);

    fireEvent.click(inspectButtons[0]);

    // Modal should now be visible
    expect(screen.getByText('Spatiotemporal & Kinematic Verification Inspector')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close spatiotemporal inspector' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Spatiotemporal & Kinematic Verification Inspector')).not.toBeInTheDocument();
    });
  });
});
